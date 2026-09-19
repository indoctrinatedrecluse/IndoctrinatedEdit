import { describe, it, expect, beforeEach } from 'vitest'
import { conflictResolutionService } from '../src/services/conflictResolutionService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'

describe('ConflictResolutionService - 5-Tier Resolution Engine', () => {
  beforeEach(() => {
    extensionRegistry.reindexConflicts()
  })

  describe('Tier 1: Project Build & Framework Context Detection', () => {
    it('should let Angular extension claim .ts files when angular.json / @angular/core is present', () => {
      conflictResolutionService.setWorkspaceContext({
        workspacePath: '/projects/my-angular-app',
        files: [
          { name: 'angular.json', path: '/projects/my-angular-app/angular.json' },
          { name: 'package.json', path: '/projects/my-angular-app/package.json' },
        ],
        packageJsonContent: JSON.stringify({
          dependencies: {
            '@angular/core': '^19.0.0',
            '@angular/common': '^19.0.0',
          },
        }),
      })

      const res = conflictResolutionService.resolveLanguageForFilename('app.component.ts')
      expect(res.resolvedBy).toBe('project-context')
      expect(res.extensionId).toBe('indoctrinated.ext.angular-pack')
      expect(res.languageId).toBe('typescript')
    })

    it('should let React & Next.js extension claim .ts and .tsx files when Next.js / React is detected', () => {
      conflictResolutionService.setWorkspaceContext({
        workspacePath: '/projects/my-next-app',
        files: [
          { name: 'next.config.js', path: '/projects/my-next-app/next.config.js' },
          { name: 'package.json', path: '/projects/my-next-app/package.json' },
        ],
        packageJsonContent: JSON.stringify({
          dependencies: {
            'next': '^15.0.0',
            'react': '^19.0.0',
          },
        }),
      })

      const resTs = conflictResolutionService.resolveLanguageForFilename('utils.ts')
      expect(resTs.resolvedBy).toBe('project-context')
      expect(resTs.extensionId).toBe('indoctrinated.ext.react-pack')

      const resTsx = conflictResolutionService.resolveLanguageForFilename('Header.tsx')
      expect(resTsx.resolvedBy).toBe('project-context')
      expect(resTsx.extensionId).toBe('indoctrinated.ext.react-pack')
    })

    it('should let Vue / Frontend Mega-Pack claim files in a Vue / Nuxt project context', () => {
      conflictResolutionService.setWorkspaceContext({
        workspacePath: '/projects/my-nuxt-app',
        files: [
          { name: 'nuxt.config.ts', path: '/projects/my-nuxt-app/nuxt.config.ts' },
        ],
        packageJsonContent: JSON.stringify({
          dependencies: {
            'vue': '^3.4.0',
            'nuxt': '^3.10.0',
          },
        }),
      })

      const res = conflictResolutionService.resolveLanguageForFilename('utils.ts')
      expect(res.resolvedBy).toBe('project-context')
      expect(res.extensionId).toBe('indoctrinated.ext.frontend-mega-pack')
    })
  })

  describe('Tier 2: File Directory & Semantic Path Heuristics', () => {
    beforeEach(() => {
      // Clear project context to test fallback to Tier 2
      conflictResolutionService.setWorkspaceContext({})
    })

    it('should resolve Angular paths like *.component.ts to Angular extension', () => {
      const res = conflictResolutionService.resolveLanguageForFilename('src/app/nav.component.ts')
      expect(res.resolvedBy).toBe('path-heuristic')
      expect(res.extensionId).toBe('indoctrinated.ext.angular-pack')
    })

    it('should resolve React paths like /components/ or /hooks/ to React extension', () => {
      const res = conflictResolutionService.resolveLanguageForFilename('src/components/Button.ts')
      expect(res.resolvedBy).toBe('path-heuristic')
      expect(res.extensionId).toBe('indoctrinated.ext.react-pack')
    })

    it('should resolve backend paths like /controllers/ or /routes/ to Backend Mega-Pack', () => {
      const res = conflictResolutionService.resolveLanguageForFilename('src/controllers/userController.ts')
      expect(res.resolvedBy).toBe('path-heuristic')
      expect(res.extensionId).toBe('indoctrinated.ext.backend-mega-pack')
    })
  })

  describe('Tier 3: In-File Content & AST Signatures', () => {
    beforeEach(() => {
      conflictResolutionService.setWorkspaceContext({})
    })

    it('should disambiguate Angular components via @Component decorators', () => {
      const angularCode = `
        import { Component } from '@angular/core';
        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {}
      `
      const res = conflictResolutionService.resolveLanguageForFilename('main.ts', angularCode)
      expect(res.resolvedBy).toBe('heuristic')
      expect(res.extensionId).toBe('indoctrinated.ext.angular-pack')
      expect(res.languageId).toBe('typescript')
    })

    it('should disambiguate React code via React hooks and JSX signatures', () => {
      const reactCode = `
        import React, { useState, useEffect } from 'react';
        export const MyComp = () => {
          const [count, setCount] = useState(0);
          return <div className="p-4">Count: {count}</div>;
        };
      `
      const res = conflictResolutionService.resolveLanguageForFilename('widget.ts', reactCode)
      expect(res.resolvedBy).toBe('heuristic')
      expect(res.extensionId).toBe('indoctrinated.ext.react-pack')
    })
  })

  describe('Tier 4 & 5: Specialization Priority & Deterministic Fallback', () => {
    beforeEach(() => {
      conflictResolutionService.setWorkspaceContext({})
    })

    it('should give dedicated language extensions priority over formatters and linters', () => {
      const res = conflictResolutionService.resolveLanguageForFilename('plain.ts')
      expect(res.resolvedBy).toBe('priority')
      expect(res.extensionId).not.toBe('indoctrinated.ext.prettier-formatter')
      expect(res.languageId).toBe('typescript')
    })
  })
})
