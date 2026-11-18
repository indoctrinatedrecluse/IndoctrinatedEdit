import { SnippetDefinition } from '../extensionTypes'

// 1. SQL & Relational Dialects Snippets
export const SQL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'sql-cte-window',
    detail: 'SQL (PostgreSQL): Common Table Expression (CTE) & Window Function',
    documentation: 'Advanced analytical SQL query with recursive/standard CTEs and DENSE_RANK window function',
    insertText: 'WITH ranked_records AS (\n    SELECT\n        id,\n        category,\n        specular_intensity,\n        created_at,\n        DENSE_RANK() OVER (\n            PARTITION BY category\n            ORDER BY specular_intensity DESC,\n            created_at DESC\n        ) AS rank_in_category\n    FROM\n        assets_telemetry\n    WHERE\n        is_active = TRUE\n        AND created_at >= NOW() - INTERVAL \'30 days\'\n)\nSELECT\n    id,\n    category,\n    specular_intensity,\n    created_at\nFROM\n    ranked_records\nWHERE\n    rank_in_category <= 5\nORDER BY\n    category ASC,\n    specular_intensity DESC;\n$0',
  },
  {
    label: 'sql-create-table-indexes',
    detail: 'SQL (PostgreSQL): Production Table with UUID, JSONB & GIN Index',
    documentation: 'Production table creation with foreign keys, JSONB metadata, check constraints, and GIN indexing',
    insertText: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\nCREATE TABLE IF NOT EXISTS ${1:workspace_assets} (\n    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,\n    name VARCHAR(255) NOT NULL,\n    metadata JSONB NOT NULL DEFAULT \'{}\'::jsonb,\n    sheen_factor NUMERIC(5, 4) DEFAULT 0.8500 CHECK (sheen_factor >= 0 AND sheen_factor <= 1),\n    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Performance Indexes\nCREATE INDEX IF NOT EXISTS idx_${1:workspace_assets}_ws_id ON ${1:workspace_assets}(workspace_id);\nCREATE INDEX IF NOT EXISTS idx_${1:workspace_assets}_meta_gin ON ${1:workspace_assets} USING GIN (metadata);\n$0',
  },
  {
    label: 'sql-mysql-upsert',
    detail: 'SQL (MySQL 8): InnoDB Table & ON DUPLICATE KEY UPDATE Upsert',
    documentation: 'MySQL 8 UTF8MB4 table definition and atomic upsert using VALUES/alias syntax',
    insertText: 'CREATE TABLE IF NOT EXISTS `${1:telemetry_events}` (\n    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n    `event_key` VARCHAR(128) NOT NULL,\n    `payload` JSON NOT NULL,\n    `hit_count` INT UNSIGNED NOT NULL DEFAULT 1,\n    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n    PRIMARY KEY (`id`),\n    UNIQUE KEY `uq_event_key` (`event_key`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\nINSERT INTO `${1:telemetry_events}` (`event_key`, `payload`, `hit_count`)\nVALUES (\'${2:editor.launch}\', JSON_OBJECT(\'version\', \'6.1.0\'), 1) AS new_row\nON DUPLICATE KEY UPDATE\n    `payload` = new_row.`payload`,\n    `hit_count` = `${1:telemetry_events}`.`hit_count` + 1;\n$0',
  },
  {
    label: 'sql-sqlite-fts5',
    detail: 'SQL (SQLite): WAL Mode, STRICT Table & FTS5 Full-Text Search',
    documentation: 'SQLite 3.37+ STRICT schema with WAL journaling and FTS5 virtual search index',
    insertText: 'PRAGMA journal_mode = WAL;\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE IF NOT EXISTS ${1:documents} (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    title TEXT NOT NULL,\n    body TEXT NOT NULL,\n    created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))\n) STRICT;\n\nCREATE VIRTUAL TABLE IF NOT EXISTS ${1:documents}_fts\nUSING fts5(title, body, content=\'${1:documents}\', content_rowid=\'id\');\n$0',
  },
  {
    label: 'sql-tsql-merge',
    detail: 'SQL (T-SQL / SQL Server): Transactional MERGE Upsert Statement',
    documentation: 'SQL Server T-SQL atomic MERGE with HOLDLOCK and OUTPUT clause',
    insertText: 'BEGIN TRANSACTION;\n\nMERGE INTO dbo.${1:WorkspaceMetrics} WITH (HOLDLOCK) AS target\nUSING (VALUES (@MetricKey, @MetricValue)) AS source (MetricKey, MetricValue)\n    ON target.MetricKey = source.MetricKey\nWHEN MATCHED THEN\n    UPDATE SET target.MetricValue = source.MetricValue, target.UpdatedAt = SYSUTCDATETIME()\nWHEN NOT MATCHED THEN\n    INSERT (MetricKey, MetricValue, UpdatedAt)\n    VALUES (source.MetricKey, source.MetricValue, SYSUTCDATETIME())\nOUTPUT \\$action, inserted.MetricKey, inserted.MetricValue;\n\nCOMMIT TRANSACTION;\n$0',
  },
]

// 2. GraphQL Schema & Operations Snippets
export const GRAPHQL_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'graphql-sdl-type',
    detail: 'GraphQL SDL: Object Type, Query, Mutation & Subscription Schema',
    documentation: 'GraphQL Schema Definition Language with input types, interfaces, directives, and subscriptions',
    insertText: 'type ${1:WorkspaceAsset} implements Node {\n  id: ID!\n  name: String!\n  sheenFactor: Float!\n  metadata: JSON\n  createdAt: DateTime!\n}\n\ninput Create${1:WorkspaceAsset}Input {\n  name: String!\n  sheenFactor: Float = 0.85\n  metadata: JSON\n}\n\ntype Query {\n  asset(id: ID!): ${1:WorkspaceAsset}\n  assets(first: Int = 20, after: String): AssetConnection!\n}\n\ntype Mutation {\n  createAsset(input: Create${1:WorkspaceAsset}Input!): ${1:WorkspaceAsset}!\n}\n\ntype Subscription {\n  assetUpdated(workspaceId: ID!): ${1:WorkspaceAsset}!\n}\n$0',
  },
]

// 3. Prisma Schema Snippets
export const PRISMA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'prisma-model-relations',
    detail: 'Prisma Schema: Model with 1-to-Many Relations, Enums & Indexes',
    documentation: 'Prisma ORM schema model with PostgreSQL datasource, UUID, relations, and @@index',
    insertText: 'generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nenum AssetStatus {\n  DRAFT\n  ACTIVE\n  ARCHIVED\n}\n\nmodel ${1:Workspace} {\n  id        String   @id @default(uuid())\n  name      String\n  slug      String   @unique\n  assets    ${2:Asset}[]\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@map("workspaces")\n}\n\nmodel ${2:Asset} {\n  id          String      @id @default(uuid())\n  workspaceId String\n  workspace   ${1:Workspace}   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)\n  name        String\n  status      AssetStatus @default(ACTIVE)\n  sheenScore  Float       @default(0.85)\n  createdAt   DateTime    @default(now())\n\n  @@index([workspaceId, status])\n  @@map("assets")\n}\n$0',
  },
]

export const DATABASE_SCHEMA_SNIPPETS: SnippetDefinition[] = [
  ...SQL_SNIPPETS,
  ...GRAPHQL_SNIPPETS,
  ...PRISMA_SNIPPETS,
]

export const databaseSchemaSnippets = DATABASE_SCHEMA_SNIPPETS
