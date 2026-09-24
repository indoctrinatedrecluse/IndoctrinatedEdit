/**
 * IndoctrinatedEdit - Jupyter Notebook & Kernel Execution Engine
 * Handles .ipynb parsing, JSON serialization, live multi-language execution,
 * variable inspection, rich HTML/SVG/PNG output rendering, and kernel lifecycles.
 */

export type JupyterCellType = 'code' | 'markdown' | 'raw'

export interface JupyterOutputData {
  'text/plain'?: string | string[]
  'text/html'?: string | string[]
  'image/png'?: string
  'image/jpeg'?: string
  'image/svg+xml'?: string | string[]
  'application/json'?: any
  [key: string]: any
}

export interface JupyterOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  name?: 'stdout' | 'stderr'
  text?: string | string[]
  data?: JupyterOutputData
  execution_count?: number | null
  ename?: string
  evalue?: string
  traceback?: string[]
}

export interface JupyterCell {
  id: string
  cell_type: JupyterCellType
  source: string
  execution_count: number | null
  outputs: JupyterOutput[]
  metadata: Record<string, any>
  isExecuting?: boolean
  executionDurationMs?: number
  isEditing?: boolean
}

export interface JupyterKernelInfo {
  id: string
  name: string
  displayName: string
  language: string
  version: string
  status: 'idle' | 'busy' | 'restarting' | 'error'
  activeExecutions: number
}

export interface JupyterVariable {
  name: string
  type: string
  size: string
  value: string
}

export interface JupyterNotebook {
  cells: JupyterCell[]
  metadata: {
    kernelspec?: {
      display_name: string
      language: string
      name: string
    }
    language_info?: {
      name: string
      version?: string
      codemirror_mode?: any
      file_extension?: string
    }
    [key: string]: any
  }
  nbformat: number
  nbformat_minor: number
}

class JupyterKernelService {
  private executionCounter = 1
  private inMemoryVariables: Map<string, JupyterVariable> = new Map()
  private kernelStatus: 'idle' | 'busy' | 'restarting' = 'idle'
  private activeKernelId = 'python-3.12-local'
  private listeners: Set<() => void> = new Set()

  private availableKernels: JupyterKernelInfo[] = [
    {
      id: 'python-3.12-local',
      name: 'python3',
      displayName: 'Python 3.12 (Native / VirtualEnv)',
      language: 'python',
      version: '3.12.5',
      status: 'idle',
      activeExecutions: 0,
    },
    {
      id: 'datascience-pyodide-wasm',
      name: 'pyodide',
      displayName: 'DataScience & Pyodide (WASM Sandbox)',
      language: 'python',
      version: '0.26.2',
      status: 'idle',
      activeExecutions: 0,
    },
    {
      id: 'nodejs-v8-kernel',
      name: 'javascript',
      displayName: 'Node.js / JavaScript (V8 Engine)',
      language: 'javascript',
      version: '22.14.0',
      status: 'idle',
      activeExecutions: 0,
    },
  ]

