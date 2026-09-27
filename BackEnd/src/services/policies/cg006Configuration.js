/**
 * Rule CG006 — Host Network Mode
 * 
 * Detects whether the container is using host networking mode.
 * When NetworkMode is 'host', the container shares the host's network namespace,
 * bypassing Docker network isolation and exposing host network interfaces directly.
 * Severity: HIGH
 */
export function evaluateCG006(inspectData, containerId, containerName) {
  const networkMode = inspectData.HostConfig?.NetworkMode || '';

  const isHostNetwork = networkMode.toLowerCase() === 'host';

  if (isHostNetwork) {
    return {
      ruleId: 'CG006',
      ruleName: 'Host Network Mode',
      status: 'FAIL',
      severity: 'HIGH',
      containerId,
      containerName,
      message: 'Container is configured with host networking mode, sharing the host network namespace directly.',
      recommendation: 'Use a bridge, overlay, or user-defined custom Docker network to isolate container traffic and enforce port mapping boundaries.',
      evidence: 'HostConfig.NetworkMode = "host"'
    };
  }

  return {
    ruleId: 'CG006',
    ruleName: 'Host Network Mode',
    status: 'PASS',
    severity: 'HIGH',
    containerId,
    containerName,
    message: 'Container is operating within an isolated network namespace.',
    recommendation: 'Continue using user-defined bridge networks to restrict container inter-communication.',
    evidence: `HostConfig.NetworkMode = "${networkMode || 'default'}" (isolated)`
  };
}
