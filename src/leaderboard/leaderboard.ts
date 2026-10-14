import type { ModifierSettings } from '../quiz/modifier.ts'
import type { QuizSettings } from '../quiz/quiz-settings.ts'
import { selectionKey, selectionKeyFromCategories } from '../quiz/selection.ts'

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

type Leaderboards = Record<string, LeaderboardEntry[]>

/**
 * Version 2 (plan 13) has Selection keys. Version 1 was the Leaderboards
 * object itself, with Category keys.
 */
interface StoredLeaderboards {
  version: 2
  leaderboards: Leaderboards
}

/**
 * Each combination of Selection and Game Mode has its own Leaderboard, with
 * the top 10 Scores, e.g. `name-to-location|europe` (see `selectionKey`).
 * Modifiers don't get their own Leaderboard: each entry
 * shows the Modifiers it was played with. Stored in this browser only (localStorage).
 */
export function leaderboardKey(settings: QuizSettings): string {
  return `${settings.gameModeId}|${selectionKey(settings.selection)}`
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
    const stored: StoredLeaderboards = { version: 2, leaderboards: all }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
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

/** Moves the entries under `key` to `newKey`, merged with any already there. */
function move(all: Leaderboards, key: string, newKey: string, change = (entry: LeaderboardEntry) => entry): void {
  if (newKey === key) return
  all[newKey] = ranked([...(all[newKey] ?? []), ...all[key].map(change)])
  delete all[key]
}

/**
 * Version 1 to 2: Category keys become Selection keys. `<game mode>|<categories>`
 * plus `|us-states` with "Individual states in USA": `south-america` becomes
 * `south-america/south-america` (South America has its territories by default
 * now, the old entries don't), and the US States become the US states Section.
 * Runs once: the result is saved as version 2 with the next entry, and from
 * then on `south-america` means the new default.
 */
function moveCategoryKeys(all: Leaderboards): void {
  for (const key of Object.keys(all)) {
    // Before Modifiers, Flag only was a Game Mode of its own.
    if (key.startsWith(OLD_FLAG_TO_LOCATION)) {
      const newKey = `name-to-location|${key.slice(OLD_FLAG_TO_LOCATION.length)}`
      move(all, key, newKey, (entry) => ({ ...entry, modifiers: { flag: 'flag-only' as const } }))
    }
  }
  for (const key of Object.keys(all)) {
    const [gameModeId, categories = '', usStates] = key.split('|')
    const selection = selectionKeyFromCategories(categories, usStates === 'us-states')
    if (selection !== null) move(all, key, `${gameModeId}|${selection}`)
  }
}

function loadAll(): Leaderboards {
  let stored: unknown
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
  if ((stored as StoredLeaderboards).version === 2) return (stored as StoredLeaderboards).leaderboards ?? {}
  const all = stored as Leaderboards
  moveCategoryKeys(all)
  return all
}
