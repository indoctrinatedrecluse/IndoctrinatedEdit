/**
 * IndoctrinatedEdit - Docker & Container Management Engine
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

