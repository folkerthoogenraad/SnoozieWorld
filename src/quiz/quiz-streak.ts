import { leaderboardKey } from '../leaderboard/leaderboard.ts'
import type { QuizSettings } from './quiz-settings.ts'

const STORAGE_KEY = 'snoozieworld.quizStreaks'

/**
 * The Quiz Streak a new Quiz Run with these settings starts with: the Streak of
 * the perfect Quiz Runs before it, in a row, per Leaderboard. Anything that is
 * not a whole number of Quiz Sets (e.g. after the Quiz Set changed) counts as 0.
 */
export function loadQuizStreak(settings: QuizSettings, setSize: number): number {
  const streak = loadAll()[leaderboardKey(settings)]
  return Number.isInteger(streak) && streak > 0 && setSize > 0 && streak % setSize === 0 ? streak : 0
}

/** Stores the Streak to carry over: a perfect Quiz Run's, or 0 after a wrong Try. */
export function saveQuizStreak(settings: QuizSettings, streak: number): void {
  const all = loadAll()
  all[leaderboardKey(settings)] = streak
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable: the Streak just doesn't carry over.
  }
}

function loadAll(): Record<string, number> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch {
    return {}
  }
}
