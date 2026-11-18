import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { sqliteWasmService } from '../electron/sqlite-wasm-service'
import { dockerService } from '../src/services/dockerService'

describe('Phase R2-2 — Real sql.js SQLite WASM Engine & Live Docker/Kubernetes Sync', () => {
  it('sqliteWasmService creates a real SQLite 3 DB, runs LEFT JOIN/GROUP BY/CTE, introspects schema, saves & reopens from disk', async () => {
    const created = await sqliteWasmService.createSqliteDb(
      'test_phase_r2_2.sqlite',
      `
      CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE members (id INTEGER PRIMARY KEY, team_id INTEGER REFERENCES teams(id), role TEXT, score INTEGER);
      INSERT INTO teams (id, name) VALUES (1, 'Core'), (2, 'EmptyTeam');
      INSERT INTO members (id, team_id, role, score) VALUES (1, 1, 'dev', 100), (2, 1, 'ops', 80);
      `
    )
    expect(created.ok).toBe(true)
    expect(created.dbId).toBeDefined()
    expect(created.tables?.teams?.columns.find((c) => c.name === 'id')?.isPrimaryKey).toBe(true)
    expect(created.tables?.members?.columns.find((c) => c.name === 'team_id')?.isForeignKey).toBe(true)

    // Real CTE + LEFT JOIN + GROUP BY (impossible in the old regex toy parser)
    const res = sqliteWasmService.execSqlite(
      created.dbId!,
      `
      WITH summary AS (
        SELECT t.name AS team_name, COUNT(m.id) AS member_count, COALESCE(SUM(m.score), 0) AS total_score
        FROM teams t
        LEFT JOIN members m ON m.team_id = t.id
        GROUP BY t.id
      )
      SELECT * FROM summary ORDER BY team_name;
      `
    )
    expect(res.ok).toBe(true)
    expect(res.rows).toEqual([
      { team_name: 'Core', member_count: 2, total_score: 180 },
      { team_name: 'EmptyTeam', member_count: 0, total_score: 0 },
    ])

    // Save to real temp file and reopen from disk
    const tmpFile = path.join(os.tmpdir(), `indoctrinated_r2_2_${Date.now()}.sqlite`)
    const saved = await sqliteWasmService.saveSqliteDb(created.dbId!, tmpFile)
    expect(saved.ok).toBe(true)
    sqliteWasmService.closeSqliteDb(created.dbId!)

    const reopened = await sqliteWasmService.openSqliteFile(tmpFile)
    expect(reopened.ok).toBe(true)
    expect(reopened.tables?.teams?.rowCount).toBe(2)
    expect(reopened.tables?.members?.rowCount).toBe(2)
    sqliteWasmService.closeSqliteDb(reopened.dbId!)
    await fs.unlink(tmpFile).catch(() => {})
  })

  it('dockerService syncs real Docker containers, stats, images & volumes via infra.dockerExec', async () => {
    const origWin = (globalThis as any).window
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          dockerExec: vi.fn().mockImplementation(async (args: string[]) => {
            if (args[0] === 'ps') {
              return {
                ok: true,
                stdout: JSON.stringify({ ID: 'abc123456789', Names: 'real-api', Image: 'node:22', State: 'running', Ports: '0.0.0.0:3000->3000/tcp', RunningFor: '2 hours ago' }),
                stderr: '',
                exitCode: 0,
              }
            }
            if (args[0] === 'stats') {
              return {
                ok: true,
                stdout: JSON.stringify({ ID: 'abc123456789', CPUPerc: '4.5%', MemUsage: '128MiB / 1GiB' }),
                stderr: '',
                exitCode: 0,
              }
            }
            if (args[0] === 'images') {
              return {
                ok: true,
                stdout: JSON.stringify({ ID: 'img999', Repository: 'node', Tag: '22', Size: '180MB', CreatedSince: '1w ago' }),
                stderr: '',
                exitCode: 0,
              }
            }
            if (args[0] === 'volume') {
              return {
                ok: true,
                stdout: JSON.stringify({ Name: 'pg_real_vol', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/pg_real_vol' }),
                stderr: '',
                exitCode: 0,
              }
            }
            return { ok: true, stdout: '', stderr: '', exitCode: 0 }
          }),
        },
      },
    }

    const sync = await dockerService.refreshContainersFromDaemon()
    expect(sync.live).toBe(true)
    expect(sync.containers).toHaveLength(1)
    expect(sync.containers[0].name).toBe('real-api')
    expect(sync.containers[0].cpuPercent).toBe(4.5)
    expect(sync.containers[0].memoryUsageMb).toBe(128)
    expect(dockerService.getImages()[0].repository).toBe('node')
    expect(dockerService.getVolumes()[0].name).toBe('pg_real_vol')

    ;(globalThis as any).window = origWin
  })

  it('dockerService syncs real Kubernetes topology via infra.k8sExec', async () => {
    const origWin = (globalThis as any).window
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          k8sExec: vi.fn().mockImplementation(async (args: string[]) => {
            if (args[0] === 'config') return { ok: true, stdout: 'prod-gke-cluster\n', stderr: '', exitCode: 0 }
            if (args[0] === 'version') return { ok: true, stdout: JSON.stringify({ serverVersion: { gitVersion: 'v1.32.0' } }), stderr: '', exitCode: 0 }
            if (args[0] === 'get') {
              return {
                ok: true,
                stdout: JSON.stringify({
                  items: [
                    { kind: 'Namespace', metadata: { name: 'payments' } },
                    { kind: 'Node', metadata: { name: 'gke-node-1', labels: { 'node-role.kubernetes.io/worker': '' } }, status: { conditions: [{ type: 'Ready', status: 'True' }], capacity: { cpu: '8', memory: '16777216Ki', pods: '110' }, nodeInfo: { kubeletVersion: 'v1.32.0', osImage: 'Container-Optimized OS' } } },
                    { kind: 'Pod', metadata: { uid: 'p1', name: 'checkout-0', namespace: 'payments' }, spec: { nodeName: 'gke-node-1', containers: [{ name: 'api' }] }, status: { phase: 'Running', podIP: '10.0.0.5', containerStatuses: [{ ready: true, restartCount: 1 }] } },
                    { kind: 'Deployment', metadata: { uid: 'd1', name: 'checkout', namespace: 'payments' }, spec: { replicas: 2, template: { spec: { containers: [{ image: 'checkout:2.0' }] } } }, status: { replicas: 2, availableReplicas: 2 } },
                  ],
                }),
                stderr: '',
                exitCode: 0,
              }
            }
            return { ok: true, stdout: '', stderr: '', exitCode: 0 }
          }),
        },
      },
    }

    const res = await dockerService.refreshKubernetesFromCluster()
    expect(res.live).toBe(true)
    expect(dockerService.getClusterSummary().clusterName).toBe('prod-gke-cluster')
    expect(dockerService.getClusterSummary().serverVersion).toBe('v1.32.0')
    expect(dockerService.getNamespaces()).toContain('payments')
    expect(dockerService.getPods('payments')[0].name).toBe('checkout-0')
    expect(dockerService.getDeployments('payments')[0].image).toBe('checkout:2.0')

    ;(globalThis as any).window = origWin
  })
})
