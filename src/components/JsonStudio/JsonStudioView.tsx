import React, { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Filter,
  ShieldAlert,
  ArrowRightLeft,
  ListTree,
} from 'lucide-react'
import {
  jsonStudioService,
  JsonTreeNode,
  JsonSchemaValidationResult,
} from '../../services/jsonStudioService'

type JsonStudioTab = 'jq' | 'tree' | 'schema' | 'transform'

export const JsonStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<JsonStudioTab>('jq')
  const [rawJson, setRawJson] = useState<string>(() =>
    JSON.stringify(
      {
        appName: 'IndoctrinatedEdit',
        version: '5.0.0',
        activeProfile: 'Liquid Glass Dark Velvet',
        telemetry: { enabled: true, heartbeatMs: 5000 },
        users: [
          { id: 1, name: 'indoctrinatedrecluse', role: 'architect', email: 'recluse@indoctrinated.io' },
          { id: 2, name: 'copilot', role: 'assistant', email: 'ai@indoctrinated.io' },
        ],
        features: ['split-panes', 'lsp', 'git-merge', 'regex-lab', 'json-studio'],
      },
      null,
      2
    )
  )
  const [jqQuery, setJqQuery] = useState<string>('.users[].name')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Schema state
  const [schemaText, setSchemaText] = useState<string>(() =>
    JSON.stringify(
      {
        type: 'object',
        required: ['appName', 'version', 'users'],
        properties: {
          appName: { type: 'string' },
          version: { type: 'string' },
          activeProfile: { type: 'string' },
          users: { type: 'array' },
        },
      },
      null,
      2
    )
  )

  // Transform state
  const [transFrom, setTransFrom] = useState<'json' | 'yaml'>('json')
  const [transTo, setTransTo] = useState<'json' | 'yaml' | 'csv' | 'xml'>('yaml')

  // Expanded Tree Nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ $: true })

  // Parse JSON data safely
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(rawJson)
    } catch {
      return null
    }
  }, [rawJson])

  // JQ query result
  const jqResult = useMemo(() => {
    if (!parsedData) return { result: null, executionTimeMs: 0, error: 'Invalid JSON input' }
    return jsonStudioService.queryJq(parsedData, jqQuery)
  }, [parsedData, jqQuery])

  // Tree structure
  const treeRoot = useMemo(() => {
    if (!parsedData) return null
    return jsonStudioService.buildJsonTree(parsedData)
  }, [parsedData])

  // Schema validation result
  const schemaValidation: JsonSchemaValidationResult = useMemo(() => {
    if (!parsedData) return { isValid: false, errors: [{ path: '$', message: 'Invalid JSON payload' }] }
    try {
      const schemaObj = JSON.parse(schemaText)
      return jsonStudioService.validateJsonSchema(parsedData, schemaObj)
    } catch (err: any) {
      return { isValid: false, errors: [{ path: '$schema', message: `Invalid Schema: ${err.message}` }] }
    }
  }, [parsedData, schemaText])

  // Transformed output
  const transformedOutput = useMemo(() => {
    return jsonStudioService.transformFormat(rawJson, transFrom, transTo)
  }, [rawJson, transFrom, transTo])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  const renderTreeNode = (node: JsonTreeNode) => {
    const isExpanded = !!expandedNodes[node.id]
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="tree-node-item">
        <div className="tree-node-row" onClick={() => hasChildren && toggleNode(node.id)}>
          {hasChildren ? (
            <span className="tree-expander">
              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
          ) : (
            <span className="tree-leaf-bullet">•</span>
          )}

          <span className="node-key">{node.key}:</span>

          {hasChildren ? (
            <span className="node-bracket">{node.value}</span>
          ) : (
            <code className={`node-val ${node.type}`}>
              {node.type === 'string' ? `"${node.value}"` : String(node.value)}
            </code>
          )}

          <span className={`node-type-tag ${node.type}`}>{node.type}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="tree-children-wrap">
            {node.children!.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="json-studio-root">
      {/* Top Sub-Nav Strip */}
      <div
        className="json-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`json-nav-btn glass-interactive ${activeTab === 'jq' ? 'active' : ''}`}
          onClick={() => setActiveTab('jq')}
        >
          <Filter size={12} />
          <span>JQ / Path Sandbox</span>
        </button>

        <button
          className={`json-nav-btn glass-interactive ${activeTab === 'tree' ? 'active' : ''}`}
          onClick={() => setActiveTab('tree')}
        >
          <ListTree size={12} />
          <span>Tree Inspector</span>
        </button>

        <button
          className={`json-nav-btn glass-interactive ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <ShieldAlert size={12} />
          <span>Schema Validator</span>
          {schemaValidation.errors.length > 0 && (
            <span className="schema-err-badge">{schemaValidation.errors.length}</span>
          )}
        </button>

        <button
          className={`json-nav-btn glass-interactive ${activeTab === 'transform' ? 'active' : ''}`}
          onClick={() => setActiveTab('transform')}
        >
          <ArrowRightLeft size={12} />
          <span>Data Transformer</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="json-body-viewport">
        {/* TAB 1: JQ QUERY SANDBOX */}
        {activeTab === 'jq' && (
          <div className="jq-sandbox-pane">
            <div className="jq-query-bar glass-panel">
              <span className="jq-prompt">jq &gt;</span>
              <input
                type="text"
                className="jq-input-field"
                value={jqQuery}
                onChange={(e) => setJqQuery(e.target.value)}
                placeholder="e.g. .users[].name, .features | length, keys..."
              />
              <span className="jq-time-badge">{jqResult.executionTimeMs}ms</span>
            </div>

            <div className="jq-presets-bar">
              <span className="presets-label">QUICK:</span>
              {['.', '.users', '.users[].name', '.features', '.features | length', 'keys'].map((q) => (
                <button
                  key={q}
                  className="preset-chip glass-interactive"
                  onClick={() => setJqQuery(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="jq-panels-split">
              <div className="json-input-box glass-panel">
                <div className="panel-head">
                  <span>INPUT JSON</span>
                  {!parsedData && <span className="syntax-err">Syntax Error</span>}
                </div>
                <textarea
                  className="json-textarea"
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={8}
                />
              </div>

              <div className="json-output-box glass-panel">
                <div className="panel-head">
                  <span>QUERY EVALUATION RESULT</span>
                  <button
                    className="copy-btn glass-interactive"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(jqResult.result, null, 2),
                        'jq_result_copy'
                      )
                    }
                  >
                    {copiedKey === 'jq_result_copy' ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="json-pre-output">
                  {jqResult.error ? (
                    <span className="jq-err">{jqResult.error}</span>
                  ) : (
                    JSON.stringify(jqResult.result, null, 2)
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TREE INSPECTOR */}
        {activeTab === 'tree' && (
          <div className="tree-inspector-pane glass-panel">
            <div className="tree-header">
              <span>HIERARCHICAL TREE EXPLORER</span>
              <button
                className="expand-all-btn glass-interactive"
                onClick={() => setExpandedNodes({ $: true })}
              >
                Reset Collapse
              </button>
            </div>
            <div className="tree-content-root">
              {treeRoot ? renderTreeNode(treeRoot) : <div className="invalid-tree">Invalid JSON</div>}
            </div>
          </div>
        )}

        {/* TAB 3: JSON SCHEMA VALIDATOR */}
        {activeTab === 'schema' && (
          <div className="schema-validator-pane">
            <div className={`schema-status-card glass-panel ${schemaValidation.isValid ? 'valid' : 'invalid'}`}>
              <div className="status-title-row">
                <ShieldAlert size={14} />
                <span>
                  {schemaValidation.isValid ? 'Schema Validation Passed' : 'Schema Violations Detected'}
                </span>
              </div>
              {schemaValidation.isValid ? (
                <p className="status-desc">All required fields, data types, and enum restrictions conform to schema.</p>
              ) : (
                <div className="schema-errors-list">
                  {schemaValidation.errors.map((err, i) => (
                    <div key={i} className="schema-err-row">
                      <code className="err-path">{err.path}</code>
                      <span className="err-msg">{err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="schema-editor-split">
              <div className="schema-box glass-panel">
                <div className="panel-head">JSON SCHEMA DEFINITION</div>
                <textarea
                  className="json-textarea"
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATA TRANSFORMER */}
        {activeTab === 'transform' && (
          <div className="transform-pane">
            <div className="format-picker-row glass-panel">
              <div className="fmt-group">
                <span className="fmt-label">From:</span>
                <select
                  className="fmt-select"
                  value={transFrom}
                  onChange={(e) => setTransFrom(e.target.value as any)}
                >
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>

              <div className="fmt-group">
                <span className="fmt-label">To:</span>
                <select
                  className="fmt-select"
                  value={transTo}
                  onChange={(e) => setTransTo(e.target.value as any)}
                >
                  <option value="yaml">YAML</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                </select>
              </div>

              <button
                className="copy-btn glass-interactive"
                onClick={() => copyToClipboard(transformedOutput, 'transform_copy')}
              >
                {copiedKey === 'transform_copy' ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                <span>Copy Output</span>
              </button>
            </div>

            <div className="transformed-box glass-panel">
              <pre className="transform-output-pre">{transformedOutput}</pre>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .json-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.78rem;
          overflow: hidden;
        }

        .json-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.35);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .json-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
        }

        .json-nav-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.22);
          border-color: rgba(10, 132, 255, 0.4);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.2);
        }

        .schema-err-badge {
          background: #FF453A;
          color: #FFF;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .json-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .jq-query-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(10, 132, 255, 0.4);
          border-radius: 4px;
        }

        .jq-prompt {
          font-family: var(--font-mono);
          font-weight: 800;
          color: #64D2FF;
          font-size: 11px;
        }

        .jq-input-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11.5px;
        }

        .jq-time-badge {
          font-size: 9px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .jq-presets-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .presets-label { font-size: 9.5px; font-weight: 800; color: var(--text-muted); }

        .preset-chip {
          font-size: 9.5px;
          font-family: var(--font-mono);
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
        }

        .preset-chip:hover { background: rgba(255, 255, 255, 0.1); color: #FFF; }

        .jq-panels-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          flex: 1;
        }

        .json-input-box, .json-output-box, .tree-inspector-pane, .schema-status-card, .schema-box, .format-picker-row, .transformed-box {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .panel-head, .tree-header, .status-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9.5px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .syntax-err { color: #FF453A; font-size: 9px; font-weight: 700; }

        .json-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 6px;
          color: #64D2FF;
          font-family: var(--font-mono);
          font-size: 11px;
          outline: none;
          box-sizing: border-box;
          resize: vertical;
        }

        .json-pre-output, .transform-output-pre {
          margin: 0;
          padding: 6px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: #30D158;
          max-height: 220px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .jq-err { color: #FF453A; }

        .copy-btn, .expand-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64D2FF;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 3px;
          padding: 2px 6px;
          cursor: pointer;
        }

        .tree-content-root {
          max-height: 320px;
          overflow: auto;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .tree-node-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 0;
          cursor: pointer;
        }

        .tree-expander { color: #64D2FF; width: 14px; display: flex; align-items: center; }
        .tree-leaf-bullet { color: var(--text-muted); width: 14px; text-align: center; }
        .node-key { color: #FFD60A; font-weight: 700; }
        .node-bracket { color: #BF5AF2; }
        .node-val { color: #30D158; }
        .node-val.string { color: #30D158; }
        .node-val.number { color: #64D2FF; }
        .node-val.boolean { color: #FF9F0A; }
        .node-type-tag {
          font-size: 8px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 4px;
          border-radius: 2px;
          color: var(--text-muted);
          margin-left: auto;
        }

        .tree-children-wrap {
          padding-left: 14px;
          border-left: 1px dashed rgba(255, 255, 255, 0.1);
          margin-left: 6px;
        }

        .schema-status-card.valid { border-left: 3px solid #30D158; }
        .schema-status-card.invalid { border-left: 3px solid #FF453A; }

        .schema-errors-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
        .schema-err-row { display: flex; align-items: center; gap: 6px; font-size: 10px; }
        .err-path { color: #FF453A; font-family: var(--font-mono); font-weight: 700; }
        .err-msg { color: var(--text-secondary); }

        .format-picker-row { display: flex; align-items: center; gap: 12px; }
        .fmt-group { display: flex; align-items: center; gap: 6px; font-size: 10.5px; }
        .fmt-label { color: var(--text-muted); }
        .fmt-select {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10.5px;
        }
      `}</style>
    </div>
  )
}