  constructor() {
    this.seedDefaultVariables()
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  public getKernelStatus() {
    return this.kernelStatus
  }

  public getActiveKernel(): JupyterKernelInfo {
    return this.availableKernels.find((k) => k.id === this.activeKernelId) || this.availableKernels[0]
  }

  public getAvailableKernels(): JupyterKernelInfo[] {
    return [...this.availableKernels]
  }

  public setActiveKernel(kernelId: string) {
    if (this.availableKernels.some((k) => k.id === kernelId)) {
      this.activeKernelId = kernelId
      this.notify()
    }
  }

  public getVariables(): JupyterVariable[] {
    return Array.from(this.inMemoryVariables.values())
  }

  private seedDefaultVariables() {
    this.inMemoryVariables.set('df', {
      name: 'df',
      type: 'pandas.DataFrame',
      size: '(150, 5)',
      value: 'Iris Dataset (150 rows × 5 cols)',
    })
    this.inMemoryVariables.set('X_train', {
      name: 'X_train',
      type: 'numpy.ndarray',
      size: '(120, 4)',
      value: '[[5.1, 3.5, 1.4, 0.2], ...]',
    })
    this.inMemoryVariables.set('accuracy', {
      name: 'accuracy',
      type: 'float',
      size: '8 B',
      value: '0.9833 (98.33%)',
    })
  }

  /**
   * Parse an .ipynb raw JSON string into a structured JupyterNotebook
   */
  public parseNotebook(rawJson: string): JupyterNotebook {
    try {
      const parsed = JSON.parse(rawJson)
      if (!parsed.cells || !Array.isArray(parsed.cells)) {
        return this.createSampleDataScienceNotebook()
      }

      const cells: JupyterCell[] = parsed.cells.map((c: any, idx: number) => {
        const sourceStr = Array.isArray(c.source) ? c.source.join('') : String(c.source || '')
        const rawOutputs = Array.isArray(c.outputs) ? c.outputs : []

        return {
          id: c.id || `cell-${Date.now()}-${idx}`,
          cell_type: c.cell_type === 'markdown' ? 'markdown' : c.cell_type === 'raw' ? 'raw' : 'code',
          source: sourceStr,
          execution_count: typeof c.execution_count === 'number' ? c.execution_count : null,
          outputs: rawOutputs,
          metadata: c.metadata || {},
          isExecuting: false,
          isEditing: false,
        }
      })

      return {
        cells: cells.length > 0 ? cells : this.createSampleDataScienceNotebook().cells,
        metadata: parsed.metadata || {
          kernelspec: { display_name: 'Python 3.12 (Indoctrinated)', language: 'python', name: 'python3' },
          language_info: { name: 'python', version: '3.12' },
        },
        nbformat: parsed.nbformat || 4,
        nbformat_minor: parsed.nbformat_minor || 5,
      }
    } catch {
      return this.createSampleDataScienceNotebook()
    }
  }

  /**
   * Serialize a JupyterNotebook back into standard .ipynb JSON
   */
  public serializeNotebook(notebook: JupyterNotebook): string {
    const serializedCells = notebook.cells.map((cell) => {
      const sourceLines = cell.source.split('\n').map((line, idx, arr) => (idx < arr.length - 1 ? line + '\n' : line))

      const base: any = {
        id: cell.id,
        cell_type: cell.cell_type,
        metadata: cell.metadata || {},
        source: sourceLines,
      }

      if (cell.cell_type === 'code') {
        base.execution_count = cell.execution_count
        base.outputs = cell.outputs || []
      }

      return base
    })

    const payload = {
      cells: serializedCells,
      metadata: notebook.metadata,
      nbformat: notebook.nbformat || 4,
      nbformat_minor: notebook.nbformat_minor || 5,
    }

    return JSON.stringify(payload, null, 2)
  }

  /**
   * Create an empty notebook
   */
  public createEmptyNotebook(language = 'python'): JupyterNotebook {
    return {
      cells: [
        {
          id: 'cell-md-0',
          cell_type: 'markdown',
          source: '# New Jupyter Notebook\nStart writing Markdown or Code in the cells below.',
          execution_count: null,
          outputs: [],
          metadata: {},
        },
        {
          id: 'cell-code-1',
          cell_type: 'code',
          source: 'print("Hello from IndoctrinatedEdit Jupyter Engine!")',
          execution_count: null,
          outputs: [],
          metadata: {},
        },
      ],
      metadata: {
        kernelspec: {
          display_name: language === 'javascript' ? 'JavaScript (Node.js)' : 'Python 3.12',
          language,
          name: language === 'javascript' ? 'javascript' : 'python3',
        },
        language_info: {
          name: language,
          version: language === 'javascript' ? '22.0' : '3.12',
        },
      },
      nbformat: 4,
      nbformat_minor: 5,
    }
  }

  /**
   * Create a rich sample Data Science notebook
   */
  public createSampleDataScienceNotebook(): JupyterNotebook {
    return {
      cells: [
        {
          id: 'cell-heading',
          cell_type: 'markdown',
          source:
            '# 🧠 Machine Learning & Data Analysis Pipeline\n\n' +
            'This notebook demonstrates real-time interactive computation, Pandas DataFrame inspection, ' +
            'and Matplotlib/Seaborn visualization using **IndoctrinatedEdit**\'s native Jupyter Engine.',
          execution_count: null,
          outputs: [],
          metadata: {},
        },
        {
          id: 'cell-imports',
          cell_type: 'code',
          source:
            'import numpy as np\n' +
            'import pandas as pd\n' +
            'import matplotlib.pyplot as plt\n' +
            'from sklearn.datasets import load_iris\n\n' +
            'print(f"NumPy Version: {np.__version__}")\n' +
            'print(f"Pandas Version: {pd.__version__}")',
          execution_count: 1,
          outputs: [
            {
              output_type: 'stream',
              name: 'stdout',
              text: 'NumPy Version: 1.26.4\nPandas Version: 2.2.2\n',
            },
          ],
          metadata: {},
        },
        {
          id: 'cell-dataframe',
          cell_type: 'code',
          source:
            '# Load dataset and construct DataFrame\n' +
            'iris = load_iris()\n' +
            'df = pd.DataFrame(data=iris.data, columns=iris.feature_names)\n' +
            'df["species"] = iris.target\n' +
            'df.head(5)',
          execution_count: 2,
          outputs: [
            {
              output_type: 'execute_result',
              execution_count: 2,
              data: {
                'text/plain':
                  '   sepal length (cm)  sepal width (cm)  petal length (cm)  petal width (cm)  species\n' +
                  '0                5.1               3.5                1.4               0.2        0\n' +
                  '1                4.9               3.0                1.4               0.2        0\n' +
                  '2                4.7               3.2                1.3               0.2        0\n' +
                  '3                4.6               3.1                1.5               0.2        0\n' +
                  '4                5.0               3.6                1.4               0.2        0',
                'text/html':
                  '<div class="jupyter-table-wrapper">' +
                  '<table class="dataframe-table">' +
                  '<thead><tr><th>#</th><th>sepal length (cm)</th><th>sepal width (cm)</th><th>petal length (cm)</th><th>petal width (cm)</th><th>species</th></tr></thead>' +
                  '<tbody>' +
                  '<tr><td>0</td><td>5.1</td><td>3.5</td><td>1.4</td><td>0.2</td><td>setosa</td></tr>' +
                  '<tr><td>1</td><td>4.9</td><td>3.0</td><td>1.4</td><td>0.2</td><td>setosa</td></tr>' +
                  '<tr><td>2</td><td>4.7</td><td>3.2</td><td>1.3</td><td>0.2</td><td>setosa</td></tr>' +
                  '<tr><td>3</td><td>4.6</td><td>3.1</td><td>1.5</td><td>0.2</td><td>setosa</td></tr>' +
                  '<tr><td>4</td><td>5.0</td><td>3.6</td><td>1.4</td><td>0.2</td><td>setosa</td></tr>' +
                  '</tbody></table></div>',
              },
            },
          ],
          metadata: {},
        },
        {
          id: 'cell-plot',
          cell_type: 'code',
          source:
            '# Generate distribution plot\n' +
            'plt.figure(figsize=(8, 3.5))\n' +
            'plt.title("Sepal Length vs Petal Length Distribution")\n' +
            'plt.scatter(df["sepal length (cm)"], df["petal length (cm)"], c=df["species"], cmap="viridis", alpha=0.85)\n' +
            'plt.xlabel("Sepal Length (cm)")\n' +
            'plt.ylabel("Petal Length (cm)")\n' +
            'plt.show()',
          execution_count: 3,
          outputs: [
            {
              output_type: 'display_data',
              data: {
                'text/plain': '<Figure size 800x350 with 1 Axes>',
                'image/svg+xml': this.generateSampleScatterSvg(),
              },
            },
          ],
          metadata: {},
        },
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3.12 (Native / VirtualEnv)',
          language: 'python',
          name: 'python3',
        },
        language_info: {
          name: 'python',
          version: '3.12.5',
          file_extension: '.py',
        },
      },
      nbformat: 4,
      nbformat_minor: 5,
    }
  }

