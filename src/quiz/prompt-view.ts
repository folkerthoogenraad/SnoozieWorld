import { createCountryInfoButton } from '../country-info/country-info-button.ts'
import { createCountryLabel, createFlag } from '../country/country-label.ts'
import { capitalPrompt, countryName } from '../country/country-names.ts'
import type { Country } from '../country/country.ts'
import type { QuizSettings } from './quiz-settings.ts'
import './quiz-status.css'

/**
 * The Prompt in the Navbar, shared by Quiz Mode and Practice Mode. What it
 * shows is set by the Game Mode and the Flag Modifier. With `onPromptClick`
 * it is a button (opening Country Info, or saying that Hints are disabled).
 * A new Prompt fades in; a wrong Try shakes it.
 */
export class PromptView {
  readonly element: HTMLElement
  private readonly settings: QuizSettings
  private readonly onPromptClick: ((country: Country) => void) | null
  private shownKey: string | null = null
  private shownPrompt: Country | null = null

  constructor(settings: QuizSettings, onPromptClick: ((country: Country) => void) | null = null) {
    this.settings = settings
    this.onPromptClick = onPromptClick
    this.element = document.createElement('div')
    this.element.className = 'quiz-status__prompt'
  }

  /**
   * Shows a Prompt, or "Finished!" for null. Nothing happens while the same
   * `key` is shown; pass a new one to ask the same Country again.
   */
  show(prompt: Country | null, key = prompt?.id ?? null): void {
    if (key === this.shownKey) return
    this.shownKey = key
    this.shownPrompt = prompt
    if (!prompt) {
      this.element.textContent = 'Finished!'
      return
    }
    this.render(prompt)
    // A shake from the previous Prompt's wrong Try would override the fade-in.
    this.element.classList.remove('quiz-status__prompt--shake')
    restartAnimation(this.element, 'quiz-status__prompt--new')
  }

  /** Shows the Prompt again, without fading in: its name or capital in the new Language. */
  refreshNames(): void {
    if (this.shownPrompt) this.render(this.shownPrompt)
  }

  /** A wrong Try. */
  shake(): void {
    restartAnimation(this.element, 'quiz-status__prompt--shake')
  }

  /** A short message popping up below the Prompt, e.g. "Hints are disabled". */
  showNotice(text: string): void {
    this.element.querySelector('.quiz-status__prompt-notice')?.remove()
    const notice = document.createElement('span')
    notice.className = 'quiz-status__prompt-notice'
    notice.setAttribute('role', 'status')
    notice.textContent = text
    notice.addEventListener('animationend', (event) => {
      if (event.animationName === 'quiz-status-notice-out') notice.remove()
    })
    this.element.append(notice)
  }

  private render(prompt: Country): void {
    const content = this.createContent(prompt)
    const onClick = this.onPromptClick
    this.element.replaceChildren(
      onClick ? createCountryInfoButton(content, 'More about this country', () => onClick(prompt)) : content,
    )
  }

  private createContent(country: Country): HTMLElement {
    if (this.settings.gameModeId === 'capital-to-location') {
      const capital = document.createElement('span')
      capital.className = 'quiz-status__capital'
      capital.textContent = capitalPrompt(country) ?? countryName(country)
      return capital
    }
    switch (this.settings.modifiers.flag) {
      case 'flag-only':
        return createFlag(country, 'large')
      case 'name-only': {
        const label = createCountryLabel(country)
        label.querySelector('.flag')?.remove()
        return label
      }
      default:
        return createCountryLabel(country)
    }
  }
}

/** Adds an animation class, restarting the animation if it is still running, and removes it when done. */
export function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true })
}
