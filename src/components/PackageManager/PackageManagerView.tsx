import React, { useState, useEffect } from 'react'
import {
  Package,
  ShieldAlert,
  ArrowUpCircle,
  CheckCircle,
  Search,
  Scale,
} from 'lucide-react'
import { packageManagerService, ManifestScanResult } from '../../services/packageManagerService'

interface PackageManagerViewProps {
  activeFileName?: string
  activeFileContent?: string
}

export const PackageManagerView: React.FC<PackageManagerViewProps> = ({
  activeFileName = 'package.json',
  activeFileContent = '',
}) => {
  const [scanResult, setScanResult] = useState<ManifestScanResult | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [onlyOutdated, setOnlyOutdated] = useState(false)
  const [onlyVulnerable, setOnlyVulnerable] = useState(false)

  useEffect(() => {
    const res = packageManagerService.parseManifest(activeFileName, activeFileContent)
    setScanResult(res)
  }, [activeFileName, activeFileContent])

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

        <div className="filter-toggles">
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
        </div>
      </div>

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
                      <span className="ver-up-to-date"><CheckCircle size={10} /> Up to date</span>
                    )}
                  </div>
                </div>

                <div className="dep-meta-row">
                  <div className="meta-left">
                    <span className="meta-item"><Scale size={10} /> {dep.license}</span>
                    {dep.approxSizeKb && <span className="meta-item">{dep.approxSizeKb} KB</span>}
                  </div>
                  {dep.vulnerabilitiesCount && dep.vulnerabilitiesCount > 0 ? (
                    <span className={`vuln-badge ${dep.highestSeverity}`}>
                      <ShieldAlert size={10} /> {dep.vulnerabilitiesCount} Advisory ({dep.highestSeverity?.toUpperCase()})
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .package-manager-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .pkg-search-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
        }

        .search-icon { color: var(--text-muted); }

        .pkg-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 11.5px;
        }

        .filter-toggles {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .filter-chip.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #64D2FF;
        }

        .filter-chip.active.vuln {
          background: rgba(255, 69, 58, 0.25);
          border-color: rgba(255, 69, 58, 0.45);
          color: #FF453A;
        }

        .pkg-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
        }

        .dependencies-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dep-card {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dep-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dep-name-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dep-name {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFF;
        }

        .dep-eco-badge {
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(10, 132, 255, 0.15);
          color: #64D2FF;
        }

        .dep-version-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .ver-curr { color: var(--text-muted); }

        .ver-latest-pill {
          color: #FFD60A;
          font-weight: 700;
          background: rgba(255, 214, 10, 0.15);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .ver-up-to-date {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #30D158;
          font-size: 10px;
        }

        .dep-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-muted);
        }

        .meta-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .vuln-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 3px;
        }

        .vuln-badge.high { background: rgba(255, 69, 58, 0.2); color: #FF453A; }
        .vuln-badge.moderate { background: rgba(255, 214, 10, 0.2); color: #FFD60A; }

        .empty-pkg-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 180px;
          gap: 10px;
          color: var(--text-muted);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
