import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { WindowControls } from '../src/components/WindowFrame/WindowControls'
import fs from 'node:fs'
import path from 'node:path'

describe('WindowControls Component & Dynamic Maximize/Restore Status', () => {
  it('dynamically adapts icon, class, and tooltip when window is normal vs maximized', () => {
    const handleMin = vi.fn()
    const handleMax = vi.fn()
    const handleClose = vi.fn()

    // 1. Normal / Unmaximized
    const normalElement = WindowControls({
      isMaximized: false,
      onMinimize: handleMin,
      onMaximize: handleMax,
      onClose: handleClose,
    })

    expect(normalElement).toBeDefined()
    expect(normalElement.type).toBe('div')
    expect(normalElement.props.className).toBe('window-controls-capsule')

    const children = React.Children.toArray(normalElement.props.children)
    // buttons: minimize [0], maximize/restore [1], close [2], style [3]
    const minBtn = children[0] as React.ReactElement
    const maxBtn = children[1] as React.ReactElement
    const closeBtn = children[2] as React.ReactElement

    expect(minBtn.props['aria-label']).toBe('Minimize Window')
    expect(maxBtn.props['aria-label']).toBe('Maximize Window')
    expect(maxBtn.props.title).toContain('Maximize Window')
    expect(maxBtn.props.className).toContain('is-normal')

    const maxIconSvg = maxBtn.props.children as React.ReactElement
    expect(maxIconSvg.props.className).toContain('max-icon')

    // 2. Maximized state
    const maximizedElement = WindowControls({
      isMaximized: true,
      onMinimize: handleMin,
      onMaximize: handleMax,
      onClose: handleClose,
    })

    const maxChildren = React.Children.toArray(maximizedElement.props.children)
    const restoreBtn = maxChildren[1] as React.ReactElement

    expect(restoreBtn.props['aria-label']).toBe('Restore Window')
    expect(restoreBtn.props.title).toContain('Restore Window')
    expect(restoreBtn.props.className).toContain('is-maximized')

    const restoreIconSvg = restoreBtn.props.children as React.ReactElement
    expect(restoreIconSvg.props.className).toContain('restore-icon')
  })

  it('triggers onMinimize, onMaximize, and onClose and stops event propagation', () => {
    const handleMin = vi.fn()
    const handleMax = vi.fn()
    const handleClose = vi.fn()

    const element = WindowControls({
      isMaximized: false,
      onMinimize: handleMin,
      onMaximize: handleMax,
      onClose: handleClose,
    })

    const children = React.Children.toArray(element.props.children)
    const minBtn = children[0] as React.ReactElement
    const maxBtn = children[1] as React.ReactElement
    const closeBtn = children[2] as React.ReactElement

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    // Minimize click
    minBtn.props.onClick(mockEvent)
    expect(handleMin).toHaveBeenCalledTimes(1)
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockEvent.preventDefault).toHaveBeenCalled()

    // Maximize click
    maxBtn.props.onClick(mockEvent)
    expect(handleMax).toHaveBeenCalledTimes(1)

    // Close click
    closeBtn.props.onClick(mockEvent)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('verifies increased button spacing and non-draggable capsule in CSS', () => {
    const element = WindowControls({
      isMaximized: false,
      onMinimize: () => {},
      onMaximize: () => {},
      onClose: () => {},
    })

    const children = React.Children.toArray(element.props.children)
    const styleEl = children.find(
      (c) => React.isValidElement(c) && c.type === 'style'
    ) as React.ReactElement

    expect(styleEl).toBeDefined()
    const cssText = styleEl.props.children as string
    expect(cssText).toContain('gap: 13px;')
    expect(cssText).toContain('-webkit-app-region: no-drag !important')
  })

  it('verifies WindowFrame titlebar spacers handle double-click to toggle maximize/restore', () => {
    const filePath = path.resolve(__dirname, '../src/components/WindowFrame/WindowFrame.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toContain('onDoubleClick={handleMaximize}')
    expect(content).toContain('window-drag-region')
    expect(content).toContain('window.electronAPI.maximize()')
    expect(content).toContain('onMaximizedChange')
  })
})
