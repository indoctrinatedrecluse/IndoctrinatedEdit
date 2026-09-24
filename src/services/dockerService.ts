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
      image: 'registry.indoctrinated.internal/core-engine:v5.0.0',
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
      image: 'registry.indoctrinated.internal/core-engine:v5.1.0-rc.2',
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

  public startContainer(id: string): boolean {
    const c = this.containers.find((item) => item.id === id)
    if (c) {
      c.status = 'running'
      c.cpuPercent = +(Math.random() * 3 + 0.5).toFixed(1)
      c.memoryUsageMb = Math.floor(Math.random() * 100 + 50)
      c.logs.push(`[system] Started container ${c.name} at ${new Date().toLocaleTimeString()}`)
      return true
    }
    return false
  }

  public stopContainer(id: string): boolean {
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
    const c = this.containers.find((item) => item.id === id)
    if (c) {
      c.status = 'restarting'
      c.logs.push(`[system] Restarting container ${c.name}...`)
      setTimeout(() => {
        c.status = 'running'
        c.cpuPercent = +(Math.random() * 2 + 1).toFixed(1)
        c.memoryUsageMb = Math.floor(Math.random() * 80 + 40)
        c.logs.push(`[system] Container ${c.name} restarted successfully.`)
      }, 600)
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
      clusterName: 'indoctrinated-k8s-production',
      serverVersion: 'v1.31.1+k8s',
      status: runningPods === totalPods ? 'Healthy' : 'Degraded',
      totalNodes: this.k8sNodes.length,
      totalPods,
      runningPods,
      totalDeployments: this.k8sDeployments.length,
      cpuUsagePercent: 51,
      memUsagePercent: 54,
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
