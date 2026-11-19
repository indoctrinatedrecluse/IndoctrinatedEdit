/**
 * IndoctrinatedEdit - Docker & Kubernetes Cloud-Native Management Engine
 */

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'paused' | 'stopped' | 'restarting'
  ports: string[]
  cpuPercent: number
  memoryUsageMb: number
  memoryLimitMb: number
  created: string
  logs: string[]
}

export interface DockerImage {
  id: string
  repository: string
  tag: string
  sizeMb: number
  created: string
  inUse: boolean
}

export interface DockerVolume {
  name: string
  driver: string
  scope: string
  sizeMb: number
  containers: string[]
}

export type K8sPodPhase = 'Running' | 'Pending' | 'CrashLoopBackOff' | 'Completed' | 'Failed'

export interface K8sPod {
  id: string
  name: string
  namespace: string
  status: K8sPodPhase
  readyContainers: number
  totalContainers: number
  restarts: number
  age: string
  ip: string
  node: string
  cpuPercent: number
  memoryUsageMb: number
  memoryLimitMb: number
  logs: string[]
}

export interface K8sDeployment {
  id: string
  name: string
  namespace: string
  desiredReplicas: number
  currentReplicas: number
  updatedReplicas: number
  availableReplicas: number
  image: string
  age: string
  strategy: 'RollingUpdate' | 'Recreate'
}

export interface K8sService {
  id: string
  name: string
  namespace: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  clusterIp: string
  externalIp?: string
  ports: string[]
  selector: string
}

export interface K8sIngress {
  id: string
  name: string
  namespace: string
  host: string
  path: string
  targetService: string
  targetPort: number
  tls: boolean
}

export interface K8sNode {
  name: string
  status: 'Ready' | 'NotReady'
  roles: string[]
  age: string
  version: string
  osImage: string
  cpuCapacityCores: number
  cpuAllocatedPercent: number
  memoryCapacityGb: number
  memAllocatedPercent: number
  podCount: number
  podCapacity: number
}

export interface K8sClusterSummary {
  clusterName: string
  serverVersion: string
  status: 'Healthy' | 'Degraded' | 'Critical'
  totalNodes: number
  totalPods: number
  runningPods: number
  totalDeployments: number
  cpuUsagePercent: number
  memUsagePercent: number
}

class DockerService {
  private containers: DockerContainer[] = [
    {
      id: 'c7f91a0293b1',
      name: 'indoctrinated-postgres',
      image: 'postgres:16-alpine',
      status: 'running',
      ports: ['5432:5432'],
      cpuPercent: 1.4,
      memoryUsageMb: 84.5,
      memoryLimitMb: 1024,
      created: '2 hours ago',
      logs: [
        '[postgres] Postmaster server starting on port 5432...',
        '[postgres] Database cluster initialized with collation "en_US.utf8".',
        '[postgres] Ready to accept connections on IPv4 and IPv6.',
        '[postgres] LOG: connection received: host=127.0.0.1 port=58912',
        '[postgres] LOG: authenticated user "indoctrinated" database "indoctrinated_dev"',
      ],
    },
    {
      id: 'a81d4e09f412',
      name: 'indoctrinated-redis-cache',
      image: 'redis:7.2-alpine',
      status: 'running',
      ports: ['6379:6379'],
      cpuPercent: 0.8,
      memoryUsageMb: 28.2,
      memoryLimitMb: 512,
      created: '5 hours ago',
      logs: [
        '[redis] 1:M 17 Sep 2026 21:00:00.000 * Running mode=standalone, port=6379.',
        '[redis] 1:M 17 Sep 2026 21:00:00.001 # Server initialized with maxmemory 512MB.',
        '[redis] 1:M 17 Sep 2026 21:00:00.002 * Ready to accept connections tcp.',
      ],
    },
    {
      id: 'f038bc284e91',
      name: 'indoctrinated-auth-microservice',
      image: 'indoctrinated-auth:v3.0.0',
      status: 'running',
      ports: ['8080:8080', '9090:9090'],
      cpuPercent: 3.2,
      memoryUsageMb: 142.0,
      memoryLimitMb: 2048,
      created: '30 minutes ago',
      logs: [
        '[auth] Initializing JWT RSA-2048 keypair rotation engine...',
        '[auth] Loaded 14 policy RBAC definition rules.',
        '[auth] HTTP Server listening on http://0.0.0.0:8080',
        '[auth] Metrics endpoint listening on http://0.0.0.0:9090/metrics',
      ],
    },
    {
      id: 'd9931ef82a74',
      name: 'indoctrinated-worker-queue',
      image: 'indoctrinated-worker:latest',
      status: 'stopped',
      ports: [],
      cpuPercent: 0,
      memoryUsageMb: 0,
      memoryLimitMb: 1024,
      created: '1 day ago',
      logs: [
        '[worker] Worker thread pool terminated gracefully (SIGTERM).',
        '[worker] Flushing in-flight BullMQ job tasks (0 remaining).',
        '[worker] Process exited with exit code 0.',
      ],
    },
  ]

  private images: DockerImage[] = [
    { id: 'sha256:8f912a', repository: 'postgres', tag: '16-alpine', sizeMb: 248, created: '2 weeks ago', inUse: true },
    { id: 'sha256:71a09e', repository: 'redis', tag: '7.2-alpine', sizeMb: 36, created: '3 weeks ago', inUse: true },
    { id: 'sha256:6e44d1', repository: 'indoctrinated-auth', tag: 'v3.0.0', sizeMb: 182, created: '1 hour ago', inUse: true },
    { id: 'sha256:49c08b', repository: 'indoctrinated-worker', tag: 'latest', sizeMb: 154, created: '1 day ago', inUse: false },
    { id: 'sha256:22d81f', repository: 'node', tag: '22-slim', sizeMb: 210, created: '1 month ago', inUse: false },
  ]

