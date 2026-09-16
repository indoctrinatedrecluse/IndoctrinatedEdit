/**
 * Database Service & SQL Execution Engine
 * Provides schema introspection, SQL execution, query history, and data export for Database Studio.
 */

export interface DatabaseColumn {
  name: string
  type: string
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  foreignKeyRef?: { table: string; column: string }
  isNullable?: boolean
  defaultValue?: string
}

export interface DatabaseIndex {
  name: string
  columns: string[]
  isUnique?: boolean
}

export interface DatabaseTable {
  name: string
  description?: string
  columns: DatabaseColumn[]
  indexes?: DatabaseIndex[]
  rowCount: number
  data: Record<string, any>[]
}

export interface DatabaseSchema {
  id: string
  name: string
  dialect: 'sqlite' | 'postgres' | 'mysql' | 'duckdb'
  description: string
  tables: Record<string, DatabaseTable>
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  executionTimeMs: number
  error?: string
  query: string
  timestamp: string
  affectedRows?: number
}

export interface QueryHistoryItem {
  id: string
  query: string
  timestamp: string
  executionTimeMs: number
  rowCount: number
  success: boolean
  error?: string
}

const SAMPLE_DATABASES: DatabaseSchema[] = [
  {
    id: 'ecommerce_db',
    name: 'E-Commerce & Orders DB (SQLite)',
    dialect: 'sqlite',
    description: 'Online store customer orders, inventory catalog, categories, and verified reviews',
    tables: {
      customers: {
        name: 'customers',
        description: 'Registered customer accounts and loyalty levels',
        rowCount: 8,
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false },
          { name: 'full_name', type: 'VARCHAR(120)', isNullable: false },
          { name: 'email', type: 'VARCHAR(160)', isNullable: false },
          { name: 'tier', type: 'VARCHAR(30)', defaultValue: "'Silver'" },
          { name: 'country', type: 'VARCHAR(60)', defaultValue: "'US'" },
          { name: 'total_spent', type: 'DECIMAL(10,2)', defaultValue: '0.00' },
          { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        ],
        indexes: [
          { name: 'idx_customers_email', columns: ['email'], isUnique: true },
          { name: 'idx_customers_tier', columns: ['tier'] },
        ],
        data: [
          { id: 1, full_name: 'Elena Rostova', email: 'elena.rostova@tokyo-grid.io', tier: 'Platinum', country: 'JP', total_spent: 4520.50, created_at: '2025-11-12 09:30:00' },
          { id: 2, full_name: 'Marcus Vance', email: 'm.vance@sol-core.net', tier: 'Gold', country: 'US', total_spent: 2180.00, created_at: '2025-12-04 14:15:22' },
          { id: 3, full_name: 'Aisha Al-Mansoor', email: 'aisha@dubai-fintech.ae', tier: 'Platinum', country: 'AE', total_spent: 8930.00, created_at: '2026-01-08 11:20:00' },
          { id: 4, full_name: 'Lucas Richter', email: 'l.richter@berlin-tech.de', tier: 'Silver', country: 'DE', total_spent: 640.20, created_at: '2026-02-14 18:45:00' },
          { id: 5, full_name: 'Kenji Takahashi', email: 'kenji@kyoto-matrix.jp', tier: 'Gold', country: 'JP', total_spent: 3100.80, created_at: '2026-03-01 08:00:00' },
          { id: 6, full_name: 'Sarah Connor', email: 's.connor@cyberdyne-res.org', tier: 'Platinum', country: 'US', total_spent: 6720.00, created_at: '2026-04-10 16:30:10' },
          { id: 7, full_name: 'Mateo Hernandez', email: 'mateo@madrid-node.es', tier: 'Bronze', country: 'ES', total_spent: 150.00, created_at: '2026-05-19 12:10:00' },
          { id: 8, full_name: 'Chloe Dubois', email: 'chloe@paris-luxe.fr', tier: 'Gold', country: 'FR', total_spent: 2890.40, created_at: '2026-06-22 17:05:40' },
        ],
      },
      categories: {
        name: 'categories',
        description: 'Product merchandise taxonomy',
        rowCount: 4,
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false },
          { name: 'name', type: 'VARCHAR(80)', isNullable: false },
          { name: 'slug', type: 'VARCHAR(80)', isNullable: false },
          { name: 'is_active', type: 'BOOLEAN', defaultValue: 'true' },
        ],
        data: [
          { id: 1, name: 'Neural Hardware', slug: 'neural-hardware', is_active: true },
          { id: 2, name: 'Holographic Displays', slug: 'holographic-displays', is_active: true },
          { id: 3, name: 'Cybernetic Peripherals', slug: 'cybernetic-peripherals', is_active: true },
          { id: 4, name: 'Quantum Processors', slug: 'quantum-processors', is_active: true },
        ],
      },
      products: {
        name: 'products',
        description: 'Catalog items with stock levels and pricing',
        rowCount: 7,
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false },
          { name: 'category_id', type: 'INTEGER', isForeignKey: true, foreignKeyRef: { table: 'categories', column: 'id' } },
          { name: 'title', type: 'VARCHAR(160)', isNullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', isNullable: false },
          { name: 'stock_qty', type: 'INTEGER', defaultValue: '0' },
          { name: 'rating', type: 'DECIMAL(2,1)', defaultValue: '5.0' },
        ],
        indexes: [{ name: 'idx_products_category', columns: ['category_id'] }],
        data: [
          { id: 101, category_id: 1, title: 'CortexLink Pro Neural Interface', price: 1299.99, stock_qty: 24, rating: 4.9 },
          { id: 102, category_id: 1, title: 'SynapseBoost Memory Accelerator', price: 649.50, stock_qty: 48, rating: 4.7 },
          { id: 103, category_id: 2, title: 'Holoview 8K Curved Specular Screen', price: 2499.00, stock_qty: 12, rating: 4.8 },
          { id: 104, category_id: 2, title: 'Pocket Prism Laser HUD', price: 499.00, stock_qty: 85, rating: 4.5 },
          { id: 105, category_id: 3, title: 'Liquid Glass Haptic Keyboard v2', price: 349.00, stock_qty: 60, rating: 4.9 },
          { id: 106, category_id: 3, title: 'BioMetric Precision Cursor Stylus', price: 189.95, stock_qty: 110, rating: 4.6 },
          { id: 107, category_id: 4, title: 'QubitCore 16-Spin Quantum Co-Processor', price: 5800.00, stock_qty: 6, rating: 5.0 },
        ],
      },
      orders: {
        name: 'orders',
        description: 'Customer purchase transactions and shipping statuses',
        rowCount: 6,
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false },
          { name: 'customer_id', type: 'INTEGER', isForeignKey: true, foreignKeyRef: { table: 'customers', column: 'id' } },
          { name: 'order_number', type: 'VARCHAR(32)', isNullable: false },
          { name: 'status', type: 'VARCHAR(30)', defaultValue: "'Processing'" },
          { name: 'total_amount', type: 'DECIMAL(10,2)', isNullable: false },
          { name: 'placed_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
        ],
        indexes: [
          { name: 'idx_orders_customer', columns: ['customer_id'] },
          { name: 'idx_orders_status', columns: ['status'] },
        ],
        data: [
          { id: 501, customer_id: 1, order_number: 'ORD-2026-0812', status: 'Delivered', total_amount: 3798.99, placed_at: '2026-08-10 10:14:00' },
          { id: 502, customer_id: 3, order_number: 'ORD-2026-0845', status: 'Delivered', total_amount: 5800.00, placed_at: '2026-08-15 16:20:00' },
          { id: 503, customer_id: 2, order_number: 'ORD-2026-0901', status: 'Shipped', total_amount: 1299.99, placed_at: '2026-09-01 11:05:00' },
          { id: 504, customer_id: 5, order_number: 'ORD-2026-0914', status: 'Shipped', total_amount: 2848.00, placed_at: '2026-09-08 19:40:00' },
          { id: 505, customer_id: 6, order_number: 'ORD-2026-0922', status: 'Processing', total_amount: 538.95, placed_at: '2026-09-14 08:30:00' },
          { id: 506, customer_id: 4, order_number: 'ORD-2026-0930', status: 'Pending', total_amount: 649.50, placed_at: '2026-09-16 12:00:00' },
        ],
      },
    },
  },
  {
    id: 'telemetry_db',
    name: 'Cloud Telemetry & Cluster DB (PostgreSQL)',
    dialect: 'postgres',
    description: 'Kubernetes cluster metrics, service nodes, microservice latencies, and deployments',
    tables: {
      clusters: {
        name: 'clusters',
        description: 'Multi-region Kubernetes clusters',
        rowCount: 3,
        columns: [
          { name: 'cluster_id', type: 'VARCHAR(32)', isPrimaryKey: true, isNullable: false },
          { name: 'region', type: 'VARCHAR(32)', isNullable: false },
          { name: 'node_count', type: 'INTEGER', defaultValue: '10' },
          { name: 'status', type: 'VARCHAR(24)', defaultValue: "'Healthy'" },
        ],
        data: [
          { cluster_id: 'tokyo-prod-01', region: 'ap-northeast-1', node_count: 48, status: 'Healthy' },
          { cluster_id: 'frankfurt-prod-02', region: 'eu-central-1', node_count: 36, status: 'Healthy' },
          { cluster_id: 'us-east-prod-03', region: 'us-east-1', node_count: 64, status: 'Degraded' },
        ],
      },
      nodes: {
        name: 'nodes',
        description: 'Worker instances, CPU allocation, and memory usage',
        rowCount: 6,
        columns: [
          { name: 'node_id', type: 'VARCHAR(32)', isPrimaryKey: true, isNullable: false },
          { name: 'cluster_id', type: 'VARCHAR(32)', isForeignKey: true, foreignKeyRef: { table: 'clusters', column: 'cluster_id' } },
          { name: 'cpu_cores', type: 'INTEGER', isNullable: false },
          { name: 'memory_gb', type: 'INTEGER', isNullable: false },
          { name: 'cpu_utilization_pct', type: 'DECIMAL(5,2)', defaultValue: '0.0' },
          { name: 'memory_utilization_pct', type: 'DECIMAL(5,2)', defaultValue: '0.0' },
          { name: 'is_ready', type: 'BOOLEAN', defaultValue: 'true' },
        ],
        data: [
          { node_id: 'node-tyo-001', cluster_id: 'tokyo-prod-01', cpu_cores: 64, memory_gb: 256, cpu_utilization_pct: 38.4, memory_utilization_pct: 54.2, is_ready: true },
          { node_id: 'node-tyo-002', cluster_id: 'tokyo-prod-01', cpu_cores: 64, memory_gb: 256, cpu_utilization_pct: 42.1, memory_utilization_pct: 61.8, is_ready: true },
          { node_id: 'node-fra-001', cluster_id: 'frankfurt-prod-02', cpu_cores: 32, memory_gb: 128, cpu_utilization_pct: 67.9, memory_utilization_pct: 78.4, is_ready: true },
          { node_id: 'node-fra-002', cluster_id: 'frankfurt-prod-02', cpu_cores: 32, memory_gb: 128, cpu_utilization_pct: 29.5, memory_utilization_pct: 44.0, is_ready: true },
          { node_id: 'node-use-001', cluster_id: 'us-east-prod-03', cpu_cores: 128, memory_gb: 512, cpu_utilization_pct: 94.8, memory_utilization_pct: 88.6, is_ready: false },
          { node_id: 'node-use-002', cluster_id: 'us-east-prod-03', cpu_cores: 128, memory_gb: 512, cpu_utilization_pct: 89.2, memory_utilization_pct: 82.1, is_ready: true },
        ],
      },
      deployments: {
        name: 'deployments',
        description: 'Microservice container images and replica counts',
        rowCount: 5,
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false },
          { name: 'service_name', type: 'VARCHAR(64)', isNullable: false },
          { name: 'version', type: 'VARCHAR(24)', isNullable: false },
          { name: 'replicas', type: 'INTEGER', defaultValue: '3' },
          { name: 'latency_p99_ms', type: 'DECIMAL(6,2)', defaultValue: '12.5' },
        ],
        data: [
          { id: 1, service_name: 'auth-gateway', version: 'v2.4.1', replicas: 6, latency_p99_ms: 8.4 },
          { id: 2, service_name: 'billing-engine', version: 'v3.1.0', replicas: 4, latency_p99_ms: 24.1 },
          { id: 3, service_name: 'search-indexer', version: 'v1.9.8', replicas: 8, latency_p99_ms: 14.7 },
          { id: 4, service_name: 'neural-inference', version: 'v4.0.0', replicas: 12, latency_p99_ms: 45.3 },
          { id: 5, service_name: 'telemetry-collector', version: 'v2.0.2', replicas: 5, latency_p99_ms: 4.2 },
        ],
      },
    },
  },
]

