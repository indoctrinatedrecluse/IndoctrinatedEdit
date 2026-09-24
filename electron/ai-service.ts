import { AiProvider, AiStreamChunk } from '../packages/sdk/types'
import { antigravityBackendService } from './antigravity-backend-service'

export interface AiRequestOptions {
  provider: AiProvider
  model: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  apiKey?: string
  endpoint?: string
}

// Active abort controllers for stream cancellation
const activeStreams = new Map<string, AbortController>()

export function cancelAiStream(requestId: string): void {
  const controller = activeStreams.get(requestId)
  if (controller) {
    controller.abort()
    activeStreams.delete(requestId)
  }
}

export async function listOllamaModels(host = 'http://localhost:11434'): Promise<string[]> {
  try {
    const url = host.replace(/\/+$/, '') + '/api/tags'
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return []
    const data = (await res.json()) as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) || []
  } catch {
    return []
  }
}

export async function streamAiResponse(
  requestId: string,
  options: AiRequestOptions,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const controller = new AbortController()
  activeStreams.set(requestId, controller)

  try {
    const { provider, model, messages, apiKey = '', endpoint } = options

    if (provider === 'ollama') {
      await streamOllama(endpoint || 'http://localhost:11434', model, messages, controller.signal, onChunk)
    } else if (provider === 'claude') {
      await streamClaude(endpoint || 'https://api.anthropic.com', model, messages, apiKey, controller.signal, onChunk)
    } else if (provider === 'deepseek') {
      await streamOpenAiCompatible(
        endpoint || 'https://api.deepseek.com',
        model,
        messages,
        apiKey,
        controller.signal,
        onChunk
      )
    } else if (provider === 'gemini') {
      // Gemini's official OpenAI-compatible endpoint
      await streamOpenAiCompatible(
        endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai',
        model,
        messages,
        apiKey,
        controller.signal,
        onChunk
      )
    } else if (provider === 'antigravity') {
      if (endpoint && !endpoint.includes('localhost') && !endpoint.includes('127.0.0.1')) {
        // Custom remote endpoint
        await streamOpenAiCompatible(
          endpoint,
          model,
          messages,
          apiKey,
          controller.signal,
          onChunk
        )
      } else {
        // Python Antigravity SDK sidecar
        await antigravityBackendService.streamChat(
          requestId,
          model,
          messages,
          onChunk
        )
      }
    } else {
      // Default: OpenAI
      await streamOpenAiCompatible(
        endpoint || 'https://api.openai.com/v1',
        model,
        messages,
        apiKey,
        controller.signal,
        onChunk
      )
    }

    onChunk({ done: true })
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      onChunk({ done: true })
    } else {
      const message = err instanceof Error ? err.message : String(err)
      onChunk({ error: message, done: true })
    }
  } finally {
    activeStreams.delete(requestId)
  }
}

/**
 * Streams responses for OpenAI and OpenAI-compatible APIs (DeepSeek, Gemini, Antigravity, etc.)
 */
async function streamOpenAiCompatible(
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  signal: AbortSignal,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const url = baseUrl.replace(/\/+$/, '') + (baseUrl.endsWith('/chat/completions') ? '' : '/chat/completions')

  const authHeader = apiKey ? (apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`) : ''
  const isAntigravity = baseUrl.includes('antigravity') || baseUrl.includes(':8080') || baseUrl.includes(':4040')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }
  if (isAntigravity) {
    headers['X-Antigravity-Subscription-Tier'] = 'personal'
    headers['X-Antigravity-Client'] = 'IndoctrinatedEdit/4.9.0'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`API error (${res.status}): ${errorText}`)
  }

  if (!res.body) throw new Error('Response body is empty')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(':')) continue

      if (trimmed === 'data: [DONE]') {
        return
      }

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6))
          const delta = json.choices?.[0]?.delta
          if (delta) {
            if (delta.content) {
              onChunk({ text: delta.content })
            }
            // Capture reasoning tokens for models like DeepSeek-R1 or o3-mini
            if (delta.reasoning_content) {
              onChunk({ reasoning: delta.reasoning_content })
            }
          }
        } catch {
          // ignore incomplete or malformed chunk
        }
      }
    }
  }
}

/**
 * Streams responses from local Ollama instance
 */
async function streamOllama(
  host: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const url = host.replace(/\/+$/, '') + '/api/chat'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Ollama error (${res.status}): ${errorText}`)
  }

  if (!res.body) throw new Error('Response body is empty')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const json = JSON.parse(trimmed) as {
          message?: { content?: string; reasoning_content?: string }
          done?: boolean
        }
        if (json.message?.content) {
          onChunk({ text: json.message.content })
        }
        if (json.message?.reasoning_content) {
          onChunk({ reasoning: json.message.reasoning_content })
        }
        if (json.done) {
          return
        }
      } catch {
        // ignore malformed line
      }
    }
  }
}

/**
 * Streams responses from Anthropic Claude API
 */
async function streamClaude(
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  signal: AbortSignal,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const url = baseUrl.replace(/\/+$/, '') + '/v1/messages'

  // Extract system prompt if any
  const systemMsg = messages.find((m) => m.role === 'system')?.content
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemMsg,
      messages: chatMessages,
      max_tokens: 4096,
      stream: true,
    }),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Claude error (${res.status}): ${errorText}`)
  }

  if (!res.body) throw new Error('Response body is empty')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const jsonStr = trimmed.slice(6)
      try {
        const event = JSON.parse(jsonStr)
        if (event.type === 'content_block_delta' && event.delta?.text) {
          onChunk({ text: event.delta.text })
        }
        if (event.type === 'message_stop') {
          return
        }
      } catch {
        // ignore
      }
    }
  }
}
