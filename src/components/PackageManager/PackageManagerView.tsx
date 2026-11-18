import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  ShieldAlert,
  ArrowUpCircle,
  CheckCircle,
  Search,
  Scale,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react'
import { packageManagerService, ManifestScanResult } from '../../services/packageManagerService'
import './PackageManagerView.css'

interface PackageManagerViewProps {
  activeFileName?: string
  activeFileContent?: string
  workspaceRoot?: string
}

export const PackageManagerView: React.FC<PackageManagerViewProps> = ({
  activeFileName = 'package.json',
  activeFileContent = '',
  workspaceRoot,
}) => {
  const [scanResult, setScanResult] = useState<ManifestScanResult | null>(null)
  const [availableManifests, setAvailableManifests] = useState<string[]>([])
  const [selectedManifest, setSelectedManifest] = useState<string>(activeFileName)
  const [filterQuery, setFilterQuery] = useState('')
  const [onlyOutdated, setOnlyOutdated] = useState(false)
  const [onlyVulnerable, setOnlyVulnerable] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [installInput, setInstallInput] = useState('')
  const [cliOutput, setCliOutput] = useState<string | null>(null)

  const loadWorkspaceManifest = useCallback(
    async (opts?: { runOutdated?: boolean; runAudit?: boolean; targetManifest?: string }) => {
      if (workspaceRoot && window.electronAPI?.readFile) {
        setIsBusy(true)
        try {
          const manifests = await packageManagerService.listWorkspaceManifests(workspaceRoot)
          setAvailableManifests(manifests)
          let manifestName = opts?.targetManifest || selectedManifest
          if (manifests.length > 0 && !manifests.includes(manifestName)) {
            manifestName = manifests[0]
            setSelectedManifest(manifestName)
          }
          const live = await packageManagerService.scanWorkspaceAsync(workspaceRoot, {
            manifestFileName: manifests.length > 0 ? manifestName : undefined,
            runOutdated: opts?.runOutdated,
            runAudit: opts?.runAudit,
          })
          if (live) {
            setScanResult((prev) => {
              if (!prev || prev.filePath !== live.filePath) return live
              const prevMap = new Map(prev.dependencies.map((d) => [d.name, d]))
              const mergedDeps = live.dependencies.map((dep) => {
                const old = prevMap.get(dep.name)
                if (!old) return dep
                return {
                  ...dep,
                  // Preserve outdated info when only running audit
                  latestVersion: opts?.runOutdated ? dep.latestVersion : old.latestVersion,
                  isOutdated: opts?.runOutdated ? dep.isOutdated : old.isOutdated,
                  // Preserve audit info when only running outdated
                  vulnerabilitiesCount: opts?.runAudit ? dep.vulnerabilitiesCount : old.vulnerabilitiesCount,
                  highestSeverity: opts?.runAudit ? dep.highestSeverity : old.highestSeverity,
                }
              })
              return {
                ...live,
                dependencies: mergedDeps,
                outdatedCount: mergedDeps.filter((d) => d.isOutdated).length,
                vulnerabilitiesCount: mergedDeps.reduce((acc, d) => acc + (d.vulnerabilitiesCount || 0), 0),
              }
            })
            return
          }
        } finally {
          setIsBusy(false)
        }
      }
      const res = packageManagerService.parseManifest(opts?.targetManifest || activeFileName, activeFileContent)
      setScanResult(res)
    },
    [workspaceRoot, selectedManifest, activeFileName, activeFileContent]
  )

  useEffect(() => {
    void loadWorkspaceManifest()
  }, [loadWorkspaceManifest])

  const handleNpmCli = async (action: 'install' | 'uninstall' | 'update', pkg?: string) => {
    if (!workspaceRoot) return
    setIsBusy(true)
    setCliOutput(`Running npm ${action}${pkg ? ` ${pkg}` : ''}...`)
    try {
      const res = await packageManagerService.runNpmAction(action, workspaceRoot, pkg)
      setCliOutput(res.output || (res.success ? `npm ${action} completed.` : `npm ${action} failed (exit ${res.exitCode})`))
      if (action === 'install') setInstallInput('')
      await loadWorkspaceManifest()
    } finally {
      setIsBusy(false)
    }
  }

  const filteredDependencies = (scanResult?.dependencies || []).filter((d) => {
    const matchesName = d.name.toLowerCase().includes(filterQuery.toLowerCase())
    if (onlyOutdated && !d.isOutdated) return false
    if (onlyVulnerable && (!d.vulnerabilitiesCount || d.vulnerabilitiesCount === 0)) return false
    return matchesName
  })

  return (
    <div className="package-manager-root">
      {/* Top Header & Search Bar */}
      <div className="pkg-search-bar glass-panel">
        {availableManifests.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            {availableManifests.map((m) => (
              <button
                key={m}
                className={`filter-chip ${selectedManifest === m ? 'active' : ''}`}
                onClick={() => {
                  setSelectedManifest(m)
                  void loadWorkspaceManifest({ targetManifest: m })
                }}
              >
                <Package size={10} /> {m}
              </button>
            ))}
          </div>
        )}
        <div className="search-input-wrapper">
          <Search size={12} className="search-icon" />
          <input
            type="text"
            className="pkg-search-input"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search dependencies..."
          />
        </div>

        <div
          className="filter-toggles"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          <button
            className={`filter-chip ${onlyOutdated ? 'active' : ''}`}
            onClick={() => setOnlyOutdated(!onlyOutdated)}
          >
            <ArrowUpCircle size={10} /> Outdated ({scanResult?.outdatedCount || 0})
          </button>
          <button
            className={`filter-chip ${onlyVulnerable ? 'active vuln' : ''}`}
            onClick={() => setOnlyVulnerable(!onlyVulnerable)}
          >
            <ShieldAlert size={10} /> Vulnerabilities ({scanResult?.vulnerabilitiesCount || 0})
          </button>
          {workspaceRoot && scanResult?.ecosystem === 'npm' && (
            <>
              <button
                className="filter-chip"
                onClick={() => void loadWorkspaceManifest({ runOutdated: true })}
                disabled={isBusy}
                title="Run live npm outdated --json"
              >
                <RefreshCw size={10} className={isBusy ? 'animate-spin' : ''} /> Check Outdated
              </button>
              <button
                className="filter-chip"
                onClick={() => void loadWorkspaceManifest({ runAudit: true })}
                disabled={isBusy}
                title="Run live npm audit --json"
              >
                <ShieldAlert size={10} /> Live Audit
              </button>
            </>
          )}
        </div>

        {workspaceRoot && scanResult?.ecosystem === 'npm' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              type="text"
              className="pkg-search-input"
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Install npm package (e.g. zod, dayjs)..."
              value={installInput}
              onChange={(e) => setInstallInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && installInput.trim()) void handleNpmCli('install', installInput.trim())
              }}
            />
            <button
              className="filter-chip active"
              disabled={isBusy || !installInput.trim()}
              onClick={() => void handleNpmCli('install', installInput.trim())}
            >
              <Plus size={10} /> Install
            </button>
          </div>
        )}
      </div>

      {cliOutput && (
        <div className="glass-panel" style={{ margin: '0 8px 6px', padding: 8, fontSize: 10.5, fontFamily: 'monospace', maxHeight: 110, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, opacity: 0.7 }}>
            <span>CLI Output</span>
            <button style={{ background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer' }} onClick={() => setCliOutput(null)}>✕</button>
          </div>
          {cliOutput}
        </div>
      )}

      {/* Main Dependencies List */}
      <div className="pkg-body-viewport">
        {filteredDependencies.length === 0 ? (
          <div className="empty-pkg-state">
            <Package size={28} className="empty-icon" />
            <span>No matching dependencies found</span>
          </div>
        ) : (
          <div className="dependencies-list">
            {filteredDependencies.map((dep) => (
              <div key={dep.name} className="dep-card glass-panel">
                <div className="dep-title-row">
                  <div className="dep-name-box">
                    <span className="dep-name">{dep.name}</span>
                    <span className="dep-eco-badge">{dep.ecosystem.toUpperCase()}</span>
                  </div>
                  <div className="dep-version-box">
                    <span className="ver-curr">v{dep.currentVersion}</span>
                    {dep.isOutdated ? (
                      <span className="ver-latest-pill">➔ v{dep.latestVersion}</span>
                    ) : (
                      <span className="ver-up-to-date"><CheckCircle size={10} /> Declared</span>
                    )}
                  </div>
                </div>

                <div className="dep-meta-row">
                  <div className="meta-left">
                    <span className="meta-item"><Scale size={10} /> {dep.license}</span>
                    {dep.approxSizeKb && <span className="meta-item">{dep.approxSizeKb} KB</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {dep.vulnerabilitiesCount && dep.vulnerabilitiesCount > 0 ? (
                      <span className={`vuln-badge ${dep.highestSeverity}`}>
                        <ShieldAlert size={10} /> {dep.vulnerabilitiesCount} Advisory ({dep.highestSeverity?.toUpperCase()})
                      </span>
                    ) : null}
                    {workspaceRoot && dep.ecosystem === 'npm' && (
                      <>
                        {dep.isOutdated && (
                          <button
                            className="filter-chip"
                            disabled={isBusy}
                            onClick={() => void handleNpmCli('update', dep.name)}
                            title={`npm update ${dep.name}`}
                          >
                            Update
                          </button>
                        )}
                        <button
                          className="filter-chip"
                          disabled={isBusy}
                          onClick={() => void handleNpmCli('uninstall', dep.name)}
                          title={`npm uninstall ${dep.name}`}
                        >
                          <Trash2 size={10} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
