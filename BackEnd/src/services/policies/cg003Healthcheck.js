/**
 * Rule CG003 — Missing Healthcheck
 * 
 * Detects whether the container has no configured Docker healthcheck.
 * Fails when the inspected container has no healthcheck configured or healthcheck is NONE.
 * Severity: MEDIUM
 */
export function evaluateCG003(inspectData, containerId, containerName) {
  const healthcheck = inspectData.Config?.Healthcheck;
  const test = healthcheck?.Test;

  const hasHealthcheck = 
    Array.isArray(test) &&
    test.length > 0 &&
    test[0] !== 'NONE';

  if (!hasHealthcheck) {
    return {
      ruleId: 'CG003',
      ruleName: 'Missing Healthcheck',
      status: 'FAIL',
      severity: 'MEDIUM',
      containerId,
      containerName,
      message: 'Container does not have a configured Docker healthcheck instruction.',
      recommendation: 'Configure a HEALTHCHECK instruction in the Dockerfile or docker-compose.yml to monitor application liveness automatically.',
      evidence: healthcheck
        ? `Config.Healthcheck configured with test: ${JSON.stringify(test || [])} (disabled or invalid)`
        : 'Config.Healthcheck is not configured'
    };
  }

  return {
    ruleId: 'CG003',
    ruleName: 'Missing Healthcheck',
    status: 'PASS',
    severity: 'MEDIUM',
    containerId,
    containerName,
    message: 'Container has an active Docker healthcheck configured.',
    recommendation: 'Ensure healthcheck timeout, interval, and retries are properly tuned for production stability.',
    evidence: `Config.Healthcheck.Test = ${JSON.stringify(test)}`
  };
}
