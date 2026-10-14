# Architecture

Vanilla TypeScript + Vite, no UI framework. Every screen part (see [domain-language.md](domain-language.md)) is a class
that owns its DOM `element` and its own CSS file (BEM-style class names, e.g. `.map__country`).

```
src/
  main.ts                   entry point
  app.ts                    App: composes Navbar, Map and the screens; switches Modes
  mode.ts                   Mode interface (start/stop)
  style.css                 global reset and colour variables (--color-land, --color-correct, …)
  country/country.ts        Country model and loading of Country Shapes
  country/flag.ts           Flag lookup (flag-icons; US State Flags by id)
  country/us-state-flags/   US State Flags (SVG, Wikimedia Commons) and their SOURCES.md
  country/country-label.ts  Flag and Country Label elements
  country/country-info.ts   Country Info lookup (capital, population, area, fun fact) and formatting
  country/country-info.json Country Info data, hand-maintained (see below)
  country-info/             Country Info dialog, and the Navbar button (ⓘ) that opens it
  explore/explore-mode.ts   Explore Mode
  practice/practice-run.ts  Practice Run: spaced repetition (Levels), Streak (no DOM)
  practice/practice-progress.ts  Practice Progress storage (Levels per Skill, Streaks per Practice Set)
  practice/practice-mode.ts Practice Mode: plays a Practice Run on the Map and Navbar
  practice/practice-status.ts  Navbar content in Practice Mode (Streak and Learned pills + Prompt)
  quiz/selection.ts         Continents, Regions and Sections; the Countries, summary, label and key of a Selection;
                            moving Category keys and settings from before plan 13
  quiz/game-mode.ts         Game Modes
  quiz/modifier.ts          Modifiers, their States and icons
  quiz/quiz-settings.ts     Quiz Settings, picking the Quiz Set's Countries, Quiz Rules,
                            Practice settings, upgrading old settings
  quiz/quiz-run.ts          Quiz Run: shuffle, Prompts, Tries, Prompt Results, Score, snapshot/restore (no DOM)
  quiz/quiz-session.ts      Quiz Session: saving/restoring the active Quiz Run (localStorage)
  quiz/stopwatch.ts         Session Time clock and duration formatting
  quiz/quiz-mode.ts         Quiz Mode: plays a Quiz Run on the Map and Navbar
  quiz/quiz-status.ts       Navbar content during a Quiz Run (Quiz Progress pills + Prompt)
  quiz/prompt-view.ts       The Prompt in the Navbar, shared by Quiz and Practice Mode
  quiz/quiz-streak.ts       Quiz Streak carried over between perfect Quiz Runs (localStorage)
  streak/streak.ts          Streak rewards (Milestone, Full Round), Multiplier badge, flame icon; Quiz and Practice
  quiz/answer-feedback.ts   Hints, Map Notice and Sound Effects for an Answer, shared by Quiz and Practice Mode
  quiz/fading-result.ts     Colours a found Prompt for a moment (Practice Mode, and the Results Modifier on Hidden)
  quiz/end-screen.ts        End Screen modal
  pause-screen/             Pause Screen modal
  leaderboard/leaderboard.ts       Leaderboard storage (localStorage)
  leaderboard/leaderboard-view.ts  Leaderboard table, shared by Start and End Screen
  sound/sound-player.ts     Sound Effects (Web Audio synthesis) and mute state
  sound/sound-toggle.ts     Sound Toggle button
  screen/screen.css         two-column modal layout and buttons, shared by Start and End Screen
  map/world-map.ts          WorldMap (the Map), incl. world repetition, Tiny Country Markers, Capital Dots,
                            Country States, Map Notice and Hint
  navbar/navbar.ts          Navbar
  start-screen/start-screen.ts    StartScreen (native <dialog>) with its two pages
  start-screen/selection-page.ts  Selection page (the second page of the Start Screen)
  start-screen/continent-icon.ts  Continent Icons; continent-icons.json is generated (see Country dataset)
scripts/
  build-map-data.mjs        builds public/data/countries.topo.json and src/start-screen/continent-icons.json
public/data/
  countries.topo.json       generated Country dataset (committed)
.github/workflows/deploy.yml  builds and deploys to GitHub Pages (see Deployment)
vite.config.ts              dev/preview servers listen on the LAN (for testing on a phone); `allowedHosts` adds FolkertsPC
```

