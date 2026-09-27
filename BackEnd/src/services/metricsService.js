import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Persists an array of metric objects in a single batch.
 * @param {Array} metrics Array of metric objects
 */
export async function persistMetricsBatch(metrics) {
  if (!metrics || metrics.length === 0) return;

  try {
    const data = metrics.map((m) => ({
      containerId: m.containerId,
      timestamp: new Date(m.timestamp),
      cpuPercent: m.cpuPercent,
      memoryUsage: m.memoryUsage,
      memoryLimit: m.memoryLimit,
      memoryPercent: m.memoryPercent,
      networkRxBytes: m.networkRxBytes,
      networkTxBytes: m.networkTxBytes,
      blockReadBytes: m.blockReadBytes,
      blockWriteBytes: m.blockWriteBytes,
    }));

    await prisma.containerMetric.createMany({
      data,
      skipDuplicates: true,
    });
  } catch (error) {
    // We log the error but don't throw it, so the worker loop is not interrupted.
    logger.error('Failed to persist metrics batch', { context: 'MetricsService', count: metrics.length, error: error.message });
  }
}

/**
 * Retrieves the most recently persisted metric for a specific container.
 * @param {string} containerId 
 */
export async function getLatestMetric(containerId) {
  return await prisma.containerMetric.findFirst({
    where: { containerId },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Retrieves historical metrics for a container within an optional time range.
 * @param {string} containerId 
 * @param {object} options { limit, from, to }
 */
export async function getHistoricalMetrics(containerId, options = {}) {
  let { limit = 100, from, to } = options;
  
  // Enforce sensible bounds
  limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);

  const where = { containerId };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  return await prisma.containerMetric.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
