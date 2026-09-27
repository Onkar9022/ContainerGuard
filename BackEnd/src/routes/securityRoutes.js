import { Router } from 'express';
import { scanLocalImage, checkTrivyInstalled } from '../services/securityService.js';
import { 
  getScanHistoryForImage, 
  getLatestScanForImage, 
  getScanById, 
  getRecentScans 
} from '../services/securityPersistenceService.js';
import { compareScans, getScanTrend } from '../services/securityComparisonService.js';
import { 
  evaluateContainerPolicy, 
  evaluateAllContainersPolicies, 
  getPolicySummary 
} from '../services/policyService.js';

const router = Router();

/**
 * POST /api/security/scan
 * Initiates an on-demand vulnerability scan for a local Docker image.
 */
router.post('/scan', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'The "image" field is required in request body (e.g. {"image": "nginx:alpine"})',
      });
    }

    const scanResult = await scanLocalImage(image);
    res.json({
      success: true,
      data: scanResult,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Security scan failed',
    });
  }
});

/**
 * GET /api/security/trivy-status
 * Inspects whether the Trivy binary is installed and accessible to the backend.
 */
router.get('/trivy-status', async (_req, res) => {
  const status = await checkTrivyInstalled();
  res.json({
    success: true,
    data: status,
  });
});

/**
 * GET /api/security/scans
 * Returns recent scan history across all images.
 */
router.get('/scans', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const scans = await getRecentScans(limit);
    res.json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch scan history' });
  }
});

/**
 * GET /api/security/scans/:id
 * Returns a specific scan and all its vulnerabilities by scan ID.
 */
router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await getScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({ success: false, message: 'Scan not found' });
    }
    
    // Remap for frontend compatibility
    const mappedScan = {
      scanId: scan.id,
      image: scan.image,
      scanTimestamp: scan.scanTimestamp,
      summary: {
        critical: scan.criticalCount,
        high: scan.highCount,
        medium: scan.mediumCount,
        low: scan.lowCount,
        unknown: scan.unknownCount,
      },
      totalVulnerabilities: scan.totalVulnerabilities,
      vulnerabilities: scan.vulnerabilities,
    };
    
    res.json({ success: true, data: mappedScan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch scan details' });
  }
});

/**
 * GET /api/security/images/:image/latest
 * Returns the latest successful persisted scan for a specific image.
 */
router.get('/images/:image/latest', async (req, res) => {
  try {
    const image = decodeURIComponent(req.params.image);
    const scan = await getLatestScanForImage(image);
    if (!scan) {
      return res.status(404).json({ success: false, message: 'No scan history found for this image' });
    }
    
    // We need the vulnerabilities for the latest scan to display it
    const fullScan = await getScanById(scan.id);
    
    const mappedScan = {
      scanId: fullScan.id,
      image: fullScan.image,
      scanTimestamp: fullScan.scanTimestamp,
      summary: {
        critical: fullScan.criticalCount,
        high: fullScan.highCount,
        medium: fullScan.mediumCount,
        low: fullScan.lowCount,
        unknown: fullScan.unknownCount,
      },
      totalVulnerabilities: fullScan.totalVulnerabilities,
      vulnerabilities: fullScan.vulnerabilities,
    };
    
    res.json({ success: true, data: mappedScan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch latest image scan' });
  }
});

/**
 * GET /api/security/images/:image/history
 * Returns the historical scans (summaries only) for a specific image.
 */
router.get('/images/:image/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const image = decodeURIComponent(req.params.image);
    const history = await getScanHistoryForImage(image, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch image scan history' });
  }
});

/**
 * GET /api/security/images/:image/compare
 * Compares the latest scan (or a specific scanId) with the previous scan.
 */
router.get('/images/:image/compare', async (req, res) => {
  try {
    const image = decodeURIComponent(req.params.image);
    const scanId = req.query.scanId || null;
    const comparison = await compareScans(image, scanId);
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to compare scans' });
  }
});

/**
 * GET /api/security/images/:image/trend
 * Returns the chronological trend of severity summaries.
 */
router.get('/images/:image/trend', async (req, res) => {
  try {
    const image = decodeURIComponent(req.params.image);
    const limit = parseInt(req.query.limit, 10) || 10;
    const trend = await getScanTrend(image, limit);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch scan trend' });
  }
});

/**
 * GET /api/security/policies/summary
 * Returns overall system security policy compliance summary.
 */
router.get('/policies/summary', async (_req, res) => {
  try {
    const summary = await getPolicySummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch policy summary' });
  }
});

/**
 * GET /api/security/policies
 * Returns policy evaluation findings and scores for all containers.
 */
router.get('/policies', async (_req, res) => {
  try {
    const evaluations = await evaluateAllContainersPolicies();
    res.json({ success: true, data: evaluations });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to evaluate container policies' });
  }
});

/**
 * GET /api/security/policies/:containerId
 * Evaluates security policies for a single container by container ID or name.
 */
router.get('/policies/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const result = await evaluateContainerPolicy(containerId);
    res.json({ success: true, data: result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to evaluate policy for container' });
  }
});

export default router;
