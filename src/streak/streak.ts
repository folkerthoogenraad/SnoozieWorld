import './streak.css'

export const FLAME_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5c-2.6 0-4.5-1.8-4.5-4.3 0-2.9 2.6-4.3 2.9-7.7 2 1.2 3.1 3.1 3.2 4.9.6-.5 1-1.3 1.1-2.2 1.2 1.1 1.8 2.9 1.8 4.7 0 2.7-1.9 4.6-4.5 4.6z" /></svg>`

// A small reward every this many in a row (unless it is a Full Round).
const MILESTONE_EVERY = 10
// The Multiplier badge's colour per Multiplier; from the last one on it stays the same.
const MULTIPLIER_COLOURS = ['x2', 'x3', 'x4', 'x5']

/**
 * What a Streak earns when it grows: a Full Round (a fanfare) or a Milestone
 * (a chime). In Practice Mode a Full Round is a Streak as long as the Practice
 * Set; in a Quiz Run it is a perfect Quiz Run (every Prompt Correct).
 */
export type StreakReward = 'full-round' | 'milestone'

/** 1, plus one per Full Round: a Streak as long as the Practice Set is ×2, twice as long ×3, … */
export function streakMultiplier(streak: number, setSize: number): number {
  return setSize > 0 ? Math.floor(streak / setSize) + 1 : 1
}

/** How far the Streak is towards its next Full Round, 0–1. */
export function roundProgress(streak: number, setSize: number): number {
  return setSize > 0 ? (streak % setSize) / setSize : 0
}

/** The reward for reaching this Streak: a Full Round at every multiple of the set size, else a Milestone every 10. */
export function streakReward(streak: number, setSize: number): StreakReward | null {
  if (streak > 0 && setSize > 0 && streak % setSize === 0) return 'full-round'
  if (streak > 0 && streak % MILESTONE_EVERY === 0) return 'milestone'
  return null
}

/**
 * A Streak with its Multiplier badge: "12", or "56 ×2" once it is at least as
 * long as the Practice Set (a Full Round). Yellow ×2, orange ×3, red ×4,
 * purple ×5 and up.
 */
export function createStreakLabel(streak: number, setSize: number): DocumentFragment {
  const multiplier = streakMultiplier(streak, setSize)
  const fragment = document.createDocumentFragment()
  const value = document.createElement('span')
  value.className = 'streak__count'
  value.textContent = String(streak)
  fragment.append(value)
  if (multiplier > 1) {
    const badge = document.createElement('span')
    const colour = MULTIPLIER_COLOURS[Math.min(multiplier, MULTIPLIER_COLOURS.length + 1) - 2]
    badge.className = `streak__multiplier streak__multiplier--${colour}`
    badge.textContent = `×${multiplier}`
    fragment.append(badge)
  }
  return fragment
}

/** "56 in a row; ×3 at 92", for titles. */
export function describeStreak(streak: number, setSize: number): string {
  const multiplier = streakMultiplier(streak, setSize)
  return `${streak} in a row; ×${multiplier + 1} at ${multiplier * setSize}`
}
