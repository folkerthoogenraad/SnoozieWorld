import type { CountryInfoDialog } from '../country-info/country-info-dialog.ts'
import type { Country } from '../country/country.ts'
import type { CountryState, MapPoint, WorldMap } from '../map/world-map.ts'
import type { Mode } from '../mode.ts'
import type { Navbar } from '../navbar/navbar.ts'
import { AnswerFeedback } from '../quiz/answer-feedback.ts'
import { promptInfoGivesAnswer, type QuizSettings } from '../quiz/quiz-settings.ts'
import type { SoundPlayer } from '../sound/sound-player.ts'
import { savePracticeProgress } from './practice-progress.ts'
import type { PracticeRun } from './practice-run.ts'
import { PracticeStatus } from './practice-status.ts'

// How long a found Prompt keeps its result colour before it turns back to land (ms).
const RESULT_DURATION = 1000

/**
 * Practice Mode: plays a Practice Run on the Map, to learn rather than to
 * score. Countries outside the Practice Set are Excluded, and the Navbar shows
 * the Streak and the Prompt. Answers work as in Quiz Mode (see AnswerFeedback),
 * but the Map keeps no results: a found Prompt shows its colour briefly, a
 * Missed one until it is Confirmed, and then it is land again, so every
 * Prompt starts from a clean Map.
 * A Streak that completes a Full Round plays a fanfare, every 10 in a row a chime.
 * Clicking the Prompt opens its Country Info, unless that would give the
 * answer away (Capital to Location, Flag only). The Practice Progress (Levels
 * and Streaks) is saved after every Try, so leaving and coming back later
 * continues it. There is no Pause Screen, Leaderboard or Quiz Session.
 */
export class PracticeMode implements Mode {
  private readonly map: WorldMap
  private readonly navbar: Navbar
  private readonly settings: QuizSettings
  private readonly run: PracticeRun
  private readonly allCountries: readonly Country[]
  private readonly sounds: SoundPlayer
  private readonly feedback: AnswerFeedback
  private readonly status: PracticeStatus
  private stopListening: (() => void)[] = []
  /** The found Prompt still showing its result colour. */
  private shownResult: { countryId: string; timeout: number } | null = null

  constructor(options: {
    map: WorldMap
    navbar: Navbar
    /** Already reduced by practiceSettings. */
    settings: QuizSettings
    run: PracticeRun
    allCountries: readonly Country[]
    sounds: SoundPlayer
    countryInfo: CountryInfoDialog
  }) {
    this.map = options.map
    this.navbar = options.navbar
    this.settings = options.settings
    this.run = options.run
    this.allCountries = options.allCountries
    this.sounds = options.sounds
    this.feedback = new AnswerFeedback(options.map, options.sounds, options.settings)
    this.status = new PracticeStatus(
      options.settings,
      promptInfoGivesAnswer(options.settings) ? null : (country) => options.countryInfo.open(country),
    )
  }

  start(): void {
    this.map.clearCountryStates()
    this.map.setStatesShown(this.settings.usStates)
    for (const country of this.allCountries) {
      if (!this.run.includes(country)) this.map.setCountryState(country.id, 'excluded')
    }
    this.stopListening = [
      this.map.onCountryHover((country) =>
        this.map.setHighlightedCountry(country && this.run.includes(country) ? country.id : null),
      ),
      this.map.onCountryClick((country, point) => this.answer(country, point)),
    ]
    this.navbar.setStatus(this.status.element)
    this.status.update(this.run)
  }

  stop(): void {
    this.stopListening.forEach((stop) => stop())
    this.stopListening = []
    this.clearResult()
    this.map.clearCountryStates()
    this.map.setHighlightedCountry(null)
    this.map.setStatesShown(false)
    this.feedback.clear()
    this.navbar.setStatus(null)
  }

  private answer(country: Country | null, point: MapPoint): void {
    // Clicks on the Ocean or on Excluded Countries are not Answers.
    if (!country || !this.run.includes(country)) return

    // The previous result colour goes first, so its timeout can't clear a newer state.
    this.clearResult()
    const outcome = this.run.answer(country)
    this.feedback.show(outcome, country, point)
    if (outcome.kind === 'correct' || outcome.kind === 'half-correct') {
      this.showResult(outcome.prompt.id, outcome.kind)
    } else if (outcome.kind === 'confirmed') {
      this.map.setCountryState(outcome.prompt.id, null)
    }
    if (this.run.reward) this.sounds.play(this.run.reward)
    this.status.update(this.run)
    this.status.animate(outcome, this.run)
    savePracticeProgress(this.settings, this.run.skill, this.run.streakRecord)
  }

  /** Colours a found Prompt for a moment. */
  private showResult(countryId: string, state: CountryState): void {
    this.map.setCountryState(countryId, state)
    this.shownResult = { countryId, timeout: window.setTimeout(() => this.clearResult(), RESULT_DURATION) }
  }

  private clearResult(): void {
    if (!this.shownResult) return
    window.clearTimeout(this.shownResult.timeout)
    this.map.setCountryState(this.shownResult.countryId, null)
    this.shownResult = null
  }
}
