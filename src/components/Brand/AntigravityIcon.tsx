import React from 'react'

interface AntigravityIconProps {
  size?: number
  className?: string
  color?: string
}

export const AntigravityIcon: React.FC<AntigravityIconProps> = ({
  size = 18,
  className = '',
  color = '#00F0FF',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id="antigravity-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} />
          <stop offset="0.5" stopColor="#BF5AF2" />
          <stop offset="1" stopColor="#FF2D55" />
        </linearGradient>
        <filter id="ag-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={color} floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Futuristic Inverted Gravity Diamond Prism */}
      <path
        d="M12 2L3 9L12 22L21 9L12 2Z"
        stroke="url(#antigravity-gradient)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ag-glow)"
      />
      {/* Inner Floating Quantum Core */}
      <path
        d="M12 6L7 10.5L12 17L17 10.5L12 6Z"
        fill="url(#antigravity-gradient)"
        fillOpacity="0.25"
        stroke="url(#antigravity-gradient)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center Gravitational Node */}
      <circle cx="12" cy="11.5" r="2" fill="#00F0FF" />
    </svg>
  )
}
