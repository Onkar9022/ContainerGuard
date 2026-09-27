import Docker from 'dockerode';

// ---------------------------------------------------------------------------
// Docker Client — single reusable instance
// ---------------------------------------------------------------------------
// On Linux / inside a container, the Docker Engine exposes a Unix socket at
// /var/run/docker.sock. This socket is mounted into the backend container
// via Docker Compose. On Windows/Mac development, Docker Desktop exposes the
// same socket or a named pipe.
//
// SECURITY: The Docker socket grants root-equivalent access to the host.
//   - Only the backend container should have socket access.
//   - Never expose the socket to the frontend or public internet.
//   - Never expose Docker Engine TCP ports (2375/2376) publicly.
// ---------------------------------------------------------------------------

const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

const docker = new Docker({ socketPath });

export function getDockerClient() {
  return docker;
}

// ---------------------------------------------------------------------------
// Engine Info
// ---------------------------------------------------------------------------

export async function getDockerInfo() {
  const info = await docker.info();
  const version = await docker.version();

  return {
    dockerVersion: version.Version,
    apiVersion: version.ApiVersion,
    os: info.OperatingSystem,
    osType: info.OSType,
    architecture: info.Architecture,
    cpus: info.NCPU,
    totalMemory: info.MemTotal,
    storageDriver: info.Driver,
    containersTotal: info.Containers,
    containersRunning: info.ContainersRunning,
    containersPaused: info.ContainersPaused,
    containersStopped: info.ContainersStopped,
    imagesTotal: info.Images,
    serverTime: info.SystemTime,
    kernelVersion: info.KernelVersion,
    runtimes: info.Runtimes ? Object.keys(info.Runtimes) : [],
  };
}

// ---------------------------------------------------------------------------
// Security Helper — Mask sensitive container environment variables
// ---------------------------------------------------------------------------
function maskSensitiveEnv(envStr) {
  if (!envStr || typeof envStr !== 'string') return envStr;
  const eqIdx = envStr.indexOf('=');
  if (eqIdx === -1) return envStr;
  const key = envStr.slice(0, eqIdx);
  if (/password|secret|token|key|credential|private|auth|database_url|db_url|connection/i.test(key)) {
    return `${key}=********`;
  }
  return envStr;
}

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

