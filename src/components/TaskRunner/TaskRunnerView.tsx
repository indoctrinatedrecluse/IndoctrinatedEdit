import React, { useState, useEffect, useCallback } from 'react'
import {
  Play,
  Clock,
  Calendar,
  Sparkles,
  RotateCw,
  Plus,
  Trash2,
} from 'lucide-react'
import { taskRunnerService, ProjectTask, CronScheduleAnalysis } from '../../services/taskRunnerService'
import './TaskRunnerView.css'

interface TaskRunnerViewProps {
  workspaceRoot?: string
}

export const TaskRunnerView: React.FC<TaskRunnerViewProps> = ({ workspaceRoot }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'cron'>('tasks')
  const [tasks, setTasks] = useState<ProjectTask[]>(() => taskRunnerService.getTasks())
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCmd, setCustomCmd] = useState('')

  // Cron state
  const [cronExpr, setCronExpr] = useState<string>('*/15 * * * *')
  const [cronAnalysis, setCronAnalysis] = useState<CronScheduleAnalysis | null>(null)

  const refreshTasks = useCallback(async () => {
    const found = await taskRunnerService.discoverWorkspaceTasks(workspaceRoot)
    setTasks(found)
  }, [workspaceRoot])

  useEffect(() => {
    void refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    setCronAnalysis(taskRunnerService.analyzeCron(cronExpr))
  }, [cronExpr])

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              lastRun: {
                status: 'running',
                durationMs: 0,
                timestamp: new Date().toLocaleTimeString(),
                output: `> Running "${t.command}"...\n`,
              },
            }
          : t
      )
    )
    await taskRunnerService.runTask(taskId, workspaceRoot)
    setTasks(taskRunnerService.getTasks())
    setRunningTaskId(null)
  }

  const handleDeleteCustomTask = (taskId: string) => {
    taskRunnerService.deleteCustomTask(taskId)
    setTasks(taskRunnerService.getTasks())
  }

  const cronParts = (() => {
    const p = cronExpr.trim().split(/\s+/)
    return p.length === 5 ? p : ['*', '*', '*', '*', '*']
  })()

  const updateCronField = (idx: number, val: string) => {
    const next = [...cronParts]
    next[idx] = val
    setCronExpr(next.join(' '))
  }

  const handleAddCustomTask = () => {
    if (!customName.trim() || !customCmd.trim()) return
    taskRunnerService.addCustomTask(customName, customCmd)
    setTasks(taskRunnerService.getTasks())
    setCustomName('')
    setCustomCmd('')
    setShowAddForm(false)
  }

  return (
    <div className="task-runner-root">
      {/* Sub-Nav Strip */}
      <div
        className="task-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`task-nav-btn glass-interactive ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <Play size={12} />
          <span>Project Scripts ({tasks.length})</span>
        </button>

        <button
          className={`task-nav-btn glass-interactive ${activeTab === 'cron' ? 'active' : ''}`}
          onClick={() => setActiveTab('cron')}
        >
          <Clock size={12} />
          <span>Cron Studio</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="task-body-viewport">
        {/* TAB 1: PROJECT SCRIPTS */}
        {activeTab === 'tasks' && (
          <div className="tasks-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="section-label">DETECTED PROJECT TASKS</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="task-run-btn glass-interactive" onClick={() => setShowAddForm((v) => !v)} title="Add Custom Task">
                  <Plus size={11} /> Add
                </button>
                <button className="task-run-btn glass-interactive" onClick={() => void refreshTasks()} title="Rescan Workspace Tasks">
                  <RotateCw size={11} /> Rescan
                </button>
              </div>
            </div>
            {showAddForm && (
              <div className="task-card glass-panel" style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  className="cron-input"
                  placeholder="Task name (e.g. typecheck)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <input
                  type="text"
                  className="cron-input"
                  placeholder="Shell command (e.g. npx tsc --noEmit)"
                  value={customCmd}
                  onChange={(e) => setCustomCmd(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="task-run-btn glass-interactive" onClick={handleAddCustomTask}>Save Task</button>
                  <button className="task-run-btn glass-interactive" onClick={() => setShowAddForm(false)}>Cancel</button>
                </div>
              </div>
            )}
            <div className="tasks-list">
              {tasks.map((task) => {
                const isRunning = runningTaskId === task.id
                return (
                  <div key={task.id} className="task-card glass-panel">
                    <div className="task-header-row">
                      <div className="task-info">
                        <span className="task-name">{task.name}</span>
                        <span className="task-source-badge">{task.source}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {task.source === 'Custom' && task.id.startsWith('custom_') && (
                          <button
                            className="task-run-btn glass-interactive"
                            style={{ color: '#FF453A', padding: '4px 6px' }}
                            onClick={() => handleDeleteCustomTask(task.id)}
                            title="Delete Custom Task"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                        <button
                          className="task-run-btn glass-interactive"
                          onClick={() => handleRunTask(task.id)}
                          disabled={isRunning}
                        >
                          {isRunning ? <RotateCw size={11} className="spin" /> : <Play size={11} />}
                          <span>{isRunning ? 'Running...' : 'Run Task'}</span>
                        </button>
                      </div>
                    </div>

                    <code className="task-cmd">{task.command}</code>

                    {task.lastRun && (
                      <div className="task-output-box">
                        <div className="output-meta">
                          <span
                            className="out-status"
                            style={{
                              color:
                                task.lastRun.status === 'failed'
                                  ? '#FF453A'
                                  : task.lastRun.status === 'running'
                                  ? '#FFD60A'
                                  : '#30D158',
                            }}
                          >
                            {task.lastRun.status === 'failed'
                              ? `✖ Failed (${task.lastRun.durationMs}ms)`
                              : task.lastRun.status === 'running'
                              ? '⏳ Running...'
                              : `✔ Success (${task.lastRun.durationMs}ms)`}
                          </span>
                          <span className="out-time">{task.lastRun.timestamp}</span>
                        </div>
                        <pre className="output-pre">{task.lastRun.output}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CRON STUDIO */}
        {activeTab === 'cron' && (
          <div className="cron-section">
            <div className="cron-input-card glass-panel">
              <span className="section-label">CRON SCHEDULE EXPRESSION</span>
              <input
                type="text"
                className="cron-input"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="* * * * *"
              />

              {/* Visual 5-Field Cron Builder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6, marginTop: 8, marginBottom: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <span style={{ opacity: 0.7 }}>Minute</span>
                  <select
                    className="cron-input"
                    style={{ padding: '4px 6px', fontSize: 11 }}
                    value={cronParts[0]}
                    onChange={(e) => updateCronField(0, e.target.value)}
                  >
                    <option value="*">Every (*)</option>
                    <option value="*/5">Every 5m (*/5)</option>
                    <option value="*/15">Every 15m (*/15)</option>
                    <option value="*/30">Every 30m (*/30)</option>
                    <option value="0">:00</option>
                    <option value="15">:15</option>
                    <option value="30">:30</option>
                    <option value="45">:45</option>
                    {!['*', '*/5', '*/15', '*/30', '0', '15', '30', '45'].includes(cronParts[0]) && (
                      <option value={cronParts[0]}>{cronParts[0]}</option>
                    )}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <span style={{ opacity: 0.7 }}>Hour</span>
                  <select
                    className="cron-input"
                    style={{ padding: '4px 6px', fontSize: 11 }}
                    value={cronParts[1]}
                    onChange={(e) => updateCronField(1, e.target.value)}
                  >
                    <option value="*">Every (*)</option>
                    <option value="*/2">Every 2h</option>
                    <option value="*/6">Every 6h</option>
                    <option value="0">00:00</option>
                    <option value="6">06:00</option>
                    <option value="9">09:00</option>
                    <option value="12">12:00</option>
                    <option value="18">18:00</option>
                    {!['*', '*/2', '*/6', '0', '6', '9', '12', '18'].includes(cronParts[1]) && (
                      <option value={cronParts[1]}>{cronParts[1]}</option>
                    )}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <span style={{ opacity: 0.7 }}>Day (Mo)</span>
                  <select
                    className="cron-input"
                    style={{ padding: '4px 6px', fontSize: 11 }}
                    value={cronParts[2]}
                    onChange={(e) => updateCronField(2, e.target.value)}
                  >
                    <option value="*">Every (*)</option>
                    <option value="1">1st</option>
                    <option value="15">15th</option>
                    <option value="1,15">1st &amp; 15th</option>
                    {!['*', '1', '15', '1,15'].includes(cronParts[2]) && (
                      <option value={cronParts[2]}>{cronParts[2]}</option>
                    )}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <span style={{ opacity: 0.7 }}>Month</span>
                  <select
                    className="cron-input"
                    style={{ padding: '4px 6px', fontSize: 11 }}
                    value={cronParts[3]}
                    onChange={(e) => updateCronField(3, e.target.value)}
                  >
                    <option value="*">Every (*)</option>
                    <option value="1">Jan</option>
                    <option value="4">Apr</option>
                    <option value="7">Jul</option>
                    <option value="10">Oct</option>
                    <option value="1,4,7,10">Quarterly</option>
                    {!['*', '1', '4', '7', '10', '1,4,7,10'].includes(cronParts[3]) && (
                      <option value={cronParts[3]}>{cronParts[3]}</option>
                    )}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                  <span style={{ opacity: 0.7 }}>Weekday</span>
                  <select
                    className="cron-input"
                    style={{ padding: '4px 6px', fontSize: 11 }}
                    value={cronParts[4]}
                    onChange={(e) => updateCronField(4, e.target.value)}
                  >
                    <option value="*">Every (*)</option>
                    <option value="1-5">Weekdays</option>
                    <option value="6,0">Weekends</option>
                    <option value="1">Mon</option>
                    <option value="5">Fri</option>
                    <option value="0">Sun</option>
                    {!['*', '1-5', '6,0', '1', '5', '0'].includes(cronParts[4]) && (
                      <option value={cronParts[4]}>{cronParts[4]}</option>
                    )}
                  </select>
                </label>
              </div>

              {/* Quick Presets */}
              <div
                className="cron-presets"
                onWheel={(e) => {
                  e.currentTarget.scrollLeft += e.deltaY
                }}
              >
                {[
                  { label: 'Every Minute', val: '* * * * *' },
                  { label: 'Every 15 Min', val: '*/15 * * * *' },
                  { label: 'Hourly', val: '0 * * * *' },
                  { label: 'Midnight Daily', val: '0 0 * * *' },
                  { label: 'Weekly Sun', val: '0 0 * * 0' },
                ].map((p) => (
                  <button
                    key={p.val}
                    className="cron-preset-pill"
                    onClick={() => setCronExpr(p.val)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Human Readable Explanation */}
            {cronAnalysis && (
              <div className="cron-explanation-card glass-panel">
                <div className="exp-header">
                  <Sparkles size={12} color="#64D2FF" />
                  <span>HUMAN-READABLE SCHEDULE</span>
                </div>
                <div className="exp-text">{cronAnalysis.humanReadable}</div>
              </div>
            )}

            {/* Next 10 Trigger Timestamps */}
            {cronAnalysis && cronAnalysis.isValid && (
              <div className="cron-timeline-card glass-panel">
                <div className="exp-header">
                  <Calendar size={12} color="#30D158" />
                  <span>UPCOMING 10 EXECUTION TIMESTAMPS</span>
                </div>
                <div className="timeline-list">
                  {cronAnalysis.nextOccurrences.map((ts, idx) => (
                    <div key={idx} className="timeline-item">
                      <span className="t-idx">#{idx + 1}</span>
                      <span className="t-val">{ts}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
