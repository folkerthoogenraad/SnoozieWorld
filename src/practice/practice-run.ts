import type { Country } from '../country/country.ts'
import type { AnswerOutcome } from '../quiz/quiz-run.ts'
import type { CountryLevel, SkillProgress, StreakRecord } from './practice-progress.ts'
import { streakReward, type StreakReward } from '../streak/streak.ts'

// Modifiers don't apply in Practice Mode, so a Prompt gets two Tries, as by default.
const TRIES_PER_PROMPT = 2

// Prompts until a Country is asked again, per Level (Leitner boxes, spaced in Prompts).
const INTERVALS = [3, 6, 12, 25, 50, 100]
export const MAX_LEVEL = INTERVALS.length - 1
/** From this Level on a Country counts as Learned. A new Country found on the first Try starts here. */
export const LEARNED_LEVEL = 3
// New Countries are only added while fewer than this many are still being learned (Level 0 or 1).
const WORKING_SET = 5
// Intervals vary by up to this fraction, so the order doesn't feel mechanical.
const JITTER = 0.25

/**
 * A Practice Run: asks the Countries of the Practice Set until the player
 * stops, using spaced repetition (a Leitner system, spaced in Prompts). As in
 * a Quiz Run, a Prompt allows two Tries, and after two wrong Tries it is
 * Missed and must be Confirmed by clicking it.
 *
 * Each Country the player has seen has a Level. Right on the first Try moves
 * it up one Level (a new Country straight to Learned: the player knew it
 * already); right on the second Try keeps it; Missed drops it to 0. The Level
 * sets how many Prompts pass before it is asked again (INTERVALS). Next is
 * always the most overdue Country; when none is due, a new one is added, but
 * only while the Working Set (Countries at Level 0–1) is small, so the player
 * learns a few at a time. Never the same Country twice in a row.
 *
 * The Streak counts Prompts found on the first Try in a row; any wrong Try
 * ends it. Each multiple of the Practice Set's size is a Full Round, and every
 * 10 a Streak Milestone (see streak.ts).
 *
 * Plays on the stored SkillProgress and StreakRecord, which it changes in place;
 * the Mode saves them. Knows nothing about the screen.
 */
export class PracticeRun {
  readonly countries: readonly Country[]
  /** The stored progress this run plays on (changed in place, to be saved by the Mode). */
  readonly skill: SkillProgress
  readonly streakRecord: StreakRecord
  private readonly ids: ReadonlySet<string>
  private current: Country
  private wrongTries = 0
  private confirmNeeded = false
  private promptCount = 1
  private lastReward: StreakReward | null = null

  /** Starts a Practice Run over the given Countries (at least one), continuing the stored progress. */
  static start(countries: readonly Country[], skill: SkillProgress, streak: StreakRecord): PracticeRun {
    return new PracticeRun(countries, skill, streak)
  }

  private constructor(countries: readonly Country[], skill: SkillProgress, streak: StreakRecord) {
    if (!countries.length) throw new Error('A Practice Run needs at least one Country')
    this.countries = countries
    this.ids = new Set(countries.map((country) => country.id))
    this.skill = skill
    this.streakRecord = streak
    this.current = this.pickNext(null)
  }

  /** The Country currently asked. */
  get prompt(): Country {
    return this.current
  }

  /** Counts the Prompts asked, so asking the same Country twice in a row still counts as a new Prompt. */
  get promptNumber(): number {
    return this.promptCount
  }

  /** Prompts found on the first Try in a row. Any wrong Try sets it back to 0. */
  get streak(): number {
    return this.streakRecord.current
  }

  get bestStreak(): number {
    return this.streakRecord.best
  }

  /** What the last Answer's Streak earned: a Full Round, a Milestone, or nothing. */
  get reward(): StreakReward | null {
    return this.lastReward
  }

  /** How many Countries of the Practice Set are Learned. */
  get learned(): number {
    return countLearned(this.skill, this.countries)
  }

  /** True after two wrong Tries, until the player clicks the Prompt. */
  get awaitingConfirm(): boolean {
    return this.confirmNeeded
  }

  includes(country: Country): boolean {
    return this.ids.has(country.id)
  }

  /** Handles a click on a Country of the Practice Set. */
  answer(country: Country): AnswerOutcome {
    const prompt = this.current
    const isPrompt = country.id === prompt.id
    this.lastReward = null

    if (this.confirmNeeded) {
      if (!isPrompt) return { kind: 'confirm-needed', prompt }
      this.next()
      return { kind: 'confirmed', prompt }
    }
    if (isPrompt) {
      const kind = this.wrongTries === 0 ? 'correct' : 'half-correct'
      const level = this.levelOf(prompt)?.level
      if (kind === 'correct') {
        this.extendStreak()
        this.schedule(prompt, level === undefined ? LEARNED_LEVEL : Math.min(level + 1, MAX_LEVEL))
      } else {
        this.schedule(prompt, level ?? 0)
      }
      this.next()
      return { kind, prompt }
    }
    this.streakRecord.current = 0
    this.wrongTries++
    if (this.wrongTries < TRIES_PER_PROMPT) return { kind: 'try-again', prompt }
    this.schedule(prompt, 0)
    this.confirmNeeded = true
    return { kind: 'missed', prompt }
  }

  private extendStreak(): void {
    const record = this.streakRecord
    record.current++
    record.best = Math.max(record.best, record.current)
    this.lastReward = streakReward(record.current, this.countries.length)
  }

  private next(): void {
    this.skill.clock++
    this.current = this.pickNext(this.current)
    this.wrongTries = 0
    this.confirmNeeded = false
    this.promptCount++
  }

  /** Sets a Country's Level, and when it is due again. */
  private schedule(country: Country, level: number): void {
    const interval = INTERVALS[level] * (1 + JITTER * (2 * Math.random() - 1))
    // At least 2, so another Country always comes in between.
    this.skill.levels[country.id] = { level, due: this.skill.clock + Math.max(2, Math.round(interval)) }
  }

  /** The most overdue Country; a new one when none is due and the Working Set has room; else the first due. */
  private pickNext(previous: Country | null): Country {
    const candidates = this.countries.filter((country) => country.id !== previous?.id)
    if (!candidates.length) return previous!
    const seen = candidates.filter((country) => this.levelOf(country))
    const unseen = candidates.filter((country) => !this.levelOf(country))
    const due = (country: Country) => this.levelOf(country)!.due
    const firstDue = seen.reduce<Country | null>((first, c) => (!first || due(c) < due(first) ? c : first), null)

    if (firstDue && due(firstDue) <= this.skill.clock) return firstDue
    const learning = this.countries.filter((country) => (this.levelOf(country)?.level ?? Infinity) <= 1).length
    if (unseen.length && (learning < WORKING_SET || !firstDue)) {
      return unseen[Math.floor(Math.random() * unseen.length)]
    }
    return firstDue!
  }

  private levelOf(country: Country): CountryLevel | undefined {
    return storedLevel(this.skill, country)
  }
}

/** How many of the Countries are Learned in this Skill. */
export function countLearned(skill: SkillProgress, countries: readonly Country[]): number {
  return countries.filter((country) => (storedLevel(skill, country)?.level ?? -1) >= LEARNED_LEVEL).length
}

/** The stored Level of a Country, if it was asked before (ignoring unreadable entries). */
function storedLevel(skill: SkillProgress, country: Country): CountryLevel | undefined {
  const entry = skill.levels[country.id]
  const valid = entry && Number.isInteger(entry.level) && entry.level >= 0 && entry.level <= MAX_LEVEL
  return valid && Number.isFinite(entry.due) ? entry : undefined
}
