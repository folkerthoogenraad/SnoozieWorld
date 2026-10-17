// Builds the Country dataset used by the Map.
//
// Source: Natural Earth 1:10m Admin 0 – Countries and Map Units, and Admin 1 –
// States, Provinces (public domain).
// https://www.naturalearthdata.com/about/terms-of-use/
//
// Countries are Natural Earth's Admin 0 Countries, except that:
// - Overseas Territories drawn as part of their parent (e.g. French Guiana as
//   part of France) are split off into Countries of their own, using the Map
//   Units dataset;
// - small disputed or leased areas are merged into the Country that holds
//   them (e.g. Somaliland into Somalia), so they don't show up as gaps in a Quiz.
//
// The US States (Admin 1) are added as extra Countries of kind "state", lying
// on top of the USA. The Map only shows them, instead of the USA, during a Quiz
// with the US states Section. Admin 1 borders match Admin 0 exactly, so
// the States share their arcs with the USA and its neighbours.
//
// Every Sovereign State, US State and Antarctica gets the Region of its
// Continent it lies in (see regionOf), and every Continent a small map for the
// Start Screen (the Continent Icons).
//
// Usage: npm run build:map-data
// Output: public/data/countries.topo.json, src/start-screen/continent-icons.json

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea, geoMercator, geoOrthographic, geoPath } from 'd3-geo'
import { topology } from 'topojson-server'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import { feature, merge, quantize } from 'topojson-client'

const SOURCE_BASE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, 'scripts', '.cache')
const flagDir = join(root, 'node_modules', 'flag-icons', 'flags', '4x3')
const stateFlagDir = join(root, 'src', 'country', 'us-state-flags')
const outputPath = join(root, 'public', 'data', 'countries.topo.json')
const iconsPath = join(root, 'src', 'start-screen', 'continent-icons.json')
const countryInfoPath = join(root, 'src', 'country', 'country-info.json')

// Fraction of points (ranked by Visvalingam weight) kept after simplification.
// Higher keeps more detail (and gives a bigger file).
const SIMPLIFY_QUANTILE = 0.3
// Countries whose bounding box is smaller than this (in square degrees) are
// never simplified, so tiny Countries like Vatican City keep their shape.
const TINY_COUNTRY_AREA = 1
const QUANTIZATION = 1e6
const EARTH_RADIUS_KM = 6371

// Countries (by Admin 0 id) whose Map Units become separate Countries. The
// Map Unit listed here keeps the Country's id and properties; every other
// Map Unit becomes an Overseas Territory with its Map Unit id (GU_A3).
const SPLIT_COUNTRIES = {
  FRA: 'FXX', // French Guiana, Guadeloupe, Martinique, Mayotte, Réunion
  NLD: 'NLX', // Caribbean Netherlands
  NOR: 'NOW', // Svalbard, Jan Mayen, Bouvet Island
  NZL: 'NZL', // Tokelau
  IOA: null, // Australian Indian Ocean Territories: Christmas Island, Cocos Islands
}

// Areas (by Admin 0 id) merged into the Country that holds them.
const MERGE_INTO = {
  SOL: 'SOM', // Somaliland
  CYN: 'CYP', // Northern Cyprus
  CNM: 'CYP', // Cyprus U.N. Buffer Zone
  KAB: 'KAZ', // Baikonur (leased to Russia)
  USG: 'CUB', // Guantanamo Bay Naval Base (leased to the USA)
  BRI: 'BRA', // Brazilian Island (disputed with Uruguay)
  KAS: 'IND', // Siachen Glacier (disputed with Pakistan)
}

// Sovereign states that Natural Earth types as something other than
// "Sovereign country"/"Sovereignty": the main part of a state with
// territories, plus states with limited recognition.
const EXTRA_SOVEREIGN = ['CHN', 'FRA', 'FIN', 'DNK', 'GBR', 'NLD', 'USA', 'AUS', 'NZL', 'ISR', 'KOS', 'PSX', 'SAH']

// Areas that are neither a sovereign state nor an Overseas Territory.
const OTHER_AREAS = ['ATA', 'SPI', 'BRT', 'PGA', 'BJN', 'SER', 'SCR']

