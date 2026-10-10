import { createLeaderboardView, describeQuizSettings } from '../leaderboard/leaderboard-view.ts'
import { loadLeaderboard } from '../leaderboard/leaderboard.ts'
import { formatScore, type QuizRun } from '../quiz/quiz-run.ts'
import type { QuizSettings } from '../quiz/quiz-settings.ts'
import { formatDuration } from '../quiz/stopwatch.ts'
import '../screen/screen.css'
import './pause-screen.css'

/**
 * The Pause Screen: shown instead of the Start Screen while a Quiz Run is
 * active, both after a page reload and when the Navbar title is clicked.
 * Left: what the Quiz is and how far along it is. Right: its Leaderboard.
 * *Continue current quiz* (or Escape) resumes; *Abandon* drops the Quiz Run.
 */
export class PauseScreen {
  readonly element: HTMLDialogElement
  private readonly details: HTMLElement
  private readonly leaderboardPanel: HTMLElement

  constructor(options: { onContinue: () => void; onAbandon: () => void }) {
    this.element = document.createElement('dialog')
    this.element.className = 'screen screen--fixed-height'
    this.element.innerHTML = `
      <form method="dialog" class="screen__columns">
        <div class="screen__panel">
          <h1 class="screen__title">Paused</h1>
          <div class="pause-screen__details"></div>
          <div class="screen__actions">
            <button class="screen__button screen__button--secondary" value="abandon">Abandon</button>
            <button class="screen__button" value="continue" autofocus>Continue current quiz</button>
          </div>
        </div>
        <div class="screen__panel screen__panel--side"></div>
      </form>
    `
    this.details = this.element.querySelector('.pause-screen__details')!
    this.leaderboardPanel = this.element.querySelector('.screen__panel--side')!
    this.element.addEventListener('close', () => {
      if (this.element.returnValue === 'abandon') options.onAbandon()
      else options.onContinue()
    })
  }

  open(quiz: { settings: QuizSettings; run: QuizRun; elapsedMs: number }): void {
    const { settings, run, elapsedMs } = quiz
    const finishedPrompts = run.results.length - (run.awaitingConfirm ? 1 : 0)
    const score = run.runningScore
    this.details.innerHTML = `
      <p class="screen__text screen__text--muted pause-screen__quiz"></p>
      <div class="pause-screen__progress">
        <div class="pause-screen__progress-label">
          <span>Question <b>${run.questionNumber}</b> of ${run.total}</span>
          <span>${Math.round((finishedPrompts / run.total) * 100)}% done</span>
        </div>
        <div class="pause-screen__bar"><div class="pause-screen__bar-fill" style="width: ${(finishedPrompts / run.total) * 100}%"></div></div>
      </div>
      <dl class="pause-screen__stats">
        <div class="pause-screen__stat pause-screen__stat--correct"><dt>✓ Correct</dt><dd>${run.count('correct')}</dd></div>
        <div class="pause-screen__stat pause-screen__stat--half-correct"><dt>~ Half correct</dt><dd>${run.count('half-correct')}</dd></div>
        <div class="pause-screen__stat pause-screen__stat--missed"><dt>✗ Incorrect</dt><dd>${run.count('missed')}</dd></div>
        <div class="pause-screen__stat"><dt>Score so far</dt><dd>${score === null ? '–' : formatScore(score)}</dd></div>
        <div class="pause-screen__stat"><dt>Time</dt><dd>${formatDuration(elapsedMs)}</dd></div>
      </dl>
    `
    this.details.querySelector('.pause-screen__quiz')!.textContent = describeQuizSettings(settings, true)
    this.leaderboardPanel.replaceChildren(createLeaderboardView(settings, loadLeaderboard(settings)))

    this.element.returnValue = ''
    this.element.showModal()
  }
}
