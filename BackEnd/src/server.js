import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import prisma from './config/prisma.js';
import { startMetricsWorker, stopMetricsWorker } from './workers/metricsWorker.js';
import { startAlertWorker, stopAlertWorker } from './workers/alertWorker.js';
import { attachLogSocket } from './services/logService.js';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Wrap Express in a native HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((url) => url.trim())
      : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost'];
      
    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST']
      }
    });

    // Attach Log Streaming Handlers
    attachLogSocket(io);

    httpServer.listen(PORT, async () => {
      console.log(`🚀 ContainerGuard API & Socket.IO running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health:      http://localhost:${PORT}/api/health`);
      
      // Start background workers after successful API binding
      startMetricsWorker();
      await startAlertWorker();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down');
  stopMetricsWorker();
  stopAlertWorker();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received — shutting down');
  stopMetricsWorker();
  stopAlertWorker();
  await prisma.$disconnect();
  process.exit(0);
});

start();
