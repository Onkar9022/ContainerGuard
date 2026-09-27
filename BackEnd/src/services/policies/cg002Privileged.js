/**
 * Rule CG002 — Privileged Container
 * 
 * Detects whether Privileged mode is enabled.
 * Fails when HostConfig.Privileged === true.
 * Severity: CRITICAL
 */
export function evaluateCG002(inspectData, containerId, containerName) {
  const isPrivileged = Boolean(inspectData.HostConfig?.Privileged);

  if (isPrivileged) {
    return {
      ruleId: 'CG002',
      ruleName: 'Privileged Container',
      status: 'FAIL',
      severity: 'CRITICAL',
      containerId,
      containerName,
      message: 'Container is running with privileged mode enabled, granting full host kernel capabilities and device access.',
      recommendation: 'Disable privileged mode (set privileged: false) and grant only specific required Linux capabilities.',
      evidence: 'HostConfig.Privileged = true'
    };
  }

  return {
    ruleId: 'CG002',
    ruleName: 'Privileged Container',
    status: 'PASS',
    severity: 'CRITICAL',
    containerId,
    containerName,
    message: 'Container is running in standard non-privileged mode.',
    recommendation: 'Maintain non-privileged execution to enforce container sandbox boundaries and prevent container breakout.',
    evidence: 'HostConfig.Privileged = false'
  };
}
