import type { Country } from '../country/country.ts'
import { createLeaderboardView } from '../leaderboard/leaderboard-view.ts'
import { loadLeaderboard } from '../leaderboard/leaderboard.ts'
import { loadSkillProgress, loadStreak, resetPracticeProgress } from '../practice/practice-progress.ts'
import { countLearned } from '../practice/practice-run.ts'
import { createStreakLabel } from '../streak/streak.ts'
import { GAME_MODES, gameModeById, type GameModeId } from '../quiz/game-mode.ts'
import {
  isDefaultState,
  MODIFIERS,
  modifierState,
  nextModifierState,
  type ModifierId,
  type ModifierSettings,
} from '../quiz/modifier.ts'
import {
  loadQuizSettings,
  practiceSettings,
  quizCountries,
  saveQuizSettings,
  type QuizSettings,
} from '../quiz/quiz-settings.ts'
import { chosenContinents, selectionLabel } from '../quiz/selection.ts'
import '../screen/screen.css'
import { createContinentIcon } from './continent-icon.ts'
import { SelectionPage } from './selection-page.ts'
import './start-screen.css'

/**
 * The Start Screen: the modal shown when the app opens, and when the Navbar
 * title is clicked. Left: the *What do you want to quiz?* button shows the
 * Selection (small maps of the chosen Continents, its label and how many
 * Countries it holds) and opens the Selection page in the same dialog, at the
 * same size. Below it the player picks a Game Mode and
 * sets its Modifiers to start a Quiz, or chooses Explore Mode. The Explore
 * button is a split button: its arrow opens a menu with Practice Mode, which
 * uses the same choice (but only the Flag Modifier), and shows its live and
 * best Streak and how many Countries are Learned, with a button to reset that
 * Practice Progress. Right: the
 * Leaderboard for the current choice. Closing it (Escape) keeps the current
 * Mode going. It has a fixed size, so changing the choice never resizes it.
 */
export class StartScreen {
  readonly element: HTMLDialogElement
  private readonly form: HTMLFormElement
  private readonly selectionPage: SelectionPage
  private readonly selectionButton: HTMLButtonElement
  private readonly startButton: HTMLButtonElement
  private readonly practiceButton: HTMLButtonElement
  private readonly practiceStats: HTMLElement
  private readonly resetPracticeButton: HTMLButtonElement
  private readonly modeMenuToggle: HTMLButtonElement
  private readonly modeMenu: HTMLElement
  private modeMenuOpen = false
  private readonly modifierButtons: HTMLElement
  private readonly modifierExplanation: HTMLElement
  private readonly leaderboardPanel: HTMLElement
  private countries: readonly Country[] = []
  private modifiers: ModifierSettings
  /** The Modifier clicked last, explained below the Modifiers. */
  private explainedModifier: ModifierId | null = null

