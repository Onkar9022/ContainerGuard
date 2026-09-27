import { getDockerClient, listContainers } from '../services/dockerService.js';
import { getMetrics } from './metricsWorker.js';
import { getLatestScanForImage } from '../services/securityPersistenceService.js';
import { evaluateContainerPolicy } from '../services/policyService.js';
import { recordOrUpdateAlert, autoResolveAlert, initAlertDatabase } from '../services/alertService.js';
import logger from '../utils/logger.js';

let workerIntervalId = null;
let isEvaluating = false;

// ---------------------------------------------------------------------------
// Configurable Thresholds & Intervals
// ---------------------------------------------------------------------------
const getIntervalMs = () => parseInt(process.env.ALERT_EVALUATION_INTERVAL_MS || '10000', 10);
const getCpuThreshold = () => parseFloat(process.env.CPU_ALERT_THRESHOLD_PERCENT || '80');
const getMemThreshold = () => parseFloat(process.env.MEMORY_ALERT_THRESHOLD_PERCENT || '80');
const getPolicyThreshold = () => parseFloat(process.env.POLICY_ALERT_SCORE_THRESHOLD || '70');
const getRestartThreshold = () => parseInt(process.env.RESTART_LOOP_THRESHOLD || '3', 10);
const getRestartWindowSeconds = () => parseInt(process.env.RESTART_LOOP_WINDOW_SECONDS || '300', 10);

/**
 * Starts the Alert Evaluation background worker.
 */
export async function startAlertWorker() {
  if (workerIntervalId !== null) {
    logger.warn('[AlertWorker] Worker is already running.');
    return;
  }

  // Ensure DB table exists
  await initAlertDatabase();

  const intervalMs = getIntervalMs();
  logger.info('[AlertWorker] Started', { intervalMs });

  workerIntervalId = setInterval(runAlertEvaluation, intervalMs);

  // Initial cycle after 3s to let metrics worker collect first readings
  setTimeout(runAlertEvaluation, 3000);
}

/**
 * Stops the Alert Evaluation background worker gracefully.
 */
export function stopAlertWorker() {
  if (workerIntervalId !== null) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    logger.info('[AlertWorker] Stopped');
  }
}

/**
 * Main evaluation loop across all containers and alert rules.
 */
