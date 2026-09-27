import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import prisma from './config/prisma.js';
import { startMetricsWorker, stopMetricsWorker } from './workers/metricsWorker.js';
import { startAlertWorker, stopAlertWorker } from './workers/alertWorker.js';
import { attachLogSocket } from './services/logService.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let httpServer = null;

async function start() {
  logger.info('Application startup initiated', {
    service: 'containerguard-backend',
    version: '1.0.0',
    nodeEnv: NODE_ENV,
    port: PORT,
  });

  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('Database connection established successfully', {
      service: 'postgres',
      database: process.env.POSTGRES_DB || 'containerguard',
    });

    // Wrap Express in a native HTTP server
    httpServer = http.createServer(app);

    // Initialize Socket.IO
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((url) => url.trim())
      : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost'];

    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
      },
    });

    // Attach Log Streaming Handlers
    attachLogSocket(io);
    logger.info('Socket.IO initialized for real-time log streaming', {
      allowedOrigins,
    });

    httpServer.listen(PORT, async () => {
      logger.info(`ContainerGuard HTTP API listening on port ${PORT}`, {
        port: PORT,
        nodeEnv: NODE_ENV,
        healthEndpoint: `http://localhost:${PORT}/api/health`,
      });

      // Start background workers after successful API binding
      startMetricsWorker();
      await startAlertWorker();
    });
  } catch (error) {
    logger.fatal('Failed to start ContainerGuard server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Graceful shutdown helper
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal} — initiating graceful shutdown`, { signal });

  try {
    stopMetricsWorker();
    stopAlertWorker();

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
      logger.info('HTTP server closed');
    }

    await prisma.$disconnect();
    logger.info('Database connection closed. Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process-level unhandled errors
process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught exception detected in backend process', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection detected in backend process', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

start();
