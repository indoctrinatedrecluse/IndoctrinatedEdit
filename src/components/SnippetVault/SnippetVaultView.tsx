import React, { useState, useMemo } from 'react'
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
  Sparkles,
} from 'lucide-react'
import { snippetVaultService, CodeSnippet } from '../../services/snippetVaultService'
import './SnippetVaultView.css'

interface SnippetVaultViewProps {
  activeFileName?: string
  onInsertSnippet?: (code: string) => void
}

export const SnippetVaultView: React.FC<SnippetVaultViewProps> = ({
  activeFileName,
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'snippets' | 'scratchpad' | 'new'>('snippets')
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'builtin'>('all')
  const [selectedLang, setSelectedLang] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [snippets, setSnippets] = useState<CodeSnippet[]>(() => snippetVaultService.getAllSnippets())
  const [scratchpad, setScratchpad] = useState<string>(() => snippetVaultService.getScratchpad())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New / Edit Snippet Form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newLang, setNewLang] = useState('typescript')
  const [newDesc, setNewDesc] = useState('')
  const [newTags, setNewTags] = useState('custom')
  const [newCode, setNewCode] = useState('')
  const [ioNotice, setIoNotice] = useState<string>('')

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

    const payload = {
      title: newTitle.trim(),
      language: newLang.trim(),
      description: newDesc.trim() || 'Custom user snippet',
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      code: newCode.trim(),
    }

    if (editingId) {
      snippetVaultService.updateCustomSnippet(editingId, payload)
      setEditingId(null)
    } else {
      snippetVaultService.addCustomSnippet(payload)
    }

    setSnippets(snippetVaultService.getAllSnippets())
    setNewTitle('')
    setNewDesc('')
    setNewCode('')
    setNewTags('custom')
    setActiveTab('snippets')
  }

  const handleEditSnippet = (s: CodeSnippet) => {
    setEditingId(s.id)
    setNewTitle(s.title)
    setNewLang(s.language)
    setNewDesc(s.description)
    setNewTags(s.tags.join(', '))
    setNewCode(s.code)
    setActiveTab('new')
  }

  const handleExportCodeSnippets = () => {
    const json = snippetVaultService.exportVsCodeSnippets(false)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'indoctrinated.code-snippets'
    a.click()
    URL.revokeObjectURL(url)
    setIoNotice('Exported .code-snippets file')
    setTimeout(() => setIoNotice(''), 2500)
  }

  const handleImportCodeSnippets = async () => {
    if (window.electronAPI?.openFileDialog) {
      const opened = await window.electronAPI.openFileDialog()
      if (!opened) return
      const res = snippetVaultService.importVsCodeSnippets(opened.content)
      setSnippets(snippetVaultService.getAllSnippets())
      setIoNotice(res.error ? `Import error: ${res.error}` : `Imported ${res.importedCount} snippet(s)`)
      setTimeout(() => setIoNotice(''), 3000)
      return
    }
    // Browser / Web fallback using hidden <input type="file">
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.code-snippets'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const res = snippetVaultService.importVsCodeSnippets(text)
      setSnippets(snippetVaultService.getAllSnippets())
      setIoNotice(res.error ? `Import error: ${res.error}` : `Imported ${res.importedCount} snippet(s)`)
      setTimeout(() => setIoNotice(''), 3000)
    }
    input.click()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setNewTitle('')
    setNewDesc('')
    setNewCode('')
    setNewTags('custom')
    setActiveTab('snippets')
  }

  const handleDeleteSnippet = (id: string) => {
    snippetVaultService.deleteCustomSnippet(id)
    setSnippets(snippetVaultService.getAllSnippets())
  }

  const availableLanguages = Array.from(
    new Set(['all', ...snippets.map((s) => s.language.toLowerCase())])
  )

  const filteredSnippets = useMemo(() => {
    return snippetVaultService.filterSnippets({
      type: typeFilter,
      language: selectedLang,
      query: searchQuery,
    })
  }, [snippets, typeFilter, selectedLang, searchQuery])

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
          onClick={() => {
            setEditingId(null)
            setActiveTab('new')
          }}
        >
          <Plus size={12} />
          <span>{editingId ? 'Edit Snippet' : 'New Snippet'}</span>
        </button>

        <button
          className="vault-nav-btn glass-interactive"
          onClick={handleImportCodeSnippets}
          title="Import VS Code .code-snippets JSON file"
        >
          <span>Import JSON</span>
        </button>
        <button
          className="vault-nav-btn glass-interactive"
          onClick={handleExportCodeSnippets}
          title="Export all snippets as VS Code .code-snippets"
        >
          <span>Export JSON</span>
        </button>
      </div>
      {ioNotice && (
        <div style={{ padding: '4px 10px', fontSize: '0.7rem', color: '#30D158', background: 'rgba(48, 209, 88, 0.1)', borderBottom: '1px solid rgba(48, 209, 88, 0.25)' }}>
          {ioNotice}
        </div>
      )}

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

              {/* Type Filter Pills */}
              <div style={{ display: 'flex', gap: 6, margin: '6px 0 2px 0' }}>
                {(['all', 'custom', 'builtin'] as const).map((t) => (
                  <button
                    key={t}
                    className={`lang-chip ${typeFilter === t ? 'active' : ''}`}
                    style={{ fontSize: '0.66rem', padding: '2px 8px' }}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === 'all' ? 'ALL SOURCES' : t.toUpperCase()}
                  </button>
                ))}
              </div>

              <div
                className="lang-chips-strip"
                onWheel={(e) => {
                  e.currentTarget.scrollLeft += e.deltaY
                }}
              >
                {availableLanguages.map((l) => (
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
                          <>
                            <button
                              className="snippet-tool-btn glass-interactive"
                              onClick={() => onInsertSnippet(s.code)}
                              title="Insert raw code into active editor"
                            >
                              <ArrowRight size={11} /> Insert
                            </button>
                            <button
                              className="snippet-tool-btn glass-interactive"
                              onClick={() =>
                                onInsertSnippet(
                                  snippetVaultService.expandSnippetVariables(s.code, {
                                    fileName: activeFileName,
                                  })
                                )
                              }
                              title="Expand tokens ($CURRENT_YEAR, $UUID, etc.) and insert"
                              style={{ color: '#0A84FF' }}
                            >
                              <Sparkles size={11} /> Expand
                            </button>
                          </>
                        )}
                        <button
                          className="snippet-tool-btn glass-interactive"
                          onClick={() => handleCopy(s.code, s.id)}
                          title="Copy snippet"
                        >
                          {copiedId === s.id ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                        </button>
                        {s.isCustom && (
                          <>
                            <button
                              className="snippet-tool-btn glass-interactive"
                              onClick={() => handleEditSnippet(s)}
                              title="Edit custom snippet"
                            >
                              <FileEdit size={11} />
                            </button>
                            <button
                              className="snippet-tool-btn delete glass-interactive"
                              onClick={() => handleDeleteSnippet(s.id)}
                              title="Delete custom snippet"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="snippet-desc">{s.description}</p>

                    <pre className="snippet-code-pre">
                      <code>{s.code}</code>
                    </pre>

                    <div className="snippet-tags-row">
                      {Array.from(new Set(s.tags)).map((t, tIdx) => (
                        <span key={`${t}-${tIdx}`} className="tag-pill">
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
            <div className="form-title">{editingId ? 'EDIT CUSTOM SNIPPET' : 'CREATE NEW CODE SNIPPET'}</div>

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

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="save-snippet-btn glass-interactive" style={{ flex: 1 }}>
                <Plus size={12} /> {editingId ? 'Update Snippet' : 'Save to Snippet Vault'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="save-snippet-btn glass-interactive"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

    </div>
  )
}
