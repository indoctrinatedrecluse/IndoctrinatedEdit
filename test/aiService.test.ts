import { describe, it, expect } from 'vitest'
import { cancelAiStream, listOllamaModels, streamAiResponse } from '../electron/ai-service'
import { AiStreamChunk } from '../packages/sdk/types'

describe('AI Multi-Model Service', () => {
  it('should handle unreachable Ollama host gracefully and return empty array', async () => {
    const models = await listOllamaModels('http://127.0.0.1:59999')
    expect(Array.isArray(models)).toBe(true)
    expect(models.length).toBe(0)
  })

  it('should handle stream cancellation without throwing', () => {
    expect(() => {
      cancelAiStream('non-existent-request-id')
    }).not.toThrow()
  })

  it('should dispatch error chunk gracefully when attempting to stream with missing/invalid credentials', async () => {
    const chunks: AiStreamChunk[] = []
    const requestId = 'test-stream-error-' + Date.now()

    await streamAiResponse(
      requestId,
      {
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hello' }],
        apiKey: 'invalid-key-for-testing',
        endpoint: 'http://127.0.0.1:59999', // dummy unreachable endpoint
      },
      (chunk) => {
        chunks.push(chunk)
      }
    )

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
    expect(lastChunk.error).toBeDefined()
  })
})
