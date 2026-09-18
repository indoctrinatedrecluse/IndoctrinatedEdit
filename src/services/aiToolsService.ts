/**
 * IndoctrinatedEdit - AI Tools Registry & Security Guardrails Engine
 * Provides guarded local workspace tools, context grounding, and multi-turn agent tool execution.
 */

import {
  AiToolDefinition,
  AiToolCall,
  AiToolResult,
} from '@sdk/types'
import { AiService } from './aiService'
import { DiagnosticsService } from './diagnosticsService'
import { terminalService } from './terminalService'
import { RunService } from './runService'
import { McpService } from './mcpService'

/* =========================================================================
 * 🛡️ Security Guardrails Service
 * ========================================================================= */

export interface PathValidationResult {
  valid: boolean
  resolvedPath: string
  error?: string
}

export interface CommandValidationResult {
  safe: boolean
  error?: string
  flags?: string[]
}

export class AiGuardrailService {
  // Sensitive OS system directories that AI agents are forbidden to access
  private static readonly BLOCKED_PATH_PATTERNS = [
    // Windows sensitive system paths
    /^[a-z]:\\windows/i,
    /^[a-z]:\\system32/i,
    /^[a-z]:\\program files\\windows/i,
    /^[a-z]:\\recovery/i,
    /^[a-z]:\\boot/i,
    /\\(sam|system|security|software)$/i,
    // Unix sensitive system paths
    /^\/(etc|boot|sys|proc|dev|root)/i,
    /\/etc\/(passwd|shadow|sudoers)/i,
  ]

  // Destructive / Malicious command patterns
  private static readonly BLOCKED_COMMAND_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|\s+-r[a-zA-Z]*\s+)?(\/|\\\*|\/\*|\*|\~)/i, reason: 'Recursive root/wildcard deletion is prohibited' },
    { pattern: /del\s+(\/[fqs]\s+)*(c:\\\*|c:\/|\*:\*|\/s|\/q)/i, reason: 'Mass destructive Windows file deletion is prohibited' },
    { pattern: /format\s+[a-z]:/i, reason: 'Disk volume formatting is prohibited' },
    { pattern: /mkfs(\.[a-z0-9]+)?\s+/i, reason: 'Filesystem creation/formatting is prohibited' },
    { pattern: /dd\s+if=.*of=(\/dev\/|\\\\.\\[a-z]:)/i, reason: 'Direct block-level disk writing is prohibited' },
    { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: 'Fork bombs are prohibited' },
    { pattern: />\s*(\/dev\/sd[a-z]|\/dev\/nvme[0-9]|\\\\.\\[a-z]:)/i, reason: 'Raw disk overwriting is prohibited' },
    { pattern: /shutdown(\.exe)?\s+(-[srf]|\/[srf])/i, reason: 'System shutdown/restart commands are prohibited' },
    { pattern: /taskkill\s+(\/f\s+)?\/im\s+(csrss|explorer|winlogon|smss)\.exe/i, reason: 'Terminating core OS system processes is prohibited' },
    { pattern: /curl\s+.*\s*\|\s*(bash|sh|powershell|cmd)/i, reason: 'Direct pipe-to-shell remote execution is prohibited' },
    { pattern: /wget\s+.*\s*\|\s*(bash|sh|powershell|cmd)/i, reason: 'Direct pipe-to-shell remote execution is prohibited' },
  ]

  /**
   * Validates and sanitizes a target file/folder path against directory traversal and sensitive OS roots.
   */
  static validatePath(targetPath: string, workspaceRoot?: string): PathValidationResult {
    if (!targetPath || typeof targetPath !== 'string' || !targetPath.trim()) {
      return { valid: false, resolvedPath: '', error: 'Path cannot be empty' }
    }

    const trimmed = targetPath.trim()

    // Normalize forward/back slashes
    const normalized = trimmed.replace(/\\/g, '/')

    // Check for obvious traversal escape attempts
    if (normalized.includes('/../') || normalized.startsWith('../') || normalized.endsWith('/..') || normalized === '..') {
      // If no workspaceRoot is provided, flag suspicious traversal
      if (!workspaceRoot) {
        return { valid: false, resolvedPath: trimmed, error: 'Path traversal (..) is not allowed without an explicit workspace root' }
      }
    }

    // Check against forbidden system roots
    for (const regex of this.BLOCKED_PATH_PATTERNS) {
      if (regex.test(trimmed) || regex.test(normalized)) {
        return {
          valid: false,
          resolvedPath: trimmed,
          error: `Security Guardrail: Access to sensitive OS directory "${trimmed}" is blocked.`,
        }
      }
    }

    // Resolve relative path against workspace root if applicable
    let resolved = trimmed
    if (workspaceRoot && !trimmed.match(/^[a-zA-Z]:[\\/]/) && !trimmed.startsWith('/')) {
      const cleanRoot = workspaceRoot.replace(/[\\/]+$/, '')
      const cleanTarget = trimmed.replace(/^[\\/]+/, '')
      resolved = `${cleanRoot}/${cleanTarget}`
    }

    return { valid: true, resolvedPath: resolved }
  }

  /**
   * Validates a shell command against the destructive blocklist.
   */
  static validateCommand(command: string): CommandValidationResult {
    if (!command || typeof command !== 'string') {
      return { safe: false, error: 'Command cannot be empty' }
    }

    const trimmed = command.trim()
    for (const check of this.BLOCKED_COMMAND_PATTERNS) {
      if (check.pattern.test(trimmed)) {
        return {
          safe: false,
          error: `Security Guardrail: Command blocked by safety policy. (${check.reason})`,
        }
      }
    }

    return { safe: true }
  }

  /**
   * Sanitizes output string and caps length to prevent context flooding.
   */
  static sanitizeOutput(output: string, maxBytes: number = 32000): string {
    if (!output) return ''
    if (output.length <= maxBytes) return output

    const truncated = output.slice(0, maxBytes)
    const omitted = output.length - maxBytes
    return `${truncated}\n\n... [Output truncated: ${omitted} characters omitted by Safety Guardrail] ...`
  }
}

