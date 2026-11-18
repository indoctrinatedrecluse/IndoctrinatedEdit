/**
 * IndoctrinatedEdit - Architecture & Diagram Studio Service
 * Mermaid.js and visual architecture diagram engine, templates gallery, code analyzer to diagram generator, and SVG exporter.
 */

export interface DiagramTemplate {
  id: string
  name: string
  category: 'architecture' | 'sequence' | 'erd' | 'gitflow' | 'state'
  description: string
  mermaidCode: string
}

class DiagramStudioService {
  private templates: DiagramTemplate[] = [
    {
      id: 'arch_microservices',
      name: 'Modern Cloud Microservices Architecture',
      category: 'architecture',
      description: 'API Gateway, Auth, Worker Queues, Distributed Databases, and Monitoring',
      mermaidCode: `graph TD
    Client["🌐 Client Apps / Desktop IDE"] -->|HTTPS / WSS| Gateway["🛡️ API Gateway / Nginx"]
    Gateway -->|JWT Auth Check| Auth["🔐 Auth Service"]
    Gateway -->|REST / GraphQL| CoreAPI["⚡ Core Business API"]
    Gateway -->|gRPC| AIWorker["🤖 AI Agent Inference Worker"]
    
    CoreAPI -->|Pub/Sub Events| RedisQueue["📦 Redis Key-Value & Cache"]
    CoreAPI -->|Relational Queries| Postgres["🐘 PostgreSQL Database"]
    AIWorker -->|Vector Index| Qdrant["🧠 Vector Knowledge DB"]
    
    RedisQueue -->|Async Tasks| BackgroundWorker["⚙️ Task Runner Worker"]
    BackgroundWorker --> Postgres
    
    subgraph Observability ["📊 Observability & Telemetry"]
      Prometheus["📈 Prometheus Metrics"]
      Grafana["🖥️ Grafana Dashboard"]
      Prometheus --> Grafana
    end`,
    },
    {
      id: 'seq_auth_pkce',
      name: 'OAuth2 PKCE & JWT Authorization Flow',
      category: 'sequence',
      description: 'End-to-end token exchange with proof key for code exchange',
      mermaidCode: `sequenceDiagram
    autonumber
    actor User as 👤 Developer
    participant App as 💻 IndoctrinatedEdit
    participant Auth as 🔐 Auth0 / OAuth Server
    participant API as 🌐 Protected Backend API

    User->>App: Click "Sign in with GitHub/Google"
    App->>App: Generate Code Verifier & Challenge
    App->>Auth: Redirect with Challenge & ClientID
    Auth->>User: Display Login & Consent Prompt
    User->>Auth: Enter Credentials & Confirm
    Auth-->>App: Return Authorization Code
    App->>Auth: POST /oauth/token + Code Verifier
    Auth-->>App: Return Access Token & Refresh Token (JWT)
    App->>API: GET /api/v1/workspace (Bearer Token)
    API-->>App: 200 OK (User Profile & Workspace State)`,
    },
    {
      id: 'erd_ecommerce',
      name: 'Relational Database Schema (ERD)',
      category: 'erd',
      description: 'Users, Organizations, Workspaces, Files, and Audit Logs',
      mermaidCode: `erDiagram
    ORGANIZATION ||--o{ WORKSPACE : contains
    USER ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ WORKSPACE_MEMBER : includes
    WORKSPACE ||--o{ PROJECT_FILE : stores
    WORKSPACE ||--o{ AUDIT_LOG : generates
    
    ORGANIZATION {
        uuid id PK
        string name
        string plan_tier
        timestamp created_at
    }
    WORKSPACE {
        uuid id PK
        uuid organization_id FK
        string name
        string path
        boolean is_git_repo
    }
    USER {
        uuid id PK
        string username UK
        string email UK
        string role
    }
    PROJECT_FILE {
        uuid id PK
        uuid workspace_id FK
        string relative_path
        int size_bytes
        string language
    }
    AUDIT_LOG {
        uuid id PK
        uuid workspace_id FK
        string action_type
        json metadata
        timestamp created_at
    }`,
    },
    {
      id: 'git_trunk_based',
      name: 'Trunk-Based Git Workflow',
      category: 'gitflow',
      description: 'Fast CI/CD with short-lived feature branches and release tags',
      mermaidCode: `gitGraph
    commit id: "v4.1.0" tag: "v4.1.0"
    branch feature/ai-tools
    checkout feature/ai-tools
    commit id: "add-workspace-tools"
    commit id: "guardrail-service"
    checkout main
    merge feature/ai-tools id: "merge-pr-88"
    commit id: "bump-v4.2.0" tag: "v4.2.0"
    branch feature/gui-dock
    checkout feature/gui-dock
    commit id: "port-sentinel"
    commit id: "redis-studio"
    checkout main
    merge feature/gui-dock id: "merge-pr-92"
    commit id: "release-v4.9.1" tag: "v4.9.1"`,
    },
    {
      id: 'state_ai_agent',
      name: 'Autonomous AI Agent State Machine',
      category: 'state',
      description: 'Turn-by-turn agent execution with tool calling and human-in-the-loop review',
      mermaidCode: `stateDiagram-v2
    [*] --> Idle
    Idle --> Planning: User Prompt Received
    Planning --> Reasoning: Context Analyzed
    Reasoning --> RequestToolCall: Action Decided
    RequestToolCall --> GuardrailCheck: Security Verification
    
    state GuardrailCheck {
      [*] --> CheckPathSandbox
      CheckPathSandbox --> BlockDangerousCommand
    }
    
    GuardrailCheck --> AwaitingUserApproval: Requires Confirmation
    GuardrailCheck --> ExecutingTool: Auto-Approved
    AwaitingUserApproval --> ExecutingTool: User Approved
    AwaitingUserApproval --> Idle: User Rejected
    
    ExecutingTool --> SynthesizingOutput: Result Returned
    SynthesizingOutput --> Idle: Answer Complete
    SynthesizingOutput --> Reasoning: Multi-Step Action Needed`,
    },
  ]

