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
  Server,
  Activity,
  Globe,
  Radio,
  FileCode,
  Search,
  RefreshCw,
  Box,
  Terminal,
} from 'lucide-react'
import {
  dockerService,
  DockerContainer,
  DockerImage,
  DockerVolume,
  K8sPod,
  K8sDeployment,
  K8sService,
  K8sNode,
  K8sIngress,
} from '../../services/dockerService'
import './DockerStudioView.css'

export const DockerStudioView: React.FC = () => {
  // Main Studio Mode: Docker or Kubernetes
  const [engineMode, setEngineMode] = useState<'docker' | 'kubernetes'>('kubernetes')

  // Docker Tabs
  const [dockerTab, setDockerTab] = useState<'containers' | 'images' | 'volumes' | 'compose'>('containers')
  const [containers, setContainers] = useState<DockerContainer[]>(() => dockerService.getContainers())
  const [images, setImages] = useState<DockerImage[]>(() => dockerService.getImages())
  const [volumes] = useState<DockerVolume[]>(() => dockerService.getVolumes())
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(containers[0]?.id || null)

  // Kubernetes Tabs
  const [k8sTab, setK8sTab] = useState<'deployments' | 'pods' | 'services' | 'nodes' | 'logs' | 'manifests'>('deployments')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all-namespaces')
  const [k8sSearch, setK8sSearch] = useState('')
  const [pods, setPods] = useState<K8sPod[]>(() => dockerService.getPods())
  const [deployments, setDeployments] = useState<K8sDeployment[]>(() => dockerService.getDeployments())
  const [services] = useState<K8sService[]>(() => dockerService.getServices())
  const [ingresses] = useState<K8sIngress[]>(() => dockerService.getIngresses())
  const [nodes] = useState<K8sNode[]>(() => dockerService.getNodes())
  const [selectedPodId, setSelectedPodId] = useState<string | null>(pods[0]?.id || null)
  const [copied, setCopied] = useState(false)
  const [logFilter, setLogFilter] = useState('')

  // Manifest Generator State
  const [manifestAppName, setManifestAppName] = useState('indoctrinated-gateway')
  const [manifestImage, setManifestImage] = useState('indoctrinated/gateway:v4.2.0')
  const [manifestPort, setManifestPort] = useState(8080)
  const [manifestReplicas, setManifestReplicas] = useState(3)

  const clusterSummary = dockerService.getClusterSummary()
  const namespaces = dockerService.getNamespaces()

  // Docker Handlers
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

  // Kubernetes Handlers
  const handleScaleDeployment = (name: string, delta: number) => {
    const dep = deployments.find((d) => d.name === name)
    if (dep) {
      const next = Math.max(0, dep.desiredReplicas + delta)
      dockerService.scaleDeployment(name, next)
      setDeployments(dockerService.getDeployments(selectedNamespace))
      setPods(dockerService.getPods(selectedNamespace))
    }
  }

  const handleRestartPod = (id: string) => {
    dockerService.restartPod(id)
    setPods(dockerService.getPods(selectedNamespace))
  }

  const handleDeletePod = (id: string) => {
    dockerService.deletePod(id)
    setPods(dockerService.getPods(selectedNamespace))
    if (selectedPodId === id) {
      setSelectedPodId(null)
    }
  }

  const handleNamespaceChange = (ns: string) => {
    setSelectedNamespace(ns)
    setPods(dockerService.getPods(ns))
    setDeployments(dockerService.getDeployments(ns))
  }

  const selectedContainer = containers.find((c) => c.id === selectedContainerId) || containers[0]
  const selectedPod = pods.find((p) => p.id === selectedPodId) || pods[0]

  const filteredPods = pods.filter((p) => {
    const matchesNs = selectedNamespace === 'all-namespaces' || p.namespace === selectedNamespace
    const matchesSearch = p.name.toLowerCase().includes(k8sSearch.toLowerCase()) || p.node.toLowerCase().includes(k8sSearch.toLowerCase())
    return matchesNs && matchesSearch
  })

  const filteredDeployments = deployments.filter((d) => {
    const matchesNs = selectedNamespace === 'all-namespaces' || d.namespace === selectedNamespace
    const matchesSearch = d.name.toLowerCase().includes(k8sSearch.toLowerCase()) || d.image.toLowerCase().includes(k8sSearch.toLowerCase())
    return matchesNs && matchesSearch
  })

  const filteredServices = services.filter((s) => {
    const matchesNs = selectedNamespace === 'all-namespaces' || s.namespace === selectedNamespace
    const matchesSearch = s.name.toLowerCase().includes(k8sSearch.toLowerCase())
    return matchesNs && matchesSearch
  })

  return (
    <div className="docker-studio-root">
      {/* TOP ENGINE SELECTOR */}
      <div className="engine-mode-header">
        <button
          className={`engine-mode-btn ${engineMode === 'kubernetes' ? 'active' : ''}`}
          onClick={() => setEngineMode('kubernetes')}
        >
          <Radio size={14} className="engine-icon" />
          <span>Kubernetes (K8s)</span>
          <span className="cluster-badge-healthy">{clusterSummary.status}</span>
        </button>
        <button
          className={`engine-mode-btn ${engineMode === 'docker' ? 'active' : ''}`}
          onClick={() => setEngineMode('docker')}
        >
          <Container size={14} className="engine-icon" />
          <span>Docker Engine</span>
          <span className="counter-pill">{containers.filter((c) => c.status === 'running').length}/{containers.length}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* KUBERNETES CLUSTER VISUALIZER VIEW */}
      {/* ========================================================================= */}
      {engineMode === 'kubernetes' && (
        <div className="k8s-view-container">
          {/* Cluster Health & Metrics Card */}
          <div className="cluster-metrics-banner glass-panel">
            <div className="metric-cell">
              <span className="metric-label">CLUSTER</span>
              <span className="metric-val primary">{clusterSummary.clusterName}</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">NODES</span>
              <span className="metric-val">{clusterSummary.totalNodes} Ready</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">PODS</span>
              <span className="metric-val">{clusterSummary.runningPods}/{clusterSummary.totalPods} Running</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">CPU LOAD</span>
              <span className="metric-val">{clusterSummary.cpuUsagePercent}%</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">MEMORY</span>
              <span className="metric-val">{clusterSummary.memUsagePercent}%</span>
            </div>
          </div>

          {/* Kubernetes Subnav & Namespace Bar */}
          <div className="k8s-controls-row">
            <div className="k8s-subnav-strip">
              <button
                className={`k8s-nav-btn ${k8sTab === 'deployments' ? 'active' : ''}`}
                onClick={() => setK8sTab('deployments')}
              >
                <Layers size={12} />
                <span>Deployments ({filteredDeployments.length})</span>
              </button>

              <button
                className={`k8s-nav-btn ${k8sTab === 'pods' ? 'active' : ''}`}
                onClick={() => setK8sTab('pods')}
              >
                <Box size={12} />
                <span>Pods ({filteredPods.length})</span>
              </button>

              <button
                className={`k8s-nav-btn ${k8sTab === 'services' ? 'active' : ''}`}
                onClick={() => setK8sTab('services')}
              >
                <Globe size={12} />
                <span>Services & Ingress</span>
              </button>

              <button
                className={`k8s-nav-btn ${k8sTab === 'nodes' ? 'active' : ''}`}
                onClick={() => setK8sTab('nodes')}
              >
                <Server size={12} />
                <span>Nodes ({nodes.length})</span>
              </button>

              <button
                className={`k8s-nav-btn ${k8sTab === 'logs' ? 'active' : ''}`}
                onClick={() => setK8sTab('logs')}
              >
                <Terminal size={12} />
                <span>Pod Logs</span>
              </button>

              <button
                className={`k8s-nav-btn ${k8sTab === 'manifests' ? 'active' : ''}`}
                onClick={() => setK8sTab('manifests')}
              >
                <FileCode size={12} />
                <span>YAML Lab</span>
              </button>
            </div>

            <div className="ns-filter-row">
              <div className="search-wrap">
                <Search size={11} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter resource or node..."
                  value={k8sSearch}
                  onChange={(e) => setK8sSearch(e.target.value)}
                  className="k8s-search-input"
                />
              </div>

              <select
                className="ns-select glass-interactive"
                value={selectedNamespace}
                onChange={(e) => handleNamespaceChange(e.target.value)}
              >
                <option value="all-namespaces">All Namespaces</option>
                {namespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    ns: {ns}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* K8S MAIN BODY VIEWPORT */}
          <div className="k8s-body-viewport">
            {/* 1. DEPLOYMENTS VIEW */}
            {k8sTab === 'deployments' && (
              <div className="k8s-section">
                <div className="deployments-grid">
                  {filteredDeployments.map((dep) => (
                    <div key={dep.id} className="deployment-card glass-panel">
                      <div className="dep-header">
                        <div className="dep-title-wrap">
                          <span className="dep-name">{dep.name}</span>
                          <span className="dep-ns-badge">{dep.namespace}</span>
                        </div>
                        <div className="scale-controls">
                          <button
                            className="scale-btn minus"
                            onClick={() => handleScaleDeployment(dep.name, -1)}
                            title="Scale Down (-1)"
                            disabled={dep.desiredReplicas <= 0}
                          >
                            -
                          </button>
                          <span className="replica-pill">
                            {dep.availableReplicas}/{dep.desiredReplicas}
                          </span>
                          <button
                            className="scale-btn plus"
                            onClick={() => handleScaleDeployment(dep.name, 1)}
                            title="Scale Up (+1)"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="dep-meta">
                        <span className="dep-image">{dep.image}</span>
                        <span className="dep-strategy">Strategy: {dep.strategy}</span>
                      </div>

                      <div className="dep-progress-bar-wrap">
                        <div
                          className="dep-progress-fill"
                          style={{
                            width: `${dep.desiredReplicas > 0 ? (dep.availableReplicas / dep.desiredReplicas) * 100 : 0}%`,
                            background: dep.availableReplicas === dep.desiredReplicas ? '#30D158' : '#FF9F0A',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. PODS TOPOLOGY VIEW */}
            {k8sTab === 'pods' && (
              <div className="k8s-section pods-layout">
                <div className="pods-grid">
                  {filteredPods.map((pod) => {
                    const isSelected = pod.id === selectedPodId
                    const isCrash = pod.status === 'CrashLoopBackOff' || pod.status === 'Failed'
                    return (
                      <div
                        key={pod.id}
                        className={`pod-card glass-panel ${isSelected ? 'selected' : ''} ${isCrash ? 'crash' : ''}`}
                        onClick={() => setSelectedPodId(pod.id)}
                      >
                        <div className="pod-header">
                          <div className="pod-title-wrap">
                            <span className={`pod-status-dot ${pod.status.toLowerCase()}`} />
                            <span className="pod-name">{pod.name}</span>
                          </div>
                          <span className={`pod-phase-badge ${pod.status.toLowerCase()}`}>{pod.status}</span>
                        </div>

                        <div className="pod-metrics-row">
                          <span>Node: {pod.node}</span>
                          <span>IP: {pod.ip}</span>
                        </div>

                        <div className="pod-telemetry-row">
                          <div className="telemetry-item">
                            <Cpu size={10} />
                            <span>{pod.cpuPercent}% CPU</span>
                          </div>
                          <div className="telemetry-item">
                            <Activity size={10} />
                            <span>{pod.memoryUsageMb} / {pod.memoryLimitMb} MB</span>
                          </div>
                          <div className="telemetry-item">
                            <span>Restarts: {pod.restarts}</span>
                          </div>
                        </div>

                        <div className="pod-actions-row">
                          <button
                            className="pod-action-btn restart"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestartPod(pod.id)
                            }}
                            title="Restart Pod"
                          >
                            <RefreshCw size={10} /> Restart
                          </button>
                          <button
                            className="pod-action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePod(pod.id)
                            }}
                            title="Terminate Pod"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Inline Selected Pod Log Peek */}
                {selectedPod && (
                  <div className="pod-log-peek glass-panel">
                    <div className="log-peek-header">
                      <span>POD CONSOLE: {selectedPod.name}</span>
                      <button
                        className="open-full-logs-btn"
                        onClick={() => setK8sTab('logs')}
                      >
                        Open Full Log Stream &rarr;
                      </button>
                    </div>
                    <div className="log-stream-preview">
                      {selectedPod.logs.map((line, idx) => (
                        <div key={idx} className="log-line">{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. SERVICES & INGRESS MAP */}
            {k8sTab === 'services' && (
              <div className="k8s-section">
                <span className="section-title">KUBERNETES SERVICES</span>
                <div className="services-grid">
                  {filteredServices.map((svc) => (
                    <div key={svc.id} className="svc-card glass-panel">
                      <div className="svc-header">
                        <span className="svc-name">{svc.name}</span>
                        <span className="svc-type-badge">{svc.type}</span>
                      </div>
                      <div className="svc-details">
                        <div><strong>Namespace:</strong> {svc.namespace}</div>
                        <div><strong>Cluster IP:</strong> {svc.clusterIp}</div>
                        {svc.externalIp && <div><strong>External IP:</strong> {svc.externalIp}</div>}
                        <div><strong>Ports:</strong> {svc.ports.join(', ')}</div>
                        <div><strong>Selector:</strong> {svc.selector}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <span className="section-title" style={{ marginTop: 16 }}>INGRESS ROUTING MAP</span>
                <div className="ingress-grid">
                  {ingresses.map((ing) => (
                    <div key={ing.id} className="ingress-card glass-panel">
                      <div className="ingress-header">
                        <Globe size={13} color="#0A84FF" />
                        <span className="ingress-host">{ing.host}</span>
                        {ing.tls && <span className="tls-badge">TLS (SSL)</span>}
                      </div>
                      <div className="ingress-route">
                        <span>Path: <code>{ing.path}</code></span>
                        <span>&rarr; Forward to Service: <strong>{ing.targetService}:{ing.targetPort}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CLUSTER NODES */}
            {k8sTab === 'nodes' && (
              <div className="k8s-section nodes-layout">
                <div className="nodes-grid">
                  {nodes.map((node) => (
                    <div key={node.name} className="node-card glass-panel">
                      <div className="node-header">
                        <div className="node-title-wrap">
                          <Server size={14} color="#30D158" />
                          <span className="node-name">{node.name}</span>
                        </div>
                        <span className="node-status-badge ready">{node.status}</span>
                      </div>

                      <div className="node-meta-grid">
                        <div><strong>Roles:</strong> {node.roles.join(', ')}</div>
                        <div><strong>K8s Version:</strong> {node.version}</div>
                        <div><strong>OS:</strong> {node.osImage}</div>
                        <div><strong>Pods:</strong> {node.podCount} / {node.podCapacity}</div>
                      </div>

                      <div className="node-gauge-row">
                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>CPU ({node.cpuCapacityCores} cores)</span>
                            <span>{node.cpuAllocatedPercent}%</span>
                          </div>
                          <div className="gauge-track">
                            <div className="gauge-fill" style={{ width: `${node.cpuAllocatedPercent}%`, background: '#0A84FF' }} />
                          </div>
                        </div>

                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>Memory ({node.memoryCapacityGb} GB)</span>
                            <span>{node.memAllocatedPercent}%</span>
                          </div>
                          <div className="gauge-track">
                            <div className="gauge-fill" style={{ width: `${node.memAllocatedPercent}%`, background: '#BF5AF2' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. LIVE POD LOG STREAM */}
            {k8sTab === 'logs' && (
              <div className="k8s-section logs-full-view">
                <div className="log-toolbar glass-panel">
                  <div className="log-pod-picker">
                    <span className="picker-label">Target Pod:</span>
                    <select
                      className="pod-picker-select"
                      value={selectedPodId || ''}
                      onChange={(e) => setSelectedPodId(e.target.value)}
                    >
                      {pods.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.namespace}] {p.name} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Search logs regex/keyword..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="log-filter-input"
                  />

                  <button
                    className="log-action-btn"
                    onClick={() => {
                      if (selectedPod) {
                        navigator.clipboard.writeText(selectedPod.logs.join('\n'))
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }
                    }}
                  >
                    {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Logs
                  </button>
                </div>

                <div className="live-log-terminal glass-panel">
                  {selectedPod ? (
                    selectedPod.logs
                      .filter((l) => !logFilter || l.toLowerCase().includes(logFilter.toLowerCase()))
                      .map((log, i) => (
                        <div key={i} className="terminal-log-line">
                          <span className="log-index">{(i + 1).toString().padStart(3, '0')}</span>
                          <span className="log-text">{log}</span>
                        </div>
                      ))
                  ) : (
                    <div className="empty-logs">Select a pod to view its container logs.</div>
                  )}
                </div>
              </div>
            )}

            {/* 6. MANIFEST & YAML GENERATOR LAB */}
            {k8sTab === 'manifests' && (
              <div className="k8s-section manifest-lab">
                <div className="manifest-inputs-bar glass-panel">
                  <div className="input-group">
                    <label>App Name</label>
                    <input
                      type="text"
                      value={manifestAppName}
                      onChange={(e) => setManifestAppName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Container Image</label>
                    <input
                      type="text"
                      value={manifestImage}
                      onChange={(e) => setManifestImage(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={manifestPort}
                      onChange={(e) => setManifestPort(+e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Replicas</label>
                    <input
                      type="number"
                      value={manifestReplicas}
                      onChange={(e) => setManifestReplicas(+e.target.value)}
                    />
                  </div>
                  <button
                    className="copy-yaml-btn glass-interactive"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        dockerService.generateKubernetesManifest(manifestAppName, manifestImage, manifestPort, manifestReplicas)
                      )
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1800)
                    }}
                  >
                    {copied ? <Check size={12} color="#30D158" /> : <Copy size={12} />} Copy K8s YAML
                  </button>
                </div>

                <pre className="yaml-preview-box">
                  {dockerService.generateKubernetesManifest(manifestAppName, manifestImage, manifestPort, manifestReplicas)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCKER ENGINE VIEW */}
      {/* ========================================================================= */}
      {engineMode === 'docker' && (
        <div className="docker-view-container">
          {/* Sub-Nav */}
          <div
            className="docker-subnav-strip"
            onWheel={(e) => {
              e.currentTarget.scrollLeft += e.deltaY
            }}
          >
            <button
              className={`docker-nav-btn glass-interactive ${dockerTab === 'containers' ? 'active' : ''}`}
              onClick={() => setDockerTab('containers')}
            >
              <Container size={12} />
              <span>Containers ({containers.filter((c) => c.status === 'running').length}/{containers.length})</span>
            </button>

            <button
              className={`docker-nav-btn glass-interactive ${dockerTab === 'images' ? 'active' : ''}`}
              onClick={() => setDockerTab('images')}
            >
              <Layers size={12} />
              <span>Images ({images.length})</span>
            </button>

            <button
              className={`docker-nav-btn glass-interactive ${dockerTab === 'volumes' ? 'active' : ''}`}
              onClick={() => setDockerTab('volumes')}
            >
              <HardDrive size={12} />
              <span>Volumes ({volumes.length})</span>
            </button>

            <button
              className={`docker-nav-btn glass-interactive ${dockerTab === 'compose' ? 'active' : ''}`}
              onClick={() => setDockerTab('compose')}
            >
              <Plus size={12} />
              <span>Compose Template</span>
            </button>
          </div>

          {/* Main Viewport */}
          <div className="docker-body-viewport">
            {/* TAB 1: CONTAINERS */}
            {dockerTab === 'containers' && (
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
            {dockerTab === 'images' && (
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
            {dockerTab === 'volumes' && (
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
            {dockerTab === 'compose' && (
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

                <pre className="compose-pre">
                  {dockerService.generateComposeTemplate()}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STYLING */}
    </div>
  )
}
