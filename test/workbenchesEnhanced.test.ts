import { describe, it, expect } from 'vitest'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'
import { dockerService } from '../src/services/dockerService'
import { previewService } from '../src/services/previewService'

describe('Enhanced Workbench Capabilities', () => {
  it('generates TOTP 2FA authentication tokens (RFC 6238)', () => {
    const totp = cryptoDevToolsService.generateTotp('JBSWY3DPEHPK3PXP')
    expect(totp.code.length).toBe(6)
    expect(totp.remainingSeconds).toBeGreaterThan(0)
    expect(totp.uri).toContain('otpauth://totp/')
  })

  it('inspects X.509 certificates and SAN domains', () => {
    const pem = `-----BEGIN CERTIFICATE-----
MIIEkjCCA3qgAwIBAgIUD3...
-----END CERTIFICATE-----`
    const cert = cryptoDevToolsService.inspectCertificate(pem)
    expect(cert.isValid).toBe(true)
    expect(cert.subject.commonName).toBeDefined()
    expect(cert.san.length).toBeGreaterThan(0)
    expect(cert.daysRemaining).toBeGreaterThan(0)
  })

  it('generates Kubernetes Deployment and Service manifests', () => {
    const k8s = dockerService.generateKubernetesManifest('my-microservice', 'my-repo/image:v1', 8080)
    expect(k8s).toContain('kind: Deployment')
    expect(k8s).toContain('kind: Service')
    expect(k8s).toContain('my-microservice')
  })

  it('lints Dockerfile for security best practices', () => {
    const dockerfile = `FROM node:latest
RUN sudo apt-get install curl
ADD src.tar.gz /app
CMD ["node", "index.js"]`

    const issues = dockerService.lintDockerfile(dockerfile)
    expect(issues.some((i) => i.rule === 'avoid-latest-tag')).toBe(true)
    expect(issues.some((i) => i.rule === 'no-sudo')).toBe(true)
  })

  it('detects and minifies SVG vector files in previewService', () => {
    expect(previewService.getPreviewType('logo.svg')).toBe('svg')
    const rawSvg = `
      <svg width="100" height="100">
        <!-- Comment -->
        <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      </svg>
    `
    const minified = previewService.minifySvg(rawSvg)
    expect(minified).not.toContain('<!-- Comment -->')
    expect(minified).toContain('<svg width="100"')
  })
})