async function runAlertEvaluation() {
  if (isEvaluating) return;
  isEvaluating = true;

  try {
    const docker = getDockerClient();
    const containers = await listContainers();
    if (!Array.isArray(containers) || containers.length === 0) {
      return;
    }

    // Re-use metrics gathered by the metricsWorker (no redundant Docker stats calls)
    const latestMetrics = getMetrics();
    const metricsMap = new Map();
    for (const m of latestMetrics) {
      metricsMap.set(m.containerId, m);
    }

    const cpuThreshold = getCpuThreshold();
    const memThreshold = getMemThreshold();
    const policyThreshold = getPolicyThreshold();
    const restartThreshold = getRestartThreshold();
    const restartWindowSeconds = getRestartWindowSeconds();

    for (const c of containers) {
      const containerId = c.id;
      const containerName = c.names?.[0] || containerId.slice(0, 12);
      const isRunning = c.state === 'running';

      let inspectData = null;
      try {
        const containerObj = docker.getContainer(containerId);
        inspectData = await containerObj.inspect();
      } catch (inspectErr) {
        // Container might have been removed or stopped
        continue;
      }

      const imageName = inspectData.Config?.Image || c.image || '';

      // ---------------------------------------------------------------------
      // AL001: High CPU Threshold (Source: METRICS)
      // ---------------------------------------------------------------------
      try {
        const metric = metricsMap.get(containerId);
        if (metric && typeof metric.cpuPercent === 'number') {
          if (metric.cpuPercent > cpuThreshold) {
            await recordOrUpdateAlert({
              alertCode: 'AL001',
              containerId,
              containerName,
              severity: 'WARNING',
              title: 'High CPU Usage',
              message: `Container "${containerName}" CPU usage is ${metric.cpuPercent}% (threshold: ${cpuThreshold}%)`,
              source: 'METRICS',
              metadata: {
                cpuPercent: metric.cpuPercent,
                threshold: cpuThreshold,
                recordedAt: metric.timestamp,
              },
            });
          } else {
            await autoResolveAlert('AL001', containerId, `CPU usage (${metric.cpuPercent}%) fell below threshold (${cpuThreshold}%)`);
          }
        }
      } catch (err) {
        logger.warn(`AL001 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }

      // ---------------------------------------------------------------------
      // AL002: High Memory Threshold (Source: METRICS)
      // ---------------------------------------------------------------------
      try {
        const metric = metricsMap.get(containerId);
        if (metric && typeof metric.memoryPercent === 'number') {
          if (metric.memoryPercent > memThreshold) {
            await recordOrUpdateAlert({
              alertCode: 'AL002',
              containerId,
              containerName,
              severity: 'WARNING',
              title: 'High Memory Usage',
              message: `Container "${containerName}" memory usage is ${metric.memoryPercent}% (threshold: ${memThreshold}%)`,
              source: 'METRICS',
              metadata: {
                memoryPercent: metric.memoryPercent,
                memoryUsageBytes: metric.memoryUsage,
                memoryLimitBytes: metric.memoryLimit,
                threshold: memThreshold,
                recordedAt: metric.timestamp,
              },
            });
          } else {
            await autoResolveAlert('AL002', containerId, `Memory usage (${metric.memoryPercent}%) fell below threshold (${memThreshold}%)`);
          }
        }
      } catch (err) {
        logger.warn(`AL002 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }

      // ---------------------------------------------------------------------
      // AL003: Unhealthy Container (Source: DOCKER)
      // ---------------------------------------------------------------------
      try {
        const healthStatus = inspectData.State?.Health?.Status;
        if (healthStatus === 'unhealthy') {
          await recordOrUpdateAlert({
            alertCode: 'AL003',
            containerId,
            containerName,
            severity: 'CRITICAL',
            title: 'Unhealthy Container',
            message: `Container "${containerName}" is failing Docker health checks (status: unhealthy).`,
            source: 'DOCKER',
            metadata: {
              healthStatus,
              failingStreak: inspectData.State?.Health?.FailingStreak || 0,
              log: inspectData.State?.Health?.Log?.slice(-3) || [],
            },
          });
        } else if (healthStatus === 'healthy') {
          await autoResolveAlert('AL003', containerId, 'Docker healthcheck returned to healthy status');
        }
      } catch (err) {
        logger.warn(`AL003 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }

      // ---------------------------------------------------------------------
      // AL004: Restart Loop (Source: DOCKER)
      // ---------------------------------------------------------------------
      try {
        const isRestarting = inspectData.State?.Restarting === true;
        const restartCount = inspectData.RestartCount || 0;
        const startedAt = inspectData.State?.StartedAt ? new Date(inspectData.State.StartedAt).getTime() : 0;
        const uptimeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

        const inRestartLoop = isRestarting || (restartCount >= restartThreshold && uptimeSeconds < restartWindowSeconds);

        if (inRestartLoop) {
          await recordOrUpdateAlert({
            alertCode: 'AL004',
            containerId,
            containerName,
            severity: 'CRITICAL',
            title: 'Container Restart Loop Detected',
            message: `Container "${containerName}" has restarted ${restartCount} times and restarted within the last ${uptimeSeconds}s (window: ${restartWindowSeconds}s).`,
            source: 'DOCKER',
            metadata: {
              restartCount,
              uptimeSeconds,
              isRestarting,
              threshold: restartThreshold,
              windowSeconds: restartWindowSeconds,
              exitCode: inspectData.State?.ExitCode,
            },
          });
        } else if (isRunning && !isRestarting && uptimeSeconds > restartWindowSeconds && restartCount > 0) {
          await autoResolveAlert('AL004', containerId, `Container has stabilized and been running for ${uptimeSeconds}s`);
        }
      } catch (err) {
        logger.warn(`AL004 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }

      // ---------------------------------------------------------------------
      // AL005: Critical Vulnerabilities (Source: SECURITY)
      // ---------------------------------------------------------------------
      try {
        if (imageName) {
          const latestScan = await getLatestScanForImage(imageName);
          if (latestScan && latestScan.criticalCount > 0) {
            await recordOrUpdateAlert({
              alertCode: 'AL005',
              containerId,
              containerName,
              severity: 'CRITICAL',
              title: 'Critical Vulnerabilities Detected',
              message: `Image "${imageName}" running in container "${containerName}" contains ${latestScan.criticalCount} CRITICAL vulnerability(ies).`,
              source: 'SECURITY',
              metadata: {
                image: imageName,
                scanId: latestScan.id,
                criticalCount: latestScan.criticalCount,
                totalVulnerabilities: latestScan.totalVulnerabilities,
                scanTimestamp: latestScan.scanTimestamp,
              },
            });
          } else if (latestScan && latestScan.criticalCount === 0) {
            await autoResolveAlert('AL005', containerId, `Latest scan for image "${imageName}" reports 0 critical vulnerabilities`);
          }
        }
      } catch (err) {
        logger.warn(`AL005 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }

      // ---------------------------------------------------------------------
      // AL006: Low Security Policy Score (Source: POLICY)
      // ---------------------------------------------------------------------
      try {
        const policyResult = await evaluateContainerPolicy(containerId);
        if (policyResult && typeof policyResult.score === 'number') {
          if (policyResult.score < policyThreshold) {
            await recordOrUpdateAlert({
              alertCode: 'AL006',
              containerId,
              containerName,
              severity: 'WARNING',
              title: 'Low Security Policy Score',
              message: `Container "${containerName}" policy score is ${policyResult.score}/100, which is below the compliance threshold (${policyThreshold}/100).`,
              source: 'POLICY',
              metadata: {
                score: policyResult.score,
                threshold: policyThreshold,
                failedRules: policyResult.summary?.failed || 0,
                criticalViolations: policyResult.summary?.critical || 0,
                highViolations: policyResult.summary?.high || 0,
              },
            });
          } else {
            await autoResolveAlert('AL006', containerId, `Security policy score improved to ${policyResult.score}/100 (threshold: ${policyThreshold})`);
          }
        }
      } catch (err) {
        logger.warn(`AL006 check failed for ${containerName}`, { context: 'AlertWorker', containerName, error: err.message });
      }
    }
  } catch (cycleErr) {
    logger.error('[AlertWorker] Error in alert evaluation cycle', {
      error: cycleErr.message,
      stack: cycleErr.stack,
    });
  } finally {
    isEvaluating = false;
  }
}
