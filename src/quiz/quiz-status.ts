import { createCountryInfoButton } from '../country-info/country-info-button.ts'
import { capitalPrompt } from '../country/country-info.ts'
import { createCountryLabel, createFlag } from '../country/country-label.ts'
import type { Country } from '../country/country.ts'
import { formatScore, type AnswerOutcome, type QuizRun } from './quiz-run.ts'
import { quizRules, type QuizSettings } from './quiz-settings.ts'
import './quiz-status.css'

const CHECK_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" /></svg>`
const CROSS_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>`

/**
 * The Navbar content during a Quiz Run: the Quiz Progress pills (question
 * number, Correct, Half Correct and Missed counts, running Score) and the
 * Prompt. All parts have fixed widths so nothing moves while playing. With a
 * single Try per Prompt there is no Half Correct, so its pill is hidden. With
 * `onPromptClick` the Prompt is a button (opening Country Info, or saying that
 * Hints are disabled).
 *
 * Feedback animations: Correct pops the ✓ pill, Half Correct nudges the ~
 * pill, Missed buzzes the ✗ pill, and every wrong Try shakes the Prompt. A new
 * Prompt fades in.
 */
export class QuizStatus {
  readonly element: HTMLElement
  private readonly question: HTMLElement
  private readonly correct: HTMLElement
  private readonly halfCorrect: HTMLElement
  private readonly missed: HTMLElement
  private readonly pills: Record<'correct' | 'half-correct' | 'missed', HTMLElement>
  private readonly score: HTMLElement
  private readonly prompt: HTMLElement
  private readonly settings: QuizSettings
  private readonly onPromptClick: ((country: Country) => void) | null
  private shownPromptId: string | null = null

  constructor(settings: QuizSettings, onPromptClick: ((country: Country) => void) | null = null) {
    this.settings = settings
    this.onPromptClick = onPromptClick
    this.element = document.createElement('div')
    this.element.className = 'quiz-status'
    this.element.innerHTML = `
      <div class="quiz-status__progress">
        <span class="pill pill--question" title="Question"><span class="pill__value"></span></span>
        <span class="pill pill--correct" title="Correct on the first try">${CHECK_ICON}<span class="pill__value"></span></span>
        <span class="pill pill--half-correct" title="Correct on the second try"><span class="pill__icon">~</span><span class="pill__value"></span></span>
        <span class="pill pill--missed" title="Missed">${CROSS_ICON}<span class="pill__value"></span></span>
        <span class="pill pill--score" title="Score so far"><span class="pill__value"></span></span>
      </div>
      <div class="quiz-status__prompt"></div>
    `
    const value = (pill: string) => this.element.querySelector<HTMLElement>(`.pill--${pill} .pill__value`)!
    this.question = value('question')
    this.correct = value('correct')
    this.halfCorrect = value('half-correct')
    this.missed = value('missed')
    this.score = value('score')
    this.prompt = this.element.querySelector('.quiz-status__prompt')!
    const pill = (name: string) => this.element.querySelector<HTMLElement>(`.pill--${name}`)!
    this.pills = { correct: pill('correct'), 'half-correct': pill('half-correct'), missed: pill('missed') }
    this.pills['half-correct'].hidden = quizRules(settings).triesPerPrompt === 1
  }

  /** Plays the feedback animation for what an Answer did. */
  animate(outcome: AnswerOutcome): void {
    switch (outcome.kind) {
      case 'correct':
        restartAnimation(this.pills.correct, 'pill--pop')
        break
      case 'half-correct':
        restartAnimation(this.pills['half-correct'], 'pill--nudge')
        break
      case 'try-again':
        restartAnimation(this.prompt, 'quiz-status__prompt--shake')
        break
      case 'missed':
        restartAnimation(this.prompt, 'quiz-status__prompt--shake')
        restartAnimation(this.pills.missed, 'pill--buzz')
        break
    }
  }

  update(run: QuizRun): void {
    this.question.textContent = `${run.questionNumber} / ${run.total}`
    this.correct.textContent = String(run.count('correct'))
    this.halfCorrect.textContent = String(run.count('half-correct'))
    this.missed.textContent = String(run.count('missed'))
    const score = run.runningScore
    this.score.textContent = score === null ? '–' : formatScore(score)

    const prompt = run.finished ? null : run.prompt
    if ((prompt?.id ?? null) === this.shownPromptId) return
    this.shownPromptId = prompt?.id ?? null
    if (prompt) {
      const content = this.createPrompt(prompt)
      const onClick = this.onPromptClick
      this.prompt.replaceChildren(
        onClick ? createCountryInfoButton(content, 'More about this country', () => onClick(prompt)) : content,
      )
      // A shake from the previous Prompt's wrong Try would override the fade-in.
      this.prompt.classList.remove('quiz-status__prompt--shake')
      restartAnimation(this.prompt, 'quiz-status__prompt--new')
    } else {
      this.prompt.textContent = 'Finished!'
    }
  }

  /** A short message popping up below the Prompt, e.g. "Hints are disabled". */
  showPromptNotice(text: string): void {
    this.prompt.querySelector('.quiz-status__prompt-notice')?.remove()
    const notice = document.createElement('span')
    notice.className = 'quiz-status__prompt-notice'
    notice.setAttribute('role', 'status')
    notice.textContent = text
    notice.addEventListener('animationend', (event) => {
      if (event.animationName === 'quiz-status-notice-out') notice.remove()
    })
    this.prompt.append(notice)
  }

  /** What the Prompt shows, set by the Game Mode and the Flag Modifier. */
  private createPrompt(country: Country): HTMLElement {
    if (this.settings.gameModeId === 'capital-to-location') {
      const capital = document.createElement('span')
      capital.className = 'quiz-status__capital'
      capital.textContent = capitalPrompt(country) ?? country.name
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
function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true })
}
