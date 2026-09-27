import { Router } from 'express';
import {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getAlertSummary,
} from '../services/alertService.js';

const router = Router();

/**
 * GET /api/alerts/summary
 * Returns aggregate counts of alerts across status, severity, and sources.
 */
router.get('/summary', async (_req, res, next) => {
  try {
    const summary = await getAlertSummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alerts
 * Lists alerts with optional filtering by status, severity, source, and containerId.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, severity, source, containerId, limit, offset } = req.query;

    const result = await getAlerts({
      status,
      severity,
      source,
      containerId,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.alerts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alerts/:id
 * Fetches a single alert by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Alert "${req.params.id}" not found`,
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/alerts/:id/acknowledge
 * Transitions an alert from OPEN to ACKNOWLEDGED.
 */
router.patch('/:id/acknowledge', async (req, res, next) => {
  try {
    const updated = await acknowledgeAlert(req.params.id);
    res.json({
      success: true,
      data: updated,
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to acknowledge alert',
    });
  }
});

/**
 * PATCH /api/alerts/:id/resolve
 * Transitions an alert from OPEN or ACKNOWLEDGED to RESOLVED.
 */
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const reason = req.body?.reason || 'Manually resolved by operator';
    const updated = await resolveAlert(req.params.id, reason);
    res.json({
      success: true,
      data: updated,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to resolve alert',
    });
  }
});

export default router;
