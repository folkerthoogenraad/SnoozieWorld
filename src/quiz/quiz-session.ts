import type { Country } from '../country/country.ts'
import { QuizRun, type QuizRunSnapshot } from './quiz-run.ts'
import { normalizeQuizSettings, quizRules, type QuizSettings } from './quiz-settings.ts'

/**
 * A Quiz Session: the saved state of the active Quiz Run, so it survives a
 * page reload. Saved in localStorage after every Try, when pausing and when
 * the page is left. Cleared when the Quiz Run is finished or abandoned.
 */
export interface QuizSession {
  settings: QuizSettings
  run: QuizRun
  /** Session Time so far. */
  elapsedMs: number
}

interface StoredQuizSession {
  version: 1
  settings: QuizSettings
  run: QuizRunSnapshot
  elapsedMs: number
  savedAt: string
}

const STORAGE_KEY = 'snoozieworld.quizSession'

/** Whether a Quiz Session is saved; can be checked before the Countries are loaded. */
export function hasQuizSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function saveQuizSession(session: QuizSession): void {
  const stored: StoredQuizSession = {
    version: 1,
    settings: session.settings,
    run: session.run.snapshot(),
    elapsedMs: Math.round(session.elapsedMs),
    savedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage unavailable: the Quiz Run just won't survive a reload.
  }
}

/** Loads the saved Quiz Session; discards it when it can't be restored. */
export function loadQuizSession(countries: readonly Country[]): QuizSession | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredQuizSession | null
    // Settings saved before Modifiers existed are upgraded by normalizeQuizSettings.
    const settings = stored?.version === 1 ? normalizeQuizSettings(stored.settings) : null
    if (stored && settings) {
      const byId = new Map(countries.map((country) => [country.id, country]))
      const run = QuizRun.restore(stored.run, byId, quizRules(settings))
      if (run) return { settings, run, elapsedMs: Math.max(0, Number(stored.elapsedMs) || 0) }
    }
  } catch {
    // Corrupt or unreadable: treat as no session.
  }
  clearQuizSession()
  return null
}

export function clearQuizSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
