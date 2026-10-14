import type { CountryState, WorldMap } from '../map/world-map.ts'

// How long a found Prompt keeps its result colour before it turns back to land (ms).
const RESULT_DURATION = 1000

/**
 * Colours a found Prompt for a moment, then turns it back to land, so the Map
 * doesn't show which Countries were already found: in Practice Mode, and in a
 * Quiz Run with the Results Modifier on Hidden.
 */
export class FadingResult {
  private readonly map: WorldMap
  /** The found Prompt still showing its result colour. */
  private shown: { countryId: string; timeout: number } | null = null

  constructor(map: WorldMap) {
    this.map = map
  }

  show(countryId: string, state: CountryState): void {
    this.clear()
    this.map.setCountryState(countryId, state)
    this.shown = { countryId, timeout: window.setTimeout(() => this.clear(), RESULT_DURATION) }
  }

  /** Turns the Country still showing its colour back to land now. */
  clear(): void {
    if (!this.shown) return
    window.clearTimeout(this.shown.timeout)
    this.map.setCountryState(this.shown.countryId, null)
    this.shown = null
  }
}