// Natural Earth puts some islands on "Seven seas (open ocean)", and Cyprus in Asia.
// A territory belongs to the nearest Continent; the UN geoscheme (M49) decides
// when two are about as near (plan 13).
const CONTINENT_OVERRIDES = {
  REU: 'Africa',
  SYC: 'Africa',
  MUS: 'Africa',
  SHN: 'Africa',
  MDV: 'Asia',
  IOT: 'Asia', // about 600 km south of the Maldives
  ATF: 'Antarctica',
  HMD: 'Antarctica',
  SGS: 'South America', // as far from the Falklands as from Antarctica; M49 says South America
  CLP: 'North America',
  CYP: 'Europe',
  WSB: 'Europe', // Akrotiri and Dhekelia lie on Cyprus
  ESB: 'Europe',
  UMI: 'Oceania', // all but Navassa lie in the Pacific
}

// The Regions of the Continents (plans 13 and 15). In Europe a Sovereign State
// not listed here is on the Mainland; in Africa, Asia and Oceania the Region
// follows Natural Earth's subregion (the UN's), and South America and
// Antarctica are one Region each. Island countries lie entirely on islands
// without a land border to the mainland.
const ISLAND_COUNTRIES = ['CYP', 'GBR', 'IRL', 'ISL', 'MLT']
const BALKANS = ['ALB', 'BGR', 'BIH', 'HRV', 'KOS', 'MDA', 'MKD', 'MNE', 'ROU', 'SRB']
const SUBREGION_REGIONS = {
  Africa: {
    'Northern Africa': 'north',
    'Western Africa': 'west',
    'Middle Africa': 'central',
    'Eastern Africa': 'east',
    'Southern Africa': 'southern',
  },
  Asia: {
    'Western Asia': 'middle-east-and-caucasus',
    'Central Asia': 'central-and-south',
    'Southern Asia': 'central-and-south',
    'Eastern Asia': 'east-and-southeast',
    'South-Eastern Asia': 'east-and-southeast',
  },
  Oceania: {
    'Australia and New Zealand': 'australia-nz',
    Melanesia: 'melanesia',
    Micronesia: 'micronesia',
    Polynesia: 'polynesia',
  },
}
// The one Other Area that can be asked: it has a Flag, but no capital.
const ASKABLE_OTHER_AREA = 'ATA'

// Natural Earth names that are wrong or not the common English name.
const NAME_OVERRIDES = {
  CHN: 'China',
  CZE: 'Czechia',
  PGA: 'Spratly Islands',
  ESB: 'Dhekelia',
  WSB: 'Akrotiri',
  NJM: 'Jan Mayen',
  NSV: 'Svalbard',
  BVT: 'Bouvet Island',
  CCK: 'Cocos (Keeling) Islands',
  CXR: 'Christmas Island',
}

// The Country whose States are added, and the names that clash with a Country's.
const STATES_OF = 'USA'
const STATE_NAME_OVERRIDES = {
  'US-GA': 'Georgia (US state)',
}

// Continent Icons: a small map per Continent, the world in grey with the
// Continent highlighted. Each Continent is cropped to its box (Mercator, in
// degrees: [[west, south], [east, north]]); Antarctica is seen from below.
const ICON_WIDTH = 64
const ICON_HEIGHT = 44
// Fraction of points kept: just enough for a recognisable outline, a few KB per icon.
const ICON_SIMPLIFY_QUANTILE = 0.997
const ICON_BOXES = {
  africa: [[-26, -37], [60, 38]],
  asia: [[26, -11], [150, 58]],
  europe: [[-25, 34], [45, 71]],
  'north-america': [[-168, 6], [-12, 76]],
  'south-america': [[-88, -56], [-32, 13]],
  oceania: [[110, -48], [205, 20]],
}

/**
 * The Region of a Country within its Continent, e.g. "balkans". Null for
 * Overseas Territories (each Continent quizzes them in Sections of their own)
 * and Other Areas (never asked), except Antarctica.
 */
function regionOf(id, p) {
  if (p.kind === 'state') return 'us-states'
  if (id === ASKABLE_OTHER_AREA) return 'antarctica'
  if (p.kind !== 'sovereign') return null
  if (BALKANS.includes(id)) return 'balkans'
  // Undefined for an unknown subregion, so the build stops.
  if (p.continent in SUBREGION_REGIONS) return SUBREGION_REGIONS[p.continent][p.subregion]
  switch (p.continent) {
    case 'South America':
      return 'south-america'
    case 'North America':
      return p.subregion === 'Caribbean' ? 'islands' : 'mainland'
    default:
      return ISLAND_COUNTRIES.includes(id) ? 'islands' : 'mainland'
  }
}

