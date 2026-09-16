import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { phpExtensionManifest } from '../src/extensions/phpSupport/phpExtension'
import { phpSnippets } from '../src/extensions/phpSupport/phpSnippets'
import { angularExtensionManifest } from '../src/extensions/angularSupport/angularExtension'
import { angularSnippets } from '../src/extensions/angularSupport/angularSnippets'
import { reactExtensionManifest } from '../src/extensions/reactSupport/reactExtension'
import { reactSnippets } from '../src/extensions/reactSupport/reactSnippets'
import { flutterExtensionManifest } from '../src/extensions/flutterSupport/flutterExtension'
import { flutterSnippets } from '../src/extensions/flutterSupport/flutterSnippets'
import { rubyExtensionManifest } from '../src/extensions/rubySupport/rubyExtension'
import { rubySnippets } from '../src/extensions/rubySupport/rubySnippets'
import { toolchainService } from '../src/services/toolchainService'

describe('Web, Framework & Mobile Extensions (PHP, Angular, React, Flutter, Ruby)', () => {
  it('registers PHP & Laravel extension with correct metadata and snippets', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.php-laravel-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('PHP & Laravel Ecosystem Suite')
    expect(ext?.category).toBe('Languages')
    expect(ext?.status).toBe('Active')

    const labels = phpSnippets.map((s) => s.label)
    expect(labels).toContain('php-class-readonly')
    expect(labels).toContain('php-enum')
    expect(labels).toContain('laravel-model')
    expect(labels).toContain('laravel-api-controller')
    expect(labels).toContain('laravel-migration')
    expect(labels).toContain('pest-test')
  })

  it('registers Angular & TypeScript extension with correct metadata and standalone/signals snippets', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.angular-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('Angular & TypeScript Enterprise Suite')
    expect(ext?.category).toBe('Frameworks')
    expect(ext?.status).toBe('Active')

    const labels = angularSnippets.map((s) => s.label)
    expect(labels).toContain('ng-standalone-component')
    expect(labels).toContain('ng-signal-input-output')
    expect(labels).toContain('ng-control-flow')
    expect(labels).toContain('ng-http-service')
    expect(labels).toContain('ng-reactive-form')
    expect(labels).toContain('ng-spec-test')
  })

  it('registers React 19 & Next.js extension with correct metadata and modern action hooks/server components', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.react-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('React 19 & Next.js Modern Ecosystem')
    expect(ext?.category).toBe('Frameworks')
    expect(ext?.status).toBe('Active')

    const labels = reactSnippets.map((s) => s.label)
    expect(labels).toContain('react-fc')
    expect(labels).toContain('react-action-state')
    expect(labels).toContain('react-optimistic')
    expect(labels).toContain('next-page')
    expect(labels).toContain('next-api-route')
    expect(labels).toContain('zustand-store')
    expect(labels).toContain('tanstack-query')
  })

  it('registers Flutter & Dart extension with correct metadata and liquid glass widgets', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.flutter-dart-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('Flutter & Dart Mobile/Desktop Suite')
    expect(ext?.category).toBe('Frameworks')
    expect(ext?.status).toBe('Active')

    const labels = flutterSnippets.map((s) => s.label)
    expect(labels).toContain('dart-sealed-class')
    expect(labels).toContain('dart-record')
    expect(labels).toContain('flutter-stateless')
    expect(labels).toContain('flutter-glassmorphic')
    expect(labels).toContain('flutter-riverpod-notifier')
    expect(labels).toContain('flutter-go-router')
  })

  it('registers Ruby & Rails extension with correct metadata and ActiveRecord/API snippets', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.ruby-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('Ruby & Ruby on Rails Suite')
    expect(ext?.category).toBe('Languages')
    expect(ext?.status).toBe('Active')

    const labels = rubySnippets.map((s) => s.label)
    expect(labels).toContain('ruby-data-define')
    expect(labels).toContain('ruby-pattern-match')
    expect(labels).toContain('rails-model')
    expect(labels).toContain('rails-api-controller')
    expect(labels).toContain('rails-migration')
    expect(labels).toContain('rails-job')
    expect(labels).toContain('rspec-model-spec')
  })

  it('verifies toolchain registrations for PHP, Ruby, and Flutter in toolchainService', () => {
    const defs = toolchainService.getDefinitions()

    const phpDef = defs.find((d) => d.id === 'toolchain.php')
    expect(phpDef).toBeDefined()
    expect(phpDef?.binaryNames).toContain('php')

    const rubyDef = defs.find((d) => d.id === 'toolchain.ruby')
    expect(rubyDef).toBeDefined()
    expect(rubyDef?.binaryNames).toContain('ruby')

    const flutterDef = defs.find((d) => d.id === 'toolchain.flutter')
    expect(flutterDef).toBeDefined()
    expect(flutterDef?.binaryNames).toContain('flutter')
  })
})
