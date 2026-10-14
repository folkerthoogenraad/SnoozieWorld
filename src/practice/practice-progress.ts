import { activeModifiers, type QuizSettings } from '../quiz/quiz-settings.ts'
import { selectionKey, selectionKeyFromCategories } from '../quiz/selection.ts'

/** How well the player knows one Country in one Skill (see PracticeRun). */
export interface CountryLevel {
  /** 0 (just missed) up to MAX_LEVEL. */
  level: number
  /** The Skill Clock at which it is due to be asked again. */
  due: number
}

/**
 * Practice Progress for one Skill: what is asked and how, so the Levels carry
 * over between Practice Sets (Europe's Countries keep their Level in Europe +
 * Asia). Countries never asked have no entry.
 */
export interface SkillProgress {
  /** Prompts asked in this Skill so far; Levels are spaced in Prompts, not in time. */
  clock: number
  levels: Record<string, CountryLevel>
}

/** The live and the best Streak of one Practice Set. */
export interface StreakRecord {
  current: number
  best: number
}

/** Version 2 (plan 13) has Selection keys for the Streaks; version 1 had Category keys. */
interface StoredPractice {
  version: 2
  skills: Record<string, SkillProgress>
  streaks: Record<string, StreakRecord>
}

const STORAGE_KEY = 'snoozieworld.practice'

/**
 * The Skill of practice settings: the Game Mode, and for Name to Location the
 * Flag Modifier (finding a Country by its flag is a different thing to learn).
 */
export function skillKey(settings: QuizSettings): string {
  const flag = activeModifiers(settings).flag
  return flag ? `${settings.gameModeId}|${flag}` : settings.gameModeId
}

/**
 * The Practice Set of practice settings: the Skill plus the Selection, e.g.
 * `name-to-location|flag-only|europe` (see `selectionKey`).
 */
export function practiceSetKey(settings: QuizSettings): string {
  return `${skillKey(settings)}|${selectionKey(settings.selection)}`
}

export function loadSkillProgress(settings: QuizSettings): SkillProgress {
  const skill = load().skills[skillKey(settings)]
  const valid = skill && Number.isFinite(skill.clock) && skill.levels && typeof skill.levels === 'object'
  return valid ? skill : { clock: 0, levels: {} }
}

export function loadStreak(settings: QuizSettings): StreakRecord {
  const streak = load().streaks[practiceSetKey(settings)]
  const count = (value: unknown) => (Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0)
  return { current: count(streak?.current), best: count(streak?.best) }
}

export function savePracticeProgress(settings: QuizSettings, skill: SkillProgress, streak: StreakRecord): void {
  const stored = load()
  stored.skills[skillKey(settings)] = skill
  stored.streaks[practiceSetKey(settings)] = streak
  save(stored)
}

/**
 * Forgets the Levels of the given Countries in this Skill, and the live Streak
 * of this Practice Set. The best Streak stays.
 */
export function resetPracticeProgress(settings: QuizSettings, countryIds: readonly string[]): void {
  const stored = load()
  const skill = stored.skills[skillKey(settings)]
  if (skill) for (const id of countryIds) delete skill.levels[id]
  const streak = stored.streaks[practiceSetKey(settings)]
  if (streak) streak.current = 0
  save(stored)
}

const OLD_US_STATES = '|us-states'

/**
 * Version 1 to 2: the Streaks' Category keys become Selection keys, as the
 * Leaderboard's do (see `selectionKeyFromCategories`): `<skill>|<categories>`,
 * plus `|us-states` with "Individual states in USA". The Levels belong to the
 * Skill, so they stay. Runs once: the result is saved as version 2 with the next Try.
 */
function moveCategoryKeys(streaks: Record<string, StreakRecord>): Record<string, StreakRecord> {
  const moved: Record<string, StreakRecord> = {}
  for (const [key, streak] of Object.entries(streaks)) {
    const usStates = key.endsWith(OLD_US_STATES)
    const rest = usStates ? key.slice(0, -OLD_US_STATES.length) : key
    const split = rest.lastIndexOf('|')
    const selection = selectionKeyFromCategories(rest.slice(split + 1), usStates)
    moved[selection === null ? key : `${rest.slice(0, split)}|${selection}`] = streak
  }
  return moved
}

function load(): StoredPractice {
  let stored: Partial<Omit<StoredPractice, 'version'>> & { version?: unknown } = {}
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {
    // Unreadable: start over.
  }
  const { version, skills, streaks } = stored
  if (skills && streaks && version === 2) return { version, skills, streaks }
  if (skills && streaks && version === 1) return { version: 2, skills, streaks: moveCategoryKeys(streaks) }
  return { version: 2, skills: {}, streaks: {} }
}

function save(stored: StoredPractice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage unavailable: the progress only lasts while the page is open.
  }
}
