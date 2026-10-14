import type { CountryInfoDialog } from '../country-info/country-info-dialog.ts'
import type { Country } from '../country/country.ts'
import type { MapPoint, WorldMap } from '../map/world-map.ts'
import type { Mode } from '../mode.ts'
import type { Navbar } from '../navbar/navbar.ts'
import type { SoundPlayer } from '../sound/sound-player.ts'
import { AnswerFeedback } from './answer-feedback.ts'
import { FadingResult } from './fading-result.ts'
import type { QuizRun } from './quiz-run.ts'
import { saveQuizSession } from './quiz-session.ts'
import { activeModifiers, promptInfoGivesAnswer, type QuizSettings } from './quiz-settings.ts'
import { QuizStatus } from './quiz-status.ts'
import { saveQuizStreak } from './quiz-streak.ts'
import { includesUsStates } from './selection.ts'
import { Stopwatch } from './stopwatch.ts'

/**
 * Plays a Quiz Run on the Map. Countries outside the Quiz Set are Excluded,
 * and the Navbar shows the Quiz Progress and Prompt. Clicking a Country answers:
 * - right on the first Try: the Country turns Correct (white);
 * - right on the second Try: Half Correct (yellow);
 * - wrong: the clicked Country flashes. After the last wrong Try the Prompt
 *   turns Missed (red) and pulses, and the player must click it (Confirm)
 *   before the next Prompt. Under Sudden Death a Missed Prompt ends the Quiz
 *   Run instead.
 * With the Results Modifier on Hidden, a found Prompt only shows its colour
 * for a moment, and a Missed one until it is Confirmed; then it is land again,
 * also when the Quiz Run is finished (feedback 12).
 * Hints, the Map Notice and Sound Effects come from AnswerFeedback.
 * With Hints on, the player can also click the Prompt in the Navbar for its
 * Country Info; the Session Time stops while that is open. With Hints off,
 * clicking it only says so. In Capital to Location and with Flag only the
 * Prompt is not clickable: its Country Info would give the answer away.
 * Each outcome also gets a Quiz Progress animation. The Quiz Streak plays a
 * chime every 10 and a fanfare for a perfect Quiz Run, which carries the
 * Streak over to the next Quiz Run with the same Leaderboard; a wrong Try ends it.
 *
 * Keeps the Session Time (paused while the Pause Screen is open or the page is
 * hidden) and saves the Quiz Session after every Try and when the page is left.
 * Can start from a restored Quiz Run: the Map then shows the earlier results.
 */
export class QuizMode implements Mode {
  readonly settings: QuizSettings
  readonly run: QuizRun
  private readonly map: WorldMap
  private readonly navbar: Navbar
  private readonly allCountries: readonly Country[]
  private readonly onFinished: (run: QuizRun, elapsedMs: number) => void
  private readonly countryInfo: CountryInfoDialog
  private readonly sounds: SoundPlayer
  private readonly feedback: AnswerFeedback
  private readonly fadingResult: FadingResult
  private readonly resultsHidden: boolean
  private readonly status: QuizStatus
  private readonly stopwatch: Stopwatch
  private stopListening: (() => void)[] = []
  private paused = false

  constructor(options: {
    map: WorldMap
    navbar: Navbar
    settings: QuizSettings
    run: QuizRun
    /** Session Time already spent, when continuing a restored Quiz Run. */
    elapsedMs?: number
    allCountries: readonly Country[]
    sounds: SoundPlayer
    countryInfo: CountryInfoDialog
    onFinished: (run: QuizRun, elapsedMs: number) => void
  }) {
    this.map = options.map
    this.navbar = options.navbar
    this.settings = options.settings
    this.run = options.run
    this.allCountries = options.allCountries
    this.onFinished = options.onFinished
    this.countryInfo = options.countryInfo
    this.sounds = options.sounds
    this.feedback = new AnswerFeedback(options.map, options.sounds, options.settings)
    this.fadingResult = new FadingResult(options.map)
    this.resultsHidden = activeModifiers(options.settings).results === 'hidden'
    this.status = new QuizStatus(
      options.settings,
      promptInfoGivesAnswer(options.settings)
        ? null
        : options.settings.modifiers.hints === 'hints'
          ? (country) => this.showCountryInfo(country)
          : () => this.status.showPromptNotice('Hints are disabled'),
    )
    this.stopwatch = new Stopwatch(options.elapsedMs)
  }