  private volumes: DockerVolume[] = [
    { name: 'pgdata_volume', driver: 'local', scope: 'local', sizeMb: 420, containers: ['indoctrinated-postgres'] },
    { name: 'redis_cache_store', driver: 'local', scope: 'local', sizeMb: 68, containers: ['indoctrinated-redis-cache'] },
  ]

  // ==========================================
  // KUBERNETES CLUSTER TOPOLOGY STATE
  // ==========================================
  private k8sNamespaces: string[] = ['default', 'production', 'staging', 'kube-system', 'monitoring']

  private k8sNodes: K8sNode[] = [
    {
      name: 'k8s-control-plane-01',
      status: 'Ready',
      roles: ['control-plane', 'master'],
      age: '42d',
      version: 'v1.31.1',
      osImage: 'Ubuntu 24.04.1 LTS',
      cpuCapacityCores: 8,
      cpuAllocatedPercent: 34,
      memoryCapacityGb: 32,
      memAllocatedPercent: 48,
      podCount: 18,
      podCapacity: 110,
    },
    {
      name: 'k8s-worker-node-alpha',
      status: 'Ready',
      roles: ['worker'],
      age: '42d',
      version: 'v1.31.1',
      osImage: 'Ubuntu 24.04.1 LTS',
      cpuCapacityCores: 16,
      cpuAllocatedPercent: 62,
      memoryCapacityGb: 64,
      memAllocatedPercent: 55,
      podCount: 44,
      podCapacity: 110,
    },
    {
      name: 'k8s-worker-node-beta',
      status: 'Ready',
      roles: ['worker'],
      age: '38d',
      version: 'v1.31.1',
      osImage: 'Ubuntu 24.04.1 LTS',
      cpuCapacityCores: 16,
      cpuAllocatedPercent: 58,
      memoryCapacityGb: 64,
      memAllocatedPercent: 51,
      podCount: 39,
      podCapacity: 110,
    },
  ]

  private k8sDeployments: K8sDeployment[] = [
    {
      id: 'dep-api-gateway',
      name: 'api-gateway',
      namespace: 'production',
      desiredReplicas: 3,
      currentReplicas: 3,
      updatedReplicas: 3,
      availableReplicas: 3,
      image: 'registry.indoctrinated.internal/gateway:v4.2.0',
      age: '14d',
      strategy: 'RollingUpdate',
    },
    {
      id: 'dep-auth-service',
      name: 'auth-service',
      namespace: 'production',
      desiredReplicas: 2,
      currentReplicas: 2,
      updatedReplicas: 2,
      availableReplicas: 2,
      image: 'registry.indoctrinated.internal/auth:v3.0.1',
      age: '9d',
      strategy: 'RollingUpdate',
    },
    {
      id: 'dep-core-engine',
      name: 'core-engine',
      namespace: 'production',
      desiredReplicas: 4,
      currentReplicas: 4,
      updatedReplicas: 4,
      availableReplicas: 4,
      image: 'registry.indoctrinated.internal/core-engine:v6.1.1',
      age: '4d',
      strategy: 'RollingUpdate',
    },
    {
      id: 'dep-staging-preview',
      name: 'preview-engine',
      namespace: 'staging',
      desiredReplicas: 1,
      currentReplicas: 1,
      updatedReplicas: 1,
      availableReplicas: 1,
      image: 'registry.indoctrinated.internal/core-engine:v6.1.1',
      age: '2d',
      strategy: 'Recreate',
    },
    {
      id: 'dep-prometheus-stack',
      name: 'prometheus-operator',
      namespace: 'monitoring',
      desiredReplicas: 1,
      currentReplicas: 1,
      updatedReplicas: 1,
      availableReplicas: 1,
      image: 'quay.io/prometheus/prometheus:v2.54.0',
      age: '30d',
      strategy: 'Recreate',
    },
  ]