export class DatabaseService {
  private databases: Map<string, DatabaseSchema> = new Map()
  private activeDatabaseId: string = 'ecommerce_db'
  private history: QueryHistoryItem[] = []
  private listeners: Set<(db: DatabaseSchema) => void> = new Set()

  constructor() {
    this.resetToDefaults()
  }

  public resetToDefaults() {
    this.databases.clear()
    SAMPLE_DATABASES.forEach((db) => {
      // Deep clone so user mutations don't corrupt constants
      const clone: DatabaseSchema = JSON.parse(JSON.stringify(db))
      this.databases.set(clone.id, clone)
    })
    this.activeDatabaseId = 'ecommerce_db'
  }

  public getAllDatabases(): { id: string; name: string; dialect: string; description: string }[] {
    return Array.from(this.databases.values()).map((db) => ({
      id: db.id,
      name: db.name,
      dialect: db.dialect,
      description: db.description,
    }))
  }

  public getActiveDatabase(): DatabaseSchema {
    const db = this.databases.get(this.activeDatabaseId)
    if (!db) {
      const first = Array.from(this.databases.values())[0]
      this.activeDatabaseId = first.id
      return first
    }
    return db
  }

  public setActiveDatabase(id: string) {
    if (this.databases.has(id)) {
      this.activeDatabaseId = id
      this.notifyListeners()
    }
  }

