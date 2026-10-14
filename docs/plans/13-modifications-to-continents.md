# Plan 13: Modifications to continents

Status: **agreed, ready to implement**. Request: [docs/requests/13-modifications-to-continents.md](../requests/13-modifications-to-continents.md).

Mockup: [docs/mockups/13-modifications-to-continents/start-screen-variant-b.html](../mockups/13-modifications-to-continents/start-screen-variant-b.html)
(open it from inside the repository, so the flags load). The rejected variant A
([start-screen.html](../mockups/13-modifications-to-continents/start-screen.html), Continent cards that open to show their
Regions) is kept for reference.

## Goal

Overseas Territories should also count as part of their Continent, and the player decides how much of a Continent they
quiz, down to quizzing only the Balkans or only the Middle East. *What do you want to quiz?* opens its own page, the
**Selection page**. Antarctica becomes a Continent too. The worldwide *Overseas Territories* Category goes away.

## Concepts

| Term | Meaning |
| --- | --- |
| **Selection** | What the player chose on the Selection page: Continents, and per Continent the Sections that are on. Replaces the Categories and *Individual states in USA*. Decides the Quiz Set (with the Game Mode), the Leaderboard and the Practice Set. |
| **Selection page** | The page of the Start Screen where the Selection is made, opened from the *What do you want to quiz?* button. *Done* (or the back arrow) goes back to the Start Screen. |
| **Continent** | Africa, Asia, Europe, North America, South America, Oceania, Antarctica. A card on the left of the Selection page with a large checkbox, a small map of the Continent, a summary line and a count. |
| **Region** | A part of a Continent: *Mainland*, *Balkans*, *Middle East*, *Islands*, *US states*, or for Oceania *Melanesia*, … Every Sovereign State (and US State) is in exactly one Region. |
| **Section** | A group of a Continent's Countries, with its own checkbox, on the right of the Selection page: each of its Regions, then *Overseas territories* (the inhabited ones) and *Uninhabited islands*, when it has any. *US states* comes last in North America: it is a long list, and above it the player sees that Islands is on too. |
| **Uninhabited** | An Overseas Territory with population 0 in Country Info, e.g. Clipperton Island. Pitcairn (35 people), Cocos and Tokelau are inhabited. |

**Default Sections**: every Region of a Continent except *US states*; no uninhabited islands; no overseas territories,
**except in South America**, where French Guiana and the Falkland Islands are on by default (decided: they feel part of
it). With the defaults every Continent quizzes exactly what it quizzes today, except South America (14 instead of 12; see
the Leaderboard below).

**US states** is a Section of North America that is off by default. While it is on, the USA is never asked: with Mainland
the States replace the USA (as *Individual states in USA* does now), on its own it quizzes only the States.

## The Selection page

**Left**: the title with a back arrow, then one card per Continent in a single column. A card has a large checkbox, a small
map of the Continent (blue when chosen, grey otherwise), its name, a summary line and, when chosen, its count. Clicking
anywhere on the card ticks or unticks it. At the bottom: *Clear all* and *Done*.

- **Choosing a Continent starts from its default Sections.** Unchoosing and choosing it again is how you reset it.
- **Counts only for what is chosen**: an unchosen Continent shows no count; a chosen one shows how many Countries it adds,
  as asked in the current Game Mode.
- **The summary line is always there**, so choosing something never makes the card jump: *–* when not chosen or at the
  default, otherwise what differs, in blue: *Islands + territories*, *without the Balkans*, *Balkans*, *+ territories, US
  states*.
- **A disabled Continent** when its default has nothing the Game Mode can ask: Antarctica in Capital to Location (it has no
  capital). Greyed out, with a tooltip; left out of the Quiz Set, the key and the label.

