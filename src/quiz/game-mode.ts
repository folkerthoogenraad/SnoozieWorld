import { countryInfo } from '../country/country-info.ts'
import type { Country } from '../country/country.ts'
import type { ModifierId, ModifierSettings } from './modifier.ts'

export type GameModeId = 'name-to-location' | 'capital-to-location'

/** What a Prompt asks. Every Game Mode is answered by clicking the Country on the Map. */
export interface GameMode {
  id: GameModeId
  label: string
  description: string
  /** The Modifiers the player can set for this Game Mode, in the order shown. */
  modifierIds: readonly ModifierId[]
  /** Whether a Country can be asked in this Game Mode with these Modifiers. */
  canAsk(country: Country, modifiers: ModifierSettings): boolean
}

export const GAME_MODES: readonly GameMode[] = [
  {
    id: 'name-to-location',
    label: 'Name to Location',
    description: 'You get a country; click it on the map.',
    modifierIds: ['flag', 'guesses', 'hints'],
    // A shared Flag (e.g. Réunion uses the French one) would have two right answers.
    canAsk: (country, modifiers) => modifiers.flag !== 'flag-only' || country.distinctFlag,
  },
  {
    id: 'capital-to-location',
    label: 'Capital to Location',
    description: 'You get a capital city; click its country on the map.',
    modifierIds: ['guesses', 'hints'],
    canAsk: (country) => !!countryInfo(country)?.capital,
  },
]

export function gameModeById(id: GameModeId): GameMode {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0]
}
