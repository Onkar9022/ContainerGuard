import { Server, Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react'
import StatCard from '../components/StatCard'
import ProgressBar from '../components/ProgressBar'

export default function Hosts() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Hosts</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Infrastructure host metrics and Docker Engine runtime information.
        </p>
      </div>

      {/* Host info */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Server} label="Hostname" value="localhost" subValue="Development machine" />
        <StatCard icon={Cpu} label="CPU Cores" value="—" subValue="Architecture: —" />
        <StatCard icon={MemoryStick} label="Total Memory" value="— GB" subValue="Available: —" />
        <StatCard icon={HardDrive} label="Disk Usage" value="— GB" subValue="Free: —" />
      </div>

      {/* Docker info */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-text-primary mb-4">Docker Engine</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Docker Version', value: '—' },
            { label: 'API Version', value: '—' },
            { label: 'Storage Driver', value: '—' },
            { label: 'Runtime', value: '—' },
            { label: 'OS Type', value: '—' },
            { label: 'Architecture', value: '—' },
            { label: 'Total Containers', value: '0' },
            { label: 'Total Images', value: '0' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-border-primary py-2">
              <span className="text-[12px] text-text-secondary">{item.label}</span>
              <span className="font-mono text-[12px] text-text-primary">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-text-muted">
          Docker Engine details will populate after integration in Phase 4
        </p>
      </div>

      {/* Resource usage */}
      <div className="rounded-xl border border-border-primary bg-bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-text-primary mb-4">Resource Utilization</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[12px]">
              <span className="text-text-secondary">CPU Usage</span>
              <span className="font-mono text-text-muted">—%</span>
            </div>
            <ProgressBar value={0} max={100} size="md" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[12px]">
              <span className="text-text-secondary">Memory Usage</span>
              <span className="font-mono text-text-muted">— / — GB</span>
            </div>
            <ProgressBar value={0} max={100} size="md" color="bg-chart-blue" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[12px]">
              <span className="text-text-secondary">Disk Usage</span>
              <span className="font-mono text-text-muted">— / — GB</span>
            </div>
            <ProgressBar value={0} max={100} size="md" color="bg-chart-purple" />
          </div>
        </div>
      </div>
    </div>
  )
}
