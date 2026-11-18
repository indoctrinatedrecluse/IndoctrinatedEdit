/**
 * IndoctrinatedEdit — Real Output Channel Service
 *
 * Ring-buffered multi-channel log store powering the BottomPanel OUTPUT tab.
 * Replaces static hardcoded log lines with live streams from Core, Extensions,
 * Run/Tasks, Git, LSP, ACP, and Updater subsystems.
 */

export type OutputChannelName =
  | 'Core'
  | 'Run & Tasks'
  | 'Extensions'
  | 'Git'
  | 'LSP & Diagnostics'
  | 'Antigravity ACP'
  | 'Updater'

export type OutputLogLevel = 'info' | 'warn' | 'error' | 'success'

export interface OutputLogEntry {
  id: string
  channel: OutputChannelName
  level: OutputLogLevel
  message: string
  timestamp: string
}

const MAX_ENTRIES_PER_CHANNEL = 400
const ALL_CHANNELS: OutputChannelName[] = [
  'Core',
  'Run & Tasks',
  'Extensions',
  'Git',
  'LSP & Diagnostics',
  'Antigravity ACP',
  'Updater',
]

class OutputChannelService {
  private entries: OutputLogEntry[] = []
  private listeners = new Set<() => void>()
  private seq = 0

  constructor() {
    this.append('Core', 'Output channel initialized.', 'info')
  }

  public getChannels(): OutputChannelName[] {
    return [...ALL_CHANNELS]
  }

  public append(channel: OutputChannelName, message: string, level: OutputLogLevel = 'info'): void {
    const now = new Date()
    const ts = now.toTimeString().slice(0, 8)
    const lines = String(message).replace(/\r\n/g, '\n').split('\n')

    for (const line of lines) {
      if (!line && lines.length > 1) continue
      this.entries.push({
        id: `out_${Date.now()}_${++this.seq}`,
        channel,
        level,
        message: line,
        timestamp: ts,
      })
    }

    // Enforce bounded ring buffer per channel
    let channelCount = 0
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].channel === channel) {
        channelCount++
        if (channelCount > MAX_ENTRIES_PER_CHANNEL) {
          this.entries.splice(i, 1)
        }
      }
    }

    this.notify()
  }

  public getEntries(channel?: OutputChannelName | 'All'): OutputLogEntry[] {
    if (!channel || channel === 'All') return [...this.entries]
    return this.entries.filter((e) => e.channel === channel)
  }

  public clear(channel?: OutputChannelName | 'All'): void {
    if (!channel || channel === 'All') {
      this.entries = []
    } else {
      this.entries = this.entries.filter((e) => e.channel !== channel)
    }
    this.notify()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn()
      } catch {
        // Ignore subscriber errors
      }
    }
  }
}

export const outputChannelService = new OutputChannelService()
