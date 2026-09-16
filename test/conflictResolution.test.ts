import { describe, it, expect, vi, beforeEach } from 'vitest'
import { conflictResolutionService } from '../src/services/conflictResolutionService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { notificationService } from '../src/services/notificationService'
import { ExtensionManifest } from '../src/extensions/extensionTypes'

describe('ConflictResolutionService - Inter-Extension Conflict Resolution & Cycle Arbiter', () => {
  beforeEach(() => {
    extensionRegistry.reindexConflicts()
  })

  describe('1. Exact & Standard File Extension Matching', () => {
    it('should resolve unambiguous language extensions directly', () => {
      const zigRes = conflictResolutionService.resolveLanguageForFilename('engine.zig')
      expect(zigRes.languageId).toBe('zig')
      expect(zigRes.resolvedBy).toBe('exact')
      expect(zigRes.isFallback).toBe(false)

      const elixirRes = conflictResolutionService.resolveLanguageForFilename('server.ex')
      expect(elixirRes.languageId).toBe('elixir')
      expect(elixirRes.resolvedBy).toBe('exact')

      const dartRes = conflictResolutionService.resolveLanguageForFilename('widget.dart')
      expect(dartRes.languageId).toBe('dart')
      expect(dartRes.resolvedBy).toBe('exact')

      const solRes = conflictResolutionService.resolveLanguageForFilename('Token.sol')
      expect(solRes.languageId).toBe('solidity')
      expect(solRes.resolvedBy).toBe('exact')

      // .kt is claimed by KotlinSupport and BackendMegaPack (Ktor/Quarkus), auto-resolving via priority
      const kotlinRes = conflictResolutionService.resolveLanguageForFilename('App.kt')
      expect(kotlinRes.languageId).toBe('kotlin')
      expect(kotlinRes.resolvedBy).toBe('priority')
      expect(kotlinRes.isFallback).toBe(false)

      // .rs is claimed by RustSupport and BackendMegaPack (Actix/Axum), auto-resolving via priority
      const rustRes = conflictResolutionService.resolveLanguageForFilename('main.rs')
      expect(rustRes.languageId).toBe('rust')
      expect(rustRes.resolvedBy).toBe('priority')
      expect(rustRes.isFallback).toBe(false)
    })

    it('should fall back gracefully to standard Monaco mapping or plaintext for unknown extensions', () => {
      const unknownRes = conflictResolutionService.resolveLanguageForFilename('config.xyzunknown123')
      expect(unknownRes.languageId).toBe('plaintext')
      expect(unknownRes.isFallback).toBe(true)

      const jsonRes = conflictResolutionService.resolveLanguageForFilename('package.json')
      expect(jsonRes.languageId).toBe('json')
    })
  })

  describe('2. Multi-Extension Collision Disambiguation via Heuristics', () => {
    it('should disambiguate .m files between Objective-C and MATLAB based on content heuristics', () => {
      // Objective-C sample
      const objcCode = `
        #import <Foundation/Foundation.h>
        @interface MyController : NSObject
        @property (nonatomic, strong) NSString *title;
        @end
        @implementation MyController
        @end
      `
      const objcRes = conflictResolutionService.resolveLanguageForFilename('Controller.m', objcCode)
      expect(objcRes.languageId).toBe('objective-c')
      expect(objcRes.resolvedBy).toBe('heuristic')

      // MATLAB sample
      const matlabCode = `
        function result = simulate(x, y)
          [X, Y] = meshgrid(-3:0.1:3, -3:0.1:3);
          clc;
          clear all;
        end
      `
      const matlabRes = conflictResolutionService.resolveLanguageForFilename('simulate.m', matlabCode)
      expect(matlabRes.languageId).toBe('matlab')
      expect(matlabRes.resolvedBy).toBe('heuristic')
    })

    it('should disambiguate .pl files between Prolog and Perl based on content heuristics', () => {
      // Prolog sample
      const prologCode = `
        parent(john, mary).
        ancestor(X, Y) :- parent(X, Y).
        findall(D, ancestor(john, D), List).
      `
      const prologRes = conflictResolutionService.resolveLanguageForFilename('kb.pl', prologCode)
      expect(prologRes.languageId).toBe('prolog')
      expect(prologRes.resolvedBy).toBe('heuristic')

      // Perl sample
      const perlCode = `
        use strict;
        use warnings;
        my $name = "IndoctrinatedEdit";
        sub process_data {
          print "Processing: $name\\n";
        }
      `
      const perlRes = conflictResolutionService.resolveLanguageForFilename('script.pl', perlCode)
      expect(perlRes.languageId).toBe('perl')
      expect(perlRes.resolvedBy).toBe('heuristic')
    })

    it('should disambiguate .v files between Coq and SystemVerilog', () => {
      // Coq sample
      const coqCode = `
        Require Import Coq.Arith.Arith.
        Inductive tree : Type := Leaf | Node.
        Lemma tree_ok : forall t : tree, True.
        Proof. auto. Qed.
      `
      const coqRes = conflictResolutionService.resolveLanguageForFilename('proof.v', coqCode)
      expect(coqRes.languageId).toBe('coq')
      expect(coqRes.resolvedBy).toBe('heuristic')

      // Verilog sample
      const verilogCode = `
        module alu (input wire clk, output reg [7:0] out);
          always @(posedge clk) begin
            out <= out + 1;
          end
        endmodule
      `
      const verilogRes = conflictResolutionService.resolveLanguageForFilename('alu.v', verilogCode)
      expect(verilogRes.languageId).toBe('systemverilog')
      expect(verilogRes.resolvedBy).toBe('heuristic')
    })

    it('should resolve collisions via deterministic priority when no content is provided', () => {
      const res = conflictResolutionService.resolveLanguageForFilename('unknown_code.m')
      expect(res.languageId).toBeDefined()
      expect(res.resolvedBy).toBe('priority')
    })
  })

  describe('3. Cyclic Alias Rule Detection & Cycle Breaking', () => {
    it('should detect and break circular language alias chains without infinite recursion', () => {
      const warnSpy = vi.spyOn(notificationService, 'notifyWarning')

      // Create synthetic cycle in manifests: A -> B -> C -> A
      const cyclicManifests: ExtensionManifest[] = [
        {
          id: 'test.ext.a',
          name: 'Cyclic A',
          version: '1.0.0',
          description: 'Cycle test A',
          author: 'test',
          category: 'Languages',
          status: 'Active',
          type: 'Built-in',
          languages: [
            { id: 'lang-b', extensions: ['.cyc'], aliases: ['lang-a'] }, // lang-a -> lang-b
          ],
        },
        {
          id: 'test.ext.b',
          name: 'Cyclic B',
          version: '1.0.0',
          description: 'Cycle test B',
          author: 'test',
          category: 'Languages',
          status: 'Active',
          type: 'Built-in',
          languages: [
            { id: 'lang-c', extensions: ['.cyc'], aliases: ['lang-b'] }, // lang-b -> lang-c
          ],
        },
        {
          id: 'test.ext.c',
          name: 'Cyclic C',
          version: '1.0.0',
          description: 'Cycle test C',
          author: 'test',
          category: 'Languages',
          status: 'Active',
          type: 'Built-in',
          languages: [
            { id: 'lang-a', extensions: ['.cyc'], aliases: ['lang-c'] }, // lang-c -> lang-a
          ],
        },
      ]

      conflictResolutionService.indexManifests(cyclicManifests)

      // Must terminate immediately and not throw Maximum call stack size exceeded
      expect(() => {
        const resolved = conflictResolutionService.resolveAliasWithCycleCheck('lang-a')
        expect(resolved).toBeDefined()
      }).not.toThrow()

      expect(warnSpy).toHaveBeenCalled()
    })

    it('should handle self-referential alias cycles A -> A gracefully', () => {
      const resolved = conflictResolutionService.resolveAliasWithCycleCheck('swift')
      expect(resolved).toBe('swift')
    })
  })

  describe('4. Fault-Tolerant Provider Execution & Crash Immunity', () => {
    it('should catch unhandled errors from buggy language providers and return fallback safely', () => {
      const errorSpy = vi.spyOn(notificationService, 'notifyError')

      const result = conflictResolutionService.safeExecuteProvider(
        'FaultyProvider',
        'custom-lang',
        () => {
          throw new Error('Simulated tokenizer heap crash!')
        },
        'safe-fallback-token'
      )

      expect(result).toBe('safe-fallback-token')
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should handle corrupted or weird filename inputs without crashing', () => {
      expect(() => {
        const r1 = conflictResolutionService.resolveLanguageForFilename('')
        expect(r1.languageId).toBe('plaintext')

        const r2 = conflictResolutionService.resolveLanguageForFilename(null as any)
        expect(r2.languageId).toBe('plaintext')

        const r3 = conflictResolutionService.resolveLanguageForFilename('....')
        expect(r3.languageId).toBe('plaintext')
      }).not.toThrow()
    })

    it('should integrate with extensionRegistry.resolveLanguageForFilename seamlessly', () => {
      const lang = extensionRegistry.resolveLanguageForFilename('contract.sol')
      expect(lang).toBe('solidity')

      const pyLang = extensionRegistry.resolveLanguageForFilename('script.py')
      expect(pyLang).toBe('python')
    })
  })
})
