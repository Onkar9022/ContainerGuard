import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Shield,
  Scan,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SeverityBadge from '../components/SeverityBadge'
import SearchInput from '../components/SearchInput'
import api from '../services/api'

export default function Security() {
  const location = useLocation()
  const [localImages, setLocalImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(location.state?.image || '')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [trivyStatus, setTrivyStatus] = useState({ checked: false, installed: false, version: '' })
  const [scanHistory, setScanHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  const [comparison, setComparison] = useState(null)
  const [trend, setTrend] = useState([])
  const [loadingComparison, setLoadingComparison] = useState(false)

  // Policy Engine state
  const [activeTab, setActiveTab] = useState('vulnerabilities') // 'vulnerabilities' | 'policies'
  const [containers, setContainers] = useState([])
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [policyData, setPolicyData] = useState(null)
  const [loadingPolicy, setLoadingPolicy] = useState(false)
  const [policyError, setPolicyError] = useState(null)

  // Fetch comparison and trend whenever the selected scan changes
  useEffect(() => {
    if (scanResult?.scanId && selectedImage) {
      fetchComparisonAndTrend(selectedImage, scanResult.scanId)
    } else {
      setComparison(null)
      setTrend([])
    }
  }, [scanResult?.scanId, selectedImage])

  async function fetchComparisonAndTrend(image, scanId) {
    setLoadingComparison(true)
    try {
      const [compRes, trendRes] = await Promise.allSettled([
        api.get(`/api/security/images/${encodeURIComponent(image)}/compare?scanId=${scanId}`),
        api.get(`/api/security/images/${encodeURIComponent(image)}/trend?limit=10`)
      ])
      
      if (compRes.status === 'fulfilled') setComparison(compRes.value?.data || null)
      if (trendRes.status === 'fulfilled') setTrend(compRes.value?.data ? (trendRes.value?.data || []) : [])
    } finally {
      setLoadingComparison(false)
    }
  }

  // 1. Fetch available local images from Docker Engine + previously scanned images + containers
  useEffect(() => {
    async function loadData() {
      try {
        const [imagesRes, statusRes, scansRes, containersRes] = await Promise.allSettled([
          api.get('/api/docker/images'),
          api.get('/api/security/trivy-status'),
          api.get('/api/security/scans?limit=100'),
          api.get('/api/docker/containers')
        ])

        const validImages = new Set()

        // Add local Docker images
        if (imagesRes.status === 'fulfilled' && Array.isArray(imagesRes.value?.data)) {
          for (const img of imagesRes.value.data) {
            if (Array.isArray(img.repoTags)) {
              for (const tag of img.repoTags) {
                if (tag !== '<none>:<none>') {
                  validImages.add(tag)
                }
              }
            }
          }
        }

        // Add images from scan history (so previously scanned images always appear)
        if (scansRes.status === 'fulfilled' && Array.isArray(scansRes.value?.data)) {
          for (const scan of scansRes.value.data) {
            if (scan.image) {
              validImages.add(scan.image)
            }
          }
        }

        const imageList = Array.from(validImages).sort()
        setLocalImages(imageList)
        if (!selectedImage && imageList.length > 0) {
          setSelectedImage(imageList[0])
        }

        if (statusRes.status === 'fulfilled' && statusRes.value?.data) {
          setTrivyStatus({
            checked: true,
            installed: statusRes.value.data.installed,
            version: statusRes.value.data.version || ''
          })
        }

        // Store containers and pick first for policy evaluation
        if (containersRes.status === 'fulfilled' && Array.isArray(containersRes.value?.data)) {
          setContainers(containersRes.value.data)
          if (containersRes.value.data.length > 0 && !selectedContainerId) {
            setSelectedContainerId(containersRes.value.data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load initial security data:', err)
      }
    }
    loadData()
  }, [])

  // Policy Evaluation Fetch
  async function fetchContainerPolicy(containerId) {
    if (!containerId) return
    setLoadingPolicy(true)
    setPolicyError(null)
    try {
      const res = await api.get(`/api/security/policies/${containerId}`)
      if (res?.data) {
        setPolicyData(res.data)
      } else {
        setPolicyData(null)
      }
    } catch (err) {
      console.error('Failed to evaluate policy:', err)
      setPolicyError(err.response?.data?.message || err.message || 'Failed to evaluate container security policies')
      setPolicyData(null)
    } finally {
      setLoadingPolicy(false)
    }
  }

  // Trigger policy evaluation when selected container changes
  useEffect(() => {
    if (selectedContainerId) {
      fetchContainerPolicy(selectedContainerId)
    }
  }, [selectedContainerId])


  // 2. Perform on-demand vulnerability scan
  async function handleScan(imageToScan) {
    const target = (imageToScan || selectedImage || '').trim()
    if (!target) {
      setError('Please select or specify a Docker image to scan.')
      return
    }

    setScanning(true)
    setError(null)

    try {
      // Trivy scan might take 20s - 2min, override default 10s Axios timeout
      const res = await api.post('/api/security/scan', { image: target }, { timeout: 190000 })
      if (res?.data) {
        setScanResult(res.data)
        // Refresh history after a successful scan
        fetchImageHistory(target)
      } else if (res?.success) {
        setScanResult(res)
        fetchImageHistory(target)
      } else {
        throw new Error('No scan data returned from server')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Vulnerability scan failed'
      setError(msg)
    } finally {
      setScanning(false)
    }
  }

  // Fetch history for an image
  async function fetchImageHistory(image) {
    if (!image) return;
    setLoadingHistory(true);
    try {
      const historyRes = await api.get(`/api/security/images/${encodeURIComponent(image)}/history`);
      setScanHistory(historyRes?.data || []);
    } catch (err) {
      console.error('Failed to load history', err);
      setScanHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Fetch latest scan data for an image
  async function fetchLatestScan(image) {
    if (!image) return;
    try {
      const latestRes = await api.get(`/api/security/images/${encodeURIComponent(image)}/latest`);
      setScanResult(latestRes?.data || null);
    } catch (err) {
      setScanResult(null); // No scan exists yet
    }
  }

  // Load history and latest scan when selected image changes
  useEffect(() => {
    if (selectedImage && !scanning) {
      fetchImageHistory(selectedImage);
      fetchLatestScan(selectedImage);
    }
  }, [selectedImage]);

  // Fetch specific historical scan
  async function handleSelectHistoryScan(scanId) {
    try {
      const res = await api.get(`/api/security/scans/${scanId}`);
      if (res?.data) {
        setScanResult(res.data);
      }
    } catch (err) {
      console.error('Failed to load historical scan', err);
      setError('Failed to load the selected historical scan.');
    }
  }

  // Auto-trigger load (or scan) if navigated with an image in state
  useEffect(() => {
    if (location.state?.image) {
      setSelectedImage(location.state.image)
      // We don't auto-scan here anymore to save resources. 
      // The `selectedImage` effect will automatically fetch its history and latest scan instead.
    }
  }, [location.state])

  // Filter vulnerabilities
  const allVulns = scanResult?.vulnerabilities || [];
  let renderTargetVulns = allVulns;
  let isSpecialFilter = false;

  if (activeFilter === 'NEW' && comparison) {
    renderTargetVulns = comparison.newVulnerabilities || [];
    isSpecialFilter = true;
  } else if (activeFilter === 'FIXED' && comparison) {
    renderTargetVulns = comparison.fixedVulnerabilities || [];
    isSpecialFilter = true;
  } else if (activeFilter === 'CHANGED' && comparison) {
    renderTargetVulns = comparison.severityChanges || [];
    isSpecialFilter = true;
  }

  const filteredVulns = renderTargetVulns.filter((v) => {
    if (!isSpecialFilter) {
      // Tab filter for standard view
      if (activeFilter === 'CRITICAL' && v.severity !== 'CRITICAL') return false
      if (activeFilter === 'HIGH' && v.severity !== 'HIGH') return false
      if (activeFilter === 'MEDIUM' && v.severity !== 'MEDIUM') return false
      if (activeFilter === 'LOW' && v.severity !== 'LOW') return false
      if (activeFilter === 'Fixable' && (!v.fixedVersion || v.fixedVersion === 'Not fixed')) return false
    }

    // Search query
    if (search) {
      const q = search.toLowerCase()
      const cveMatch = v.vulnerabilityId?.toLowerCase().includes(q)
      const pkgMatch = v.packageName?.toLowerCase().includes(q)
      const titleMatch = (v.title || '').toLowerCase().includes(q)
      if (!cveMatch && !pkgMatch && !titleMatch) return false
    }

    return true
  })

  // Security Posture Calculation
  const summary = scanResult?.summary || { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 }
  const totalCVEs = scanResult?.totalVulnerabilities || 0

  let grade = '—'
  let gradeColor = 'text-text-muted'
  if (scanResult) {
    if (summary.critical === 0 && summary.high === 0 && summary.medium === 0) {
      grade = 'A'
      gradeColor = 'text-status-success'
    } else if (summary.critical === 0 && summary.high <= 2) {
      grade = 'B'
      gradeColor = 'text-severity-medium'
    } else if (summary.critical === 0) {
      grade = 'C'
      gradeColor = 'text-severity-high'
    } else {
      grade = 'F'
      gradeColor = 'text-severity-critical'
    }
  }

  function renderDelta(val) {
    if (val > 0) return <span className="text-severity-critical font-bold text-[11px] flex items-center"><TrendingUp size={12} className="mr-0.5" /> +{val} (Increased)</span>
    if (val < 0) return <span className="text-status-success font-bold text-[11px] flex items-center"><TrendingDown size={12} className="mr-0.5" /> {val} (Decreased)</span>
    return <span className="text-text-muted font-bold text-[11px] flex items-center"><Minus size={12} className="mr-0.5" /> Unchanged</span>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Vulnerability Management
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-text-primary">Security Center</h1>
            {scanResult && (
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${
                summary.critical > 0 ? 'bg-severity-critical' : 'bg-status-success'
              }`}>
                {summary.critical} Critical CVEs
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            On-demand container image vulnerability scanning powered by Aqua Security Trivy.
          </p>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border-secondary bg-bg-surface px-3 py-1.5 text-[11px] text-text-secondary">
            <Shield size={13} className={trivyStatus.installed ? "text-status-success" : "text-severity-medium"} />
            <span>
              Engine: <strong className="text-text-primary">Trivy</strong>
              {trivyStatus.installed ? ` (Ready)` : ` (Checking...)`}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-primary pb-1">
        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-t-lg transition border-b-2 -mb-[5px] ${
            activeTab === 'vulnerabilities'
              ? 'border-accent-primary text-accent-primary bg-bg-surface/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Shield size={15} />
          <span>Vulnerability Scans & Trends</span>
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-t-lg transition border-b-2 -mb-[5px] ${
            activeTab === 'policies'
              ? 'border-accent-primary text-accent-primary bg-bg-surface/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Security Policy Engine</span>
          {policyData && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              policyData.score >= 80
                ? 'bg-status-success/20 text-status-success'
                : policyData.score >= 50
                ? 'bg-severity-medium/20 text-severity-medium'
                : 'bg-status-danger/20 text-status-danger'
            }`}>
              Score: {policyData.score}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'vulnerabilities' && (
        <>
      {/* Image Scan Control Bar */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <label className="text-[12px] font-semibold text-text-secondary whitespace-nowrap">
            Target Image:
          </label>
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              list="local-images-list"
              value={selectedImage}
              onChange={(e) => setSelectedImage(e.target.value)}
              placeholder="e.g. nginx:alpine or postgres:16"
              disabled={scanning}
              className="w-full rounded-lg border border-border-secondary bg-bg-primary px-3 py-2 text-[13px] text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
            />
            <datalist id="local-images-list">
              {localImages.map((img) => (
                <option key={img} value={img} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => handleScan(selectedImage)}
            disabled={scanning || !selectedImage.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {scanning ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Scanning Image...</span>
              </>
            ) : (
              <>
                <Scan size={14} />
                <span>Scan Image</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-status-error/30 bg-status-error/10 p-3.5 text-[13px] text-status-error">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Scan Error</p>
            <p className="text-[12px] opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Scanning In-Flight Notification */}
      {scanning && (
        <div className="flex items-center gap-3 rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4 text-[13px] text-accent-primary">
          <RefreshCw size={18} className="animate-spin shrink-0" />
          <div>
            <p className="font-semibold">Trivy vulnerability scan in progress for {selectedImage}</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Analyzing OS packages, shared libraries, and dependencies against known CVE databases.
            </p>
          </div>
        </div>
      )}

      {/* Summary Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Overall Posture */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Security Grade</p>
            <Shield size={14} className="text-text-muted" />
          </div>
          <div className="my-2">
            <span className={`text-4xl font-extrabold ${gradeColor}`}>{grade}</span>
          </div>
          <p className="text-[11px] text-text-muted truncate">
            {scanResult ? scanResult.image : 'No image scanned'}
          </p>
        </div>

        {/* Critical */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-critical">Critical</p>
            <span className="h-2 w-2 rounded-full bg-severity-critical" />
          </div>
          <p className="text-3xl font-bold text-severity-critical my-1">{summary.critical}</p>
          <p className="text-[10px] text-text-muted">Requires immediate fix</p>
        </div>

        {/* High */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-high">High</p>
            <span className="h-2 w-2 rounded-full bg-severity-high" />
          </div>
          <p className="text-3xl font-bold text-severity-high my-1">{summary.high}</p>
          <p className="text-[10px] text-text-muted">High priority patch</p>
        </div>

        {/* Medium */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-medium">Medium</p>
            <span className="h-2 w-2 rounded-full bg-severity-medium" />
          </div>
          <p className="text-3xl font-bold text-severity-medium my-1">{summary.medium}</p>
          <p className="text-[10px] text-text-muted">Moderate impact</p>
        </div>

        {/* Low & Unknown */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-severity-low">Low / Other</p>
            <span className="h-2 w-2 rounded-full bg-severity-low" />
          </div>
          <p className="text-3xl font-bold text-text-primary my-1">{summary.low + summary.unknown}</p>
          <p className="text-[10px] text-text-muted">Low severity / unknown</p>
        </div>
      </div>

      {/* Scan History Bar */}
      {scanHistory.length > 0 && (
        <div className="rounded-xl border border-border-primary bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-text-primary">Scan History</p>
            {loadingHistory && <RefreshCw size={12} className="animate-spin text-text-muted" />}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scanHistory.map((hist) => {
              const isSelected = scanResult?.scanId === hist.id;
              return (
                <button
                  key={hist.id}
                  onClick={() => handleSelectHistoryScan(hist.id)}
                  className={`flex-shrink-0 flex flex-col items-start rounded-lg border p-3 text-left transition ${
                    isSelected 
                      ? 'border-accent-primary bg-accent-primary/10' 
                      : 'border-border-secondary bg-bg-primary hover:bg-bg-hover'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-text-primary whitespace-nowrap">
                    {new Date(hist.scanTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-text-muted">
                    <span className="text-severity-critical">C:{hist.criticalCount}</span>
                    <span className="text-severity-high">H:{hist.highCount}</span>
                    <span className="text-severity-medium">M:{hist.mediumCount}</span>
                    <span className="text-severity-low">L:{hist.lowCount}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison & Trend Section */}
      {comparison && comparison.comparisonAvailable && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Trend Chart */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
            <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-4">Severity Trend (Last 10 Scans)</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, {month:'short', day:'numeric'})} stroke="#ffffff40" fontSize={10} />
                  <YAxis stroke="#ffffff40" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1C23', borderColor: '#2E323D', fontSize: '11px', borderRadius: '8px' }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                  />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Summary */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-5 flex flex-col">
            <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-4 flex justify-between">
              <span>Scan Comparison</span>
              <span className="text-[10px] text-text-muted normal-case font-normal">Compared to previous scan</span>
            </h3>
            
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-[10px] text-text-muted mb-1">Critical</p>
                {renderDelta(comparison.summary.criticalDelta)}
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-1">High</p>
                {renderDelta(comparison.summary.highDelta)}
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-1">Medium</p>
                {renderDelta(comparison.summary.mediumDelta)}
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-1">Low</p>
                {renderDelta(comparison.summary.lowDelta)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-auto">
              <div className="rounded border border-border-secondary bg-bg-primary p-3">
                <p className="text-[10px] font-bold text-text-muted uppercase">New Findings</p>
                <p className={`text-xl font-bold mt-1 ${comparison.summary.newCount > 0 ? 'text-severity-critical' : 'text-text-primary'}`}>{comparison.summary.newCount}</p>
              </div>
              <div className="rounded border border-border-secondary bg-bg-primary p-3">
                <p className="text-[10px] font-bold text-text-muted uppercase">Fixed</p>
                <p className={`text-xl font-bold mt-1 ${comparison.summary.fixedCount > 0 ? 'text-status-success' : 'text-text-primary'}`}>{comparison.summary.fixedCount}</p>
              </div>
              <div className="rounded border border-border-secondary bg-bg-primary p-3">
                <p className="text-[10px] font-bold text-text-muted uppercase">Severity Changed</p>
                <p className="text-xl font-bold mt-1 text-text-primary">{comparison.summary.severityChangedCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability Table Card */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border-primary px-5 py-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: 'All', count: totalCVEs },
              { label: 'CRITICAL', count: summary.critical, dot: 'bg-severity-critical' },
              { label: 'HIGH', count: summary.high, dot: 'bg-severity-high' },
              { label: 'MEDIUM', count: summary.medium, dot: 'bg-severity-medium' },
              { label: 'LOW', count: summary.low, dot: 'bg-severity-low' },
              { label: 'Fixable', count: allVulns.filter(v => v.fixedVersion && v.fixedVersion !== 'Not fixed').length },
            ].map((tab) => {
              const active = activeFilter === tab.label
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveFilter(tab.label)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                    active
                      ? 'bg-bg-hover text-text-primary border border-border-secondary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover/50'
                  }`}
                >
                  {tab.dot && <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className="rounded bg-bg-tertiary px-1 py-0.2 text-[10px] text-text-muted font-mono">
                    {tab.count}
                  </span>
                </button>
              )
            })}
            
            {/* Added comparison filter tabs if available */}
            {comparison && comparison.comparisonAvailable && (
              <>
                <div className="w-px h-4 bg-border-primary mx-1"></div>
                <button
                  onClick={() => setActiveFilter('NEW')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${activeFilter === 'NEW' ? 'bg-severity-critical/20 text-severity-critical border border-severity-critical/30' : 'text-severity-critical/70 hover:bg-severity-critical/10'}`}
                >
                  <span>New</span><span className="rounded bg-bg-tertiary px-1 text-[10px]">{comparison.summary.newCount}</span>
                </button>
                <button
                  onClick={() => setActiveFilter('FIXED')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${activeFilter === 'FIXED' ? 'bg-status-success/20 text-status-success border border-status-success/30' : 'text-status-success/70 hover:bg-status-success/10'}`}
                >
                  <span>Fixed</span><span className="rounded bg-bg-tertiary px-1 text-[10px]">{comparison.summary.fixedCount}</span>
                </button>
                <button
                  onClick={() => setActiveFilter('CHANGED')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${activeFilter === 'CHANGED' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' : 'text-accent-primary/70 hover:bg-accent-primary/10'}`}
                >
                  <span>Severity Changed</span><span className="rounded bg-bg-tertiary px-1 text-[10px]">{comparison.summary.severityChangedCount}</span>
                </button>
              </>
            )}
          </div>

          {/* Search box */}
          {allVulns.length > 0 && (
            <SearchInput
              placeholder="Search CVE, package, or title..."
              value={search}
              onChange={setSearch}
              className="w-full sm:w-64"
            />
          )}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[100px_160px_160px_110px_110px_1fr] gap-3 items-center px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary bg-bg-surface">
          <span>Severity</span>
          <span>CVE Identifier</span>
          <span>Package</span>
          <span>Installed</span>
          <span>Fixed In</span>
          <span>Title / Description</span>
        </div>

        {/* Empty States */}
        {!scanResult && !scanning && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Shield size={36} className="text-text-muted mb-3" strokeWidth={1.2} />
            <p className="text-[14px] font-medium text-text-primary">No Scan Performed Yet</p>
            <p className="mt-1 text-[12px] text-text-muted max-w-md">
              Select a local Docker image above and click <strong>"Scan Image"</strong> to run an on-demand vulnerability scan using Trivy.
            </p>
          </div>
        )}

        {scanResult && filteredVulns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <CheckCircle2 size={32} className="text-status-success mb-2" />
            <p className="text-[14px] font-medium text-text-primary">No Vulnerabilities Matching Filter</p>
            <p className="mt-1 text-[12px] text-text-muted">
              {allVulns.length === 0
                ? `Great news! Trivy found 0 vulnerabilities in ${scanResult.image}.`
                : 'Try adjusting your search query or filter tab.'}
            </p>
          </div>
        )}

        {/* Vulnerability rows */}
        {filteredVulns.map((vuln, idx) => (
          <div
            key={`${vuln.vulnerabilityId}-${vuln.packageName}-${idx}`}
            className="grid grid-cols-[100px_160px_160px_110px_110px_1fr] gap-3 items-center px-5 py-3 border-b border-border-primary last:border-b-0 text-[12px] hover:bg-bg-hover transition"
          >
            <div>
              {activeFilter === 'CHANGED' ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 opacity-50 line-through"><SeverityBadge severity={vuln.previousSeverity} /></div>
                  <div className="flex items-center gap-1"><SeverityBadge severity={vuln.currentSeverity} /></div>
                </div>
              ) : (
                <SeverityBadge severity={vuln.severity || vuln.currentSeverity} />
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[12px] text-accent-primary font-medium truncate">
              {vuln.primaryUrl ? (
                <a
                  href={vuln.primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-1 truncate"
                  title="View CVE Details"
                >
                  <span className="truncate">{vuln.vulnerabilityId}</span>
                  <ExternalLink size={11} className="shrink-0 opacity-70" />
                </a>
              ) : (
                <span className="truncate">{vuln.vulnerabilityId}</span>
              )}
            </div>

            <span className="font-mono text-[12px] text-text-primary truncate font-medium">
              {vuln.packageName}
            </span>

            <span className="font-mono text-[11px] text-text-secondary truncate">
              {vuln.installedVersion || '—'}
            </span>

            <span className="font-mono text-[11px] text-status-success truncate font-medium">
              {vuln.fixedVersion || <span className="text-text-muted font-normal">Not fixed</span>}
            </span>

            <div className="truncate text-[12px] text-text-secondary" title={vuln.title || vuln.description || ''}>
              {vuln.title || vuln.description || <span className="text-text-muted italic">No description</span>}
            </div>
          </div>
        ))}

        {/* Footer info */}
        {scanResult && (
          <div className="flex items-center justify-between border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted bg-bg-surface">
            <span>
              Showing {filteredVulns.length} of {totalCVEs} detected CVEs
            </span>
            <span>
              Scanned at: {new Date(scanResult.scanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
      </div>
      </>
      )}

      {/* =================================================================== */}
      {/* 2. SECURITY POLICY ENGINE VIEW                                      */}
      {/* =================================================================== */}
      {activeTab === 'policies' && (
        <div className="space-y-5">
          {/* Policy Engine Header & Target Container Control */}
          <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <label className="text-[12px] font-semibold text-text-secondary whitespace-nowrap">
                Target Container:
              </label>
              <div className="relative flex-1 max-w-lg">
                <select
                  value={selectedContainerId}
                  onChange={(e) => setSelectedContainerId(e.target.value)}
                  disabled={loadingPolicy || containers.length === 0}
                  className="w-full rounded-lg border border-border-secondary bg-bg-primary px-3 py-2 text-[13px] text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.names?.[0] || c.id.slice(0, 12)} ({c.image}) — {c.state}
                    </option>
                  ))}
                  {containers.length === 0 && (
                    <option value="">No running containers detected</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => fetchContainerPolicy(selectedContainerId)}
                disabled={loadingPolicy || !selectedContainerId}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              >
                <RefreshCw size={14} className={loadingPolicy ? "animate-spin" : ""} />
                <span>{loadingPolicy ? "Evaluating Policies..." : "Re-evaluate Policies"}</span>
              </button>
            </div>
          </div>

          {/* Policy Error Banner */}
          {policyError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-[13px] text-status-danger">
              <AlertCircle size={16} className="shrink-0" />
              <span>{policyError}</span>
            </div>
          )}

          {/* Policy Score & Statistics Cards */}
          {policyData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Policy Score Card */}
              <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Policy Score
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${
                    policyData.score >= 80
                      ? 'text-status-success'
                      : policyData.score >= 50
                      ? 'text-severity-medium'
                      : 'text-severity-critical'
                  }`}>
                    {policyData.score}
                  </span>
                  <span className="text-[13px] text-text-muted font-medium">/ 100</span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  {policyData.score >= 80 ? 'Compliant (Low Risk)' : policyData.score >= 50 ? 'Needs Hardening' : 'High Risk'}
                </p>
              </div>

              {/* Total Rules Card */}
              <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Rules Evaluated
                </p>
                <div className="mt-2 text-3xl font-extrabold text-text-primary">
                  {policyData.summary.total}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px]">
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {policyData.summary.passed} Passed
                  </span>
                  <span className="text-severity-critical font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {policyData.summary.failed} Failed
                  </span>
                </div>
              </div>

              {/* Failed Severity Breakdown */}
              <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Violations By Severity
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                  <div className="rounded bg-severity-critical/10 p-1">
                    <span className="text-[10px] text-severity-critical font-bold block">CRIT</span>
                    <span className="text-[14px] font-extrabold text-severity-critical">{policyData.summary.critical}</span>
                  </div>
                  <div className="rounded bg-severity-high/10 p-1">
                    <span className="text-[10px] text-severity-high font-bold block">HIGH</span>
                    <span className="text-[14px] font-extrabold text-severity-high">{policyData.summary.high}</span>
                  </div>
                  <div className="rounded bg-severity-medium/10 p-1">
                    <span className="text-[10px] text-severity-medium font-bold block">MED</span>
                    <span className="text-[14px] font-extrabold text-severity-medium">{policyData.summary.medium}</span>
                  </div>
                  <div className="rounded bg-severity-low/10 p-1">
                    <span className="text-[10px] text-severity-low font-bold block">LOW</span>
                    <span className="text-[14px] font-extrabold text-severity-low">{policyData.summary.low}</span>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-text-muted text-center">
                  Weighted penalty deductions
                </p>
              </div>

              {/* Evaluated Target Details */}
              <div className="rounded-xl border border-border-primary bg-bg-surface p-4 flex flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Inspected Container
                </p>
                <div className="mt-1">
                  <p className="text-[13px] font-bold text-text-primary truncate" title={policyData.containerName}>
                    {policyData.containerName}
                  </p>
                  <p className="text-[11px] font-mono text-accent-primary truncate mt-0.5">
                    {policyData.image || 'No image specified'}
                  </p>
                </div>
                <p className="mt-1 text-[10px] font-mono text-text-muted truncate">
                  ID: {policyData.containerId.slice(0, 12)}
                </p>
              </div>
            </div>
          )}

          {/* Policy Findings List */}
          {policyData && (
            <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
              <div className="border-b border-border-primary px-5 py-3.5 flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-bold text-text-primary">Policy Rule Findings</h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Deterministic evaluation against security benchmarks CG001 through CG006.
                  </p>
                </div>
                <span className="text-[11px] text-text-muted">
                  {policyData.findings.length} Rules Executed
                </span>
              </div>

              <div className="divide-y divide-border-primary">
                {policyData.findings.map((finding) => (
                  <div key={finding.ruleId} className="p-5 hover:bg-bg-hover/50 transition">
                    {/* Finding Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-[12px] bg-bg-primary text-text-primary px-2.5 py-1 rounded border border-border-secondary">
                          {finding.ruleId}
                        </span>
                        <span className="text-[14px] font-bold text-text-primary">
                          {finding.ruleName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} />
                        {finding.status === 'PASS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-status-success/15 text-status-success border border-status-success/30">
                            <CheckCircle2 size={12} /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30">
                            <AlertCircle size={12} /> FAIL
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Finding Message */}
                    <p className="mt-2.5 text-[13px] text-text-secondary leading-relaxed">
                      {finding.message}
                    </p>

                    {/* Evidence Callout */}
                    <div className="mt-2.5 rounded-lg bg-bg-primary border border-border-secondary p-2.5 font-mono text-[11px] text-text-secondary">
                      <span className="font-sans font-semibold text-text-muted mr-1.5 select-none">
                        Evidence:
                      </span>
                      <span className="text-text-primary">{finding.evidence}</span>
                    </div>

                    {/* Recommendation */}
                    <div className="mt-2.5 flex items-start gap-2 text-[12px] text-text-secondary">
                      <Info size={14} className="text-accent-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-text-primary font-medium">Recommendation: </strong>
                        {finding.recommendation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State when no container is available */}
          {!loadingPolicy && !policyData && !policyError && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-xl border border-border-primary bg-bg-surface">
              <Shield size={36} className="text-text-muted mb-3" strokeWidth={1.2} />
              <p className="text-[14px] font-medium text-text-primary">No Container Selected</p>
              <p className="mt-1 text-[12px] text-text-muted max-w-md">
                Select a running Docker container above and click <strong>"Re-evaluate Policies"</strong> to inspect its runtime configuration and security posture.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

