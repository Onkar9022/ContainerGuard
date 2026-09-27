import { listContainers, getContainerStats } from '../services/dockerService.js';
import { persistMetricsBatch } from '../services/metricsService.js';
import logger from '../utils/logger.js';

// In-memory storage for the latest metrics
// Key: containerId, Value: Metric Object
const currentMetrics = new Map();

let workerIntervalId = null;
let isCollecting = false;

// ---------------------------------------------------------------------------
// Worker Control
// ---------------------------------------------------------------------------

export function startMetricsWorker() {
  if (workerIntervalId !== null) {
    logger.warn('[MetricsWorker] Worker is already running.');
    return;
  }

  const intervalMs = parseInt(process.env.METRICS_COLLECTION_INTERVAL_MS || '5000', 10);
  logger.info('[MetricsWorker] Started', { intervalMs });

  workerIntervalId = setInterval(collectMetrics, intervalMs);
  
  // Trigger first collection immediately
  collectMetrics();
}

export function stopMetricsWorker() {
  if (workerIntervalId !== null) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    logger.info('[MetricsWorker] Stopped');
  }
}

// ---------------------------------------------------------------------------
// Core Collection Logic
// ---------------------------------------------------------------------------

async function collectMetrics() {
  // Prevent overlapping collections
  if (isCollecting) return;
  isCollecting = true;

  try {
    // 1. Get all currently running containers
    // listContainers() by default without {all: true} gets running ones if we wrap it,
    // but the existing listContainers passes {all: true}. We'll filter it.
    const allContainers = await listContainers();
    const runningContainers = allContainers.filter(c => c.state === 'running');
    
    const activeIds = new Set(runningContainers.map(c => c.id));
    let successCount = 0;

    // 2. Fetch stats for each running container
    for (const container of runningContainers) {
      try {
        const stats = await getContainerStats(container.id);
        currentMetrics.set(container.id, stats);
        successCount++;
      } catch (err) {
        logger.warn(`[MetricsWorker] Failed to collect metrics for container`, {
          containerId: container.id.slice(0, 12),
          error: err.message,
        });
      }
    }

    // 3. Persist the newly collected metrics safely to the database
    const metricsToPersist = Array.from(currentMetrics.values());
    await persistMetricsBatch(metricsToPersist);

    // 4. Cleanup stale metrics (containers that stopped/disappeared)
    for (const id of currentMetrics.keys()) {
      if (!activeIds.has(id)) {
        currentMetrics.delete(id);
      }
    }

    logger.debug(`[MetricsWorker] Collected and persisted metrics`, {
      successCount,
      runningContainers: runningContainers.length,
    });

  } catch (err) {
    logger.error(`[MetricsWorker] Failed to run collection cycle`, {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isCollecting = false;
  }
}

// ---------------------------------------------------------------------------
// API Accessors
// ---------------------------------------------------------------------------

export function getMetrics() {
  // Return array of all metrics
  return Array.from(currentMetrics.values());
}

export function getMetric(containerId) {
  return currentMetrics.get(containerId) || null;
}
