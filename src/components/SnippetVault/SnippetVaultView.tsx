import React, { useState } from 'react'
import {
  Bookmark,
  Search,
  Plus,
  Copy,
  Check,
  FileEdit,
  Trash2,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { snippetVaultService, CodeSnippet } from '../../services/snippetVaultService'

interface SnippetVaultViewProps {
  onInsertSnippet?: (code: string) => void
}

export const SnippetVaultView: React.FC<SnippetVaultViewProps> = ({
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'snippets' | 'scratchpad' | 'new'>('snippets')
  const [selectedLang, setSelectedLang] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [snippets, setSnippets] = useState<CodeSnippet[]>(() => snippetVaultService.getAllSnippets())
  const [scratchpad, setScratchpad] = useState<string>(() => snippetVaultService.getScratchpad())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New Snippet Form
  const [newTitle, setNewTitle] = useState('')
  const [newLang, setNewLang] = useState('typescript')
  const [newDesc, setNewDesc] = useState('')
  const [newTags, setNewTags] = useState('custom')
  const [newCode, setNewCode] = useState('')

  const handleScratchpadChange = (text: string) => {
    setScratchpad(text)
    snippetVaultService.saveScratchpad(text)
  }

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleCreateSnippet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newCode.trim()) return

    snippetVaultService.addCustomSnippet({
      title: newTitle.trim(),
      language: newLang.trim(),
      description: newDesc.trim() || 'Custom user snippet',
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      code: newCode.trim(),
    })

    setSnippets(snippetVaultService.getAllSnippets())
    setNewTitle('')
    setNewDesc('')
    setNewCode('')
    setActiveTab('snippets')
  }

  const handleDeleteSnippet = (id: string) => {
    snippetVaultService.deleteCustomSnippet(id)
    setSnippets(snippetVaultService.getAllSnippets())
  }

  const filteredSnippets = snippets.filter((s) => {
    const matchesLang = selectedLang === 'all' || s.language.toLowerCase() === selectedLang.toLowerCase()
    const matchesQuery = !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesLang && matchesQuery
  })

  return (
    <div className="snippet-vault-root">
      {/* Sub-Nav Strip */}
      <div
        className="vault-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`vault-nav-btn glass-interactive ${activeTab === 'snippets' ? 'active' : ''}`}
          onClick={() => setActiveTab('snippets')}
        >
          <Bookmark size={12} />
          <span>Snippets ({snippets.length})</span>
        </button>

        <button
          className={`vault-nav-btn glass-interactive ${activeTab === 'scratchpad' ? 'active' : ''}`}
          onClick={() => setActiveTab('scratchpad')}
        >
          <FileEdit size={12} />
          <span>Scratchpad</span>
        </button>

        <button
          className={`vault-nav-btn glass-interactive ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <Plus size={12} />
          <span>New Snippet</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="vault-body-viewport">
        {/* TAB 1: SNIPPET VAULT */}
        {activeTab === 'snippets' && (
          <div className="snippets-section">
            {/* Search & Language Filters */}
            <div className="search-filter-box glass-panel">
              <div className="search-input-wrapper">
                <Search size={12} className="search-icon" />
                <input
                  type="text"
                  className="vault-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search snippets & tags..."
                />
              </div>

              <div
                className="lang-chips-strip"
                onWheel={(e) => {
                  e.currentTarget.scrollLeft += e.deltaY
                }}
              >
                {['all', 'typescript', 'python', 'rust', 'sql', 'shell'].map((l) => (
                  <button
                    key={l}
                    className={`lang-chip ${selectedLang === l ? 'active' : ''}`}
                    onClick={() => setSelectedLang(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Snippets List */}
            <div className="snippets-list">
              {filteredSnippets.length === 0 ? (
                <div className="empty-state">No matching snippets found.</div>
              ) : (
                filteredSnippets.map((s) => (
                  <div key={s.id} className="snippet-card glass-panel">
                    <div className="snippet-card-header">
                      <div className="snippet-title-group">
                        <span className="snippet-title">{s.title}</span>
                        <span className="snippet-lang-tag">{s.language}</span>
                        {s.isCustom && <span className="custom-badge">CUSTOM</span>}
                      </div>

                      <div className="snippet-actions">
                        {onInsertSnippet && (
                          <button
                            className="snippet-tool-btn glass-interactive"
                            onClick={() => onInsertSnippet(s.code)}
                            title="Insert into active editor"
                          >
                            <ArrowRight size={11} /> Insert
                          </button>
                        )}
                        <button
                          className="snippet-tool-btn glass-interactive"
                          onClick={() => handleCopy(s.code, s.id)}
                          title="Copy snippet"
                        >
                          {copiedId === s.id ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                        </button>
                        {s.isCustom && (
                          <button
                            className="snippet-tool-btn delete glass-interactive"
                            onClick={() => handleDeleteSnippet(s.id)}
                            title="Delete custom snippet"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="snippet-desc">{s.description}</p>

                    <pre className="snippet-code-pre">
                      <code>{s.code}</code>
                    </pre>

                    <div className="snippet-tags-row">
                      {s.tags.map((t) => (
                        <span key={t} className="tag-pill">
                          <Tag size={9} /> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSISTENT SCRATCHPAD */}
        {activeTab === 'scratchpad' && (
          <div className="scratchpad-section">
            <div className="scratchpad-header glass-panel">
              <span className="scratch-title">PERSISTENT SCRATCHPAD (AUTO-SAVED)</span>
              <button
                className="copy-scratch-btn glass-interactive"
                onClick={() => handleCopy(scratchpad, 'scratchpad')}
              >
                {copiedId === 'scratchpad' ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                <span>{copiedId === 'scratchpad' ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>
            <textarea
              className="scratchpad-textarea glass-panel"
              value={scratchpad}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Paste temporary notes, quick JSON payloads, code snippets, or scratch markdown here. Stored automatically..."
              rows={16}
            />
          </div>
        )}

        {/* TAB 3: CREATE CUSTOM SNIPPET */}
        {activeTab === 'new' && (
          <form className="new-snippet-form glass-panel" onSubmit={handleCreateSnippet}>
            <div className="form-title">CREATE NEW CODE SNIPPET</div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                className="form-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Robust Axios Interceptor"
                required
              />
            </div>

            <div className="form-group">
              <label>Language</label>
              <select
                className="form-input"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="sql">SQL</option>
                <option value="shell">Shell / Bash</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                className="form-input"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Short description of what this snippet does..."
              />
            </div>

            <div className="form-group">
              <label>Tags (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="api, auth, helper"
              />
            </div>

            <div className="form-group">
              <label>Code</label>
              <textarea
                className="form-input form-textarea"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Paste code snippet here..."
                rows={6}
                required
              />
            </div>

            <button type="submit" className="save-snippet-btn glass-interactive">
              <Plus size={12} /> Save to Snippet Vault
            </button>
          </form>
        )}
      </div>

      <style>{`
        .snippet-vault-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .vault-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .vault-nav-btn {
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
          white-space: nowrap;
          flex-shrink: 0;
        }

        .vault-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
        }

        .vault-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .search-filter-box {
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xs);
          padding: 4px 8px;
        }

        .search-icon { color: var(--text-muted); flex-shrink: 0; }

        .vault-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 11px;
        }

        .lang-chips-strip {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .lang-chip {
          font-size: 9.5px;
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lang-chip.active {
          background: rgba(10, 132, 255, 0.25);
          color: #64D2FF;
          border-color: rgba(10, 132, 255, 0.45);
        }

        .snippets-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .snippet-card {
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .snippet-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .snippet-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .snippet-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFF;
        }

        .snippet-lang-tag {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(10, 132, 255, 0.15);
          color: #64D2FF;
          font-weight: 700;
        }

        .custom-badge {
          font-size: 8.5px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 214, 10, 0.15);
          color: #FFD60A;
          font-weight: 700;
        }

        .snippet-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .snippet-tool-btn {
          font-size: 9.5px;
          padding: 3px 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .snippet-tool-btn.delete:hover {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
        }

        .snippet-desc {
          margin: 0;
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .snippet-code-pre {
          margin: 0;
          padding: 8px;
          background: rgba(0, 0, 0, 0.45);
          border-radius: var(--radius-xs);
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: #E2E8F0;
          overflow-x: auto;
          max-height: 120px;
        }

        .snippet-tags-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .tag-pill {
          font-size: 9px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 5px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* Scratchpad Styling */
        .scratchpad-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scratchpad-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .copy-scratch-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64D2FF;
          background: none;
          border: none;
          cursor: pointer;
        }

        .scratchpad-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 10px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11.5px;
          outline: none;
          resize: vertical;
        }

        /* New Snippet Form */
        .new-snippet-form {
          padding: 12px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-title {
          font-size: 11px;
          font-weight: 800;
          color: #64D2FF;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .form-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xs);
          padding: 6px 8px;
          color: #FFF;
          font-size: 11px;
          outline: none;
        }

        .form-textarea {
          font-family: var(--font-mono);
          resize: vertical;
        }

        .save-snippet-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: var(--radius-xs);
          background: rgba(10, 132, 255, 0.3);
          border: 1px solid rgba(10, 132, 255, 0.5);
          color: #FFF;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
