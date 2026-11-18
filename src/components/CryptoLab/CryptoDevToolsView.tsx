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
import './CryptoDevToolsView.css'

type CryptoTab = 'jwt' | 'hashes' | 'encoders' | 'generators' | 'epoch' | 'formats' | 'keypair' | 'totp' | 'x509' | 'aes'

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
  const [jwtSecret, setJwtSecret] = useState<string>('my-256-bit-secret')
  const [jwtVerifyResult, setJwtVerifyResult] = useState<{ valid: boolean; algorithm: string; reason?: string } | null>(null)

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
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false)

  // 8. TOTP 2FA State (RFC 6238 Web Crypto HMAC-SHA1)
  const [totpSecret, setTotpSecret] = useState<string>('JBSWY3DPEHPK3PXP')
  const [totpData, setTotpData] = useState<{ code: string; remainingSeconds: number; uri: string } | null>(null)

  // 9. X.509 Certificate Inspector State (ASN.1 DER)
  const [x509Pem, setX509Pem] = useState<string>('')
  const [x509Result, setX509Result] = useState<ReturnType<typeof cryptoDevToolsService.inspectCertificate> | null>(null)

  // 10. AES-256-GCM Encrypt/Decrypt State
  const [aesPassphrase, setAesPassphrase] = useState<string>('')
  const [aesInput, setAesInput] = useState<string>('Top secret payload')
  const [aesOutput, setAesOutput] = useState<string>('')
  const [aesError, setAesError] = useState<string | null>(null)

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
    void cryptoDevToolsService.generateTotpAsync(totpSecret).then(setTotpData)
  }, [])

  useEffect(() => {
    if (activeTab !== 'totp') return
    const tick = () => void cryptoDevToolsService.generateTotpAsync(totpSecret).then(setTotpData)
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [activeTab, totpSecret])

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

  const handleGenerateKeyPair = async (type: KeyPairResult['keyType']) => {
    setIsGeneratingKey(true)
    try {
      const kp = await cryptoDevToolsService.generateKeyPairAsync(type)
      setKeyPairResult(kp)
    } finally {
      setIsGeneratingKey(false)
    }
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

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'totp' ? 'active' : ''}`}
          onClick={() => setActiveTab('totp')}
        >
          <Clock size={12} />
          <span>TOTP 2FA</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'x509' ? 'active' : ''}`}
          onClick={() => setActiveTab('x509')}
        >
          <ShieldCheck size={12} />
          <span>X.509 Cert</span>
        </button>

        <button
          className={`crypto-nav-btn glass-interactive ${activeTab === 'aes' ? 'active' : ''}`}
          onClick={() => setActiveTab('aes')}
        >
          <Lock size={12} />
          <span>AES-GCM</span>
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
              onChange={(e) => {
                handleJwtChange(e.target.value)
                setJwtVerifyResult(null)
              }}
              placeholder="Paste encoded JWT token (eyJhbGciOi...)"
              rows={3}
            />

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <input
                type="password"
                className="crypto-input glass-panel"
                style={{ flex: 1, minWidth: 160, padding: '4px 8px', fontSize: 11 }}
                placeholder="HMAC Secret for HS256/384/512 sign & verify..."
                value={jwtSecret}
                onChange={(e) => setJwtSecret(e.target.value)}
              />
              <button
                className="section-action-btn glass-interactive"
                onClick={async () => {
                  const res = await cryptoDevToolsService.verifyJwtAsync(jwtInput, jwtSecret)
                  setJwtVerifyResult(res)
                }}
              >
                <ShieldCheck size={11} /> Verify Signature
              </button>
              <button
                className="section-action-btn glass-interactive"
                onClick={async () => {
                  const payload = decodedJwt && !decodedJwt.error && Object.keys(decodedJwt.payload).length > 0
                    ? decodedJwt.payload
                    : { sub: 'usr_1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }
                  const signed = await cryptoDevToolsService.signJwtAsync(payload, jwtSecret, 'HS256')
                  handleJwtChange(signed)
                  setJwtVerifyResult({ valid: true, algorithm: 'HS256' })
                }}
              >
                <Lock size={11} /> Sign HS256
              </button>
              {jwtVerifyResult && (
                <span className={`jwt-badge ${jwtVerifyResult.valid ? 'valid' : 'expired'}`}>
                  {jwtVerifyResult.valid
                    ? `✔ Valid ${jwtVerifyResult.algorithm} Signature`
                    : `✖ Invalid: ${jwtVerifyResult.reason || 'Mismatch'}`}
                </span>
              )}
            </div>

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
              <button
                className="section-action-btn glass-interactive"
                disabled={isGeneratingKey}
                onClick={() => void handleGenerateKeyPair(keyPairType)}
              >
                <RefreshCw size={11} className={isGeneratingKey ? 'animate-spin' : ''} /> {isGeneratingKey ? 'Generating...' : 'Generate Keypair'}
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

        {/* TAB 8: RFC 6238 TOTP 2FA AUTHENTICATOR */}
        {activeTab === 'totp' && (
          <div className="crypto-section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="section-label">RFC 6238 TOTP AUTHENTICATOR (WEB CRYPTO HMAC-SHA1)</span>
            <input
              type="text"
              className="crypto-input glass-panel"
              style={{ padding: '6px 10px', fontFamily: 'monospace' }}
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="Base32 Secret (e.g. JBSWY3DPEHPK3PXP)"
            />
            {totpData && (
              <div className="glass-panel" style={{ padding: 14, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.18em', fontFamily: 'monospace', color: '#30D158' }}>
                    {totpData.code.slice(0, 3)} {totpData.code.slice(3)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                    Refreshes in {totpData.remainingSeconds}s • 30s period • SHA-1
                  </div>
                </div>
                <button className="section-action-btn glass-interactive" onClick={() => copyToClipboard(totpData.code, 'totp')}>
                  {copiedKey === 'totp' ? <Check size={12} /> : <Copy size={12} />} Copy Code
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: X.509 ASN.1 DER CERTIFICATE INSPECTOR */}
        {activeTab === 'x509' && (
          <div className="crypto-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="section-toolbar">
              <span className="section-label">X.509 CERTIFICATE INSPECTOR (ASN.1 DER)</span>
              <button
                className="section-action-btn glass-interactive"
                onClick={() => setX509Result(cryptoDevToolsService.inspectCertificate(x509Pem))}
              >
                <ShieldCheck size={11} /> Inspect PEM
              </button>
            </div>
            <textarea
              className="crypto-textarea glass-panel"
              rows={5}
              placeholder="-----BEGIN CERTIFICATE-----&#10;MII...&#10;-----END CERTIFICATE-----"
              value={x509Pem}
              onChange={(e) => {
                setX509Pem(e.target.value)
                if (e.target.value.trim()) setX509Result(cryptoDevToolsService.inspectCertificate(e.target.value))
              }}
            />
            {x509Result && (
              <div className="glass-panel" style={{ padding: 10, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Valid PEM:</strong> {x509Result.isValid ? 'Yes' : 'No'} | <strong>Expired:</strong> {x509Result.isExpired ? 'Yes' : `No (${x509Result.daysRemaining}d left)`}</div>
                <div><strong>Subject:</strong> {JSON.stringify(x509Result.subject)}</div>
                <div><strong>Issuer:</strong> {JSON.stringify(x509Result.issuer)}</div>
                <div><strong>Validity:</strong> {x509Result.validFrom} → {x509Result.validTo}</div>
                <div><strong>Algorithm:</strong> {x509Result.algorithm}</div>
                <div><strong>Serial:</strong> {x509Result.serialNumber}</div>
                <div><strong>SANs:</strong> {x509Result.san.join(', ') || 'None'}</div>
                <div style={{ wordBreak: 'break-all' }}><strong>SHA-256:</strong> {x509Result.fingerprintSha256}</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 10: AES-256-GCM ENCRYPT / DECRYPT */}
        {activeTab === 'aes' && (
          <div className="crypto-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="section-label">AES-256-GCM AUTHENTICATED ENCRYPTION (PBKDF2-SHA256)</span>
            <input
              type="password"
              className="crypto-input glass-panel"
              style={{ padding: '6px 10px' }}
              placeholder="Master Passphrase..."
              value={aesPassphrase}
              onChange={(e) => setAesPassphrase(e.target.value)}
            />
            <textarea
              className="crypto-textarea glass-panel"
              rows={4}
              placeholder="Plaintext (for Encrypt) or Base64 Ciphertext (for Decrypt)..."
              value={aesInput}
              onChange={(e) => setAesInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="section-action-btn glass-interactive"
                onClick={async () => {
                  try {
                    setAesError(null)
                    setAesOutput(await cryptoDevToolsService.aesEncryptAsync(aesInput, aesPassphrase))
                  } catch (err: any) {
                    setAesError(err?.message || 'Encryption failed')
                  }
                }}
              >
                <Lock size={11} /> Encrypt
              </button>
              <button
                className="section-action-btn glass-interactive"
                onClick={async () => {
                  try {
                    setAesError(null)
                    setAesOutput(await cryptoDevToolsService.aesDecryptAsync(aesInput, aesPassphrase))
                  } catch (err: any) {
                    setAesError(err?.message || 'Decryption failed (wrong passphrase or corrupted ciphertext)')
                  }
                }}
              >
                <Unlock size={11} /> Decrypt
              </button>
              {aesOutput && (
                <button className="section-action-btn glass-interactive" onClick={() => copyToClipboard(aesOutput, 'aes-out')}>
                  {copiedKey === 'aes-out' ? <Check size={11} /> : <Copy size={11} />} Copy Result
                </button>
              )}
            </div>
            {aesError && <div style={{ color: '#FF453A', fontSize: 11 }}>{aesError}</div>}
            <textarea className="crypto-textarea glass-panel output" rows={4} value={aesOutput} readOnly />
          </div>
        )}
      </div>

    </div>
  )
}
