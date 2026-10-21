import { currentLanguage, type LanguageId } from '../language/language.ts'
import { countryInfo, countryInfoIds } from './country-info.ts'
import type { Country } from './country.ts'
import nl from './country-names/nl.json'

/** A Country's name and capital in another Language than English. */
interface TranslatedNames {
  name: string
  capital: string | null
}

/**
 * The translated names per Language, keyed by Country id; English comes from
 * the dataset and Country Info. Hand-maintained (see docs/architecture.md).
 */
const TRANSLATIONS: Record<Exclude<LanguageId, 'en'>, Record<string, TranslatedNames>> = { nl }

function translated(country: Pick<Country, 'id'>, language: LanguageId): TranslatedNames | null {
  return language === 'en' ? null : (TRANSLATIONS[language][country.id] ?? null)
}

/** The Country's name in the Language, by default the current one. */
export function countryName(country: Country, language = currentLanguage()): string {
  return translated(country, language)?.name ?? country.name
}

/** The Country's capital in the Language, by default the current one; null when it has none. */
export function capitalName(country: Pick<Country, 'id'>, language = currentLanguage()): string | null {
  const capital = countryInfo(country)?.capital ?? null
  return capital && (translated(country, language)?.capital ?? capital)
}

/** Sorts Countries by their name in the current Language. */
export function byCountryName(a: Country, b: Country): number {
  const language = currentLanguage()
  return countryName(a, language).localeCompare(countryName(b, language), language)
}

// Capitals with the same name, e.g. Kingston (Jamaica and Norfolk Island), per Language.
const capitalCounts = new Map<LanguageId, Map<string, number>>()

function capitalCount(capital: string, language: LanguageId): number {
  let counts = capitalCounts.get(language)
  if (!counts) {
    counts = new Map()
    for (const id of countryInfoIds()) {
      const name = capitalName({ id }, language)
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    capitalCounts.set(language, counts)
  }
  return counts.get(capital) ?? 0
}

/** The capital as asked in a Prompt: "Canberra", or "Kingston (Oceania)" when another capital has the same name. */
export function capitalPrompt(country: Country, language = currentLanguage()): string | null {
  const capital = capitalName(country, language)
  if (!capital) return null
  return capitalCount(capital, language) > 1 ? `${capital} (${country.continent})` : capital
}
