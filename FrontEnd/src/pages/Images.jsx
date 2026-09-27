import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, RefreshCw, AlertCircle, Shield } from 'lucide-react'
import SearchInput from '../components/SearchInput'
import EmptyState from '../components/EmptyState'
import api from '../services/api'

export default function Images() {
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/docker/images')
        setImages(res.data || [])
        setError(null)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch images')
      } finally {
        setLoading(false)
      }
    }
    fetch()
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
      return { repo: '<none>', tag: '<none>' }
    }
    const [repo, tag] = repoTags[0].split(':')
    return { repo: repo || '<none>', tag: tag || 'latest' }
  }

  const filtered = images.filter((img) => {
    if (!search) return true
    const { repo, tag } = parseRepoTag(img.repoTags)
    return (
      repo.toLowerCase().includes(search.toLowerCase()) ||
      tag.toLowerCase().includes(search.toLowerCase()) ||
      img.id.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Images</h1>
            <span className="rounded-full bg-bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-text-secondary border border-border-primary">
              {images.length} Image{images.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Docker image inventory, vulnerability status, and supply chain metadata.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2.5 text-[12px] text-status-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <SearchInput
        placeholder="Search by repository, tag, or image ID..."
        value={search}
        onChange={setSearch}
        className="w-96"
      />

      {/* Table */}
      <div className="rounded-xl border border-border-primary bg-bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_140px_80px_100px_80px] gap-3 items-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-primary">
          <span>Repository</span>
          <span>Tag</span>
          <span>Image ID</span>
          <span>Size</span>
          <span>Created</span>
          <span>Security</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-[13px] text-text-muted">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading images...
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && !error && (
          <EmptyState
            icon={Box}
            title="No images found"
            message={images.length === 0
              ? "No Docker images found on this engine."
              : "No images match your search."
            }
          />
        )}

        {/* Image rows */}
        {filtered.map((img) => {
          const { repo, tag } = parseRepoTag(img.repoTags)
          return (
            <div
              key={img.id}
              className="grid grid-cols-[1fr_100px_140px_80px_100px_80px] gap-3 items-center px-5 py-3 border-b border-border-primary last:border-b-0 text-[12px] hover:bg-bg-hover transition"
            >
              <p className="text-text-primary font-medium truncate">{repo}</p>
              <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary font-mono text-center">
                {tag}
              </span>
              <span className="font-mono text-[11px] text-text-muted truncate">{img.id.replace('sha256:', '').slice(0, 12)}</span>
              <span className="font-mono text-text-secondary">{formatSize(img.size)}</span>
              <span className="text-text-muted">{formatCreated(img.created)}</span>
              <div>
                <button
                  onClick={() => {
                    const targetImage = repo !== '<none>' ? `${repo}:${tag}` : img.id.replace('sha256:', '').slice(0, 12)
                    navigate('/security', { state: { image: targetImage } })
                  }}
                  className="flex items-center gap-1 rounded bg-accent-primary/10 px-2 py-1 text-[11px] font-semibold text-accent-primary hover:bg-accent-primary/20 transition"
                  title="Scan with Trivy"
                >
                  <Shield size={12} />
                  Scan
                </button>
              </div>
            </div>
          )
        })}

        <div className="border-t border-border-primary px-5 py-2.5 text-[11px] text-text-muted">
          Showing {filtered.length} of {images.length} images
        </div>
      </div>
    </div>
  )
}
