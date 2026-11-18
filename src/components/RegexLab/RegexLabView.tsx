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
import './RegexLabView.css'

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

    </div>
  )
}
