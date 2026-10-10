// Builds the Country dataset used by the Map.
//
// Source: Natural Earth 1:10m Admin 0 – Countries and Map Units (public domain).
// https://www.naturalearthdata.com/about/terms-of-use/
//
// Countries are Natural Earth's Admin 0 Countries, except that:
// - Overseas Territories drawn as part of their parent (e.g. French Guiana as
//   part of France) are split off into Countries of their own, using the Map
//   Units dataset;
// - small disputed or leased areas are merged into the Country that holds
//   them (e.g. Somaliland into Somalia), so they don't show up as gaps in a Quiz.
//
// Usage: npm run build:map-data
// Output: public/data/countries.topo.json

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea } from 'd3-geo'
import { topology } from 'topojson-server'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import { feature, merge, quantize } from 'topojson-client'

const SOURCE_BASE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, 'scripts', '.cache')
const flagDir = join(root, 'node_modules', 'flag-icons', 'flags', '4x3')
const outputPath = join(root, 'public', 'data', 'countries.topo.json')

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
const CONTINENT_OVERRIDES = {
  REU: 'Africa',
  SYC: 'Africa',
  MUS: 'Africa',
  SHN: 'Africa',
  MDV: 'Asia',
  IOT: 'Asia',
  ATF: 'Antarctica',
  HMD: 'Antarctica',
  SGS: 'Antarctica',
  CLP: 'North America',
  CYP: 'Europe',
}

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

// flag-icons' SVGs differ only in their ids when two flags look the same
// (e.g. Réunion uses the French flag), so compare them with the ids removed.
async function flagFingerprint(isoA2) {
  const code = isoA2?.toLowerCase()
  const path = join(flagDir, `${code}.svg`)
  if (!code || !existsSync(path)) return null
  const svg = (await readFile(path, 'utf8')).replace(/<svg[^>]*>/, '').replaceAll(`${code}-`, '')
  return createHash('sha1').update(svg).digest('hex')
}

// A Flag is distinct when no other Country has the same one. Sovereign states
// always count as distinct: a territory sharing their flag loses out instead.
async function markDistinctFlags(features) {
  const fingerprints = await Promise.all(features.map((f) => flagFingerprint(f.properties.isoA2)))
  const sovereignFlags = new Set(fingerprints.filter((fp, i) => fp && features[i].properties.kind === 'sovereign'))
  const counts = new Map()
  for (const fp of fingerprints) if (fp) counts.set(fp, (counts.get(fp) ?? 0) + 1)
  features.forEach((f, i) => {
    const fp = fingerprints[i]
    f.properties.distinctFlag =
      fp !== null && (f.properties.kind === 'sovereign' || (!sovereignFlags.has(fp) && counts.get(fp) === 1))
  })
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

const ids = new Set()
for (const f of features) {
  if (ids.has(f.id)) throw new Error(`Duplicate Country id ${f.id}`)
  ids.add(f.id)
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
let points = 0
for (const arc of topo.arcs) points += arc.length
const kinds = Object.groupBy(features, (f) => f.properties.kind)
console.log(
  `Wrote ${features.length} Countries (${kinds.sovereign.length} sovereign, ${kinds.territory.length} territories, ` +
    `${kinds.other.length} other) to ${outputPath} (${points} points, ${(json.length / 1024).toFixed(0)} KiB)`,
)
