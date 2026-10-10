import { CATEGORIES } from '../quiz/category.ts'
import { gameModeById, type GameModeId } from '../quiz/game-mode.ts'
import { DEFAULT_MODIFIERS, isDefaultState, MODIFIERS, modifierState, type ModifierSettings } from '../quiz/modifier.ts'
import { formatScore } from '../quiz/quiz-run.ts'
import { formatDuration } from '../quiz/stopwatch.ts'
import type { QuizSettings } from '../quiz/quiz-settings.ts'
import { LEADERBOARD_SIZE, type LeaderboardEntry } from './leaderboard.ts'
import './leaderboard.css'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/**
 * "Europe, Asia · Name to Location", and with `withModifiers` the Modifiers
 * that aren't at their default: "Europe · Name to Location · Flag only, Sudden death".
 */
export function describeQuizSettings(settings: QuizSettings, withModifiers = false): string {
  const categories = CATEGORIES.filter((c) => settings.categoryIds.includes(c.id)).map((c) => c.label)
  const parts = [categories.length ? categories.join(', ') : 'No categories', gameModeById(settings.gameModeId).label]
  const modifiers = changedModifiers(settings.gameModeId, settings.modifiers).map((id) =>
    modifierState(id, settings.modifiers).label,
  )
  if (withModifiers && modifiers.length) parts.push(modifiers.join(', '))
  return parts.join(' · ')
}

/** The Game Mode's Modifiers that are not at their default State. */
function changedModifiers(gameModeId: GameModeId, modifiers: Partial<ModifierSettings> = {}) {
  const all = { ...DEFAULT_MODIFIERS, ...modifiers }
  return gameModeById(gameModeId).modifierIds.filter((id) => !isDefaultState(id, all))
}

/** The icons of the Modifiers a Leaderboard Entry was played with (only those not at their default). */
function createModifierIcons(gameModeId: GameModeId, modifiers: Partial<ModifierSettings> | undefined): string {
  const all = { ...DEFAULT_MODIFIERS, ...modifiers }
  return changedModifiers(gameModeId, modifiers)
    .map((id) => {
      const state = modifierState(id, all)
      return `<span class="leaderboard__modifier" title="${MODIFIERS[id].label}: ${state.label}">${state.icon}</span>`
    })
    .join('')
}

/**
 * The Leaderboard for one Quiz Settings: always 10 numbered rows, empty ones
 * showing a dash. `highlightId` marks a just-added entry.
 */
export function createLeaderboardView(
  settings: QuizSettings,
  entries: readonly LeaderboardEntry[],
  highlightId?: string,
): HTMLElement {
  const view = document.createElement('section')
  view.className = 'leaderboard'

  const title = document.createElement('h2')
  title.className = 'leaderboard__title'
  title.textContent = 'Leaderboard'

  const subtitle = document.createElement('p')
  subtitle.className = 'leaderboard__subtitle'
  subtitle.textContent = describeQuizSettings(settings)

  const list = document.createElement('ol')
  list.className = 'leaderboard__list'
  for (let i = 0; i < LEADERBOARD_SIZE; i++) {
    const entry = entries[i]
    const row = document.createElement('li')
    row.className = 'leaderboard__row'
    row.innerHTML = `
      <span class="leaderboard__rank">${i + 1}</span>
      <span class="leaderboard__score"></span>
      <span class="leaderboard__modifiers"></span>
      <span class="leaderboard__counts"></span>
      <span class="leaderboard__time"></span>
      <span class="leaderboard__date"></span>
    `
    const cell = (name: string) => row.querySelector<HTMLElement>(`.leaderboard__${name}`)!
    if (entry) {
      cell('score').textContent = formatScore(entry.score)
      cell('modifiers').innerHTML = createModifierIcons(settings.gameModeId, entry.modifiers)
      cell('counts').innerHTML =
        `<span class="leaderboard__correct">✓ ${entry.correct}</span>` +
        `<span class="leaderboard__half-correct">~ ${entry.halfCorrect}</span>` +
        `<span class="leaderboard__missed">✗ ${entry.missed}</span>`
      if (entry.durationMs !== undefined) cell('time').textContent = formatDuration(entry.durationMs)
      cell('time').title = 'Time'
      cell('date').textContent = dateFormat.format(new Date(entry.date))
      if (entry.id === highlightId) row.classList.add('leaderboard__row--highlighted')
    } else {
      row.classList.add('leaderboard__row--empty')
      cell('score').textContent = '–'
    }
    list.append(row)
  }

  view.append(title, subtitle, list)
  if (!entries.length) {
    const empty = document.createElement('p')
    empty.className = 'leaderboard__note'
    empty.textContent = 'No scores yet. Finish this quiz to get on the board.'
    view.append(empty)
  }
  return view
}
