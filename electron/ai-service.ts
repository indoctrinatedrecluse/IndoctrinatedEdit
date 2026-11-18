import { IpcMain } from 'electron'
import {
  AiRequestOptions,
  cancelAiStream,
  listOllamaModels,
  streamAiResponse,
} from '../packages/sdk/aiCore'

export {
  PLAN_MODE_READ_ONLY_TOOLS,
  workspaceTools,
  getActiveToolsForMode,
  normalizeMessagesForProvider,
  repairWorkspaceToolCall,
  formatAiSdkError,
  resolveLanguageModel,
  cancelAiStream,
  listOllamaModels,
  streamAiResponse,
} from '../packages/sdk/aiCore'
export type { AiRequestOptions } from '../packages/sdk/aiCore'

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
