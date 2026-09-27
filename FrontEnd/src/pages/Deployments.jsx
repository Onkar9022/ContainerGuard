import { Rocket, GitBranch, CheckCircle, XCircle, Clock, RefreshCw, Download, Webhook } from 'lucide-react'
import StatCard from '../components/StatCard'

export default function Deployments() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F3F5F7]">CI/CD Pipeline Releases</h1>
            <span className="rounded-md border border-white/5 bg-[#11161F] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#36D6B4]">
              GitHub OIDC &bull; SSM
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#A7B0BE]">
            Automated image building, ECR immutable SHA pushing, and EC2 runtime deployments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="PIPELINE STATUS" value="Operational" subValue="GitHub Actions CI/CD" badge="OIDC" badgeType="teal" />
        <StatCard icon={Rocket} label="TARGET INSTANCE" value="i-0196fe14" subValue="EC2 ap-south-1" badge="SSM" badgeType="neutral" />
        <StatCard icon={GitBranch} label="BRANCH TARGET" value="main" subValue="Immutable Commit SHA Tags" badge="GIT SHA" badgeType="teal" />
        <StatCard icon={Clock} label="DEPLOYMENT" value="Zero Downtime" subValue="Docker Compose rolling restarts" badge="ACTIVE" badgeType="teal" />
      </div>
    </div>
  )
}
