import { describe, it, expect, beforeEach } from 'vitest'
import { notificationService } from '../src/services/notificationService'

describe('NotificationService', () => {
  beforeEach(() => {
    notificationService.dismissAll()
  })

  it('starts with empty list after dismissAll', () => {
    expect(notificationService.getNotifications().length).toBe(0)
    expect(notificationService.getUnreadCount()).toBe(0)
  })

  it('adds notification and tracks unread count', () => {
    notificationService.addNotification({
      title: 'Compiler Check',
      message: 'Go compiler was found',
      type: 'success',
      source: 'Toolchain Auto-Detect',
    })

    expect(notificationService.getNotifications().length).toBe(1)
    expect(notificationService.getUnreadCount()).toBe(1)
  })

  it('marks individual and all notifications as read', () => {
    const id1 = notificationService.addNotification({
      title: 'Alert 1',
      message: 'Message 1',
      type: 'info',
    })
    const id2 = notificationService.addNotification({
      title: 'Alert 2',
      message: 'Message 2',
      type: 'warning',
    })

    expect(notificationService.getUnreadCount()).toBe(2)

    notificationService.markAsRead(id1)
    expect(notificationService.getUnreadCount()).toBe(1)

    notificationService.markAllAsRead()
    expect(notificationService.getUnreadCount()).toBe(0)
    expect(notificationService.getNotifications().length).toBe(2)
  })

  it('dismisses all notifications at once and resets count to zero', () => {
    notificationService.addNotification({ title: 'A', message: 'A', type: 'info' })
    notificationService.addNotification({ title: 'B', message: 'B', type: 'warning' })
    notificationService.addNotification({ title: 'C', message: 'C', type: 'error' })

    expect(notificationService.getNotifications().length).toBe(3)
    expect(notificationService.getUnreadCount()).toBe(3)

    notificationService.dismissAll()

    expect(notificationService.getNotifications().length).toBe(0)
    expect(notificationService.getUnreadCount()).toBe(0)
  })

  it('records human readable error notifications with notifyError', () => {
    const error = new Error('AI Streaming connection interrupted unexpectedly')
    notificationService.notifyError('AI Multi-Model Crash', error, 'AI Assistant')

    const notifs = notificationService.getNotifications()
    expect(notifs.length).toBe(1)
    expect(notifs[0].type).toBe('error')
    expect(notifs[0].title).toBe('AI Multi-Model Crash')
    expect(notifs[0].message).toContain('AI Streaming connection interrupted')
    expect(notifs[0].source).toBe('AI Assistant')
  })

  it('generates missing toolchain warning with download action', () => {
    notificationService.notifyMissingToolchain('Go Universal Suite', 'go', 'https://go.dev/dl/')

    const notifs = notificationService.getNotifications()
    expect(notifs.length).toBe(1)
    expect(notifs[0].type).toBe('warning')
    expect(notifs[0].title).toBe('Go Universal Suite: Compiler Missing')
    expect(notifs[0].actions?.length).toBe(1)
    expect(notifs[0].actions?.[0].label).toBe('Download go')
  })
})