## Modes

`App` holds exactly one `Mode` (`ExploreMode`, `PracticeMode` or `QuizMode`) and switches with `switchMode`: the old Mode's
`stop()` must undo everything its `start()` did (listeners, Country States, Navbar Status). Modes drive the Map
through its small API; the Map knows nothing about Modes:

- `onCountryHover(listener)`: mouse/pen moves onto a Country (path or marker), or off it (`null`). Touch has no hover.
- `onCountryClick(listener)`: click or tap on a Country, or the Ocean (`null`), with the point clicked (px in the
  Map element). Not fired after a pan.
- `setHighlightedCountry(id | null)`, `setSelectedCountry(id | null)`
- `setCountryState(id, 'excluded' | 'correct' | 'half-correct' | 'missed' | null)`, `clearCountryStates()`
- `flashWrong(id)`: one-off CSS animation; `setPulsingCountry(id | null)`: endless animation until cleared.
- `showCountry(id)`: animated pan (d3-transition) that brings the whole Country on screen. It zooms out only if
  needed, and is clamped to the world's edges. Used by the Focus button.
- `setStatesShown(shown)`: shows the US States instead of the USA (see Country dataset). Quiz and Practice Mode
  turn it on when the Selection has the US states Section (`includesUsStates`), and off in `stop()`.
- `setNotice({ text, action? } | null)`: the Map Notice. It stops pointer, touch and wheel events, so pressing its
  button doesn't pan the Map. `setPulsingCountry` and `setSelectedCountry` also move the paths to the end of their
  group, so they are drawn on top.
- `showHint(content, point)`, `hideHint()`: the Hint popup. It remembers the world point under `point` and is
  re-placed on every zoom event, so it follows the Map. Placed above the point (below near the top edge), pushed
  inside the Map sideways with its arrow still on the point. `pointer-events: none`, so it never blocks a click.

The quiz logic lives in `QuizRun`, which has no DOM. `QuizMode` connects it to the Map and Navbar. What the Map
and speakers do for an Answer (flash, Hint, Missed + Pulsing, Map Notice after two wrong clicks while a Confirm is
due, Sound Effects) is `AnswerFeedback`, shared with `PracticeMode`; the Modes only colour the found Prompts.
With Flag only, `AnswerFeedback` also shows a Hint naming the Prompt once it is found or Confirmed (feedback 10). Countries
are compared by `id`, because the Map and the App each create their own `Country` objects.

`QuizMode` owns the Session Time (`Stopwatch`) and saves the Quiz Session after every Try, on `pause()`, when
the page is hidden and on `pagehide`. `pagehide` also fires on reload, including Vite's reload after a code change.
On start it re-applies the Country States of a restored Quiz Run. `App.openMenu` pauses the active Quiz Mode and
opens the Pause Screen, or opens the Start Screen when no Quiz Run is active.

On startup, `App` checks `hasQuizSession()`. If a session is saved, it waits for the Countries, restores the
session with `QuizRun.restore` and opens the Pause Screen. Snapshots that don't match the current Countries are
discarded, e.g. after a map data change.

When a Quiz Run is finished, `App.finishQuiz` clears the Quiz Session, adds a Leaderboard Entry and opens the End
Screen after a short delay. Entry ids
avoid `crypto.randomUUID()`, which is unavailable on plain-http LAN addresses (phone testing).

## Practice Mode

Started from the Start Screen's Explore split button. `practiceSettings(settings)` resets every Modifier to its
default except Flag, so a `PracticeRun` (no DOM) always gives two Tries.

**Scheduling** (after feedback on request 10: a missed Country came back too rarely in a big set) is a Leitner
system spaced in Prompts rather than days. Each seen Country has a Level 0–5 and a `due` value on the Skill
Clock (`SkillProgress.clock`, +1 per Prompt). A finished Prompt sets its Level: right on the first Try +1 (a new
Country straight to 3, Learned: the player already knew it), right on the second Try unchanged, Missed 0. It is
due again after `INTERVALS[level]` = 3, 6, 12, 25, 50, 100 Prompts, ±25% jitter, at least 2. Next Prompt: the most
overdue Country; if none is due, a random unseen one while the Working Set (Countries at Level 0–1) is under 5;
otherwise the one due soonest. Never the same Country twice in a row. `promptNumber` lets the `PromptView` fade in
a Country asked again.