  constructor(options: {
    onExplore: () => void
    onPractice: (settings: QuizSettings) => void
    onStartQuiz: (settings: QuizSettings) => void
  }) {
    this.element = document.createElement('dialog')
    this.element.className = 'screen screen--fixed-height'
    this.element.innerHTML = `
      <form method="dialog" class="screen__columns">
        <div class="screen__panel">
          <h1 class="screen__title">SnoozieWorld</h1>

          <div class="start-screen__group">
            <h2 class="start-screen__legend">What do you want to quiz?</h2>
            <button type="button" class="start-screen__selection">
              <span class="start-screen__selection-icons"></span>
              <span class="start-screen__selection-text">
                <span class="start-screen__selection-title"></span>
                <span class="start-screen__selection-detail"></span>
              </span>
              <svg class="start-screen__selection-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </div>

          <fieldset class="start-screen__group">
            <legend class="start-screen__legend">Game mode</legend>
            ${GAME_MODES.map(
              (mode) => `
                <label class="start-screen__option start-screen__option--game-mode">
                  <input type="radio" name="game-mode" value="${mode.id}" />
                  <span>
                    <span class="start-screen__option-label">${mode.label}</span>
                    <span class="start-screen__option-description">${mode.description}</span>
                  </span>
                </label>`,
            ).join('')}
          </fieldset>

          <div class="start-screen__group">
            <h2 class="start-screen__legend">Modifiers</h2>
            <div class="start-screen__modifiers"></div>
            <p class="start-screen__modifier-explanation" aria-live="polite"></p>
          </div>

          <div class="screen__actions">
            <div class="start-screen__split">
              <button class="screen__button screen__button--secondary start-screen__split-main" value="explore">Explore</button>
              <button type="button" class="screen__button screen__button--secondary start-screen__split-toggle" aria-haspopup="menu" aria-expanded="false" aria-controls="start-screen-mode-menu" title="More modes" aria-label="More modes">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
              </button>
              <div class="start-screen__mode-menu" id="start-screen-mode-menu" role="menu" hidden>
                <button class="start-screen__mode-item" role="menuitem" value="practice">
                  <span class="start-screen__option-label">Practice</span>
                  <span class="start-screen__option-description">Learn the countries you chose. The ones you get wrong come back soon, the ones you know only now and then. Only the flag modifier applies.</span>
                  <span class="start-screen__practice-stats"></span>
                </button>
                <button type="button" class="start-screen__mode-reset" role="menuitem">Reset practice progress</button>
              </div>
            </div>
            <button class="screen__button" value="start" autofocus>Start quiz</button>
          </div>
        </div>
        <div class="screen__panel screen__panel--side"></div>
      </form>
    `
    this.form = this.element.querySelector('form')!
    this.selectionButton = this.element.querySelector('.start-screen__selection')!
    this.startButton = this.element.querySelector('button[value="start"]')!
    this.practiceButton = this.element.querySelector('button[value="practice"]')!
    this.practiceStats = this.element.querySelector('.start-screen__practice-stats')!
    this.resetPracticeButton = this.element.querySelector('.start-screen__mode-reset')!
    this.modeMenuToggle = this.element.querySelector('.start-screen__split-toggle')!
    this.modeMenu = this.element.querySelector('.start-screen__mode-menu')!
    this.leaderboardPanel = this.element.querySelector('.screen__panel--side')!
    this.modifierButtons = this.element.querySelector('.start-screen__modifiers')!
    this.modifierExplanation = this.element.querySelector('.start-screen__modifier-explanation')!

    // The second page of the dialog: the Selection page.
    this.selectionPage = new SelectionPage({
      onChange: () => this.update(),
      onDone: () => this.showSelectionPage(false),
    })
    this.element.append(this.selectionPage.element)
    this.selectionButton.addEventListener('click', () => this.showSelectionPage(true))

    const settings = loadQuizSettings()
    this.modifiers = settings.modifiers
    this.selectionPage.setSelection(settings.selection)
    for (const input of this.form.querySelectorAll<HTMLInputElement>('input[name="game-mode"]')) {
      input.checked = input.value === settings.gameModeId
    }
    this.form.addEventListener('change', () => this.update())
    this.modifierButtons.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-modifier-id]')
      if (!button) return
      const id = button.dataset.modifierId as ModifierId
      this.modifiers = nextModifierState(id, this.modifiers)
      this.explainedModifier = id
      this.update()
      // update() rebuilt the buttons; keep the keyboard focus on this one.
      this.modifierButtons.querySelector<HTMLButtonElement>(`[data-modifier-id="${id}"]`)?.focus()
    })
    this.update()
    this.listenToModeMenu()

    this.element.addEventListener('close', () => {
      this.setModeMenuOpen(false)
      const action = this.element.returnValue
      if (action === 'explore') options.onExplore()
      if (action === 'start' || action === 'practice') {
        const settings = this.settings()
        // Possible only while the Countries are still loading.
        if (quizCountries(settings, this.countries).length === 0) return
        saveQuizSettings(settings)
        if (action === 'start') options.onStartQuiz(settings)
        else options.onPractice(settings)
      }
    })
  }

  /** Provides the Countries, once loaded, to count and list what the Selection contains. */
  setCountries(countries: readonly Country[]): void {
    this.countries = countries
    this.selectionPage.setCountries(countries)
    this.update()
  }

  open(): void {
    this.showSelectionPage(false, false)
    // Show the latest Leaderboard, which a finished Quiz Run may have changed.
    this.update()
    this.element.returnValue = ''
    this.element.showModal()
  }

  /**
   * Shows the Selection page instead of the Start Screen's own page, or goes
   * back to it. Both fill the same dialog, so its size stays the same.
   */
  private showSelectionPage(shown: boolean, focus = true): void {
    this.setModeMenuOpen(false)
    this.form.hidden = shown
    this.selectionPage.element.hidden = !shown
    if (!focus) return
    if (shown) this.selectionPage.focus()
    else this.selectionButton.focus()
  }

  /** The split button's menu: opened by its arrow; closed by a click elsewhere or Escape. */
  private listenToModeMenu(): void {
    this.resetPracticeButton.addEventListener('click', () => this.resetPractice())
    this.modeMenuToggle.addEventListener('click', () => {
      this.setModeMenuOpen(!this.modeMenuOpen)
      if (this.modeMenuOpen) this.practiceButton.focus()
    })
    this.element.addEventListener('click', (event) => {
      const target = event.target as Element
      if (!this.modeMenu.contains(target) && !this.modeMenuToggle.contains(target)) this.setModeMenuOpen(false)
    })
    // Escape closes the menu, or the Selection page, instead of the Start Screen.
    this.element.addEventListener('cancel', (event) => {
      if (!this.selectionPage.element.hidden) {
        event.preventDefault()
        this.showSelectionPage(false)
        return
      }
      if (!this.modeMenuOpen) return
      event.preventDefault()
      this.setModeMenuOpen(false)
      this.modeMenuToggle.focus()
    })
  }

  private setModeMenuOpen(open: boolean): void {
    this.modeMenuOpen = open
    this.modeMenu.hidden = !open
    this.modeMenuToggle.setAttribute('aria-expanded', String(open))
  }

  private gameModeId(): GameModeId {
    return new FormData(this.form).get('game-mode') as GameModeId
  }

  /** The chosen settings. The Selection depends on the Game Mode given to the Selection page in `update`. */
  private settings(): QuizSettings {
    return { selection: this.selectionPage.selection(), gameModeId: this.gameModeId(), modifiers: this.modifiers }
  }

  /** The *What do you want to quiz?* button: maps of the chosen Continents, the label and the count. */
  private updateSelectionButton(settings: QuizSettings, total: number): void {
    const continents = chosenContinents(settings.selection)
    const icons = continents.length
      ? continents.map((continent) => createContinentIcon(continent.id, true))
      : [createContinentIcon('europe')]
    this.selectionButton.querySelector('.start-screen__selection-icons')!.replaceChildren(...icons)
    this.selectionButton.querySelector('.start-screen__selection-title')!.textContent = selectionLabel(settings.selection)
    this.selectionButton.querySelector('.start-screen__selection-detail')!.textContent = this.countries.length
      ? `${total} ${total === 1 ? 'country' : 'countries'} · change`
      : 'change'
  }

  /** The Modifier buttons of the chosen Game Mode, and the explanation of the one clicked last. */
  private updateModifiers(gameModeId: GameModeId): void {
    const ids = gameModeById(gameModeId).modifierIds
    this.modifierButtons.replaceChildren(
      ...ids.map((id) => {
        const state = modifierState(id, this.modifiers)
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'start-screen__modifier'
        button.classList.toggle('start-screen__modifier--on', !isDefaultState(id, this.modifiers))
        button.dataset.modifierId = id
        button.title = `${MODIFIERS[id].label}: ${state.label}`
        button.setAttribute('aria-label', button.title)
        button.innerHTML = state.icon
        return button
      }),
    )

    const id = this.explainedModifier && ids.includes(this.explainedModifier) ? this.explainedModifier : null
    if (!id) {
      this.modifierExplanation.textContent = 'Click a modifier to change it.'
      return
    }
    const state = modifierState(id, this.modifiers)
    const title = document.createElement('b')
    title.textContent = `${MODIFIERS[id].label}: ${state.label}. `
    this.modifierExplanation.replaceChildren(title, state.description)
  }

  /** "Streak 12 ×2 · Best 30 · Learned 12 / 51" for the Practice Set of the current choice. */
  private updatePracticeStats(settings: QuizSettings): void {
    const practice = practiceSettings(settings)
    const countries = quizCountries(practice, this.countries)
    const streak = loadStreak(practice)
    const skill = loadSkillProgress(practice)
    const stat = (label: string, value: Node | string) => {
      const part = document.createElement('span')
      part.className = 'start-screen__practice-stat'
      const strong = document.createElement('b')
      strong.append(value)
      part.append(`${label} `, strong)
      return part
    }
    this.practiceStats.replaceChildren(
      stat('Streak', createStreakLabel(streak.current, countries.length)),
      stat('Best', createStreakLabel(streak.best, countries.length)),
      stat('Learned', `${countLearned(skill, countries)} / ${countries.length}`),
    )
    this.practiceStats.hidden = !countries.length
    this.resetPracticeButton.disabled = !streak.current && !countries.some((country) => skill.levels[country.id])
  }

  private resetPractice(): void {
    const practice = practiceSettings(this.settings())
    const countries = quizCountries(practice, this.countries)
    const question =
      `Forget which of these ${countries.length} countries you know, and set your streak back to 0? ` +
      'Your best streak stays.'
    if (!confirm(question)) return
    resetPracticeProgress(practice, countries.map((country) => country.id))
    this.update()
  }

  private update(): void {
    const gameModeId = this.gameModeId()
    this.selectionPage.update(gameModeById(gameModeId), this.modifiers)
    const settings = this.settings()
    this.updateModifiers(settings.gameModeId)
    const total = quizCountries(settings, this.countries).length
    this.updateSelectionButton(settings, total)
    // Stays enabled while loading, so it can take the autofocus when the Start Screen opens.
    this.startButton.disabled = this.countries.length > 0 && total === 0
    this.practiceButton.disabled = this.startButton.disabled
    this.startButton.textContent = total ? `Start quiz (${total})` : 'Start quiz'
    this.updatePracticeStats(settings)

    this.leaderboardPanel.replaceChildren(createLeaderboardView(settings, loadLeaderboard(settings)))
  }
}
