import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Layers,
  AlertTriangle,
  Zap,
  Search,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import {
  bundleAnalyzerService,
  BundleChunk,
  DuplicatePackageAlert,
  ImportCostEstimate,
} from '../../services/bundleAnalyzerService'
import './BundleAnalyzerView.css'

interface BundleAnalyzerViewProps {
  workspaceRoot?: string
}

export const BundleAnalyzerView: React.FC<BundleAnalyzerViewProps> = ({ workspaceRoot }) => {
  const [activeTab, setActiveTab] = useState<'treemap' | 'cost' | 'duplicates'>('treemap')
  const [selectedChunk, setSelectedChunk] = useState<BundleChunk | null>(null)
  const [pkgSearchInput, setPkgSearchInput] = useState<string>('lodash')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [chunks, setChunks] = useState<BundleChunk[]>(() => bundleAnalyzerService.getChunks())
  const [duplicateAlerts, setDuplicateAlerts] = useState<DuplicatePackageAlert[]>(() => bundleAnalyzerService.getDuplicates())
  const [isLive, setIsLive] = useState(false)
  const [buildDir, setBuildDir] = useState<string | null>(null)
  const [hasScannedLive, setHasScannedLive] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [importEstimate, setImportEstimate] = useState<ImportCostEstimate>(() =>
    bundleAnalyzerService.estimateImportCost('lodash')
  )

  const runScan = useCallback(async () => {
    if (!workspaceRoot) return
    setIsScanning(true)
    try {
      const res = await bundleAnalyzerService.analyzeWorkspace(workspaceRoot)
      setChunks(res.chunks)
      setDuplicateAlerts(res.duplicates)
      setIsLive(res.isLive)
      setBuildDir(res.buildDir)
      setHasScannedLive(true)
    } finally {
      setIsScanning(false)
    }
  }, [workspaceRoot])

  useEffect(() => {
    void runScan()
  }, [runScan])

  useEffect(() => {
    if (!pkgSearchInput.trim()) return
    let cancelled = false
    setImportEstimate(bundleAnalyzerService.estimateImportCost(pkgSearchInput))
    const timer = setTimeout(() => {
      void bundleAnalyzerService.estimateImportCostAsync(pkgSearchInput).then((live) => {
        if (!cancelled) setImportEstimate(live)
      })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pkgSearchInput])

  const totalSize = {
    rawKb: Math.round(chunks.reduce((acc, c) => acc + c.sizeKb, 0) * 10) / 10,
    gzipKb: Math.round(chunks.reduce((acc, c) => acc + c.gzipSizeKb, 0) * 10) / 10,
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="bundle-analyzer-root">
      {/* Sub-Nav Bar */}
      <div
        className="bundle-nav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'treemap' ? 'active' : ''}`}
          onClick={() => setActiveTab('treemap')}
        >
          <Layers size={12} />
          <span>Bundle TreeMap</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'cost' ? 'active' : ''}`}
          onClick={() => setActiveTab('cost')}
        >
          <Zap size={12} />
          <span>Import Cost Estimator</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'duplicates' ? 'active' : ''}`}
          onClick={() => setActiveTab('duplicates')}
        >
          <AlertTriangle size={12} />
          <span>Duplicate Bloat</span>
          {duplicateAlerts.length > 0 && (
            <span className="dup-badge">{duplicateAlerts.length}</span>
          )}
        </button>
      </div>

      {/* Summary Stats Header */}
      <div className="bundle-summary-header glass-panel">
        <div className="stat-card">
          <span className="stat-label">Total Bundle Size</span>
          <span className="stat-val">{totalSize.rawKb} KB</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Gzipped Size</span>
          <span className="stat-val highlight">{totalSize.gzipKb} KB</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Chunks</span>
          <span className="stat-val">{chunks.length} {isLive ? '• LIVE' : ''}</span>
        </div>
        {workspaceRoot && (
          <button
            className="export-report-btn glass-interactive"
            onClick={() => void runScan()}
            disabled={isScanning}
            title="Rescan Workspace dist/build Artifacts"
          >
            <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Scanning' : 'Rescan'}</span>
          </button>
        )}
        <button
          className="export-report-btn glass-interactive"
          onClick={() =>
            copyToClipboard(bundleAnalyzerService.exportReportMarkdown(), 'report_copy')
          }
          title="Copy Markdown Breakdown Report"
        >
          {copiedKey === 'report_copy' ? <Check size={12} /> : <Copy size={12} />}
          <span>Report</span>
        </button>
      </div>

      {/* TreeMap Tab */}
      {activeTab === 'treemap' && (
        <div className="treemap-layout">
          {chunks.length === 0 && hasScannedLive ? (
            <div className="cost-estimate-card glass-panel" style={{ padding: 14, fontSize: 12, opacity: 0.85 }}>
              <strong>No build output directory detected</strong>
              <p style={{ margin: '6px 0 0', opacity: 0.75 }}>
                Scanned workspace for <code>dist/</code>, <code>build/</code>, <code>out/</code>, and <code>.next/static</code>.
                Run your project build first, then click <strong>Rescan</strong> to analyze real bundle artifacts.
              </p>
            </div>
          ) : (
          <>
          {buildDir && (
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
              Live bundle scan from <code>{buildDir}</code>
            </div>
          )}
          {/* Proportional Visual Bar Chart */}
          <div className="treemap-stacked-bar">
            {chunks.map((c) => (
              <div
                key={c.id}
                className="chunk-bar-slice"
                style={{ width: `${c.percentage}%`, background: c.color }}
                onClick={() => setSelectedChunk(c)}
                title={`${c.name} (${c.sizeKb} KB, ${c.percentage}%)`}
              />
            ))}
          </div>

          {/* Chunks Matrix */}
          <div className="chunks-grid">
            {chunks.map((c) => {
              const isSelected = selectedChunk?.id === c.id
              return (
                <div
                  key={c.id}
                  className={`chunk-card glass-panel ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedChunk(c)}
                >
                  <div className="chunk-top">
                    <div className="name-box">
                      <span className="color-dot" style={{ background: c.color }} />
                      <span className="chunk-name">{c.name}</span>
                    </div>
                    <span className="chunk-pct">{c.percentage}%</span>
                  </div>
                  <div className="chunk-metrics">
                    <span>{c.sizeKb} KB (Gzip: {c.gzipSizeKb} KB)</span>
                    <span className="mod-count">{c.modules.length} modules</span>
                  </div>

                  {isSelected && (
                    <div className="modules-drilldown">
                      {c.modules.map((m) => (
                        <div key={m.name} className="mod-row">
                          <span className="mod-name">{m.name}</span>
                          <span className="mod-size">{m.sizeKb} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </>
          )}
        </div>
      )}

      {/* Import Cost Estimator Tab */}
      {activeTab === 'cost' && (
        <div className="cost-layout">
          <div className="cost-search-bar glass-panel">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              value={pkgSearchInput}
              onChange={(e) => setPkgSearchInput(e.target.value)}
              placeholder="Package name (e.g. lodash, moment, axios, lucide-react)..."
              className="pkg-search-input"
            />
          </div>

          {pkgSearchInput.trim() ? (
          <div className="cost-estimate-card glass-panel">
            <div className="pkg-header">
              <Package size={16} className="pkg-icon" />
              <div className="pkg-title-block">
                <span className="pkg-name">{importEstimate.packageName}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    className="tree-shake-tag"
                    style={
                      importEstimate.treeShakeable
                        ? undefined
                        : { background: 'rgba(255, 69, 58, 0.18)', color: '#FF453A', borderColor: 'rgba(255, 69, 58, 0.35)' }
                    }
                  >
                    {importEstimate.treeShakeable ? 'Tree-shakeable' : 'Non-treeshakeable'}
                  </span>
                  {importEstimate.source && (
                    <span
                      className="tree-shake-tag"
                      style={
                        importEstimate.source === 'bundlephobia'
                          ? { background: 'rgba(48, 209, 88, 0.16)', color: '#30D158', borderColor: 'rgba(48, 209, 88, 0.35)' }
                          : { background: 'rgba(255, 159, 10, 0.16)', color: '#FF9F0A', borderColor: 'rgba(255, 159, 10, 0.35)' }
                      }
                    >
                      {importEstimate.source === 'bundlephobia'
                        ? 'Bundlephobia Live'
                        : importEstimate.source === 'catalog'
                          ? 'Offline Catalog'
                          : 'Offline Estimate'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="cost-metrics-row">
              <div className="cost-box">
                <span className="cost-label">Minified Size</span>
                <span className="cost-val">{importEstimate.sizeKb} KB</span>
              </div>
              <div className="cost-box">
                <span className="cost-label">Gzipped Size</span>
                <span className="cost-val green">{importEstimate.gzipKb} KB</span>
              </div>
            </div>

            {importEstimate.alternative && (
              <div className="alternative-alert glass-panel">
                <div className="alt-title">
                  <Sparkles size={13} />
                  <span>Tree-Shaking Optimization Tip</span>
                </div>
                <div className="alt-desc">
                  Consider replacing with <strong>{importEstimate.alternative.name}</strong> to save{' '}
                  <strong className="saving-text">~{importEstimate.alternative.savingKb} KB</strong>.
                </div>
                <div className="alt-reason">{importEstimate.alternative.reason}</div>
              </div>
            )}
          </div>
          ) : (
            <div className="cost-estimate-card glass-panel" style={{ opacity: 0.7, fontSize: 12 }}>
              Enter an npm package name above to estimate its minified and gzipped import cost.
            </div>
          )}
        </div>
      )}

      {/* Duplicate Bloat Tab */}
      {activeTab === 'duplicates' && (
        <div className="duplicates-layout">
          <div className="dup-notice">
            <span>Multiple versions of the same package bundled in node_modules</span>
          </div>

          <div className="duplicates-feed">
            {duplicateAlerts.length === 0 ? (
              <div className="duplicate-card glass-panel" style={{ opacity: 0.85, fontSize: 12 }}>
                ✔ No duplicate package versions detected in your workspace lockfile.
              </div>
            ) : (
              duplicateAlerts.map((dup) => (
                <div key={dup.packageName} className="duplicate-card glass-panel">
                  <div className="dup-top">
                    <span className="dup-pkg-name">{dup.packageName}</span>
                    <span className="wasted-badge">~{dup.totalWastedKb} KB Wasted</span>
                  </div>
                  <div className="versions-row">
                    <span className="ver-label">Versions:</span>
                    {dup.versions.map((v) => (
                      <span key={v} className="ver-pill">
                        v{v}
                      </span>
                    ))}
                  </div>
                  <div className="dependents-row">
                    <span className="dep-label">Pulled in by:</span>
                    <span className="dep-list">{dup.dependents.join(', ')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  )
}