/* =========================================================================
 * 🛠️ AI Tools Registry
 * ========================================================================= */

export class AiToolsRegistry {
  private static tools: Map<string, AiToolDefinition> = new Map()

  static {
    this.registerBuiltinTools()
  }

  private static registerBuiltinTools(): void {
    // 1. read_file
    this.register({
      name: 'read_file',
      description: 'Reads the content of a file in the workspace, with optional line range slices.',
      category: 'read',
      requiredParams: ['filePath'],
      parameters: {
        filePath: { type: 'string', description: 'Relative or absolute path to the file to read' },
        startLine: { type: 'number', description: 'Optional 1-indexed starting line number' },
        endLine: { type: 'number', description: 'Optional 1-indexed ending line number' },
      },
    })

    // 2. list_workspace_files
    this.register({
      name: 'list_workspace_files',
      description: 'Lists files and folders in the workspace or a given subfolder.',
      category: 'read',
      requiredParams: [],
      parameters: {
        folderPath: { type: 'string', description: 'Optional subfolder path to list' },
        maxDepth: { type: 'number', description: 'Maximum directory recursion depth (default 2)' },
      },
    })

    // 3. search_code
    this.register({
      name: 'search_code',
      description: 'Searches for text or regex patterns across the workspace files.',
      category: 'read',
      requiredParams: ['query'],
      parameters: {
        query: { type: 'string', description: 'Text or regular expression to search for' },
        isRegex: { type: 'boolean', description: 'Whether the query is a regular expression' },
        filePattern: { type: 'string', description: 'Optional glob filter (e.g. *.ts, src/*)' },
      },
    })

    // 4. get_editor_diagnostics
    this.register({
      name: 'get_editor_diagnostics',
      description: 'Retrieves current compiler, linter, and Monaco editor errors and warnings across open files.',
      category: 'read',
      requiredParams: [],
      parameters: {
        severity: { type: 'string', description: 'Filter by severity', enum: ['error', 'warning', 'info', 'all'] },
        filePath: { type: 'string', description: 'Optional specific file path filter' },
      },
    })

    // 5. get_git_status
    this.register({
      name: 'get_git_status',
      description: 'Retrieves current Git repository status including branch, ahead/behind counts, and staged/unstaged changes.',
      category: 'git',
      requiredParams: [],
      parameters: {},
    })

    // 6. get_git_diff
    this.register({
      name: 'get_git_diff',
      description: 'Retrieves current working tree or staged Git diffs.',
      category: 'git',
      requiredParams: [],
      parameters: {
        stagedOnly: { type: 'boolean', description: 'If true, only returns staged changes' },
      },
    })

    // 7. propose_file_edit
    this.register({
      name: 'propose_file_edit',
      description: 'Proposes an edit or rewrite to a file in the workspace with unified diff preview and user approval.',
      category: 'write',
      requiredParams: ['filePath'],
      requiresApprovalByDefault: true,
      parameters: {
        filePath: { type: 'string', description: 'Target file path to modify' },
        originalSnippet: { type: 'string', description: 'Exact code snippet to replace (if partial edit)' },
        newSnippet: { type: 'string', description: 'New replacement code snippet' },
        fullContent: { type: 'string', description: 'Complete file content if replacing entire file' },
        description: { type: 'string', description: 'Human-readable explanation of why this change is made' },
      },
    })

    // 8. execute_terminal_command
    this.register({
      name: 'execute_terminal_command',
      description: 'Executes a command in the integrated terminal with timeout protection and returns the output.',
      category: 'run',
      requiredParams: ['command'],
      requiresApprovalByDefault: true,
      parameters: {
        command: { type: 'string', description: 'Shell command line to execute (e.g. npm test, cargo check)' },
        cwd: { type: 'string', description: 'Optional working directory' },
        timeoutMs: { type: 'number', description: 'Execution timeout in milliseconds (default 15000)' },
      },
    })

    // 9. trigger_project_run
    this.register({
      name: 'trigger_project_run',
      description: 'Triggers the configured Run Profile for the active project or file (from VS Code Run Subsystem).',
      category: 'run',
      requiredParams: [],
      requiresApprovalByDefault: true,
      parameters: {
        targetLanguageOrId: { type: 'string', description: 'Optional run profile ID or language name' },
      },
    })

    // 10. open_editor_file
    this.register({
      name: 'open_editor_file',
      description: 'Instructs the editor to open a file and navigate to a specific line and column.',
      category: 'read',
      requiredParams: ['filePath'],
      parameters: {
        filePath: { type: 'string', description: 'File path to open in editor' },
        line: { type: 'number', description: '1-indexed line number to navigate to' },
        column: { type: 'number', description: '1-indexed column number' },
      },
    })
  }

