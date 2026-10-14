import type { Country } from './country.ts'

/** Maps each image's file name (without .svg) to its URL. */
function urlsByName(urls: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(urls).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), url]),
  )
}

// Flag images from flag-icons (MIT), keyed by lowercase ISO 3166-1 alpha-2 code.
// Only the URLs are bundled; each image is downloaded when it is first shown.
const flagUrls = urlsByName(
  import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
    query: '?no-inline',
    import: 'default',
    eager: true,
  }),
)

// US State Flags from Wikimedia Commons (public domain), keyed by Country id ("US-CA").
// See us-state-flags/SOURCES.md and scripts/fetch-us-state-flags.mjs.
const stateFlagUrls = urlsByName(
  import.meta.glob<string>('./us-state-flags/*.svg', {
    query: '?no-inline',
    import: 'default',
    eager: true,
  }),
)

/** Returns the URL of the Country's Flag, or null when it has none (e.g. disputed areas). */
export function flagUrl(country: Country): string | null {
  if (country.kind === 'state') return stateFlagUrls[country.id] ?? null
  return (country.isoA2 && flagUrls[country.isoA2.toLowerCase()]) || null
}
