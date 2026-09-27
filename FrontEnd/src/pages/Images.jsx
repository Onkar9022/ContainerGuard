import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  RefreshCw,
  AlertCircle,
  Shield,
  Copy,
  Check,
  ArrowRight,
  HardDrive,
} from 'lucide-react'
import SearchInput from '../components/SearchInput'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Images() {
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const fetchImages = async () => {
    try {
      const res = await api.get('/api/docker/images')
      setImages(res.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch Docker images')
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  function formatSize(bytes) {
    if (!bytes) return '—'
    const mb = bytes / (1024 ** 2)
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  function formatCreated(ts) {
    if (!ts) return '—'
    const d = new Date(ts * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function parseRepoTag(repoTags) {
    if (!repoTags || repoTags.length === 0 || repoTags[0] === '<none>:<none>') {
      return { repo: '<untagged>', tag: '<none>' }
    }
    const full = repoTags[0]
    const lastColon = full.lastIndexOf(':')
    if (lastColon === -1) return { repo: full, tag: 'latest' }
    return {
      repo: full.slice(0, lastColon),
      tag: full.slice(lastColon + 1),
    }
  }

  const handleCopy = (text, id, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = images.filter((img) => {
    if (!search) return true
    const { repo, tag } = parseRepoTag(img.repoTags)
    const q = search.toLowerCase()
    return (
      repo.toLowerCase().includes(q) ||
      tag.toLowerCase().includes(q) ||
      img.id.toLowerCase().includes(q)
    )
  })

  // Total size across all images
  const totalSizeBytes = images.reduce((acc, curr) => acc + (curr.size || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">Image Inventory</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              {images.length} Images ({formatSize(totalSizeBytes)})
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Docker image repository inventory, storage footprint, and vulnerability scan triggers.
          </p>
        </div>

        <button
          onClick={fetchImages}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#11161F] px-3 py-1.5 text-[12px] font-medium text-[#A7B0BE] hover:bg-[#151B24] hover:text-[#F3F5F7] transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#11161F] p-2.5">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search by repository, tag, or SHA..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[13px] text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Inventory Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#11161F] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[minmax(200px,1.6fr)_140px_150px_90px_110px_130px] gap-4 px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#697384] border-b border-white/[0.06] bg-[#0D1118]">
              <span>Repository</span>
              <span>Tag</span>
              <span>Image ID</span>
              <span>Size</span>
              <span>Created</span>
              <span className="text-right">Security Scan</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <EmptyState
                    icon={Box}
                    title="No Docker images found"
                    message={
                      search
                        ? `No images match your search query "${search}".`
                        : 'No images found in local Docker store.'
                    }
                  />
                </div>
              ) : (
                filtered.map((img) => {
                  const { repo, tag } = parseRepoTag(img.repoTags)
                  const shortId = img.id.replace('sha256:', '').slice(0, 12)
                  const fullTag = repo !== '<untagged>' ? `${repo}:${tag}` : img.id
                  const isNone = tag === '<none>'

                  return (
                    <div
                      key={img.id}
                      className="grid grid-cols-[minmax(200px,1.6fr)_140px_150px_90px_110px_130px] gap-4 items-center px-5 py-3 text-[12px] hover:bg-[#151B24] transition-colors"
                    >
                      {/* Repository */}
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-[#F3F5F7] truncate" title={repo}>
                          {repo}
                        </p>
                      </div>

                      {/* Tag */}
                      <div className="min-w-0 flex items-center">
                        <span
                          title={tag}
                          className={`inline-flex items-center max-w-[130px] rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium ${
                            isNone
                              ? 'border-white/10 bg-white/[0.04] text-[#697384]'
                              : 'border-[#36D6B4]/25 bg-[#36D6B4]/10 text-[#36D6B4]'
                          }`}
                        >
                          <span className="truncate">{tag}</span>
                        </span>
                      </div>

                      {/* Image ID */}
                      <div className="min-w-0 flex items-center gap-1.5 font-mono text-[11px]">
                        <code
                          title={img.id}
                          className="rounded-md border border-white/[0.08] bg-black/40 px-2 py-0.5 text-[#A7B0BE] tracking-tight select-all"
                        >
                          {shortId}
                        </code>
                        <button
                          onClick={(e) => handleCopy(img.id, img.id, e)}
                          title="Copy full Image ID"
                          className="rounded p-1 text-[#697384] hover:bg-white/[0.06] hover:text-[#36D6B4] transition shrink-0"
                        >
                          {copiedId === img.id ? (
                            <Check size={11} className="text-[#36D6B4]" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>

                      {/* Size */}
                      <div className="font-mono text-[11px] text-[#A7B0BE] whitespace-nowrap">
                        {formatSize(img.size)}
                      </div>

                      {/* Created */}
                      <div className="font-mono text-[11px] text-[#697384] whitespace-nowrap">
                        {formatCreated(img.created)}
                      </div>

                      {/* Scan Button Trigger */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => navigate('/security', { state: { image: fullTag } })}
                          className="flex items-center gap-1.5 rounded-lg border border-[#36D6B4]/25 bg-[#36D6B4]/10 px-2.5 py-1 text-[11px] font-medium text-[#36D6B4] hover:bg-[#36D6B4]/20 transition shrink-0"
                          title="Scan image in Security Center"
                        >
                          <Shield size={12} />
                          <span>Scan Image</span>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
