import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import { dialog, IpcMain, BrowserWindow } from 'electron'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)

export interface SqliteColumnMeta {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: string
  nullable: boolean
  defaultValue?: string
}

export interface SqliteTableMeta {
  name: string
  columns: SqliteColumnMeta[]
  rowCount: number
  indexes: string[]
  ddl?: string
}

interface OpenSqliteEntry {
  id: string
  name: string
  filePath?: string
  db: any
}

class SqliteWasmService {
  private sqlJsPromise: Promise<any> | null = null
  private dbs = new Map<string, OpenSqliteEntry>()
  private seq = 0

  private async getSqlJs(): Promise<any> {
    if (!this.sqlJsPromise) {
      this.sqlJsPromise = (async () => {
        const initSqlJsModule = require('sql.js')
        const initSqlJs = initSqlJsModule.default || initSqlJsModule
        const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
        return await initSqlJs({
          locateFile: () => wasmPath,
        })
      })()
    }
    return this.sqlJsPromise
  }

  public introspectDb(db: any): Record<string, SqliteTableMeta> {
    const tables: Record<string, SqliteTableMeta> = {}
    const masterRes = db.exec(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    )
    if (!masterRes.length) return tables

    for (const row of masterRes[0].values) {
      const tableName = String(row[0])
      const ddl = row[1] ? String(row[1]) : undefined
      const safeName = tableName.replace(/"/g, '""')

      // Foreign keys
      const fkMap = new Map<string, string>()
      try {
        const fkRes = db.exec(`PRAGMA foreign_key_list("${safeName}");`)
        if (fkRes.length) {
          for (const fk of fkRes[0].values) {
            const fromCol = String(fk[3])
            const refTable = String(fk[2])
            const refCol = String(fk[4] || 'id')
            fkMap.set(fromCol, `${refTable}.${refCol}`)
          }
        }
      } catch {}

      // Columns
      const columns: SqliteColumnMeta[] = []
      try {
        const colRes = db.exec(`PRAGMA table_info("${safeName}");`)
        if (colRes.length) {
          for (const col of colRes[0].values) {
            const colName = String(col[1])
            columns.push({
              name: colName,
              type: String(col[2] || 'TEXT'),
              nullable: Number(col[3]) === 0,
              defaultValue: col[4] !== null && col[4] !== undefined ? String(col[4]) : undefined,
              isPrimaryKey: Number(col[5]) > 0,
              isForeignKey: fkMap.has(colName),
              references: fkMap.get(colName),
            })
          }
        }
      } catch {}

      // Indexes
      const indexes: string[] = []
      try {
        const idxRes = db.exec(`PRAGMA index_list("${safeName}");`)
        if (idxRes.length) {
          for (const idx of idxRes[0].values) {
            indexes.push(String(idx[1]))
          }
        }
      } catch {}

      // Row count
      let rowCount = 0
      try {
        const countRes = db.exec(`SELECT COUNT(*) FROM "${safeName}";`)
        if (countRes.length && countRes[0].values.length) {
          rowCount = Number(countRes[0].values[0][0]) || 0
        }
      } catch {}

      tables[tableName] = {
        name: tableName,
        columns,
        rowCount,
        indexes,
        ddl,
      }
    }

    return tables
  }

  public async openSqliteFile(filePath: string): Promise<{
    ok: boolean
    dbId?: string
    name?: string
    filePath?: string
    tables?: Record<string, SqliteTableMeta>
    error?: string
  }> {
    try {
      const SQL = await this.getSqlJs()
      const buf = await fs.readFile(filePath)
      const db = new SQL.Database(new Uint8Array(buf))
      const id = `sqlite_${Date.now()}_${++this.seq}`
      const name = path.basename(filePath)
      this.dbs.set(id, { id, name, filePath, db })
      const tables = this.introspectDb(db)
      return { ok: true, dbId: id, name, filePath, tables }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to open SQLite database' }
    }
  }

  public async createSqliteDb(name = 'untitled.sqlite', seedSql?: string): Promise<{
    ok: boolean
    dbId?: string
    name?: string
    tables?: Record<string, SqliteTableMeta>
    error?: string
  }> {
    try {
      const SQL = await this.getSqlJs()
      const db = new SQL.Database()
      if (seedSql?.trim()) {
        db.run(seedSql)
      }
      const id = `sqlite_${Date.now()}_${++this.seq}`
      this.dbs.set(id, { id, name, db })
      const tables = this.introspectDb(db)
      return { ok: true, dbId: id, name, tables }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to create SQLite database' }
    }
  }

  public execSqlite(dbId: string, sql: string): {
    ok: boolean
    columns: string[]
    rows: Record<string, any>[]
    rowCount: number
    affectedRows?: number
    executionTimeMs: number
    tables?: Record<string, SqliteTableMeta>
    error?: string
  } {
    const start = performance.now()
    const entry = this.dbs.get(dbId)
    if (!entry) {
      return {
        ok: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: `SQLite session "${dbId}" is not open.`,
      }
    }

    try {
      const results = entry.db.exec(sql)
      const elapsed = Math.round((performance.now() - start) * 100) / 100
      const affected = typeof entry.db.getRowsModified === 'function' ? entry.db.getRowsModified() : 0
      const isMutationOrDdl = /^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE|VACUUM|ATTACH)/i.test(sql)
      const tables = isMutationOrDdl ? this.introspectDb(entry.db) : undefined

      if (results.length > 0) {
        const last = results[results.length - 1]
        const columns: string[] = last.columns
        const rows: Record<string, any>[] = last.values.map((vals: any[]) => {
          const obj: Record<string, any> = {}
          columns.forEach((col, i) => {
            obj[col] = vals[i] instanceof Uint8Array ? `<BLOB ${vals[i].length}B>` : vals[i]
          })
          return obj
        })
        return {
          ok: true,
          columns,
          rows,
          rowCount: rows.length,
          affectedRows: affected || undefined,
          executionTimeMs: elapsed,
          tables,
        }
      }

      return {
        ok: true,
        columns: ['status', 'rows_affected'],
        rows: [{ status: 'OK', rows_affected: affected }],
        rowCount: 1,
        affectedRows: affected,
        executionTimeMs: elapsed,
        tables,
      }
    } catch (err: any) {
      return {
        ok: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
        error: err?.message || 'SQLite execution error',
      }
    }
  }

