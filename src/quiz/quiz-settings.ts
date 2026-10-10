import type { Country } from '../country/country.ts'
import { CATEGORIES } from './category.ts'
import { GAME_MODES, gameModeById, type GameModeId } from './game-mode.ts'
import { DEFAULT_MODIFIERS, normalizeModifiers, type ModifierSettings } from './modifier.ts'
import type { QuizRules } from './quiz-run.ts'

/** What the player chose on the Start Screen. */
export interface QuizSettings {
  categoryIds: string[]
  gameModeId: GameModeId
  modifiers: ModifierSettings
}

const STORAGE_KEY = 'snoozieworld.quizSettings'
const DEFAULT_SETTINGS: QuizSettings = {
  categoryIds: ['europe'],
  gameModeId: 'name-to-location',
  modifiers: DEFAULT_MODIFIERS,
}

/** The Countries a Quiz with these settings asks about, in no particular order. */
export function quizCountries(settings: QuizSettings, countries: readonly Country[]): Country[] {
  const gameMode = gameModeById(settings.gameModeId)
  const categories = CATEGORIES.filter((category) => settings.categoryIds.includes(category.id))
  return countries.filter(
    (country) => gameMode.canAsk(country, settings.modifiers) && categories.some((c) => c.includes(country)),
  )
}

/** How a Quiz Run with these settings is played, set by the Guesses Modifier. */
export function quizRules(settings: QuizSettings): QuizRules {
  const guesses = settings.modifiers.guesses
  return { triesPerPrompt: guesses === 'two-guesses' ? 2 : 1, suddenDeath: guesses === 'sudden-death' }
}

/**
 * The Modifiers that apply to the settings' Game Mode; the others are left out.
 * Stored with Leaderboard Entries.
 */
export function activeModifiers(settings: QuizSettings): Partial<ModifierSettings> {
  const ids = gameModeById(settings.gameModeId).modifierIds
  return Object.fromEntries(ids.map((id) => [id, settings.modifiers[id]]))
}

/**
 * Turns stored settings into valid ones, or null when they are unusable.
 * Settings from before Modifiers existed may use the old Flag to Location
 * Game Mode, which is now Name to Location with the Flag Modifier on Flag only.
 */
export function normalizeQuizSettings(stored: unknown): QuizSettings | null {
  if (!stored || typeof stored !== 'object') return null
  const { categoryIds, gameModeId, modifiers } = stored as Record<string, unknown>
  if (!Array.isArray(categoryIds)) return null
  const normalized: QuizSettings = {
    categoryIds: categoryIds.filter((id) => CATEGORIES.some((c) => c.id === id)),
    gameModeId: 'name-to-location',
    modifiers: normalizeModifiers(modifiers),
  }
  if (gameModeId === 'flag-to-location') normalized.modifiers.flag = 'flag-only'
  else if (GAME_MODES.some((m) => m.id === gameModeId)) normalized.gameModeId = gameModeId as GameModeId
  else return null
  return normalized
}

/** The settings used last time, so the Start Screen can pre-fill them. */
export function loadQuizSettings(): QuizSettings {
  try {
    return normalizeQuizSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? DEFAULT_SETTINGS
  } catch {
    // Storage unavailable or corrupt: fall back to the defaults.
    return DEFAULT_SETTINGS
  }
}

export function saveQuizSettings(settings: QuizSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Not being able to remember the settings is fine.
  }
}
