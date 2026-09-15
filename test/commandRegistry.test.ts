import { describe, it, expect } from 'vitest'
import { commandRegistry, CommandItem } from '../src/services/commandRegistry'

describe('Command Registry Service', () => {
  it('should register and retrieve commands', () => {
    let executed = false
    const testCmd: CommandItem = {
      id: 'test.hello-world',
      title: 'Test: Hello World',
      category: 'Help',
      handler: () => {
        executed = true
      },
    }

    const unregister = commandRegistry.register(testCmd)
    const retrieved = commandRegistry.get('test.hello-world')
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('Test: Hello World')
    expect(retrieved?.category).toBe('Help')

    commandRegistry.execute('test.hello-world')
    expect(executed).toBe(true)

    // Unregister
    unregister()
    expect(commandRegistry.get('test.hello-world')).toBeUndefined()
  })

  it('should support registerMany and unregister all', () => {
    const commands: CommandItem[] = [
      {
        id: 'test.multi.1',
        title: 'Multi 1',
        category: 'File',
        handler: () => {},
      },
      {
        id: 'test.multi.2',
        title: 'Multi 2',
        category: 'Toolchain',
        handler: () => {},
      },
    ]

    const unregisterAll = commandRegistry.registerMany(commands)
    expect(commandRegistry.get('test.multi.1')).toBeDefined()
    expect(commandRegistry.get('test.multi.2')).toBeDefined()

    unregisterAll()
    expect(commandRegistry.get('test.multi.1')).toBeUndefined()
    expect(commandRegistry.get('test.multi.2')).toBeUndefined()
  })

  it('should notify subscribers when commands are registered or removed', () => {
    let notifyCount = 0
    const unsubscribe = commandRegistry.subscribe(() => {
      notifyCount++
    })

    const testCmd: CommandItem = {
      id: 'test.notify',
      title: 'Notify Test',
      category: 'Preferences',
      handler: () => {},
    }

    const unreg = commandRegistry.register(testCmd)
    expect(notifyCount).toBe(1)

    unreg()
    expect(notifyCount).toBe(2)

    unsubscribe()
  })

  it('should return all registered commands', () => {
    const all = commandRegistry.getAll()
    expect(Array.isArray(all)).toBe(true)
  })
})