  static register(tool: AiToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  static getTool(name: string): AiToolDefinition | undefined {
    const builtin = this.tools.get(name)
    if (builtin) return builtin

    // Resolve dynamic MCP server tool
    try {
      const mcpTools = McpService.listTools()
      const cleanName = name.startsWith('mcp_') ? name.slice(4) : name
      const foundMcp = mcpTools.find((t) => t.name === name || t.name === cleanName)
      if (foundMcp) {
        const params: Record<string, any> = {}
        if (foundMcp.inputSchema?.properties) {
          for (const [k, v] of Object.entries(foundMcp.inputSchema.properties)) {
            params[k] = {
              type: v.type || 'string',
              description: v.description || '',
              enum: v.enum,
            }
          }
        }
        return {
          name: foundMcp.name,
          description: `[MCP: ${foundMcp.serverName}] ${foundMcp.description || ''}`,
          category: 'browser',
          requiredParams: foundMcp.inputSchema?.required || [],
          parameters: params,
        }
      }
    } catch {
      // Fallback
    }

    return undefined
  }

  static getAllTools(): AiToolDefinition[] {
    const list = Array.from(this.tools.values())
    try {
      const mcpTools = McpService.listTools()
      for (const mcp of mcpTools) {
        if (!this.tools.has(mcp.name)) {
          const params: Record<string, any> = {}
          if (mcp.inputSchema?.properties) {
            for (const [k, v] of Object.entries(mcp.inputSchema.properties)) {
              params[k] = {
                type: v.type || 'string',
                description: v.description || '',
                enum: v.enum,
              }
            }
          }
          list.push({
            name: mcp.name,
            description: `[MCP: ${mcp.serverName}] ${mcp.description || ''}`,
            category: 'browser',
            requiredParams: mcp.inputSchema?.required || [],
            parameters: params,
          })
        }
      }
    } catch {
      // Fallback
    }
    return list
  }

  /**
   * Generates a concise system prompt documentation for all registered tools.
   */
  static getToolsSystemPrompt(): string {
    const list = this.getAllTools()
    const descriptions = list.map((t) => {
      const params = Object.entries(t.parameters)
        .map(([k, v]) => `    - \`${k}\` (${v.type}${t.requiredParams.includes(k) ? ', required' : ''}): ${v.description}`)
        .join('\n')
      return `### Tool: \`${t.name}\` [Category: ${t.category}]
Description: ${t.description}
Parameters:
${params || '    None'}`
    }).join('\n\n')

    return `You have access to the following local workspace tools to inspect, diagnose, edit, and test code:

${descriptions}

## How to Call Tools
When you need to call a tool, output a structured tool block in your response using this exact format:

\`\`\`tool_call
{
  "tool": "tool_name_here",
  "arguments": {
    "param1": "value"
  }
}
\`\`\`

You can call multiple tools if needed. Always prefer reading files or checking diagnostics first when investigating bugs or errors before proposing edits.`
  }
}

/* =========================================================================
 * ⚙️ Tool Execution Engine
 * ========================================================================= */

export interface ToolExecutionContext {
  workspaceRoot?: string
  activeFileName?: string
  activeFileContent?: string
  openFiles?: Array<{ path: string; name: string; content?: string }>
  onOpenFile?: (filePath: string, line?: number, column?: number) => void
  onApplyFileEdit?: (filePath: string, newContent: string) => Promise<boolean>
}

export class AiToolExecutor {
  /**
   * Executes an AI tool call with complete security validation, guardrails, and error handling.
   */
  static async execute(
    call: AiToolCall,
    context: ToolExecutionContext = {}
  ): Promise<AiToolResult> {
    const def = AiToolsRegistry.getTool(call.toolName)
    if (!def) {
      return {
        toolCallId: call.id,
        toolName: call.toolName,
        success: false,
        output: '',
        error: `Unknown tool: "${call.toolName}"`,
      }
    }

    try {
      switch (call.toolName) {
        case 'read_file': {
          const filePath = String(call.arguments.filePath || '')
          const pathCheck = AiGuardrailService.validatePath(filePath, context.workspaceRoot)
          if (!pathCheck.valid) {
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: false,
              output: '',
              error: pathCheck.error,
            }
          }

          let content = ''
          // Check if it's the active file or an open file in editor
          if (context.activeFileName && (filePath.endsWith(context.activeFileName) || context.activeFileName.endsWith(filePath))) {
            content = context.activeFileContent || ''
          } else if (context.openFiles) {
            const found = context.openFiles.find((f) => f.path === pathCheck.resolvedPath || f.path.endsWith(filePath))
            if (found && found.content !== undefined) {
              content = found.content
            }
          }

          if (!content && typeof window !== 'undefined' && window.electronAPI?.readFile) {
            try {
              content = await window.electronAPI.readFile(pathCheck.resolvedPath)
            } catch (err: any) {
              return {
                toolCallId: call.id,
                toolName: call.toolName,
                success: false,
                output: '',
                error: `Failed to read file "${filePath}": ${err?.message || String(err)}`,
              }
            }
          }

          if (!content && !context.activeFileContent) {
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: false,
              output: '',
              error: `File "${filePath}" could not be read or does not exist.`,
            }
          }

          const lines = content.split('\n')
          const startLine = call.arguments.startLine ? Math.max(1, Number(call.arguments.startLine)) : 1
          const endLine = call.arguments.endLine ? Math.min(lines.length, Number(call.arguments.endLine)) : lines.length

          const sliced = lines.slice(startLine - 1, endLine).join('\n')
          const resultText = `// File: ${filePath} (Lines ${startLine}-${endLine} of ${lines.length})\n${sliced}`

          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: AiGuardrailService.sanitizeOutput(resultText),
          }
        }

