import React from 'react'

interface AppIconProps {
  size?: number
  className?: string
  glow?: boolean
}

export const AppIcon: React.FC<AppIconProps> = ({
  size = 22,
  className = '',
  glow = true,
}) => {
  return (
    <div
      className={`app-brand-icon-wrapper ${glow ? 'glow' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/icon.svg"
        alt="IndoctrinatedEdit"
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          // Fallback to png if svg fails
          const target = e.currentTarget
          target.src = '/icon.png'
        }}
      />
      <style>{`
        .app-brand-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          user-select: none;
        }

        .app-brand-icon-wrapper.glow img {
          filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.45));
          transition: filter 0.2s ease;
        }

        .app-brand-icon-wrapper.glow:hover img {
          filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.8)) drop-shadow(0 0 14px rgba(191, 90, 242, 0.5));
        }
      `}</style>
    </div>
  )
}
