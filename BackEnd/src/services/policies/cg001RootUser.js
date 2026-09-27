/**
 * Rule CG001 — Root User Execution
 * 
 * Detects whether the container is running as root.
 * Fails when the effective container user is root or configuration indicates root execution.
 * Does not fail merely because the Docker image has no explicit USER instruction
 * if the actual inspected container configuration does not prove root execution.
 */
export function evaluateCG001(inspectData, containerId, containerName) {
  const user = inspectData.Config?.User;

  // Check if explicitly configured as root
  const isExplicitRoot = 
    user === '0' ||
    user === '0:0' ||
    user === 'root' ||
    (typeof user === 'string' && (user.startsWith('0:') || user.startsWith('root:')));

  if (isExplicitRoot) {
    return {
      ruleId: 'CG001',
      ruleName: 'Root User Execution',
      status: 'FAIL',
      severity: 'HIGH',
      containerId,
      containerName,
      message: 'Container is configured to execute as root user.',
      recommendation: 'Specify a dedicated non-root user (e.g., USER 1000:1000 or USER node) in the Dockerfile or container configuration.',
      evidence: `Config.User = "${user}"`
    };
  }

  if (user && typeof user === 'string' && user.trim() !== '') {
    return {
      ruleId: 'CG001',
      ruleName: 'Root User Execution',
      status: 'PASS',
      severity: 'HIGH',
      containerId,
      containerName,
      message: 'Container is configured with a non-root user.',
      recommendation: 'Ensure container file permissions and runtime processes adhere to the principle of least privilege.',
      evidence: `Config.User = "${user}" (non-root)`
    };
  }

  // Not explicitly set to root in container config
  return {
    ruleId: 'CG001',
    ruleName: 'Root User Execution',
    status: 'PASS',
    severity: 'HIGH',
    containerId,
    containerName,
    message: 'No explicit root user configured in container runtime specification.',
    recommendation: 'Explicitly declare a non-root USER in the Dockerfile for defense-in-depth.',
    evidence: 'Config.User is empty or not specified; runtime configuration does not prove root execution.'
  };
}
