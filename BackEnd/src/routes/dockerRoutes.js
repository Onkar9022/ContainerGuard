import { Router } from 'express';
import {
  getDockerInfo,
  listContainers,
  inspectContainer,
  getContainerStats,
  listImages,
  inspectImage,
  listNetworks,
  listVolumes,
  pingDocker,
} from '../services/dockerService.js';
import logger from '../utils/logger.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helper — wraps async Docker calls with consistent JSON responses
// ---------------------------------------------------------------------------
function dockerRoute(fn) {
  return async (req, res, next) => {
    try {
      const data = await fn(req);
      res.json({ success: true, data });
    } catch (err) {
      // Docker connection errors get a 503 (service unavailable)
      // rather than a generic 500
      const isConnectionError =
        err.code === 'ENOENT' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'EACCES';

      const status = isConnectionError ? 503 : err.statusCode || 500;
      const message = isConnectionError
        ? 'Docker Engine unavailable — is the Docker socket mounted and the daemon running?'
        : err.message || 'Docker operation failed';

      logger.error(`Docker integration error: ${message}`, {
        context: 'DockerAPI',
        isConnectionError,
        statusCode: status,
        url: req.originalUrl,
        method: req.method,
        error: err.message,
      });

      res.status(status).json({ success: false, message });
    }
  };
}

// ---------------------------------------------------------------------------
// Routes — read-only Docker operations
// ---------------------------------------------------------------------------

// GET /api/docker/info — Docker Engine information
router.get('/info', dockerRoute(() => getDockerInfo()));

// GET /api/docker/containers — list all containers (running + stopped)
router.get('/containers', dockerRoute(() => listContainers()));

// GET /api/docker/containers/:id/stats — get container runtime statistics
router.get('/containers/:id/stats', dockerRoute((req) => getContainerStats(req.params.id)));

// GET /api/docker/containers/:id — inspect a specific container
router.get('/containers/:id', dockerRoute((req) => inspectContainer(req.params.id)));

// GET /api/docker/images — list images
router.get('/images', dockerRoute(() => listImages()));

// GET /api/docker/images/:id — inspect a specific image
router.get('/images/:id', dockerRoute((req) => inspectImage(req.params.id)));

// GET /api/docker/networks — list networks
router.get('/networks', dockerRoute(() => listNetworks()));

// GET /api/docker/volumes — list volumes
router.get('/volumes', dockerRoute(() => listVolumes()));

// GET /api/docker/ping — lightweight connectivity check
router.get('/ping', dockerRoute(() => pingDocker()));

export default router;
