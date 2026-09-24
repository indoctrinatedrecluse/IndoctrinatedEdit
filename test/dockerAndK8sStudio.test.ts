import { describe, it, expect, beforeEach } from 'vitest'
import { dockerService } from '../src/services/dockerService'

describe('Docker & Kubernetes Cloud-Native Management Subsystem', () => {
  describe('Docker Engine Operations', () => {
    it('returns containers and allows start/stop/restart', () => {
      const containers = dockerService.getContainers()
      expect(containers.length).toBeGreaterThan(0)

      const stopped = containers.find((c) => c.status === 'stopped')
      if (stopped) {
        const started = dockerService.startContainer(stopped.id)
        expect(started).toBe(true)
        const updated = dockerService.getContainers().find((c) => c.id === stopped.id)
        expect(updated?.status).toBe('running')
      }

      const running = containers.find((c) => c.status === 'running')
      if (running) {
        const stoppedRes = dockerService.stopContainer(running.id)
        expect(stoppedRes).toBe(true)
        const updated = dockerService.getContainers().find((c) => c.id === running.id)
        expect(updated?.status).toBe('stopped')
      }
    })

    it('generates valid docker compose template', () => {
      const compose = dockerService.generateComposeTemplate()
      expect(compose).toContain('version:')
      expect(compose).toContain('postgres:')
      expect(compose).toContain('redis:')
    })

    it('lints Dockerfile for root user and sudo issues', () => {
      const issues = dockerService.lintDockerfile(`
        FROM node:latest
        RUN sudo apt-get update
        ADD file.txt /app/file.txt
      `)
      expect(issues.some((i) => i.rule === 'avoid-latest-tag')).toBe(true)
      expect(issues.some((i) => i.rule === 'no-sudo')).toBe(true)
      expect(issues.some((i) => i.rule === 'missing-non-root-user')).toBe(true)
    })
  })

  describe('Kubernetes Cluster Visualizer Operations', () => {
    it('provides cluster health summary, namespaces, and node topology', () => {
      const summary = dockerService.getClusterSummary()
      expect(summary.clusterName).toBe('indoctrinated-k8s-production')
      expect(summary.totalNodes).toBeGreaterThan(0)
      expect(summary.totalPods).toBeGreaterThan(0)

      const namespaces = dockerService.getNamespaces()
      expect(namespaces).toContain('default')
      expect(namespaces).toContain('production')
      expect(namespaces).toContain('staging')

      const nodes = dockerService.getNodes()
      expect(nodes.length).toBeGreaterThan(0)
      expect(nodes[0].status).toBe('Ready')
      expect(nodes[0].cpuCapacityCores).toBeGreaterThan(0)
    })

    it('filters pods and deployments by namespace', () => {
      const prodPods = dockerService.getPods('production')
      expect(prodPods.length).toBeGreaterThan(0)
      expect(prodPods.every((p) => p.namespace === 'production')).toBe(true)

      const prodDeps = dockerService.getDeployments('production')
      expect(prodDeps.length).toBeGreaterThan(0)
      expect(prodDeps.every((d) => d.namespace === 'production')).toBe(true)
    })

    it('scales deployments dynamically', () => {
      const scaled = dockerService.scaleDeployment('api-gateway', 5)
      expect(scaled).toBe(true)
      const dep = dockerService.getDeployments().find((d) => d.name === 'api-gateway')
      expect(dep?.desiredReplicas).toBe(5)
      expect(dep?.availableReplicas).toBe(5)
    })

    it('restarts and deletes pods in cluster topology', () => {
      const pods = dockerService.getPods()
      const firstPod = pods[0]
      const initialRestarts = firstPod.restarts

      const restarted = dockerService.restartPod(firstPod.id)
      expect(restarted).toBe(true)
      const updatedPod = dockerService.getPods().find((p) => p.id === firstPod.id)
      expect(updatedPod?.restarts).toBe(initialRestarts + 1)

      const deleted = dockerService.deletePod(firstPod.id)
      expect(deleted).toBe(true)
      expect(dockerService.getPods().some((p) => p.id === firstPod.id)).toBe(false)
    })

    it('generates Kubernetes YAML manifests and ingress specs', () => {
      const manifest = dockerService.generateKubernetesManifest('my-service', 'my-image:v1', 3000, 4)
      expect(manifest).toContain('kind: Deployment')
      expect(manifest).toContain('name: my-service-deployment')
      expect(manifest).toContain('replicas: 4')
      expect(manifest).toContain('kind: Service')

      const ingress = dockerService.generateKubernetesIngress('my-service', 'api.example.com', 3000)
      expect(ingress).toContain('kind: Ingress')
      expect(ingress).toContain('host: api.example.com')
    })
  })
})