  public subscribe(listener: (db: DatabaseSchema) => void): () => void {
    this.listeners.add(listener)
    listener(this.getActiveDatabase())
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const active = this.getActiveDatabase()
    this.listeners.forEach((fn) => fn(active))
  }

  public getHistory(): QueryHistoryItem[] {
    return [...this.history]
  }

  public clearHistory() {
    this.history = []
  }

  /**
   * Execute an SQL query against the active in-memory database schema.
   */
  public executeQuery(rawQuery: string): QueryResult {
    const startTime = performance.now()
    const trimmed = rawQuery.trim()
    const nowIso = new Date().toISOString()

    if (!trimmed) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'Empty SQL query.',
        query: rawQuery,
        timestamp: nowIso,
      }
    }

    try {
      const activeDb = this.getActiveDatabase()
      const result = this.evaluateSql(trimmed, activeDb)
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100

      const queryResult: QueryResult = {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rows.length,
        affectedRows: result.affectedRows,
        executionTimeMs: durationMs,
        query: trimmed,
        timestamp: nowIso,
      }

      this.history.unshift({
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        query: trimmed,
        timestamp: nowIso,
        executionTimeMs: durationMs,
        rowCount: result.rows.length,
        success: true,
      })
      if (this.history.length > 50) this.history.pop()

      this.notifyListeners()
      return queryResult
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100
      const errorMsg = err?.message || 'SQL Execution error.'

      this.history.unshift({
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        query: trimmed,
        timestamp: nowIso,
        executionTimeMs: durationMs,
        rowCount: 0,
        success: false,
        error: errorMsg,
      })
      if (this.history.length > 50) this.history.pop()

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: durationMs,
        error: errorMsg,
        query: trimmed,
        timestamp: nowIso,
      }
    }
  }

  /**
   * Light ANSI SQL Parser & Evaluator for memory datasets
   */
  private evaluateSql(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[]; affectedRows?: number } {
    // Strip trailing semicolon
    const cleanSql = sql.replace(/;+\s*$/, '').trim()
    const firstWord = cleanSql.split(/\s+/)[0]?.toUpperCase()

    if (firstWord === 'SELECT') {
      return this.executeSelect(cleanSql, db)
    } else if (firstWord === 'INSERT') {
      return this.executeInsert(cleanSql, db)
    } else if (firstWord === 'UPDATE') {
      return this.executeUpdate(cleanSql, db)
    } else if (firstWord === 'DELETE') {
      return this.executeDelete(cleanSql, db)
    } else if (firstWord === 'SHOW' || firstWord === 'DESCRIBE' || firstWord === 'DESC') {
      return this.executeMetadataQuery(cleanSql, db)
    } else {
      throw new Error(`Unsupported SQL operation: "${firstWord}". Supported operations: SELECT, INSERT, UPDATE, DELETE, SHOW, DESCRIBE.`)
    }
  }

  private executeSelect(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[] } {
    // Basic regex extraction for: SELECT ... FROM table [JOIN table ON cond] [WHERE cond] [GROUP BY cols] [ORDER BY col [ASC|DESC]] [LIMIT n]
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(.*)/is)
    if (!selectMatch) {
      throw new Error('Syntax error in SELECT statement. Format: SELECT <cols> FROM <table> [JOIN ...] [WHERE ...] [ORDER BY ...] [LIMIT ...]')
    }

    const [, selectClause, primaryTableName, restClauses] = selectMatch
    const primaryTable = db.tables[primaryTableName.toLowerCase()]
    if (!primaryTable) {
      throw new Error(`Table "${primaryTableName}" does not exist in database "${db.name}".`)
    }

    let workingRows: Record<string, any>[] = primaryTable.data.map((r) => ({ ...r }))

    // Check for JOIN: JOIN table ON left.col = right.col
    const joinMatch = restClauses.match(/(?:INNER\s+|LEFT\s+)?JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/i)
    if (joinMatch) {
      const [, joinTableName, leftCol, rightCol] = joinMatch
      const joinTable = db.tables[joinTableName.toLowerCase()]
      if (!joinTable) {
        throw new Error(`Joined table "${joinTableName}" does not exist.`)
      }

      const cleanLeft = leftCol.includes('.') ? leftCol.split('.')[1] : leftCol
      const cleanRight = rightCol.includes('.') ? rightCol.split('.')[1] : rightCol

      const merged: Record<string, any>[] = []
      workingRows.forEach((mainRow) => {
        const matchingJoinRows = joinTable.data.filter((jRow) => {
          const valLeft = mainRow[cleanLeft] !== undefined ? mainRow[cleanLeft] : mainRow[cleanRight]
          const valRight = jRow[cleanRight] !== undefined ? jRow[cleanRight] : jRow[cleanLeft]
          return valLeft !== undefined && valRight !== undefined && String(valLeft) === String(valRight)
        })

        if (matchingJoinRows.length > 0) {
          matchingJoinRows.forEach((jr) => {
            merged.push({ ...mainRow, ...jr })
          })
        }
      })
      workingRows = merged
    }

    // Check for WHERE clause
    const whereMatch = restClauses.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s*$)/is)
    if (whereMatch) {
      const condition = whereMatch[1].trim()
      workingRows = workingRows.filter((row) => this.evaluateCondition(condition, row))
    }

    // Check for ORDER BY
    const orderMatch = restClauses.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i)
    if (orderMatch) {
      const orderCol = orderMatch[1]
      const isDesc = orderMatch[2]?.toUpperCase() === 'DESC'
      workingRows.sort((a, b) => {
        const valA = a[orderCol]
        const valB = b[orderCol]
        if (valA === undefined || valA === null) return isDesc ? 1 : -1
        if (valB === undefined || valB === null) return isDesc ? -1 : 1
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isDesc ? valB - valA : valA - valB
        }
        return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB))
      })
    }

    // Check for LIMIT [offset,] count or LIMIT count OFFSET offset
    const limitMatch = restClauses.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i)
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10)
      const offset = limitMatch[2] ? parseInt(limitMatch[2], 10) : 0
      workingRows = workingRows.slice(offset, offset + limit)
    }

    // Project columns
    const rawSelectCols = selectClause.split(',').map((s) => s.trim())
    if (rawSelectCols.length === 1 && rawSelectCols[0] === '*') {
      const columns = workingRows.length > 0
        ? Object.keys(workingRows[0])
        : primaryTable.columns.map((c) => c.name)
      return { columns, rows: workingRows }
    }

    // Handle Aggregates e.g. COUNT(*), SUM(col), AVG(col), MAX(col), MIN(col)
    if (rawSelectCols.some((col) => /^(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(col))) {
      const aggregateRow: Record<string, any> = {}
      const finalCols: string[] = []

      rawSelectCols.forEach((colExp) => {
        const countMatch = colExp.match(/^COUNT\s*\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i)
        const sumMatch = colExp.match(/^SUM\s*\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i)
        const avgMatch = colExp.match(/^AVG\s*\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i)
        const minMatch = colExp.match(/^MIN\s*\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i)
        const maxMatch = colExp.match(/^MAX\s*\((.*?)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?/i)

        if (countMatch) {
          const colName = countMatch[2] || countMatch[0]
          aggregateRow[colName] = workingRows.length
          finalCols.push(colName)
        } else if (sumMatch) {
          const target = sumMatch[1].trim()
          const colName = sumMatch[2] || sumMatch[0]
          const sum = workingRows.reduce((acc, r) => acc + (Number(r[target]) || 0), 0)
          aggregateRow[colName] = Math.round(sum * 100) / 100
          finalCols.push(colName)
        } else if (avgMatch) {
          const target = avgMatch[1].trim()
          const colName = avgMatch[2] || avgMatch[0]
          const sum = workingRows.reduce((acc, r) => acc + (Number(r[target]) || 0), 0)
          const avg = workingRows.length > 0 ? sum / workingRows.length : 0
          aggregateRow[colName] = Math.round(avg * 100) / 100
          finalCols.push(colName)
        } else if (minMatch) {
          const target = minMatch[1].trim()
          const colName = minMatch[2] || minMatch[0]
          const values = workingRows.map((r) => Number(r[target])).filter((v) => !isNaN(v))
          aggregateRow[colName] = values.length > 0 ? Math.min(...values) : null
          finalCols.push(colName)
        } else if (maxMatch) {
          const target = maxMatch[1].trim()
          const colName = maxMatch[2] || maxMatch[0]
          const values = workingRows.map((r) => Number(r[target])).filter((v) => !isNaN(v))
          aggregateRow[colName] = values.length > 0 ? Math.max(...values) : null
          finalCols.push(colName)
        } else {
          finalCols.push(colExp)
          aggregateRow[colExp] = workingRows[0]?.[colExp] ?? null
        }
      })

      return { columns: finalCols, rows: [aggregateRow] }
    }

    // Normal column projection
    const projectedCols: string[] = []
    const projectedRows = workingRows.map((row) => {
      const newRow: Record<string, any> = {}
      rawSelectCols.forEach((colDef) => {
        const asMatch = colDef.match(/^([a-zA-Z0-9_.]+)\s+AS\s+([a-zA-Z0-9_]+)$/i)
        const sourceCol = asMatch ? asMatch[1] : colDef
        const targetCol = asMatch ? asMatch[2] : (sourceCol.includes('.') ? sourceCol.split('.')[1] : sourceCol)

        if (!projectedCols.includes(targetCol)) projectedCols.push(targetCol)
        const cleanSource = sourceCol.includes('.') ? sourceCol.split('.')[1] : sourceCol
        newRow[targetCol] = row[cleanSource] ?? null
      })
      return newRow
    })

    return { columns: projectedCols, rows: projectedRows }
  }

  private executeInsert(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[]; affectedRows: number } {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i)
    if (!match) {
      throw new Error('Syntax error in INSERT statement. Format: INSERT INTO <table> (col1, col2) VALUES (val1, val2)')
    }

    const [, tableName, colsClause, valsClause] = match
    const table = db.tables[tableName.toLowerCase()]
    if (!table) throw new Error(`Table "${tableName}" does not exist.`)

    const cols = colsClause.split(',').map((c) => c.trim())
    const vals = valsClause.split(',').map((v) => {
      const trimmed = v.trim()
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1)
      if (trimmed.toLowerCase() === 'true') return true
      if (trimmed.toLowerCase() === 'false') return false
      if (trimmed.toLowerCase() === 'null') return null
      if (!isNaN(Number(trimmed))) return Number(trimmed)
      return trimmed
    })

    const newRecord: Record<string, any> = {}
    cols.forEach((col, idx) => {
      newRecord[col] = vals[idx]
    })

    table.data.push(newRecord)
    table.rowCount = table.data.length

    return {
      columns: ['status', 'inserted_id', 'rows_affected'],
      rows: [{ status: 'SUCCESS', inserted_id: newRecord.id ?? table.data.length, rows_affected: 1 }],
      affectedRows: 1,
    }
  }

  private executeUpdate(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[]; affectedRows: number } {
    const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is)
    if (!match) {
      throw new Error('Syntax error in UPDATE statement. Format: UPDATE <table> SET col1 = val1 [WHERE cond]')
    }

    const [, tableName, setClause, whereClause] = match
    const table = db.tables[tableName.toLowerCase()]
    if (!table) throw new Error(`Table "${tableName}" does not exist.`)

    const assignments = setClause.split(',').map((pair) => {
      const [col, val] = pair.split('=').map((s) => s.trim())
      let cleanVal: any = val
      if (val.startsWith("'") && val.endsWith("'")) cleanVal = val.slice(1, -1)
      else if (!isNaN(Number(val))) cleanVal = Number(val)
      return { col, val: cleanVal }
    })

    let updatedCount = 0
    table.data.forEach((row) => {
      const matches = whereClause ? this.evaluateCondition(whereClause.trim(), row) : true
      if (matches) {
        assignments.forEach(({ col, val }) => {
          row[col] = val
        })
        updatedCount++
      }
    })

    return {
      columns: ['status', 'rows_affected'],
      rows: [{ status: 'SUCCESS', rows_affected: updatedCount }],
      affectedRows: updatedCount,
    }
  }

  private executeDelete(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[]; affectedRows: number } {
    const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/is)
    if (!match) {
      throw new Error('Syntax error in DELETE statement. Format: DELETE FROM <table> [WHERE cond]')
    }

    const [, tableName, whereClause] = match
    const table = db.tables[tableName.toLowerCase()]
    if (!table) throw new Error(`Table "${tableName}" does not exist.`)

    const initialLen = table.data.length
    if (whereClause) {
      table.data = table.data.filter((row) => !this.evaluateCondition(whereClause.trim(), row))
    } else {
      table.data = []
    }
    const deletedCount = initialLen - table.data.length
    table.rowCount = table.data.length

    return {
      columns: ['status', 'rows_deleted'],
      rows: [{ status: 'SUCCESS', rows_deleted: deletedCount }],
      affectedRows: deletedCount,
    }
  }

  private executeMetadataQuery(sql: string, db: DatabaseSchema): { columns: string[]; rows: Record<string, any>[] } {
    if (/SHOW\s+TABLES/i.test(sql)) {
      return {
        columns: ['table_name', 'row_count', 'column_count'],
        rows: Object.values(db.tables).map((t) => ({
          table_name: t.name,
          row_count: t.rowCount,
          column_count: t.columns.length,
        })),
      }
    }

    const descMatch = sql.match(/(?:DESCRIBE|DESC)\s+([a-zA-Z0-9_]+)/i)
    if (descMatch) {
      const table = db.tables[descMatch[1].toLowerCase()]
      if (!table) throw new Error(`Table "${descMatch[1]}" does not exist.`)
      return {
        columns: ['column_name', 'type', 'primary_key', 'nullable', 'default_value'],
        rows: table.columns.map((c) => ({
          column_name: c.name,
          type: c.type,
          primary_key: c.isPrimaryKey ? 'YES' : 'NO',
          nullable: c.isNullable !== false ? 'YES' : 'NO',
          default_value: c.defaultValue ?? 'NULL',
        })),
      }
    }

    throw new Error('Unrecognized metadata query. Try "SHOW TABLES" or "DESCRIBE <table>".')
  }

  private evaluateCondition(condition: string, row: Record<string, any>): boolean {
    // Handle AND / OR
    if (/\s+AND\s+/i.test(condition)) {
      const parts = condition.split(/\s+AND\s+/i)
      return parts.every((p) => this.evaluateCondition(p.trim(), row))
    }
    if (/\s+OR\s+/i.test(condition)) {
      const parts = condition.split(/\s+OR\s+/i)
      return parts.some((p) => this.evaluateCondition(p.trim(), row))
    }

    // Match =, !=, >=, <=, >, <, LIKE, IN
    const compMatch = condition.match(/^([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE|IS\s+NOT\s+NULL|IS\s+NULL)\s*(.*)?$/i)
    if (!compMatch) return true

    const [, colExp, op, rawVal] = compMatch
    const colName = colExp.includes('.') ? colExp.split('.')[1] : colExp
    const cellValue = row[colName]
    const upperOp = op.toUpperCase()

    if (upperOp === 'IS NULL') return cellValue === null || cellValue === undefined
    if (upperOp === 'IS NOT NULL') return cellValue !== null && cellValue !== undefined

    let expectedVal: any = rawVal?.trim() ?? ''
    if (expectedVal.startsWith("'") && expectedVal.endsWith("'")) {
      expectedVal = expectedVal.slice(1, -1)
    } else if (!isNaN(Number(expectedVal))) {
      expectedVal = Number(expectedVal)
    }

    if (upperOp === '=' || upperOp === '==') {
      return String(cellValue).toLowerCase() === String(expectedVal).toLowerCase()
    }
    if (upperOp === '!=' || upperOp === '<>') {
      return String(cellValue).toLowerCase() !== String(expectedVal).toLowerCase()
    }
    if (upperOp === 'LIKE') {
      const regexStr = '^' + String(expectedVal).replace(/%/g, '.*').replace(/_/g, '.') + '$'
      return new RegExp(regexStr, 'i').test(String(cellValue))
    }
    if (upperOp === '>') return Number(cellValue) > Number(expectedVal)
    if (upperOp === '<') return Number(cellValue) < Number(expectedVal)
    if (upperOp === '>=') return Number(cellValue) >= Number(expectedVal)
    if (upperOp === '<=') return Number(cellValue) <= Number(expectedVal)

    return true
  }

  /**
   * Export Result Set as CSV string
   */
  public exportToCsv(result: QueryResult): string {
    if (result.columns.length === 0) return ''
    const header = result.columns.map((c) => `"${c}"`).join(',')
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const val = row[col]
          if (val === null || val === undefined) return '""'
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          return `"${String(val).replace(/"/g, '""')}"`
        })
        .join(',')
    )
    return [header, ...rows].join('\n')
  }

  /**
   * Export Result Set as Formatted JSON string
   */
  public exportToJson(result: QueryResult): string {
    return JSON.stringify(result.rows, null, 2)
  }
}

export const databaseService = new DatabaseService()
