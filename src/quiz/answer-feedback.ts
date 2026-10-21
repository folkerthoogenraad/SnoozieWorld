import { createCountryLabel } from '../country/country-label.ts'
import { capitalName, countryName } from '../country/country-names.ts'
import type { Country } from '../country/country.ts'
import type { MapPoint, WorldMap } from '../map/world-map.ts'
import type { SoundPlayer } from '../sound/sound-player.ts'
import type { AnswerOutcome } from './quiz-run.ts'
import { activeModifiers, type QuizSettings } from './quiz-settings.ts'

// Wrong clicks while a Confirm is due before the Map Notice (with its Focus button) appears.
const CLICKS_BEFORE_NOTICE = 2

/**
 * What the Map and the Sound Effects do for an Answer, shared by Quiz Mode and
 * Practice Mode:
 * - wrong: the clicked Country flashes, and (unless the Hints Modifier is off)
 *   a Hint names it. After the last wrong Try the Prompt turns Missed (red)
 *   and pulses until Confirmed. If the player clicks elsewhere twice, a Map
 *   Notice names the Country and offers a Focus button that pans the Map to it.
 * - right, or Confirmed: with Flag only, a Hint names the Prompt, since the
 *   Prompt showed no name (feedback 10).
 * How a found Prompt is coloured is up to the Mode.
 */
export class AnswerFeedback {
  private readonly map: WorldMap
  private readonly sounds: SoundPlayer
  private readonly settings: QuizSettings
  /** Wrong clicks since the current Prompt was Missed. */
  private clicksWhileConfirmDue = 0
  /** The Missed Prompt the Map Notice names, while it is shown. */
  private noticePrompt: Country | null = null

  constructor(map: WorldMap, sounds: SoundPlayer, settings: QuizSettings) {
    this.map = map
    this.sounds = sounds
    this.settings = settings
  }

  /** Shows what an Answer did; `clicked` is the Country clicked at `point`. */
  show(outcome: AnswerOutcome, clicked: Country, point: MapPoint): void {
    const promptId = outcome.prompt.id
    switch (outcome.kind) {
      case 'correct':
      case 'half-correct':
        this.nameFoundPrompt(outcome.prompt, point)
        this.sounds.play(outcome.kind)
        break
      case 'try-again':
        this.map.flashWrong(clicked.id)
        this.showHint(clicked, point)
        this.sounds.play('wrong')
        break
      case 'missed':
        this.map.flashWrong(clicked.id)
        this.showHint(clicked, point)
        this.sounds.play('wrong')
        this.map.setCountryState(promptId, 'missed')
        this.map.setPulsingCountry(promptId)
        this.clicksWhileConfirmDue = 0
        break
      case 'confirm-needed':
        this.map.flashWrong(clicked.id)
        this.showHint(clicked, point)
        if (++this.clicksWhileConfirmDue === CLICKS_BEFORE_NOTICE) this.showNotice(outcome.prompt)
        break
      case 'confirmed':
        this.map.setPulsingCountry(null)
        this.hideNotice()
        this.nameFoundPrompt(outcome.prompt, point)
        this.sounds.play('next')
        break
    }
  }

  /** Removes the Map Notice and the Hint. */
  clear(): void {
    this.hideNotice()
    this.map.hideHint()
  }

  /** Names the Missed Prompt in the Map Notice again in the new Language, and hides the Hint (it soon goes anyway). */
  refreshNames(): void {
    if (this.noticePrompt) this.showNotice(this.noticePrompt)
    this.map.hideHint()
  }

  private showNotice(prompt: Country): void {
    this.noticePrompt = prompt
    this.map.setNotice({
      text: `${this.missedText(prompt)} Click the flashing country to continue.`,
      action: { label: 'Focus', onClick: () => this.map.showCountry(prompt.id) },
    })
  }

  private hideNotice(): void {
    this.noticePrompt = null
    this.map.setNotice(null)
  }

  /** "Missed: Chile.", or "Missed: Santiago is in Chile." when quizzing capitals. */
  private missedText(prompt: Country): string {
    const capital = capitalName(prompt)
    return this.settings.gameModeId === 'capital-to-location' && capital
      ? `Missed: ${capital} is in ${countryName(prompt)}.`
      : `Missed: ${countryName(prompt)}.`
  }

  /**
   * With Flag only, names the Prompt the player just found, so they learn which
   * Country the flag was even when they guessed. This tells nothing about the
   * next Prompt, so it ignores the Hints Modifier. Otherwise hides the Hint.
   */
  private nameFoundPrompt(prompt: Country, point: MapPoint): void {
    if (activeModifiers(this.settings).flag === 'flag-only') this.map.showHint(this.hintContent(prompt), point)
    else this.map.hideHint()
  }

  /** The Hint for a wrong Try: the clicked Country and its capital. */
  private showHint(country: Country, point: MapPoint): void {
    if (this.settings.modifiers.hints === 'no-hints') return
    this.map.showHint(this.hintContent(country), point)
  }

  private hintContent(country: Country): DocumentFragment {
    const content = document.createDocumentFragment()
    content.append(createCountryLabel(country))
    const capital = capitalName(country)
    // When quizzing capitals, "No capital" explains why it's never asked.
    if (capital || this.settings.gameModeId === 'capital-to-location') {
      const detail = document.createElement('span')
      detail.className = 'map__hint-detail'
      detail.textContent = capital ? `Capital: ${capital}` : 'No capital'
      content.append(detail)
    }
    return content
  }
}