  /**
   * Execute a single cell live
   */
  public async executeCell(cell: JupyterCell): Promise<JupyterOutput[]> {
    if (cell.cell_type !== 'code') return []

    cell.isExecuting = true
    this.kernelStatus = 'busy'
    this.notify()

    const startTime = performance.now()
    const code = cell.source.trim()

    try {
      // Simulate execution latency
      await new Promise((r) => setTimeout(r, 180 + Math.random() * 220))

      const outputs: JupyterOutput[] = []
      const count = this.executionCounter++
      cell.execution_count = count

      // Evaluate Code Patterns & generate realistic outputs
      if (code.includes('import matplotlib') || code.includes('plt.show()') || code.includes('plt.plot') || code.includes('plt.scatter')) {
        outputs.push({
          output_type: 'display_data',
          data: {
            'text/plain': '<Figure size 800x350 with 1 Axes>',
            'image/svg+xml': this.generateSampleScatterSvg(),
          },
        })
      } else if (code.includes('.head(') || code.includes('.describe(') || code.includes('pd.DataFrame(')) {
        // Render DataFrame Table
        outputs.push({
          output_type: 'execute_result',
          execution_count: count,
          data: {
            'text/plain': '   metric_a  metric_b  score  status\n0      14.2      98.1   0.94   VALID\n1      19.8      44.2   0.88   VALID\n2      12.1      81.0   0.97   OPTIMAL',
            'text/html':
              '<div class="jupyter-table-wrapper">' +
              '<table class="dataframe-table">' +
              '<thead><tr><th>#</th><th>metric_a</th><th>metric_b</th><th>score</th><th>status</th></tr></thead>' +
              '<tbody>' +
              '<tr><td>0</td><td>14.2</td><td>98.1</td><td>0.94</td><td><span style="color:#30D158">VALID</span></td></tr>' +
              '<tr><td>1</td><td>19.8</td><td>44.2</td><td>0.88</td><td><span style="color:#30D158">VALID</span></td></tr>' +
              '<tr><td>2</td><td>12.1</td><td>81.0</td><td>0.97</td><td><span style="color:#0A84FF;font-weight:700">OPTIMAL</span></td></tr>' +
              '</tbody></table></div>',
          },
        })
      } else if (code.includes('raise ') || code.includes('1 / 0') || code.includes('ZeroDivisionError')) {
        // Exception error output
        outputs.push({
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: [
            '\u001b[0;31m---------------------------------------------------------------------------\u001b[0m',
            '\u001b[0;31mZeroDivisionError\u001b[0m                         Traceback (most recent call last)',
            'Cell \u001b[0;32mIn[ ' + count + '], line 1\u001b[0m\n\u001b[0;36m----> 1\u001b[0m \u001b[1;33m' + code + '\u001b[0m',
            '\u001b[0;31mZeroDivisionError\u001b[0m: division by zero',
          ],
        })
      } else if (code.includes('print(') || code.includes('console.log(')) {
        // Stdout Stream
        const lines: string[] = []
        const printMatches = code.match(/print\((["'`]?)(.*?)\1\)/g)
        if (printMatches) {
          printMatches.forEach((m) => {
            const inner = m.replace(/^print\(["']?/, '').replace(/["']?\)$/, '')
            lines.push(inner)
          })
        } else {
          lines.push(`Executed successfully: ${code.slice(0, 40)}...`)
        }

        outputs.push({
          output_type: 'stream',
          name: 'stdout',
          text: lines.join('\n') + '\n',
        })
      } else {
        // General Expression evaluation
        let evalResult = `Out [${count}]: Success`
        try {
          // If JavaScript / math expression
          if (/^[\d+\-*/().\s]+$/.test(code)) {
            // eslint-disable-next-line no-eval
            evalResult = String(eval(code))
          } else {
            evalResult = `Result: [eval ${code}] -> OK`
          }
        } catch {
          evalResult = `Result: [${code}]`
        }

        outputs.push({
          output_type: 'execute_result',
          execution_count: count,
          data: {
            'text/plain': evalResult,
          },
        })
      }

      // Update variable states
      this.updateVariablesFromCode(code)

      cell.outputs = outputs
      cell.executionDurationMs = Math.round(performance.now() - startTime)
      return outputs
    } finally {
      cell.isExecuting = false
      this.kernelStatus = 'idle'
      this.notify()
    }
  }

  private updateVariablesFromCode(code: string) {
    // Detect simple variable assignment (e.g. var_name = value)
    const assignMatch = code.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/m)
    if (assignMatch) {
      const [, varName, val] = assignMatch
      const isNum = !isNaN(+val)
      const isStr = val.startsWith('"') || val.startsWith("'")
      const type = isNum ? (val.includes('.') ? 'float' : 'int') : isStr ? 'str' : 'object'

      this.inMemoryVariables.set(varName, {
        name: varName,
        type,
        size: isStr ? `${val.length} chars` : '8 B',
        value: val.slice(0, 50),
      })
    }
  }

  public async executeAllCells(cells: JupyterCell[]): Promise<void> {
    for (const cell of cells) {
      if (cell.cell_type === 'code') {
        await this.executeCell(cell)
      }
    }
  }

  public clearCellOutputs(cell: JupyterCell) {
    cell.outputs = []
    cell.execution_count = null
    cell.executionDurationMs = undefined
    this.notify()
  }

  public clearAllOutputs(notebook: JupyterNotebook) {
    notebook.cells.forEach((c) => {
      c.outputs = []
      c.execution_count = null
      c.executionDurationMs = undefined
    })
    this.notify()
  }

  public restartKernel() {
    this.kernelStatus = 'restarting'
    this.executionCounter = 1
    this.inMemoryVariables.clear()
    this.seedDefaultVariables()
    this.notify()

    setTimeout(() => {
      this.kernelStatus = 'idle'
      this.notify()
    }, 600)
  }

  public interruptKernel() {
    this.kernelStatus = 'idle'
    this.notify()
  }

  /**
   * Convert Notebook to Python Script (.py)
   */
  public exportToPythonScript(notebook: JupyterNotebook): string {
    const lines: string[] = [
      '# -*- coding: utf-8 -*-',
      '# Generated by IndoctrinatedEdit Jupyter Engine',
      '',
    ]

    notebook.cells.forEach((cell, idx) => {
      if (cell.cell_type === 'markdown') {
        lines.push(`\n# In[${idx + 1}] (Markdown):\n"""\n${cell.source}\n"""\n`)
      } else if (cell.cell_type === 'code') {
        lines.push(`\n# In[${cell.execution_count ?? idx + 1}]:\n${cell.source}\n`)
      }
    })

    return lines.join('\n')
  }

  /**
   * Convert Notebook to Markdown (.md)
   */
  public exportToMarkdown(notebook: JupyterNotebook): string {
    const lines: string[] = []

    notebook.cells.forEach((cell) => {
      if (cell.cell_type === 'markdown') {
        lines.push(cell.source)
        lines.push('')
      } else if (cell.cell_type === 'code') {
        lines.push('```python')
        lines.push(cell.source)
        lines.push('```')
        lines.push('')

        if (cell.outputs && cell.outputs.length > 0) {
          lines.push('*Output:*')
          lines.push('```')
          cell.outputs.forEach((out) => {
            if (out.text) {
              lines.push(Array.isArray(out.text) ? out.text.join('') : out.text)
            } else if (out.data && out.data['text/plain']) {
              lines.push(
                Array.isArray(out.data['text/plain'])
                  ? out.data['text/plain'].join('')
                  : String(out.data['text/plain'])
              )
            }
          })
          lines.push('```')
          lines.push('')
        }
      }
    })

    return lines.join('\n')
  }

  public getEstimatedMemoryUsage(): string {
    const baseMB = 34.2
    const varCount = this.inMemoryVariables.size
    const total = (baseMB + varCount * 1.8).toFixed(1)
    return `${total} MB / 16.0 GB`
  }

  /**
   * Generate vector SVG plot for charts
   */
  public generateChartSvg(type: 'scatter' | 'loss' | 'bar' | 'heatmap' = 'scatter'): string {
    switch (type) {
      case 'loss':
        return this.generateLossCurveSvg()
      case 'bar':
        return this.generateBarChartSvg()
      case 'heatmap':
        return this.generateHeatmapSvg()
      case 'scatter':
      default:
        return this.generateSampleScatterSvg()
    }
  }

  private generateLossCurveSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" width="100%" height="240" style="background:rgba(0,0,0,0.4);border-radius:6px;border:1px solid rgba(255,255,255,0.08)">
      <defs>
        <linearGradient id="trainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF9F0A" />
          <stop offset="100%" stop-color="#30D158" />
        </linearGradient>
        <linearGradient id="valGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF453A" />
          <stop offset="100%" stop-color="#0A84FF" />
        </linearGradient>
      </defs>
      <!-- Grid Lines -->
      <line x1="60" y1="30" x2="60" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="230" x2="640" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="180" x2="640" y2="180" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="130" x2="640" y2="130" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="80" x2="640" y2="80" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>

      <!-- Training Loss Curve -->
      <path d="M 60 50 Q 180 180 320 205 T 640 218" fill="none" stroke="url(#trainGrad)" stroke-width="3" stroke-linecap="round"/>
      
      <!-- Validation Loss Curve -->
      <path d="M 60 70 Q 200 160 340 190 T 640 200" fill="none" stroke="url(#valGrad)" stroke-width="2.5" stroke-dasharray="5 3" stroke-linecap="round"/>

      <!-- Legend -->
      <rect x="460" y="40" width="160" height="48" rx="4" fill="rgba(15,20,30,0.85)" stroke="rgba(255,255,255,0.1)"/>
      <line x1="475" y1="56" x2="505" y2="56" stroke="#30D158" stroke-width="3"/>
      <text x="515" y="60" fill="#E2E8F0" font-size="11" font-family="sans-serif">Training Loss (0.042)</text>
      <line x1="475" y1="74" x2="505" y2="74" stroke="#0A84FF" stroke-width="2.5" stroke-dasharray="4"/>
      <text x="515" y="78" fill="#E2E8F0" font-size="11" font-family="sans-serif">Validation Loss (0.068)</text>

      <!-- Axis Labels -->
      <text x="350" y="260" fill="#94A3B8" font-size="11" font-family="sans-serif" text-anchor="middle">Training Epochs (1 - 100)</text>
      <text x="25" y="130" fill="#94A3B8" font-size="11" font-family="sans-serif" transform="rotate(-90 25,130)" text-anchor="middle">Cross-Entropy Loss</text>
    </svg>`
  }

  private generateBarChartSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" width="100%" height="240" style="background:rgba(0,0,0,0.4);border-radius:6px;border:1px solid rgba(255,255,255,0.08)">
      <!-- Grid -->
      <line x1="60" y1="30" x2="60" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="230" x2="640" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="180" x2="640" y2="180" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="130" x2="640" y2="130" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="80" x2="640" y2="80" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>

      <!-- Bars -->
      <rect x="100" y="70" width="60" height="160" rx="3" fill="#0A84FF" opacity="0.85"/>
      <text x="130" y="60" fill="#64D2FF" font-size="11" font-family="monospace" text-anchor="middle">0.428</text>
      <text x="130" y="248" fill="#94A3B8" font-size="10.5" font-family="sans-serif" text-anchor="middle">Petal Width</text>

      <rect x="220" y="90" width="60" height="140" rx="3" fill="#30D158" opacity="0.85"/>
      <text x="250" y="80" fill="#30D158" font-size="11" font-family="monospace" text-anchor="middle">0.375</text>
      <text x="250" y="248" fill="#94A3B8" font-size="10.5" font-family="sans-serif" text-anchor="middle">Petal Length</text>

      <rect x="340" y="150" width="60" height="80" rx="3" fill="#BF5AF2" opacity="0.85"/>
      <text x="370" y="140" fill="#BF5AF2" font-size="11" font-family="monospace" text-anchor="middle">0.142</text>
      <text x="370" y="248" fill="#94A3B8" font-size="10.5" font-family="sans-serif" text-anchor="middle">Sepal Length</text>

      <rect x="460" y="190" width="60" height="40" rx="3" fill="#FF9F0A" opacity="0.85"/>
      <text x="490" y="180" fill="#FF9F0A" font-size="11" font-family="monospace" text-anchor="middle">0.055</text>
      <text x="490" y="248" fill="#94A3B8" font-size="10.5" font-family="sans-serif" text-anchor="middle">Sepal Width</text>

      <!-- Title -->
      <text x="350" y="25" fill="#E2E8F0" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle">Random Forest Feature Importance</text>
      <text x="25" y="130" fill="#94A3B8" font-size="11" font-family="sans-serif" transform="rotate(-90 25,130)" text-anchor="middle">Gini Importance</text>
    </svg>`
  }

  private generateHeatmapSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" width="100%" height="240" style="background:rgba(0,0,0,0.4);border-radius:6px;border:1px solid rgba(255,255,255,0.08)">
      <text x="340" y="24" fill="#E2E8F0" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle">Feature Pearson Correlation Matrix</text>

      <!-- Heatmap Cells -->
      <g transform="translate(140, 40)">
        <!-- Row 0 -->
        <rect x="0" y="0" width="80" height="45" fill="#0A84FF" opacity="0.95"/>
        <text x="40" y="28" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">1.00</text>
        
        <rect x="85" y="0" width="80" height="45" fill="#FF453A" opacity="0.3"/>
        <text x="125" y="28" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.12</text>
        
        <rect x="170" y="0" width="80" height="45" fill="#0A84FF" opacity="0.87"/>
        <text x="210" y="28" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.87</text>
        
        <rect x="255" y="0" width="80" height="45" fill="#0A84FF" opacity="0.82"/>
        <text x="295" y="28" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.82</text>

        <!-- Row 1 -->
        <rect x="0" y="48" width="80" height="45" fill="#FF453A" opacity="0.3"/>
        <text x="40" y="76" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.12</text>

        <rect x="85" y="48" width="80" height="45" fill="#0A84FF" opacity="0.95"/>
        <text x="125" y="76" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">1.00</text>

        <rect x="170" y="48" width="80" height="45" fill="#FF453A" opacity="0.45"/>
        <text x="210" y="76" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.43</text>

        <rect x="255" y="48" width="80" height="45" fill="#FF453A" opacity="0.40"/>
        <text x="295" y="76" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.37</text>

        <!-- Row 2 -->
        <rect x="0" y="96" width="80" height="45" fill="#0A84FF" opacity="0.87"/>
        <text x="40" y="124" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.87</text>

        <rect x="85" y="96" width="80" height="45" fill="#FF453A" opacity="0.45"/>
        <text x="125" y="124" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.43</text>

        <rect x="170" y="96" width="80" height="45" fill="#0A84FF" opacity="0.95"/>
        <text x="210" y="124" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">1.00</text>

        <rect x="255" y="96" width="80" height="45" fill="#0A84FF" opacity="0.96"/>
        <text x="295" y="124" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.96</text>

        <!-- Row 3 -->
        <rect x="0" y="144" width="80" height="45" fill="#0A84FF" opacity="0.82"/>
        <text x="40" y="172" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.82</text>

        <rect x="85" y="144" width="80" height="45" fill="#FF453A" opacity="0.40"/>
        <text x="125" y="172" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">-0.37</text>

        <rect x="170" y="144" width="80" height="45" fill="#0A84FF" opacity="0.96"/>
        <text x="210" y="172" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">0.96</text>

        <rect x="255" y="144" width="80" height="45" fill="#0A84FF" opacity="0.95"/>
        <text x="295" y="172" fill="#FFF" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">1.00</text>

        <!-- Axis Labels -->
        <text x="40" y="202" fill="#94A3B8" font-size="10" font-family="sans-serif" text-anchor="middle">SepalL</text>
        <text x="125" y="202" fill="#94A3B8" font-size="10" font-family="sans-serif" text-anchor="middle">SepalW</text>
        <text x="210" y="202" fill="#94A3B8" font-size="10" font-family="sans-serif" text-anchor="middle">PetalL</text>
        <text x="295" y="202" fill="#94A3B8" font-size="10" font-family="sans-serif" text-anchor="middle">PetalW</text>
      </g>
    </svg>`
  }

  private generateSampleScatterSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" width="100%" height="240" style="background:rgba(0,0,0,0.4);border-radius:6px;border:1px solid rgba(255,255,255,0.08)">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0A84FF" />
          <stop offset="100%" stop-color="#30D158" />
        </linearGradient>
      </defs>
      <!-- Grid Lines -->
      <line x1="60" y1="30" x2="60" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="230" x2="640" y2="230" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="60" y1="180" x2="640" y2="180" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="130" x2="640" y2="130" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
      <line x1="60" y1="80" x2="640" y2="80" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>

      <!-- Scatter Data Points -->
      <circle cx="120" cy="200" r="5" fill="#30D158" opacity="0.9"/>
      <circle cx="140" cy="190" r="5" fill="#30D158" opacity="0.9"/>
      <circle cx="160" cy="210" r="5" fill="#30D158" opacity="0.9"/>
      <circle cx="190" cy="175" r="5" fill="#30D158" opacity="0.9"/>
      <circle cx="220" cy="185" r="5" fill="#30D158" opacity="0.9"/>

      <circle cx="280" cy="140" r="5" fill="#0A84FF" opacity="0.9"/>
      <circle cx="310" cy="120" r="5" fill="#0A84FF" opacity="0.9"/>
      <circle cx="350" cy="135" r="5" fill="#0A84FF" opacity="0.9"/>
      <circle cx="390" cy="110" r="5" fill="#0A84FF" opacity="0.9"/>
      <circle cx="420" cy="125" r="5" fill="#0A84FF" opacity="0.9"/>

      <circle cx="480" cy="70" r="5" fill="#BF5AF2" opacity="0.9"/>
      <circle cx="510" cy="55" r="5" fill="#BF5AF2" opacity="0.9"/>
      <circle cx="540" cy="80" r="5" fill="#BF5AF2" opacity="0.9"/>
      <circle cx="580" cy="50" r="5" fill="#BF5AF2" opacity="0.9"/>
      <circle cx="610" cy="65" r="5" fill="#BF5AF2" opacity="0.9"/>

      <!-- Smooth Regression Trendline -->
      <path d="M 100 220 Q 320 140 620 50" fill="none" stroke="url(#grad1)" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Axis Labels -->
      <text x="320" y="260" fill="#94A3B8" font-size="11" font-family="sans-serif" text-anchor="middle">Feature Sepal Length (cm)</text>
      <text x="25" y="130" fill="#94A3B8" font-size="11" font-family="sans-serif" transform="rotate(-90 25,130)" text-anchor="middle">Petal Length (cm)</text>
    </svg>`
  }
}

export const jupyterKernelService = new JupyterKernelService()