async function loadSource(name) {
  const path = join(cacheDir, `${name}.geojson`)
  if (!existsSync(path)) {
    const url = `${SOURCE_BASE_URL}${name}.geojson`
    console.log(`Downloading ${url}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    await mkdir(cacheDir, { recursive: true })
    await writeFile(path, await response.text())
  }
  return JSON.parse(await readFile(path, 'utf8'))
}

// Natural Earth uses "-99" for "no code".
const code = (value) => (value && value !== '-99' ? value : null)

function kindOf(id, p) {
  if (OTHER_AREAS.includes(id)) return 'other'
  if (p.TYPE === 'Sovereign country' || p.TYPE === 'Sovereignty' || EXTRA_SOVEREIGN.includes(id)) return 'sovereign'
  return 'territory'
}

function countryProperties(id, p, kind = kindOf(id, p)) {
  return {
    name: NAME_OVERRIDES[id] ?? (p.NAME_EN || p.NAME),
    kind,
    isoA2: code(p.ISO_A2_EH),
    isoA3: code(p.ISO_A3_EH),
    sovereign: p.SOV_A3,
    continent: CONTINENT_OVERRIDES[id] ?? p.CONTINENT,
    subregion: p.SUBREGION,
    labelPoint: [p.LABEL_X, p.LABEL_Y],
  }
}

// A US State, keyed by its ISO 3166-2 code (e.g. "US-CA"). Its Flag is looked
// up by that id (see scripts/fetch-us-state-flags.mjs), not by isoA2.
function stateProperties(id, p) {
  const country = admin0Properties.get(STATES_OF)
  return {
    name: STATE_NAME_OVERRIDES[id] ?? p.name,
    kind: 'state',
    isoA2: null,
    isoA3: null,
    sovereign: p.sov_a3,
    continent: country.CONTINENT,
    subregion: country.SUBREGION,
    labelPoint: [p.longitude, p.latitude],
    stateOf: STATES_OF,
  }
}

// flag-icons' SVGs differ only in their ids when two flags look the same
// (e.g. Réunion uses the French flag), so compare them with the ids removed.
async function flagFingerprint(f) {
  const code = f.properties.kind === 'state' ? f.id : f.properties.isoA2?.toLowerCase()
  const path = join(f.properties.kind === 'state' ? stateFlagDir : flagDir, `${code}.svg`)
  if (!code || !existsSync(path)) return null
  const svg = (await readFile(path, 'utf8')).replace(/<svg[^>]*>/, '').replaceAll(`${code}-`, '')
  return createHash('sha1').update(svg).digest('hex')
}

// A Flag is distinct when no other Country has the same one. Sovereign states
// always count as distinct: a territory sharing their flag loses out instead.
async function markDistinctFlags(features) {
  const fingerprints = await Promise.all(features.map(flagFingerprint))
  const sovereignFlags = new Set(fingerprints.filter((fp, i) => fp && features[i].properties.kind === 'sovereign'))
  const counts = new Map()
  for (const fp of fingerprints) if (fp) counts.set(fp, (counts.get(fp) ?? 0) + 1)
  features.forEach((f, i) => {
    const fp = fingerprints[i]
    f.properties.distinctFlag =
      fp !== null && (f.properties.kind === 'sovereign' || (!sovereignFlags.has(fp) && counts.get(fp) === 1))
  })
}

const continentId = (continent) => continent.toLowerCase().replace(' ', '-')

/**
 * An SVG path of `object` for a Continent icon. Draws on a half-pixel grid,
 * skips points on a straight line, and drops rings smaller than a pixel, which
 * keeps the icons small.
 */
function iconPath(projection, object) {
  const rings = []
  let ring
  const context = {
    moveTo(x, y) {
      ring = []
      rings.push(ring)
      this.lineTo(x, y)
    },
    lineTo(x, y) {
      const point = [Math.round(x * 2) / 2, Math.round(y * 2) / 2]
      const last = ring.at(-1)
      if (!last || last[0] !== point[0] || last[1] !== point[1]) ring.push(point)
    },
    closePath() {
      for (let i = ring.length - 2; i > 0; i--) {
        const [[ax, ay], [bx, by], [cx, cy]] = [ring[i - 1], ring[i], ring[i + 1]]
        if ((bx - ax) * (cy - ay) === (by - ay) * (cx - ax)) ring.splice(i, 1)
      }
    },
    arc() {},
  }
  geoPath(projection, context)(object)
  const area = (r) =>
    Math.abs(r.reduce((sum, [x, y], i) => {
      const [x2, y2] = r[(i + 1) % r.length]
      return sum + x * y2 - x2 * y
    }, 0)) / 2
  return rings
    .filter((r) => r.length >= 3 && area(r) >= 1)
    .map((r) => {
      // The first point, then relative line-tos: "M12.5 30l.5 1.5-1 .5Z".
      const steps = r.slice(1).flatMap(([x, y], i) => [x - r[i][0], y - r[i][1]])
      return `M${svgNumbers(r[0])}l${svgNumbers(steps)}Z`
    })
    .join('')
}

/** Numbers as SVG path data, as short as possible: "1.5.5-2" is 1.5, 0.5 and -2. */
function svgNumbers(numbers) {
  let text = ''
  for (const n of numbers) {
    const number = String(n).replace(/^(-?)0\./, '$1.')
    const last = text.slice(text.lastIndexOf(' ') + 1)
    const joined = number.startsWith('-') || (number.startsWith('.') && /\.\d*$/.test(last.split('-').at(-1)))
    text += !text || joined ? number : ` ${number}`
  }
  return text
}

/**
 * The Continent icons, from the finished topology: `{ [continentId]: { world, land } }`,
 * two SVG paths in a ICON_WIDTH × ICON_HEIGHT box. The US States are left out:
 * the USA already covers them.
 */
function continentIcons(topo) {
  const presimplified = presimplify(topo)
  const simple = simplify(presimplified, quantile(presimplified, ICON_SIMPLIFY_QUANTILE))
  const geometries = simple.objects.countries.geometries.filter((g) => g.properties.kind !== 'state')
  const world = merge(simple, geometries)
  const icons = {}
  for (const id of [...Object.keys(ICON_BOXES), 'antarctica']) {
    let projection
    if (id === 'antarctica') {
      projection = geoOrthographic()
        .rotate([0, 90])
        .fitExtent([[2, 2], [ICON_WIDTH - 2, ICON_HEIGHT - 2]], { type: 'Sphere' })
        .clipAngle(45)
      projection.scale(projection.scale() * 2.2)
    } else {
      const [[x0, y0], [x1, y1]] = ICON_BOXES[id]
      const box = { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y1], [x0, y1], [x1, y0]] }
      projection = geoMercator()
        .rotate([-(x0 + x1) / 2, 0])
        .fitExtent([[2, 2], [ICON_WIDTH - 2, ICON_HEIGHT - 2]], box)
        .clipExtent([[0, 0], [ICON_WIDTH, ICON_HEIGHT]])
    }
    const land = merge(simple, geometries.filter((g) => continentId(g.properties.continent) === id))
    icons[id] = { world: iconPath(projection, world), land: iconPath(projection, land) }
  }
  return icons
}

/**
 * What each Continent can quiz, per Region and for its (inhabited and
 * uninhabited) Overseas Territories, to compare with the table in plan 13.
 */
async function reportRegions(features) {
  const info = JSON.parse(await readFile(countryInfoPath, 'utf8'))
  const counts = {}
  for (const { id, properties: p } of features) {
    const part =
      p.kind === 'territory' ? (info[id]?.population === 0 ? 'uninhabited' : 'territories') : p.region
    if (!part) continue
    counts[p.continent] ??= {}
    counts[p.continent][part] = (counts[p.continent][part] ?? 0) + 1
  }
  for (const [continent, parts] of Object.entries(counts).sort()) {
    console.log(`  ${continent}: ${Object.entries(parts).map(([part, n]) => `${part} ${n}`).join(', ')}`)
  }
}

function bboxArea(geometry) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  const visit = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0])
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1])
    } else c.forEach(visit)
  }
  visit(geometry.coordinates)
  return (maxX - minX) * (maxY - minY)
}

// Gives every point of a tiny Country's arcs an infinite weight, which
// simplify() never removes.
function protectTinyCountries(topo, features) {
  const tiny = new Set(features.filter((f) => bboxArea(f.geometry) < TINY_COUNTRY_AREA).map((f) => f.id))
  const markArcs = (arcs) => {
    for (const a of arcs) {
      if (Array.isArray(a)) markArcs(a)
      else for (const point of topo.arcs[a < 0 ? ~a : a]) point[2] = Infinity
    }
  }
  for (const geometry of topo.objects.countries.geometries) {
    if (tiny.has(geometry.id)) markArcs(geometry.arcs)
  }
}

const admin0 = await loadSource('ne_10m_admin_0_countries')
const mapUnits = await loadSource('ne_10m_admin_0_map_units')
const admin1 = await loadSource('ne_10m_admin_1_states_provinces')

const admin0Properties = new Map(admin0.features.map((f) => [f.properties.ADM0_A3, f.properties]))

// All Map Units share one topology, so merging them back into whole
// Countries gives exact shapes without slivers along internal borders.
const unitsTopology = topology({
  units: { type: 'FeatureCollection', features: mapUnits.features.map((f) => ({ ...f, id: f.properties.GU_A3 })) },
})
const unitGeometries = Map.groupBy(unitsTopology.objects.units.geometries, (g) => {
  const adminId = g.properties.ADM0_A3
  return MERGE_INTO[adminId] ?? adminId
})

const features = []
for (const [adminId, geometries] of unitGeometries) {
  if (adminId in SPLIT_COUNTRIES) {
    const coreUnit = SPLIT_COUNTRIES[adminId]
    for (const g of geometries) {
      const isCore = g.id === coreUnit
      features.push({
        type: 'Feature',
        id: isCore ? adminId : g.id,
        properties: isCore
          ? countryProperties(adminId, admin0Properties.get(adminId))
          : countryProperties(g.id, g.properties, 'territory'),
        geometry: feature(unitsTopology, g).geometry,
      })
    }
  } else {
    features.push({
      type: 'Feature',
      id: adminId,
      properties: countryProperties(adminId, admin0Properties.get(adminId)),
      geometry: geometries.length === 1 ? feature(unitsTopology, geometries[0]).geometry : merge(unitsTopology, geometries),
    })
  }
}

for (const f of admin1.features) {
  if (f.properties.adm0_a3 !== STATES_OF) continue
  const id = f.properties.iso_3166_2
  features.push({ type: 'Feature', id, properties: stateProperties(id, f.properties), geometry: f.geometry })
}

const ids = new Set()
for (const f of features) {
  if (ids.has(f.id)) throw new Error(`Duplicate Country id ${f.id}`)
  ids.add(f.id)
  f.properties.region = regionOf(f.id, f.properties)
  if (f.properties.region === undefined) throw new Error(`No Region for ${f.id}`)
  f.properties.area = Math.round(geoArea(f) * EARTH_RADIUS_KM ** 2 * 10) / 10 // km², one decimal
}
await markDistinctFlags(features)

let topo = topology({ countries: { type: 'FeatureCollection', features } })
topo = presimplify(topo)
protectTinyCountries(topo, features)
topo = simplify(topo, quantile(topo, SIMPLIFY_QUANTILE))
topo = quantize(topo, QUANTIZATION)

await mkdir(dirname(outputPath), { recursive: true })
const json = JSON.stringify(topo)
await writeFile(outputPath, json)
await writeFile(iconsPath, `${JSON.stringify(continentIcons(JSON.parse(json)), null, 2)}\n`)
let points = 0
for (const arc of topo.arcs) points += arc.length
const kinds = Object.groupBy(features, (f) => f.properties.kind)
console.log(
  `Wrote ${features.length} Countries (${kinds.sovereign.length} sovereign, ${kinds.territory.length} territories, ` +
    `${kinds.other.length} other, ${kinds.state.length} states) to ${outputPath} (${points} points, ${(json.length / 1024).toFixed(0)} KiB)`,
)
await reportRegions(features)
const iconsSize = (await readFile(iconsPath)).length
console.log(`Wrote the Continent icons to ${iconsPath} (${(iconsSize / 1024).toFixed(0)} KiB)`)
