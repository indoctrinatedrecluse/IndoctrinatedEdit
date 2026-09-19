import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testExplorerService } from '../src/services/testExplorerService';

describe('TestExplorerService', () => {
  beforeEach(() => {
    testExplorerService.registerWorkspace(() => ({}));
  });

  it('discovers TypeScript and JavaScript tests correctly', () => {
    const tsCode = `
      describe('Auth Module', () => {
        it('should login user with valid credentials', async () => {
          expect(true).toBe(true);
        });

        test('should reject invalid password', () => {
          expect(false).toBe(false);
        });
      });
    `;

    testExplorerService.registerWorkspace(() => ({
      'src/auth.test.ts': tsCode,
    }));

    const state = testExplorerService.getState();
    expect(state.files.length).toBe(1);
    expect(state.files[0].filePath).toBe('src/auth.test.ts');
    expect(state.files[0].suites.length).toBe(1);
    expect(state.files[0].suites[0].name).toBe('Auth Module');
    expect(state.files[0].suites[0].testCases.length).toBe(2);
    expect(state.files[0].suites[0].testCases[0].name).toBe('should login user with valid credentials');
    expect(state.files[0].suites[0].testCases[1].name).toBe('should reject invalid password');
  });

  it('discovers Python pytest/unittest files correctly', () => {
    const pyCode = `
def test_create_user():
    assert True

def test_delete_user():
    assert True
`;
    testExplorerService.registerWorkspace(() => ({
      'tests/test_user.py': pyCode,
    }));

    const state = testExplorerService.getState();
    expect(state.files.length).toBe(1);
    expect(state.files[0].framework).toBe('pytest');
    expect(state.files[0].directTests.length).toBe(2);
    expect(state.files[0].directTests[0].name).toBe('create user');
    expect(state.files[0].directTests[1].name).toBe('delete user');
  });

  it('discovers Go test files correctly', () => {
    const goCode = `
package main

import "testing"

func TestCalculateTotal(t *testing.T) {
    if 1 + 1 != 2 {
        t.Fail()
    }
}
`;
    testExplorerService.registerWorkspace(() => ({
      'calc_test.go': goCode,
    }));

    const state = testExplorerService.getState();
    expect(state.files.length).toBe(1);
    expect(state.files[0].framework).toBe('gotest');
    expect(state.files[0].directTests.length).toBe(1);
    expect(state.files[0].directTests[0].name).toBe('TestCalculateTotal');
  });

  it('executes individual test and updates item status and duration', async () => {
    const tsCode = `
      it('should compute sum', () => {
        expect(1 + 1).toBe(2);
      });
    `;
    testExplorerService.registerWorkspace(() => ({
      'math.test.ts': tsCode,
    }));
    const state = testExplorerService.getState();
    const testCase = state.files[0].directTests[0];

    expect(testCase.status).toBe('idle');
    const result = await testExplorerService.runSingleTest(testCase.id);
    expect(result).toBeDefined();
    expect(result?.status).toBe('passed');
    expect(result?.durationMs).toBeGreaterThanOrEqual(0);

    const updatedState = testExplorerService.getState();
    expect(updatedState.summary.passed).toBe(1);
    expect(updatedState.files[0].status).toBe('passed');
  });

  it('executes all tests across files', async () => {
    const tsCode = `
      describe('Suite 1', () => {
        it('test A', () => {});
        it('test B', () => {});
      });
    `;
    testExplorerService.registerWorkspace(() => ({
      'suite.test.ts': tsCode,
    }));

    await testExplorerService.runAllTests();

    const state = testExplorerService.getState();
    expect(state.summary.totalTests).toBe(2);
    expect(state.summary.passed).toBe(2);
    expect(state.summary.failed).toBe(0);
    expect(state.files[0].status).toBe('passed');
  });

  it('executes a single file', async () => {
    const tsCode = `
      it('file test', () => {});
    `;
    testExplorerService.registerWorkspace(() => ({
      'file.test.ts': tsCode,
    }));

    const updatedFile = await testExplorerService.runFile('file.test.ts');
    expect(updatedFile?.status).toBe('passed');
    expect(updatedFile?.directTests[0].status).toBe('passed');
  });

  it('handles clearing results back to idle', async () => {
    const tsCode = `
      it('run and clear', () => {});
    `;
    testExplorerService.registerWorkspace(() => ({
      'clear.test.ts': tsCode,
    }));
    await testExplorerService.runAllTests();
    expect(testExplorerService.getState().summary.passed).toBe(1);

    testExplorerService.clearResults();
    expect(testExplorerService.getState().summary.passed).toBe(0);
    expect(testExplorerService.getState().files[0].status).toBe('idle');
  });

  it('handles listeners on state changes', () => {
    const listener = vi.fn();
    const unsub = testExplorerService.subscribe(listener);

    expect(listener).toHaveBeenCalled(); // Initial call
    testExplorerService.registerWorkspace(() => ({
      'sub.test.ts': 'it("a", () => {})',
    }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    testExplorerService.clearResults();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
