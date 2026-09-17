import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Key,
  Binary,
  Clock,
  FileCode,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Hash,
  Unlock,
  Lock,
  Zap,
} from 'lucide-react'
import { cryptoDevToolsService, JwtDecoded, HashResult, EpochConverted, KeyPairResult } from '../../services/cryptoDevToolsService'

type CryptoTab = 'jwt' | 'hashes' | 'encoders' | 'generators' | 'epoch' | 'formats' | 'keypair'

interface CryptoDevToolsViewProps {
  onClose?: () => void
  isDocked?: boolean
  dockPosition?: 'right' | 'bottom'
}

export const CryptoDevToolsView: React.FC<CryptoDevToolsViewProps> = () => {
  const [activeTab, setActiveTab] = useState<CryptoTab>('jwt')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // 1. JWT State
  const [jwtInput, setJwtInput] = useState<string>('')
  const [decodedJwt, setDecodedJwt] = useState<JwtDecoded | null>(null)

  // 2. Hash State
  const [hashInput, setHashInput] = useState<string>('Hello IndoctrinatedEdit')
  const [hmacKey, setHmacKey] = useState<string>('secret_key_123')
  const [hashes, setHashes] = useState<HashResult[]>([])

  // 3. Encoder State
  const [encodeType, setEncodeType] = useState<string>('base64')
  const [encodeInput, setEncodeInput] = useState<string>('Liquid Glass Specular Engine')
  const [encodedOutput, setEncodedOutput] = useState<string>('')

  // 4. Generator State
  const [generatedUuid4, setGeneratedUuid4] = useState<string>('')
  const [generatedUuid7, setGeneratedUuid7] = useState<string>('')
  const [generatedUlid, setGeneratedUlid] = useState<string>('')
  const [generatedApiKey, setGeneratedApiKey] = useState<string>('')
  const [generatedPassword, setGeneratedPassword] = useState<string>('')

  // 5. Epoch State
  const [epochInput, setEpochInput] = useState<string>(Math.floor(Date.now() / 1000).toString())
  const [epochResult, setEpochResult] = useState<EpochConverted | null>(null)

  // 6. Format Transformer State
  const [formatFrom, setFormatFrom] = useState<'json' | 'yaml' | 'csv'>('json')
  const [formatTo, setFormatTo] = useState<'json' | 'yaml' | 'xml' | 'csv'>('yaml')
  const [formatInput, setFormatInput] = useState<string>(
    JSON.stringify(
      {
        name: 'IndoctrinatedEdit',
        version: '3.0.0',
        features: ['terminals', 'problems', 'database', 'rest', 'debug', 'crypto', 'preview'],
      },
      null,
      2
    )
  )
  const [formatOutput, setFormatOutput] = useState<string>('')

  // 7. KeyPair State
  const [keyPairType, setKeyPairType] = useState<KeyPairResult['keyType']>('RSA-2048')
  const [keyPairResult, setKeyPairResult] = useState<KeyPairResult | null>(null)

  // Initialize defaults
  useEffect(() => {
    const sampleToken = cryptoDevToolsService.generateSampleJwt()
    setJwtInput(sampleToken)
    setDecodedJwt(cryptoDevToolsService.decodeJwt(sampleToken))

    handleComputeHashes(hashInput, hmacKey)
    handleEncode(encodeInput, encodeType)
    handleGenerateAllIdentifiers()
    handleConvertEpoch(epochInput)
    handleTransformFormat(formatInput, formatFrom, formatTo)
    handleGenerateKeyPair(keyPairType)
  }, [])

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  // --- Handlers ---
  const handleJwtChange = (val: string) => {
    setJwtInput(val)
    setDecodedJwt(cryptoDevToolsService.decodeJwt(val))
  }

  const handleComputeHashes = async (text: string, key: string) => {
    const res = await cryptoDevToolsService.computeHashes(text, key)
    setHashes(res)
  }

  const handleEncode = (text: string, type: string) => {
    setEncodedOutput(cryptoDevToolsService.encode(type, text))
  }

  const handleDecode = (text: string, type: string) => {
    setEncodedOutput(cryptoDevToolsService.decode(type, text))
  }

  const handleGenerateAllIdentifiers = () => {
    setGeneratedUuid4(cryptoDevToolsService.generateUuidV4())
    setGeneratedUuid7(cryptoDevToolsService.generateUuidV7())
    setGeneratedUlid(cryptoDevToolsService.generateUlid())
    setGeneratedApiKey(cryptoDevToolsService.generateRandomApiKey())
    setGeneratedPassword(cryptoDevToolsService.generateSecurePassword())
  }

  const handleConvertEpoch = (val: string) => {
    setEpochResult(cryptoDevToolsService.convertEpoch(val))
  }

  const handleTransformFormat = (input: string, from: 'json' | 'yaml' | 'csv', to: 'json' | 'yaml' | 'xml' | 'csv') => {
    setFormatOutput(cryptoDevToolsService.transformFormat(input, from, to))
  }

  const handleGenerateKeyPair = (type: KeyPairResult['keyType']) => {
    setKeyPairResult(cryptoDevToolsService.generateKeyPair(type))
  }

  return (
    <div className="crypto-devtools-root">
      {/* Sub-Header Navigation */}
      <div
        className="crypto-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'jwt' ? 'active' : ''}`}
          onClick={() => setActiveTab('jwt')}
        >
          <ShieldCheck size={12} />
          <span>JWT Inspector</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'hashes' ? 'active' : ''}`}
          onClick={() => setActiveTab('hashes')}
        >
          <Hash size={12} />
          <span>Hashes & HMAC</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'encoders' ? 'active' : ''}`}
          onClick={() => setActiveTab('encoders')}
        >
          <Binary size={12} />
          <span>Encoders / Decoders</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'generators' ? 'active' : ''}`}
          onClick={() => setActiveTab('generators')}
        >
          <Zap size={12} />
          <span>UUID / Keys</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'epoch' ? 'active' : ''}`}
          onClick={() => setActiveTab('epoch')}
        >
          <Clock size={12} />
          <span>Epoch Time</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'formats' ? 'active' : ''}`}
          onClick={() => setActiveTab('formats')}
        >
          <FileCode size={12} />
          <span>Data Transformers</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'keypair' ? 'active' : ''}`}
          onClick={() => setActiveTab('keypair')}
        >
          <Key size={12} />
          <span>RSA / KeyPair</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="crypto-body-viewport">
        {/* TAB 1: JWT INSPECTOR */}
        {activeTab === 'jwt' && (
          <div className="crypto-section jwt-section">
            <div className="section-toolbar">
              <span className="section-label">ENCODED JSON WEB TOKEN</span>
              <button
                className="section-action-btn glass-interactive"
                onClick={() => {
                  const sample = cryptoDevToolsService.generateSampleJwt()
                  handleJwtChange(sample)
                }}
              >
                <Sparkles size={11} /> Generate Sample
              </button>
            </div>

            <textarea
              className="crypto-textarea jwt-raw-input glass-panel"
              value={jwtInput}
              onChange={(e) => handleJwtChange(e.target.value)}
              placeholder="Paste encoded JWT token (eyJhbGciOi...)"
              rows={3}
            />

            {decodedJwt && (
              <div className="jwt-analysis-grid">
                {/* Status Badges */}
                <div className="jwt-status-row">
                  {decodedJwt.error ? (
                    <span className="jwt-badge error">❌ {decodedJwt.error}</span>
                  ) : (
                    <>
                      <span className={`jwt-badge ${decodedJwt.isExpired ? 'expired' : 'valid'}`}>
                        {decodedJwt.isExpired ? '⛔ EXPIRED TOKEN' : '✔ ACTIVE TOKEN'}
                      </span>
                      {decodedJwt.expiresAt && (
                        <span className="jwt-info-chip">
                          Expires: {decodedJwt.expiresAt.toLocaleTimeString()}
                        </span>
                      )}
                      {decodedJwt.subject && (
                        <span className="jwt-info-chip">Sub: {decodedJwt.subject}</span>
                      )}
                    </>
                  )}
                </div>

                {/* Header & Payload Cards */}
                <div className="jwt-cards-container">
                  <div className="jwt-card header-card glass-panel">
                    <div className="jwt-card-header">
                      <span>HEADER: Algorithm & Type</span>
                      <button
                        className="copy-chip"
                        onClick={() => copyToClipboard(JSON.stringify(decodedJwt.header, null, 2), 'jwt-header')}
                      >
                        {copiedKey === 'jwt-header' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <pre className="jwt-json-pre">{JSON.stringify(decodedJwt.header, null, 2)}</pre>
                  </div>

                  <div className="jwt-card payload-card glass-panel">
                    <div className="jwt-card-header">
                      <span>PAYLOAD: Data Claims</span>
                      <button
                        className="copy-chip"
                        onClick={() => copyToClipboard(JSON.stringify(decodedJwt.payload, null, 2), 'jwt-payload')}
                      >
                        {copiedKey === 'jwt-payload' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <pre className="jwt-json-pre">{JSON.stringify(decodedJwt.payload, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HASHES & HMAC */}
        {activeTab === 'hashes' && (
          <div className="crypto-section hashes-section">
            <div className="input-group">
              <label className="field-label">RAW INPUT TEXT</label>
              <input
                type="text"
                className="crypto-input glass-panel"
                value={hashInput}
                onChange={(e) => {
                  setHashInput(e.target.value)
                  handleComputeHashes(e.target.value, hmacKey)
                }}
                placeholder="Enter string to hash..."
              />
            </div>

            <div className="input-group">
              <label className="field-label">HMAC SECRET KEY (OPTIONAL)</label>
              <input
                type="text"
                className="crypto-input glass-panel"
                value={hmacKey}
                onChange={(e) => {
                  setHmacKey(e.target.value)
                  handleComputeHashes(hashInput, e.target.value)
                }}
                placeholder="Enter HMAC Secret..."
              />
            </div>

            <div className="hashes-results-list">
              {hashes.map((item) => (
                <div key={item.algorithm} className="hash-row-card glass-panel">
                  <div className="hash-meta">
                    <span className="hash-algo-name">{item.algorithm}</span>
                    <span className="hash-latency">{item.latencyMs}ms</span>
                  </div>
                  <div className="hash-value-wrapper">
                    <code className="hash-code">{item.hash}</code>
                    <button
                      className="copy-hash-btn glass-interactive"
                      onClick={() => copyToClipboard(item.hash, item.algorithm)}
                      title="Copy Hash"
                    >
                      {copiedKey === item.algorithm ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ENCODERS & DECODERS */}
        {activeTab === 'encoders' && (
          <div className="crypto-section encoders-section">
            <div className="encoder-type-selector">
              {['base64', 'base64url', 'hex', 'url', 'html', 'binary', 'ascii', 'rot13', 'morse'].map((t) => (
                <button
                  key={t}
                  className={`enc-type-pill glass-interactive ${encodeType === t ? 'active' : ''}`}
                  onClick={() => {
                    setEncodeType(t)
                    handleEncode(encodeInput, t)
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="encoder-io-grid">
              <div className="io-box">
                <div className="io-header">
                  <span>INPUT TEXT</span>
                  <button className="io-action-btn" onClick={() => handleEncode(encodeInput, encodeType)}>
                    <Lock size={11} /> Encode ➔
                  </button>
                </div>
                <textarea
                  className="crypto-textarea glass-panel"
                  value={encodeInput}
                  onChange={(e) => {
                    setEncodeInput(e.target.value)
                    handleEncode(e.target.value, encodeType)
                  }}
                  rows={5}
                />
              </div>

              <div className="io-box">
                <div className="io-header">
                  <span>RESULT ({encodeType.toUpperCase()})</span>
                  <div className="io-actions-right">
                    <button className="io-action-btn" onClick={() => handleDecode(encodedOutput, encodeType)}>
                      <Unlock size={11} /> Decode ➔
                    </button>
                    <button className="copy-chip" onClick={() => copyToClipboard(encodedOutput, 'enc-out')}>
                      {copiedKey === 'enc-out' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>
                <textarea className="crypto-textarea glass-panel output" value={encodedOutput} readOnly rows={5} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: UUID & KEYS */}
        {activeTab === 'generators' && (
          <div className="crypto-section generators-section">
            <div className="section-toolbar">
              <span className="section-label">CRYPTOGRAPHIC IDENTIFIERS</span>
              <button className="section-action-btn glass-interactive" onClick={handleGenerateAllIdentifiers}>
                <RefreshCw size={11} /> Regenerate All
              </button>
            </div>

            <div className="generator-item-card glass-panel">
              <div className="gen-label-row">
                <span className="gen-title">UUID v4 (Random Cryptographic)</span>
                <button className="copy-chip" onClick={() => copyToClipboard(generatedUuid4, 'uuid4')}>
                  {copiedKey === 'uuid4' ? <Check size={10} /> : <Copy size={10} />}
                </button>
              </div>
              <code className="gen-code">{generatedUuid4}</code>
            </div>

            <div className="generator-item-card glass-panel">
              <div className="gen-label-row">
                <span className="gen-title">UUID v7 (Time-Ordered Monotonic)</span>
                <button className="copy-chip" onClick={() => copyToClipboard(generatedUuid7, 'uuid7')}>
                  {copiedKey === 'uuid7' ? <Check size={10} /> : <Copy size={10} />}
                </button>
              </div>
              <code className="gen-code">{generatedUuid7}</code>
            </div>

            <div className="generator-item-card glass-panel">
              <div className="gen-label-row">
                <span className="gen-title">ULID (Universally Unique Lexicographically Sortable)</span>
                <button className="copy-chip" onClick={() => copyToClipboard(generatedUlid, 'ulid')}>
                  {copiedKey === 'ulid' ? <Check size={10} /> : <Copy size={10} />}
                </button>
              </div>
              <code className="gen-code">{generatedUlid}</code>
            </div>

            <div className="generator-item-card glass-panel">
              <div className="gen-label-row">
                <span className="gen-title">API Secret Key (32-Char High Entropy)</span>
                <button className="copy-chip" onClick={() => copyToClipboard(generatedApiKey, 'apikey')}>
                  {copiedKey === 'apikey' ? <Check size={10} /> : <Copy size={10} />}
                </button>
              </div>
              <code className="gen-code">{generatedApiKey}</code>
            </div>

            <div className="generator-item-card glass-panel">
              <div className="gen-label-row">
                <span className="gen-title">Cryptographic Secure Password</span>
                <button className="copy-chip" onClick={() => copyToClipboard(generatedPassword, 'pwd')}>
                  {copiedKey === 'pwd' ? <Check size={10} /> : <Copy size={10} />}
                </button>
              </div>
              <code className="gen-code">{generatedPassword}</code>
            </div>
          </div>
        )}

        {/* TAB 5: EPOCH TIME MACHINE */}
        {activeTab === 'epoch' && (
          <div className="crypto-section epoch-section">
            <div className="input-group">
              <div className="section-toolbar">
                <label className="field-label">UNIX TIMESTAMP / EPOCH</label>
                <button
                  className="section-action-btn glass-interactive"
                  onClick={() => {
                    const nowSec = Math.floor(Date.now() / 1000).toString()
                    setEpochInput(nowSec)
                    handleConvertEpoch(nowSec)
                  }}
                >
                  <Clock size={11} /> Freeze "Now"
                </button>
              </div>
              <input
                type="text"
                className="crypto-input glass-panel"
                value={epochInput}
                onChange={(e) => {
                  setEpochInput(e.target.value)
                  handleConvertEpoch(e.target.value)
                }}
                placeholder="e.g. 1789500000"
              />
            </div>

            {epochResult && (
              <div className="epoch-cards-grid">
                <div className="epoch-card glass-panel">
                  <span className="epoch-label">ISO 8601</span>
                  <code className="epoch-val">{epochResult.iso8601}</code>
                </div>
                <div className="epoch-card glass-panel">
                  <span className="epoch-label">UTC Time</span>
                  <code className="epoch-val">{epochResult.utcString}</code>
                </div>
                <div className="epoch-card glass-panel">
                  <span className="epoch-label">Local Time</span>
                  <code className="epoch-val">{epochResult.localString}</code>
                </div>
                <div className="epoch-card glass-panel">
                  <span className="epoch-label">Relative Offset</span>
                  <span className="epoch-relative">{epochResult.relativeTime}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DATA TRANSFORMERS */}
        {activeTab === 'formats' && (
          <div className="crypto-section formats-section">
            <div className="format-controls-row">
              <div className="format-picker">
                <span>From:</span>
                {(['json', 'yaml', 'csv'] as const).map((f) => (
                  <button
                    key={f}
                    className={`format-pill ${formatFrom === f ? 'active' : ''}`}
                    onClick={() => {
                      setFormatFrom(f)
                      handleTransformFormat(formatInput, f, formatTo)
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="format-arrow">➔</span>
              <div className="format-picker">
                <span>To:</span>
                {(['json', 'yaml', 'xml', 'csv'] as const).map((f) => (
                  <button
                    key={f}
                    className={`format-pill ${formatTo === f ? 'active' : ''}`}
                    onClick={() => {
                      setFormatTo(f)
                      handleTransformFormat(formatInput, formatFrom, f)
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="encoder-io-grid">
              <div className="io-box">
                <div className="io-header">
                  <span>INPUT ({formatFrom.toUpperCase()})</span>
                </div>
                <textarea
                  className="crypto-textarea glass-panel"
                  value={formatInput}
                  onChange={(e) => {
                    setFormatInput(e.target.value)
                    handleTransformFormat(e.target.value, formatFrom, formatTo)
                  }}
                  rows={7}
                />
              </div>

              <div className="io-box">
                <div className="io-header">
                  <span>OUTPUT ({formatTo.toUpperCase()})</span>
                  <button className="copy-chip" onClick={() => copyToClipboard(formatOutput, 'format-out')}>
                    {copiedKey === 'format-out' ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                </div>
                <textarea className="crypto-textarea glass-panel output" value={formatOutput} readOnly rows={7} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: KEYPAIR GENERATOR */}
        {activeTab === 'keypair' && (
          <div className="crypto-section keypair-section">
            <div className="section-toolbar">
              <div className="keypair-type-picker">
                {(['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'Ed25519'] as const).map((k) => (
                  <button
                    key={k}
                    className={`format-pill ${keyPairType === k ? 'active' : ''}`}
                    onClick={() => {
                      setKeyPairType(k)
                      handleGenerateKeyPair(k)
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button className="section-action-btn glass-interactive" onClick={() => handleGenerateKeyPair(keyPairType)}>
                <RefreshCw size={11} /> Generate Keypair
              </button>
            </div>

            {keyPairResult && (
              <div className="keypair-display-grid">
                <div className="key-box glass-panel">
                  <div className="io-header">
                    <span>PUBLIC KEY ({keyPairResult.keyType})</span>
                    <button className="copy-chip" onClick={() => copyToClipboard(keyPairResult.publicKey, 'pubkey')}>
                      {copiedKey === 'pubkey' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <pre className="key-pre">{keyPairResult.publicKey}</pre>
                </div>

                <div className="key-box glass-panel">
                  <div className="io-header">
                    <span>PRIVATE KEY ({keyPairResult.keyType})</span>
                    <button className="copy-chip" onClick={() => copyToClipboard(keyPairResult.privateKey, 'privkey')}>
                      {copiedKey === 'privkey' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <pre className="key-pre">{keyPairResult.privateKey}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .crypto-devtools-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .crypto-subnav-strip {
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

        .crypto-subnav-strip::-webkit-scrollbar {
          display: none;
        }

        .crypto-nav-btn {
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
          transition: all var(--transition-fast);
        }

        .crypto-nav-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .crypto-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.3);
        }

        .crypto-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
        }

        .crypto-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-label, .field-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }

        .section-action-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          font-size: 10.5px;
          font-weight: 600;
          color: #64D2FF;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .crypto-textarea, .crypto-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11.5px;
          outline: none;
          box-sizing: border-box;
        }

        .crypto-textarea:focus, .crypto-input:focus {
          border-color: rgba(10, 132, 255, 0.5);
        }

        .jwt-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .jwt-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .jwt-badge.valid {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.35);
        }

        .jwt-badge.expired, .jwt-badge.error {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
          border: 1px solid rgba(255, 69, 58, 0.35);
        }

        .jwt-info-chip {
          font-size: 10.5px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .jwt-cards-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .jwt-card {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .jwt-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 700;
          color: #64D2FF;
          margin-bottom: 6px;
        }

        .jwt-json-pre, .key-pre {
          font-family: var(--font-mono);
          font-size: 11px;
          color: #E2E8F0;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .copy-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }

        .copy-chip:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFF;
        }

        .hashes-results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hash-row-card {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hash-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .hash-algo-name {
          font-size: 10.5px;
          font-weight: 800;
          color: #BF5AF2;
        }

        .hash-latency {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .hash-value-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .hash-code {
          font-family: var(--font-mono);
          font-size: 11px;
          color: #FFF;
          word-break: break-all;
        }

        .copy-hash-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          flex-shrink: 0;
        }

        .copy-hash-btn:hover {
          color: #FFF;
        }

        .encoder-type-selector {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .enc-type-pill, .format-pill {
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .enc-type-pill.active, .format-pill.active {
          background: rgba(48, 209, 88, 0.2);
          border-color: rgba(48, 209, 88, 0.4);
          color: #30D158;
        }

        .encoder-io-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .io-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .io-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64D2FF;
          background: none;
          border: none;
          cursor: pointer;
        }

        .generator-item-card {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .gen-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gen-title {
          font-size: 10px;
          font-weight: 700;
          color: #FFD60A;
        }

        .gen-code {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: #FFF;
        }

        .epoch-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .epoch-card {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .epoch-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .epoch-val {
          font-family: var(--font-mono);
          font-size: 11px;
          color: #64D2FF;
        }

        .epoch-relative {
          font-size: 11.5px;
          font-weight: 600;
          color: #30D158;
        }

        .format-controls-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
        }

        .format-picker {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .format-arrow {
          color: var(--text-muted);
        }

        .keypair-display-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .key-box {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </div>
  )
}