  private k8sPods: K8sPod[] = [
    {
      id: 'pod-api-gw-77f98-a1b2',
      name: 'api-gateway-77f98-a1b2',
      namespace: 'production',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '4h 12m',
      ip: '10.244.1.45',
      node: 'k8s-worker-node-alpha',
      cpuPercent: 4.8,
      memoryUsageMb: 168,
      memoryLimitMb: 512,
      logs: [
        '[gateway] Listening on 0.0.0.0:8000',
        '[gateway] Upstream pool healthy (8 endpoints active)',
        '[gateway] HTTP GET /v1/status 200 OK (1.2ms)',
        '[gateway] HTTP POST /v1/auth/exchange 200 OK (8.4ms)',
        '[gateway] SSL/TLS ALPN negotiation successful (h2, http/1.1)',
      ],
    },
    {
      id: 'pod-api-gw-77f98-c3d4',
      name: 'api-gateway-77f98-c3d4',
      namespace: 'production',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '4h 12m',
      ip: '10.244.2.88',
      node: 'k8s-worker-node-beta',
      cpuPercent: 3.9,
      memoryUsageMb: 154,
      memoryLimitMb: 512,
      logs: [
        '[gateway] Listening on 0.0.0.0:8000',
        '[gateway] Dynamic routing config synced from ConfigMap (rev 18)',
        '[gateway] Rate limiter active: 10,000 req/min bucket',
        '[gateway] HTTP GET /api/v2/telemetry 200 OK (2.1ms)',
      ],
    },
    {
      id: 'pod-api-gw-77f98-e5f6',
      name: 'api-gateway-77f98-e5f6',
      namespace: 'production',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '4h 12m',
      ip: '10.244.1.49',
      node: 'k8s-worker-node-alpha',
      cpuPercent: 5.1,
      memoryUsageMb: 172,
      memoryLimitMb: 512,
      logs: [
        '[gateway] Listening on 0.0.0.0:8000',
        '[gateway] Connection keep-alive timeout: 65s',
        '[gateway] Ingress traffic distributed across nodes evenly',
      ],
    },
    {
      id: 'pod-auth-srv-89ac-x01',
      name: 'auth-service-89ac-x01',
      namespace: 'production',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '9d',
      ip: '10.244.2.14',
      node: 'k8s-worker-node-beta',
      cpuPercent: 1.8,
      memoryUsageMb: 94,
      memoryLimitMb: 256,
      logs: [
        '[auth] Initialized public key cache from KMS',
        '[auth] OAuth2 token verification latency: 0.8ms p99',
        '[auth] Session store connected (Redis cluster)',
      ],
    },
    {
      id: 'pod-auth-srv-89ac-x02',
      name: 'auth-service-89ac-x02',
      namespace: 'production',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '9d',
      ip: '10.244.1.18',
      node: 'k8s-worker-node-alpha',
      cpuPercent: 2.1,
      memoryUsageMb: 98,
      memoryLimitMb: 256,
      logs: [
        '[auth] Verification pod ready on port 8080',
        '[auth] Health probe check returned HTTP 200',
      ],
    },
    {
      id: 'pod-core-engine-b31-01',
      name: 'core-engine-b31-01',
      namespace: 'production',
      status: 'Running',
      readyContainers: 2,
      totalContainers: 2,
      restarts: 1,
      age: '4d',
      ip: '10.244.2.33',
      node: 'k8s-worker-node-beta',
      cpuPercent: 12.4,
      memoryUsageMb: 412,
      memoryLimitMb: 1024,
      logs: [
        '[core] Antigravity AI orchestration cluster connected',
        '[core] Initializing AST code graph parser pool...',
        '[core] Processed 1,420 background semantic indexing tasks',
      ],
    },
    {
      id: 'pod-core-engine-b31-02',
      name: 'core-engine-b31-02',
      namespace: 'production',
      status: 'Running',
      readyContainers: 2,
      totalContainers: 2,
      restarts: 0,
      age: '4d',
      ip: '10.244.1.72',
      node: 'k8s-worker-node-alpha',
      cpuPercent: 11.2,
      memoryUsageMb: 398,
      memoryLimitMb: 1024,
      logs: [
        '[core] Worker ready. Listening on socket IPC',
        '[core] Memory cache hit ratio: 94.2%',
      ],
    },
    {
      id: 'pod-staging-crash-01',
      name: 'preview-engine-debug-crash',
      namespace: 'staging',
      status: 'CrashLoopBackOff',
      readyContainers: 0,
      totalContainers: 1,
      restarts: 8,
      age: '25m',
      ip: '10.244.2.99',
      node: 'k8s-worker-node-beta',
      cpuPercent: 0,
      memoryUsageMb: 0,
      memoryLimitMb: 512,
      logs: [
        '[preview] Error: Unhandled promise rejection in config loader',
        '[preview] DB_CONNECTION_STRING is missing required SSL certificate authority',
        '[preview] Exiting with code 1...',
        '[kubelet] Back-off 5m0s restarting failed container',
      ],
    },
    {
      id: 'pod-prom-01',
      name: 'prometheus-operator-5b87-z9',
      namespace: 'monitoring',
      status: 'Running',
      readyContainers: 1,
      totalContainers: 1,
      restarts: 0,
      age: '30d',
      ip: '10.244.1.09',
      node: 'k8s-control-plane-01',
      cpuPercent: 2.8,
      memoryUsageMb: 520,
      memoryLimitMb: 2048,
      logs: [
        '[prometheus] Scrape loop initiated for 48 targets',
        '[prometheus] TimeSeries TSDB WAL segment 0001 flushed',
        '[prometheus] Server ready to receive web queries on :9090',
      ],
    },
  ]

  private k8sServices: K8sService[] = [
    {
      id: 'svc-gw',
      name: 'api-gateway-service',
      namespace: 'production',
      type: 'LoadBalancer',
      clusterIp: '10.96.14.80',
      externalIp: '34.120.89.201',
      ports: ['80:8000', '443:8443'],
      selector: 'app=api-gateway',
    },
    {
      id: 'svc-auth',
      name: 'auth-internal-service',
      namespace: 'production',
      type: 'ClusterIP',
      clusterIp: '10.96.200.12',
      ports: ['8080/TCP'],
      selector: 'app=auth-service',
    },
    {
      id: 'svc-core',
      name: 'core-engine-service',
      namespace: 'production',
      type: 'ClusterIP',
      clusterIp: '10.96.155.44',
      ports: ['50051/TCP (gRPC)'],
      selector: 'app=core-engine',
    },
    {
      id: 'svc-prom',
      name: 'prometheus-service',
      namespace: 'monitoring',
      type: 'NodePort',
      clusterIp: '10.96.88.90',
      ports: ['9090:30090/TCP'],
      selector: 'app=prometheus',
    },
  ]

  private k8sIngresses: K8sIngress[] = [
    {
      id: 'ing-main',
      name: 'indoctrinated-main-ingress',
      namespace: 'production',
      host: 'api.indoctrinated.dev',
      path: '/*',
      targetService: 'api-gateway-service',
      targetPort: 8000,
      tls: true,
    },
    {
      id: 'ing-staging',
      name: 'staging-ingress',
      namespace: 'staging',
      host: 'staging.indoctrinated.dev',
      path: '/preview/*',
      targetService: 'preview-engine-service',
      targetPort: 3000,
      tls: true,
    },
  ]