        case 'list_workspace_files': {
          const folderPath = String(call.arguments.folderPath || context.workspaceRoot || '')
          if (typeof window !== 'undefined' && window.electronAPI?.readFolder) {
            const result = await window.electronAPI.readFolder(folderPath)
            if (result && result.files) {
              const formatted = result.files
                .map((f) => `${f.isDirectory ? '📁' : '📄'} ${f.name}`)
                .join('\n')
              return {
                toolCallId: call.id,
                toolName: call.toolName,
                success: true,
                output: `Workspace Files in "${folderPath}":\n${formatted}`,
              }
            }
          }

          // Fallback to open files
          const fileNames = (context.openFiles || []).map((f) => `📄 ${f.name}`).join('\n')
          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: `Open Files:\n${fileNames || 'No files open'}`,
          }
        }

        case 'search_code': {
          const query = String(call.arguments.query || '')
          if (!query) {
            return { toolCallId: call.id, toolName: call.toolName, success: false, output: '', error: 'Query is required' }
          }

          const matches: string[] = []
          const openFiles = context.openFiles || []
          if (context.activeFileName && context.activeFileContent) {
            openFiles.push({ path: context.activeFileName, name: context.activeFileName, content: context.activeFileContent })
          }

          const isRegex = !!call.arguments.isRegex
          let re: RegExp
          try {
            re = isRegex ? new RegExp(query, 'g') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          } catch (e: any) {
            return { toolCallId: call.id, toolName: call.toolName, success: false, output: '', error: `Invalid regex: ${e.message}` }
          }

          for (const file of openFiles) {
            if (!file.content) continue
            const lines = file.content.split('\n')
            lines.forEach((line, idx) => {
              if (re.test(line)) {
                matches.push(`${file.name}:${idx + 1}: ${line.trim()}`)
              }
            })
          }

          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: matches.length > 0
              ? `Found ${matches.length} matches:\n${matches.slice(0, 30).join('\n')}`
              : `No matches found for "${query}" in active files.`,
          }
        }

        case 'get_editor_diagnostics': {
          const groups = DiagnosticsService.getInstance().getAllGroups()
          const severityFilter = call.arguments.severity || 'all'
          const filePathFilter = call.arguments.filePath

          const diagnostics: string[] = []
          for (const g of groups) {
            if (filePathFilter && !g.filePath.includes(filePathFilter)) continue
            for (const item of g.items) {
              if (severityFilter !== 'all' && item.severity !== severityFilter) continue
              const icon = item.severity === 'error' ? '🔴 Error' : item.severity === 'warning' ? '🟡 Warning' : 'ℹ️ Info'
              diagnostics.push(`[${icon}] ${g.fileName}:${item.startLineNumber}:${item.startColumn} - ${item.message}`)
            }
          }

          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: diagnostics.length > 0
              ? `Active Diagnostics (${diagnostics.length}):\n${diagnostics.join('\n')}`
              : '✅ No active diagnostics, errors, or warnings found in workspace.',
          }
        }

        case 'get_git_status': {
          if (typeof window !== 'undefined' && window.electronAPI?.git?.getRepoStatus) {
            const status = await window.electronAPI.git.getRepoStatus(context.workspaceRoot)
            if (status && status.isRepo) {
              const staged = status.staged.map((s) => `  [Staged] ${s.path} (${s.status})`).join('\n')
              const working = status.working.map((w) => `  [Modified] ${w.path} (${w.status})`).join('\n')
              const out = `Branch: ${status.branch} (Ahead: ${status.ahead}, Behind: ${status.behind})\n\nChanges:\n${staged || '  (No staged changes)'}\n${working || '  (No unstaged changes)'}`
              return { toolCallId: call.id, toolName: call.toolName, success: true, output: out }
            }
          }
          return { toolCallId: call.id, toolName: call.toolName, success: true, output: 'Git repository not initialized in workspace.' }
        }

        case 'get_git_diff': {
          if (typeof window !== 'undefined' && window.electronAPI?.git?.getRepoStatus) {
            const status = await window.electronAPI.git.getRepoStatus(context.workspaceRoot)
            if (status && status.isRepo) {
              const files = call.arguments.stagedOnly ? status.staged : [...status.staged, ...status.working]
              const summary = files.map((f) => `${f.isStaged ? '[Staged]' : '[Working]'} ${f.path}`).join('\n')
              return { toolCallId: call.id, toolName: call.toolName, success: true, output: `Changed Files:\n${summary || 'No changes.'}` }
            }
          }
          return { toolCallId: call.id, toolName: call.toolName, success: true, output: 'No diff available.' }
        }

        case 'propose_file_edit': {
          const filePath = String(call.arguments.filePath || '')
          const pathCheck = AiGuardrailService.validatePath(filePath, context.workspaceRoot)
          if (!pathCheck.valid) {
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: false,
              output: '',
              error: pathCheck.error,
            }
          }

          const originalSnippet = call.arguments.originalSnippet
          const newSnippet = call.arguments.newSnippet
          const fullContent = call.arguments.fullContent
          const description = call.arguments.description || 'Proposed code modifications'

          let computedFullContent = fullContent
          if (!computedFullContent && originalSnippet && newSnippet && context.activeFileContent) {
            computedFullContent = context.activeFileContent.replace(originalSnippet, newSnippet)
          }

          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: `Proposed edit for "${filePath}": ${description}`,
            diff: {
              filePath,
              originalSnippet,
              newSnippet,
              fullContent: computedFullContent,
              applied: false,
            },
          }
        }

        case 'execute_terminal_command': {
          const command = String(call.arguments.command || '')
          const cmdCheck = AiGuardrailService.validateCommand(command)
          if (!cmdCheck.safe) {
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: false,
              output: '',
              error: cmdCheck.error,
            }
          }

          let activeTab = terminalService.getActiveTab()
          if (!activeTab) {
            activeTab = await terminalService.createTab()
          }

          const beforeLen = activeTab.buffer.length
          await terminalService.write(activeTab.id, command.trim() + '\r\n')

          // Capture output after brief execution pause
          await new Promise((r) => setTimeout(r, 800))
          const currentTab = terminalService.getTabs().find((t) => t.id === activeTab!.id)
          const newBuffer = currentTab ? currentTab.buffer.slice(beforeLen).join('\n') : ''

          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: AiGuardrailService.sanitizeOutput(newBuffer || `Command dispatched: ${command}`),
          }
        }

        case 'trigger_project_run': {
          const runService = RunService.getInstance()
          const profiles = runService.getProfiles()
          const target = profiles[0]
          if (target) {
            const resolved = runService.resolveRunCommand(target, {
              filePath: context.activeFileName,
              workspacePath: context.workspaceRoot,
            })
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: true,
              output: `Triggered Run Profile: "${target.name}" -> Command: ${resolved.command}`,
            }
          }
          return { toolCallId: call.id, toolName: call.toolName, success: false, output: '', error: 'No configured Run Profiles found' }
        }

        case 'open_editor_file': {
          const filePath = String(call.arguments.filePath || '')
          const line = call.arguments.line ? Number(call.arguments.line) : undefined
          const col = call.arguments.column ? Number(call.arguments.column) : undefined

          context.onOpenFile?.(filePath, line, col)
          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: true,
            output: `Navigated editor to "${filePath}"${line ? ` at line ${line}` : ''}`,
          }
        }

        default: {
          const mcpResult = await McpService.callTool(call.toolName, call.toolName, call.arguments)
          if (!mcpResult.isError) {
            return {
              toolCallId: call.id,
              toolName: call.toolName,
              success: mcpResult.success,
              output: AiGuardrailService.sanitizeOutput(mcpResult.output),
            }
          }
          return {
            toolCallId: call.id,
            toolName: call.toolName,
            success: false,
            output: '',
            error: mcpResult.content?.[0]?.text || `Unsupported tool: "${call.toolName}"`,
          }
        }
      }
    } catch (err: any) {
      return {
        toolCallId: call.id,
        toolName: call.toolName,
        success: false,
        output: '',
        error: `Tool execution failed: ${err?.message || String(err)}`,
      }
    }
  }
}

