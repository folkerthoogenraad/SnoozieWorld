import type { Country } from '../country/country.ts'
import { createStreakLabel, FLAME_ICON } from '../streak/streak.ts'
import { PromptView, restartAnimation } from './prompt-view.ts'
import { formatScore, type AnswerOutcome, type QuizRun } from './quiz-run.ts'
import { quizRules, type QuizSettings } from './quiz-settings.ts'
import './quiz-status.css'

const CHECK_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" /></svg>`
const CROSS_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>`

/**
 * The Navbar content during a Quiz Run: the Quiz Progress pills (question
 * number, Correct, Half Correct and Missed counts, running Score, Quiz Streak)
 * and the Prompt (see PromptView). The Streak pill is hidden on phones, for
 * lack of room. All parts have fixed widths so nothing moves while
 * playing. With a single Try per Prompt there is no Half Correct, so its pill
 * is hidden.
 *
 * Feedback animations: Correct pops the ✓ pill, Half Correct nudges the ~
 * pill, Missed buzzes the ✗ pill, and every wrong Try shakes the Prompt. A
 * Streak Milestone makes the Streak pill glow; a perfect Quiz Run pops it big.
 */
export class QuizStatus {
  readonly element: HTMLElement
  private readonly question: HTMLElement
  private readonly correct: HTMLElement
  private readonly halfCorrect: HTMLElement
  private readonly missed: HTMLElement
  private readonly pills: Record<'correct' | 'half-correct' | 'missed', HTMLElement>
  private readonly score: HTMLElement
  private readonly streakPill: HTMLElement
  private readonly streak: HTMLElement
  private readonly prompt: PromptView

  constructor(settings: QuizSettings, onPromptClick: ((country: Country) => void) | null = null) {
    this.prompt = new PromptView(settings, onPromptClick)
    this.element = document.createElement('div')
    this.element.className = 'quiz-status'
    this.element.innerHTML = `
      <div class="quiz-status__progress">
        <span class="pill pill--question" title="Question"><span class="pill__value"></span></span>
        <span class="pill pill--correct" title="Correct on the first try">${CHECK_ICON}<span class="pill__value"></span></span>
        <span class="pill pill--half-correct" title="Correct on the second try"><span class="pill__icon">~</span><span class="pill__value"></span></span>
        <span class="pill pill--missed" title="Missed">${CROSS_ICON}<span class="pill__value"></span></span>
        <span class="pill pill--score" title="Score so far"><span class="pill__value"></span></span>
        <span class="pill pill--streak pill--quiz-streak">${FLAME_ICON}<span class="pill__value"></span></span>
      </div>
    `
    this.element.append(this.prompt.element)
    const value = (pill: string) => this.element.querySelector<HTMLElement>(`.pill--${pill} .pill__value`)!
    this.question = value('question')
    this.correct = value('correct')
    this.halfCorrect = value('half-correct')
    this.missed = value('missed')
    this.score = value('score')
    this.streak = value('streak')
    const pill = (name: string) => this.element.querySelector<HTMLElement>(`.pill--${name}`)!
    this.pills = { correct: pill('correct'), 'half-correct': pill('half-correct'), missed: pill('missed') }
    this.pills['half-correct'].hidden = quizRules(settings).triesPerPrompt === 1
    this.streakPill = pill('streak')
  }

  /** Plays the feedback animation for what an Answer did. */
  animate(outcome: AnswerOutcome, run: QuizRun): void {
    if (run.reward) restartAnimation(this.streakPill, `pill--${run.reward}`)
    switch (outcome.kind) {
      case 'correct':
        restartAnimation(this.pills.correct, 'pill--pop')
        break
      case 'half-correct':
        restartAnimation(this.pills['half-correct'], 'pill--nudge')
        break
      case 'try-again':
        this.prompt.shake()
        break
      case 'missed':
        this.prompt.shake()
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
    this.streak.replaceChildren(createStreakLabel(run.streak, run.total))
    this.streakPill.title =
      `Streak: ${run.streak} correct on the first try in a row. ` +
      'A perfect quiz keeps it going into the next one with the same choice.'

    this.prompt.show(run.prompt)
  }

  /** A short message popping up below the Prompt, e.g. "Hints are disabled". */
  showPromptNotice(text: string): void {
    this.prompt.showNotice(text)
  }
}
