import { countryInfo } from '../country/country-info.ts'
import { createCountryLabel } from '../country/country-label.ts'
import { createLeaderboardView, describeQuizSettings } from '../leaderboard/leaderboard-view.ts'
import type { LeaderboardEntry } from '../leaderboard/leaderboard.ts'
import { createStreakLabel } from '../streak/streak.ts'
import '../screen/screen.css'
import './end-screen.css'
import { formatScore, type PromptResult, type QuizRun } from './quiz-run.ts'
import { formatDuration } from './stopwatch.ts'
import type { QuizSettings } from './quiz-settings.ts'

const RESULT_GROUPS: { result: PromptResult; icon: string; label: string }[] = [
  { result: 'correct', icon: '✓', label: 'Correct' },
  { result: 'half-correct', icon: '~', label: 'Half correct' },
  { result: 'missed', icon: '✗', label: 'Incorrect' },
]

/**
 * The End Screen: the modal shown when a Quiz Run is finished. Left: the
 * Score (with the Quiz Streak it carries over, when perfect) and the Countries
 * per result, each list collapsible. Right: the
 * Leaderboard with the new entry highlighted.
 */
export class EndScreen {
  readonly element: HTMLDialogElement
  private readonly summaryPanel: HTMLElement
  private readonly leaderboardPanel: HTMLElement

  constructor(options: { onBackToStart: () => void }) {
    this.element = document.createElement('dialog')
    this.element.className = 'screen screen--fixed-height'
    this.element.innerHTML = `
      <form method="dialog" class="screen__columns">
        <div class="screen__panel">
          <div class="end-screen__summary"></div>
          <div class="screen__actions">
            <button class="screen__button" value="back-to-start" autofocus>Back to start</button>
          </div>
        </div>
        <div class="screen__panel screen__panel--side"></div>
      </form>
    `
    this.summaryPanel = this.element.querySelector('.end-screen__summary')!
    this.leaderboardPanel = this.element.querySelector('.screen__panel--side')!
    this.element.addEventListener('close', () => {
      if (this.element.returnValue === 'back-to-start') options.onBackToStart()
    })
  }

  open(result: {
    run: QuizRun
    settings: QuizSettings
    leaderboard: readonly LeaderboardEntry[]
    entry: LeaderboardEntry
  }): void {
    const { run, settings, leaderboard, entry } = result
    this.summaryPanel.replaceChildren(this.createSummary(run, settings, entry))

    this.leaderboardPanel.replaceChildren(createLeaderboardView(settings, leaderboard, entry.id))
    if (!leaderboard.some((e) => e.id === entry.id)) {
      const note = document.createElement('p')
      note.className = 'screen__text screen__text--muted'
      note.textContent = `Your score of ${formatScore(entry.score)} didn't make the top 10 this time.`
      this.leaderboardPanel.append(note)
    }

    this.element.returnValue = ''
    this.element.showModal()
  }

  private createSummary(run: QuizRun, settings: QuizSettings, entry: LeaderboardEntry): DocumentFragment {
    const fragment = document.createDocumentFragment()

    const title = document.createElement('h1')
    title.className = 'screen__title'
    title.textContent = run.failed ? 'Sudden death!' : run.perfect ? 'Perfect!' : 'Quiz finished'

    const subtitle = document.createElement('p')
    subtitle.className = 'screen__text screen__text--muted'
    subtitle.textContent = describeQuizSettings(settings, true)

    const score = document.createElement('p')
    score.className = 'end-screen__score'
    score.textContent = formatScore(run.finalScore)

    const time = document.createElement('p')
    time.className = 'screen__text screen__text--muted end-screen__time'
    time.textContent = `Time: ${formatDuration(entry.durationMs ?? 0)}`

    // Only the lists scroll, so opening one never resizes the End Screen.
    const groups = document.createElement('div')
    groups.className = 'end-screen__groups'
    fragment.append(title, subtitle, score, time)
    if (run.perfect) {
      const streak = document.createElement('p')
      streak.className = 'screen__text end-screen__streak'
      streak.append(
        'Streak ',
        createStreakLabel(run.streak, run.total),
        ': it keeps going in your next quiz with these settings.',
      )
      fragment.append(streak)
    }
    if (run.failed) {
      const failed = document.createElement('p')
      failed.className = 'screen__text end-screen__failed'
      failed.textContent = `One wrong guess ended the quiz at question ${run.questionNumber} of ${run.total}.`
      fragment.append(failed)
    }
    fragment.append(groups)

    for (const group of RESULT_GROUPS) {
      const countries = run.results
        .filter((record) => record.result === group.result)
        .map((record) => record.country)
        .sort((a, b) => a.name.localeCompare(b.name))

      const details = document.createElement('details')
      details.className = `end-screen__group end-screen__group--${group.result}`
      const summary = document.createElement('summary')
      summary.className = 'end-screen__group-summary'
      summary.innerHTML = `
        <span class="end-screen__group-icon">${group.icon}</span>
        <span class="end-screen__group-label">${group.label}</span>
        <span class="end-screen__group-count">${countries.length}</span>
      `
      const list = document.createElement('ul')
      list.className = 'end-screen__countries'
      for (const country of countries) {
        const item = document.createElement('li')
        item.append(createCountryLabel(country))
        const capital = countryInfo(country)?.capital
        if (settings.gameModeId === 'capital-to-location' && capital) {
          const detail = document.createElement('span')
          detail.className = 'end-screen__capital'
          detail.textContent = capital
          item.append(detail)
        }
        list.append(item)
      }
      if (!countries.length) {
        const item = document.createElement('li')
        item.className = 'end-screen__none'
        item.textContent = 'None'
        list.append(item)
      }
      details.append(summary, list)
      groups.append(details)
    }
    return fragment
  }
}
