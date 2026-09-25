import './monacoWorker'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// Global Viewport Scroll Lock & Stabilization (Prevents PageDown / navigation keys from scrolling root window layout)
const lockScroll = () => {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0)
  }
  if (document.documentElement && (document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0)) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollLeft = 0
  }
  if (document.body && (document.body.scrollTop !== 0 || document.body.scrollLeft !== 0)) {
    document.body.scrollTop = 0
    document.body.scrollLeft = 0
  }
  const root = document.getElementById('root')
  if (root && (root.scrollTop !== 0 || root.scrollLeft !== 0)) {
    root.scrollTop = 0
    root.scrollLeft = 0
  }
}

window.addEventListener('scroll', lockScroll, { passive: false, capture: true })
document.addEventListener('scroll', lockScroll, { passive: false, capture: true })

// Intercept unhandled layout-shifting navigation keys (PageDown, PageUp, Home, End)
window.addEventListener(
  'keydown',
  (e) => {
    if (['PageDown', 'PageUp', 'Home', 'End'].includes(e.code) || ['PageDown', 'PageUp'].includes(e.key)) {
      const target = e.target as HTMLElement | null
      const isMonaco = target?.closest('.monaco-editor')
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      const isScrollable = target?.closest(
        '.terminal-output-viewport, .tui-active-viewport, .custom-scrollable, .notebook-editor-scroll, .overflow-y-auto'
      )

      if (!isMonaco && !isInput && !isScrollable) {
        e.preventDefault()
      }
      requestAnimationFrame(lockScroll)
    }
  },
  { capture: true }
)

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
