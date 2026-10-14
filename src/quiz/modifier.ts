/**
 * Modifiers change how a Quiz is played, on top of its Game Mode. Each has
 * a few States; the first one is the default (the Modifier is "off"). The
 * player clicks a Modifier on the Start Screen to go to its next State.
 */
export type ModifierId = 'flag' | 'guesses' | 'hints' | 'results'

export type FlagState = 'name-and-flag' | 'name-only' | 'flag-only'
export type GuessesState = 'two-guesses' | 'single-guess' | 'sudden-death'
export type HintsState = 'hints' | 'no-hints'
export type ResultsState = 'shown' | 'hidden'

/** The State of every Modifier. Modifiers a Game Mode doesn't use stay at their default. */
export interface ModifierSettings {
  flag: FlagState
  guesses: GuessesState
  hints: HintsState
  results: ResultsState
}

export interface ModifierState {
  id: string
  label: string
  description: string
  /** Inline SVG. */
  icon: string
}

export interface Modifier {
  id: ModifierId
  label: string
  /** The first State is the default. */
  states: readonly ModifierState[]
}

const svg = (body: string) =>
  `<svg class="modifier-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
const TEXT = '<path d="M1.5 3.5h6.5M4.75 3.5v9.5" />'
const FLAG = '<path d="M9.5 14V2.5M9.5 3h5l-1.4 2.5 1.4 2.5h-5" />'
const digit = (d: string) =>
  `<text x="8" y="12.6" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none">${d}</text>`
const SKULL =
  '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M8 1.5c-3.3 0-5.6 2.3-5.6 5.3 0 1.7.8 3.1 2 3.9v2.3c0 .4.3.7.7.7h1.4v-1.5h1v1.5h1v-1.5h1v1.5h1.4c.4 0 .7-.3.7-.7v-2.3c1.2-.8 2-2.2 2-3.9 0-3-2.3-5.3-5.6-5.3zM4.6 7.4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0zm3.8 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z" />'
const BULB = '<path d="M8 1.5a4.3 4.3 0 0 0-2.5 7.8c.4.3.6.8.6 1.3v.6h3.8v-.6c0-.5.2-1 .6-1.3A4.3 4.3 0 0 0 8 1.5zM6.2 13.5h3.6M7 15h2" />'
const SLASH = '<path d="M2 2l12 12" />'
const EYE = '<path d="M1.5 8S3.9 3.5 8 3.5 14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" />'

export const MODIFIERS: Record<ModifierId, Modifier> = {
  flag: {
    id: 'flag',
    label: 'Flag',
    states: [
      {
        id: 'name-and-flag',
        label: 'Name and flag',
        description: 'You get the name and the flag of the country.',
        icon: svg(TEXT + FLAG),
      },
      {
        id: 'name-only',
        label: 'Name only',
        description: 'You only get the name of the country, no flag.',
        icon: svg('<g transform="translate(3.5 0)">' + TEXT + '</g>'),
      },
      {
        id: 'flag-only',
        label: 'Flag only',
        description: 'You only get the flag. Countries that share a flag (like Réunion) are left out.',
        icon: svg('<g transform="translate(-4 0)">' + FLAG + '</g>'),
      },
    ],
  },
  guesses: {
    id: 'guesses',
    label: 'Guesses',
    states: [
      {
        id: 'two-guesses',
        label: 'Two guesses',
        description: 'You get two guesses per country. Right on the second guess counts as half correct.',
        icon: svg(digit('2')),
      },
      {
        id: 'single-guess',
        label: 'Single guess',
        description: 'You get only one guess per country.',
        icon: svg(digit('1')),
      },
      {
        id: 'sudden-death',
        label: 'Sudden death',
        description: 'One guess per country, and one wrong guess ends the whole quiz.',
        icon: svg(SKULL),
      },
    ],
  },
  hints: {
    id: 'hints',
    label: 'Hints',
    states: [
      {
        id: 'hints',
        label: 'Hints',
        description: 'After a wrong guess, a hint shows which country you clicked.',
        icon: svg(BULB),
      },
      {
        id: 'no-hints',
        label: 'No hints',
        description: "A wrong guess doesn't tell you which country you clicked.",
        icon: svg(BULB + SLASH),
      },
    ],
  },
  results: {
    id: 'results',
    label: 'Results',
    states: [
      {
        id: 'shown',
        label: 'Shown',
        description: 'Countries you found stay coloured on the map.',
        icon: svg(EYE),
      },
      {
        id: 'hidden',
        label: 'Hidden',
        description: "Countries you found turn back to land after a moment, so the map doesn't show which are left.",
        icon: svg(EYE + SLASH),
      },
    ],
  },
}

export const DEFAULT_MODIFIERS: ModifierSettings = {
  flag: 'name-and-flag',
  guesses: 'two-guesses',
  hints: 'hints',
  results: 'shown',
}

export function modifierState(id: ModifierId, settings: ModifierSettings): ModifierState {
  const modifier = MODIFIERS[id]
  return modifier.states.find((state) => state.id === settings[id]) ?? modifier.states[0]
}

/** The settings with one Modifier moved to its next State (wrapping back to the default). */
export function nextModifierState(id: ModifierId, settings: ModifierSettings): ModifierSettings {
  const states = MODIFIERS[id].states
  const index = states.indexOf(modifierState(id, settings))
  return { ...settings, [id]: states[(index + 1) % states.length].id }
}

export function isDefaultState(id: ModifierId, settings: ModifierSettings): boolean {
  return modifierState(id, settings) === MODIFIERS[id].states[0]
}

/** Fills in missing or unknown States with the defaults, e.g. for settings stored by an older version. */
export function normalizeModifiers(stored: unknown): ModifierSettings {
  const result = { ...DEFAULT_MODIFIERS }
  if (!stored || typeof stored !== 'object') return result
  for (const modifier of Object.values(MODIFIERS)) {
    const value = (stored as Record<string, unknown>)[modifier.id]
    if (modifier.states.some((state) => state.id === value)) Object.assign(result, { [modifier.id]: value })
  }
  return result
}
