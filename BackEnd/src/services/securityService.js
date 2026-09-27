import { execFile } from 'child_process';
import { getDockerClient } from './dockerService.js';
import { persistScan } from './securityPersistenceService.js';

// Concurrency lock to prevent duplicate concurrent scans for the same image
const activeScans = new Set();

// Configurable scan timeout (defaults to 3 minutes)
const SCAN_TIMEOUT_MS = parseInt(process.env.TRIVY_SCAN_TIMEOUT_MS, 10) || 180000;

// Maximum stdout buffer for Trivy JSON results (50 MB)
const MAX_BUFFER_BYTES = 50 * 1024 * 1024;

/**
 * Validates a Docker image reference.
 * Prevents command injection and rejects invalid references or flags.
 */
export function validateImageName(image) {
  if (!image || typeof image !== 'string') {
    return { valid: false, message: 'Image reference is required and must be a string' };
  }

  const trimmed = image.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: 'Image reference cannot be empty' };
  }

  if (trimmed.length > 300) {
    return { valid: false, message: 'Image reference exceeds maximum allowed length (300 characters)' };
  }

  // Reject arguments starting with '-' (flag injection)
  if (trimmed.startsWith('-')) {
    return { valid: false, message: 'Invalid image name: must not begin with a hyphen' };
  }

  // Reject shell metacharacters or whitespace
  if (/[\s;`|&$><"'\\]/.test(trimmed)) {
    return { valid: false, message: 'Invalid image name: contains disallowed characters' };
  }

  // Regex supporting standard Docker image tags, digests, and registry namespaces
  // e.g., postgres:16, nginx:alpine, localhost:5000/app:1.0, ghcr.io/org/repo:v2
  const DOCKER_IMAGE_REGEX = /^(?:(?=[^:\/]{1,253})(?!-)[a-zA-Z0-9_.-]+(?::[0-9]+)?\/)*(?!-)[a-zA-Z0-9_.-]+(?::(?!-)[a-zA-Z0-9_.-]+)?(?:@sha256:[a-fA-F0-9]{64})?$/;

  if (!DOCKER_IMAGE_REGEX.test(trimmed)) {
    return { valid: false, message: 'Invalid image reference format. Expected format: [registry/][repository:]tag' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Verifies that the requested image is present in the local Docker Engine.
 * Never triggers an automatic remote pull.
 */
export async function checkImageExistsLocally(imageReference) {
  const docker = getDockerClient();

  try {
    const image = docker.getImage(imageReference);
    const inspectData = await image.inspect();
    return { exists: true, data: inspectData };
  } catch (err) {
    if (err.statusCode === 404 || err.message?.toLowerCase().includes('no such image')) {
      // Fallback: check if the image matches any repoTags from listImages
      try {
        const localImages = await docker.listImages({ all: false });
        const match = localImages.find((img) =>
          img.RepoTags?.some((tag) => tag === imageReference || tag.startsWith(`${imageReference}:`)) ||
          img.Id.replace('sha256:', '').startsWith(imageReference.replace('sha256:', ''))
        );
        if (match) {
          return { exists: true, data: match };
        }
      } catch {
        // Ignore fallback listing error
      }
      return { exists: false };
    }
    throw err;
  }
}

/**
 * Checks whether the Trivy binary is installed and executable in PATH.
 */
export async function checkTrivyInstalled() {
  return new Promise((resolve) => {
    execFile('trivy', ['--version'], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve({
          installed: false,
          error: error.code === 'ENOENT'
            ? 'Trivy binary not found in PATH'
            : error.message
        });
      } else {
        const firstLine = stdout.split('\n')[0].trim();
        resolve({
          installed: true,
          version: firstLine || stdout.trim()
        });
      }
    });
  });
}

/**
 * Normalizes Trivy raw JSON vulnerabilities into a standardized schema.
 */
function normalizeTrivyReport(rawReport, imageReference) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };

  const vulnerabilities = [];
  const seenVulnKeys = new Set();

  if (rawReport && Array.isArray(rawReport.Results)) {
    for (const result of rawReport.Results) {
      if (!Array.isArray(result.Vulnerabilities)) continue;

      for (const vuln of result.Vulnerabilities) {
        const vulnId = vuln.VulnerabilityID || 'UNKNOWN-CVE';
        const pkgName = vuln.PkgName || 'unknown-package';
        const dedupeKey = `${vulnId}:${pkgName}`;

        // De-duplicate if same CVE and package appear multiple times across target layers
        if (seenVulnKeys.has(dedupeKey)) continue;
        seenVulnKeys.add(dedupeKey);

        const rawSev = (vuln.Severity || 'UNKNOWN').toUpperCase();
        let normalizedSeverity = 'UNKNOWN';
        if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].includes(rawSev)) {
          normalizedSeverity = rawSev;
        }

        // Increment summary tally
        const tallyKey = normalizedSeverity.toLowerCase();
        if (summary[tallyKey] !== undefined) {
          summary[tallyKey]++;
        } else {
          summary.unknown++;
        }

        vulnerabilities.push({
          vulnerabilityId: vulnId,
          packageName: pkgName,
          installedVersion: vuln.InstalledVersion || 'unknown',
          fixedVersion: vuln.FixedVersion || null,
          severity: normalizedSeverity,
          title: vuln.Title || null,
          description: vuln.Description || null,
          primaryUrl: vuln.PrimaryURL || (vuln.References && vuln.References[0]) || null,
          target: result.Target || null,
        });
      }
    }
  }

  return {
    image: imageReference,
    scanTimestamp: new Date().toISOString(),
    summary,
    totalVulnerabilities: vulnerabilities.length,
    vulnerabilities,
  };
}

/**
 * Executes a vulnerability scan on a verified local Docker image.
 */
export async function scanLocalImage(imageInput) {
  // 1. Validation
  const validation = validateImageName(imageInput);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.statusCode = 400;
    throw error;
  }
  const image = validation.sanitized;

  // 2. Concurrency check
  if (activeScans.has(image)) {
    const error = new Error(`A vulnerability scan is already in progress for '${image}'. Please wait for it to finish.`);
    error.statusCode = 409;
    throw error;
  }

  // 3. Local image existence check (prevent automated pulling)
  const localCheck = await checkImageExistsLocally(image);
  if (!localCheck.exists) {
    const error = new Error(`Image '${image}' was not found in the local Docker image store. Automatic image pulling is disabled. Please pull or build the image before scanning.`);
    error.statusCode = 404;
    throw error;
  }

  // 4. Mark scan in-flight
  activeScans.add(image);
  console.log(`[Security] Starting Trivy scan: ${image}`);

  try {
    const rawJson = await new Promise((resolve, reject) => {
      // Safe execFile with argument array — never shell interpolation
      const args = [
        'image',
        '--format', 'json',
        '--quiet',
        image
      ];

      const child = execFile('trivy', args, {
        timeout: SCAN_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
        windowsHide: true,
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ENOENT') {
            const err = new Error('Trivy CLI is not installed or not found in system PATH. Please verify that Trivy is installed.');
            err.statusCode = 503;
            return reject(err);
          }

          if (error.killed || error.signal === 'SIGTERM') {
            const err = new Error(`Trivy scan timed out after ${Math.round(SCAN_TIMEOUT_MS / 1000)} seconds.`);
            err.statusCode = 504;
            return reject(err);
          }

          const errMsg = stderr ? stderr.trim() : error.message;
          const err = new Error(`Trivy scan failed: ${errMsg}`);
          err.statusCode = 500;
          return reject(err);
        }

        resolve(stdout);
      });
    });

    let parsedReport;
    try {
      parsedReport = JSON.parse(rawJson);
    } catch (parseErr) {
      console.error(`[Security] Failed to parse Trivy JSON output:`, parseErr.message);
      const err = new Error('Failed to parse Trivy vulnerability scan output.');
      err.statusCode = 502;
      throw err;
    }

    const normalizedData = normalizeTrivyReport(parsedReport, image);
    const imageId = localCheck.data?.Id || null;
    
    // Persist to database atomically
    const persistedScan = await persistScan(image, imageId, normalizedData, 'SUCCESS');
    
    console.log(`[Security] Scan completed and persisted: ${image} (${normalizedData.totalVulnerabilities} vulnerabilities found)`);

    // Return in the exact expected format, adding the scanId
    return {
      scanId: persistedScan.id,
      image: normalizedData.image,
      scanTimestamp: normalizedData.scanTimestamp,
      summary: normalizedData.summary,
      totalVulnerabilities: normalizedData.totalVulnerabilities,
      vulnerabilities: persistedScan.vulnerabilities, // Use the DB records which have IDs
    };
  } catch (err) {
    console.error(`[Security] Scan failed for ${image}:`, err.message);
    throw err;
  } finally {
    // 5. Always release scan lock
    activeScans.delete(image);
  }
}
