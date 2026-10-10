import type { ModifierSettings } from '../quiz/modifier.ts'
import type { QuizSettings } from '../quiz/quiz-settings.ts'

/** One finished Quiz Run on a Leaderboard. */
export interface LeaderboardEntry {
  id: string
  /** 0–100; see QuizRun.finalScore. */
  score: number
  correct: number
  halfCorrect: number
  missed: number
  /** Session Time; missing on entries from before it was tracked. */
  durationMs?: number
  /** The Modifiers the Game Mode uses; missing on entries from before Modifiers (all at their default). */
  modifiers?: Partial<ModifierSettings>
  /** ISO date-time the Quiz Run was finished. */
  date: string
}

export const LEADERBOARD_SIZE = 10
const STORAGE_KEY = 'snoozieworld.leaderboards'

type StoredLeaderboards = Record<string, LeaderboardEntry[]>

/**
 * Each combination of Categories and Game Mode has its own Leaderboard, with
 * the top 10 Scores. Modifiers don't get their own Leaderboard: each entry
 * shows the Modifiers it was played with. Stored in this browser only (localStorage).
 */
export function leaderboardKey(settings: QuizSettings): string {
  return `${settings.gameModeId}|${[...settings.categoryIds].sort().join(',')}`
}

export function loadLeaderboard(settings: QuizSettings): LeaderboardEntry[] {
  return loadAll()[leaderboardKey(settings)] ?? []
}

/**
 * Adds an entry and keeps the best 10. Returns the updated Leaderboard; the
 * entry is missing from it when its Score did not make the top 10.
 */
export function addToLeaderboard(settings: QuizSettings, entry: LeaderboardEntry): LeaderboardEntry[] {
  const all = loadAll()
  const key = leaderboardKey(settings)
  const entries = ranked([...(all[key] ?? []), entry])
  all[key] = entries
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable: the Leaderboard only lasts for this session's screens.
  }
  return entries
}

/** Higher Score first; on equal Scores, whoever got it first stays ahead. Cut to the top 10. */
function ranked(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, LEADERBOARD_SIZE)
}

// The Flag to Location Game Mode became Name to Location with the Flag Modifier on Flag only.
const OLD_FLAG_TO_LOCATION = 'flag-to-location|'

function loadAll(): StoredLeaderboards {
  let stored: unknown
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
  const all = stored as StoredLeaderboards
  for (const key of Object.keys(all)) {
    if (!key.startsWith(OLD_FLAG_TO_LOCATION)) continue
    const newKey = `name-to-location|${key.slice(OLD_FLAG_TO_LOCATION.length)}`
    const moved = all[key].map((entry) => ({ ...entry, modifiers: { flag: 'flag-only' as const } }))
    all[newKey] = ranked([...(all[newKey] ?? []), ...moved])
    delete all[key]
  }
  return all
}