**Right** (where the Leaderboard usually is): the title *Countries* with their number, then per chosen Continent its
Sections, with a thin grey line between the Continents. No instructions: the headings explain themselves. Each Section has
a heading with a checkbox (the same kind as the Continents', for consistency: both choose what is in the quiz), its name
and count; clicking the heading ticks or unticks it. Below it, its Countries with their Flags in two columns. With nothing
chosen it says *Choose one or more continents to play.*

**Opening and closing Sections**: ticking a Section opens it, unticking it closes it, both with a short animation (the
list's height slides to or from 0). An arrow at the right of the heading opens or closes it by hand, without ticking or
unticking it, so the player can look at what a Section that is off contains. Choosing a Continent opens its Sections that are on
and closes the others. So by default the long lists that are off (US states, uninhabited islands) take one line each.

In the list:

- a Section that is off: its Countries stay visible, greyed out;
- a Country the Game Mode can't ask (a shared flag in Flag only, e.g. French Guiana; no capital in Capital to Location):
  greyed out, with the reason as tooltip (*Not asked: shares a flag*). On a phone there is no tooltip; that's fine for now;
- the USA while US states is on: crossed out, *Asked as its states*. Crossing out is only for this: the USA is replaced,
  not left out.

On a phone the right side goes below the Continents, as the Leaderboard does now.

**Room to grow** (not in this plan): ticking individual Countries on and off by clicking them in the list.

**No flicker** (implementation note): the Selection page builds the Country items once per Continent and only toggles
classes on a change (Section on/off, open/closed, greyed out, crossed out, counts), so the `<img>` elements keep their loaded Flags.
This is also what makes the open/close animation possible. The mockup does the same.

## Regions per Continent

Counts: Sovereign States (or Antarctica itself). The *Overseas territories* and *Uninhabited islands* Sections of each
Continent are the territories in the last column, together.

| Continent | Region | Contains | Territories / uninhabited islands |
| --- | --- | --- | --- |
| North America | Mainland (Canada to Panama) | 10 | — |
| | US states *(off by default)* | 51 | — |
| | Islands (the Caribbean) | 13 | +18: Anguilla, Aruba, Bermuda, British Virgin Islands, Caribbean Netherlands, Cayman Islands, Curaçao, Greenland, Guadeloupe, Martinique, Montserrat, Puerto Rico, Saint Barthélemy, Saint Martin, Saint Pierre and Miquelon, Sint Maarten, Turks and Caicos Islands, US Virgin Islands · uninhabited +1: Clipperton Island |
| South America | South America | 12 | +2: French Guiana, Falkland Islands · uninhabited +1: South Georgia and the South Sandwich Islands |
| Europe | Mainland | 31 | +1: Gibraltar |
| | Balkans | 10 | — |
| | Islands (Cyprus, Iceland, Ireland, Malta, United Kingdom) | 5 | +8: Akrotiri, Åland, Dhekelia, Faroe Islands, Guernsey, Isle of Man, Jersey, Svalbard · uninhabited +1: Jan Mayen |
| Africa | Mainland | 49 | — |
| | Islands (Cape Verde, Comoros, Madagascar, Mauritius, São Tomé and Príncipe, Seychelles) | 6 | +3: Mayotte, Réunion, Saint Helena |
| Asia | Mainland | 24 | +2: Hong Kong, Macau |
| | Middle East | 15 | — |
| | Islands (Brunei, East Timor, Indonesia, Japan, Maldives, Philippines, Singapore, Sri Lanka, Taiwan) | 9 | +2: Christmas Island, Cocos (Keeling) Islands · uninhabited +1: British Indian Ocean Territory |
| Oceania | Australia and New Zealand | 2 | +1: Norfolk Island · uninhabited +2: Ashmore and Cartier Islands, Coral Sea Islands |
| | Melanesia | 4 | +1: New Caledonia |
| | Micronesia | 5 | +2: Guam, Northern Mariana Islands · uninhabited +1: US Minor Outlying Islands |
| | Polynesia | 3 | +7: American Samoa, Cook Islands, French Polynesia, Niue, Pitcairn Islands, Tokelau, Wallis and Futuna |
| Antarctica | Antarctica | 1 | uninhabited +3: Bouvet Island, French Southern and Antarctic Lands, Heard Island and McDonald Islands |

- **Balkans** (decided): Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Kosovo, Moldova, Montenegro, North Macedonia,
  Romania, Serbia. Slovenia and Greece are Mainland.
- **Middle East**: Bahrain, Iran, Iraq, Israel, Jordan, Kuwait, Lebanon, Oman, Palestine, Qatar, Saudi Arabia, Syria,
  Turkey, United Arab Emirates, Yemen. Bahrain is an island, but belongs here rather than under Islands. Not included:
  Egypt and Cyprus (other Continents), and the Caucasus (Armenia, Azerbaijan, Georgia).
- An island country lies entirely on islands without a land border to the mainland (Brunei and East Timor share an island
  with a neighbour, so they still count). Malaysia, Equatorial Guinea and Denmark count as Mainland.
- The US States all go in *US states*, Alaska and Hawaii included.
- Territories are one Section per Continent, not per Region (decided, for now): Europe's *Overseas territories* holds
  Gibraltar as well as the Faroe Islands.
- Antarctica (now an Other Area) becomes askable. It has a Flag (`aq`) but no capital. The other Other Areas (Bir Tawil,
  the Spratly Islands, …) stay unaskable.

## Continents of Overseas Territories

There is no single consensus: our map data (Natural Earth) and the UN geoscheme (M49, the standard for statistics) disagree on
the far-off islands. **Rule (decided): a territory belongs to the nearest Continent**, the one you would look near on the
map; M49 decides when two are about as near.

Changes in `CONTINENT_OVERRIDES` in `scripts/build-map-data.mjs`:

- **Akrotiri, Dhekelia → Europe**: they lie on Cyprus, which is already Europe.
- **US Minor Outlying Islands → Oceania**: all but Navassa are in the Pacific.
- **South Georgia and the South Sandwich Islands → South America** (was Antarctica): about as far from the Falklands as
  from the Antarctic Peninsula (both around 1,500 km), so M49 decides: South America.

Unchanged: **Christmas Island, Cocos Islands → Asia** (about 350 km and 1,100 km from Indonesia, 1,500 km and more from
Australia); **British Indian Ocean Territory → Asia** (about 600 km south of the Maldives); **Bouvet Island → Antarctica**
(about 1,700 km from Antarctica, 2,600 km from South Africa).

The Region of each Country is set in the build script too (a new `region` property), so the app needs no lists of names.

## Settings, Leaderboard and Practice Progress

`QuizSettings.categoryIds` + `usStates` become the Selection, a list of keys `<continent>/<section>`:

```ts
interface QuizSettings {
  /** e.g. ['europe/mainland', 'europe/balkans', 'europe/islands', 'north-america/islands', 'north-america/territories'] */
  selection: string[]
  gameModeId: GameModeId
  modifiers: ModifierSettings
}
```

- **Leaderboard and Practice Set key**: the Selection, sorted, where a Continent at its default is written as just its id
  (`europe`). So today's keys keep their meaning and no entries are lost:
  - `europe`, `asia`, … → unchanged (the defaults include the Balkans and the Middle East, as today)
  - `south-america` → `south-america/south-america`: the old entries are without territories, which is no longer the
    default. Because the new default writes `south-america` again, this move must run only once: the stored Leaderboards
    and Practice Progress get a version number.
  - `north-america` + `|us-states` → `north-america/islands,north-america/mainland,north-america/us-states`
  - `|us-states` on its own → `north-america/us-states`
  - `overseas-territories` → no longer exists. Its Leaderboard entries stay stored but can't be shown; settings that use it
    lose it.

  These moves are done once when loading, like the Flag to Location move.
- Stored settings and a saved Quiz Session are moved over the same way in `normalizeQuizSettings`.
- A chosen Continent with all its Sections off counts as not chosen.
- Practice Levels belong to the Skill, not the Practice Set, so they carry over to every new Selection. Quizzing only the
  Balkans, for example, gets its own Streak but keeps the Levels earned in Europe.

**Label** (the *What do you want to quiz?* button, Leaderboard subtitle, Pause Screen): Continents by name, with their
summary line when it isn't *–*: *Europe*, *Europe (without the Balkans)*, *Europe (Balkans)*, *North America (Islands +
territories)*, *South America + territories*, *North America (US states)*.

## Start Screen

The Category checkboxes become one button under *What do you want to quiz?*: small maps of the chosen Continents, the
label and *77 countries · change*. Clicking it opens the Selection page in the same dialog (same size). *Individual
states in USA* disappears from the Start Screen.

There are no flags for the Continents (only Europe and Antarctica have one), hence the small maps.

## Implementation steps

1. Build script: continent overrides, `region` per Country, Antarctica askable; rebuild the data.
2. Continent map icons: generated by the build script (simplified to a few KB each; see the mockup's `data.js`).
3. `src/quiz/category.ts` → `src/quiz/selection.ts`: Continents, Regions and Sections as data, the Countries of a
   Selection, its summary, label and key.
4. `QuizSettings.selection`, the moves in `normalizeQuizSettings`, the Leaderboard and the Practice Progress keys.
5. Start Screen: the Selection button, and the Selection page (`src/start-screen/selection-page.ts`) with the Continent
   cards and the Section list, updated in place (no flicker), with Sections that open and close.
6. `describeQuizSettings` for the new labels.
7. `docs/domain-language.md`: Selection, Selection page, Continent (selectable, with Antarctica), Region, Section,
   Uninhabited; remove Category and Individual States in USA; update Start Screen, Quiz Set and Leaderboard.
   `docs/architecture.md` where the Start Screen is described.
