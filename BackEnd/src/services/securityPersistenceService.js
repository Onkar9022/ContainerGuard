import prisma from '../config/prisma.js';

/**
 * Persists a completed vulnerability scan to the database atomically.
 */
export async function persistScan(image, imageId, normalizedData, status = 'SUCCESS') {
  if (!normalizedData) return null;

  try {
    return await prisma.securityScan.create({
      data: {
        image,
        imageId,
        status,
        scanTimestamp: new Date(normalizedData.scanTimestamp),
        criticalCount: normalizedData.summary.critical,
        highCount: normalizedData.summary.high,
        mediumCount: normalizedData.summary.medium,
        lowCount: normalizedData.summary.low,
        unknownCount: normalizedData.summary.unknown,
        totalVulnerabilities: normalizedData.totalVulnerabilities,
        
        vulnerabilities: {
          create: normalizedData.vulnerabilities.map((vuln) => ({
            vulnerabilityId: vuln.vulnerabilityId,
            packageName: vuln.packageName,
            installedVersion: vuln.installedVersion,
            fixedVersion: vuln.fixedVersion,
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.description,
            primaryUrl: vuln.primaryUrl,
            target: vuln.target,
          })),
        },
      },
      include: {
        vulnerabilities: true, // Return to include scanId in the response
      }
    });
  } catch (error) {
    console.error(`[Security Persistence] Failed to persist scan for ${image}:`, error);
    throw error;
  }
}

/**
 * Retrieves the latest successful scan for an image.
 */
export async function getLatestScanForImage(image) {
  return await prisma.securityScan.findFirst({
    where: { image, status: 'SUCCESS' },
    orderBy: { scanTimestamp: 'desc' },
  });
}

/**
 * Retrieves the scan history (summaries) for an image.
 */
export async function getScanHistoryForImage(image, limit = 20) {
  const take = Math.min(Math.max(1, limit), 100);
  return await prisma.securityScan.findMany({
    where: { image },
    orderBy: { scanTimestamp: 'desc' },
    take,
    select: {
      id: true,
      image: true,
      imageId: true,
      scanTimestamp: true,
      status: true,
      criticalCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      unknownCount: true,
      totalVulnerabilities: true,
    }
  });
}

/**
 * Retrieves all recent scans (summaries) across all images.
 */
export async function getRecentScans(limit = 20) {
  const take = Math.min(Math.max(1, limit), 100);
  return await prisma.securityScan.findMany({
    orderBy: { scanTimestamp: 'desc' },
    take,
    select: {
      id: true,
      image: true,
      imageId: true,
      scanTimestamp: true,
      status: true,
      criticalCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      unknownCount: true,
      totalVulnerabilities: true,
    }
  });
}

/**
 * Retrieves a specific scan and all its vulnerabilities by ID.
 */
export async function getScanById(scanId) {
  return await prisma.securityScan.findUnique({
    where: { id: scanId },
    include: {
      vulnerabilities: true,
    }
  });
}
