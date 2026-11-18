import React, { useState, useMemo } from 'react'
import {
  Package,
  Layers,
  AlertTriangle,
  Zap,
  Search,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import {
  bundleAnalyzerService,
  BundleChunk,
} from '../../services/bundleAnalyzerService'
import './BundleAnalyzerView.css'

export const BundleAnalyzerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'treemap' | 'cost' | 'duplicates'>('treemap')
  const [selectedChunk, setSelectedChunk] = useState<BundleChunk | null>(null)
  const [pkgSearchInput, setPkgSearchInput] = useState<string>('lodash')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const chunks = useMemo(() => {
    return bundleAnalyzerService.getChunks()
  }, [])

  const totalSize = useMemo(() => {
    return bundleAnalyzerService.getTotalSizeKb()
  }, [])

  const duplicateAlerts = useMemo(() => {
    return bundleAnalyzerService.getDuplicates()
  }, [])

  const importEstimate = useMemo(() => {
    return bundleAnalyzerService.estimateImportCost(pkgSearchInput)
  }, [pkgSearchInput])

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
          <span className="stat-val">{chunks.length}</span>
        </div>
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
            {duplicateAlerts.map((dup) => (
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
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
