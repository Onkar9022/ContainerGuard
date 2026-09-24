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
      env: data.Config?.Env || [],
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