  // ==========================================
  // DOCKER METHODS
  // ==========================================
  public getContainers(): DockerContainer[] {
    return [...this.containers]
  }

  public getImages(): DockerImage[] {
    return [...this.images]
  }

  public getVolumes(): DockerVolume[] {
    return [...this.volumes]
  }

  private dockerLive = false
  private k8sLive = false
  private clusterName = 'indoctrinated-k8s-production'
  private serverVersion = 'v1.31.1+k8s'

  public isDockerLive(): boolean {
    return this.dockerLive
  }

  public isK8sLive(): boolean {
    return this.k8sLive
  }

  private parseSizeMb(raw: string): number {
    const m = String(raw || '').match(/([\d.]+)\s*(B|kB|KB|MB|MiB|GB|GiB)/i)
    if (!m) return 0
    const val = parseFloat(m[1])
    const unit = m[2].toLowerCase()
    if (unit === 'gb' || unit === 'gib') return Math.round(val * 1024)
    if (unit === 'mb' || unit === 'mib') return Math.round(val)
    if (unit === 'kb') return Math.round((val / 1024) * 10) / 10
    return 0
  }

  /**
   * Fetch live containers, stats, images, and volumes from the local Docker daemon via Electron IPC.
   */
  public async refreshContainersFromDaemon(): Promise<{ live: boolean; containers: DockerContainer[]; error?: string }> {
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.dockerExec) {
      this.dockerLive = false
      return { live: false, containers: this.getContainers() }
    }
    const res = await window.electronAPI.infra.dockerExec(['ps', '-a', '--format', '{{json .}}'])
    if (!res.ok) {
      this.dockerLive = false
      return { live: false, containers: this.getContainers(), error: res.stderr || 'Docker daemon unavailable' }
    }

    // Fetch live CPU/Mem stats in parallel (best-effort)
    const statsMap = new Map<string, { cpu: number; memMb: number; limitMb: number }>()
    try {
      const statsRes = await window.electronAPI.infra.dockerExec(['stats', '--no-stream', '--format', '{{json .}}'], 8000)
      if (statsRes.ok) {
        for (const line of statsRes.stdout.split(/\r?\n/).filter(Boolean)) {
          try {
            const s = JSON.parse(line)
            const id = String(s.ID || s.Container || '').slice(0, 12)
            const cpu = parseFloat(String(s.CPUPerc || '0').replace('%', '')) || 0
            const memParts = String(s.MemUsage || '0MiB / 512MiB').split('/')
            statsMap.set(id, {
              cpu: Math.round(cpu * 10) / 10,
              memMb: this.parseSizeMb(memParts[0]),
              limitMb: this.parseSizeMb(memParts[1]) || 512,
            })
          } catch {}
        }
      }
    } catch {}

    const parsed: DockerContainer[] = []
    for (const line of res.stdout.split(/\r?\n/).filter(Boolean)) {
      try {
        const obj = JSON.parse(line)
        const id = String(obj.ID || '').slice(0, 12)
        const stateStr = String(obj.State || obj.Status || '').toLowerCase()
        const status: DockerContainer['status'] = stateStr.includes('up') || stateStr === 'running'
          ? 'running'
          : stateStr.includes('restarting')
          ? 'restarting'
          : stateStr.includes('paused')
          ? 'paused'
          : 'stopped'
        const st = statsMap.get(id)
        const existing = this.containers.find((c) => c.id === id)
        parsed.push({
          id,
          name: String(obj.Names || 'container'),
          image: String(obj.Image || ''),
          status,
          ports: obj.Ports ? String(obj.Ports).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          cpuPercent: st?.cpu ?? 0,
          memoryUsageMb: st?.memMb ?? 0,
          memoryLimitMb: st?.limitMb ?? 512,
          created: String(obj.RunningFor || obj.CreatedAt || ''),
          logs: existing?.logs || [],
        })
      } catch {
        // skip non-JSON lines
      }
    }
    this.containers = parsed
    this.dockerLive = true

    // Refresh images & volumes in parallel
    try {
      const [imgRes, volRes] = await Promise.all([
        window.electronAPI.infra.dockerExec(['images', '--format', '{{json .}}']),
        window.electronAPI.infra.dockerExec(['volume', 'ls', '--format', '{{json .}}']),
      ])
      if (imgRes.ok) {
        const inUseImages = new Set(parsed.map((c) => c.image))
        const imgs: DockerImage[] = []
        for (const line of imgRes.stdout.split(/\r?\n/).filter(Boolean)) {
          try {
            const obj = JSON.parse(line)
            const repo = String(obj.Repository || '<none>')
            const tag = String(obj.Tag || '<none>')
            imgs.push({
              id: String(obj.ID || '').slice(0, 12),
              repository: repo,
              tag,
              sizeMb: this.parseSizeMb(obj.Size),
              created: String(obj.CreatedSince || obj.CreatedAt || ''),
              inUse: repo !== '<none>' && (inUseImages.has(`${repo}:${tag}`) || inUseImages.has(repo)),
            })
          } catch {}
        }
        this.images = imgs
      }
      if (volRes.ok) {
        const vols: DockerVolume[] = []
        for (const line of volRes.stdout.split(/\r?\n/).filter(Boolean)) {
          try {
            const obj = JSON.parse(line)
            vols.push({
              name: String(obj.Name || ''),
              driver: String(obj.Driver || 'local'),
              scope: String(obj.Scope || 'local'),
              sizeMb: 0,
              containers: [],
            })
          } catch {}
        }
        this.volumes = vols
      }
    } catch {}