  public async saveSqliteDb(dbId: string, targetPath?: string): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    const entry = this.dbs.get(dbId)
    if (!entry) return { ok: false, error: 'Database session not found.' }
    const dest = targetPath || entry.filePath
    if (!dest) return { ok: false, error: 'No target file path specified.' }
    try {
      const data: Uint8Array = entry.db.export()
      await fs.writeFile(dest, Buffer.from(data))
      entry.filePath = dest
      entry.name = path.basename(dest)
      return { ok: true, filePath: dest }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to save SQLite file' }
    }
  }

  public closeSqliteDb(dbId: string): boolean {
    const entry = this.dbs.get(dbId)
    if (!entry) return false
    try {
      entry.db.close()
    } catch {}
    this.dbs.delete(dbId)
    return true
  }

  public async execExternalSqlCli(options: {
    dialect: 'postgres' | 'mysql' | 'duckdb' | 'sqlite'
    connectionString: string
    sql: string
    timeoutMs?: number
  }): Promise<{ ok: boolean; stdout: string; stderr: string; executionTimeMs: number; error?: string }> {
    const start = performance.now()
    const timeout = Math.min(Math.max(options.timeoutMs ?? 20000, 1000), 60000)
    try {
      let bin = 'psql'
      let args: string[] = []
      if (options.dialect === 'postgres') {
        bin = 'psql'
        args = [options.connectionString, '--csv', '-c', options.sql]
      } else if (options.dialect === 'mysql') {
        bin = 'mysql'
        args = ['-e', options.sql, '--batch']
      } else if (options.dialect === 'duckdb') {
        bin = 'duckdb'
        args = [options.connectionString, '-json', '-c', options.sql]
      } else {
        bin = 'sqlite3'
        args = [options.connectionString, '-json', options.sql]
      }
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      })
      return {
        ok: true,
        stdout: stdout || '',
        stderr: stderr || '',
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
      }
    } catch (err: any) {
      return {
        ok: false,
        stdout: err?.stdout || '',
        stderr: err?.stderr || '',
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
        error: err?.stderr || err?.message || `Failed to run ${options.dialect} CLI`,
      }
    }
  }

  public disposeAll(): void {
    for (const id of Array.from(this.dbs.keys())) {
      this.closeSqliteDb(id)
    }
  }

  public setupIPC(ipcMain: IpcMain, getWin: () => BrowserWindow | null): void {
    ipcMain.handle('infra:dbOpenSqlite', async (_, filePath?: string) => {
      let target = filePath
      if (!target) {
        const win = getWin()
        const res = await dialog.showOpenDialog(win || undefined as any, {
          title: 'Open SQLite Database',
          properties: ['openFile'],
          filters: [
            { name: 'SQLite Databases', extensions: ['sqlite', 'sqlite3', 'db', 'db3'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        if (res.canceled || !res.filePaths[0]) {
          return { ok: false, canceled: true }
        }
        target = res.filePaths[0]
      }
      return await this.openSqliteFile(target)
    })

    ipcMain.handle('infra:dbCreateSqlite', (_, name?: string, seedSql?: string) =>
      this.createSqliteDb(name, seedSql)
    )

    ipcMain.handle('infra:dbExecSqlite', (_, dbId: string, sql: string) =>
      this.execSqlite(dbId, sql)
    )

    ipcMain.handle('infra:dbSaveSqlite', async (_, dbId: string, targetPath?: string) => {
      const entry = this.dbs.get(dbId)
      let dest = targetPath || entry?.filePath
      if (!dest) {
        const win = getWin()
        const res = await dialog.showSaveDialog(win || undefined as any, {
          title: 'Save SQLite Database',
          defaultPath: entry?.name || 'database.sqlite',
          filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
        })
        if (res.canceled || !res.filePath) return { ok: false, canceled: true }
        dest = res.filePath
      }
      return await this.saveSqliteDb(dbId, dest)
    })

    ipcMain.handle('infra:dbCloseSqlite', (_, dbId: string) => this.closeSqliteDb(dbId))
    ipcMain.handle('infra:dbExecCli', (_, options) => this.execExternalSqlCli(options))
  }
}

export const sqliteWasmService = new SqliteWasmService()
