import React, { useState, useEffect } from 'react'
import {
  Play,
  Clock,
  Calendar,
  Sparkles,
  RotateCw,
} from 'lucide-react'
import { taskRunnerService, ProjectTask, CronScheduleAnalysis } from '../../services/taskRunnerService'
import './TaskRunnerView.css'

export const TaskRunnerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'cron'>('tasks')
  const [tasks, setTasks] = useState<ProjectTask[]>(() => taskRunnerService.getTasks())
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  // Cron state
  const [cronExpr, setCronExpr] = useState<string>('*/15 * * * *')
  const [cronAnalysis, setCronAnalysis] = useState<CronScheduleAnalysis | null>(null)

  useEffect(() => {
    setCronAnalysis(taskRunnerService.analyzeCron(cronExpr))
  }, [cronExpr])

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId)
    await taskRunnerService.runTask(taskId)
    setTasks(taskRunnerService.getTasks())
    setRunningTaskId(null)
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
            <span className="section-label">DETECTED PROJECT TASKS</span>
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
                      <button
                        className="task-run-btn glass-interactive"
                        onClick={() => handleRunTask(task.id)}
                        disabled={isRunning}
                      >
                        {isRunning ? <RotateCw size={11} className="spin" /> : <Play size={11} />}
                        <span>{isRunning ? 'Running...' : 'Run Task'}</span>
                      </button>
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