  /** Session Time so far. */
  get elapsedMs(): number {
    return this.stopwatch.elapsedMs
  }

  /** Stops the clock (Pause Screen open) and saves the Quiz Session. */
  pause(): void {
    this.paused = true
    this.stopwatch.pause()
    this.save()
  }

  resume(): void {
    this.paused = false
    if (document.visibilityState === 'visible') this.stopwatch.start()
  }

  start(): void {
    this.map.clearCountryStates()
    this.map.setStatesShown(includesUsStates(this.settings.selection))
    for (const country of this.allCountries) {
      if (!this.run.includes(country)) this.map.setCountryState(country.id, 'excluded')
    }
    this.stopListening = [
      this.map.onCountryHover((country) =>
        this.map.setHighlightedCountry(country && this.run.includes(country) ? country.id : null),
      ),
      this.map.onCountryClick((country, point) => this.answer(country, point)),
      listen(document, 'visibilitychange', () => this.onVisibilityChange()),
      // Also fires on reload, e.g. when Vite reloads the page after a code change.
      listen(window, 'pagehide', () => this.save()),
    ]
    // Show the results of a restored Quiz Run. With Hidden only a Missed Prompt still to be Confirmed,
    // which is the only record of the current Prompt.
    for (const record of this.run.results) {
      if (!this.resultsHidden || record.country.id === this.run.prompt?.id) {
        this.map.setCountryState(record.country.id, record.result)
      }
    }
    if (this.run.awaitingConfirm && this.run.prompt) this.map.setPulsingCountry(this.run.prompt.id)

    this.navbar.setStatus(this.status.element)
    this.status.update(this.run)
    this.resume()
    this.save()
  }

  stop(): void {
    this.stopwatch.pause()
    this.stopListening.forEach((stop) => stop())
    this.stopListening = []
    this.fadingResult.clear()
    this.map.fadeOutCountryStates()
    this.map.setHighlightedCountry(null)
    this.map.setStatesShown(false)
    this.feedback.clear()
    this.navbar.setStatus(null)
  }

  private answer(country: Country | null, point: MapPoint): void {
    // Clicks on the Ocean or on Excluded Countries are not Answers.
    if (!country || !this.run.includes(country) || this.run.finished) return

    // The previous result colour goes first, so its timeout can't clear a newer state.
    this.fadingResult.clear()
    const outcome = this.run.answer(country)
    this.feedback.show(outcome, country, point)
    if (outcome.kind === 'correct' || outcome.kind === 'half-correct') {
      if (this.resultsHidden) this.fadingResult.show(outcome.prompt.id, outcome.kind)
      else this.map.setCountryState(outcome.prompt.id, outcome.kind)
    } else if (outcome.kind === 'confirmed' && this.resultsHidden) {
      this.map.setCountryState(outcome.prompt.id, null)
    }
    if (this.run.reward) this.sounds.play(this.run.reward)
    this.status.update(this.run)
    this.status.animate(outcome, this.run)
    if (outcome.kind === 'try-again' || outcome.kind === 'missed') saveQuizStreak(this.settings, 0)
    if (this.run.finished) {
      saveQuizStreak(this.settings, this.run.perfect ? this.run.streak : 0)
      this.stopwatch.pause()
      this.onFinished(this.run, this.stopwatch.elapsedMs)
    } else {
      this.save()
    }
  }

  /** Country Info for the Prompt (Hints on). The Session Time stops while it is open. */
  private showCountryInfo(country: Country): void {
    this.stopwatch.pause()
    this.countryInfo.open(country, () => {
      if (!this.paused && !this.run.finished && document.visibilityState === 'visible') this.stopwatch.start()
    })
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.stopwatch.pause()
      this.save()
    } else if (!this.paused && !this.run.finished) {
      this.stopwatch.start()
    }
  }

  private save(): void {
    if (!this.run.finished) saveQuizSession({ settings: this.settings, run: this.run, elapsedMs: this.elapsedMs })
  }
}

function listen(target: EventTarget, type: string, listener: () => void): () => void {
  target.addEventListener(type, listener)
  return () => target.removeEventListener(type, listener)
}
