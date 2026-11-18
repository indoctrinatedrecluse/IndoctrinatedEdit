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
import './JsonStudioView.css'

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

  // Expanded Tree Nodes (matches buildJsonTree root id "$_root")
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ $_root: true })

  // Parse JSON data safely (supports falsy valid JSON: false, 0, "", null)
  const parsedState = useMemo<{ ok: boolean; value: any }>(() => {
    try {
      return { ok: true, value: JSON.parse(rawJson) }
    } catch {
      return { ok: false, value: null }
    }
  }, [rawJson])
  const parsedData = parsedState.ok ? parsedState.value : undefined

  // JQ query result
  const jqResult = useMemo(() => {
    if (!parsedState.ok) return { result: null, executionTimeMs: 0, error: 'Invalid JSON input' }
    return jsonStudioService.queryJq(parsedState.value, jqQuery)
  }, [parsedState, jqQuery])

  // Tree structure
  const treeRoot = useMemo(() => {
    if (!parsedState.ok) return null
    return jsonStudioService.buildJsonTree(parsedState.value)
  }, [parsedState])

  // Schema validation result
  const schemaValidation: JsonSchemaValidationResult = useMemo(() => {
    if (!parsedState.ok) return { isValid: false, errors: [{ path: '$', message: 'Invalid JSON payload' }] }
    try {
      const schemaObj = JSON.parse(schemaText)
      return jsonStudioService.validateJsonSchema(parsedState.value, schemaObj)
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

    </div>
  )
}
