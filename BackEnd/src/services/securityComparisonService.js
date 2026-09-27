import prisma from '../config/prisma.js';
import { getScanById } from './securityPersistenceService.js';

/**
 * Retrieves the trend data for an image's historical scans.
 */
export async function getScanTrend(image, limit = 10) {
  const take = Math.min(Math.max(1, limit), 30);
  
  const scans = await prisma.securityScan.findMany({
    where: { image, status: 'SUCCESS' },
    orderBy: { scanTimestamp: 'desc' },
    take,
    select: {
      scanTimestamp: true,
      criticalCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      unknownCount: true,
      totalVulnerabilities: true,
    }
  });

  // Reverse to make it chronological for charts (oldest first, newest last)
  return scans.reverse().map(scan => ({
    timestamp: scan.scanTimestamp,
    critical: scan.criticalCount,
    high: scan.highCount,
    medium: scan.mediumCount,
    low: scan.lowCount,
    unknown: scan.unknownCount,
    total: scan.totalVulnerabilities
  }));
}

/**
 * Compares two scans and returns the deltas, new, fixed, and changed vulnerabilities.
 */
export async function compareScans(image, scanId = null) {
  // 1. Determine which scans to compare
  let targetScan;
  let previousScanHeader;

  if (scanId) {
    targetScan = await getScanById(scanId);
    if (!targetScan || targetScan.image !== image) {
      throw new Error(`Scan ID ${scanId} not found or does not belong to image ${image}`);
    }
    
    // Find the immediately preceding successful scan for this image
    previousScanHeader = await prisma.securityScan.findFirst({
      where: {
        image,
        status: 'SUCCESS',
        scanTimestamp: { lt: targetScan.scanTimestamp }
      },
      orderBy: { scanTimestamp: 'desc' },
      select: { id: true }
    });
  } else {
    // Find the latest two successful scans
    const latestScans = await prisma.securityScan.findMany({
      where: { image, status: 'SUCCESS' },
      orderBy: { scanTimestamp: 'desc' },
      take: 2,
      select: { id: true }
    });

    if (latestScans.length === 0) {
      return { image, comparisonAvailable: false, reason: 'No scans available for this image.' };
    }
    if (latestScans.length === 1) {
      return { image, comparisonAvailable: false, reason: 'Only one scan exists. No previous scan to compare against.' };
    }

    targetScan = await getScanById(latestScans[0].id);
    previousScanHeader = { id: latestScans[1].id };
  }

  // If no previous scan exists (e.g. they requested comparison for the very first scan)
  if (!previousScanHeader) {
    return { image, comparisonAvailable: false, reason: 'No previous scan exists prior to this one to compare against.' };
  }

  const previousScan = await getScanById(previousScanHeader.id);

  // 2. Calculate Severity Deltas (Latest - Previous)
  const summary = {
    criticalDelta: targetScan.criticalCount - previousScan.criticalCount,
    highDelta: targetScan.highCount - previousScan.highCount,
    mediumDelta: targetScan.mediumCount - previousScan.mediumCount,
    lowDelta: targetScan.lowCount - previousScan.lowCount,
    unknownDelta: targetScan.unknownCount - previousScan.unknownCount,
    totalDelta: targetScan.totalVulnerabilities - previousScan.totalVulnerabilities,
    newCount: 0,
    fixedCount: 0,
    severityChangedCount: 0,
  };

  // 3. Map Vulnerabilities using Stable Key: vulnerabilityId|packageName
  const prevMap = new Map();
  for (const vuln of previousScan.vulnerabilities) {
    const key = `${vuln.vulnerabilityId}|${vuln.packageName}`;
    prevMap.set(key, vuln);
  }

  const newVulnerabilities = [];
  const severityChanges = [];
  const unchangedVulnerabilities = [];

  // Iterate over target (latest) vulnerabilities
  for (const vuln of targetScan.vulnerabilities) {
    const key = `${vuln.vulnerabilityId}|${vuln.packageName}`;
    
    if (!prevMap.has(key)) {
      newVulnerabilities.push(vuln);
      summary.newCount++;
    } else {
      const prevVuln = prevMap.get(key);
      if (prevVuln.severity !== vuln.severity) {
        severityChanges.push({
          vulnerabilityId: vuln.vulnerabilityId,
          packageName: vuln.packageName,
          previousSeverity: prevVuln.severity,
          currentSeverity: vuln.severity,
          title: vuln.title,
          description: vuln.description
        });
        summary.severityChangedCount++;
      } else {
        unchangedVulnerabilities.push(vuln);
      }
      // Remove from map to track what is leftover (fixed)
      prevMap.delete(key);
    }
  }

  // What remains in prevMap was not found in targetScan -> fixed
  const fixedVulnerabilities = Array.from(prevMap.values());
  summary.fixedCount = fixedVulnerabilities.length;

  return {
    image,
    comparisonAvailable: true,
    latestScan: {
      id: targetScan.id,
      timestamp: targetScan.scanTimestamp,
      summary: {
        critical: targetScan.criticalCount,
        high: targetScan.highCount,
        medium: targetScan.mediumCount,
        low: targetScan.lowCount,
        unknown: targetScan.unknownCount,
      }
    },
    previousScan: {
      id: previousScan.id,
      timestamp: previousScan.scanTimestamp,
      summary: {
        critical: previousScan.criticalCount,
        high: previousScan.highCount,
        medium: previousScan.mediumCount,
        low: previousScan.lowCount,
        unknown: previousScan.unknownCount,
      }
    },
    summary,
    newVulnerabilities,
    fixedVulnerabilities,
    severityChanges
  };
}
