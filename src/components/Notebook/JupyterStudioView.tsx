import React, { useState, useEffect } from 'react'
import {
  FileCode2,
  RotateCw,
  Plus,
  Table,
  Package,
  Cpu,
  Sparkles,
  Layers,
  Terminal,
  Activity,
  Check,
  Copy,
  BookOpen,
  Search,
  HardDrive,
  Zap,
} from 'lucide-react'
import {
  jupyterKernelService,
  JupyterKernelInfo,
  JupyterVariable,
} from '../../services/jupyterKernelService'

interface JupyterStudioViewProps {
  onCreateNotebook?: (title: string, templateType?: string) => void
}

export const JupyterStudioView: React.FC<JupyterStudioViewProps> = ({ onCreateNotebook }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'kernels' | 'variables' | 'packages'>('templates')
  const [kernels, setKernels] = useState<JupyterKernelInfo[]>(() => jupyterKernelService.getAvailableKernels())
  const [activeKernelId, setActiveKernelId] = useState<string>(() => jupyterKernelService.getActiveKernel().id)
  const [variables, setVariables] = useState<JupyterVariable[]>(() => jupyterKernelService.getVariables())
  const [variableQuery, setVariableQuery] = useState<string>('')
  const [copiedPkg, setCopiedPkg] = useState<string | null>(null)
  const [isRestarting, setIsRestarting] = useState<boolean>(false)

  useEffect(() => {
    const unsub = jupyterKernelService.subscribe(() => {
      setKernels(jupyterKernelService.getAvailableKernels())
      setActiveKernelId(jupyterKernelService.getActiveKernel().id)
      setVariables(jupyterKernelService.getVariables())
    })
    return unsub
  }, [])

  const handleSelectKernel = (id: string) => {
    jupyterKernelService.setActiveKernel(id)
    setActiveKernelId(id)
  }

  const handleRestartKernel = () => {
    setIsRestarting(true)
    jupyterKernelService.restartKernel()
    setTimeout(() => setIsRestarting(false), 800)
  }

  const packages = [
    { name: 'numpy', version: '1.26.4', desc: 'High-performance multidimensional arrays & math' },
    { name: 'pandas', version: '2.2.2', desc: 'DataFrame data manipulation & tabular analysis' },
    { name: 'matplotlib', version: '3.9.0', desc: 'Publication quality plotting & data charts' },
    { name: 'scikit-learn', version: '1.5.0', desc: 'Machine learning algorithms & predictive models' },
    { name: 'torch', version: '2.3.1+cu121', desc: 'Deep learning tensors & neural network graphs' },
    { name: 'scipy', version: '1.13.1', desc: 'Scientific computing, optimization & signal stats' },
    { name: 'seaborn', version: '0.13.2', desc: 'Statistical data visualization built on Matplotlib' },
    { name: 'polars', version: '1.2.1', desc: 'Blazing fast multi-threaded Rust DataFrame engine' },
  ]

  const estimatedRam = jupyterKernelService.getEstimatedMemoryUsage()
  const activeKernel = kernels.find((k) => k.id === activeKernelId) || kernels[0]

  const filteredVariables = variables.filter(
    (v) =>
      v.name.toLowerCase().includes(variableQuery.toLowerCase()) ||
      v.type.toLowerCase().includes(variableQuery.toLowerCase())
  )

  return (
    <div className="jupyter-studio-root">
      {/* Top Telemetry Glass Banner */}
      <div className="jupyter-telemetry-banner glass-panel">
        <div className="telemetry-item">
          <Cpu size={12} color="#0A84FF" />
          <div className="telemetry-info">
            <span className="tel-label">Active Engine</span>
            <span className="tel-val">{activeKernel.displayName.split('(')[0]}</span>
          </div>
        </div>

        <div className="telemetry-item">
          <HardDrive size={12} color="#30D158" />
          <div className="telemetry-info">
            <span className="tel-label">RAM Allocated</span>
            <span className="tel-val">{estimatedRam.split('/')[0]}</span>
          </div>
        </div>

        <div className="telemetry-item">
          <Zap size={12} color="#FF9F0A" />
          <div className="telemetry-info">
            <span className="tel-label">Status</span>
            <span className="tel-val">{activeKernel.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Studio Header Subnav */}
      <div className="jupyter-subnav-strip">
        <button
          className={`jupyter-nav-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <BookOpen size={12} />
          <span>Templates</span>
        </button>

        <button
          className={`jupyter-nav-btn ${activeTab === 'kernels' ? 'active' : ''}`}
          onClick={() => setActiveTab('kernels')}
        >
          <Cpu size={12} />
          <span>Kernels ({kernels.length})</span>
        </button>

        <button
          className={`jupyter-nav-btn ${activeTab === 'variables' ? 'active' : ''}`}
          onClick={() => setActiveTab('variables')}
        >
          <Table size={12} />
          <span>Variables ({variables.length})</span>
        </button>

        <button
          className={`jupyter-nav-btn ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          <Package size={12} />
          <span>Packages</span>
        </button>
      </div>

      {/* Main Body Viewport */}
      <div className="jupyter-body-viewport custom-scrollbar">
        {/* TAB 1: TEMPLATES & NEW NOTEBOOKS */}
        {activeTab === 'templates' && (
          <div className="jupyter-section">
            <span className="section-label">CREATE JUPYTER NOTEBOOK</span>

            <div className="templates-grid">
              <div
                className="template-card glass-panel interactive"
                onClick={() => onCreateNotebook?.('Untitled.ipynb', 'blank')}
              >
                <div className="tpl-header">
                  <FileCode2 size={16} color="#30D158" />
                  <span className="tpl-title">Blank Python Notebook</span>
                </div>
                <p className="tpl-desc">Fresh clean notebook with standard Python 3.12 kernel.</p>
                <button className="tpl-action-btn glass-interactive">
                  <Plus size={11} /> Create Notebook
                </button>
              </div>

              <div
                className="template-card glass-panel interactive"
                onClick={() => onCreateNotebook?.('EDA_DataAnalysis.ipynb', 'eda')}
              >
                <div className="tpl-header">
                  <Sparkles size={16} color="#0A84FF" />
                  <span className="tpl-title">Data Science & EDA Pipeline</span>
                </div>
                <p className="tpl-desc">Preloaded with Pandas, NumPy, Matplotlib, and Iris dataset exploration.</p>
                <button className="tpl-action-btn glass-interactive">
                  <Plus size={11} /> Create Notebook
                </button>
              </div>

              <div
                className="template-card glass-panel interactive"
                onClick={() => onCreateNotebook?.('ML_ModelTraining.ipynb', 'ml')}
              >
                <div className="tpl-header">
                  <Layers size={16} color="#BF5AF2" />
                  <span className="tpl-title">Scikit-Learn ML Classifier</span>
                </div>
                <p className="tpl-desc">Cross-validation, train-test splitting, and evaluation metrics.</p>
                <button className="tpl-action-btn glass-interactive">
                  <Plus size={11} /> Create Notebook
                </button>
              </div>

              <div
                className="template-card glass-panel interactive"
                onClick={() => onCreateNotebook?.('Node_Scratchpad.ipynb', 'node')}
              >
                <div className="tpl-header">
                  <Terminal size={16} color="#FFD60A" />
                  <span className="tpl-title">JavaScript / Node.js Notebook</span>
                </div>
                <p className="tpl-desc">V8 engine execution with npm package evaluation.</p>
                <button className="tpl-action-btn glass-interactive">
                  <Plus size={11} /> Create Notebook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KERNEL ENVIRONMENTS */}
        {activeTab === 'kernels' && (
          <div className="jupyter-section">
            <div className="section-toolbar">
              <span className="section-label">ACTIVE COMPUTATION KERNELS</span>
              <button className="section-action-btn glass-interactive" onClick={handleRestartKernel}>
                <RotateCw size={11} className={isRestarting ? 'spin' : ''} />
                <span>Restart Active Kernel</span>
              </button>
            </div>

            <div className="kernels-list">
              {kernels.map((k) => {
                const isActive = k.id === activeKernelId
                return (
                  <div
                    key={k.id}
                    className={`kernel-card glass-panel ${isActive ? 'selected' : ''}`}
                    onClick={() => handleSelectKernel(k.id)}
                  >
                    <div className="kernel-header">
                      <div className="k-title-wrap">
                        <span className={`k-status-dot ${k.status}`} />
                        <span className="k-name">{k.displayName}</span>
                      </div>
                      <span className={`k-active-badge ${isActive ? 'current' : ''}`}>
                        {isActive ? 'Active Kernel' : 'Select'}
                      </span>
                    </div>

                    <div className="kernel-meta">
                      <span>Language: <strong>{k.language}</strong></span>
                      <span>Version: <strong>{k.version}</strong></span>
                    </div>

                    <div className="kernel-stats-row">
                      <div className="stat-pill">
                        <Cpu size={10} />
                        <span>Status: {k.status.toUpperCase()}</span>
                      </div>
                      <div className="stat-pill">
                        <Activity size={10} />
                        <span>0 Active Tasks</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: VARIABLE EXPLORER */}
        {activeTab === 'variables' && (
          <div className="jupyter-section">
            <div className="section-toolbar">
              <span className="section-label">LIVE IN-MEMORY VARIABLES</span>
              <div className="var-search-box">
                <Search size={11} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Filter variables..."
                  value={variableQuery}
                  onChange={(e) => setVariableQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="variables-table-box glass-panel">
              <table className="variables-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariables.map((v) => (
                    <tr key={v.name}>
                      <td className="v-name"><code>{v.name}</code></td>
                      <td className="v-type">{v.type}</td>
                      <td className="v-size">{v.size}</td>
                      <td className="v-val" title={v.value}>{v.value}</td>
                    </tr>
                  ))}
                  {filteredVariables.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-row">
                        No variables match &quot;{variableQuery}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DATA SCIENCE PACKAGES */}
        {activeTab === 'packages' && (
          <div className="jupyter-section">
            <span className="section-label">DATA SCIENCE ECOSYSTEM INVENTORY</span>
            <div className="packages-list">
              {packages.map((pkg) => (
                <div key={pkg.name} className="pkg-card glass-panel">
                  <div className="pkg-header">
                    <div className="pkg-title-wrap">
                      <span className="pkg-name">{pkg.name}</span>
                      <span className="pkg-ver">v{pkg.version}</span>
                    </div>
                    <button
                      className="pkg-copy-btn glass-interactive"
                      onClick={() => {
                        navigator.clipboard.writeText(`import ${pkg.name}`)
                        setCopiedPkg(pkg.name)
                        setTimeout(() => setCopiedPkg(null), 1500)
                      }}
                      title="Copy import statement"
                    >
                      {copiedPkg === pkg.name ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <p className="pkg-desc">{pkg.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STYLING */}
      <style>{`
        .jupyter-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0E121B);
          color: var(--text-normal, #E2E8F0);
          font-size: 12px;
          user-select: none;
        }

        .jupyter-telemetry-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 8px 10px;
          background: rgba(18, 24, 38, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .telemetry-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 4px 6px;
          border-radius: 4px;
        }

        .telemetry-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .tel-label {
          font-size: 8.5px;
          color: #64748B;
          text-transform: uppercase;
        }

        .tel-val {
          font-size: 10px;
          font-weight: 600;
          color: #FFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .jupyter-subnav-strip {
          display: flex;
          gap: 4px;
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .jupyter-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          color: var(--text-muted, #94A3B8);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .jupyter-nav-btn.active {
          background: rgba(10, 132, 255, 0.18);
          border-color: rgba(10, 132, 255, 0.35);
          color: #FFF;
        }

        .jupyter-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .jupyter-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-label {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: var(--text-muted, #94A3B8);
        }

        .section-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .var-search-box {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 7px;
          border-radius: 4px;
        }

        .var-search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 10.5px;
          width: 100px;
        }

        .section-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted, #94A3B8);
          padding: 3px 7px;
          border-radius: 3px;
          font-size: 10.5px;
          cursor: pointer;
        }

        .section-action-btn:hover {
          background: rgba(255, 255, 255, 0.09);
          color: #FFF;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .template-card {
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .template-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(10, 132, 255, 0.4);
          transform: translateY(-1px);
        }

        .tpl-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tpl-title {
          font-weight: 600;
          color: #FFF;
          font-size: 11.5px;
        }

        .tpl-desc {
          margin: 0;
          font-size: 10.5px;
          color: var(--text-muted, #94A3B8);
          line-height: 1.4;
        }

        .tpl-action-btn {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 4px;
          color: #64D2FF;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
        }

        .kernels-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kernel-card {
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .kernel-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .kernel-card.selected {
          border-color: rgba(48, 209, 88, 0.4);
          background: rgba(48, 209, 88, 0.05);
        }

        .kernel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .k-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .k-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .k-status-dot.idle { background: #30D158; }
        .k-status-dot.busy { background: #FF9F0A; }
        .k-status-dot.restarting { background: #BF5AF2; }

        .k-name {
          font-weight: 600;
          color: #FFF;
          font-size: 11px;
        }

        .k-active-badge {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.06);
          color: #94A3B8;
        }

        .k-active-badge.current {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          font-weight: 600;
        }

        .kernel-meta {
          display: flex;
          gap: 12px;
          font-size: 10px;
          color: #94A3B8;
        }

        .kernel-meta strong {
          color: #E2E8F0;
        }

        .kernel-stats-row {
          display: flex;
          gap: 8px;
          margin-top: 2px;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          color: #64748B;
        }

        .variables-table-box {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          overflow: hidden;
        }

        .variables-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .variables-table th, .variables-table td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .variables-table th {
          background: rgba(255, 255, 255, 0.04);
          color: #64D2FF;
          font-weight: 600;
          font-size: 10px;
        }

        .v-name code { color: #30D158; }
        .v-type { color: #BF5AF2; }
        .v-size { color: #94A3B8; }
        .v-val {
          color: #CBD5E1;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-row {
          text-align: center;
          color: #64748B;
          font-style: italic;
          padding: 14px 8px;
        }

        .packages-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .pkg-card {
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pkg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pkg-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pkg-name {
          font-weight: 600;
          color: #64D2FF;
          font-family: var(--font-mono, monospace);
        }

        .pkg-ver {
          font-size: 9.5px;
          color: #64748B;
        }

        .pkg-copy-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .pkg-copy-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .pkg-desc {
          margin: 0;
          font-size: 10.5px;
          color: #94A3B8;
          line-height: 1.4;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
