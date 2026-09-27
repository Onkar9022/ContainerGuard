import { Router } from 'express';
import { getMetrics, getMetric } from '../workers/metricsWorker.js';
import { getHistoricalMetrics, getLatestMetric } from '../services/metricsService.js';

const router = Router();

// GET /api/metrics — Returns all current in-memory metrics
router.get('/', (req, res) => {
  const metrics = getMetrics();
  res.json({ success: true, data: metrics });
});

// GET /api/metrics/:containerId/latest — Returns the most recent persisted metric
router.get('/:containerId/latest', async (req, res, next) => {
  try {
    const metric = await getLatestMetric(req.params.containerId);
    if (!metric) {
      return res.status(404).json({ success: false, message: 'No metrics found for this container' });
    }
    res.json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
});

// GET /api/metrics/:containerId/history — Returns historical metrics with optional bounds
router.get('/:containerId/history', async (req, res, next) => {
  try {
    const { limit, from, to } = req.query;
    const history = await getHistoricalMetrics(req.params.containerId, { limit, from, to });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

export default router;
