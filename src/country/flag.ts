import type { Country } from './country.ts'

// Flag images from flag-icons (MIT), keyed by lowercase ISO 3166-1 alpha-2 code.
// Only the URLs are bundled; each image is downloaded when it is first shown.
const flagUrls = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
      query: '?no-inline',
      import: 'default',
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), url]),
)

/** Returns the URL of the Country's Flag, or null when it has none (e.g. disputed areas). */
export function flagUrl(country: Country): string | null {
  return (country.isoA2 && flagUrls[country.isoA2.toLowerCase()]) || null
}