**Practice Progress** (feedback 11) lives in `localStorage['snoozieworld.practice']`:
`{ version: 2, skills: { [skillKey]: { clock, levels: { [countryId]: { level, due } } } }, streaks: { [practiceSetKey]: { current, best } } }`.
`skillKey` is the Game Mode plus the Flag State (`name-to-location|flag-only`), so Levels carry over between
Practice Sets; `practiceSetKey` adds the Selection's key (see Leaderboard), so every Practice Set keeps its own
live and best Streak. Version 1 had the Categories there (plus `|us-states`); its Streak keys are moved on load like
the Leaderboard's, and the result is saved as version 2 with the next Try. `PracticeRun` changes the loaded objects in place and `PracticeMode` saves them after every
Try, so leaving (or reloading) keeps the live Streak. Entries that fail validation are ignored. The Start Screen's
split menu reads the same storage for its stats and *Reset practice progress* (`resetPracticeProgress`: drops the
Practice Set's Levels and live Streak, keeps the best).

A Streak that reaches a multiple of the Practice Set's size completes a **Full Round**; every other multiple of
10 is a **Milestone** (`streakReward` in `streak/streak.ts`; `PracticeRun.reward` holds the last Answer's). A Full Round
plays the `full-round` fanfare and pops the Streak pill bigger; a Milestone plays the `milestone` chime and makes it
glow. `createStreakLabel(streak, setSize)` shows the whole Streak plus a Multiplier badge `×(floor(streak / size) + 1)`
coloured by `--color-multiplier-x2…x5` (×5 and up stay purple). The bar along the bottom of the Streak pill
(`--round-progress`) shows `(streak mod size) / size`. (Briefly a Full Round meant every Country found once in the
Streak; that made ×2 feel unreachably late, so it went back to the Streak's length. Old records may still hold
`rounds`/`found`; they are ignored.)

`PracticeMode` colours a found Prompt for 1 s and clears a Missed one on Confirm, so the Map shows no results.
There is no Quiz Session, Leaderboard or Pause Screen; the Navbar title opens the Start Screen, as in Explore Mode.

## Sound

`SoundPlayer` synthesises each Sound Effect from a few oscillator tones (`EFFECTS` table: frequency, waveform,
volume, length, optional low-pass filter). Each tone has a fast attack and an exponential fade, so there are no clicks.
The `AudioContext` is created on the first sound, because browsers only allow audio after a user gesture. Mute state:
`localStorage['snoozieworld.soundMuted']`. The Navbar takes `controls` (the Sound Toggle) for its top-right corner.

## Modifiers

`MODIFIERS` (in `quiz/modifier.ts`) lists each Modifier's States, the first being the default. `QuizSettings.modifiers`
always holds every Modifier; `GameMode.modifierIds` says which ones the Game Mode shows and uses. The others keep
their value but are ignored, so switching Game Mode back restores them. Effects:

- Flag: `QuizStatus.createPrompt`, and `GameMode.canAsk` (Flag only needs a Distinct Flag).
- Guesses: `quizRules(settings)` → `QuizRules { triesPerPrompt, suddenDeath }`, passed to `QuizRun.start` and
  `QuizRun.restore`. Under Sudden Death a Missed Prompt sets `failed`, which makes the run `finished`; `App` waits
  longer (1.8 s) before the End Screen so the pulsing Prompt can be seen.
- Hints: `AnswerFeedback.showHint`, and what `QuizStatus`'s `onPromptClick` does: open Country Info
  (`QuizMode.showCountryInfo` stops the Session Time until the dialog's `close` event), or with No hints show
  "Hints are disabled" (`QuizStatus.showPromptNotice`). When `promptInfoGivesAnswer(settings)` (Capital to
  Location, or Flag only) it is null: the Prompt is plain content.
- Results: `QuizMode`. With Hidden, a found Prompt goes through `FadingResult` (as in Practice Mode), a Confirmed
  one is set back to land, and a restored Quiz Run only re-applies the Missed Prompt awaiting Confirm. Nothing is
  coloured when the Quiz Run is finished (feedback 12).

`normalizeQuizSettings` upgrades stored settings (Quiz Settings and Quiz Session): missing Modifiers get their
default, the old `flag-to-location` Game Mode becomes `name-to-location` + Flag only, and `categoryIds` + `usStates`
(before plan 13) become a Selection (`selectionFromCategories`: a Continent Category becomes its Regions, so South
America without its territories; *Individual states in USA* the US states Section; *Overseas Territories* is
dropped). Unknown Section keys are dropped.

## Quiz Session

`localStorage['snoozieworld.quizSession']`:
`{ version: 1, settings, run: QuizRunSnapshot, elapsedMs, savedAt }`. `QuizRunSnapshot` holds the Quiz Set ids in
order, the Prompt Results so far, `index`, `wrongTries`, `confirmNeeded` and `startStreak` (missing = 0).

## Quiz Streak

`QuizRun.streak` is derived, not counted: 0 while the Prompt has a wrong Try, else the trailing Correct records,
plus `startStreak` while every record so far is Correct. So a restored Quiz Run needs only `startStreak`. After a
Correct, `QuizRun.reward = streakReward(streak, total)`: a Milestone every 10; a Full Round only when `streak` is a
multiple of the Quiz Set's size, which (since `startStreak` is one) only happens at the end of a perfect Quiz Run.
`QuizMode` plays the reward's Sound Effect and `QuizStatus` animates the Streak pill (hidden at ≤ 480px).

Carrying over: `localStorage['snoozieworld.quizStreaks']` = `{ [leaderboardKey]: streak }`. `QuizMode` stores 0 on
any wrong Try, and on finishing `run.perfect ? run.streak : 0`. `App` starts a Quiz Run with `loadQuizStreak`,
which only accepts a whole multiple of the new Quiz Set's size (else 0). Abandoning keeps the stored value. The
Multiplier badge is `floor(streak / total) + 1`, so the Quiz Run after one perfect one starts at ×2. A perfect Quiz
Run's End Screen says *Perfect!* and shows the Streak it carries over.

## Leaderboard

`localStorage['snoozieworld.leaderboards']` holds `{ version: 2, leaderboards: { [key]: LeaderboardEntry[] } }`.
The key is `<gameModeId>|<selection key>`. The Selection key (`selectionKey`) is the Section keys that are on,
sorted, where a Continent at its default Sections is written as just its id: `name-to-location|asia,europe`,
`name-to-location|europe/balkans`, `name-to-location|north-america/us-states`. So the keys from before plan 13 keep
their meaning. Modifiers are not in the key: each entry
stores `modifiers` (only those its Game Mode uses; missing = all default) and the view shows the icons of the
non-default ones. Each list is kept sorted (Score desc, then date asc) and cut to 10. Unreadable storage counts as
empty; failed writes are ignored.

Version 1 was the `{ [key]: LeaderboardEntry[] }` object itself, with `<gameModeId>|<sorted categoryIds>` keys plus
`|us-states` for *Individual states in USA*. On load it is moved over (`selectionKeyFromCategories`):
`flag-to-location|…` lists are merged into `name-to-location|…` with `modifiers: { flag: 'flag-only' }`;
`south-america` becomes `south-america/south-america` (the old entries are without territories, which are now
South America's default); `north-america` + `|us-states` becomes
`north-america/islands,north-america/mainland,north-america/us-states`, and `|us-states` alone
`north-america/us-states`. Keys with `overseas-territories` stay as they are, unreachable. The result is written back
as version 2 on the next save, so the move runs once: afterwards `south-america` means the new default.

The Quiz Streaks (`snoozieworld.quizStreaks`) use the Leaderboard key too, but were not moved: a Quiz Streak from
before plan 13 under a changed key just starts again at 0.

## Screens

`.screen--fixed-height` (Start, Pause and End Screen) fixes the dialog height to `min(100dvh − 32px, max(60vh, 680px))`, or the
full height on narrow screens. On wide screens each panel scrolls on its own, and on the End Screen only the lists
scroll. When stacked, the whole dialog scrolls.

The Start Screen has two pages in one dialog: its own `<form>` and the Selection page (a `.screen__columns` that is not
a form, so its buttons never close the dialog). `StartScreen.showSelectionPage` hides one and shows the other, so the
size stays the same; opening the Start Screen always shows its own page, and Escape on the Selection page goes back
instead of closing. The Selection page keeps its own state (the chosen Continents and their Sections, which Sections
are closed) and calls `onChange`; `StartScreen.update` then gives it the Game Mode (`SelectionPage.update`) and reads
the Selection back. It builds the Country items of a Continent once and only toggles classes and counts afterwards,
so the Flag `<img>`s never reload and a Section can animate its height (`grid-template-rows` 1fr ↔ 0fr).

The Start Screen and End Screen are `<dialog>`s whose buttons submit with a `value`. The action runs in the
dialog's `close` event, based on `returnValue`. Escape closes with an empty `returnValue`, so nothing happens.
Exception: a button that opens another screen (End Screen *Back to start*, Pause Screen *Abandon*) uses
`onScreenButton` (`src/screen/screen.ts`), which closes the dialog and runs the action in the `submit` event. The
`close` event comes a task later, so the browser could paint a frame without any modal in between, and the
backdrop flashed off and on (feedback 12).

## The Map

- The world is projected once with d3-geo's **Mercator** projection into fixed "world units" (1000 wide, 84°N to
  72°S; further south is only Antarctic interior). The Ocean is the rectangle behind the Countries.
- Zoom and pan come from d3-zoom on the `<main class="map">` element, so pointer coordinates are in screen pixels.
  Every zoom event rewrites the SVG's `viewBox`. The paths are never transformed. Transforming a `<g>` let browsers
  scale a cached bitmap of it, which stayed blurry after zooming until the next repaint (feedback 01).
- **The world repeats sideways** (feedback 07). d3-zoom's `translateExtent` is unlimited in x, so its transform
  never jumps during a drag. Each layer (countries, Capital Dots, markers) is drawn once and cloned for world copies
  −1, 0 and +1 (`translate(±1000)`). `updateViewBox` shifts the viewBox by whole world widths so its centre lies on
  copy 0; the copies beside it fill the rest. Every copy's elements carry `data-country-id` and are registered in
  `countryElements`, so clicks, hover and Country States work on all of them. `showCountry` flies to the copy
  nearest the current view.
- Minimum zoom fits the whole world on screen, but never shows more than two world widths (so three copies are
  always enough). It is recalculated on resize (ResizeObserver). The view starts centred on the world. Maximum
  zoom is 5000× the minimum, which is what Vatican City needs to be clickable.
- Input: wheel or trackpad pinch zooms; touch pinch zooms; left or middle mouse button or one finger pans;
  double-click or double-tap zooms in. `touch-action: none` keeps the browser's own page zoom out of the way.
- Each Country is one `<path class="map__country" data-country-id="NLD">`. Borders use
  `vector-effect: non-scaling-stroke`, so they stay thin at every zoom level.
- **Tiny Country Markers**: Countries under 2,500 km² (excluding Other Areas) also get a
  `<g class="map__marker" data-country-id>` with a visible dot and a larger transparent hit circle (bigger on touch
  screens). Each one sits at Natural Earth's label point. On every zoom event their radii are set to
  `px / zoom` so they keep the same size on screen. A marker hides once its Country is ≥ 16px on screen. Smaller
  Countries' markers are drawn on top.
- **Capital Dots**: one `<circle>` per capital per world copy. Like the markers, their radius is set to
  `px / zoom` on zoom (only when the zoom changes, not on a pan), so they keep their size on screen. Drawn below
  the Tiny Country Markers; the layer has `pointer-events: none`. Not zero-length round-capped lines with a
  `non-scaling-stroke`: WebKit (Safari) scales those with the zoom, so they grew over small Countries.
- **Country States** are CSS classes (`map__country--excluded`, `--correct`, `--missed`, `--highlighted`) on both
  the path and the marker. They only set the `--country-fill` custom property, which the path and the marker's dot
  both use.
  They switch at once, except after `fadeOutCountryStates` (Quiz and Practice Mode `stop()`): `.map--fading` gives
  `fill` and `stroke` a 0.6 s transition (`FADE_DURATION`), so the Map fades back to land instead of flashing
  (feedback 12). Changes by the next Mode during that time fade too, and `setStatesShown(false)` waits until the
  US States have faded, so their swap for the USA doesn't show.

## Country dataset

Source: [Natural Earth](https://www.naturalearthdata.com/) 1:10m *Admin 0 – Countries*, *Admin 0 – Map Units* and
*Admin 1 – States, Provinces* (public domain), fetched from the `nvkelso/natural-earth-vector` GitHub repo. Regenerate with:

```
npm run build:map-data
```

The script:
1. Builds one topology from the Map Units. Map Units are Countries cut into parts, e.g. France vs. French Guiana,
   or England vs. Scotland.
2. Keeps the Map Units of `SPLIT_COUNTRIES` (France, Netherlands, Norway, New Zealand, Australian Indian Ocean
   Territories) as separate Countries; the split-off parts become Overseas Territories. Merges disputed/leased
   areas into their holder (`MERGE_INTO`). All other Map Units are merged back into their Country. Merging on the
   shared topology gives exact shapes.
3. Sets the properties the app uses: `name` (with `NAME_OVERRIDES`), `kind` (sovereign/territory/other, see
   `EXTRA_SOVEREIGN` and `OTHER_AREAS`), `continent` (with `CONTINENT_OVERRIDES`: an Overseas Territory belongs to
   the nearest Continent, M49 decides a tie), `region` (plan 13: `ISLAND_COUNTRIES`, `BALKANS`, `MIDDLE_EAST`,
   Natural Earth's subregions for Oceania and the Caribbean; null for Overseas Territories and Other Areas except
   Antarctica), `isoA2`, `labelPoint`, `area` (km², via d3-geo) and `distinctFlag`. The flag check compares flag-icons SVGs with their ids stripped,
   because identical flags differ only in their ids. US States are checked against their own Flags (all distinct),
   so run `npm run fetch:us-state-flags` first when those are missing.
4. Adds the 50 US States and the District of Columbia from Admin 1 as Countries of kind `state` (id: ISO 3166-2,
   e.g. `US-CA`; `stateOf: 'USA'`; their Flag is looked up by id, see Flags; Georgia is renamed "Georgia (US state)" to differ from the Country).
   Admin 1 borders match Admin 0's vertex for vertex, so in the shared topology the States share arcs with the USA
   and its neighbours. The Map draws them above the USA but hides them (CSS on `.map--us-states`,
   `.map__country--us-state`, `.map__country--has-states`, `.map__capital-dot--us-state`) unless `setStatesShown`.
   With the US states Section on, `quizCountries` asks them, and never the USA.
5. Simplifies the shapes to ~30% of their points, but never simplifies tiny Countries. Writes TopoJSON
   (~1.7 MB, ~600 KB gzipped).
6. Prints what each Continent can quiz per Region, territories and uninhabited islands (compare with the table in
   plan 13).
7. Draws the Continent Icons into `src/start-screen/continent-icons.json`: the finished topology simplified again
   (quantile 0.997), Mercator boxes per Continent (`ICON_BOXES`), Antarctica orthographic from below, 64 × 44 px.
   Points are rounded to half pixels, points on a straight line and rings under 1 px² dropped, and the paths written
   with relative coordinates: ~43 KB for all seven (~5 KB gzipped). The app imports the file dynamically, as a
   chunk of its own.

Downloads are cached in `scripts/.cache/` (git-ignored).

Known limits of the source data:
- Natural Earth's shapes are generalised for 1:10 million scale. Deep zoom shows straight coastline segments, and
  Vatican City is a ~110 m square rather than its real outline.
- 313 Countries: 198 Sovereign States, 57 Overseas Territories, 7 Other Areas, 51 US States. Askable: all but 6 Other
  Areas.

## Country Info

`src/country/country-info.json`, keyed by Country id: `capital`, optional `capitalNote` (split or disputed
capitals), `capitalPoint` ([lon, lat], for the Capital Dot), `population`, `area` (km², as commonly cited; the
dataset's own `Country.area` is computed from the simplified shapes and only used for Tiny Country Markers),
`funFacts` (`{ text, source }[]`, see below), and for Overseas Territories and US States `partOf` (the id of the
Country they belong to).
Imported into the bundle.

Capitals, populations and areas were compiled with AI assistance from general knowledge (request 06), not from
one authoritative source; populations are recent estimates. US States (request 11): 2020 census populations, total
areas (incl. water); no Fun Facts yet. The District of Columbia has no capital (it *is* Washington, the US capital;
"Washington" would clash with Washington State in Capital to Location), so it is never asked there.

**Fun Facts** (feedback after request 08) are sourced: every fact has the URL of a page that states it, shown
in Country Info behind the external-link button. How they were made:
1. One agent per ~20 Countries wrote ~6 candidate facts each from general knowledge.
2. A separate agent per chunk fetched a source page for every candidate (mostly English Wikipedia; also
   Guinness World Records, UNESCO, official tourism and government sites, major media), recorded the supporting
   quote, rewrote facts to match their source, and dropped facts it couldn't confirm. Blogs, travel listicles
   and search snippets did not count.
3. Facts resting on "citation needed" sentences, partial support, or political/disputed topics were dropped by
   hand.
4. A script fetched every source again and checked that the recorded quote is on the page.
Wikipedia articles change, so a source can drift; when a fact is reported wrong, fix or remove it rather than
keeping it unsourced. Every Country should keep at least one sourced fact.

When fixing an entry, keep these checks true: every Country id has an entry; `capital` and `capitalPoint` are both null or both set; the
`capitalPoint` lies in or within a few km of the Country Shape (many coastal capitals sit just off the simplified
coastline); capital names are unique except where `capitalPrompt` disambiguates them.

## Flags

SVGs from [flag-icons](https://github.com/lipis/flag-icons) (MIT), 4:3 versions. `src/country/flag.ts` uses
`import.meta.glob` with `?no-inline`. That way the bundle only holds a code → URL table, and each flag file is
downloaded the first time it is shown.

**US State Flags** (request 12) are not in flag-icons. They come from Wikimedia Commons, where all 51 are public
domain (Mississippi's is "Copyrighted free use": free for any use). They are committed in
`src/country/us-state-flags/`, named by Country id (`US-CA.svg`); `SOURCES.md` there lists each file's Commons page
and licence. Refresh them (e.g. when a State adopts a new flag, as Minnesota and Utah did in 2024) with:

```
npm run fetch:us-state-flags
```

The script stops on any file whose licence is not public domain or Copyrighted free use, and adds a `viewBox`
where a file has only a width and height (otherwise it would not scale in an `<img>`). The files are the Commons
originals, not trimmed: the seal flags are large (up to ~650 KB, ~280 KB gzipped), but each is only
downloaded when shown; svgo saved under 10%. Most State flags are not 4:3 (3:2, 5:3, 2:1; Ohio's is a pennant), so
`.flag--state` keeps the Flag's width but takes the flag's own height, uncropped.

## Deployment

`.github/workflows/deploy.yml` builds every push to `main` and every pull request (`npm ci`, then `npm run build`,
which type-checks first). Pushes to `main` (and manual runs) are also deployed to GitHub Pages. One-time setup: in
the repo's *Settings → Pages*, set *Source* to *GitHub Actions*.

Pages serves the site from a sub-path, e.g. `https://<user>.github.io/<repo>/`. The workflow gets that path from
`actions/configure-pages` and builds with `--base <path>/`. Code must therefore never use absolute paths for its
own files: use `import.meta.env.BASE_URL` (as `country.ts` does for the dataset), or import the file so Vite
bundles it. To try a sub-path build locally: `npm run build -- --base /SnoozieWorld/` and
`npx vite preview --base /SnoozieWorld/`.

The app has no URL routing, so no 404 fallback page is needed.

## Libraries and licences

| Package | Use | Licence |
| --- | --- | --- |
| d3-geo, d3-zoom, d3-selection, d3-transition | projection, zoom/pan, DOM, animated pan | ISC |
| topojson-client | decoding the dataset | ISC |
| flag-icons | Flags | MIT |
| Wikimedia Commons | US State Flags | Public domain |
| topojson-server, topojson-simplify | building the dataset (dev only) | ISC |
| Natural Earth data | Country Shapes | Public domain |
