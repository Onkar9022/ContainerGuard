import { getDockerClient, listContainers } from './dockerService.js';
import { getLatestScanForImage } from './securityPersistenceService.js';

import { evaluateCG001 } from './policies/cg001RootUser.js';
import { evaluateCG002 } from './policies/cg002Privileged.js';
import { evaluateCG003 } from './policies/cg003Healthcheck.js';
import { evaluateCG004 } from './policies/cg004CriticalVulnerabilities.js';
import { evaluateCG005 } from './policies/cg005Capabilities.js';
import { evaluateCG006 } from './policies/cg006Configuration.js';

/**
 * ============================================================================
 * Security Policy Score Calculation
 * ============================================================================
 * 
 * The policy score is deterministic, reproducible, and transparent.
 * 
 * Baseline Score: 100 points
 * 
 * Penalty deductions are applied for each rule with status === 'FAIL':
 *   - CRITICAL: -30 points (e.g. Privileged Mode, Critical CVEs)
 *   - HIGH:     -15 points (e.g. Root User, Excessive Capabilities, Host Network)
 *   - MEDIUM:   -10 points (e.g. Missing Healthcheck)
 *   - LOW:      -5 points
 *   - INFO:      0 points
 * 
 * Formula:
 *   Score = Math.max(0, 100 - sum(failed_rule_penalties))
 * 
 * Range: [0, 100]
 * ============================================================================
 */
const SEVERITY_PENALTIES = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 10,
  LOW: 5,
  INFO: 0,
};

export function calculatePolicyScore(findings) {
  let penalty = 0;
  for (const finding of findings) {
    if (finding.status === 'FAIL') {
      const deduction = SEVERITY_PENALTIES[finding.severity] ?? 0;
      penalty += deduction;
    }
  }
  return Math.max(0, 100 - penalty);
}

/**
 * Evaluates all deterministic security policies for a single container.
 * 
 * @param {string} containerId - Docker container ID or name
 * @returns {Promise<Object>} Policy evaluation findings and score
 */
export async function evaluateContainerPolicy(containerId) {
  if (!containerId || typeof containerId !== 'string' || containerId.trim() === '') {
    const err = new Error('Container ID must be a non-empty string');
    err.statusCode = 400;
    throw err;
  }

  const docker = getDockerClient();
  let inspectData;

  try {
    const container = docker.getContainer(containerId);
    inspectData = await container.inspect();
  } catch (dockerErr) {
    if (dockerErr.statusCode === 404 || dockerErr.message?.toLowerCase().includes('no such container')) {
      const err = new Error(`Container "${containerId}" not found`);
      err.statusCode = 404;
      throw err;
    }
    const isConnErr = dockerErr.code === 'ENOENT' || dockerErr.code === 'ECONNREFUSED' || dockerErr.code === 'EACCES';
    const err = new Error(isConnErr ? 'Docker Engine unavailable' : dockerErr.message || 'Docker inspect failed');
    err.statusCode = isConnErr ? 503 : (dockerErr.statusCode || 500);
    throw err;
  }

  const normalizedContainerId = inspectData.Id || containerId;
  const containerName = inspectData.Name?.replace(/^\//, '') || containerId;
  const imageName = inspectData.Config?.Image || '';

  // Retrieve latest Trivy scan if available for this container's image
  let latestScan = null;
  try {
    if (imageName) {
      latestScan = await getLatestScanForImage(imageName);
    }
  } catch (scanErr) {
    console.warn(`[Policy Engine] Could not fetch scan for image "${imageName}":`, scanErr.message);
    latestScan = null;
  }

  // Evaluate rules in isolation so one rule throwing never crashes the entire evaluation
  const findings = [];

  const ruleEvaluators = [
    {
      ruleId: 'CG001',
      evalFn: () => evaluateCG001(inspectData, normalizedContainerId, containerName),
    },
    {
      ruleId: 'CG002',
      evalFn: () => evaluateCG002(inspectData, normalizedContainerId, containerName),
    },
    {
      ruleId: 'CG003',
      evalFn: () => evaluateCG003(inspectData, normalizedContainerId, containerName),
    },
    {
      ruleId: 'CG004',
      evalFn: () => evaluateCG004(latestScan, imageName, normalizedContainerId, containerName),
    },
    {
      ruleId: 'CG005',
      evalFn: () => evaluateCG005(inspectData, normalizedContainerId, containerName),
    },
    {
      ruleId: 'CG006',
      evalFn: () => evaluateCG006(inspectData, normalizedContainerId, containerName),
    },
  ];

  for (const { ruleId, evalFn } of ruleEvaluators) {
    try {
      const finding = evalFn();
      findings.push(finding);
    } catch (evalErr) {
      console.error(`[Policy Engine] Evaluation error on rule ${ruleId}:`, evalErr);
      findings.push({
        ruleId,
        ruleName: `Policy ${ruleId}`,
        status: 'FAIL',
        severity: 'MEDIUM',
        containerId: normalizedContainerId,
        containerName,
        message: `Evaluation of rule ${ruleId} encountered an internal error.`,
        recommendation: 'Check Docker container inspect metadata formatting.',
        evidence: `Internal error: ${evalErr.message}`,
      });
    }
  }

  const score = calculatePolicyScore(findings);

  const summary = {
    total: findings.length,
    passed: findings.filter((f) => f.status === 'PASS').length,
    failed: findings.filter((f) => f.status === 'FAIL').length,
    critical: findings.filter((f) => f.status === 'FAIL' && f.severity === 'CRITICAL').length,
    high: findings.filter((f) => f.status === 'FAIL' && f.severity === 'HIGH').length,
    medium: findings.filter((f) => f.status === 'FAIL' && f.severity === 'MEDIUM').length,
    low: findings.filter((f) => f.status === 'FAIL' && f.severity === 'LOW').length,
  };

  return {
    containerId: normalizedContainerId,
    containerName,
    image: imageName,
    score,
    summary,
    findings,
  };
}

/**
 * Evaluates security policies for all discoverable containers.
 * 
 * @returns {Promise<Array>} Array of container policy evaluations
 */
export async function evaluateAllContainersPolicies() {
  const containers = await listContainers();
  if (!Array.isArray(containers) || containers.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    containers.map((c) => evaluateContainerPolicy(c.id))
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Computes system-wide aggregate security policy summary.
 * 
 * @returns {Promise<Object>} Aggregate statistics across all containers
 */
export async function getPolicySummary() {
  const evaluations = await evaluateAllContainersPolicies();

  if (evaluations.length === 0) {
    return {
      totalContainers: 0,
      averageScore: 100,
      totalRulesEvaluated: 0,
      totalPassed: 0,
      totalFailed: 0,
      failedBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      containers: [],
    };
  }

  const totalScore = evaluations.reduce((sum, item) => sum + item.score, 0);
  const averageScore = Math.round((totalScore / evaluations.length) * 10) / 10;

  let totalRulesEvaluated = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const item of evaluations) {
    totalRulesEvaluated += item.summary.total;
    totalPassed += item.summary.passed;
    totalFailed += item.summary.failed;
    critical += item.summary.critical;
    high += item.summary.high;
    medium += item.summary.medium;
    low += item.summary.low;
  }

  return {
    totalContainers: evaluations.length,
    averageScore,
    totalRulesEvaluated,
    totalPassed,
    totalFailed,
    failedBySeverity: {
      critical,
      high,
      medium,
      low,
    },
    containers: evaluations.map((e) => ({
      containerId: e.containerId,
      containerName: e.containerName,
      image: e.image,
      score: e.score,
      summary: e.summary,
    })),
  };
}
