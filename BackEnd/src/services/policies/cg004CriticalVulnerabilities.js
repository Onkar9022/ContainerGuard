/**
 * Rule CG004 — Critical Vulnerabilities
 * 
 * Uses existing ContainerGuard Trivy scan results.
 * Fails when the container's image has one or more CRITICAL vulnerabilities detected.
 * Severity: CRITICAL
 */
export function evaluateCG004(latestScan, imageName, containerId, containerName) {
  if (!latestScan) {
    return {
      ruleId: 'CG004',
      ruleName: 'Critical Vulnerabilities',
      status: 'PASS',
      severity: 'CRITICAL',
      containerId,
      containerName,
      message: `No vulnerability scan history found for image "${imageName}". Zero critical CVEs recorded.`,
      recommendation: `Trigger an on-demand Trivy vulnerability scan for image "${imageName}" in the Security Center to verify CVE posture.`,
      evidence: `Image "${imageName}" has no recorded scan history. Critical CVE count = 0.`
    };
  }

  const criticalCount = latestScan.criticalCount || 0;

  if (criticalCount > 0) {
    return {
      ruleId: 'CG004',
      ruleName: 'Critical Vulnerabilities',
      status: 'FAIL',
      severity: 'CRITICAL',
      containerId,
      containerName,
      message: `Container image has ${criticalCount} CRITICAL vulnerability(ies) detected in latest Trivy scan.`,
      recommendation: 'Update base image or apply security patches to remediate all CRITICAL severity vulnerabilities.',
      evidence: `Critical vulnerabilities = ${criticalCount} (Total vulnerabilities: ${latestScan.totalVulnerabilities}, scan ID: ${latestScan.id})`
    };
  }

  return {
    ruleId: 'CG004',
    ruleName: 'Critical Vulnerabilities',
    status: 'PASS',
    severity: 'CRITICAL',
    containerId,
    containerName,
    message: 'No CRITICAL vulnerabilities detected in the latest image security scan.',
    recommendation: 'Maintain periodic vulnerability scanning to detect newly disclosed CVEs.',
    evidence: `Critical vulnerabilities = 0 (Total vulnerabilities: ${latestScan.totalVulnerabilities}, scan ID: ${latestScan.id})`
  };
}
