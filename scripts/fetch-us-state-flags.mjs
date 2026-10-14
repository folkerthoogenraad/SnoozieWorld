// Downloads the Flags of the US States from Wikimedia Commons.
//
// Only files that Commons marks as public domain (or "Copyrighted free use",
// i.e. free for any use without conditions) are accepted; the script stops on
// any other licence. Writes one SVG per State, named by its ISO 3166-2 code
// (e.g. US-CA.svg), and SOURCES.md listing each file's source page and licence.
//
// Usage: npm run fetch:us-state-flags
// Output: src/country/us-state-flags/

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_URL = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'SnoozieWorld/1.0 (map quiz; scripts/fetch-us-state-flags.mjs)'
const ACCEPTED_LICENCES = ['Public domain', 'Copyrighted free use']

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'src', 'country', 'us-state-flags')

// The Commons file of each State's Flag, by Country id.
const FILES = {
  'US-AL': 'Flag of Alabama.svg',
  'US-AK': 'Flag of Alaska.svg',
  'US-AZ': 'Flag of Arizona.svg',
  'US-AR': 'Flag of Arkansas.svg',
  'US-CA': 'Flag of California.svg',
  'US-CO': 'Flag of Colorado.svg',
  'US-CT': 'Flag of Connecticut.svg',
  'US-DE': 'Flag of Delaware.svg',
  'US-DC': 'Flag of Washington, D.C.svg',
  'US-FL': 'Flag of Florida.svg',
  'US-GA': 'Flag of the State of Georgia.svg',
  'US-HI': 'Flag of Hawaii.svg',
  'US-ID': 'Flag of Idaho.svg',
  'US-IL': 'Flag of Illinois.svg',
  'US-IN': 'Flag of Indiana.svg',
  'US-IA': 'Flag of Iowa.svg',
  'US-KS': 'Flag of Kansas.svg',
  'US-KY': 'Flag of Kentucky.svg',
  'US-LA': 'Flag of Louisiana.svg',
  'US-ME': 'Flag of Maine.svg',
  'US-MD': 'Flag of Maryland.svg',
  'US-MA': 'Flag of Massachusetts.svg',
  'US-MI': 'Flag of Michigan.svg',
  'US-MN': 'Flag of Minnesota.svg',
  'US-MS': 'Flag of Mississippi.svg',
  'US-MO': 'Flag of Missouri.svg',
  'US-MT': 'Flag of Montana.svg',
  'US-NE': 'Flag of Nebraska.svg',
  'US-NV': 'Flag of Nevada.svg',
  'US-NH': 'Flag of New Hampshire.svg',
  'US-NJ': 'Flag of New Jersey.svg',
  'US-NM': 'Flag of New Mexico.svg',
  'US-NY': 'Flag of New York.svg',
  'US-NC': 'Flag of North Carolina.svg',
  'US-ND': 'Flag of North Dakota.svg',
  'US-OH': 'Flag of Ohio.svg',
  'US-OK': 'Flag of Oklahoma.svg',
  'US-OR': 'Flag of Oregon.svg',
  'US-PA': 'Flag of Pennsylvania.svg',
  'US-RI': 'Flag of Rhode Island.svg',
  'US-SC': 'Flag of South Carolina.svg',
  'US-SD': 'Flag of South Dakota.svg',
  'US-TN': 'Flag of Tennessee.svg',
  'US-TX': 'Flag of Texas.svg',
  'US-UT': 'Flag of Utah.svg',
  'US-VT': 'Flag of Vermont.svg',
  'US-VA': 'Flag of Virginia.svg',
  'US-WA': 'Flag of Washington.svg',
  'US-WV': 'Flag of West Virginia.svg',
  'US-WI': 'Flag of Wisconsin.svg',
  'US-WY': 'Flag of Wyoming.svg',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Commons rate-limits downloads (429); waits as long as it asks, then retries.
async function fetchOk(url) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (response.ok) return response
    if (response.status !== 429 || attempt === 5) throw new Error(`${url}: ${response.status}`)
    await sleep(Number(response.headers.get('Retry-After') || 5 * attempt) * 1000)
  }
}

// The download URL, source page and licence of each Commons file, by title.
async function fileInfo(titles) {
  const info = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiextmetadatafilter: 'LicenseShortName',
      titles: titles.slice(i, i + 50).map((title) => `File:${title}`).join('|'),
    })
    const { query } = await (await fetchOk(`${API_URL}?${params}`)).json()
    for (const page of Object.values(query.pages)) {
      if (page.missing !== undefined) throw new Error(`Not on Commons: ${page.title}`)
      const [image] = page.imageinfo
      info.set(page.title.slice('File:'.length), {
        url: image.url,
        page: image.descriptionurl,
        licence: image.extmetadata.LicenseShortName?.value,
      })
    }
  }
  return info
}

// An <img> only scales an SVG to its own size when the SVG has a viewBox; many
// of these only have a width and height.
function addViewBox(svg, title) {
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    if (/\sviewBox=/.test(tag)) return tag
    const size = (name) => tag.match(new RegExp(`\\s${name}="([\\d.]+)(px)?"`))?.[1]
    const [width, height] = [size('width'), size('height')]
    if (!width || !height) throw new Error(`${title} has no viewBox, width or height`)
    return tag.replace(/^<svg/, `<svg viewBox="0 0 ${width} ${height}"`)
  })
}

const info = await fileInfo(Object.values(FILES))
await mkdir(outputDir, { recursive: true })
const sources = []
for (const [id, title] of Object.entries(FILES)) {
  const { url, page, licence } = info.get(title)
  if (!ACCEPTED_LICENCES.includes(licence)) throw new Error(`${title} has licence "${licence}"`)
  await writeFile(join(outputDir, `${id}.svg`), addViewBox(await (await fetchOk(url)).text(), title))
  await sleep(1000)
  sources.push(`| ${id} | [${title}](${page}) | ${licence} |`)
}
await writeFile(
  join(outputDir, 'SOURCES.md'),
  [
    '# US State Flags',
    '',
    'Downloaded from Wikimedia Commons by `scripts/fetch-us-state-flags.mjs`.',
    '',
    '| File | Source | Licence |',
    '| --- | --- | --- |',
    ...sources,
    '',
  ].join('\n'),
)
console.log(`Wrote ${sources.length} US State Flags to ${outputDir}`)
