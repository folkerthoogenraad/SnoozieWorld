import type { Continent, Country } from '../country/country.ts'

/** A group of Countries the player can tick on the Start Screen. */
export interface Category {
  id: string
  label: string
  includes(country: Country): boolean
}

const CONTINENTS: Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']

export const CATEGORIES: readonly Category[] = [
  ...CONTINENTS.map((continent) => ({
    id: continent.toLowerCase().replace(' ', '-'),
    label: continent,
    includes: (country: Country) => country.kind === 'sovereign' && country.continent === continent,
  })),
  {
    id: 'overseas-territories',
    label: 'Overseas Territories',
    includes: (country: Country) => country.kind === 'territory',
  },
]
