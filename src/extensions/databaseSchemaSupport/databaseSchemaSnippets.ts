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
