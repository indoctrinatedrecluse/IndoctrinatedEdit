import { describe, it, expect, beforeEach } from 'vitest'
import { databaseService } from '../src/services/databaseService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { databaseExtensionManifest } from '../src/extensions/databaseStudio/databaseExtension'

describe('Database Subsystem & SQL Execution Engine', () => {
  beforeEach(() => {
    databaseService.resetToDefaults()
    databaseService.clearHistory()
  })

  it('should list all sample databases and allow switching active schema', () => {
    const all = databaseService.getAllDatabases()
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(all.some((db) => db.id === 'ecommerce_db')).toBe(true)
    expect(all.some((db) => db.id === 'telemetry_db')).toBe(true)

    const activeBefore = databaseService.getActiveDatabase()
    expect(activeBefore.id).toBe('ecommerce_db')

    databaseService.setActiveDatabase('telemetry_db')
    const activeAfter = databaseService.getActiveDatabase()
    expect(activeAfter.id).toBe('telemetry_db')
    expect(activeAfter.dialect).toBe('postgres')
    expect(Object.keys(activeAfter.tables)).toContain('clusters')
    expect(Object.keys(activeAfter.tables)).toContain('nodes')
  })

  it('should inspect table schema with primary keys, foreign keys, and column metadata', () => {
    const active = databaseService.getActiveDatabase()
    const customersTable = active.tables['customers']
    expect(customersTable).toBeDefined()
    expect(customersTable.rowCount).toBe(8)

    const idCol = customersTable.columns.find((c) => c.name === 'id')
    expect(idCol?.isPrimaryKey).toBe(true)
    expect(idCol?.type).toBe('INTEGER')

    const productsTable = active.tables['products']
    const catCol = productsTable.columns.find((c) => c.name === 'category_id')
    expect(catCol?.isForeignKey).toBe(true)
    expect(catCol?.foreignKeyRef?.table).toBe('categories')
  })

  it('should execute SELECT * queries with column projection and row limit', () => {
    const result = databaseService.executeQuery('SELECT * FROM customers LIMIT 3;')
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(3)
    expect(result.columns).toContain('full_name')
    expect(result.columns).toContain('email')
    expect(result.columns).toContain('tier')
    expect(result.rows[0].full_name).toBe('Elena Rostova')
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('should execute SELECT with WHERE filtering and ORDER BY DESC', () => {
    const result = databaseService.executeQuery("SELECT full_name, tier, total_spent FROM customers WHERE tier = 'Platinum' ORDER BY total_spent DESC;")
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(3)
    expect(result.columns).toEqual(['full_name', 'tier', 'total_spent'])
    expect(result.rows[0].total_spent).toBe(8930.00)
    expect(result.rows[0].full_name).toBe('Aisha Al-Mansoor')
    expect(result.rows[1].total_spent).toBe(6720.00)
    expect(result.rows[2].total_spent).toBe(4520.50)
  })

  it('should execute INNER JOIN between products and categories', () => {
    const result = databaseService.executeQuery('SELECT title, name AS category_name, price FROM products JOIN categories ON products.category_id = categories.id;')
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(7)
    expect(result.columns).toContain('title')
    expect(result.columns).toContain('category_name')
    expect(result.columns).toContain('price')

    const neuralProduct = result.rows.find((r) => r.title.includes('CortexLink'))
    expect(neuralProduct?.category_name).toBe('Neural Hardware')
  })

  it('should calculate SQL Aggregates (COUNT, SUM, AVG, MAX, MIN)', () => {
    const result = databaseService.executeQuery('SELECT COUNT(*) AS total_customers, SUM(total_spent) AS grand_total, AVG(total_spent) AS average_spent, MAX(total_spent) AS highest_spent FROM customers;')
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(1)
    expect(result.rows[0].total_customers).toBe(8)
    expect(result.rows[0].highest_spent).toBe(8930.00)
    expect(result.rows[0].grand_total).toBeGreaterThan(20000)
  })

  it('should execute INSERT, UPDATE, and DELETE data manipulation statements', () => {
    // 1. Insert
    const insertRes = databaseService.executeQuery("INSERT INTO categories (id, name, slug, is_active) VALUES (5, 'Bio-Implants', 'bio-implants', true);")
    expect(insertRes.error).toBeUndefined()
    expect(insertRes.affectedRows).toBe(1)

    // 2. Select inserted
    const selectRes = databaseService.executeQuery("SELECT * FROM categories WHERE slug = 'bio-implants';")
    expect(selectRes.rowCount).toBe(1)
    expect(selectRes.rows[0].name).toBe('Bio-Implants')

    // 3. Update
    const updateRes = databaseService.executeQuery("UPDATE categories SET name = 'Cyber-Implants' WHERE id = 5;")
    expect(updateRes.affectedRows).toBe(1)

    const selectUpdated = databaseService.executeQuery("SELECT * FROM categories WHERE id = 5;")
    expect(selectUpdated.rows[0].name).toBe('Cyber-Implants')

    // 4. Delete
    const deleteRes = databaseService.executeQuery("DELETE FROM categories WHERE id = 5;")
    expect(deleteRes.affectedRows).toBe(1)

    const selectDeleted = databaseService.executeQuery("SELECT * FROM categories WHERE id = 5;")
    expect(selectDeleted.rowCount).toBe(0)
  })

  it('should export query results to CSV and JSON formats', () => {
    const result = databaseService.executeQuery('SELECT id, full_name, email FROM customers LIMIT 2;')
    const csv = databaseService.exportToCsv(result)
    expect(csv).toContain('"id","full_name","email"')
    expect(csv).toContain('Elena Rostova')

    const json = databaseService.exportToJson(result)
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(2)
    expect(parsed[0].full_name).toBe('Elena Rostova')
  })

  it('should record query history accurately', () => {
    databaseService.executeQuery('SELECT * FROM customers;')
    databaseService.executeQuery('INVALID SYNTAX ERROR QUERY;')

    const history = databaseService.getHistory()
    expect(history.length).toBe(2)
    expect(history[0].success).toBe(false)
    expect(history[0].error).toBeDefined()
    expect(history[1].success).toBe(true)
    expect(history[1].query).toBe('SELECT * FROM customers;')
  })

  it('should verify Database Studio manifest registration in ExtensionRegistry', () => {
    const manifest = extensionRegistry.get(databaseExtensionManifest.id)
    expect(manifest).toBeDefined()
    expect(manifest?.name).toContain('Database Studio')
    expect(manifest?.category).toBe('Tools')
  })
})
