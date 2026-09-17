import React, { useState, useEffect } from 'react'
import {
  Play,
  Clock,
  Calendar,
  Sparkles,
  RotateCw,
} from 'lucide-react'
import { taskRunnerService, ProjectTask, CronScheduleAnalysis } from '../../services/taskRunnerService'

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
      <div className="task-subnav-strip">
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
                          <span className="out-status">✔ Success ({task.lastRun.durationMs}ms)</span>
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
              <div className="cron-presets">
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

      <style>{`
        .task-runner-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .task-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .task-nav-btn {
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
        }

        .task-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
        }

        .task-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .tasks-section, .cron-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .task-card {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .task-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .task-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .task-name {
          font-size: 12px;
          font-weight: 700;
          color: #FFF;
        }

        .task-source-badge {
          font-size: 8.5px;
          padding: 1px 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          color: var(--text-muted);
        }

        .task-run-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          font-size: 10.5px;
          font-weight: 700;
          color: #FFF;
          background: rgba(48, 209, 88, 0.25);
          border: 1px solid rgba(48, 209, 88, 0.45);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .task-cmd {
          font-family: var(--font-mono);
          font-size: 11px;
          color: #64D2FF;
        }

        .task-output-box {
          background: rgba(0, 0, 0, 0.4);
          border-radius: var(--radius-xs);
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .output-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 9.5px;
          margin-bottom: 4px;
        }

        .out-status { color: #30D158; font-weight: 700; }
        .out-time { color: var(--text-muted); }

        .output-pre {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 10px;
          color: #CBD5E1;
        }

        .cron-input-card, .cron-explanation-card, .cron-timeline-card {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cron-input {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(10, 132, 255, 0.4);
          border-radius: var(--radius-xs);
          padding: 6px 10px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          outline: none;
        }

        .cron-presets {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .cron-preset-pill {
          font-size: 9.5px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .cron-preset-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .exp-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .exp-text {
          font-size: 13px;
          font-weight: 700;
          color: #64D2FF;
          padding: 4px 0;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 180px;
          overflow-y: auto;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 10.5px;
        }

        .t-idx { color: #30D158; font-weight: 700; }
        .t-val { color: #CBD5E1; }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
