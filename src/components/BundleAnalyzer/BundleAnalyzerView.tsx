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

          <div className="cost-estimate-card glass-panel">
            <div className="pkg-header">
              <Package size={16} className="pkg-icon" />
              <div className="pkg-title-block">
                <span className="pkg-name">{importEstimate.packageName}</span>
                <span className="tree-shake-tag">
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

      <style>{`
        .bundle-analyzer-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.78rem;
          overflow: hidden;
        }

        .bundle-nav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 5px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.65);
          font-size: 0.72rem;
          cursor: pointer;
        }

        .nav-tab-btn.active {
          background: rgba(10, 132, 255, 0.15);
          border-color: rgba(10, 132, 255, 0.35);
          color: #64D2FF;
          font-weight: 600;
        }

        .dup-badge {
          background: #FF453A;
          color: #FFFFFF;
          border-radius: 10px;
          padding: 0 4px;
          font-size: 0.6rem;
          font-weight: 700;
        }

        .bundle-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .stat-label {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .stat-val {
          font-weight: 700;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
        }

        .stat-val.highlight {
          color: #30D158;
        }

        .export-report-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.8);
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .treemap-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 10px;
        }

        .treemap-stacked-bar {
          height: 14px;
          border-radius: 4px;
          display: flex;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chunk-bar-slice {
          height: 100%;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .chunk-bar-slice:hover {
          opacity: 0.8;
        }

        .chunks-grid {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chunk-card {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chunk-card.selected {
          border-color: rgba(10, 132, 255, 0.4);
          background: rgba(10, 132, 255, 0.08);
        }

        .chunk-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .name-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .chunk-name {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          color: #FFFFFF;
        }

        .chunk-pct {
          font-weight: 700;
          color: rgba(235, 235, 245, 0.6);
        }

        .chunk-metrics {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .modules-drilldown {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mod-row {
          display: flex;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
        }

        .mod-name { color: rgba(235, 235, 245, 0.7); }
        .mod-size { color: #64D2FF; }

        .cost-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 10px;
        }

        .cost-search-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
        }

        .pkg-search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-size: 0.74rem;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
        }

        .cost-estimate-card {
          padding: 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pkg-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pkg-icon { color: #FF9F0A; }

        .pkg-title-block {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pkg-name {
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          color: #FFFFFF;
        }

        .tree-shake-tag {
          font-size: 0.6rem;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
        }

        .cost-metrics-row {
          display: flex;
          gap: 12px;
        }

        .cost-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 5px;
          padding: 8px 12px;
          flex: 1;
        }

        .cost-label {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .cost-val {
          font-size: 1rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: #64D2FF;
        }

        .cost-val.green { color: #30D158; }

        .alternative-alert {
          padding: 10px;
          border-radius: 6px;
          background: rgba(191, 90, 242, 0.1);
          border: 1px solid rgba(191, 90, 242, 0.3);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .alt-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          color: #BF5AF2;
        }

        .alt-desc {
          font-size: 0.72rem;
          color: #FFFFFF;
        }

        .saving-text { color: #30D158; }

        .alt-reason {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .duplicates-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 8px;
        }

        .dup-notice {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .duplicates-feed {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .duplicate-card {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 69, 58, 0.2);
          background: rgba(255, 69, 58, 0.04);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dup-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dup-pkg-name {
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: #FFFFFF;
        }

        .wasted-badge {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .versions-row, .dependents-row {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
        }

        .ver-label, .dep-label { color: rgba(235, 235, 245, 0.5); }

        .ver-pill {
          background: rgba(255, 255, 255, 0.08);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
          color: #FFD60A;
        }

        .dep-list {
          font-family: 'JetBrains Mono', monospace;
          color: rgba(235, 235, 245, 0.7);
        }
      `}</style>
    </div>
  )
}
