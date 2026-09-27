import { getDockerClient } from './dockerService.js';
import { PassThrough } from 'stream';

/**
 * Attaches Socket.IO handlers for Docker container log streaming.
 * Handles demultiplexing, parsing, and safe stream lifecycle management.
 */
export function attachLogSocket(io) {
  io.on('connection', (socket) => {
    // Keep track of the active stream for this specific client
    socket.activeLogStream = null;

    socket.on('logs:start', async ({ containerId }) => {
      // 1. Cleanup any existing stream first
      if (socket.activeLogStream) {
        socket.activeLogStream.destroy();
        socket.activeLogStream = null;
      }

      try {
        const docker = getDockerClient();
        const container = docker.getContainer(containerId);
        
        // 2. Verify container exists (throws if not found)
        await container.inspect();

        socket.join(`container:${containerId}`);
        socket.emit('logs:status', { containerId, status: 'connected' });

        // 3. Request the stream
        const stream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          timestamps: true,
          tail: 100 // Fetch last 100 lines immediately for context
        });

        socket.activeLogStream = stream;

        // 4. Demultiplex Docker's proprietary binary format safely
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        
        docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        const processChunk = (chunk, type) => {
          const lines = chunk.toString('utf8').split('\n');
          for (let line of lines) {
            line = line.trimEnd(); // Remove trailing newline chars like \r
            if (!line) continue;
            
            // Format with timestamps: "2026-09-24T23:37:54.123456789Z Actual log message"
            const spaceIdx = line.indexOf(' ');
            if (spaceIdx > 0 && spaceIdx <= 31) {
              const timestamp = line.slice(0, spaceIdx);
              const message = line.slice(spaceIdx + 1);
              socket.emit('logs:data', { containerId, stream: type, timestamp, message });
            } else {
              // Fallback if timestamp wasn't found for some reason
              socket.emit('logs:data', { containerId, stream: type, timestamp: new Date().toISOString(), message: line });
            }
          }
        };

        stdoutStream.on('data', (chunk) => processChunk(chunk, 'stdout'));
        stderrStream.on('data', (chunk) => processChunk(chunk, 'stderr'));

        // 5. Handle Docker stream ending (e.g., container stops)
        stream.on('end', () => {
          socket.emit('logs:status', { containerId, status: 'disconnected' });
          socket.activeLogStream = null;
        });
        
        stream.on('error', (err) => {
          socket.emit('logs:error', { containerId, message: err.message });
          socket.activeLogStream = null;
        });

      } catch (error) {
        socket.emit('logs:error', { containerId, message: error.message || 'Container not found' });
      }
    });

    socket.on('logs:stop', () => {
      if (socket.activeLogStream) {
        socket.activeLogStream.destroy();
        socket.activeLogStream = null;
      }
    });

    socket.on('disconnect', () => {
      if (socket.activeLogStream) {
        socket.activeLogStream.destroy();
        socket.activeLogStream = null;
      }
    });
  });
}
