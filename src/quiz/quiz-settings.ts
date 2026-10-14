import type { Country } from '../country/country.ts'
import { GAME_MODES, gameModeById, type GameModeId } from './game-mode.ts'
import { DEFAULT_MODIFIERS, normalizeModifiers, type ModifierSettings } from './modifier.ts'
import type { QuizRules } from './quiz-run.ts'
import {
  CONTINENTS,
  defaultSelection,
  normalizeSelection,
  selectionCountries,
  selectionFromCategories,
} from './selection.ts'

/** What the player chose on the Start Screen. */
export interface QuizSettings {
  /**
   * The Selection: the keys of the Sections that are on, e.g. `['europe/mainland',
   * 'europe/balkans', 'europe/islands', 'north-america/islands', 'north-america/territories']`.
   * The Start Screen leaves out a Continent the Game Mode has nothing to ask in (Antarctica in
   * Capital to Location), so it is not in the Leaderboard key or the label either.
   */
  selection: string[]
  gameModeId: GameModeId
  modifiers: ModifierSettings
}

const STORAGE_KEY = 'snoozieworld.quizSettings'
const DEFAULT_SETTINGS: QuizSettings = {
  selection: defaultSelection(CONTINENTS.find((continent) => continent.id === 'europe')!),
  gameModeId: 'name-to-location',
  modifiers: DEFAULT_MODIFIERS,
}

/** The Countries a Quiz with these settings asks about, in no particular order. */
export function quizCountries(settings: QuizSettings, countries: readonly Country[]): Country[] {
  const gameMode = gameModeById(settings.gameModeId)
  return selectionCountries(settings.selection, countries).filter((country) =>
    gameMode.canAsk(country, settings.modifiers),
  )
}

/** How a Quiz Run with these settings is played, set by the Guesses Modifier. */
export function quizRules(settings: QuizSettings): QuizRules {
  const guesses = settings.modifiers.guesses
  return { triesPerPrompt: guesses === 'two-guesses' ? 2 : 1, suddenDeath: guesses === 'sudden-death' }
}

/**
 * The settings Practice Mode plays with: it ignores the Modifiers, except the
 * Flag Modifier, so the player can practise flags too.
 */
export function practiceSettings(settings: QuizSettings): QuizSettings {
  return { ...settings, modifiers: { ...DEFAULT_MODIFIERS, flag: settings.modifiers.flag } }
}

/**
 * Whether the Prompt's Country Info would give the answer away, so clicking the
 * Prompt must not open it: in Capital to Location it names the Country (feedback
 * 09), and with Flag only it names the flag (feedback 10).
 */
export function promptInfoGivesAnswer(settings: QuizSettings): boolean {
  return settings.gameModeId === 'capital-to-location' || activeModifiers(settings).flag === 'flag-only'
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
 * Turns stored settings (Quiz Settings, or a Quiz Session's) into valid ones,
 * or null when they are unusable. Old settings are moved over:
 * - from before Modifiers existed, they may use the old Flag to Location Game
 *   Mode, which is now Name to Location with the Flag Modifier on Flag only;
 * - from before plan 13, they have Categories and "Individual states in USA"
 *   instead of a Selection (see `selectionFromCategories`).
 */
export function normalizeQuizSettings(stored: unknown): QuizSettings | null {
  if (!stored || typeof stored !== 'object') return null
  const { selection, categoryIds, usStates, gameModeId, modifiers } = stored as Record<string, unknown>
  let normalizedSelection: string[]
  if (Array.isArray(selection)) normalizedSelection = normalizeSelection(selection)
  else if (Array.isArray(categoryIds)) normalizedSelection = selectionFromCategories(categoryIds, usStates === true)
  else return null
  const normalized: QuizSettings = {
    selection: normalizedSelection,
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
