import type { CountryInfoDialog } from '../country-info/country-info-dialog.ts'
import { countryInfo } from '../country/country-info.ts'
import { createCountryLabel } from '../country/country-label.ts'
import type { Country } from '../country/country.ts'
import type { MapPoint, WorldMap } from '../map/world-map.ts'
import type { Mode } from '../mode.ts'
import type { Navbar } from '../navbar/navbar.ts'
import type { SoundPlayer } from '../sound/sound-player.ts'
import type { QuizRun } from './quiz-run.ts'
import { saveQuizSession } from './quiz-session.ts'
import type { QuizSettings } from './quiz-settings.ts'
import { QuizStatus } from './quiz-status.ts'
import { Stopwatch } from './stopwatch.ts'

// Wrong clicks while a Confirm is due before the Map Notice (with its Focus button) appears.
const CLICKS_BEFORE_HINT = 2

/**
 * Plays a Quiz Run on the Map. Countries outside the Quiz Set are Excluded,
 * and the Navbar shows the Quiz Progress and Prompt. Clicking a Country answers:
 * - right on the first Try: the Country turns Correct (white);
 * - right on the second Try: Half Correct (yellow);
 * - wrong: the clicked Country flashes, and (unless the Hints Modifier is off)
 *   a Hint names it. After the last wrong Try the Prompt turns Missed (red)
 *   and pulses, and the player must click it (Confirm) before the next Prompt.
 *   If they click elsewhere twice, a Map Notice names the Country and offers a
 *   Focus button that pans the Map to it. Under Sudden Death a Missed Prompt
 *   ends the Quiz Run instead.
 * With Hints on, the player can also click the Prompt in the Navbar for its
 * Country Info; the Session Time stops while that is open. With Hints off,
 * clicking it only says so. In Capital to Location the Prompt is not
 * clickable: its Country Info would name the Country.
 * Each outcome also gets a Quiz Progress animation and a Sound Effect.
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
  private readonly sounds: SoundPlayer
  private readonly countryInfo: CountryInfoDialog
  private readonly status: QuizStatus
  private readonly stopwatch: Stopwatch
  private stopListening: (() => void)[] = []
  private paused = false
  /** Wrong clicks since the current Prompt was Missed. */
  private clicksWhileConfirmDue = 0

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
    this.sounds = options.sounds
    this.countryInfo = options.countryInfo
    const { gameModeId, modifiers } = options.settings
    this.status = new QuizStatus(
      options.settings,
      gameModeId === 'capital-to-location'
        ? null
        : modifiers.hints === 'hints'
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
    // Show the results of a restored Quiz Run.
    for (const record of this.run.results) this.map.setCountryState(record.country.id, record.result)
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
    this.map.clearCountryStates()
    this.map.setHighlightedCountry(null)
    this.map.setNotice(null)
    this.map.hideHint()
    this.navbar.setStatus(null)
  }

  private answer(country: Country | null, point: MapPoint): void {
    // Clicks on the Ocean or on Excluded Countries are not Answers.
    if (!country || !this.run.includes(country) || this.run.finished) return

    const outcome = this.run.answer(country)
    const promptId = outcome.prompt.id
    switch (outcome.kind) {
      case 'correct':
      case 'half-correct':
        this.map.setCountryState(promptId, outcome.kind)
        this.map.hideHint()
        this.sounds.play(outcome.kind)
        break
      case 'try-again':
        this.map.flashWrong(country.id)
        this.showHint(country, point)
        this.sounds.play('wrong')
        break
      case 'missed':
        this.map.flashWrong(country.id)
        this.showHint(country, point)
        this.sounds.play('wrong')
        this.map.setCountryState(promptId, 'missed')
        this.map.setPulsingCountry(promptId)
        this.clicksWhileConfirmDue = 0
        break
      case 'confirm-needed':
        this.map.flashWrong(country.id)
        this.showHint(country, point)
        if (++this.clicksWhileConfirmDue === CLICKS_BEFORE_HINT) {
          this.map.setNotice({
            text: `${this.missedText(outcome.prompt)} Click the flashing country to continue.`,
            action: { label: 'Focus', onClick: () => this.map.showCountry(promptId) },
          })
        }
        break
      case 'confirmed':
        this.map.setPulsingCountry(null)
        this.map.setNotice(null)
        this.map.hideHint()
        this.sounds.play('next')
        break
    }
    this.status.update(this.run)
    this.status.animate(outcome)
    if (this.run.finished) {
      this.stopwatch.pause()
      this.onFinished(this.run, this.stopwatch.elapsedMs)
    } else {
      this.save()
    }
  }

  /** "Missed: Chile.", or "Missed: Santiago is in Chile." when quizzing capitals. */
  private missedText(prompt: Country): string {
    const capital = countryInfo(prompt)?.capital
    return this.settings.gameModeId === 'capital-to-location' && capital
      ? `Missed: ${capital} is in ${prompt.name}.`
      : `Missed: ${prompt.name}.`
  }

  /** The Hint for a wrong Try: the clicked Country and its capital. */
  private showHint(country: Country, point: MapPoint): void {
    if (this.settings.modifiers.hints === 'no-hints') return
    const content = document.createDocumentFragment()
    content.append(createCountryLabel(country))
    const capital = countryInfo(country)?.capital
    // When quizzing capitals, "No capital" explains why it's never asked.
    if (capital || this.settings.gameModeId === 'capital-to-location') {
      const detail = document.createElement('span')
      detail.className = 'map__hint-detail'
      detail.textContent = capital ? `Capital: ${capital}` : 'No capital'
      content.append(detail)
    }
    this.map.showHint(content, point)
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