export async function listContainers() {
  // all: true returns both running and stopped containers
  const containers = await docker.listContainers({ all: true });

  return containers.map((c) => ({
    id: c.Id,
    names: c.Names?.map((n) => n.replace(/^\//, '')),
    image: c.Image,
    imageId: c.ImageID,
    state: c.State,
    status: c.Status,
    created: c.Created,
    ports: c.Ports || [],
    labels: c.Labels || {},
    networkMode: c.HostConfig?.NetworkMode,
    mounts: c.Mounts || [],
  }));
}

export async function inspectContainer(id) {
  const container = docker.getContainer(id);
  const data = await container.inspect();

  return {
    id: data.Id,
    name: data.Name?.replace(/^\//, ''),
    image: data.Config?.Image,
    created: data.Created,
    state: {
      status: data.State?.Status,
      running: data.State?.Running,
      paused: data.State?.Paused,
      startedAt: data.State?.StartedAt,
      finishedAt: data.State?.FinishedAt,
      exitCode: data.State?.ExitCode,
      pid: data.State?.Pid,
    },
    config: {
      hostname: data.Config?.Hostname,
      env: (data.Config?.Env || []).map(maskSensitiveEnv),
      cmd: data.Config?.Cmd || [],
      entrypoint: data.Config?.Entrypoint || [],
      workingDir: data.Config?.WorkingDir,
      labels: data.Config?.Labels || {},
      exposedPorts: data.Config?.ExposedPorts
        ? Object.keys(data.Config.ExposedPorts)
        : [],
    },
    network: {
      networks: data.NetworkSettings?.Networks || {},
      ports: data.NetworkSettings?.Ports || {},
      ipAddress: data.NetworkSettings?.IPAddress,
      gateway: data.NetworkSettings?.Gateway,
    },
    mounts: (data.Mounts || []).map((m) => ({
      type: m.Type,
      source: m.Source,
      destination: m.Destination,
      mode: m.Mode,
      rw: m.RW,
    })),
    hostConfig: {
      restartPolicy: data.HostConfig?.RestartPolicy,
      memory: data.HostConfig?.Memory,
      cpuShares: data.HostConfig?.CpuShares,
    },
  };
}

// ---------------------------------------------------------------------------
// Metrics & Stats
// ---------------------------------------------------------------------------

export async function getContainerStats(id) {
  const container = docker.getContainer(id);
  // one-shot stats request
  const stats = await container.stats({ stream: false });

  // 1. CPU Calculation
  const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - stats.precpu_stats?.cpu_usage?.total_usage || 0;
  const systemDelta = stats.cpu_stats?.system_cpu_usage - stats.precpu_stats?.system_cpu_usage || 0;
  
  let onlineCpus = stats.cpu_stats?.online_cpus || (stats.cpu_stats?.cpu_usage?.percpu_usage?.length) || 1;
  if (onlineCpus === 0) onlineCpus = 1;

  let cpuPercent = 0.0;
  if (systemDelta > 0 && cpuDelta > 0) {
    cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
  }

  // 2. Memory Calculation
  const memUsage = stats.memory_stats?.usage || 0;
  const memLimit = stats.memory_stats?.limit || 0;
  const cache = stats.memory_stats?.stats?.cache || stats.memory_stats?.stats?.inactive_file || 0;
  const actualMemUsage = Math.max(0, memUsage - cache);

  let memPercent = 0.0;
  if (memLimit > 0) {
    memPercent = (actualMemUsage / memLimit) * 100.0;
  }

  // 3. Network Aggregation
  let networkRxBytes = 0;
  let networkTxBytes = 0;
  if (stats.networks) {
    for (const iface of Object.values(stats.networks)) {
      networkRxBytes += iface.rx_bytes || 0;
      networkTxBytes += iface.tx_bytes || 0;
    }
  }

  // 4. Block I/O Aggregation
  let blockReadBytes = 0;
  let blockWriteBytes = 0;
  if (stats.blkio_stats && stats.blkio_stats.io_service_bytes_recursive) {
    for (const io of stats.blkio_stats.io_service_bytes_recursive) {
      if (io.op.toLowerCase() === 'read') blockReadBytes += io.value;
      if (io.op.toLowerCase() === 'write' || io.op.toLowerCase() === 'sync') blockWriteBytes += io.value;
    }
  }

  return {
    containerId: id,
    timestamp: stats.read,
    cpuPercent: Math.round(cpuPercent * 100) / 100,
    memoryUsage: actualMemUsage,
    memoryLimit: memLimit,
    memoryPercent: Math.round(memPercent * 100) / 100,
    networkRxBytes,
    networkTxBytes,
    blockReadBytes,
    blockWriteBytes
  };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function listImages() {
  const images = await docker.listImages({ all: false });

  return images.map((img) => ({
    id: img.Id,
    repoTags: img.RepoTags || [],
    repoDigests: img.RepoDigests || [],
    created: img.Created,
    size: img.Size,
    virtualSize: img.VirtualSize,
    labels: img.Labels || {},
    containers: img.Containers,
  }));
}

export async function inspectImage(id) {
  const image = docker.getImage(id);
  const data = await image.inspect();

  return {
    id: data.Id,
    repoTags: data.RepoTags || [],
    repoDigests: data.RepoDigests || [],
    created: data.Created,
    size: data.Size,
    architecture: data.Architecture,
    os: data.Os,
    config: {
      env: data.Config?.Env || [],
      cmd: data.Config?.Cmd || [],
      entrypoint: data.Config?.Entrypoint || [],
      workingDir: data.Config?.WorkingDir,
      exposedPorts: data.Config?.ExposedPorts
        ? Object.keys(data.Config.ExposedPorts)
        : [],
      labels: data.Config?.Labels || {},
    },
    rootFS: data.RootFS,
  };
}

// ---------------------------------------------------------------------------
// Networks
// ---------------------------------------------------------------------------

export async function listNetworks() {
  const networks = await docker.listNetworks();

  return networks.map((n) => ({
    id: n.Id,
    name: n.Name,
    driver: n.Driver,
    scope: n.Scope,
    internal: n.Internal,
    enableIPv6: n.EnableIPv6,
    ipam: n.IPAM?.Config || [],
    containers: n.Containers
      ? Object.entries(n.Containers).map(([cId, c]) => ({
          id: cId,
          name: c.Name,
          ipv4: c.IPv4Address,
          ipv6: c.IPv6Address,
        }))
      : [],
    labels: n.Labels || {},
    created: n.Created,
  }));
}

// ---------------------------------------------------------------------------
// Volumes
// ---------------------------------------------------------------------------

export async function listVolumes() {
  const result = await docker.listVolumes();
  const volumes = result.Volumes || [];

  return volumes.map((v) => ({
    name: v.Name,
    driver: v.Driver,
    mountpoint: v.Mountpoint,
    scope: v.Scope,
    labels: v.Labels || {},
    createdAt: v.CreatedAt,
    options: v.Options || {},
  }));
}

// ---------------------------------------------------------------------------
// Connection check — used for health/status indicators
// ---------------------------------------------------------------------------

export async function pingDocker() {
  const ping = await docker.ping();
  return ping.toString() === 'OK';
}
