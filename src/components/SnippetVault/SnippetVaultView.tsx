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
import './SnippetVaultView.css'

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
    setNewTags('')
    setActiveTab('snippets')
  }

  const handleDeleteSnippet = (id: string) => {
    snippetVaultService.deleteCustomSnippet(id)
    setSnippets(snippetVaultService.getAllSnippets())
  }

  const availableLanguages = Array.from(
    new Set(['all', ...snippets.map((s) => s.language.toLowerCase())])
  )

  const filteredSnippets = snippets.filter((s) => {
    const matchesLang = selectedLang === 'all' || s.language.toLowerCase() === selectedLang.toLowerCase()
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
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

    </div>
  )
}
