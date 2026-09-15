export interface CommandItem {
  id: string
  title: string
  category: 'File' | 'View' | 'Preferences' | 'Git' | 'Themes' | 'Editor' | 'Help' | 'AI'
  shortcut?: string
  description?: string
  handler: () => void | Promise<void>
}

class CommandRegistryService {
  private commands: Map<string, CommandItem> = new Map()
  private listeners: Set<() => void> = new Set()

  register(command: CommandItem): () => void {
    this.commands.set(command.id, command)
    this.notify()
    return () => {
      this.commands.delete(command.id)
      this.notify()
    }
  }

  registerMany(commands: CommandItem[]): () => void {
    commands.forEach((cmd) => this.commands.set(cmd.id, cmd))
    this.notify()
    return () => {
      commands.forEach((cmd) => this.commands.delete(cmd.id))
      this.notify()
    }
  }

  getAll(): CommandItem[] {
    return Array.from(this.commands.values())
  }

  get(id: string): CommandItem | undefined {
    return this.commands.get(id)
  }

  execute(id: string): void | Promise<void> {
    const cmd = this.commands.get(id)
    if (cmd) {
      return cmd.handler()
    } else {
      console.warn(`[CommandRegistry] Command "${id}" not found.`)
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const commandRegistry = new CommandRegistryService()
