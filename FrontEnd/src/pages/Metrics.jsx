import { BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const emptyData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  cpu: 0,
  memory: 0,
  network: 0,
}))

export default function Metrics() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Metrics</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Historical resource utilization metrics across all monitored containers.
        </p>
      </div>

      {/* Time range selector */}
      <div className="flex items-center gap-2">
        {['15m', '30m', '1h', '6h', '24h', '7d'].map((t, i) => (
          <button
            key={t}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              i === 2
                ? 'bg-accent-primary/15 text-accent-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* CPU chart */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <h3 className="text-[13px] font-semibold text-text-primary mb-1">CPU Usage Over Time</h3>
          <p className="text-[11px] text-text-muted mb-4">Percentage of allocated CPU cores consumed</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyData}>
                <defs>
                  <linearGradient id="metricsCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" stroke="#00d4aa" fill="url(#metricsCpu)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory chart */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
          <h3 className="text-[13px] font-semibold text-text-primary mb-1">Memory Usage Over Time</h3>
          <p className="text-[11px] text-text-muted mb-4">Total memory consumption across containers</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyData}>
                <defs>
                  <linearGradient id="metricsMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="memory" stroke="#3b82f6" fill="url(#metricsMem)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network chart */}
        <div className="rounded-xl border border-border-primary bg-bg-surface p-5 col-span-2">
          <h3 className="text-[13px] font-semibold text-text-primary mb-1">Network Throughput</h3>
          <p className="text-[11px] text-text-muted mb-4">Ingress / Egress traffic across container network interfaces</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6178' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="network" stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-center text-[12px] text-text-muted">
            Historical metrics will populate once Docker Engine is connected (Phase 4) and metric storage is enabled (Phase 9)
          </p>
        </div>
      </div>
    </div>
  )
}
