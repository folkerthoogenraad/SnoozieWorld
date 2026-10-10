import type { Country } from '../country/country.ts'
import { PromptView, restartAnimation } from '../quiz/prompt-view.ts'
import type { AnswerOutcome } from '../quiz/quiz-run.ts'
import type { QuizSettings } from '../quiz/quiz-settings.ts'
import '../quiz/quiz-status.css'
import { createStreakLabel, describeStreak, FLAME_ICON, roundProgress } from '../streak/streak.ts'
import type { PracticeRun } from './practice-run.ts'
import './practice-status.css'

const CAP_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6.2 8 3l7 3.2-7 3.2zM4 7.6v3.2c1 1 2.4 1.5 4 1.5s3-.5 4-1.5V7.6M14.5 6.4v4" /></svg>`

/**
 * The Navbar content during Practice Mode: the Streak pill (with its
 * Multiplier badge after a Full Round, and a thin bar along its bottom showing
 * how far the next Full Round is), the Learned pill (Learned Countries of the
 * Practice Set) and the Prompt (see PromptView). A Correct Prompt pops the
 * Streak pill, a Milestone (every 10) makes it glow, a Full Round pops it
 * bigger; a wrong Try shakes the Prompt and buzzes the Streak pill, which is
 * back at 0. A newly Learned Country pops the Learned pill.
 */
export class PracticeStatus {
  readonly element: HTMLElement
  private readonly streakPill: HTMLElement
  private readonly streak: HTMLElement
  private readonly learnedPill: HTMLElement
  private readonly learned: HTMLElement
  private readonly prompt: PromptView
  private shownLearned: number | null = null

  constructor(settings: QuizSettings, onPromptClick: ((country: Country) => void) | null = null) {
    this.prompt = new PromptView(settings, onPromptClick)
    this.element = document.createElement('div')
    this.element.className = 'quiz-status'
    this.element.innerHTML = `
      <div class="quiz-status__progress">
        <span class="pill pill--streak">${FLAME_ICON}<span class="pill__value"></span></span>
        <span class="pill pill--learned">${CAP_ICON}<span class="pill__value"></span></span>
      </div>
    `
    this.element.append(this.prompt.element)
    this.streakPill = this.element.querySelector('.pill--streak')!
    this.streak = this.streakPill.querySelector('.pill__value')!
    this.learnedPill = this.element.querySelector('.pill--learned')!
    this.learned = this.learnedPill.querySelector('.pill__value')!
  }

  update(run: PracticeRun): void {
    const setSize = run.countries.length
    this.streak.replaceChildren(createStreakLabel(run.streak, setSize))
    this.streakPill.style.setProperty('--round-progress', String(roundProgress(run.streak, setSize)))
    this.streakPill.title = `Streak: ${describeStreak(run.streak, setSize)}. Best: ${run.bestStreak}.`
    const learned = run.learned
    this.learned.textContent = `${learned} / ${setSize}`
    this.learnedPill.title = `Learned: ${learned} of ${setSize} countries, asked only now and then`
    if (this.shownLearned !== null && learned > this.shownLearned) restartAnimation(this.learnedPill, 'pill--pop')
    this.shownLearned = learned
    this.prompt.show(run.prompt, String(run.promptNumber))
  }

  /** Plays the feedback animation for what an Answer did. */
  animate(outcome: AnswerOutcome, run: PracticeRun): void {
    switch (outcome.kind) {
      case 'correct': {
        restartAnimation(this.streakPill, run.reward ? `pill--${run.reward}` : 'pill--pop')
        break
      }
      case 'try-again':
      case 'missed':
        this.prompt.shake()
        restartAnimation(this.streakPill, 'pill--buzz')
        break
    }
  }

  /** A short message popping up below the Prompt. */
  showPromptNotice(text: string): void {
    this.prompt.showNotice(text)
  }
}
