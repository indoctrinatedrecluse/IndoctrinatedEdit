import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react'
import { regexService, RegexTestResult, RegexPreset, RegexTokenExplanation } from '../../services/regexService'

export const RegexLabView: React.FC = () => {
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})')
  const [flags, setFlags] = useState<string>('g')
  const [testText, setTestText] = useState<string>('Contact support@indoctrinated.io or recluse.dev+ops@sub.domain.org for inquiries.')
  const [result, setResult] = useState<RegexTestResult | null>(null)
  const [explanations, setExplanations] = useState<RegexTokenExplanation[]>([])
  const [selectedSnippetLang, setSelectedSnippetLang] = useState<'typescript' | 'python' | 'go' | 'rust'>('typescript')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    runRegexTest(pattern, flags, testText)
  }, [pattern, flags, testText])

  const runRegexTest = (pat: string, fl: string, text: string) => {
    const res = regexService.testRegex(pat, fl, text)
    setResult(res)
    setExplanations(regexService.explainRegex(pat))
  }

  const toggleFlag = (f: string) => {
    if (flags.includes(f)) {
      setFlags(flags.replace(f, ''))
    } else {
      setFlags(flags + f)
    }
  }

  const applyPreset = (preset: RegexPreset) => {
    setPattern(preset.pattern)
    setFlags(preset.flags)
    setTestText(preset.sampleText)
  }

  return (
    <div className="regex-lab-root">
      {/* Pattern Input & Flag Controls */}
      <div className="regex-input-bar glass-panel">
        <div className="pattern-row">
          <span className="regex-slash">/</span>
          <input
            type="text"
            className="regex-pattern-input"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Regular expression pattern..."
          />
          <span className="regex-slash">/</span>
          <span className="flags-label">{flags}</span>
        </div>

        <div
          className="flags-toggle-row"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          {['g', 'i', 'm', 's', 'u'].map((f) => (
            <button
              key={f}
              className={`flag-chip glass-interactive ${flags.includes(f) ? 'active' : ''}`}
              onClick={() => toggleFlag(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="regex-body-viewport">
        {/* Presets Quick Picker */}
        <div className="regex-presets-bar">
          <span className="presets-label">
            <BookOpen size={11} /> PRESETS:
          </span>
          <div
            className="presets-list"
            onWheel={(e) => {
              e.currentTarget.scrollLeft += e.deltaY
            }}
          >
            {regexService.presets.map((p) => (
              <button
                key={p.name}
                className="preset-chip glass-interactive"
                onClick={() => applyPreset(p)}
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Test Strings Arena */}
        <div className="test-arena-box glass-panel">
          <div className="arena-header">
            <span>TEST STRINGS (TEST ARENA)</span>
            {result && result.isValid && (
              <span className="match-counter-pill">{result.matchesCount} MATCHES</span>
            )}
          </div>
          <textarea
            className="test-textarea"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={4}
            placeholder="Enter test text to match against..."
          />
        </div>

        {/* Matches Breakdown Table */}
        {result && result.isValid && result.matches.length > 0 && (
          <div className="matches-breakdown-box glass-panel">
            <div className="box-title">MATCHES & CAPTURE GROUPS</div>
            <div className="matches-list">
              {result.matches.map((m) => (
                <div key={m.matchIndex} className="match-card">
                  <div className="match-header">
                    <span className="m-idx">Match #{m.matchIndex}</span>
                    <code className="m-val">{m.fullMatch}</code>
                  </div>
                  {m.groups.length > 0 && (
                    <div className="groups-list">
                      {m.groups.map((g, gIdx) => (
                        <div key={gIdx} className="group-row">
                          <span className="g-idx">${gIdx + 1}:</span>
                          <code className="g-val">{g.value}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Natural Language Explainer */}
        {explanations.length > 0 && (
          <div className="explainer-box glass-panel">
            <div className="box-title">
              <Sparkles size={11} /> PATTERN EXPLANATION
            </div>
            <div className="explainer-list">
              {explanations.map((exp, idx) => (
                <div key={idx} className="explainer-row">
                  <code className="exp-token">{exp.token}</code>
                  <span className="exp-desc">{exp.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Language Code Exporter */}
        <div className="snippet-export-box glass-panel">
          <div className="snippet-header">
            <div
              className="lang-switcher"
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY
              }}
            >
              {(['typescript', 'python', 'go', 'rust'] as const).map((l) => (
                <button
                  key={l}
                  className={`lang-btn ${selectedSnippetLang === l ? 'active' : ''}`}
                  onClick={() => setSelectedSnippetLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="copy-btn glass-interactive"
              onClick={() => {
                navigator.clipboard.writeText(
                  regexService.generateSnippet(pattern, flags, selectedSnippetLang)
                )
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }}
            >
              {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Snippet
            </button>
          </div>
          <pre className="snippet-pre">
            {regexService.generateSnippet(pattern, flags, selectedSnippetLang)}
          </pre>
        </div>
      </div>

      <style>{`
        .regex-lab-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .regex-input-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .pattern-row {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(10, 132, 255, 0.4);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.2);
        }

        .regex-slash {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
          color: #64D2FF;
          padding: 0 4px;
        }

        .regex-pattern-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 12.5px;
        }

        .flags-label {
          font-family: var(--font-mono);
          font-size: 12px;
          color: #BF5AF2;
          font-weight: 700;
        }

        .flags-toggle-row {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .flag-chip {
          padding: 2px 8px;
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .flag-chip.active {
          background: rgba(191, 90, 242, 0.25);
          border-color: rgba(191, 90, 242, 0.45);
          color: #BF5AF2;
        }

        .regex-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .regex-presets-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .presets-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 800;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .presets-list {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex: 1;
        }

        .preset-chip {
          font-size: 10px;
          padding: 2px 8px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-xs);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .preset-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .test-arena-box, .matches-breakdown-box, .explainer-box, .snippet-export-box {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .arena-header, .box-title, .snippet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .match-counter-pill {
          font-size: 9px;
          font-weight: 800;
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .test-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xs);
          padding: 8px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11.5px;
          outline: none;
          box-sizing: border-box;
        }

        .matches-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .match-card {
          padding: 6px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.35);
          border-left: 3px solid #30D158;
        }

        .match-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .m-idx { font-size: 9.5px; color: #30D158; font-weight: 700; }
        .m-val { font-family: var(--font-mono); font-size: 11px; color: #FFF; }

        .groups-list {
          margin-top: 4px;
          padding-left: 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .group-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .g-idx { font-size: 9px; color: #64D2FF; font-weight: 700; }
        .g-val { font-family: var(--font-mono); font-size: 10.5px; color: #CBD5E1; }

        .explainer-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .explainer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }

        .exp-token {
          font-family: var(--font-mono);
          font-weight: 700;
          color: #FFD60A;
          background: rgba(255, 214, 10, 0.1);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .exp-desc { color: var(--text-secondary); }

        .lang-switcher {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .lang-btn {
          font-size: 9.5px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lang-btn.active {
          background: rgba(10, 132, 255, 0.25);
          color: #64D2FF;
        }

        .copy-btn {
          font-size: 10px;
          color: #64D2FF;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .snippet-pre {
          margin: 0;
          padding: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: #E2E8F0;
          background: rgba(0, 0, 0, 0.35);
          border-radius: var(--radius-xs);
          overflow-x: auto;
        }
      `}</style>
    </div>
  )
}
