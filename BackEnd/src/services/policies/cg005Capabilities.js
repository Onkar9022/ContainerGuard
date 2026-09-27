/**
 * Rule CG005 — Excessive Linux Capabilities
 * 
 * Inspects container capabilities. Detects dangerous or excessive capabilities.
 * At minimum explicitly detects:
 * - SYS_ADMIN
 * - NET_ADMIN
 * - SYS_PTRACE
 * - DAC_OVERRIDE
 * - NET_RAW
 * Severity: HIGH
 */
const DANGEROUS_CAPABILITIES = new Set([
  'SYS_ADMIN',
  'NET_ADMIN',
  'SYS_PTRACE',
  'DAC_OVERRIDE',
  'NET_RAW'
]);

export function evaluateCG005(inspectData, containerId, containerName) {
  const capAdd = inspectData.HostConfig?.CapAdd || [];
  const capabilities = inspectData.HostConfig?.Capabilities || [];

  // Normalize capabilities by stripping 'CAP_' prefix and converting to uppercase
  const normalizeCap = (cap) => String(cap || '').toUpperCase().replace(/^CAP_/, '');

  const grantedCaps = [...capAdd, ...capabilities].map(normalizeCap);
  const detectedDangerous = grantedCaps.filter((cap) => DANGEROUS_CAPABILITIES.has(cap));

  // Deduplicate
  const uniqueDangerous = Array.from(new Set(detectedDangerous));

  if (uniqueDangerous.length > 0) {
    return {
      ruleId: 'CG005',
      ruleName: 'Excessive Linux Capabilities',
      status: 'FAIL',
      severity: 'HIGH',
      containerId,
      containerName,
      message: `Container has dangerous Linux capability(ies) granted: ${uniqueDangerous.join(', ')}.`,
      recommendation: `Drop unnecessary capabilities (${uniqueDangerous.join(', ')}) from CapAdd to enforce the principle of least privilege and mitigate kernel escalation risks.`,
      evidence: `Dangerous capabilities detected in HostConfig.CapAdd: [${uniqueDangerous.join(', ')}]`
    };
  }

  return {
    ruleId: 'CG005',
    ruleName: 'Excessive Linux Capabilities',
    status: 'PASS',
    severity: 'HIGH',
    containerId,
    containerName,
    message: 'No dangerous or excessive Linux capabilities granted.',
    recommendation: 'Maintain restricted capabilities and avoid adding high-privilege kernel permissions.',
    evidence: capAdd.length > 0
      ? `HostConfig.CapAdd = ${JSON.stringify(capAdd)} (no dangerous capabilities matched)`
      : 'HostConfig.CapAdd is empty (default restricted Linux capability set)'
  };
}
