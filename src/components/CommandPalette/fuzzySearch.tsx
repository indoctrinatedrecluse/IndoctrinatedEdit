import React from 'react'

export interface FuzzyMatchResult {
  score: number
  indices: number[]
}

/**
 * High-performance fuzzy scoring algorithm with bonuses for:
 * - Exact full match
 * - Prefix matches
 * - Word boundary & CamelCase transitions
 * - Consecutive character streaks
 * - Penalties for match gaps
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyMatchResult | null {
  if (!pattern) {
    return { score: 0, indices: [] }
  }
  if (!text) {
    return null
  }

  const pLower = pattern.toLowerCase()
  const tLower = text.toLowerCase()

  // Fast check: All pattern characters must exist in order
  let pIdx = 0
  let tIdx = 0
  const indices: number[] = []

  while (pIdx < pLower.length && tIdx < tLower.length) {
    if (pLower[pIdx] === tLower[tIdx]) {
      indices.push(tIdx)
      pIdx++
    }
    tIdx++
  }

  if (pIdx < pLower.length) {
    return null // Not all characters matched in order
  }

  // Exact match bonus
  if (tLower === pLower) {
    return { score: 2000, indices }
  }

  // Exact substring match bonus
  const subIdx = tLower.indexOf(pLower)
  let score = 100

  if (subIdx === 0) {
    score += 600 // Starts with pattern
  } else if (subIdx > 0) {
    score += 350 // Exact contiguous substring inside
  }

  let consecutiveStreak = 0
  let prevMatchIdx = -2

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]

    // 1. Consecutive character bonus
    if (idx === prevMatchIdx + 1) {
      consecutiveStreak++
      score += 40 * consecutiveStreak
    } else {
      consecutiveStreak = 0
      // Penalty for gap distance between matched characters
      if (prevMatchIdx >= 0) {
        const gap = idx - prevMatchIdx - 1
        score -= Math.min(gap * 4, 40)
      }
    }

    // 2. Word boundary bonus (space, dot, slash, backslash, dash, underscore, colon)
    if (idx === 0) {
      score += 80
    } else {
      const prevChar = text[idx - 1]
      if (/[ \t._\-\\/:]/.test(prevChar)) {
        score += 70
      } else if (/[a-z]/.test(prevChar) && /[A-Z]/.test(text[idx])) {
        // CamelCase boundary (e.g. "gL" -> "goToLine")
        score += 60
      }
    }

    prevMatchIdx = idx
  }

  // Acronym match bonus (e.g. "fp" matching "File: Preferences")
  const words = text.split(/[\s:._\-\\/]+/).filter(Boolean)
  if (words.length >= pLower.length) {
    const acronym = words.map((w) => w[0]?.toLowerCase()).join('')
    if (acronym.startsWith(pLower)) {
      score += 250
    }
  }

  return { score, indices }
}

/**
 * Highlights matched character indices inside a string by wrapping them in <mark> tags.
 */
export function highlightMatches(
  text: string,
  indices: number[]
): React.ReactNode {
  if (!indices || indices.length === 0 || !text) {
    return text
  }

  const indexSet = new Set(indices)
  const segments: React.ReactNode[] = []
  let currentMatch = ''
  let currentNonMatch = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (indexSet.has(i)) {
      if (currentNonMatch) {
        segments.push(currentNonMatch)
        currentNonMatch = ''
      }
      currentMatch += char
    } else {
      if (currentMatch) {
        segments.push(
          <mark key={`m-${i}-${currentMatch}`} className="palette-highlight">
            {currentMatch}
          </mark>
        )
        currentMatch = ''
      }
      currentNonMatch += char
    }
  }

  if (currentMatch) {
    segments.push(
      <mark key={`m-end-${currentMatch}`} className="palette-highlight">
        {currentMatch}
      </mark>
    )
  }
  if (currentNonMatch) {
    segments.push(currentNonMatch)
  }

  return <>{segments}</>
}
