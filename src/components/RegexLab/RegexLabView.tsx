import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Copy,
  Check,
  BookOpen,
  Replace,
  Cpu,
  Bot,
  Code2,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { regexService, RegexTestResult, RegexPreset, RegexTokenExplanation } from '../../services/regexService'

type RegexTab = 'test' | 'replace' | 'benchmark' | 'ai' | 'snippets'

export const RegexLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RegexTab>('test')
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})')
  const [flags, setFlags] = useState<string>('g')
  const [testText, setTestText] = useState<string>('Contact support@indoctrinated.io or recluse.dev+ops@sub.domain.org for inquiries.')
  const [replacement, setReplacement] = useState<string>('USER($1) -> DOMAIN($2)')
  const [aiPrompt, setAiPrompt] = useState<string>('match valid IPv4 address')
  const [result, setResult] = useState<RegexTestResult | null>(null)
  const [explanations, setExplanations] = useState<RegexTokenExplanation[]>([])
  const [selectedSnippetLang, setSelectedSnippetLang] = useState<'typescript' | 'python' | 'go' | 'rust'>('typescript')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // ReDoS Benchmark State
  const [benchmarkIters, setBenchmarkIters] = useState<number>(1000)
  const [benchmarkResult, setBenchmarkResult] = useState<{
    durationUs: number
    iterations: number
    riskLevel: 'safe' | 'warning' | 'critical'
    message: string
  } | null>(null)

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

  const substitutionResult = useMemo(() => {
    return regexService.substituteRegex(pattern, flags, testText, replacement)
  }, [pattern, flags, testText, replacement])

  const handleRunBenchmark = () => {
    const res = regexService.benchmarkRegex(pattern, flags, testText, benchmarkIters)
    setBenchmarkResult(res)
  }

  const handleGenerateAiRegex = () => {
    if (!aiPrompt.trim()) return
    const gen = regexService.generateRegexFromPrompt(aiPrompt)
    setPattern(gen.pattern)
    setFlags(gen.flags)
    setTestText(gen.sample)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="regex-lab-root">
      {/* Top Pattern & Flag Controls Bar */}
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

      {/* Mode Sub-Navigation Tabs */}
      <div
        className="regex-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`regex-nav-btn glass-interactive ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <Sparkles size={12} />
          <span>Match Arena</span>
          {result && result.isValid && result.matchesCount > 0 && (
            <span className="subnav-badge">{result.matchesCount}</span>
          )}
        </button>

        <button
          className={`regex-nav-btn glass-interactive ${activeTab === 'replace' ? 'active' : ''}`}
          onClick={() => setActiveTab('replace')}
        >
          <Replace size={12} />
          <span>Substitution Diff</span>
        </button>

        <button
          className={`regex-nav-btn glass-interactive ${activeTab === 'benchmark' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('benchmark')
            if (!benchmarkResult) handleRunBenchmark()
          }}
        >
          <Cpu size={12} />
          <span>ReDoS Benchmark</span>
        </button>

        <button
          className={`regex-nav-btn glass-interactive ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Bot size={12} />
          <span>Natural AI Builder</span>
        </button>

        <button
          className={`regex-nav-btn glass-interactive ${activeTab === 'snippets' ? 'active' : ''}`}
          onClick={() => setActiveTab('snippets')}
        >
          <Code2 size={12} />
          <span>Code Exporter</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="regex-body-viewport">
        {/* Presets Quick Picker Strip */}
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

        {/* TAB 1: MATCH & HIGHLIGHT ARENA */}
        {activeTab === 'test' && (
          <>
            <div className="test-arena-box glass-panel">
              <div className="arena-header">
                <span>SAMPLE TEST TEXT</span>
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

            {result && result.isValid && result.matches.length > 0 && (
              <div className="matches-breakdown-box glass-panel">
                <div className="box-title">
                  <span>CAPTURED MATCHES & GROUPS</span>
                  <span className="timing-pill">{result.executionTimeMs}ms</span>
                </div>
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
                              <span className="g-idx">${gIdx + 1}{g.name ? ` (${g.name})` : ''}:</span>
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

            {explanations.length > 0 && (
              <div className="explainer-box glass-panel">
                <div className="box-title">
                  <Sparkles size={11} /> SYNTAX BREAKDOWN
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
          </>
        )}

        {/* TAB 2: SUBSTITUTION & DIFF ARENA */}
        {activeTab === 'replace' && (
          <div className="substitution-view-box">
            <div className="replace-input-card glass-panel">
              <span className="box-title">REPLACEMENT TEMPLATE ($1, $2, $&, etc.)</span>
              <div className="replace-row">
                <input
                  type="text"
                  className="replace-input-field"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="e.g. [$1] -> replacement"
                />
                <button
                  className="copy-btn glass-interactive"
                  onClick={() => copyToClipboard(substitutionResult.result, 'sub_copy')}
                >
                  {copiedKey === 'sub_copy' ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Result
                </button>
              </div>
            </div>

            <div className="diff-comparison-grid">
              <div className="diff-card glass-panel">
                <div className="diff-card-header original">ORIGINAL TEXT</div>
                <pre className="diff-pre">{testText}</pre>
              </div>

              <div className="diff-card glass-panel">
                <div className="diff-card-header replaced">
                  <span>SUBSTITUTED OUTPUT</span>
                  <span className="replace-badge">{substitutionResult.count} Replaced</span>
                </div>
                <pre className="diff-pre highlighted">{substitutionResult.result}</pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REDOS BENCHMARK & PERFORMANCE */}
        {activeTab === 'benchmark' && (
          <div className="benchmark-box glass-panel">
            <div className="box-title">
              <Cpu size={12} /> CATASTROPHIC BACKTRACKING & LATENCY PROFILER
            </div>
            <div className="benchmark-controls">
              <label className="bench-label">Iterations:</label>
              <select
                className="bench-select"
                value={benchmarkIters}
                onChange={(e) => setBenchmarkIters(Number(e.target.value))}
              >
                <option value={100}>100 runs</option>
                <option value={1000}>1,000 runs (Standard)</option>
                <option value={5000}>5,000 runs (Deep Stress)</option>
              </select>
              <button className="run-bench-btn glass-interactive" onClick={handleRunBenchmark}>
                <Zap size={12} /> Run Benchmark
              </button>
            </div>

            {benchmarkResult && (
              <div className={`bench-card ${benchmarkResult.riskLevel}`}>
                <div className="bench-metric-row">
                  <span className="metric-label">Execution Latency:</span>
                  <span className="metric-value">{benchmarkResult.durationUs} µs / run</span>
                </div>
                <div className="bench-metric-row">
                  <span className="metric-label">ReDoS Safety Level:</span>
                  <span className={`risk-tag ${benchmarkResult.riskLevel}`}>
                    {benchmarkResult.riskLevel === 'safe' ? <Check size={12} /> : <AlertTriangle size={12} />}
                    {benchmarkResult.riskLevel.toUpperCase()}
                  </span>
                </div>
                <p className="bench-message">{benchmarkResult.message}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NATURAL LANGUAGE AI REGEX GENERATOR */}
        {activeTab === 'ai' && (
          <div className="ai-builder-box glass-panel">
            <div className="box-title">
              <Bot size={12} /> NATURAL LANGUAGE TO REGEX GENERATOR
            </div>
            <div className="ai-input-row">
              <input
                type="text"
                className="ai-prompt-input"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what pattern you want to match (e.g. match valid IPv4, phone number, hex color...)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateAiRegex()
                }}
              />
              <button className="generate-btn glass-interactive" onClick={handleGenerateAiRegex}>
                <Sparkles size={12} /> Generate
              </button>
            </div>

            <div className="ai-suggestions-strip">
              <span className="sugg-label">Try:</span>
              {['valid IPv6 address', 'semantic version string', 'ISO date timestamp', 'secure password token', 'URL slug'].map((s) => (
                <button
                  key={s}
                  className="sugg-chip glass-interactive"
                  onClick={() => {
                    setAiPrompt(s)
                    const gen = regexService.generateRegexFromPrompt(s)
                    setPattern(gen.pattern)
                    setFlags(gen.flags)
                    setTestText(gen.sample)
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MULTI-LANGUAGE CODE EXPORTER */}
        {activeTab === 'snippets' && (
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
                onClick={() =>
                  copyToClipboard(
                    regexService.generateSnippet(pattern, flags, selectedSnippetLang),
                    'snippet_copy'
                  )
                }
              >
                {copiedKey === 'snippet_copy' ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Snippet
              </button>
            </div>
            <pre className="snippet-pre">
              {regexService.generateSnippet(pattern, flags, selectedSnippetLang)}
            </pre>
          </div>
        )}
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

        .regex-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .regex-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .regex-nav-btn:hover {
          color: #FFF;
          background: rgba(255, 255, 255, 0.07);
        }

        .regex-nav-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.22);
          border-color: rgba(10, 132, 255, 0.45);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.25);
        }

        .subnav-badge {
          font-size: 9px;
          background: #30D158;
          color: #000;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
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

        .test-arena-box, .matches-breakdown-box, .explainer-box, .snippet-export-box, .replace-input-card, .diff-card, .benchmark-box, .ai-builder-box {
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

        .timing-pill {
          font-size: 9px;
          color: #64D2FF;
          font-family: var(--font-mono);
        }

        .test-textarea, .diff-pre, .replace-input-field, .ai-prompt-input {
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

        .replace-row, .ai-input-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .diff-comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .diff-card-header {
          font-size: 9.5px;
          font-weight: 800;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }

        .diff-card-header.original { color: #FF9F0A; }
        .diff-card-header.replaced { color: #30D158; }

        .replace-badge {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .diff-pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 180px;
          overflow-y: auto;
        }

        .diff-pre.highlighted {
          border-color: rgba(48, 209, 88, 0.3);
        }

        .benchmark-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .bench-label { font-size: 11px; color: var(--text-secondary); }

        .bench-select {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 11px;
        }

        .run-bench-btn, .generate-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 132, 255, 0.25);
          border: 1px solid rgba(10, 132, 255, 0.5);
          color: #64D2FF;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .bench-card {
          padding: 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bench-card.safe { border-left: 3px solid #30D158; }
        .bench-card.warning { border-left: 3px solid #FF9F0A; }
        .bench-card.critical { border-left: 3px solid #FF453A; }

        .bench-metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }

        .metric-value { font-family: var(--font-mono); font-weight: 700; color: #FFF; }

        .risk-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .risk-tag.safe { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .risk-tag.warning { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .risk-tag.critical { background: rgba(255, 69, 58, 0.2); color: #FF453A; }

        .bench-message {
          margin: 0;
          font-size: 10.5px;
          color: var(--text-secondary);
        }

        .ai-suggestions-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .sugg-label { font-size: 10px; color: var(--text-muted); }

        .sugg-chip {
          font-size: 10px;
          padding: 2px 7px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
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
