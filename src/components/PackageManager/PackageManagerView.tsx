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
import './PackageManagerView.css'

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

    </div>
  )
}
