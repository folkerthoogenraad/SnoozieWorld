import type { Country } from '../country/country.ts'
import { createLeaderboardView } from '../leaderboard/leaderboard-view.ts'
import { loadLeaderboard } from '../leaderboard/leaderboard.ts'
import { CATEGORIES } from '../quiz/category.ts'
import { GAME_MODES, gameModeById, type GameModeId } from '../quiz/game-mode.ts'
import {
  isDefaultState,
  MODIFIERS,
  modifierState,
  nextModifierState,
  type ModifierId,
  type ModifierSettings,
} from '../quiz/modifier.ts'
import { loadQuizSettings, quizCountries, saveQuizSettings, type QuizSettings } from '../quiz/quiz-settings.ts'
import '../screen/screen.css'
import './start-screen.css'

/**
 * The Start Screen: the modal shown when the app opens, and when the Navbar
 * title is clicked. Left: the player ticks Categories, picks a Game Mode and
 * sets its Modifiers to start a Quiz, or chooses Explore Mode. Right: the
 * Leaderboard for the current choice. Closing it (Escape) keeps the current
 * Mode going. It has a fixed size, so changing the choice never resizes it.
 */
export class StartScreen {
  readonly element: HTMLDialogElement
  private readonly form: HTMLFormElement
  private readonly startButton: HTMLButtonElement
  private readonly modifierButtons: HTMLElement
  private readonly modifierExplanation: HTMLElement
  private readonly leaderboardPanel: HTMLElement
  private countries: readonly Country[] = []
  private modifiers: ModifierSettings
  /** The Modifier clicked last, explained below the Modifiers. */
  private explainedModifier: ModifierId | null = null

  constructor(options: { onExplore: () => void; onStartQuiz: (settings: QuizSettings) => void }) {
    this.element = document.createElement('dialog')
    this.element.className = 'screen screen--fixed-height'
    this.element.innerHTML = `
      <form method="dialog" class="screen__columns">
        <div class="screen__panel">
          <h1 class="screen__title">SnoozieWorld</h1>

          <fieldset class="start-screen__group">
            <legend class="start-screen__legend">What do you want to quiz?</legend>
            <div class="start-screen__categories">
              ${CATEGORIES.map(
                (category) => `
                  <label class="start-screen__option">
                    <input type="checkbox" name="category" value="${category.id}" />
                    <span>${category.label}</span>
                    <span class="start-screen__count" data-category-id="${category.id}"></span>
                  </label>`,
              ).join('')}
            </div>
          </fieldset>

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
            <button class="screen__button screen__button--secondary" value="explore">Explore</button>
            <button class="screen__button" value="start" autofocus>Start quiz</button>
          </div>
        </div>
        <div class="screen__panel screen__panel--side"></div>
      </form>
    `
    this.form = this.element.querySelector('form')!
    this.startButton = this.element.querySelector('button[value="start"]')!
    this.leaderboardPanel = this.element.querySelector('.screen__panel--side')!
    this.modifierButtons = this.element.querySelector('.start-screen__modifiers')!
    this.modifierExplanation = this.element.querySelector('.start-screen__modifier-explanation')!

    const settings = loadQuizSettings()
    this.modifiers = settings.modifiers
    for (const input of this.form.querySelectorAll<HTMLInputElement>('input')) {
      input.checked = input.name === 'category' ? settings.categoryIds.includes(input.value) : input.value === settings.gameModeId
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

    this.element.addEventListener('close', () => {
      if (this.element.returnValue === 'explore') options.onExplore()
      if (this.element.returnValue === 'start') {
        const settings = this.settings()
        // Possible only while the Countries are still loading.
        if (quizCountries(settings, this.countries).length === 0) return
        saveQuizSettings(settings)
        options.onStartQuiz(settings)
      }
    })
  }

  /** Provides the Countries, once loaded, to count what each Category contains. */
  setCountries(countries: readonly Country[]): void {
    this.countries = countries
    this.update()
  }

  open(): void {
    // Show the latest Leaderboard, which a finished Quiz Run may have changed.
    this.update()
    this.element.returnValue = ''
    this.element.showModal()
  }

  private settings(): QuizSettings {
    const data = new FormData(this.form)
    return {
      categoryIds: data.getAll('category') as string[],
      gameModeId: data.get('game-mode') as GameModeId,
      modifiers: this.modifiers,
    }
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

  private update(): void {
    const settings = this.settings()
    this.updateModifiers(settings.gameModeId)
    for (const count of this.form.querySelectorAll<HTMLElement>('.start-screen__count')) {
      const categorySettings = { ...settings, categoryIds: [count.dataset.categoryId!] }
      count.textContent = this.countries.length ? String(quizCountries(categorySettings, this.countries).length) : ''
    }
    const total = quizCountries(settings, this.countries).length
    // Stays enabled while loading, so it can take the autofocus when the Start Screen opens.
    this.startButton.disabled = this.countries.length > 0 && total === 0
    this.startButton.textContent = total ? `Start quiz (${total})` : 'Start quiz'

    this.leaderboardPanel.replaceChildren(createLeaderboardView(settings, loadLeaderboard(settings)))
  }
}
