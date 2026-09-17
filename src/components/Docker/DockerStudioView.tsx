import React, { useState } from 'react'
import {
  Container,
  Play,
  Square,
  RotateCw,
  Trash2,
  Cpu,
  Layers,
  HardDrive,
  Copy,
  Check,
  Plus,
} from 'lucide-react'
import { dockerService, DockerContainer, DockerImage, DockerVolume } from '../../services/dockerService'

export const DockerStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'containers' | 'images' | 'volumes' | 'compose'>('containers')
  const [containers, setContainers] = useState<DockerContainer[]>(() => dockerService.getContainers())
  const [images, setImages] = useState<DockerImage[]>(() => dockerService.getImages())
  const [volumes] = useState<DockerVolume[]>(() => dockerService.getVolumes())
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(containers[0]?.id || null)
  const [copied, setCopied] = useState(false)

  const handleStart = (id: string) => {
    dockerService.startContainer(id)
    setContainers(dockerService.getContainers())
  }

  const handleStop = (id: string) => {
    dockerService.stopContainer(id)
    setContainers(dockerService.getContainers())
  }

  const handleRestart = (id: string) => {
    dockerService.restartContainer(id)
    setContainers(dockerService.getContainers())
  }

  const handlePruneImages = () => {
    dockerService.pruneDanglingImages()
    setImages(dockerService.getImages())
  }

  const selectedContainer = containers.find((c) => c.id === selectedContainerId) || containers[0]

  return (
    <div className="docker-studio-root">
      {/* Sub-Nav */}
      <div
        className="docker-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`docker-nav-btn glass-interactive ${activeTab === 'containers' ? 'active' : ''}`}
          onClick={() => setActiveTab('containers')}
        >
          <Container size={12} />
          <span>Containers ({containers.filter((c) => c.status === 'running').length}/{containers.length})</span>
        </button>

        <button
          className={`docker-nav-btn glass-interactive ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          <Layers size={12} />
          <span>Images ({images.length})</span>
        </button>

        <button
          className={`docker-nav-btn glass-interactive ${activeTab === 'volumes' ? 'active' : ''}`}
          onClick={() => setActiveTab('volumes')}
        >
          <HardDrive size={12} />
          <span>Volumes ({volumes.length})</span>
        </button>

        <button
          className={`docker-nav-btn glass-interactive ${activeTab === 'compose' ? 'active' : ''}`}
          onClick={() => setActiveTab('compose')}
        >
          <Plus size={12} />
          <span>Compose Template</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="docker-body-viewport">
        {/* TAB 1: CONTAINERS */}
        {activeTab === 'containers' && (
          <div className="docker-section containers-section">
            <div className="containers-list">
              {containers.map((c) => {
                const isSelected = c.id === selectedContainerId
                return (
                  <div
                    key={c.id}
                    className={`container-item-card glass-panel ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedContainerId(c.id)}
                  >
                    <div className="container-header-row">
                      <div className="c-title-wrapper">
                        <span className={`status-dot ${c.status}`} />
                        <span className="c-name">{c.name}</span>
                      </div>
                      <div className="c-controls">
                        {c.status === 'running' ? (
                          <button
                            className="ctrl-btn stop"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStop(c.id)
                            }}
                            title="Stop Container"
                          >
                            <Square size={11} />
                          </button>
                        ) : (
                          <button
                            className="ctrl-btn start"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStart(c.id)
                            }}
                            title="Start Container"
                          >
                            <Play size={11} />
                          </button>
                        )}
                        <button
                          className="ctrl-btn restart"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestart(c.id)
                          }}
                          title="Restart Container"
                        >
                          <RotateCw size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="container-meta-row">
                      <span className="c-image">{c.image}</span>
                      <span className="c-ports">{c.ports.join(', ') || 'no ports'}</span>
                    </div>

                    {c.status === 'running' && (
                      <div className="container-telemetry-row">
                        <div className="telemetry-bar">
                          <Cpu size={10} />
                          <span>{c.cpuPercent}% CPU</span>
                        </div>
                        <div className="telemetry-bar">
                          <span>{c.memoryUsageMb} MB / {c.memoryLimitMb} MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Container Log Inspector */}
            {selectedContainer && (
              <div className="container-logs-box glass-panel">
                <div className="logs-header">
                  <span>LOGS: {selectedContainer.name}</span>
                  <span className="logs-status-pill">{selectedContainer.status.toUpperCase()}</span>
                </div>
                <div className="logs-stream">
                  {selectedContainer.logs.map((log, idx) => (
                    <div key={idx} className="log-line">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IMAGES */}
        {activeTab === 'images' && (
          <div className="docker-section images-section">
            <div className="section-toolbar">
              <span className="section-label">LOCAL DOCKER IMAGES</span>
              <button className="section-action-btn glass-interactive" onClick={handlePruneImages}>
                <Trash2 size={11} /> Prune Dangling
              </button>
            </div>

            <div className="images-list">
              {images.map((img) => (
                <div key={img.id} className="image-card glass-panel">
                  <div className="img-title-row">
                    <span className="img-repo">{img.repository}:{img.tag}</span>
                    <span className="img-size">{img.sizeMb} MB</span>
                  </div>
                  <div className="img-meta-row">
                    <span className="img-id">{img.id}</span>
                    <span className={`img-inuse-badge ${img.inUse ? 'active' : 'dangling'}`}>
                      {img.inUse ? 'In Use' : 'Dangling'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VOLUMES */}
        {activeTab === 'volumes' && (
          <div className="docker-section volumes-section">
            <span className="section-label">PERSISTENT VOLUMES</span>
            <div className="volumes-list">
              {volumes.map((v) => (
                <div key={v.name} className="volume-card glass-panel">
                  <div className="vol-title-row">
                    <span className="vol-name">{v.name}</span>
                    <span className="vol-size">{v.sizeMb} MB</span>
                  </div>
                  <div className="vol-meta-row">
                    <span>Driver: {v.driver}</span>
                    <span>Attached to: {v.containers.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COMPOSE TEMPLATE */}
        {activeTab === 'compose' && (
          <div className="docker-section compose-section">
            <div className="section-toolbar">
              <span className="section-label">DOCKER COMPOSE GENERATOR</span>
              <button
                className="section-action-btn glass-interactive"
                onClick={() => {
                  navigator.clipboard.writeText(dockerService.generateComposeTemplate())
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                }}
              >
                {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Compose
              </button>
            </div>
            <pre className="compose-pre glass-panel">{dockerService.generateComposeTemplate()}</pre>
          </div>
        )}
      </div>

      <style>{`
        .docker-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .docker-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .docker-nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .docker-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
        }

        .docker-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
        }

        .docker-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .containers-list, .images-list, .volumes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .container-item-card, .image-card, .volume-card {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .container-item-card:hover, .image-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .container-item-card.selected {
          border-color: rgba(10, 132, 255, 0.5);
          box-shadow: 0 0 12px rgba(10, 132, 255, 0.25);
        }

        .container-header-row, .img-title-row, .vol-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .c-title-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.running { background: #30D158; box-shadow: 0 0 8px #30D158; }
        .status-dot.stopped { background: #FF453A; }
        .status-dot.restarting { background: #FFD60A; }

        .c-name, .img-repo, .vol-name {
          font-size: 12px;
          font-weight: 700;
          color: #FFF;
        }

        .c-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ctrl-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .ctrl-btn.start:hover { background: rgba(48, 209, 88, 0.3); }
        .ctrl-btn.stop:hover { background: rgba(255, 69, 58, 0.3); }
        .ctrl-btn.restart:hover { background: rgba(255, 214, 10, 0.3); }

        .container-meta-row, .img-meta-row, .vol-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .container-telemetry-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 10px;
          color: #64D2FF;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 4px;
        }

        .telemetry-bar {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .container-logs-box {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .logs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 700;
          color: #64D2FF;
          margin-bottom: 6px;
        }

        .logs-status-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 3px;
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
        }

        .logs-stream {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: #CBD5E1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .log-line {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .img-inuse-badge.active { color: #30D158; }
        .img-inuse-badge.dangling { color: #FF453A; }

        .compose-pre {
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: #E2E8F0;
          background: rgba(0, 0, 0, 0.4);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin: 0;
          overflow-x: auto;
        }
      `}</style>
    </div>
  )
}
