import React, { useState, useEffect, useCallback } from 'react'
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

interface DockerStudioViewProps {
  workspaceRoot?: string
}

export const DockerStudioView: React.FC<DockerStudioViewProps> = ({ workspaceRoot }) => {
  // Main Studio Mode: Docker or Kubernetes (defaults to Docker Engine)
  const [engineMode, setEngineMode] = useState<'docker' | 'kubernetes'>('docker')
  const [isSyncing, setIsSyncing] = useState(false)
  const [dockerLive, setDockerLive] = useState(false)
  const [k8sLive, setK8sLive] = useState(false)
  const [actionBanner, setActionBanner] = useState<string | null>(null)
  const [execCmd, setExecCmd] = useState('ls -la')
  const [execOutput, setExecOutput] = useState<string | null>(null)
  const [containerExecCmd, setContainerExecCmd] = useState('uname -a')
  const [containerExecOut, setContainerExecOut] = useState<string | null>(null)
  const [composeMode, setComposeMode] = useState<'containers' | 'template'>('containers')
  const [customComposeSvcName, setCustomComposeSvcName] = useState('')
  const [customComposeSvcImage, setCustomComposeSvcImage] = useState('')
  const [customComposeSvcPort, setCustomComposeSvcPort] = useState('')

  // Docker Tabs
  const [dockerTab, setDockerTab] = useState<'containers' | 'images' | 'volumes' | 'compose' | 'linter'>('containers')
  const [containers, setContainers] = useState<DockerContainer[]>(() => dockerService.getContainers())
  const [images, setImages] = useState<DockerImage[]>(() => dockerService.getImages())
  const [volumes, setVolumes] = useState<DockerVolume[]>(() => dockerService.getVolumes())
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(containers[0]?.id || null)
  const [dockerfileInput, setDockerfileInput] = useState('FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nUSER node\nCMD ["node", "dist/index.js"]')

  // Kubernetes Tabs
  const [k8sTab, setK8sTab] = useState<'deployments' | 'pods' | 'services' | 'nodes' | 'logs' | 'manifests'>('deployments')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all-namespaces')
  const [k8sSearch, setK8sSearch] = useState('')
  const [pods, setPods] = useState<K8sPod[]>(() => dockerService.getPods())
  const [deployments, setDeployments] = useState<K8sDeployment[]>(() => dockerService.getDeployments())
  const [services, setServices] = useState<K8sService[]>(() => dockerService.getServices())
  const [ingresses, setIngresses] = useState<K8sIngress[]>(() => dockerService.getIngresses())
  const [nodes, setNodes] = useState<K8sNode[]>(() => dockerService.getNodes())
  const [selectedPodId, setSelectedPodId] = useState<string | null>(pods[0]?.id || null)
  const [copied, setCopied] = useState(false)
  const [logFilter, setLogFilter] = useState('')

  // Manifest Generator State
  const [manifestKind, setManifestKind] = useState<'deployment' | 'ingress'>('deployment')
  const [manifestAppName, setManifestAppName] = useState('indoctrinated-gateway')
  const [manifestImage, setManifestImage] = useState('indoctrinated/gateway:v4.2.0')
  const [manifestHost, setManifestHost] = useState('api.example.com')
  const [manifestPort, setManifestPort] = useState(8080)
  const [manifestReplicas, setManifestReplicas] = useState(3)

  const syncAllLive = useCallback(async () => {
    setIsSyncing(true)
    setActionBanner(null)
    try {
      const [dRes, kRes] = await Promise.all([
        dockerService.refreshContainersFromDaemon(),
        dockerService.refreshKubernetesFromCluster(),
      ])
      setDockerLive(dRes.live)
      setK8sLive(kRes.live)
      setContainers(dockerService.getContainers())
      setImages(dockerService.getImages())
      setVolumes(dockerService.getVolumes())
      setPods(dockerService.getPods(selectedNamespace))
      setDeployments(dockerService.getDeployments(selectedNamespace))
      setServices(dockerService.getServices(selectedNamespace))
      setIngresses(dockerService.getIngresses(selectedNamespace))
      setNodes(dockerService.getNodes())
      if (dRes.live || kRes.live) {
        setActionBanner(`Synced live: Docker=${dRes.live ? 'Connected' : 'Sandbox'}, K8s=${kRes.live ? 'Connected' : 'Sandbox'}`)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [selectedNamespace])

  useEffect(() => {
    void syncAllLive()
  }, [])

  const clusterSummary = dockerService.getClusterSummary()
  const namespaces = dockerService.getNamespaces()

  // Docker Handlers (awaited against live daemon when connected)
  const handleStart = async (id: string) => {
    const res = await dockerService.containerActionAsync('start', id)
    if (!res.ok && res.error) setActionBanner(res.error)
    setContainers(dockerService.getContainers())
  }

  const handleStop = async (id: string) => {
    const res = await dockerService.containerActionAsync('stop', id)
    if (!res.ok && res.error) setActionBanner(res.error)
    setContainers(dockerService.getContainers())
  }

  const handleRestart = async (id: string) => {
    const res = await dockerService.containerActionAsync('restart', id)
    if (!res.ok && res.error) setActionBanner(res.error)
    setContainers(dockerService.getContainers())
  }

  const handleRemoveContainer = async (id: string) => {
    const res = await dockerService.containerActionAsync('rm', id)
    if (!res.ok && res.error) setActionBanner(res.error)
    const next = dockerService.getContainers()
    setContainers(next)
    if (selectedContainerId === id) {
      setSelectedContainerId(next[0]?.id || null)
      setContainerExecOut(null)
    }
  }

  const handlePruneImages = async () => {
    const res = await dockerService.pruneDanglingImagesAsync()
    setImages(dockerService.getImages())
    setActionBanner(res.output || `Pruned ${res.removed} dangling image(s).`)
  }

  // Kubernetes Handlers (awaited against live kubectl when connected)
  const handleScaleDeployment = async (name: string, delta: number) => {
    const dep = deployments.find((d) => d.name === name)
    if (dep) {
      const next = Math.max(0, dep.desiredReplicas + delta)
      const res = await dockerService.scaleDeploymentAsync(name, dep.namespace, next)
      if (!res.ok && res.error) setActionBanner(res.error)
      setDeployments(dockerService.getDeployments(selectedNamespace))
      setPods(dockerService.getPods(selectedNamespace))
    }
  }

  const handleRestartPod = async (id: string) => {
    if (k8sLive) {
      await handleDeletePod(id)
    } else {
      dockerService.restartPod(id)
      setPods(dockerService.getPods(selectedNamespace))
    }
  }

  const handleDeletePod = async (id: string) => {
    const res = await dockerService.deletePodAsync(id)
    if (!res.ok && res.error) setActionBanner(res.error)
    setPods(dockerService.getPods(selectedNamespace))
    if (selectedPodId === id) {
      setSelectedPodId(null)
    }
  }

  const handleNamespaceChange = (ns: string) => {
    setSelectedNamespace(ns)
    setPods(dockerService.getPods(ns))
    setDeployments(dockerService.getDeployments(ns))
    setServices(dockerService.getServices(ns))
    setIngresses(dockerService.getIngresses(ns))
  }

  const selectedContainer = containers.find((c) => c.id === selectedContainerId) || containers[0]
  const selectedPod = pods.find((p) => p.id === selectedPodId) || pods[0]

  useEffect(() => {
    setExecOutput(null)
  }, [selectedPodId])

  useEffect(() => {
    setContainerExecOut(null)
  }, [selectedContainerId])

  useEffect(() => {
    if (k8sLive && k8sTab === 'logs' && selectedPod?.id) {
      dockerService.fetchPodLogsAsync(selectedPod.id).then(() => {
        setPods(dockerService.getPods(selectedNamespace))
      })
    }
  }, [k8sLive, k8sTab, selectedPod?.id, selectedNamespace])

  useEffect(() => {
    if (dockerLive && engineMode === 'docker' && dockerTab === 'containers' && selectedContainer?.id) {
      dockerService.fetchContainerLogsAsync(selectedContainer.id).then(() => {
        setContainers(dockerService.getContainers())
      })
    }
  }, [dockerLive, engineMode, dockerTab, selectedContainer?.id])

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

  const filteredIngresses = ingresses.filter((ing) => {
    const matchesNs = selectedNamespace === 'all-namespaces' || ing.namespace === selectedNamespace
    const matchesSearch =
      !k8sSearch ||
      ing.host.toLowerCase().includes(k8sSearch.toLowerCase()) ||
      ing.targetService.toLowerCase().includes(k8sSearch.toLowerCase())
    return matchesNs && matchesSearch
  })

  const matchesLogFilter = (line: string): boolean => {
    if (!logFilter.trim()) return true
    try {
      return new RegExp(logFilter, 'i').test(line)
    } catch {
      return line.toLowerCase().includes(logFilter.toLowerCase())
    }
  }

  const generatedYaml =
    manifestKind === 'ingress'
      ? dockerService.generateKubernetesIngress(manifestAppName, manifestHost, manifestPort)
      : dockerService.generateKubernetesManifest(manifestAppName, manifestImage, manifestPort, manifestReplicas)

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
          <span className="cluster-badge-healthy">{k8sLive ? 'LIVE' : 'SANDBOX'} · {clusterSummary.status}</span>
        </button>
        <button
          className={`engine-mode-btn ${engineMode === 'docker' ? 'active' : ''}`}
          onClick={() => setEngineMode('docker')}
        >
          <Container size={14} className="engine-icon" />
          <span>Docker Engine</span>
          <span className="counter-pill">{dockerLive ? 'LIVE' : 'SANDBOX'} · {containers.filter((c) => c.status === 'running').length}/{containers.length}</span>
        </button>
        <button
          className="log-action-btn"
          onClick={() => void syncAllLive()}
          disabled={isSyncing}
          title="Sync live Docker daemon & kubectl cluster"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={12} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync Live'}
        </button>
      </div>
      {actionBanner && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: '#7DD3FC', background: 'rgba(10,132,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {actionBanner}
        </div>
      )}

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

                <span className="section-title" style={{ marginTop: 16 }}>INGRESS ROUTING MAP ({filteredIngresses.length})</span>
                <div className="ingress-grid">
                  {filteredIngresses.map((ing) => (
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
                      .filter(matchesLogFilter)
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

                {selectedPod && (
                  <div className="log-controls-bar" style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="log-filter-input"
                      value={execCmd}
                      onChange={(e) => setExecCmd(e.target.value)}
                      placeholder="kubectl exec command (e.g. env, ls -la)..."
                    />
                    <button
                      className="log-action-btn"
                      onClick={async () => {
                        const res = await dockerService.execInPodAsync(selectedPod.id, execCmd)
                        setExecOutput(res.output)
                      }}
                    >
                      <Terminal size={11} /> Exec in Pod
                    </button>
                  </div>
                )}
                {execOutput && (
                  <pre className="yaml-preview-box" style={{ maxHeight: 150, marginTop: 6 }}>{execOutput}</pre>
                )}
              </div>
            )}

            {/* 6. MANIFEST & YAML GENERATOR LAB */}
            {k8sTab === 'manifests' && (
              <div className="k8s-section manifest-lab">
                <div className="manifest-inputs-bar glass-panel">
                  <div className="input-group">
                    <label>Kind</label>
                    <select value={manifestKind} onChange={(e) => setManifestKind(e.target.value as 'deployment' | 'ingress')}>
                      <option value="deployment">Deployment + Service</option>
                      <option value="ingress">TLS Ingress</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>App Name</label>
                    <input
                      type="text"
                      value={manifestAppName}
                      onChange={(e) => setManifestAppName(e.target.value)}
                    />
                  </div>
                  {manifestKind === 'deployment' ? (
                    <div className="input-group">
                      <label>Container Image</label>
                      <input
                        type="text"
                        value={manifestImage}
                        onChange={(e) => setManifestImage(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="input-group">
                      <label>Ingress Host</label>
                      <input
                        type="text"
                        value={manifestHost}
                        onChange={(e) => setManifestHost(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="input-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={manifestPort}
                      onChange={(e) => setManifestPort(+e.target.value)}
                    />
                  </div>
                  {manifestKind === 'deployment' && (
                    <div className="input-group">
                      <label>Replicas</label>
                      <input
                        type="number"
                        value={manifestReplicas}
                        onChange={(e) => setManifestReplicas(+e.target.value)}
                      />
                    </div>
                  )}
                  <button
                    className="copy-yaml-btn glass-interactive"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedYaml)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1800)
                    }}
                  >
                    {copied ? <Check size={12} color="#30D158" /> : <Copy size={12} />} Copy YAML
                  </button>
                  <button
                    className="copy-yaml-btn glass-interactive"
                    onClick={async () => {
                      const res = await dockerService.applyKubernetesYamlAsync(generatedYaml)
                      setActionBanner(res.output || (res.ok ? 'Applied manifest to cluster' : 'kubectl apply failed'))
                      setDeployments(dockerService.getDeployments(selectedNamespace))
                      setPods(dockerService.getPods(selectedNamespace))
                    }}
                  >
                    <Play size={12} /> Apply (kubectl)
                  </button>
                </div>

                <pre className="yaml-preview-box">
                  {generatedYaml}
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
              <span>Compose</span>
            </button>

            <button
              className={`docker-nav-btn glass-interactive ${dockerTab === 'linter' ? 'active' : ''}`}
              onClick={() => setDockerTab('linter')}
            >
              <FileCode size={12} />
              <span>Dockerfile Linter</span>
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
                            <button
                              className="ctrl-btn stop"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleRemoveContainer(c.id)
                              }}
                              title="Remove Container"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <div className="container-meta-row">
                          <span className="c-image">{c.image}</span>
                          <span className="c-ports">{c.ports.join(', ') || 'no ports'}</span>
                        </div>

                        {c.status === 'running' && (
                          <div className="container-telemetry-row" style={{ flexDirection: 'column', gap: 4 }}>
                            <div className="telemetry-bar" style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Cpu size={10} /> CPU</span>
                                <span>{c.cpuPercent}%</span>
                              </div>
                              <div className="gauge-track" style={{ height: 4 }}>
                                <div className="gauge-fill" style={{ width: `${Math.min(100, Math.max(2, c.cpuPercent))}%`, background: '#0A84FF' }} />
                              </div>
                            </div>
                            <div className="telemetry-bar" style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                <span>Memory</span>
                                <span>{c.memoryUsageMb} MB / {c.memoryLimitMb} MB</span>
                              </div>
                              <div className="gauge-track" style={{ height: 4 }}>
                                <div
                                  className="gauge-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(2, c.memoryLimitMb > 0 ? (c.memoryUsageMb / c.memoryLimitMb) * 100 : 0))}%`,
                                    background: '#BF5AF2',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Container Log Inspector & Exec Console */}
                {selectedContainer && (
                  <div className="container-logs-box glass-panel">
                    <div className="logs-header">
                      <span>LOGS: {selectedContainer.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="log-action-btn"
                          onClick={async () => {
                            await dockerService.fetchContainerLogsAsync(selectedContainer.id)
                            setContainers(dockerService.getContainers())
                          }}
                          title="Refresh Container Logs"
                        >
                          <RefreshCw size={10} /> Refresh
                        </button>
                        <span className="logs-status-pill">{selectedContainer.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="logs-stream">
                      {selectedContainer.logs.map((log, idx) => (
                        <div key={idx} className="log-line">
                          {log}
                        </div>
                      ))}
                    </div>
                    <div className="log-controls-bar" style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="log-filter-input"
                        style={{ flex: 1 }}
                        value={containerExecCmd}
                        onChange={(e) => setContainerExecCmd(e.target.value)}
                        placeholder="docker exec command (e.g. ls -la, env)..."
                      />
                      <button
                        className="log-action-btn"
                        onClick={async () => {
                          const res = await dockerService.execInContainerAsync(selectedContainer.id, containerExecCmd)
                          setContainerExecOut(res.output)
                        }}
                      >
                        <Terminal size={11} /> Exec
                      </button>
                    </div>
                    {containerExecOut && (
                      <pre className="yaml-preview-box" style={{ maxHeight: 130, marginTop: 6 }}>{containerExecOut}</pre>
                    )}
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
                  {images.map((img, idx) => (
                    <div key={`${img.id}-${img.repository}-${img.tag}-${idx}`} className="image-card glass-panel">
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

            {/* TAB 4: COMPOSE TEMPLATE & RUNNER */}
            {dockerTab === 'compose' && (() => {
              const composeYaml =
                composeMode === 'containers'
                  ? dockerService.generateComposeFromContainers(
                      containers,
                      customComposeSvcName && customComposeSvcImage
                        ? { name: customComposeSvcName, image: customComposeSvcImage, port: customComposeSvcPort }
                        : undefined
                    )
                  : dockerService.generateComposeTemplate()
              return (
                <div className="docker-section compose-section">
                  <div className="section-toolbar" style={{ flexWrap: 'wrap', gap: 6 }}>
                    <span className="section-label">DOCKER COMPOSE WORKBENCH</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select
                        value={composeMode}
                        onChange={(e) => setComposeMode(e.target.value as 'containers' | 'template')}
                        className="ns-select"
                        style={{ fontSize: 11 }}
                      >
                        <option value="containers">Generate from Active Containers</option>
                        <option value="template">Full-Stack Starter Template</option>
                      </select>
                      <button
                        className="section-action-btn glass-interactive"
                        onClick={async () => {
                          const res = await dockerService.runComposeAsync('up', workspaceRoot)
                          setActionBanner(res.output || (res.ok ? 'docker compose up -d succeeded' : 'docker compose up failed'))
                          setContainers(dockerService.getContainers())
                        }}
                      >
                        <Play size={11} /> Compose Up
                      </button>
                      <button
                        className="section-action-btn glass-interactive"
                        onClick={async () => {
                          const res = await dockerService.runComposeAsync('down', workspaceRoot)
                          setActionBanner(res.output || (res.ok ? 'docker compose down succeeded' : 'docker compose down failed'))
                          setContainers(dockerService.getContainers())
                        }}
                      >
                        <Square size={11} /> Compose Down
                      </button>
                      <button
                        className="section-action-btn glass-interactive"
                        onClick={() => {
                          navigator.clipboard.writeText(composeYaml)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1800)
                        }}
                      >
                        {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy
                      </button>
                    </div>
                  </div>
                  {composeMode === 'containers' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="log-filter-input"
                        placeholder="Add custom service name..."
                        value={customComposeSvcName}
                        onChange={(e) => setCustomComposeSvcName(e.target.value)}
                      />
                      <input
                        type="text"
                        className="log-filter-input"
                        placeholder="Image (e.g. nginx:alpine)"
                        value={customComposeSvcImage}
                        onChange={(e) => setCustomComposeSvcImage(e.target.value)}
                      />
                      <input
                        type="text"
                        className="log-filter-input"
                        style={{ width: 95 }}
                        placeholder="Port 8080:80"
                        value={customComposeSvcPort}
                        onChange={(e) => setCustomComposeSvcPort(e.target.value)}
                      />
                    </div>
                  )}

                  <pre className="compose-pre">{composeYaml}</pre>
                </div>
              )
            })()}

            {/* TAB 5: DOCKERFILE LINTER */}
            {dockerTab === 'linter' && (
              <div className="docker-section compose-section">
                <div className="section-toolbar">
                  <span className="section-label">DOCKERFILE SECURITY &amp; BEST-PRACTICE LINTER</span>
                </div>
                <textarea
                  value={dockerfileInput}
                  onChange={(e) => setDockerfileInput(e.target.value)}
                  rows={7}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.35)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 8, fontFamily: 'monospace', fontSize: 12 }}
                />
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(() => {
                    const issues = dockerService.lintDockerfile(dockerfileInput)
                    if (issues.length === 0) {
                      return <div style={{ color: '#30D158', fontSize: 12 }}>✓ No Dockerfile security or layer-caching issues detected.</div>
                    }
                    return issues.map((iss, idx) => (
                      <div key={idx} className="image-card glass-panel" style={{ padding: '6px 10px' }}>
                        <strong style={{ color: iss.severity === 'error' ? '#FF453A' : iss.severity === 'warning' ? '#FFD60A' : '#64D2FF' }}>
                          Line {iss.line} [{iss.severity.toUpperCase()}]:
                        </strong>{' '}
                        <span>{iss.message}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STYLING */}
    </div>
  )
}
