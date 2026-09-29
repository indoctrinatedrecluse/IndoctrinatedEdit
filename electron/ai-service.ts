import { IpcMain } from 'electron'
import { AiProvider, AiStreamChunk } from '../packages/sdk/types'

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
    const cleanKey = (apiKey || '').trim()

    if (provider === 'ollama') {
      await streamOllama(endpoint || 'http://localhost:11434', model, messages, controller.signal, onChunk)
    } else if (provider === 'claude') {
      await streamClaude(endpoint || 'https://api.anthropic.com', model, messages, cleanKey, controller.signal, onChunk)
    } else if (provider === 'deepseek') {
      const isOpenRouterKey = cleanKey.startsWith('sk-or-v1-')
      let targetEndpoint = endpoint || (isOpenRouterKey ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com')
      
      // Automatically route to OpenRouter if an OpenRouter key is used but the endpoint is still the DeepSeek default
      if (isOpenRouterKey && targetEndpoint === 'https://api.deepseek.com') {
        targetEndpoint = 'https://openrouter.ai/api/v1'
      }

      let targetModel = model

      if (targetEndpoint.includes('openrouter.ai')) {
        // OpenRouter requires provider-prefixed model IDs
        if (!targetModel.includes('/')) {
          targetModel = `deepseek/${targetModel}`
        }
      }
      // Direct api.deepseek.com: pass model ID as-is (deepseek-chat, deepseek-reasoner, etc.)

      await streamOpenAiCompatible(
        targetEndpoint,
        targetModel,
        messages,
        cleanKey,
        controller.signal,
        onChunk
      )
    } else if (provider === 'gemini') {
      await streamGemini(
        endpoint,
        model,
        messages,
        cleanKey,
        controller.signal,
        onChunk
      )
    } else {
      // Default: OpenAI or OpenAI-compatible
      await streamOpenAiCompatible(
        endpoint || 'https://api.openai.com/v1',
        model,
        messages,
        cleanKey,
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
 * Streams responses for OpenAI and OpenAI-compatible APIs (DeepSeek, OpenAI, etc.)
 */
async function streamOpenAiCompatible(
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  signal: AbortSignal,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  let cleanBase = baseUrl.trim().replace(/\/+$/, '')
  let url = cleanBase
  if (!url.endsWith('/chat/completions')) {
    url = `${url}/chat/completions`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    const cleanKey = apiKey.trim()
    headers['Authorization'] = cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`
    if (cleanKey.startsWith('sk-or-v1-') || url.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit'
      headers['X-Title'] = 'IndoctrinatedEdit'
    }
  }

  const bodyPayload: Record<string, any> = {
    model,
    messages,
    stream: true,
    max_tokens: 8192,
  }

  if (url.includes('openrouter.ai')) {
    bodyPayload.include_reasoning = true
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text()
    try {
      const parsed = JSON.parse(errorText)
      const msg = parsed?.error?.message || parsed?.message || errorText
      throw new Error(`API error (${res.status}): ${msg}`)
    } catch {
      throw new Error(`API error (${res.status}): ${errorText}`)
    }
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
            // Capture reasoning tokens for models with CoT reasoning
            const reasoningChunk = delta.reasoning_content || delta.reasoning || delta.thought
            if (reasoningChunk) {
              onChunk({ reasoning: reasoningChunk })
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
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const url = cleanBase.endsWith('/v1/messages') ? cleanBase : `${cleanBase}/v1/messages`

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
      max_tokens: 8192,
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
        if (event.type === 'content_block_delta') {
          if (event.delta?.text) {
            onChunk({ text: event.delta.text })
          }
          if (event.delta?.thinking) {
            onChunk({ reasoning: event.delta.thinking })
          }
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

/**
 * Streams responses from Google Gemini API (Direct Google AI Studio REST API or OpenAI-compatible proxy)
 */
async function streamGemini(
  endpoint: string | undefined,
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  signal: AbortSignal,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const cleanModel = model.replace(/^models\//, '')

  // If user provided a custom OpenAI-compatible proxy or explicit /openai endpoint
  if (
    endpoint &&
    (endpoint.includes('/openai') ||
      (!endpoint.includes('generativelanguage.googleapis.com') && endpoint.startsWith('http')))
  ) {
    return streamOpenAiCompatible(endpoint, cleanModel, messages, apiKey, signal, onChunk)
  }

  // Native Gemini REST SSE stream via Google AI Studio API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?key=${apiKey}&alt=sse`

  const systemMsg = messages.find((m) => m.role === 'system')?.content
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }))

  const bodyPayload: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 32768,
    },
  }

  if (systemMsg) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemMsg }],
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${errorText}`)
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
        const json = JSON.parse(jsonStr)
        const candidates = json.candidates || []
        for (const cand of candidates) {
          const parts = cand.content?.parts || []
          for (const part of parts) {
            if (part.text) {
              onChunk({ text: part.text })
            }
            if (part.thought) {
              onChunk({ reasoning: part.thought })
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Registers all AI streaming IPC handlers with Electron main process
 */
export function setupIPC(ipcMain: IpcMain): void {
  ipcMain.handle('ai:listOllamaModels', async (_, host?: string) => {
    return listOllamaModels(host)
  })

  ipcMain.handle('ai:cancelStream', async (_, requestId: string) => {
    cancelAiStream(requestId)
    return true
  })

  ipcMain.handle('ai:startStream', async (event, requestId: string, options: AiRequestOptions) => {
    const channel = `ai:chunk:${requestId}`
    streamAiResponse(requestId, options, (chunk) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(channel, chunk)
      }
    })
    return true
  })
}