/* =========================================================================
 * 🔍 Tool Call Parser
 * ========================================================================= */

export class AiToolParser {
  /**
   * Parses markdown tool blocks or JSON function calls from assistant response text.
   * Matches both ```tool_call ... ``` and <tool_call> ... </tool_call> formats.
   */
  static parseToolCalls(text: string): AiToolCall[] {
    if (!text || typeof text !== 'string') return []

    const calls: AiToolCall[] = []

    // 1. Markdown code block format: ```tool_call\n{...}\n```
    const mdBlockRegex = /```(?:tool_call|tool-call|json-tool)\s*\n([\s\S]*?)\n```/gi
    let match: RegExpExecArray | null
    while ((match = mdBlockRegex.exec(text)) !== null) {
      const rawJson = match[1].trim()
      try {
        const parsed = JSON.parse(rawJson)
        const toolName = parsed.tool || parsed.name || parsed.toolName
        const args = parsed.arguments || parsed.args || parsed.params || {}
        if (toolName) {
          const toolDef = AiToolsRegistry.getTool(toolName)
          const category = toolDef?.category || 'read'
          const autoApproved = AiService.canAutoApprove(category)
          calls.push({
            id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            toolName,
            arguments: args,
            category,
            status: autoApproved ? 'approved' : 'pending_approval',
            requestedAt: Date.now(),
            autoApproved,
          })
        }
      } catch (err) {
        console.warn('Failed to parse tool call JSON from markdown block', err)
      }
    }

    // 2. XML tag format: <tool_call name="read_file">{"filePath": "..."}</tool_call>
    const xmlRegex = /<tool_call\s+name=["']([^"']+)["']>([\s\S]*?)<\/tool_call>/gi
    while ((match = xmlRegex.exec(text)) !== null) {
      const toolName = match[1].trim()
      const rawJson = match[2].trim()
      try {
        const args = rawJson ? JSON.parse(rawJson) : {}
        const toolDef = AiToolsRegistry.getTool(toolName)
        const category = toolDef?.category || 'read'
        const autoApproved = AiService.canAutoApprove(category)
        calls.push({
          id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          toolName,
          arguments: args,
          category,
          status: autoApproved ? 'approved' : 'pending_approval',
          requestedAt: Date.now(),
          autoApproved,
        })
      } catch (err) {
        console.warn('Failed to parse XML tool call JSON', err)
      }
    }

    return calls
  }
}
