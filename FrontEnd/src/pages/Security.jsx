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
  ChevronRight,
  TrendingUp,
  Minus,
  Check,
  XCircle,
  Lock,
  Layers,
  Search,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import SeverityBadge from '../components/SeverityBadge'
import SearchInput from '../components/SearchInput'
import ChartTooltip from '../components/ChartTooltip'
import ProgressBar from '../components/ProgressBar'
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
  const [expandedCve, setExpandedCve] = useState(null)

  // Comparison & Trend
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
  const [expandedRule, setExpandedRule] = useState(null)

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [imagesRes, statusRes, scansRes, containersRes] = await Promise.allSettled([
          api.get('/api/docker/images'),
          api.get('/api/security/trivy-status'),
          api.get('/api/security/scans?limit=100'),
          api.get('/api/docker/containers'),
        ])

        const validImages = new Set()

        if (imagesRes.status === 'fulfilled' && Array.isArray(imagesRes.value?.data)) {
          for (const img of imagesRes.value.data) {
            if (Array.isArray(img.repoTags)) {
              for (const tag of img.repoTags) {
                if (tag !== '<none>:<none>') validImages.add(tag)
              }
            }
          }
        }

        if (scansRes.status === 'fulfilled' && Array.isArray(scansRes.value?.data)) {
          for (const scan of scansRes.value.data) {
            if (scan.image) validImages.add(scan.image)
          }
        }

        const imgList = Array.from(validImages).sort()
        setLocalImages(imgList)

        if (!selectedImage && imgList.length > 0) {
          setSelectedImage(imgList[0])
        }

        if (statusRes.status === 'fulfilled') {
          setTrivyStatus({ checked: true, ...statusRes.value?.data })
        }

        if (containersRes.status === 'fulfilled') {
          const contList = containersRes.value?.data || []
          setContainers(contList)
          if (contList.length > 0 && !selectedContainerId) {
            setSelectedContainerId(contList[0].id)
          }
        }
      } catch {
        // Fallback silently
      }
    }
    loadData()
  }, [])

  // Fetch scan history and comparison when image changes
  useEffect(() => {
    if (!selectedImage) return

    // Reset previous scan result and comparison immediately when target image changes
    setScanResult(null)
    setComparison(null)
    setTrend([])
    setError(null)

    async function loadLatestForImage() {
      try {
        const res = await api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/latest`)
        if (res.data) {
          setScanResult(res.data)
        }
      } catch {
        setScanResult(null)
      }
    }

    async function loadHistory() {
      try {
        const res = await api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/history?limit=10`)
        setScanHistory(res.data || [])
      } catch {
        setScanHistory([])
      }
    }

    loadLatestForImage()
    loadHistory()
  }, [selectedImage])

  // Comparison & Trend — only run when the scanResult actually matches the currently selectedImage
  useEffect(() => {
    if (scanResult?.scanId && scanResult?.image === selectedImage) {
      setLoadingComparison(true)
      Promise.allSettled([
        api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/compare?scanId=${scanResult.scanId}`),
        api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/trend?limit=10`),
      ]).then(([compRes, trendRes]) => {
        if (compRes.status === 'fulfilled') setComparison(compRes.value?.data || null)
        if (trendRes.status === 'fulfilled') {
          const raw = trendRes.value?.data || []
          setTrend(
            raw.map((t) => ({
              time: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              critical: t.critical,
              high: t.high,
              total: t.total,
            }))
          )
        }
        setLoadingComparison(false)
      })
    } else {
      setComparison(null)
      setTrend([])
    }
  }, [scanResult?.scanId, scanResult?.image, selectedImage])

  // Trigger Trivy Scan with extended timeout (5 minutes)
  async function handleScan() {
    if (!selectedImage) return
    setScanning(true)
    setError(null)

    try {
      const res = await api.post('/api/security/scan', { image: selectedImage }, { timeout: 300000 })
      setScanResult(res.data)
      const histRes = await api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/history?limit=10`)
      setScanHistory(histRes.data || [])
    } catch (err) {
      if (err.response?.status === 409) {
        setError('A vulnerability scan is currently processing for this image in the background. Retrying to load results...')
        // Poll for results after 5s
        setTimeout(async () => {
          try {
            const checkRes = await api.get(`/api/security/images/${encodeURIComponent(selectedImage)}/latest`)
            if (checkRes.data) {
              setScanResult(checkRes.data)
              setError(null)
            }
          } catch {
            // Still in progress
          }
        }, 5000)
      } else {
        setError(err.response?.data?.message || err.message || 'Trivy vulnerability scan failed')
      }
    } finally {
      setScanning(false)
    }
  }

  // Fetch Policy Evaluation for Container (Correct Route: /api/security/policies/:containerId)
  useEffect(() => {
    if (activeTab === 'policies' && selectedContainerId) {
      setLoadingPolicy(true)
      setPolicyError(null)

      api.get(`/api/security/policies/${selectedContainerId}`)
        .then((res) => {
          setPolicyData(res.data)
        })
        .catch((err) => {
          setPolicyError(err.response?.data?.message || 'Failed to evaluate container policies')
          setPolicyData(null)
        })
        .finally(() => setLoadingPolicy(false))
    }
  }, [activeTab, selectedContainerId])

  // Filter vulnerabilities
  const vulnerabilities = scanResult?.vulnerabilities || []
  const filteredVulns = vulnerabilities.filter((v) => {
    const matchesFilter =
      activeFilter === 'All' ||
      v.severity?.toUpperCase() === activeFilter.toUpperCase()

    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      v.vulnerabilityId?.toLowerCase().includes(q) ||
      v.packageName?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q)

    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Security Center</h1>
            <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] text-[#A7B0BE]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  trivyStatus.installed ? 'bg-[#36D6B4] shadow-[0_0_6px_#36D6B4]' : 'bg-[#FF5C70]'
                }`}
              />
              <span>Trivy {trivyStatus.installed ? (trivyStatus.version || 'Active') : 'Offline'}</span>
            </div>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Container image vulnerability analysis, CVE tracking, and security policy compliance.
          </p>
        </div>

        {/* Tab Toggle: Vulnerability Scans vs Policy Engine */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#11161F] p-1">
          <button
            onClick={() => setActiveTab('vulnerabilities')}
            className={`rounded-md px-3 py-1 font-medium text-[12px] transition ${
              activeTab === 'vulnerabilities'
                ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
            }`}
          >
            Vulnerability Scans
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`rounded-md px-3 py-1 font-medium text-[12px] transition ${
              activeTab === 'policies'
                ? 'bg-[#151B24] text-[#36D6B4] shadow-sm'
                : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
            }`}
          >
            Security Policy Engine
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: VULNERABILITY SCANS (TRIVY) */}
      {/* ========================================================================= */}
      {activeTab === 'vulnerabilities' && (
        <div className="space-y-5">
          {/* Target Selector & Scan Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-3">
            <div className="flex flex-1 items-center gap-3">
              <span className="font-mono text-[11px] text-[#697384] uppercase">Target Image:</span>
              <select
                value={selectedImage}
                onChange={(e) => setSelectedImage(e.target.value)}
                disabled={scanning}
                className="flex-1 max-w-md h-9 rounded-lg border border-white/[0.08] bg-[#0D1118] px-3 font-mono text-[12px] text-[#F3F5F7] outline-none focus:border-[#36D6B4]/50"
              >
                {localImages.map((img) => (
                  <option key={img} value={img}>
                    {img}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleScan}
              disabled={scanning || !selectedImage}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#36D6B4] px-4 py-2 text-[12px] font-semibold text-[#080B10] shadow-[0_0_15px_rgba(54,214,180,0.25)] hover:bg-[#4DE1C1] disabled:opacity-50 transition"
            >
              {scanning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Scanning Image...</span>
                </>
              ) : (
                <>
                  <Scan size={14} />
                  <span>Trigger Vulnerability Scan</span>
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-[#FF5C70]/30 bg-[#FF5C70]/10 p-4 text-[12px] text-[#FF5C70] flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Severity Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#FF5C70]/20 bg-[#11161F] p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#697384]">
                <span>CRITICAL</span>
                <span className="h-2 w-2 rounded-full bg-[#FF5C70] shadow-[0_0_6px_#FF5C70]" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-[#FF5C70]">
                {scanResult?.summary?.critical ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-[#697384]">Direct exploitation risk</div>
            </div>

            <div className="rounded-xl border border-[#FF9B54]/20 bg-[#11161F] p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#697384]">
                <span>HIGH</span>
                <span className="h-2 w-2 rounded-full bg-[#FF9B54]" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-[#FF9B54]">
                {scanResult?.summary?.high ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-[#697384]">Elevation of privilege</div>
            </div>

            <div className="rounded-xl border border-[#F2C94C]/20 bg-[#11161F] p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#697384]">
                <span>MEDIUM</span>
                <span className="h-2 w-2 rounded-full bg-[#F2C94C]" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-[#F2C94C]">
                {scanResult?.summary?.medium ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-[#697384]">Denial of service/leak</div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#697384]">
                <span>TOTAL VULNERABILITIES</span>
                <span className="h-2 w-2 rounded-full bg-[#36D6B4]" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-[#F3F5F7]">
                {scanResult?.totalVulnerabilities ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-[#697384]">
                {scanResult ? new Date(scanResult.scanTimestamp).toLocaleString() : 'No scan records'}
              </div>
            </div>
          </div>

          {/* Historical Vulnerability Trend */}
          {trend.length > 1 && (
            <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#36D6B4]" />
                  <h2 className="text-[13px] font-semibold text-[#F3F5F7]">Vulnerability Trajectory</h2>
                </div>
                <span className="font-mono text-[10px] text-[#697384]">Historical Scans</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#697384', fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="critical" name="Critical" stroke="#FF5C70" strokeWidth={1.8} dot={false} />
                    <Line type="monotone" dataKey="high" name="High" stroke="#FF9B54" strokeWidth={1.8} dot={false} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#36D6B4" strokeWidth={1.8} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Vulnerability Table Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1">
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setActiveFilter(sev)}
                  className={`rounded-md px-3 py-1 font-mono text-[11px] transition ${
                    activeFilter === sev
                      ? 'bg-[#151B24] text-[#36D6B4] font-semibold shadow-sm'
                      : 'text-[#A7B0BE] hover:text-[#F3F5F7]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Search CVE, package, or description..."
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>

          {/* Vulnerability Findings Table */}
          <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
            <div className="grid grid-cols-[90px_140px_1.5fr_100px_100px_40px] gap-3 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
              <span>Severity</span>
              <span>CVE ID</span>
              <span>Package & Target</span>
              <span>Installed</span>
              <span>Fixed In</span>
              <span className="text-right">Info</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {filteredVulns.length === 0 ? (
                <div className="py-16 text-center text-[#697384] font-mono text-[12px]">
                  {scanResult
                    ? 'No vulnerabilities matched the current filter.'
                    : 'Select a container image and click "Trigger Vulnerability Scan" to begin analysis.'}
                </div>
              ) : (
                filteredVulns.map((v) => {
                  const isExpanded = expandedCve === v.vulnerabilityId
                  return (
                    <div key={v.vulnerabilityId + v.packageName} className="transition-colors">
                      <div
                        onClick={() => setExpandedCve(isExpanded ? null : v.vulnerabilityId)}
                        className="grid grid-cols-[90px_140px_1.5fr_100px_100px_40px] gap-3 items-center px-5 py-3 text-[12px] cursor-pointer hover:bg-[#151B24]"
                      >
                        <div>
                          <SeverityBadge severity={v.severity} size="sm" />
                        </div>
                        <div className="font-mono text-[11px] font-semibold text-[#F3F5F7]">
                          {v.vulnerabilityId}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-[#F3F5F7]">{v.packageName}</span>
                          {v.target && (
                            <span className="ml-2 font-mono text-[10px] text-[#697384] truncate">
                              ({v.target})
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-[#FF5C70]">
                          {v.installedVersion || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-[#35D399]">
                          {v.fixedVersion || 'No Fix'}
                        </div>
                        <div className="flex justify-end text-[#697384]">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="bg-[#0D1118] px-5 py-3 border-t border-white/[0.04] text-[12px] space-y-2 animate-fade-in">
                          <p className="text-[#A7B0BE] leading-relaxed">
                            {v.description || 'No detailed CVE description provided by security database.'}
                          </p>
                          {v.primaryUrl && (
                            <a
                              href={v.primaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#36D6B4] hover:underline"
                            >
                              <span>Official Advisory & Proof-of-Concept</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SECURITY POLICY ENGINE (CG001–CG006) */}
      {/* ========================================================================= */}
      {activeTab === 'policies' && (
        <div className="space-y-5">
          {/* Target Container Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-3">
            <div className="flex flex-1 items-center gap-3">
              <span className="font-mono text-[11px] text-[#697384] uppercase">Target Container:</span>
              <select
                value={selectedContainerId}
                onChange={(e) => setSelectedContainerId(e.target.value)}
                className="flex-1 max-w-md h-9 rounded-lg border border-white/[0.08] bg-[#0D1118] px-3 font-mono text-[12px] text-[#F3F5F7] outline-none focus:border-[#36D6B4]/50"
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.names?.[0]?.replace(/^\//, '') || c.id.slice(0, 12)} ({c.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compliance Score Summary Card */}
          {policyData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Score */}
              <div className="rounded-xl border border-[#36D6B4]/30 bg-[#11161F] p-4 flex flex-col justify-between">
                <span className="font-mono text-[11px] text-[#697384] uppercase">POLICY COMPLIANCE SCORE</span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-mono text-[#36D6B4]">
                    {policyData.score}
                  </span>
                  <span className="text-sm font-mono text-[#697384]">/ 100</span>
                </div>
                <ProgressBar value={policyData.score} max={100} size="sm" color="teal" />
              </div>

              {/* Rules Evaluated */}
              <div className="rounded-xl border border-white/[0.07] bg-[#11161F] p-4">
                <span className="font-mono text-[11px] text-[#697384] uppercase">RULES EVALUATED</span>
                <div className="mt-2 text-3xl font-bold font-mono text-[#F3F5F7]">
                  {policyData.findings?.length || 6}
                </div>
                <span className="text-[11px] text-[#697384]">Standard CIS / CG001–CG006</span>
              </div>

              {/* Passed */}
              <div className="rounded-xl border border-[#35D399]/20 bg-[#11161F] p-4">
                <span className="font-mono text-[11px] text-[#697384] uppercase">RULES PASSED</span>
                <div className="mt-2 text-3xl font-bold font-mono text-[#35D399]">
                  {policyData.summary?.passed ?? 0}
                </div>
                <span className="text-[11px] text-[#35D399]">✓ Hardening verified</span>
              </div>

              {/* Failed */}
              <div className="rounded-xl border border-[#FF5C70]/20 bg-[#11161F] p-4">
                <span className="font-mono text-[11px] text-[#697384] uppercase">VIOLATIONS DETECTED</span>
                <div className="mt-2 text-3xl font-bold font-mono text-[#FF5C70]">
                  {policyData.summary?.failed ?? 0}
                </div>
                <span className="text-[11px] text-[#FF5C70]">✗ Remediation required</span>
              </div>
            </div>
          )}

          {/* Rule Breakdown Cards (CG001–CG006) */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-[#F3F5F7] font-mono uppercase tracking-wider">
              Evaluated Policy Rules (CG001–CG006)
            </h2>

            {loadingPolicy ? (
              <div className="py-16 text-center text-[#697384] font-mono text-[12px]">
                Evaluating Docker runtime security policies...
              </div>
            ) : policyError ? (
              <div className="rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/10 p-4 text-[12px] text-[#FF5C70]">
                {policyError}
              </div>
            ) : (
              policyData?.findings?.map((rule) => {
                const isPassed = rule.status === 'PASS'
                const isExpanded = expandedRule === rule.ruleId

                return (
                  <div
                    key={rule.ruleId}
                    className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedRule(isExpanded ? null : rule.ruleId)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#151B24] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isPassed
                              ? 'border-[#35D399]/20 bg-[#35D399]/10 text-[#35D399]'
                              : 'border-[#FF5C70]/20 bg-[#FF5C70]/10 text-[#FF5C70]'
                          }`}
                        >
                          {isPassed ? <Check size={16} /> : <XCircle size={16} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-[#36D6B4]">
                              [{rule.ruleId}]
                            </span>
                            <span className="font-semibold text-[#F3F5F7] text-[13px] truncate">
                              {rule.ruleName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-[#A7B0BE] truncate">
                            {rule.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            isPassed
                              ? 'border-[#35D399]/30 bg-[#35D399]/10 text-[#35D399]'
                              : 'border-[#FF5C70]/30 bg-[#FF5C70]/10 text-[#FF5C70]'
                          }`}
                        >
                          {rule.status}
                        </span>
                        {isExpanded ? <ChevronDown size={15} className="text-[#697384]" /> : <ChevronRight size={15} className="text-[#697384]" />}
                      </div>
                    </div>

                    {/* Expandable Remediation & Evidence */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.05] bg-[#0D1118] p-4 text-[12px] space-y-3 font-mono animate-fade-in">
                        {rule.evidence && (
                          <div>
                            <span className="text-[#697384] text-[11px] block uppercase">Diagnostic Evidence:</span>
                            <p className="mt-1 text-[#F3F5F7] bg-white/[0.02] p-2 rounded border border-white/5">
                              {rule.evidence}
                            </p>
                          </div>
                        )}
                        {rule.recommendation && (
                          <div>
                            <span className="text-[#36D6B4] text-[11px] block uppercase">Security Recommendation:</span>
                            <p className="mt-1 text-[#A7B0BE] bg-white/[0.02] p-2 rounded border border-white/5">
                              {rule.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
