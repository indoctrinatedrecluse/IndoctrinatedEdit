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
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <radialGradient id="appIconGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#BF5AF2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id="appIconBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="35%" stopColor="#00F0FF" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#BF5AF2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="appIconBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#182032" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0A0E18" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="appIconCyanRay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="appIconMagentaRay" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF007F" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="appIconPrism" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Ambient Glow */}
        <rect width="512" height="512" fill="url(#appIconGlow)" />

        {/* Outer Glass Squircle */}
        <rect
          x="44"
          y="44"
          width="424"
          height="424"
          rx="100"
          fill="url(#appIconBody)"
          stroke="url(#appIconBorder)"
          strokeWidth="6"
        />

        {/* Inner Refraction Rim */}
        <rect
          x="54"
          y="54"
          width="404"
          height="404"
          rx="90"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
        />

        {/* Neon Laser Beams */}
        <line x1="80" y1="110" x2="432" y2="400" stroke="url(#appIconCyanRay)" strokeWidth="5" />
        <line x1="432" y1="110" x2="80" y2="400" stroke="url(#appIconMagentaRay)" strokeWidth="5" />

        {/* Center Crystal Prism */}
        <polygon
          points="256,120 376,190 376,322 256,392 136,322 136,190"
          fill="url(#appIconPrism)"
          stroke="#00F0FF"
          strokeWidth="3.5"
          strokeOpacity="0.9"
        />

        <line x1="256" y1="120" x2="256" y2="392" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
        <line x1="136" y1="190" x2="376" y2="322" stroke="rgba(191,90,242,0.7)" strokeWidth="2" />
        <line x1="376" y1="190" x2="136" y2="322" stroke="rgba(0,240,255,0.7)" strokeWidth="2" />

        {/* Indoctrinated Code Chevrons */}
        <path d="M 200 230 L 256 265 L 312 230" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 200 260 L 256 295 L 312 260" fill="none" stroke="#00F0FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 216 290 L 256 315 L 296 290" fill="none" stroke="#FF007F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx="256" cy="256" r="8" fill="#FFFFFF" />
      </svg>

      <style>{`
        .app-brand-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          user-select: none;
        }

        .app-brand-icon-wrapper.glow svg {
          filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.6)) drop-shadow(0 0 10px rgba(191, 90, 242, 0.4));
          transition: filter 0.2s ease;
        }

        .app-brand-icon-wrapper.glow:hover svg {
          filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.9)) drop-shadow(0 0 16px rgba(191, 90, 242, 0.6));
        }
      `}</style>
    </div>
  )
}
