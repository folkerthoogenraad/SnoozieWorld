import type { Country } from '../country/country.ts'
import { streakReward, type StreakReward } from '../streak/streak.ts'

/** How a Prompt ended: found on the first Try, on the second Try, or not at all. */
export type PromptResult = 'correct' | 'half-correct' | 'missed'

/** What an Answer did. */
export type AnswerOutcome =
  /** Found the Prompt; the next Prompt is up. */
  | { kind: 'correct' | 'half-correct'; prompt: Country }
  /** Wrong on the first Try; the same Prompt is asked again. */
  | { kind: 'try-again'; prompt: Country }
  /**
   * Wrong on the last Try; the player must now Confirm the Prompt by clicking it.
   * Under Sudden Death this fails the Quiz Run instead.
   */
  | { kind: 'missed'; prompt: Country }
  /** Clicked the Missed Prompt; the next Prompt is up. */
  | { kind: 'confirmed'; prompt: Country }
  /** Clicked another Country while a Confirm is due; nothing changes. */
  | { kind: 'confirm-needed'; prompt: Country }

export interface PromptRecord {
  country: Country
  result: PromptResult
}

/** How a Quiz Run is played, set by the Guesses Modifier. */
export interface QuizRules {
  /** 2 normally, 1 with Single Guess or Sudden Death. */
  triesPerPrompt: number
  /** A Missed Prompt fails the whole Quiz Run. */
  suddenDeath: boolean
}

const DEFAULT_RULES: QuizRules = { triesPerPrompt: 2, suddenDeath: false }

/** Everything needed to restore a Quiz Run, as plain JSON (see Quiz Session). */
export interface QuizRunSnapshot {
  /** Country ids in the order they are asked. */
  quizSetIds: string[]
  records: { countryId: string; result: PromptResult }[]
  index: number
  wrongTries: number
  confirmNeeded: boolean
  /** The Quiz Streak carried over from earlier perfect Quiz Runs; missing in older sessions. */
  startStreak?: number
}

const PROMPT_RESULTS: readonly PromptResult[] = ['correct', 'half-correct', 'missed']

/**
 * One play-through of a Quiz: asks every Country of the Quiz Set once, in
 * random order. Each Prompt allows two Tries (one with Single Guess or Sudden
 * Death); after the last wrong Try the Prompt is Missed and must be Confirmed
 * by clicking it before moving on. Under Sudden Death a Missed Prompt fails
 * the Quiz Run: it is finished right away.
 * The Quiz Streak counts Prompts found on the first Try in a row; a Quiz Run
 * can start with the Streak of earlier perfect ones (a multiple of the Quiz
 * Set's size). It gives a Milestone every 10 and a Full Round when perfect.
 * Knows nothing about the screen.
 */
export class QuizRun {
  /** The shuffled Countries to ask. */
  readonly quizSet: readonly Country[]
  readonly rules: QuizRules
  private readonly quizSetIds: ReadonlySet<string>
  private index = 0
  private wrongTries = 0
  private confirmNeeded = false
  private hasFailed = false
  private readonly records: PromptRecord[] = []
  private readonly startStreak: number
  private lastReward: StreakReward | null = null

  /** Starts a new Quiz Run over the given Countries, in random order, continuing a Quiz Streak. */
  static start(countries: readonly Country[], rules: QuizRules = DEFAULT_RULES, startStreak = 0): QuizRun {
    return new QuizRun(shuffle(countries), rules, startStreak)
  }

  /** Restores a saved Quiz Run, or returns null when the snapshot doesn't fit the Countries (e.g. new map data). */
  static restore(
    snapshot: QuizRunSnapshot,
    countries: ReadonlyMap<string, Country>,
    rules: QuizRules = DEFAULT_RULES,
  ): QuizRun | null {
    const quizSet = snapshot.quizSetIds.map((id) => countries.get(id))
    if (!quizSet.length || quizSet.some((country) => !country)) return null
    const startStreak = snapshot.startStreak ?? 0
    if (!Number.isInteger(startStreak) || startStreak < 0) return null
    const run = new QuizRun(quizSet as Country[], rules, startStreak)
    const { records, index, wrongTries, confirmNeeded } = snapshot
    const expectedRecords = index + (confirmNeeded ? 1 : 0)
    if (!Number.isInteger(index) || index < 0 || index >= quizSet.length) return null
    // While a Confirm is due, all Tries are used up.
    const tries = rules.triesPerPrompt
    const validTries = confirmNeeded ? wrongTries === tries : wrongTries >= 0 && wrongTries < tries
    if (records.length !== expectedRecords || !validTries) return null
    for (const [i, record] of records.entries()) {
      if (record.countryId !== snapshot.quizSetIds[i] || !PROMPT_RESULTS.includes(record.result)) return null
      run.records.push({ country: quizSet[i]!, result: record.result })
    }
    run.index = index
    run.wrongTries = wrongTries
    run.confirmNeeded = confirmNeeded
    return run
  }

