import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/Overview'
import Containers from './pages/Containers'
import ContainerDetail from './pages/ContainerDetail'
import Metrics from './pages/Metrics'
import Logs from './pages/Logs'
import Images from './pages/Images'
import Security from './pages/Security'
import Alerts from './pages/Alerts'
import Deployments from './pages/Deployments'
import Hosts from './pages/Hosts'
import Networks from './pages/Networks'
import Volumes from './pages/Volumes'
import Activity from './pages/Activity'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/containers" element={<Containers />} />
        <Route path="/containers/:id" element={<ContainerDetail />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/images" element={<Images />} />
        <Route path="/security" element={<Security />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/deployments" element={<Deployments />} />
        <Route path="/hosts" element={<Hosts />} />
        <Route path="/networks" element={<Networks />} />
        <Route path="/volumes" element={<Volumes />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
