import { createCountryInfoButton } from '../country-info/country-info-button.ts'
import type { CountryInfoDialog } from '../country-info/country-info-dialog.ts'
import { createCountryLabel } from '../country/country-label.ts'
import type { Country } from '../country/country.ts'
import type { WorldMap } from '../map/world-map.ts'
import type { Mode } from '../mode.ts'
import type { Navbar } from '../navbar/navbar.ts'

/**
 * Explore Mode: free practice, not a game. Hovering highlights a Country;
 * clicking (or tapping) it makes it the Explored Country: it is Selected on
 * the Map and its Flag and name appear in the Navbar, where clicking them
 * opens Country Info. Clicking the Ocean clears the Explored Country.
 */
export class ExploreMode implements Mode {
  private readonly map: WorldMap
  private readonly navbar: Navbar
  private readonly countryInfo: CountryInfoDialog
  private exploredCountry: Country | null = null
  private stopListening: (() => void)[] = []

  constructor(options: { map: WorldMap; navbar: Navbar; countryInfo: CountryInfoDialog }) {
    this.map = options.map
    this.navbar = options.navbar
    this.countryInfo = options.countryInfo
  }

  start(): void {
    this.stopListening = [
      this.map.onCountryHover((country) => this.map.setHighlightedCountry(country?.id ?? null)),
      this.map.onCountryClick((country) => this.explore(country)),
    ]
  }

  stop(): void {
    this.stopListening.forEach((stop) => stop())
    this.stopListening = []
    this.map.setHighlightedCountry(null)
    this.explore(null)
  }

  private explore(country: Country | null): void {
    if (country === this.exploredCountry) return
    this.exploredCountry = country
    this.map.setSelectedCountry(country?.id ?? null)
    this.navbar.setStatus(
      country
        ? createCountryInfoButton(createCountryLabel(country), `More about ${country.name}`, () =>
            this.countryInfo.open(country),
          )
        : null,
    )
  }
}
