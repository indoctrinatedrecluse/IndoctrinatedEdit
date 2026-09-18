import { describe, it, expect } from 'vitest'
import { graphQLStudioService } from '../src/services/graphQLStudioService'

describe('GraphQLStudioService', () => {
  it('provides schema introspection document with types, queries, and mutations', () => {
    const schema = graphQLStudioService.getSchema()
    expect(schema.queryType).toBe('Query')
    expect(schema.types.length).toBeGreaterThan(0)
    expect(schema.types.some((t) => t.name === 'User')).toBe(true)
    expect(schema.types.some((t) => t.name === 'WorkspaceMetrics')).toBe(true)
  })

  it('executes GraphQL queries with simulated fallback', async () => {
    const query = `
      query GetMetrics {
        workspaceMetrics {
          cpuUsagePercent
          memoryUsageMb
        }
      }
    `
    const res = await graphQLStudioService.executeQuery('http://localhost:5173/graphql', query)
    expect(res.statusCode).toBe(200)
    expect(res.data?.workspaceMetrics?.cpuUsagePercent).toBeDefined()
    expect(res.sizeBytes).toBeGreaterThan(0)
  })

  it('validates and handles invalid JSON variables', async () => {
    const res = await graphQLStudioService.executeQuery('http://localhost:5173/graphql', 'query { users { id } }', '{ invalidJson: }')
    expect(res.statusCode).toBe(400)
    expect(res.errors).toBeDefined()
    expect(res.errors?.[0].message).toContain('Variables JSON syntax is invalid')
  })

  it('exports GraphQL query to Apollo Client, urql, and fetch snippets', () => {
    const q = `query { users { id } }`
    const apolloCode = graphQLStudioService.exportCode(q, 'apollo')
    expect(apolloCode).toContain("import { gql, useQuery } from '@apollo/client'")

    const fetchCode = graphQLStudioService.exportCode(q, 'fetch')
    expect(fetchCode).toContain("fetch('/graphql'")

    const curlCode = graphQLStudioService.exportCode(q, 'curl')
    expect(curlCode).toContain('curl -X POST')
  })
})
