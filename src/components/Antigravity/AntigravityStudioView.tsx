import React, { useState, useEffect } from 'react'
import {
  Bot,
  UserCheck,
  LogOut,
  RefreshCw,
  Zap,
  Play,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertCircle,
  User,
} from 'lucide-react'
import { AntigravityIcon } from '../Brand/AntigravityIcon'
import { antigravityAuthService } from '../../services/antigravityAuthService'
import {
  AntigravitySession,
  AntigravityQuotaInfo,
  AntigravitySidecarStatus,
} from '@sdk/types'
import { AiService } from '../../services/aiService'

export const AntigravityStudioView: React.FC = () => {
  const [session, setSession] = useState<AntigravitySession | null>(antigravityAuthService.getSession())
  const [quota, setQuota] = useState<AntigravityQuotaInfo | null>(antigravityAuthService.getCachedQuota())
  const [status, setStatus] = useState<AntigravitySidecarStatus | null>(antigravityAuthService.getCachedSidecarStatus())
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [selectedAgentModel, setSelectedAgentModel] = useState('antigravity-personal-agent')
  const [agentBehavior, setAgentBehavior] = useState<'autonomous' | 'interactive'>('autonomous')

  // Load status and session on-demand when user opens this extension view
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      setIsLoading(true)
      try {
        const [currStatus, currQuota, currSession] = await Promise.all([
          antigravityAuthService.getSidecarStatus(),
          antigravityAuthService.getQuota(),
          antigravityAuthService.syncSession(),
        ])
        if (isMounted) {
          setStatus(currStatus)
          setQuota(currQuota)
          setSession(currSession)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    const unsub = antigravityAuthService.onAuthChanged((newSession) => {
      if (isMounted) {
        setSession(newSession)
        antigravityAuthService.getQuota().then(setQuota)
        antigravityAuthService.getSidecarStatus().then(setStatus)
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const [s, q] = await Promise.all([
        antigravityAuthService.getSidecarStatus(),
        antigravityAuthService.getQuota(),
      ])
      setStatus(s)
      setQuota(q)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true)
    try {
      const newSession = await antigravityAuthService.loginWithGoogle()
      setSession(newSession)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSignOut = async () => {
    await antigravityAuthService.logout()
    setSession(null)
  }

  const handleLaunchInAiChat = () => {
    AiService.setActiveModelId(selectedAgentModel)
    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { modelId: selectedAgentModel } }))
  }

  return (
    <div className="antigravity-studio-container custom-scrollbar">
      {/* Ambient background glows */}
      <div className="ag-ambient-orb ag-orb-1" />
      <div className="ag-ambient-orb ag-orb-2" />

      {/* Header Banner */}
      <header className="ag-header-banner glass-card">
        <div className="ag-title-row">
          <div className="ag-logo-wrapper">
            <AntigravityIcon size={24} />
          </div>
          <div className="ag-title-text">
            <h2 className="ag-main-title">Google Antigravity</h2>
            <span className="ag-subtitle">Python SDK & Personal Subscription Suite</span>
          </div>
        </div>

        <button
          className="ag-refresh-btn glass-interactive"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh Sidecar & Quota"
        >
          <RefreshCw size={13} className={isLoading ? 'spinning' : ''} />
          <span>Sync</span>
        </button>
      </header>

      {/* 1. Google Account & Personal Subscription Card */}
      <section className="ag-section-card glass-panel">
        <div className="ag-section-header">
          <div className="ag-section-title">
            <UserCheck size={14} className="text-cyan" />
            <span>Google Account Credentials</span>
          </div>
          {session ? (
            <span className="ag-status-badge active">
              <CheckCircle2 size={11} />
              <span>Personal Subscription Active</span>
            </span>
          ) : (
            <span className="ag-status-badge inactive">
              <AlertCircle size={11} />
              <span>Unlinked</span>
            </span>
          )}
        </div>

        {session ? (
          <div className="ag-user-profile-box glass-subcard">
            <div className="ag-profile-left">
              {session.picture ? (
                <img src={session.picture} alt={session.name} className="ag-avatar-img" />
              ) : (
                <div className="ag-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
              <div className="ag-user-info">
                <div className="ag-name">{session.name || 'Google User'}</div>
                <div className="ag-email">{session.email}</div>
                <div className="ag-tier-meta">
                  <span className="tier-tag">Antigravity {session.tier?.toUpperCase()}</span>
                  <span className="auth-type">OAuth 2.0 Loopback</span>
                </div>
              </div>
            </div>

            <div className="ag-account-actions">
              <button
                className="ag-btn secondary glass-interactive"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
              >
                <span>Switch Account</span>
              </button>
              <button
                className="ag-btn danger glass-interactive"
                onClick={handleSignOut}
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="ag-signin-banner glass-subcard">
            <p className="ag-signin-desc">
              Log in with your personal Google account to activate Antigravity 2.0 multi-model agents with zero API key configuration.
            </p>
            <button
              className="ag-google-login-btn glass-interactive"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Authenticating with Google...' : 'Sign In with Google (Antigravity)'}</span>
            </button>
          </div>
        )}
      </section>

      {/* 2. Python Antigravity SDK Sidecar Status */}
      <section className="ag-section-card glass-panel">
        <div className="ag-section-header">
          <div className="ag-section-title">
            <Cpu size={14} className="text-purple" />
            <span>Python SDK Sidecar Daemon</span>
          </div>
          <div className="ag-sidecar-pill">
            <span className={`status-dot ${status?.running ? 'online' : 'offline'}`} />
            <span>{status?.running ? `Online (Port ${status.port})` : 'Lazy Standby'}</span>
          </div>
        </div>

        <div className="ag-daemon-grid">
          <div className="daemon-metric glass-subcard">
            <span className="metric-label">Python Version</span>
            <span className="metric-value">{status?.pythonVersion || 'Python 3.10+'}</span>
          </div>
          <div className="daemon-metric glass-subcard">
            <span className="metric-label">SDK Protocol</span>
            <span className="metric-value">google-antigravity / SSE</span>
          </div>
          <div className="daemon-metric glass-subcard">
            <span className="metric-label">Boot Mode</span>
            <span className="metric-value">On-Demand Lazy Boot</span>
          </div>
          <div className="daemon-metric glass-subcard">
            <span className="metric-label">Process State</span>
            <span className="metric-value text-success">{status?.running ? 'Attached' : 'Ready'}</span>
          </div>
        </div>
      </section>

      {/* 3. Subscription Quotas & Token Limits */}
      <section className="ag-section-card glass-panel">
        <div className="ag-section-header">
          <div className="ag-section-title">
            <Zap size={14} className="text-amber" />
            <span>Antigravity Subscription Quotas</span>
          </div>
          <span className="quota-tag">1M Context Window</span>
        </div>

        <div className="ag-quota-grid">
          <div className="ag-quota-card glass-subcard">
            <div className="quota-top">
              <span className="q-label">Requests / Min (RPM)</span>
              <span className="q-val">{quota?.rpmRemaining || 58} / {quota?.rpmLimit || 60}</span>
            </div>
            <div className="quota-bar-wrapper">
              <div
                className="quota-bar-fill rpm"
                style={{ width: `${Math.min(100, ((quota?.rpmRemaining || 58) / (quota?.rpmLimit || 60)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="ag-quota-card glass-subcard">
            <div className="quota-top">
              <span className="q-label">Tokens / Min (TPM)</span>
              <span className="q-val">3.95M / 4.0M</span>
            </div>
            <div className="quota-bar-wrapper">
              <div className="quota-bar-fill tpm" style={{ width: '98%' }} />
            </div>
          </div>

          <div className="ag-quota-card glass-subcard">
            <div className="quota-top">
              <span className="q-label">Daily Agent Computes</span>
              <span className="q-val">{quota?.dailyComputesRemaining || 950} / {quota?.dailyComputesLimit || 1000}</span>
            </div>
            <div className="quota-bar-wrapper">
              <div className="quota-bar-fill compute" style={{ width: '95%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Antigravity 2.0 Agent Session Launcher */}
      <section className="ag-section-card glass-panel">
        <div className="ag-section-header">
          <div className="ag-section-title">
            <Bot size={14} className="text-emerald" />
            <span>Launch Antigravity 2.0 Agent</span>
          </div>
        </div>

        <div className="ag-agent-setup glass-subcard">
          <div className="setup-row">
            <label>Agent Model</label>
            <select
              className="ag-select"
              value={selectedAgentModel}
              onChange={(e) => setSelectedAgentModel(e.target.value)}
            >
              <option value="antigravity-personal-agent">Antigravity 2.0 Agent (Personal)</option>
              <option value="antigravity-gemini-2-5-pro">Gemini 2.5 Pro (Antigravity Tier)</option>
              <option value="antigravity-claude-3-7-sonnet">Claude 3.7 Sonnet (Antigravity Tier)</option>
            </select>
          </div>

          <div className="setup-row">
            <label>Agent Behavior</label>
            <div className="behavior-buttons">
              <button
                className={`behavior-btn glass-interactive ${agentBehavior === 'autonomous' ? 'active' : ''}`}
                onClick={() => setAgentBehavior('autonomous')}
              >
                <Zap size={11} />
                <span>Autonomous</span>
              </button>
              <button
                className={`behavior-btn glass-interactive ${agentBehavior === 'interactive' ? 'active' : ''}`}
                onClick={() => setAgentBehavior('interactive')}
              >
                <Sliders size={11} />
                <span>Interactive</span>
              </button>
            </div>
          </div>

          <button className="ag-launch-btn glass-interactive" onClick={handleLaunchInAiChat}>
            <Play size={13} fill="currentColor" />
            <span>Open in AI Assistant & Start Turn</span>
          </button>
        </div>
      </section>

      <style>{`
        .antigravity-studio-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          height: 100%;
          overflow-y: auto;
          position: relative;
          color: #FFFFFF;
          background: rgba(10, 14, 26, 0.92);
        }

        .ag-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.18;
        }

        .ag-orb-1 {
          width: 300px;
          height: 300px;
          background: #00F0FF;
          top: -50px;
          right: -50px;
        }

        .ag-orb-2 {
          width: 320px;
          height: 320px;
          background: #BF5AF2;
          bottom: 20px;
          left: -60px;
        }

        .ag-header-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          position: relative;
          z-index: 10;
        }

        .ag-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ag-logo-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);
        }

        .ag-main-title {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #FFFFFF 0%, #5AC8FA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .ag-subtitle {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.6);
        }

        .ag-refresh-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 10.5px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          cursor: pointer;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ag-section-card {
          padding: 12px;
          border-radius: 8px;
          background: rgba(14, 18, 32, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          z-index: 10;
        }

        .ag-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ag-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .text-cyan { color: #00F0FF; }
        .text-purple { color: #BF5AF2; }
        .text-amber { color: #FF9F0A; }
        .text-emerald { color: #30D158; }
        .text-success { color: #30D158; }

        .ag-status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 600;
        }

        .ag-status-badge.active {
          background: rgba(48, 209, 88, 0.18);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
        }

        .ag-status-badge.inactive {
          background: rgba(255, 159, 10, 0.15);
          border: 1px solid rgba(255, 159, 10, 0.35);
          color: #FF9F0A;
        }

        .ag-sidecar-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.7);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot.online { background: #30D158; box-shadow: 0 0 8px #30D158; }
        .status-dot.offline { background: #FF9F0A; }

        .ag-user-profile-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .ag-profile-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ag-avatar-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(0, 240, 255, 0.4);
        }

        .ag-avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.15);
          border: 1px solid rgba(0, 240, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00F0FF;
        }

        .ag-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ag-name {
          font-size: 12px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .ag-email {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.6);
        }

        .ag-tier-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .tier-tag {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(191, 90, 242, 0.25);
          border: 1px solid rgba(191, 90, 242, 0.45);
          color: #BF5AF2;
        }

        .auth-type {
          font-size: 9px;
          color: rgba(235, 235, 245, 0.45);
        }

        .ag-account-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ag-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
        }

        .ag-btn.danger {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.35);
          color: #FF453A;
        }

        .ag-signin-banner {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .ag-signin-desc {
          font-size: 11px;
          color: rgba(235, 235, 245, 0.7);
          margin: 0;
          line-height: 1.4;
        }

        .ag-google-login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ag-google-login-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 16px rgba(66, 133, 244, 0.35);
        }

        .ag-daemon-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .daemon-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 5px;
        }

        .metric-label {
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.5);
        }

        .metric-value {
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .ag-quota-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ag-quota-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 5px;
        }

        .quota-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
        }

        .q-label { color: rgba(235, 235, 245, 0.6); }
        .q-val { color: #FFFFFF; font-weight: 600; font-family: monospace; }

        .quota-bar-wrapper {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .quota-bar-fill {
          height: 100%;
          border-radius: 999px;
        }

        .quota-bar-fill.rpm { background: #00F0FF; box-shadow: 0 0 6px #00F0FF; }
        .quota-bar-fill.tpm { background: #BF5AF2; box-shadow: 0 0 6px #BF5AF2; }
        .quota-bar-fill.compute { background: #30D158; box-shadow: 0 0 6px #30D158; }

        .quota-tag {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          background: rgba(255, 159, 10, 0.2);
          border: 1px solid rgba(255, 159, 10, 0.4);
          color: #FF9F0A;
          border-radius: 4px;
        }

        .ag-agent-setup {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .setup-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setup-row label {
          font-size: 10px;
          font-weight: 600;
          color: rgba(235, 235, 245, 0.6);
        }

        .ag-select {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          color: #FFFFFF;
          padding: 5px 8px;
          font-size: 11px;
          outline: none;
        }

        .behavior-buttons {
          display: flex;
          gap: 6px;
        }

        .behavior-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 5px;
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(235, 235, 245, 0.7);
        }

        .behavior-btn.active {
          background: rgba(0, 240, 255, 0.18);
          border-color: rgba(0, 240, 255, 0.45);
          color: #00F0FF;
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
        }

        .ag-launch-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF 0%, #BF5AF2 100%);
          border: none;
          color: #FFFFFF;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(191, 90, 242, 0.35);
          margin-top: 4px;
          transition: transform 0.15s ease;
        }

        .ag-launch-btn:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}
