# Plan 15: Further subdivisions — Asia and Africa

Status: **agreed, implemented**. Request: [docs/requests/15-further-subdivisions.md](../requests/15-further-subdivisions.md).

This plan covers **Asia and Africa**. Europe stays as it is for now (decided); the UN's regions for Europe would
replace the Balkans.

## Goal

Asia and Africa are divided into geographic parts, so the player can quiz a part that feels like a whole: *East and
Southeast* Asia, *West* Africa. Their *Mainland* and *Islands* Regions go away: an island country is now in the part of
the Continent it lies in, so Japan is quizzed with China and Madagascar with East Africa.

## Regions of Asia

West to east. The UN's regions (M49), which are Natural Earth's subregions, paired up. Every Sovereign State of Asia
is in exactly one.

| Region | Countries | |
| --- | --- | --- |
| Middle East and Caucasus | Armenia, Azerbaijan, Bahrain, Georgia, Iraq, Israel, Jordan, Kuwait, Lebanon, Oman, Palestine, Qatar, Saudi Arabia, Syria, Turkey, United Arab Emirates, Yemen | 17 |
| Central and South | Afghanistan, Bangladesh, Bhutan, India, Iran, Kazakhstan, Kyrgyzstan, Maldives, Nepal, Pakistan, Sri Lanka, Tajikistan, Turkmenistan, Uzbekistan | 14 |
| East and Southeast | Brunei, Cambodia, China, East Timor, Indonesia, Japan, Laos, Malaysia, Mongolia, Myanmar, North Korea, Philippines, Singapore, South Korea, Taiwan, Thailand, Vietnam | 17 |

- **Iran** moves from the Middle East to Central and South, as the UN has it (South Asia). **Afghanistan** is South
  Asia too.
- **Sri Lanka and the Maldives** are South Asia; **Bahrain** stays with the Middle East (no longer an exception, as
  there are no Islands in Asia any more). **Myanmar** is Southeast Asia.

## Regions of Africa

North to south. The UN's regions (M49), which are Natural Earth's subregions.

| Region | Countries | |
| --- | --- | --- |
| North | Algeria, Egypt, Libya, Morocco, Sudan, Tunisia, Western Sahara | 7 |
| West | Benin, Burkina Faso, Cape Verde, Gambia, Ghana, Guinea, Guinea-Bissau, Ivory Coast, Liberia, Mali, Mauritania, Niger, Nigeria, Senegal, Sierra Leone, Togo | 16 |
| Central | Angola, Cameroon, Central African Republic, Chad, Democratic Republic of the Congo, Equatorial Guinea, Gabon, Republic of the Congo, São Tomé and Príncipe | 9 |
| East | Burundi, Comoros, Djibouti, Eritrea, Ethiopia, Kenya, Madagascar, Malawi, Mauritius, Mozambique, Rwanda, Seychelles, Somalia, South Sudan, Tanzania, Uganda, Zambia, Zimbabwe | 18 |
| Southern | Botswana, Eswatini, Lesotho, Namibia, South Africa | 5 |

- **Western Sahara** is a Sovereign State in our data, so North has 7 rather than the UN's 6.
- **Islands**: Cape Verde is West, São Tomé and Príncipe Central, and Madagascar, Comoros, Mauritius and the Seychelles
  East.
- Following the UN, Zambia, Zimbabwe, Mozambique and Malawi are East, which keeps Southern small (5).

## What stays the same

- **Each Continent at its default quizzes exactly what it does now**: Asia 48 (Mainland 24 + Middle East 15 + Islands
  9), Africa 55 (Mainland 49 + Islands 6). So the `asia` and `africa` Leaderboards are kept.
- Their *Overseas territories* and *Uninhabited islands* Sections are unchanged: one per Continent, as decided in plan
  13. Asia: Hong Kong, Macau, Christmas Island, Cocos (Keeling) Islands; uninhabited: British Indian Ocean Territory.
  Africa: Mayotte, Réunion, Saint Helena.

## Ids, labels and the summary line

The Section heading is the short name, without the Continent's name, so the label never repeats it. In *without …*
the summary line uses the full name, which reads better there.

| Region id | Section heading | Summary line |
| --- | --- | --- |
| `asia/middle-east-and-caucasus` | Middle East and Caucasus | *Asia (Middle East and Caucasus)* · *Asia (without the Middle East and Caucasus)* |
| `asia/central-and-south` | Central and South | *Asia (Central and South)* · *Asia (without Central and South Asia)* |
| `asia/east-and-southeast` | East and Southeast | *Asia (East and Southeast)* · *Asia (without East and Southeast Asia)* |
| `africa/north` | North | *Africa (North)* · *Africa (without North Africa)* |
| `africa/west` | West | *Africa (North, West)* · *Africa (without West Africa)* |
| `africa/central` | Central | *Africa (without Central Africa and East Africa)* |
| `africa/east` | East | |
| `africa/southern` | Southern | |

As now, the summary line names whichever is shorter: the Sections that are on, or the ones that are off (*without …*).

**New ids, not `middle-east`**: the Middle East now includes the Caucasus and no longer Iran. Reusing
`asia/middle-east` would put scores for two different sets of countries on one Leaderboard.

## Code

- `scripts/build-map-data.mjs`: like Oceania, Asia and Africa take their Region from Natural Earth's subregion.
  - Africa: Northern → `north`, Western → `west`, Middle → `central`, Eastern → `east`, Southern → `southern`.
  - Asia: Western Asia → `middle-east-and-caucasus`, Central and Southern Asia → `central-and-south`, Eastern and
    South-Eastern Asia → `east-and-southeast`.
  - `MIDDLE_EAST` goes, and the Asian and African codes leave `ISLAND_COUNTRIES`. An unknown subregion throws, as
    a missing Region already does. `reportRegions` prints the new counts. Rebuild `public/data/countries.topo.json`.
- `src/quiz/selection.ts`: Asia's and Africa's entries in `CONTINENTS` get their new Regions. The summary line already
  uses the label for the Sections that are on and the phrase for *without …*, so this only needs the phrases above.
- **Stored settings and a saved Quiz Session** (`normalizeSelection`): the old keys (`asia/mainland`,
  `asia/middle-east`, `asia/islands`, `africa/mainland`, `africa/islands`) no longer exist. If a stored Selection has
  any of them, that Continent comes back at its default Regions, with its territory Sections as they were. The old
  parts don't map exactly onto the new ones, and this way the Continent stays chosen instead of disappearing.
- **Leaderboard and Practice Progress**: no migration. `asia` and `africa` (the defaults) keep their meaning. Keys for
  a part of Asia or Africa (only the Middle East, Africa without the Islands) stay stored but can't be shown any more,
  as with the old Overseas Territories Category in plan 13. Practice Levels belong to the Skill, so they're kept anyway.
- Docs: the *Region* term and the Middle East note in `docs/domain-language.md` (Islands is now only in Europe and,
  as the Caribbean, North America).
