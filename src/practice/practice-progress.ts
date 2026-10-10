import { activeModifiers, type QuizSettings } from '../quiz/quiz-settings.ts'

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

interface StoredPractice {
  version: 1
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

/** The Practice Set of practice settings: the Skill plus the Categories, e.g. `name-to-location|flag-only|europe`. */
export function practiceSetKey(settings: QuizSettings): string {
  const categories = [...settings.categoryIds].sort().join(',')
  return `${skillKey(settings)}|${categories}${settings.usStates ? '|us-states' : ''}`
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

function load(): StoredPractice {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredPractice | null
    if (stored?.version === 1 && stored.skills && stored.streaks) return stored
  } catch {
    // Unreadable: start over.
  }
  return { version: 1, skills: {}, streaks: {} }
}

function save(stored: StoredPractice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage unavailable: the progress only lasts while the page is open.
  }
}