    return { live: true, containers: [...this.containers] }
  }

  public async fetchContainerLogsAsync(id: string, tail = 200): Promise<string[]> {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec && this.dockerLive) {
      const res = await window.electronAPI.infra.dockerExec(['logs', '--tail', String(tail), id], 10000)
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n').trim()
      const lines = combined ? combined.split(/\r?\n/) : ['(No logs emitted yet)']
      const target = this.containers.find((c) => c.id === id)
      if (target) target.logs = lines
      return lines
    }
    return this.containers.find((c) => c.id === id)?.logs || []
  }

  public async execInContainerAsync(id: string, command: string): Promise<{ ok: boolean; output: string }> {
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.dockerExec) {
      return { ok: false, output: 'Docker exec requires the Electron desktop app.' }
    }
    const res = await window.electronAPI.infra.dockerExec(['exec', id, 'sh', '-c', command], 20000)
    return {
      ok: res.ok,
      output: [res.stdout, res.stderr].filter(Boolean).join('\n').trim() || (res.ok ? '(exit 0)' : `exit ${res.exitCode}`),
    }
  }

  public async containerActionAsync(action: 'start' | 'stop' | 'restart' | 'rm', id: string): Promise<{ ok: boolean; error?: string }> {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec && this.dockerLive) {
      const args = action === 'rm' ? ['rm', '-f', id] : [action, id]
      const res = await window.electronAPI.infra.dockerExec(args, 20000)
      if (res.ok) {
        await this.refreshContainersFromDaemon()
        return { ok: true }
      }
      return { ok: false, error: res.stderr || `docker ${action} failed` }
    }
    if (action === 'start') return { ok: this.startContainer(id) }
    if (action === 'stop') return { ok: this.stopContainer(id) }
    if (action === 'restart') return { ok: this.restartContainer(id) }
    this.containers = this.containers.filter((c) => c.id !== id)
    return { ok: true }
  }

  public async pruneDanglingImagesAsync(): Promise<{ ok: boolean; removed: number; output?: string }> {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec && this.dockerLive) {
      const before = this.images.length
      const res = await window.electronAPI.infra.dockerExec(['image', 'prune', '-f'], 30000)
      await this.refreshContainersFromDaemon()
      return { ok: res.ok, removed: Math.max(0, before - this.images.length), output: res.stdout || res.stderr }
    }
    return { ok: true, removed: this.pruneDanglingImages() }
  }

  public async runComposeAsync(action: 'up' | 'down', cwd?: string): Promise<{ ok: boolean; output: string }> {
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.dockerExec) {
      return { ok: false, output: 'Docker Compose execution requires the Electron desktop app.' }
    }
    const args = action === 'up' ? ['compose', 'up', '-d'] : ['compose', 'down']
    const res = await window.electronAPI.infra.dockerExec(args, { cwd, timeoutMs: 60000 })
    if (res.ok) await this.refreshContainersFromDaemon()
    return { ok: res.ok, output: [res.stdout, res.stderr].filter(Boolean).join('\n').trim() }
  }

  /**
   * Fetch live Kubernetes cluster topology from kubectl via Electron IPC (`infra:k8sExec`).
   */
  public async refreshKubernetesFromCluster(): Promise<{ live: boolean; error?: string }> {
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.k8sExec) {
      this.k8sLive = false
      return { live: false }
    }
    const [ctxRes, verRes, allRes] = await Promise.all([
      window.electronAPI.infra.k8sExec(['config', 'current-context'], 8000),
      window.electronAPI.infra.k8sExec(['version', '-o', 'json'], 8000),
      window.electronAPI.infra.k8sExec(['get', 'ns,nodes,pods,deployments,svc,ingress', '-A', '-o', 'json'], 15000),
    ])

    if (!allRes.ok || !allRes.stdout.trim()) {
      this.k8sLive = false
      return { live: false, error: allRes.stderr || 'kubectl cluster unreachable' }
    }

    try {
      const list = JSON.parse(allRes.stdout)
      const items: any[] = Array.isArray(list?.items) ? list.items : []
      const namespaces = new Set<string>()
      const nodes: K8sNode[] = []
      const pods: K8sPod[] = []
      const deployments: K8sDeployment[] = []
      const services: K8sService[] = []
      const ingresses: K8sIngress[] = []

      for (const item of items) {
        const kind = item.kind
        const meta = item.metadata || {}
        const ns = meta.namespace || 'default'
        if (kind === 'Namespace') {
          if (meta.name) namespaces.add(meta.name)
        } else if (kind === 'Node') {
          const conds = item.status?.conditions || []
          const ready = conds.find((c: any) => c.type === 'Ready')?.status === 'True'
          const labels = meta.labels || {}
          const roles = Object.keys(labels)
            .filter((k) => k.startsWith('node-role.kubernetes.io/'))
            .map((k) => k.split('/')[1])
          const cap = item.status?.capacity || {}
          const memKi = parseInt(String(cap.memory || '0').replace(/\D/g, ''), 10) || 0
          nodes.push({
            name: meta.name || 'node',
            status: ready ? 'Ready' : 'NotReady',
            roles: roles.length ? roles : ['worker'],
            age: meta.creationTimestamp ? new Date(meta.creationTimestamp).toLocaleDateString() : '',
            version: item.status?.nodeInfo?.kubeletVersion || 'unknown',
            osImage: item.status?.nodeInfo?.osImage || '',
            cpuCapacityCores: parseInt(String(cap.cpu || '0'), 10) || 0,
            memoryCapacityGb: Math.round((memKi / (1024 * 1024)) * 10) / 10,
            cpuAllocatedPercent: 0,
            memAllocatedPercent: 0,
            podCount: 0,
            podCapacity: parseInt(String(cap.pods || '110'), 10) || 110,
          })
        } else if (kind === 'Pod') {
          namespaces.add(ns)
          const statuses = item.status?.containerStatuses || []
          const restarts = statuses.reduce((acc: number, s: any) => acc + (Number(s.restartCount) || 0), 0)
          const readyCount = statuses.filter((s: any) => s.ready).length
          const totalCount = statuses.length || (item.spec?.containers?.length || 1)
          const waitingReason = statuses.find((s: any) => s.state?.waiting?.reason)?.state?.waiting?.reason
          const rawPhase = waitingReason === 'CrashLoopBackOff' ? 'CrashLoopBackOff' : (item.status?.phase || 'Pending')
          const validStatus: K8sPod['status'] =
            rawPhase === 'Running' || rawPhase === 'Pending' || rawPhase === 'CrashLoopBackOff' || rawPhase === 'Completed' || rawPhase === 'Failed'
              ? rawPhase
              : rawPhase === 'Succeeded'
              ? 'Completed'
              : 'Pending'
          pods.push({
            id: meta.uid || `${ns}/${meta.name}`,
            name: meta.name || 'pod',
            namespace: ns,
            status: validStatus,
            readyContainers: readyCount,
            totalContainers: totalCount,
            restarts,
            age: meta.creationTimestamp ? new Date(meta.creationTimestamp).toLocaleDateString() : '',
            ip: item.status?.podIP || 'Pending',
            node: item.spec?.nodeName || 'Unscheduled',
            cpuPercent: 0,
            memoryUsageMb: 0,
            memoryLimitMb: 512,
            logs: [],
          })
        } else if (kind === 'Deployment') {
          namespaces.add(ns)
          deployments.push({
            id: meta.uid || `${ns}/${meta.name}`,
            name: meta.name || 'deployment',
            namespace: ns,
            desiredReplicas: Number(item.spec?.replicas ?? 1),
            currentReplicas: Number(item.status?.replicas ?? 0),
            updatedReplicas: Number(item.status?.updatedReplicas ?? item.status?.replicas ?? 0),
            availableReplicas: Number(item.status?.availableReplicas ?? 0),
            age: meta.creationTimestamp ? new Date(meta.creationTimestamp).toLocaleDateString() : '',
            image: item.spec?.template?.spec?.containers?.[0]?.image || '',
            strategy: item.spec?.strategy?.type === 'Recreate' ? 'Recreate' : 'RollingUpdate',
          })
        } else if (kind === 'Service') {
          namespaces.add(ns)
          const ports = (item.spec?.ports || []).map((p: any) => `${p.port}:${p.targetPort}/${p.protocol || 'TCP'}`)
          const selectorObj = item.spec?.selector || {}
          const selector = Object.entries(selectorObj).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'
          services.push({
            id: meta.uid || `${ns}/${meta.name}`,
            name: meta.name || 'service',
            namespace: ns,
            type: item.spec?.type || 'ClusterIP',
            clusterIp: item.spec?.clusterIP || 'None',
            externalIp: item.status?.loadBalancer?.ingress?.[0]?.ip || item.status?.loadBalancer?.ingress?.[0]?.hostname,
            ports,
            selector,
          })
        } else if (kind === 'Ingress') {
          namespaces.add(ns)
          const rule = item.spec?.rules?.[0]
          const pathEntry = rule?.http?.paths?.[0]
          ingresses.push({
            id: meta.uid || `${ns}/${meta.name}`,
            name: meta.name || 'ingress',
            namespace: ns,
            host: rule?.host || '*',
            path: pathEntry?.path || '/',
            targetService: pathEntry?.backend?.service?.name || '',
            targetPort: pathEntry?.backend?.service?.port?.number || 80,
            tls: Boolean(item.spec?.tls?.length),
          })
        }
      }

      // Compute pod count per node
      for (const n of nodes) {
        n.podCount = pods.filter((p) => p.node === n.name).length
      }

      this.k8sNamespaces = namespaces.size ? Array.from(namespaces) : ['default']
      this.k8sNodes = nodes
      this.k8sPods = pods
      this.k8sDeployments = deployments
      this.k8sServices = services
      this.k8sIngresses = ingresses
      if (ctxRes.ok && ctxRes.stdout.trim()) this.clusterName = ctxRes.stdout.trim()
      if (verRes.ok && verRes.stdout.trim()) {
        try {
          const v = JSON.parse(verRes.stdout)
          this.serverVersion = v.serverVersion?.gitVersion || v.clientVersion?.gitVersion || this.serverVersion
        } catch {}
      }
      this.k8sLive = true
      return { live: true }
    } catch (err: any) {
      this.k8sLive = false
      return { live: false, error: err?.message || 'Failed to parse kubectl output' }
    }
  }

  public async fetchPodLogsAsync(podId: string, tail = 200): Promise<string[]> {
    const pod = this.k8sPods.find((p) => p.id === podId)
    if (!pod) return []
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.k8sExec && this.k8sLive) {
      const res = await window.electronAPI.infra.k8sExec(['logs', pod.name, '-n', pod.namespace, `--tail=${tail}`], 12000)
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n').trim()
      pod.logs = combined ? combined.split(/\r?\n/) : ['(No pod logs available)']
    }
    return [...pod.logs]
  }

  public async scaleDeploymentAsync(name: string, namespace: string, replicas: number): Promise<{ ok: boolean; error?: string }> {
    const targetReplicas = Math.max(0, replicas)
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.k8sExec && this.k8sLive) {
      const res = await window.electronAPI.infra.k8sExec(
        ['scale', `deployment/${name}`, '-n', namespace, `--replicas=${targetReplicas}`],
        15000
      )
      if (res.ok) {
        await this.refreshKubernetesFromCluster()
        return { ok: true }
      }
      return { ok: false, error: res.stderr || 'kubectl scale failed' }
    }
    return { ok: this.scaleDeployment(name, targetReplicas) }
  }

  public async deletePodAsync(podId: string): Promise<{ ok: boolean; error?: string }> {
    const pod = this.k8sPods.find((p) => p.id === podId)
    if (!pod) return { ok: false, error: 'Pod not found' }
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.k8sExec && this.k8sLive) {
      const res = await window.electronAPI.infra.k8sExec(['delete', 'pod', pod.name, '-n', pod.namespace], 15000)
      if (res.ok) {
        await this.refreshKubernetesFromCluster()
        return { ok: true }
      }
      return { ok: false, error: res.stderr || 'kubectl delete pod failed' }
    }
    return { ok: this.deletePod(podId) }
  }

  public async execInPodAsync(podId: string, command: string): Promise<{ ok: boolean; output: string }> {
    const pod = this.k8sPods.find((p) => p.id === podId)
    if (!pod) return { ok: false, output: 'Pod not found' }
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.k8sExec) {
      return { ok: false, output: 'kubectl exec requires the Electron desktop app.' }
    }
    const res = await window.electronAPI.infra.k8sExec(['exec', pod.name, '-n', pod.namespace, '--', 'sh', '-c', command], 20000)
    return {
      ok: res.ok,
      output: [res.stdout, res.stderr].filter(Boolean).join('\n').trim() || (res.ok ? '(exit 0)' : `exit ${res.exitCode}`),
    }
  }

  public async applyKubernetesYamlAsync(yaml: string): Promise<{ ok: boolean; output: string }> {
    if (typeof window === 'undefined' || !window.electronAPI?.infra?.k8sExec) {
      return { ok: false, output: 'kubectl apply requires the Electron desktop app.' }
    }
    const res = await window.electronAPI.infra.k8sExec(['apply', '-f', '-'], { stdin: yaml, timeoutMs: 25000 })
    if (res.ok) await this.refreshKubernetesFromCluster()
    return { ok: res.ok, output: [res.stdout, res.stderr].filter(Boolean).join('\n').trim() }
  }

  public startContainer(id: string): boolean {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec) {
      void window.electronAPI.infra.dockerExec(['start', id])
    }
    const c = this.containers.find((item) => item.id === id)
    if (c) {
      c.status = 'running'
      c.cpuPercent = 1.2
      c.memoryUsageMb = 64
      c.logs.push(`[system] Started container ${c.name} at ${new Date().toLocaleTimeString()}`)
      return true
    }
    return false
  }

  public stopContainer(id: string): boolean {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec) {
      void window.electronAPI.infra.dockerExec(['stop', id])
    }
    const c = this.containers.find((item) => item.id === id)
    if (c) {
      c.status = 'stopped'
      c.cpuPercent = 0
      c.memoryUsageMb = 0
      c.logs.push(`[system] Stopped container ${c.name} at ${new Date().toLocaleTimeString()}`)
      return true
    }
    return false
  }

  public restartContainer(id: string): boolean {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.dockerExec) {
      void window.electronAPI.infra.dockerExec(['restart', id])
    }
    const c = this.containers.find((item) => item.id === id)
    if (c) {
      c.status = 'running'
      c.cpuPercent = 1.5
      c.memoryUsageMb = 68
      c.logs.push(`[system] Restarted container ${c.name} at ${new Date().toLocaleTimeString()}`)
      return true
    }
    return false
  }

  public pruneDanglingImages(): number {
    const beforeCount = this.images.length
    this.images = this.images.filter((img) => img.inUse)
    return beforeCount - this.images.length
  }

  public generateComposeTemplate(): string {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://indoctrinated:pass@postgres:5432/app_db
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: indoctrinated
      POSTGRES_PASSWORD: secret_password
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
`
  }

  // ==========================================
  // KUBERNETES METHODS
  // ==========================================
  public getClusterSummary(): K8sClusterSummary {
    const totalPods = this.k8sPods.length
    const runningPods = this.k8sPods.filter((p) => p.status === 'Running').length
    return {
      clusterName: this.clusterName,
      serverVersion: this.serverVersion,
      status: runningPods === totalPods && totalPods > 0 ? 'Healthy' : totalPods === 0 ? 'Healthy' : 'Degraded',
      totalNodes: this.k8sNodes.length,
      totalPods,
      runningPods,
      totalDeployments: this.k8sDeployments.length,
      cpuUsagePercent: this.k8sNodes.length
        ? Math.round(this.k8sNodes.reduce((a, n) => a + n.cpuAllocatedPercent, 0) / this.k8sNodes.length)
        : 0,
      memUsagePercent: this.k8sNodes.length
        ? Math.round(this.k8sNodes.reduce((a, n) => a + n.memAllocatedPercent, 0) / this.k8sNodes.length)
        : 0,
    }
  }

  public getNamespaces(): string[] {
    return [...this.k8sNamespaces]
  }

  public getNodes(): K8sNode[] {
    return [...this.k8sNodes]
  }

  public getPods(namespace?: string): K8sPod[] {
    if (!namespace || namespace === 'all-namespaces') {
      return [...this.k8sPods]
    }
    return this.k8sPods.filter((p) => p.namespace === namespace)
  }

  public getDeployments(namespace?: string): K8sDeployment[] {
    if (!namespace || namespace === 'all-namespaces') {
      return [...this.k8sDeployments]
    }
    return this.k8sDeployments.filter((d) => d.namespace === namespace)
  }

  public getServices(namespace?: string): K8sService[] {
    if (!namespace || namespace === 'all-namespaces') {
      return [...this.k8sServices]
    }
    return this.k8sServices.filter((s) => s.namespace === namespace)
  }

  public getIngresses(namespace?: string): K8sIngress[] {
    if (!namespace || namespace === 'all-namespaces') {
      return [...this.k8sIngresses]
    }
    return this.k8sIngresses.filter((i) => i.namespace === namespace)
  }

  public scaleDeployment(name: string, replicas: number): boolean {
    const dep = this.k8sDeployments.find((d) => d.name === name)
    if (dep) {
      dep.desiredReplicas = Math.max(0, replicas)
      dep.currentReplicas = dep.desiredReplicas
      dep.availableReplicas = dep.desiredReplicas
      return true
    }
    return false
  }

  public restartPod(podId: string): boolean {
    const pod = this.k8sPods.find((p) => p.id === podId)
    if (pod) {
      pod.status = 'Running'
      pod.restarts += 1
      pod.logs.push(`[kubelet] Container restarted by operator at ${new Date().toLocaleTimeString()}`)
      return true
    }
    return false
  }

  public deletePod(podId: string): boolean {
    const idx = this.k8sPods.findIndex((p) => p.id === podId)
    if (idx !== -1) {
      this.k8sPods.splice(idx, 1)
      return true
    }
    return false
  }

  /**
   * Generate Kubernetes Deployment + Service Manifest
   */
  public generateKubernetesManifest(appName = 'indoctrinated-app', image = 'indoctrinated/app:v4.1.0', port = 8080, replicas = 3): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}-deployment
  labels:
    app: ${appName}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${image}
        ports:
        - containerPort: ${port}
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 15
          periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: ${appName}-service
spec:
  type: ClusterIP
  selector:
    app: ${appName}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${port}
`
  }

  /**
   * Generate a dynamic docker-compose.yml from active containers (or custom service definitions).
   */
  public generateComposeFromContainers(
    containersList: DockerContainer[] = this.containers,
    customService?: { name: string; image: string; port?: string }
  ): string {
    const services: Array<{ name: string; image: string; ports: string[] }> = containersList.map((c) => ({
      name: c.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+/, '') || 'service',
      image: c.image || 'alpine:latest',
      ports: Array.isArray(c.ports) ? c.ports : typeof (c.ports as unknown) === 'string' && String(c.ports).trim() ? [String(c.ports).trim()] : [],
    }))
    if (customService && customService.name.trim() && customService.image.trim()) {
      services.push({
        name: customService.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
        image: customService.image.trim(),
        ports: customService.port?.trim() ? [customService.port.trim()] : [],
      })
    }
    if (services.length === 0) {
      return `services:\n  app:\n    image: node:22-alpine\n    ports:\n      - "3000:3000"\n    restart: unless-stopped\n`
    }
    const lines = ['services:']
    for (const svc of services) {
      lines.push(`  ${svc.name}:`)
      lines.push(`    image: ${svc.image}`)
      if (svc.ports.length > 0) {
        lines.push('    ports:')
        for (const p of svc.ports) {
          const normalized = p.includes('->')
            ? p.replace(/^.*:(\d+)->(\d+).*$/, '$1:$2')
            : p
          lines.push(`      - "${normalized}"`)
        }
      }
      lines.push('    restart: unless-stopped')
      lines.push('')
    }
    return lines.join('\n')
  }

  /**
   * Generate Kubernetes Ingress YAML
   */
  public generateKubernetesIngress(appName = 'indoctrinated-app', host = 'api.indoctrinated.dev', port = 80): string {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appName}-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - ${host}
    secretName: ${appName}-tls
  rules:
  - host: ${host}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${appName}-service
            port:
              number: ${port}
