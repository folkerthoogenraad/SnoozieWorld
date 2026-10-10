import type { Country } from './country.ts'
import data from './country-info.json'

/** A Fun Fact and the web page that confirms it. */
export interface FunFact {
  text: string
  /** URL of the source. */
  source: string
}

/**
 * Country Info: facts about a Country that the map dataset doesn't have.
 * Hand-maintained in country-info.json (see docs/architecture.md).
 */
export interface CountryInfo {
  /** Null when the Country has no capital, e.g. uninhabited islands. */
  capital: string | null
  /** Set when the capital is split or disputed, e.g. "Seat of government: The Hague". */
  capitalNote?: string
  /** [longitude, latitude] of the capital. */
  capitalPoint: [number, number] | null
  /** Recent estimate; 0 when uninhabited. */
  population: number
  /** Total area in km², as commonly cited. */
  area: number
  /** Only facts with a source; may be empty. */
  funFacts: FunFact[]
  /** For an Overseas Territory: the id of the Sovereign State it belongs to. */
  partOf?: string
}

const INFO = data as unknown as Record<string, CountryInfo>

export function countryInfo(country: Pick<Country, 'id'>): CountryInfo | null {
  return INFO[country.id] ?? null
}

// Capitals with the same name, e.g. Kingston (Jamaica and Norfolk Island).
const capitalCounts = new Map<string, number>()
for (const info of Object.values(INFO)) {
  if (info.capital) capitalCounts.set(info.capital, (capitalCounts.get(info.capital) ?? 0) + 1)
}

/** The capital as asked in a Prompt: "Canberra", or "Kingston (Oceania)" when another capital has the same name. */
export function capitalPrompt(country: Country): string | null {
  const capital = countryInfo(country)?.capital
  if (!capital) return null
  return (capitalCounts.get(capital) ?? 0) > 1 ? `${capital} (${country.continent})` : capital
}

/** "17.9 million", "1.41 billion", or the exact number below a million. */
export function formatPopulation(population: number): string {
  if (population === 0) return 'Uninhabited'
  for (const [size, word] of [
    [1e9, 'billion'],
    [1e6, 'million'],
  ] as const) {
    if (population >= size) return `${(population / size).toLocaleString('en', { maximumSignificantDigits: 3 })} ${word}`
  }
  return population.toLocaleString('en')
}

export function formatArea(area: number): string {
  return `${area.toLocaleString('en')} km²`
}