  private constructor(quizSet: readonly Country[], rules: QuizRules, startStreak: number) {
    this.quizSet = quizSet
    this.rules = rules
    this.startStreak = startStreak
    this.quizSetIds = new Set(quizSet.map((country) => country.id))
  }

  snapshot(): QuizRunSnapshot {
    return {
      quizSetIds: this.quizSet.map((country) => country.id),
      records: this.records.map((record) => ({ countryId: record.country.id, result: record.result })),
      index: this.index,
      wrongTries: this.wrongTries,
      confirmNeeded: this.confirmNeeded,
      startStreak: this.startStreak,
    }
  }

  /** The Country currently asked, or null when the Quiz Run is finished. */
  get prompt(): Country | null {
    return this.finished ? null : (this.quizSet[this.index] ?? null)
  }

  /** True when every Prompt was asked, or when the Quiz Run failed. */
  get finished(): boolean {
    return this.hasFailed || this.index >= this.quizSet.length
  }

  /** True when a Missed Prompt ended the Quiz Run early (Sudden Death). */
  get failed(): boolean {
    return this.hasFailed
  }

  /** True after two wrong Tries, until the player clicks the Prompt. */
  get awaitingConfirm(): boolean {
    return this.confirmNeeded
  }

  /** 1-based number of the current Prompt; stays at the total once finished. */
  get questionNumber(): number {
    return Math.min(this.index + 1, this.quizSet.length)
  }

  get total(): number {
    return this.quizSet.length
  }

  /** The finished Prompts, in the order they were asked. */
  get results(): readonly PromptRecord[] {
    return this.records
  }

  /**
   * The Quiz Streak: Prompts found on the first Try in a row, plus the carried
   * Streak while every Prompt so far was Correct. A wrong Try ends it.
   */
  get streak(): number {
    if (this.wrongTries > 0) return 0
    const trailing = this.records.length - 1 - this.records.findLastIndex((record) => record.result !== 'correct')
    return trailing === this.records.length ? this.startStreak + trailing : trailing
  }

  /** True when every Prompt was found on the first Try. */
  get perfect(): boolean {
    return this.finished && !this.hasFailed && this.count('correct') === this.quizSet.length
  }

  /** What the last Answer's Streak earned: a Full Round (a perfect Quiz Run), a Milestone, or nothing. */
  get reward(): StreakReward | null {
    return this.lastReward
  }

  count(result: PromptResult): number {
    return this.records.filter((record) => record.result === result).length
  }

  /**
   * The Score over the Prompts finished so far: 0–100, where a Half Correct
   * Prompt counts for half. Null before the first Prompt is finished.
   */
  get runningScore(): number | null {
    return this.records.length ? scoreOf(this.records, this.records.length) : null
  }

  /** The Score over the whole Quiz Set: 0–100. */
  get finalScore(): number {
    return scoreOf(this.records, this.quizSet.length)
  }

  includes(country: Country): boolean {
    return this.quizSetIds.has(country.id)
  }

  /** The Prompt Result of a Country already asked, or null. */
  resultOf(country: Country): PromptResult | null {
    return this.records.find((record) => record.country.id === country.id)?.result ?? null
  }

  /** Handles a click on a Country of the Quiz Set. */
  answer(country: Country): AnswerOutcome {
    const prompt = this.prompt
    if (!prompt) throw new Error('The Quiz Run is already finished')
    const isPrompt = country.id === prompt.id
    this.lastReward = null

    if (this.confirmNeeded) {
      if (!isPrompt) return { kind: 'confirm-needed', prompt }
      this.next()
      return { kind: 'confirmed', prompt }
    }
    if (isPrompt) {
      const result = this.wrongTries === 0 ? 'correct' : 'half-correct'
      this.records.push({ country: prompt, result })
      this.next()
      if (result === 'correct') this.lastReward = streakReward(this.streak, this.quizSet.length)
      return { kind: result, prompt }
    }
    this.wrongTries++
    if (this.wrongTries < this.rules.triesPerPrompt) return { kind: 'try-again', prompt }
    this.records.push({ country: prompt, result: 'missed' })
    if (this.rules.suddenDeath) this.hasFailed = true
    else this.confirmNeeded = true
    return { kind: 'missed', prompt }
  }

  private next(): void {
    this.index++
    this.wrongTries = 0
    this.confirmNeeded = false
  }
}

function scoreOf(records: readonly PromptRecord[], outOf: number): number {
  const points = records.reduce(
    (sum, record) => sum + (record.result === 'correct' ? 1 : record.result === 'half-correct' ? 0.5 : 0),
    0,
  )
  return outOf ? (points / outOf) * 100 : 0
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Formats a 0–100 Score for display, e.g. "87%". Rounds down, so only a perfect Quiz Run shows 100%. */
export function formatScore(score: number): string {
  return `${Math.floor(score)}%`
}