`
  }

  /**
   * Lint Dockerfile content for security best practices
   */
  public lintDockerfile(content: string): Array<{ line: number; rule: string; severity: 'warning' | 'error' | 'info'; message: string }> {
    const lines = content.split(/\r?\n/)
    const issues: Array<{ line: number; rule: string; severity: 'warning' | 'error' | 'info'; message: string }> = []
    let hasUser = false

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      const lineNum = idx + 1

      if (trimmed.startsWith('FROM') && trimmed.includes(':latest')) {
        issues.push({
          line: lineNum,
          rule: 'avoid-latest-tag',
          severity: 'warning',
          message: 'Avoid using ":latest" tag in base image. Pin to explicit digest or version for reproducible builds.',
        })
      }

      if (trimmed.startsWith('USER')) {
        hasUser = true
      }

      if (trimmed.startsWith('RUN') && trimmed.includes('sudo')) {
        issues.push({
          line: lineNum,
          rule: 'no-sudo',
          severity: 'error',
          message: 'Avoid running "sudo" inside Docker layers. Elevate permissions via USER root if necessary.',
        })
      }

      if (trimmed.startsWith('ADD') && !trimmed.includes('.tar.') && !trimmed.includes('.tgz')) {
        issues.push({
          line: lineNum,
          rule: 'prefer-copy-over-add',
          severity: 'info',
          message: 'Use COPY instead of ADD unless automatic tar extraction is required.',
        })
      }
    })

    if (!hasUser && lines.some((l) => l.trim().startsWith('FROM'))) {
      issues.push({
        line: 1,
        rule: 'missing-non-root-user',
        severity: 'warning',
        message: 'Container runs as root by default. Add a non-root USER instruction before ENTRYPOINT/CMD.',
      })
    }

    return issues
  }
}

export const dockerService = new DockerService()
