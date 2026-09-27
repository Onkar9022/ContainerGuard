import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import healthRoutes from './routes/healthRoutes.js';
import dockerRoutes from './routes/dockerRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((url) => url.trim())
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging — skip in test
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api', healthRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/alerts', alertRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
