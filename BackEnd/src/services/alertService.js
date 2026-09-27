import prisma from '../config/prisma.js';

/**
 * Ensures the `alerts` table and indexes exist in PostgreSQL.
 * Safe to run on every startup; will not recreate if already exists.
 */
export async function initAlertDatabase() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "alerts" (
          "id" TEXT NOT NULL,
          "alertCode" TEXT NOT NULL,
          "containerId" TEXT NOT NULL,
          "containerName" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "metadata" JSONB,
          "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "resolvedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts"("status");
      CREATE INDEX IF NOT EXISTS "alerts_severity_idx" ON "alerts"("severity");
      CREATE INDEX IF NOT EXISTS "alerts_alertCode_containerId_status_idx" ON "alerts"("alertCode", "containerId", "status");
      CREATE INDEX IF NOT EXISTS "alerts_containerId_idx" ON "alerts"("containerId");
    `);

    console.log('[AlertService] Alerts table verified & indexed in PostgreSQL');
  } catch (err) {
    console.error('[AlertService] Failed to initialize alerts table:', err.message);
  }
}

/**
 * Records a new alert or updates an existing active alert (Deduplication).
 * 
 * Active criteria:
 * Matching (alertCode + containerId) where status !== 'RESOLVED' (i.e. 'OPEN' or 'ACKNOWLEDGED').
 */
export async function recordOrUpdateAlert({
  alertCode,
  containerId,
  containerName,
  severity,
  title,
  message,
  source,
  metadata = null,
}) {
  try {
    const activeAlert = await prisma.alert.findFirst({
      where: {
        alertCode,
        containerId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (activeAlert) {
      // Deduplicate: Update lastSeenAt, message, and metadata
      return await prisma.alert.update({
        where: { id: activeAlert.id },
        data: {
          lastSeenAt: new Date(),
          message,
          containerName,
          metadata: metadata || activeAlert.metadata,
        },
      });
    }

    // New alert instance
    return await prisma.alert.create({
      data: {
        alertCode,
        containerId,
        containerName,
        severity,
        status: 'OPEN',
        title,
        message,
        source,
        metadata: metadata || {},
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        resolvedAt: null,
      },
    });
  } catch (err) {
    console.error(`[AlertService] Failed to record alert ${alertCode} for container ${containerId}:`, err.message);
    throw err;
  }
}

/**
 * Automatically resolves an active alert when the triggering condition clears.
 */
export async function autoResolveAlert(alertCode, containerId, resolutionReason = 'Condition returned to normal') {
  try {
    const activeAlert = await prisma.alert.findFirst({
      where: {
        alertCode,
        containerId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (!activeAlert) return null;

    const currentMeta = typeof activeAlert.metadata === 'object' && activeAlert.metadata !== null 
      ? activeAlert.metadata 
      : {};

    const updatedMeta = {
      ...currentMeta,
      autoResolved: true,
      resolvedReason: resolutionReason,
      autoResolvedAt: new Date().toISOString(),
    };

    return await prisma.alert.update({
      where: { id: activeAlert.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        lastSeenAt: new Date(),
        metadata: updatedMeta,
      },
    });
  } catch (err) {
    console.error(`[AlertService] Failed to auto-resolve alert ${alertCode} for ${containerId}:`, err.message);
    return null;
  }
}

/**
 * Acknowledges an alert (OPEN -> ACKNOWLEDGED).
 */
export async function acknowledgeAlert(id) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) {
    const err = new Error(`Alert "${id}" not found`);
    err.statusCode = 404;
    throw err;
  }

  if (alert.status !== 'OPEN') {
    const err = new Error(`Cannot acknowledge alert with status "${alert.status}" (must be "OPEN")`);
    err.statusCode = 400;
    throw err;
  }

  return await prisma.alert.update({
    where: { id },
    data: {
      status: 'ACKNOWLEDGED',
      updatedAt: new Date(),
    },
  });
}

/**
 * Resolves an alert (OPEN / ACKNOWLEDGED -> RESOLVED).
 */
export async function resolveAlert(id, reason = 'Manually resolved by operator') {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) {
    const err = new Error(`Alert "${id}" not found`);
    err.statusCode = 404;
    throw err;
  }

  if (alert.status === 'RESOLVED') {
    const err = new Error(`Alert "${id}" is already RESOLVED`);
    err.statusCode = 400;
    throw err;
  }

  const currentMeta = typeof alert.metadata === 'object' && alert.metadata !== null 
    ? alert.metadata 
    : {};

  const updatedMeta = {
    ...currentMeta,
    manualResolutionReason: reason,
    manuallyResolvedAt: new Date().toISOString(),
  };

  return await prisma.alert.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      metadata: updatedMeta,
      updatedAt: new Date(),
    },
  });
}

/**
 * Fetches alerts with filtering and pagination.
 */
export async function getAlerts({
  status,
  severity,
  source,
  containerId,
  limit = 50,
  offset = 0,
} = {}) {
  const take = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
  const skip = Math.max(0, parseInt(offset, 10) || 0);

  const where = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (source) where.source = source;
  if (containerId) where.containerId = containerId;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take,
      skip,
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      total,
      limit: take,
      offset: skip,
    },
  };
}

/**
 * Retrieves a single alert by ID.
 */
export async function getAlertById(id) {
  return await prisma.alert.findUnique({ where: { id } });
}

/**
 * Generates an aggregate summary of alert counts across status and severities.
 */
export async function getAlertSummary() {
  const [
    total,
    open,
    acknowledged,
    resolved,
    critical,
    warning,
    notice,
    metricsSource,
    dockerSource,
    securitySource,
    policySource,
  ] = await Promise.all([
    prisma.alert.count(),
    prisma.alert.count({ where: { status: 'OPEN' } }),
    prisma.alert.count({ where: { status: 'ACKNOWLEDGED' } }),
    prisma.alert.count({ where: { status: 'RESOLVED' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'CRITICAL' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'WARNING' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'NOTICE' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, source: 'METRICS' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, source: 'DOCKER' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, source: 'SECURITY' } }),
    prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, source: 'POLICY' } }),
  ]);

  return {
    total,
    open,
    acknowledged,
    resolved,
    critical,
    warning,
    notice,
    bySource: {
      METRICS: metricsSource,
      DOCKER: dockerSource,
      SECURITY: securitySource,
      POLICY: policySource,
    },
  };
}
