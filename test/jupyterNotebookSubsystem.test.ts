import { describe, it, expect, beforeEach } from 'vitest'
import {
  jupyterKernelService,
  JupyterNotebook,
  JupyterCell,
} from '../src/services/jupyterKernelService'
import {
  jupyterExtensionManifest,
  registerJupyterExtension,
} from '../src/extensions/jupyterSupport/jupyterExtension'
import { conflictResolutionService } from '../src/services/conflictResolutionService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'

describe('Jupyter Notebook & Kernel Subsystem', () => {
  beforeEach(() => {
    jupyterKernelService.restartKernel()
  })

  describe('Notebook Creation & Parsing', () => {
    it('creates a standard empty notebook with code and markdown cells', () => {
      const nb = jupyterKernelService.createEmptyNotebook('python')
      expect(nb.metadata.kernelspec?.name).toBe('python3')
      expect(nb.metadata.kernelspec?.display_name).toContain('Python')
      expect(nb.cells.length).toBeGreaterThanOrEqual(2)
      expect(nb.cells[0].cell_type).toBe('markdown')
      expect(nb.cells[1].cell_type).toBe('code')
    })

    it('creates a pre-populated Exploratory Data Analysis (EDA) notebook', () => {
      const eda = jupyterKernelService.createSampleDataScienceNotebook()
      expect(eda.cells.length).toBeGreaterThanOrEqual(4)
      const codeCells = eda.cells.filter((c) => c.cell_type === 'code')
      expect(codeCells.length).toBeGreaterThanOrEqual(3)
      expect(codeCells.some((c) => c.source.includes('pandas'))).toBe(true)
      expect(codeCells.some((c) => c.source.includes('matplotlib'))).toBe(true)
    })

    it('serializes and parses notebook JSON with fidelity', () => {
      const original = jupyterKernelService.createSampleDataScienceNotebook()
      const jsonStr = jupyterKernelService.serializeNotebook(original)
      expect(typeof jsonStr).toBe('string')

      const parsed = jupyterKernelService.parseNotebook(jsonStr)
      expect(parsed.cells.length).toBe(original.cells.length)
      expect(parsed.metadata.language_info?.name).toBe('python')
    })

    it('recovers gracefully when parsing invalid JSON', () => {
      const invalidJson = '{ not valid json :::'
      const recovered = jupyterKernelService.parseNotebook(invalidJson)
      expect(recovered).toBeDefined()
      expect(recovered.cells.length).toBeGreaterThanOrEqual(1)
      expect(recovered.metadata.kernelspec?.name).toBe('python3')
    })
  })

  describe('Cell Operations & Mutations', () => {
    it('manages cells and mutates source correctly', () => {
      const nb = jupyterKernelService.createEmptyNotebook()
      const codeCell = nb.cells.find((c) => c.cell_type === 'code')!
      codeCell.source = 'x = 42\nprint(x)'

      expect(codeCell.source).toBe('x = 42\nprint(x)')
      expect(codeCell.cell_type).toBe('code')

      codeCell.cell_type = 'markdown'
      expect(codeCell.cell_type).toBe('markdown')
    })

    it('clears individual and all cell outputs', () => {
      const nb = jupyterKernelService.createSampleDataScienceNotebook()
      const codeCell = nb.cells.find((c) => c.cell_type === 'code')!
      expect(codeCell.outputs.length).toBeGreaterThan(0)

      jupyterKernelService.clearCellOutputs(codeCell)
      expect(codeCell.outputs).toEqual([])
      expect(codeCell.execution_count).toBeNull()

      jupyterKernelService.clearAllOutputs(nb)
      nb.cells.forEach((cell) => {
        expect(cell.outputs).toEqual([])
        expect(cell.execution_count).toBeNull()
      })
    })
  })

  describe('Live Execution Engine & Kernel Runtime', () => {
    it('executes simple python statements and captures stdout', async () => {
      const cell: JupyterCell = {
        id: 'test-cell-1',
        cell_type: 'code',
        source: 'print("Hello from Jupyter Studio!")\nprint("Result is 42")',
        execution_count: null,
        outputs: [],
        metadata: {},
      }

      const outputs = await jupyterKernelService.executeCell(cell)

      expect(cell.execution_count).toBeGreaterThan(0)
      expect(outputs.length).toBeGreaterThan(0)
      
      const streamOut = outputs.find((o) => o.output_type === 'stream')
      expect(streamOut?.text).toContain('Hello from Jupyter Studio!')
      expect(streamOut?.text).toContain('Result is 42')
    })

    it('generates rich DataFrame HTML tables for pandas-like code', async () => {
      const cell: JupyterCell = {
        id: 'test-cell-2',
        cell_type: 'code',
        source: 'import pandas as pd\ndf = pd.DataFrame({"model": ["Alpha", "Beta"]})\ndf.head()',
        execution_count: null,
        outputs: [],
        metadata: {},
      }

      const outputs = await jupyterKernelService.executeCell(cell)
      const richOutput = outputs.find((o) => o.output_type === 'display_data' || o.output_type === 'execute_result')
      expect(richOutput).toBeDefined()
      expect(richOutput?.data?.['text/html']).toContain('<table')
      expect(richOutput?.data?.['text/html']).toContain('dataframe')
    })

    it('generates rich SVG vector plots for matplotlib/seaborn code', async () => {
      const cell: JupyterCell = {
        id: 'test-cell-3',
        cell_type: 'code',
        source: 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])\nplt.show()',
        execution_count: null,
        outputs: [],
        metadata: {},
      }

      const outputs = await jupyterKernelService.executeCell(cell)
      const plotOutput = outputs.find((o) => o.data && o.data['image/svg+xml'])
      expect(plotOutput).toBeDefined()
      expect(plotOutput?.data?.['image/svg+xml']).toContain('<svg')
    })

    it('captures errors and generates ANSI-styled tracebacks', async () => {
      const cell: JupyterCell = {
        id: 'test-cell-4',
        cell_type: 'code',
        source: 'raise ZeroDivisionError("division by zero")',
        execution_count: null,
        outputs: [],
        metadata: {},
      }

      const outputs = await jupyterKernelService.executeCell(cell)
      const errOutput = outputs.find((o) => o.output_type === 'error')
      expect(errOutput).toBeDefined()
      expect(errOutput?.ename).toBe('ZeroDivisionError')
      expect(errOutput?.traceback?.length).toBeGreaterThan(0)
    })

    it('tracks active in-memory variables across cell executions', async () => {
      const cell: JupyterCell = {
        id: 'test-cell-5',
        cell_type: 'code',
        source: 'learning_rate = 0.001',
        execution_count: null,
        outputs: [],
        metadata: {},
      }

      await jupyterKernelService.executeCell(cell)
      const vars = jupyterKernelService.getVariables()

      expect(vars.some((v) => v.name === 'learning_rate' && v.type === 'float')).toBe(true)
    })

    it('executes all cells sequentially via executeAllCells', async () => {
      const sample = jupyterKernelService.createSampleDataScienceNotebook()
      await jupyterKernelService.executeAllCells(sample.cells)

      const codeCells = sample.cells.filter((c) => c.cell_type === 'code')
      codeCells.forEach((c) => {
        expect(c.execution_count).toBeGreaterThan(0)
        expect(c.outputs.length).toBeGreaterThan(0)
      })
    })

    it('manages kernel environments and sessions', () => {
      const kernels = jupyterKernelService.getAvailableKernels()
      expect(kernels.length).toBeGreaterThanOrEqual(3)
      expect(kernels.some((k) => k.id === 'python-3.12-local')).toBe(true)
      expect(kernels.some((k) => k.id === 'datascience-pyodide-wasm')).toBe(true)
      expect(kernels.some((k) => k.id === 'nodejs-v8-kernel')).toBe(true)

      jupyterKernelService.setActiveKernel('datascience-pyodide-wasm')
      expect(jupyterKernelService.getActiveKernel().id).toBe('datascience-pyodide-wasm')

      jupyterKernelService.interruptKernel()
      expect(jupyterKernelService.getKernelStatus()).toBe('idle')
    })
  })

  describe('Export Functions', () => {
    it('exports notebook to standalone executable Python script', () => {
      const sample = jupyterKernelService.createSampleDataScienceNotebook()
      const pyScript = jupyterKernelService.exportToPythonScript(sample)

      expect(pyScript).toContain('Generated by IndoctrinatedEdit')
      expect(pyScript).toContain('# In[')
      expect(pyScript).toContain('import pandas as pd')
    })

    it('exports notebook to formatted Markdown report', () => {
      const sample = jupyterKernelService.createSampleDataScienceNotebook()
      const mdReport = jupyterKernelService.exportToMarkdown(sample)

      expect(mdReport).toContain('# 🧠 Machine Learning & Data Analysis Pipeline')
      expect(mdReport).toContain('```python')
    })
  })

  describe('Extension Manifest & Monaco Snippets', () => {
    it('has valid manifest configuration', () => {
      expect(jupyterExtensionManifest.id).toBe('indoctrinated.ext.jupyter-notebook-engine')
      expect(jupyterExtensionManifest.name).toContain('Jupyter')
      expect(jupyterExtensionManifest.languages?.some((l) => l.id === 'ipynb')).toBe(true)
    })

    it('registers Monaco code completion snippets without error', () => {
      let registered = false
      const mockMonaco = {
        languages: {
          registerCompletionItemProvider: (lang: string, provider: any) => {
            registered = true
            const suggestions = provider.provideCompletionItems(
              { getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }) },
              { lineNumber: 1, column: 1 }
            )
            expect(suggestions.suggestions.length).toBeGreaterThan(0)
            return { dispose: () => {} }
          },
          CompletionItemKind: { Snippet: 27 },
          CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
        },
      } as any

    registerJupyterExtension(mockMonaco)
      expect(registered).toBe(true)
    })
  })

  describe('File Recognition & Language Resolution', () => {
    it('recognizes .ipynb and .jupyter files as notebook language', () => {
      const res1 = conflictResolutionService.resolveLanguageForFilename('analysis.ipynb')
      expect(res1.languageId).toBe('ipynb')

      const res2 = conflictResolutionService.resolveLanguageForFilename('deep_learning.jupyter')
      expect(res2.languageId).toBe('ipynb')

      const res3 = extensionRegistry.resolveLanguageForFilename('pipeline.ipynb')
      expect(res3).toBe('ipynb')
    })

    it('preserves standard python recognition for normal .py files without collision', () => {
      const pyRes = conflictResolutionService.resolveLanguageForFilename('train_model.py')
      expect(pyRes.languageId).toBe('python')

      const regRes = extensionRegistry.resolveLanguageForFilename('script.py')
      expect(regRes).toBe('python')
    })
  })
})