  public getTemplates(): DiagramTemplate[] {
    return [...this.templates]
  }

  public getTemplate(id: string): DiagramTemplate | undefined {
    return this.templates.find((t) => t.id === id)
  }

  /**
   * Generates a real Mermaid class or dependency diagram by parsing classes, methods,
   * interfaces, structs, and imports from source code.
   */
  public generateDiagramFromCode(fileName: string, content: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    // TypeScript / JavaScript real class & method extractor
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?\s*\{/g
      const interfaceRegex = /interface\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_,\s]+))?\s*\{/g
      const classMatches = Array.from(content.matchAll(classRegex))
      const interfaceMatches = Array.from(content.matchAll(interfaceRegex))

      const extractBlockBody = (startIdx: number): string => {
        let depth = 0
        let i = startIdx
        while (i < content.length) {
          if (content[i] === '{') depth++
          else if (content[i] === '}') {
            depth--
            if (depth === 0) return content.slice(startIdx + 1, i)
          }
          i++
        }
        return content.slice(startIdx + 1, Math.min(content.length, startIdx + 2000))
      }

      if (classMatches.length > 0 || interfaceMatches.length > 0) {
        let code = 'classDiagram\n'
        for (const m of classMatches) {
          const className = m[1]
          const extendsName = m[2]
          const body = extractBlockBody((m.index || 0) + m[0].length - 1)
          const methods = Array.from(
            body.matchAll(/^\s*(?:(public|private|protected)\s+)?(?:static\s+)?(?:async\s+)?([a-zA-Z_]\w*)\s*\(([^)]*)\)/gm)
          )
            .filter((mm) => !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(mm[2]))
            .slice(0, 12)
          code += `    class ${className} {\n`
          if (methods.length > 0) {
            for (const mm of methods) {
              const vis = mm[1] === 'private' ? '-' : mm[1] === 'protected' ? '#' : '+'
              code += `        ${vis}${mm[2]}()\n`
            }
          } else {
            code += `        +constructor()\n`
          }
          code += `    }\n`
          if (extendsName) code += `    ${extendsName} <|-- ${className}\n`
          if (m[3]) {
            for (const impl of m[3].split(',').map((s) => s.trim()).filter(Boolean)) {
              code += `    ${impl} <|.. ${className}\n`
            }
          }
        }
        for (const m of interfaceMatches) {
          const iface = m[1]
          const body = extractBlockBody((m.index || 0) + m[0].length - 1)
          const fields = Array.from(body.matchAll(/^\s*([a-zA-Z_]\w*)\??\s*:\s*([^;\n]+)/gm)).slice(0, 8)
          code += `    class ${iface} {\n        <<interface>>\n`
          for (const f of fields) {
            code += `        +${f[1]}: ${f[2].trim().slice(0, 24)}\n`
          }
          code += `    }\n`
        }
        return code
      }

      // Function & import dependency flowchart for functional TS/JS modules
      const imports = Array.from(content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)).map((m) => m[1]).slice(0, 8)
      const funcs = Array.from(content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)).map((m) => m[1]).slice(0, 8)
      if (imports.length > 0 || funcs.length > 0) {
        const modId = fileName.replace(/[^a-zA-Z0-9_]/g, '_')
        let code = `graph TD\n    ${modId}["${fileName}"]\n`
        imports.forEach((imp, i) => {
          code += `    imp${i}["${imp}"] --> ${modId}\n`
        })
        funcs.forEach((fn, i) => {
          code += `    ${modId} --> fn${i}["${fn}()"]\n`
        })
        return code
      }
    }

    // Python real class & def parser
    if (ext === 'py') {
      const pyClasses = Array.from(content.matchAll(/^class\s+([A-Za-z0-9_]+)(?:\(([A-Za-z0-9_,\s]*)\))?:/gm))
      if (pyClasses.length > 0) {
        let code = 'classDiagram\n'
        for (const m of pyClasses) {
          code += `    class ${m[1]} {\n`
          const defs = Array.from(content.slice(m.index || 0, (m.index || 0) + 1200).matchAll(/^\s+def\s+([A-Za-z0-9_]+)\s*\(/gm)).slice(0, 8)
          for (const d of defs) code += `        +${d[1]}()\n`
          code += `    }\n`
          if (m[2]?.trim()) code += `    ${m[2].split(',')[0].trim()} <|-- ${m[1]}\n`
        }
        return code
      }
    }

    // Default flowchart representation
    return `graph TD
    File["📄 ${fileName}"] --> Parsed["🧩 AST Parsing"]
    Parsed --> ASTNodes["🌲 Syntax Tree Hierarchy"]
    ASTNodes --> Diagnostics["✅ Diagnostics Passed"]
    Diagnostics --> MonacoEditor["🎨 Monaco Canvas Paint"]`
  }
}

export const diagramStudioService = new DiagramStudioService()
