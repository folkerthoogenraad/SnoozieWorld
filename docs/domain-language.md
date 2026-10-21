# Domain language

The shared vocabulary for SnoozieWorld. Use these terms in conversation, docs and code. When a new
concept appears, add it here first. Terms marked *(future)* are not implemented yet.

## Screen parts

| Term | Meaning | In code |
| --- | --- | --- |
| **Navbar** | The bar fixed at the top of the screen. Clicking its title (only the globe up to 960px wide) opens the Pause Screen during a Quiz Run, the Start Screen otherwise. Its **Status** area shows what the current Mode is about: the Explored Country, or the Quiz Progress and Prompt. Up to 960px wide (feedback 13) it has only the globe on the left and the Settings Menu's gear on the right, both centred on the Navbar's height, with the Status centred between them. | `Navbar` — `src/navbar/` |
| **Map** | The world map filling the screen below the Navbar, in Mercator projection. Zoom: scroll wheel, pinch, double-click or double tap, or (feedback 13) double tap and hold the second tap, then drag up to zoom in or down to zoom out. Pan: drag with left/middle mouse button or one finger. Panning left or right never ends: the world repeats (feedback 07). A tap only counts after a short wait (250 ms), so a double tap only zooms; meanwhile the Country under the finger is Highlighted. A tap on the Prompt (or a Near Miss of it) counts at once, and a second tap still zooms. A click counts right away. | `WorldMap` — `src/map/` (named so because `Map` is a JavaScript built-in) |
| **Capital Dot** | A small black dot on the Map for every capital, always shown, the same size at every zoom level. Not clickable. | `.map__capital-dot` |
| **Tiny Country Marker** | A clickable circle on a Country smaller than 2,500 km² (Vatican City, Malta, Nauru, …). Shown while the Country itself is too small on screen to click; hidden once zoomed in far enough. | `.map__marker` |
| **Start Screen** | The modal shown when the app opens and when the Navbar title is clicked. Left: the *What do you want to quiz?* button shows the Selection (small maps of its Continents, its label and *46 countries · change*) and opens the Selection page; below it the player picks a Game Mode and sets its Modifiers to start a Quiz, or chooses Explore Mode or, from the Explore button's split menu (its arrow), Practice Mode. Below the Modifier buttons, the one clicked last is explained. Right: the Leaderboard for the current choice. It has a fixed size, like the End Screen. Closing it with Escape keeps the current Mode going. | `StartScreen` — `src/start-screen/` |
| **Selection page** | The second page of the Start Screen, in the same dialog and at the same size, where the Selection is made (plan 13). Left: the title with a back arrow, a card per Continent (large checkbox, small map, name, summary line, and its count when chosen), *Clear all* and *Done*. Clicking a card chooses or unchooses the Continent; choosing it starts from its default Sections. Right: *Countries* with their number, then per chosen Continent its Sections, each with a checkbox, its count, an arrow to open or close it, and its Countries with their Flags in two columns. Ticking a Section opens it, unticking closes it (animated). A Section that is off greys out its Countries; a Country the Game Mode can't ask is greyed out with the reason as tooltip; the USA is crossed out while US states is on. *Done*, the back arrow or Escape go back to the Start Screen. | `SelectionPage` — `src/start-screen/selection-page.ts` |
| **Continent Icon** | A small map of a Continent (Continents have no Flags): the world in grey, the Continent in blue when chosen. On the Continent cards and the Start Screen's Selection button. | `createContinentIcon` — `src/start-screen/continent-icon.ts` |
| **Pause Screen** | Shown instead of the Start Screen while a Quiz Run is active: after a page reload (when a Quiz Session is saved) and when the Navbar title is clicked. Left: the Quiz Settings, question number and progress bar, Prompt Result counts, Running Score and Session Time. Right: the Leaderboard. Fixed size. *Continue current quiz* (or Escape) resumes; *Abandon* drops the Quiz Run and opens the Start Screen. | `PauseScreen` — `src/pause-screen/` |
| **End Screen** | The modal shown when a Quiz Run is finished. It has a fixed height, so opening a list never resizes it. Left: the title (*Perfect!* when every Prompt was Correct, with the Quiz Streak it carries over), the final Score in large type, collapsible (scrolling) lists of the Correct, Half Correct and Missed Countries, and *Back to start*. Right: the Leaderboard with the new entry highlighted. | `EndScreen` — `src/quiz/end-screen.ts` |
| **Sound Toggle** | The speaker button in the top-right corner of the Navbar: turns Sound Effects on or off. Remembered in the browser. Up to 960px wide it is in the Settings Menu. | `createSoundToggle` — `src/sound/` |
| **Language Switcher** | The small dropdown left of the Sound Toggle, showing the Language Flag and code (*EN*, *NL*): sets the Language. Remembered in the browser. Up to 960px wide it is in the Settings Menu. | `createLanguageSwitcher` — `src/language/` |
| **Settings Menu** | Up to 960px wide: the gear button in the top-right corner of the Navbar, instead of the Language Switcher and Sound Toggle (feedback 13). Opens a small menu: *Country names* with each Language (Language Flag and name), and a *Sound effects* switch. Picking a Language, Escape or a tap outside closes it; that tap doesn't reach the Map. | `createSettingsMenu` — `src/settings-menu/` |
| **Language Flag** | The small round flag of a Language (British for English, Dutch for Nederlands; feedback 13): the country whose spelling the names follow. Round and much smaller than a Country's Flag, so it can't be taken for the Prompt. | `createLanguageFlag` |
| **Language** | What Country and capital names are shown in (request 16): English (default) or Dutch. Only those names are translated; everything else stays English, so a sentence can mix them (*Missed: Berlijn is in Duitsland.*). | `currentLanguage`, `countryName`, `capitalName` |
| **Map Notice** | A short instruction at the top of the Map, optionally with a button. Used for "Missed: Chile. Click the flashing country to continue." with a **Focus** button. It appears only after two wrong clicks while a Confirm is due. Called *Map Hint* before request 06. | `WorldMap.setNotice` |
| **Hint** | A small popup pointing at where the player clicked on a wrong Try: the Flag, name and capital of the Country they clicked, so they learn while playing (feedback 08: the capital in every Game Mode). Disappears after 2.5 s. Turned off by the Hints Modifier. With Flag only it also names the Prompt once it is found or Confirmed, whatever the Hints Modifier (feedback 10). | `WorldMap.showHint`, `AnswerFeedback` |
| **Fun Fact** | A short, surprising fact about a Country, with the URL of a source that confirms it. A Country has several; Country Info shows a random one. | `FunFact` — `src/country/country-info.ts` |
| **Country Info** | A small modal about one Country: its name and capital in the Language (in any other than English, with the English ones below in small grey text), population, area, the Sovereign State it belongs to (Overseas Territories), and a random Fun Fact. A dice button shows another one (never the same twice in a row); the external-link button opens its source in a new tab. Opened by clicking the Explored Country in the Navbar, or the Prompt during a Name to Location Quiz Run with the Hints Modifier on (feedback 08), or in Practice Mode; the Session Time stops while it is open. With No hints, clicking the Prompt only shows "Hints are disabled" below it; in Capital to Location (feedback 09) and with Flag only (feedback 10) the Prompt is not clickable at all, since its Country Info would name the answer. | `CountryInfoDialog`, `createCountryInfoButton` — `src/country-info/` |
| **Focus** | The Map Notice's button: flies the Map to the Missed Prompt. It always centres it, and zooms in until it is at least ~120px (up to the maximum zoom), or out until it fits. | `WorldMap.showCountry` |
| **Country Label** | A Country's Flag followed by its name in the Language. | `createCountryLabel` — `src/country/country-label.ts` |

## Modes

Exactly one Mode is active at a time (`Mode` in `src/mode.ts`).

| Term | Meaning | In code |
| --- | --- | --- |
| **Explore Mode** | Free practice, not a game. Hovering Highlights a Country; clicking it makes it the Explored Country. Active when the app opens. | `ExploreMode` — `src/explore/` |
| **Explored Country** | The Country the player last clicked or tapped in Explore Mode (request 06; before, hovering was enough). It is Selected on the Map and its Country Label stays in the Navbar, where clicking it opens Country Info. Clicking the Ocean clears it. | `ExploreMode.exploredCountry` |
| **Quiz Mode** | Plays a Quiz Run on the Map. | `QuizMode` — `src/quiz/` |
| **Practice Mode** | Learning, not a game (request 10). Uses the Selection and Game Mode, but ignores the Modifiers except Flag. Plays a Practice Run. The Map keeps no results: a found Prompt shows its colour for a moment and a Missed one until Confirmed, then it turns back to land. No Score, Session Time, Leaderboard or Quiz Session. Spelled *Practice* (the noun); request 10 calls it *practise mode*. | `PracticeMode` — `src/practice/` |
| **Practice Run** | Asks the Practice Set until the player stops, with spaced repetition: Countries the player gets wrong come back within a few Prompts, ones they know only now and then. New Countries are added a few at a time. | `PracticeRun` — `src/practice/practice-run.ts` |
| **Practice Set** | The Countries a Practice Run asks: chosen like the Quiz Set. Each Practice Set has its own live and best Streak. | `PracticeRun.countries`, `practiceSetKey` |
| **Skill** | What is practised: the Game Mode, and in Name to Location the Flag State. Levels belong to a Skill, so they carry over between Practice Sets (Europe's Levels count in Europe + Asia too). | `skillKey` |
| **Level** | How well the player knows a Country in a Skill, 0–5. Right on the first Try: +1; right on the second: unchanged; Missed: 0. A higher Level is asked less often (after 3, 6, 12, 25, 50, 100 Prompts). A Country never asked has none. | `CountryLevel` |
| **Learned** | A Country at Level 3 or higher. A new Country found on the first Try is Learned at once. The Learned pill (mortarboard) in the Navbar shows `learned / Practice Set`. | `LEARNED_LEVEL`, `countLearned` |
| **Working Set** | The Countries still being learned (Level 0–1). New Countries are only added while it holds fewer than 5. | `WORKING_SET` |
| **Practice Progress** | The Levels per Skill and the Streaks per Practice Set, remembered in the browser (feedback 11). Reset per Practice Set from the Practice menu (the best Streak stays). | `src/practice/practice-progress.ts` |
| **Streak** | In Practice Mode: how many Prompts in a row were found on the first Try. Any wrong Try sets it to 0. Kept when leaving Practice Mode, so it continues next time with the same Practice Set. Shown in a pill with a flame in the Navbar; a bar along its bottom shows how far the next Full Round is. | `PracticeRun.streak` |
| **Best Streak** | The longest Streak of a Practice Set. Shown, with the live Streak and the Learned count, in the Practice item of the Explore split menu. | `StreakRecord.best` |
| **Full Round** | A Streak as long as the Practice Set, or a multiple of it. In a Quiz Run: a perfect Quiz Run. Reaching one plays the fanfare Sound Effect. | `streakReward` — `src/streak/streak.ts` |
| **Milestone** | Every 10 in a row (when not a Full Round), in Practice Mode and in a Quiz Run: a small reward, a chime and a glow on the Streak pill. | `streakReward` |
| **Multiplier** | The Full Rounds in a Streak plus one, shown as a small badge after it: "56 ×2" is a Streak of 56 in a Practice Set of 46; in a Quiz Run, ×2 after one perfect Quiz Run in a row. Yellow ×2, orange ×3, red ×4, purple ×5 and up. | `streakMultiplier`, `createStreakLabel` |

## Quiz

| Term | Meaning | In code |
| --- | --- | --- |
| **Quiz** | A game configured by Quiz Settings. | — |
| **Quiz Settings** | The Selection, Game Mode and Modifiers chosen on the Start Screen. The last ones used are remembered in the browser. | `QuizSettings` — `src/quiz/quiz-settings.ts` |
| **Selection** | What the player chose on the Selection page (plan 13): Continents, and per Continent the Sections that are on. Stored as Section keys (`europe/balkans`). A Continent with no Section on is not chosen, and one whose default has nothing the Game Mode can ask (Antarctica in Capital to Location) is left out. Decides the Quiz Set (with the Game Mode), the Leaderboard and the Practice Set. Its **label** names the Continents, each with its summary line when that isn't *–*: *Europe (without the Balkans)*, *North America (Islands + territories)*, *Oceania + territories*. Replaced the Categories and *Individual states in USA*. | `QuizSettings.selection`, `selectionLabel` — `src/quiz/selection.ts` |
| **Section** | A group of a Continent's Countries with its own checkbox on the Selection page: each of its Regions, then *Overseas territories* (the inhabited ones) and *Uninhabited islands*, when it has any. *US states* comes last in North America. **Default Sections**, on when a Continent is chosen: its Regions except US states, plus the territories in South America (French Guiana, Falkland Islands). The **summary line** of a Continent card says what differs from the default (*without the Balkans*, *Balkans*, *+ territories, US states*), or *–*. **US states** is off by default; while it is on the USA is never asked: with Mainland the States replace it, on its own only the States are asked, and the Map shows the States instead of the USA. | `Section`, `CONTINENTS` — `src/quiz/selection.ts` |
| **Game Mode** | What a Prompt asks; always answered by clicking the Country. **Name to Location**: a Country (how it is shown is up to the Flag Modifier). **Capital to Location**: a capital's name; click its Country. Each Game Mode has its own set of Modifiers. | `GAME_MODES` — `src/quiz/game-mode.ts` |
| **Modifier** | A setting on top of the Game Mode, shown as an icon button on the Start Screen. Each has a few **States**; the first is the default ("off"). Clicking moves it to the next State. Leaderboard Entries show the icons of the Modifiers not at their default. | `MODIFIERS` — `src/quiz/modifier.ts` |
| **Flag Modifier** | Name to Location only. **Name and flag** (default), **Name only**, **Flag only** (skips Countries without a Distinct Flag; this used to be the Flag to Location Game Mode). Icons: T + flag, T, flag. | `ModifierSettings.flag` |
| **Guesses Modifier** | **Two guesses** (default), **Single Guess** (one Try per Prompt), **Sudden Death** (one Try, and a Missed Prompt fails the Quiz Run). Icons: 2, 1, skull. A *guess* is a Try. | `ModifierSettings.guesses`, `QuizRules` |
| **Hints Modifier** | **Hints** (default) or **No hints**: no Hint after a wrong Try, and the Prompt doesn't open Country Info (it says "Hints are disabled"). Icon: lightbulb (crossed out for No hints). | `ModifierSettings.hints` |
| **Results Modifier** | **Shown** (default) or **Hidden** (request 14): a found Prompt only shows its colour for a moment, and a Missed one until Confirmed; then it is land again, so the Map doesn't show which Countries are left. It stays land when the Quiz Run is finished (feedback 12). Icon: eye (crossed out for Hidden). | `ModifierSettings.results`, `FadingResult` |
| **Quiz Set** | The shuffled Countries a Quiz Run asks: those in the Selection's Sections that the Game Mode can ask (Flag only skips Countries without a Distinct Flag; Capital to Location skips Countries without a capital), never the USA while US states is on. | `QuizRun.quizSet` |
| **Quiz Run** | One play-through of a Quiz: every Country in the Quiz Set is asked once. | `QuizRun` — `src/quiz/quiz-run.ts` |
| **Prompt** | The Country currently asked. | `QuizRun.prompt` |
| **Try** | One click on a Country of the Quiz Set while a Prompt is asked. Each Prompt allows two Tries, or one with Single Guess or Sudden Death. Clicks on the Ocean or on Excluded Countries are not Tries, and in a Quiz Run neither are clicks on Countries already asked (Correct, Half Correct or Missed; feedback 13), except the Missed Prompt waiting for its Confirm. With the Results Modifier on Hidden those look like land, so clicking them is a Try. A Near Miss counts as a click on the Prompt. | `QuizRun.answer`, `QuizMode.isClickable` |
| **Near Miss** | A click on the Ocean or another Country, but within a few pixels of the Prompt (3 px with a mouse, 10 px with a finger, also around its Tiny Country Marker): it counts as a click on the Prompt, in Quiz and Practice Mode (feedback 13). Not when the Country clicked is itself small on screen (under 3× that distance, or showing its marker), such as San Marino when Italy is asked. | `WorldMap.isNearCountry` |
| **Prompt Result** | How a Prompt ended. **Correct**: found on the first Try. **Half Correct**: found on the second Try (not possible with one Try; its pill is then hidden). **Missed** (shown as *Incorrect*): all Tries wrong. | `PromptResult` |
| **Failed** | A Quiz Run ended early by a Missed Prompt under Sudden Death. It still gets a Final Score (the Prompts not asked count as 0) and a Leaderboard Entry; the End Screen says *Sudden death!*. | `QuizRun.failed` |
| **Confirm** | After a Missed Prompt, the player must click it (it is Pulsing) before the next Prompt. Clicks elsewhere only flash; after two of them the Map Hint appears. | `QuizRun.awaitingConfirm` |
| **Score** | 0–100%: Correct counts 1, Half Correct ½, Missed 0, divided by the number of Prompts. Shown rounded down, so only a perfect Quiz Run shows 100%. The **Running Score** in the Navbar divides by the Prompts finished so far; the **Final Score** by the whole Quiz Set. | `QuizRun.runningScore`, `QuizRun.finalScore` |
| **Quiz Streak** | In a Quiz Run: Prompts found on the first Try in a row. A wrong Try ends it. A perfect Quiz Run (every Prompt Correct) keeps it going into the next Quiz Run with the same Leaderboard, so back-to-back perfect Quiz Runs earn a Multiplier. | `QuizRun.streak` — `src/quiz/quiz-streak.ts` |
| **Quiz Progress** | The pills in the Navbar during a Quiz Run: question number (`x / n`), Correct (✓), Half Correct (~), Missed (✗), the Running Score and the Quiz Streak (flame). Fixed widths, so nothing shifts while playing. A new Prompt fades in. Up to 960px wide it has three centred lines (feedback 13): *Question x / n* and the Quiz Streak as plain text, the other pills, and the Prompt. | `QuizStatus` — `src/quiz/quiz-status.ts` |
| **Feedback Animation** | Correct: the ✓ pill pops (bouncy, green glow). Half Correct: the ~ pill nudges (calmer, yellow tint). Missed: the ✗ pill buzzes red. Every wrong Try: the Prompt shakes. | `QuizStatus.animate` |
| **Sound Effect** | Correct: a bright *pling*. Half Correct: a lower, softer pling. Every wrong Try: a soft buzzer. Confirm: a short neutral blip (moving on). Milestone: a soft two-note chime over the pling. Full Round: a rising fanfare over the pling. Synthesised in the browser (Web Audio API), no audio files. | `SoundPlayer` — `src/sound/sound-player.ts` |
| **Session Time** | Time spent playing a Quiz Run. The clock stops while the Pause Screen is open or the page is hidden. Shown on the Pause and End Screens and stored with Leaderboard Entries. | `Stopwatch` — `src/quiz/stopwatch.ts` |
| **Quiz Session** | The saved state of the active Quiz Run (Quiz Settings, Quiz Set order, Prompt Results, Tries, Session Time), so it survives a reload. Saved after every Try, on pause and when the page is left; cleared when finished or abandoned. | `src/quiz/quiz-session.ts` |
| **Leaderboard** | The top 10 Final Scores for one combination of Selection + Game Mode, stored in this browser only. A Continent at its default Sections shares the Leaderboard it had before plan 13 (*Europe* is still *Europe*). Modifiers share the Leaderboard; each entry shows the ones it was played with. Ties: whoever got it first ranks higher. | `src/leaderboard/` |
| **Leaderboard Entry** | One finished Quiz Run on a Leaderboard: Final Score, the Modifier icons, the three Prompt Result counts, Session Time and the date (hidden on very small phones). | `LeaderboardEntry` |

## Country States on the Map

| Term | Meaning | Colour |
| --- | --- | --- |
| **Highlighted** | The Country under the mouse, or under the finger until its tap counts (Explore, Quiz and Practice Mode). In a Quiz Run not a Country already asked, since clicking it is no Try. | light green |
| **Selected** | The Explored Country. Drawn above its neighbours. | yellow-green, white outline |
| **Excluded** | Not in the Quiz Set. Not clickable; its Tiny Country Marker is hidden. | grey |
| **Correct** | Found on the first Try. | white |
| **Half Correct** | Found on the second Try. | yellow |
| **Missed** | Both Tries wrong. Pulses until Confirmed. | red |
| **Pulsing** | The Missed Prompt waiting to be Confirmed. Drawn above its neighbours. | vivid red ↔ near-white, white outline |

A wrong Try also briefly flashes the clicked Country dark red.

## Geography

| Term | Meaning | In code |
| --- | --- | --- |
| **Country** | One selectable area on the Map. Every Country is a Sovereign State, an Overseas Territory, an Other Area or a US State. Identified by a Natural Earth code (e.g. `NLD`, `GUF`), or ISO 3166-2 for US States (`US-CA`). | `Country` — `src/country/` |
| **Sovereign State** | A Country that is an independent state: the 193 UN members plus Vatican City, Kosovo, Taiwan, Palestine and Western Sahara (198 in total). | `kind: 'sovereign'` |
| **Overseas Territory** | A territory that belongs to a Sovereign State but lies away from it, e.g. Aruba, Greenland, French Guiana, Réunion, Caribbean Netherlands, Svalbard, Gibraltar, Jersey. Always its own Country, never part of the parent's shape. | `kind: 'territory'`, `Country.sovereign` |
| **Other Area** | Neither of the above: Antarctica, Bir Tawil, Southern Patagonian Ice Field, and a few disputed reefs. Never in a Quiz, except Antarctica (plan 13; it has a Flag but no capital). | `kind: 'other'` |
| **Country Shape** | The geometry of a Country, used to draw it on the Map. | `CountryShape` |
| **Ocean** | All water on the Map: the area behind the Countries. | `.map__ocean` |
| **Continent** | The continent of a Country: Africa, Asia, Europe, North America, South America, Oceania, Antarctica. Mostly Natural Earth's; an Overseas Territory belongs to the nearest one, see the build script for the overrides. Each is chosen as a whole on the Selection page, with its Sections. | `Country.continent`, `SelectableContinent` |
| **Region** | A part of a Continent: *Mainland*, *Balkans* (Europe), *Islands* (Europe's island countries; in North America the Caribbean), *US states*, Africa's *North*, *West*, *Central*, *East*, *Southern* and Asia's *Middle East and Caucasus*, *Central and South*, *East and Southeast* (the UN's regions, plan 15), Oceania's *Australia and New Zealand*, *Melanesia*, *Micronesia*, *Polynesia*, and *South America* and *Antarctica* as one Region each. Every Sovereign State, US State and Antarctica is in exactly one; Overseas Territories are in none (they have Sections of their own). | `Country.region` — set in `scripts/build-map-data.mjs` |
| **Uninhabited** | An Overseas Territory with population 0 in Country Info, e.g. Clipperton Island, Jan Mayen. Pitcairn (35 people), Cocos and Tokelau are inhabited. Quizzed in its Continent's *Uninhabited islands* Section. | `isUninhabited` — `src/quiz/selection.ts` |
| **Capital** | The capital of a Country, from Country Info. Some have none (uninhabited islands, Other Areas, Tokelau, Dhekelia, Western Sahara). A capital name used twice (Kingston: Jamaica and Norfolk Island) is asked with its Continent: "Kingston (Oceania)". | `CountryInfo.capital`, `capitalPrompt` |
| **Flag** | The flag of a Country, looked up by `Country.isoA2` (a US State's by its id). Some Other Areas have none. | `flagUrl` — `src/country/flag.ts` |
| **Distinct Flag** | A Flag no other Country uses. Sovereign States always count as having one. A territory loses it when it shares a flag (e.g. Réunion uses the French flag). | `Country.distinctFlag` |
| **US State** | One of the 50 states of the United States, or the District of Columbia (Natural Earth "Admin 1"). A Country of its own that lies on top of the USA; the Map shows the States instead of the USA only during a Quiz or Practice with the US states Section on. Has a Flag (request 12), so it is asked with Flag only too. Not to be confused with the *Country States* on the Map. | `kind: 'state'`, `Country.stateOf` |

## Future Game Modes

- **Location to Name**: the game Highlights a Country; the player types its name.
- Country Info on the End Screen lists.

## Decisions

- **Overseas Territories are separate Countries** (feedback 01). Split off from their parent: French Guiana,
  Guadeloupe, Martinique, Mayotte, Réunion (France); Caribbean Netherlands (Netherlands); Svalbard, Jan Mayen,
  Bouvet Island (Norway); Tokelau (New Zealand); Christmas Island, Cocos (Keeling) Islands (Australia). Other
  territories (Aruba, Curaçao, Greenland, New Caledonia, …) were already separate in Natural Earth.
- **Not** treated as Overseas Territories, so they stay part of their parent: Azores and Madeira (Portugal), Canary
  Islands, Ceuta and Melilla (Spain), Alaska and Hawaii (USA), Galápagos (Ecuador), Easter Island (Chile).
- **Disputed and leased areas are part of the Country that holds them**: Somaliland → Somalia, Northern Cyprus and
  the U.N. Buffer Zone → Cyprus, Baikonur → Kazakhstan, Guantanamo Bay → Cuba, Siachen Glacier → India, Brazilian
  Island → Brazil.
- **Cyprus is in Europe** (Natural Earth says Asia).
- **Tiny Country Markers** for Countries under 2,500 km² (feedback 02).
- **Two Tries per Prompt**, and a Missed Prompt must be Confirmed by clicking it (feedback 03).
- **Shaking means wrong** (feedback 04): only a wrong Try shakes the Prompt; good outcomes get their own pill animation.
- **No automatic panning to a Missed Prompt** (feedback 05): the Map Notice's Focus button does that, on request.
- **Flag to Location became a Modifier** (request 07): Name to Location with the Flag Modifier on *Flag only*.
  Its old Leaderboard Entries and saved settings are moved over automatically.
- **Modifiers don't split the Leaderboard** (request 07): entries show their Modifier icons instead.
- **Country Info for the Prompt only with Hints on** (feedback 08): it gives the answer away (the name in Flag
  only), which is fine for learning but not for a No hints run. **Never in Capital to Location** (feedback 09):
  there it would name the answer outright, which makes Hints too powerful.
- **Western Sahara has no capital** in Country Info: the Map shape is only the eastern part, and Laayoune lies
  outside it. Dhekelia has none either (it is run from Episkopi, in Akrotiri).
- **Practice Mode ignores the Modifiers except Flag** (request 10): two Tries and Hints, as by default; any wrong
  Try counts as a mistake (Streak back to 0).
- **The Navbar uses its two-row layout up to 960px** (with the Quiz Streak): in one row the Prompt was squeezed
  to nothing on tablets.
- **Quiz Streaks carry over only through perfect Quiz Runs**, per Leaderboard: the Multiplier means "perfect
  Quiz Runs in a row", matching Practice Mode's Full Rounds.
- **Practice uses spaced repetition, not rounds** (follow-up to request 10): reshuffling misses into a big set
  (51 US States) brought them back too rarely. A Leitner system spaced in Prompts, with a small Working Set.
  Levels are kept per Skill, Streaks per Practice Set (feedback 11).
- **US States can be quizzed on their own, and replace the USA** (request 11 and its follow-up): with North
  America's Mainland on too, the USA is left out. Since plan 13 they are North America's *US states* Section. The District of Columbia counts as one of them. Flag only skipped them until they got Flags (request 12).
- **France's Country Info figures are for metropolitan France**, because its overseas regions are separate Countries.
- **Hidden hides Missed Prompts too** (request 14 asks for correct ones): once Confirmed they turn back to land as
  well, or the red ones would still narrow down what's left. They don't come back when the Quiz Run is finished
  (feedback 12): the Map just stays land.
  Practice Mode ignores the Results Modifier: it never keeps results anyway.
- **Overseas Territories belong to a Continent** (plan 13), the nearest one; the UN geoscheme (M49) decides when two
  are about as near. So Akrotiri and Dhekelia are Europe, the US Minor Outlying Islands Oceania, and South Georgia
  South America. The worldwide *Overseas Territories* Category is gone; its Leaderboard Entries stay stored but can't
  be shown.
- **Territories are off by default, except in South America** (plan 13): French Guiana and the Falkland Islands feel
  part of it. So South America's old Leaderboard (without them) moved to *South America (without territories)*.
- **The Balkans** (plan 13): Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Kosovo, Moldova, Montenegro, North
  Macedonia, Romania, Serbia; Slovenia and Greece are Mainland. An island country lies entirely on islands without a
  land border to the mainland; Denmark doesn't count.
- **Africa and Asia follow the UN's regions (M49)** (plan 15), as Natural Earth's subregions give them, so the UN
  decides the doubtful cases: Iran is Central and South Asia, Sudan North Africa, Zambia and Mozambique East Africa.
  Asia's Regions pair up the UN's: *Middle East and Caucasus* is Western Asia, *Central and South* is Central and
  Southern Asia, *East and Southeast* is Eastern and South-Eastern Asia. Island countries are in the Region they lie
  in (Japan in East and Southeast, Madagascar in East); there are no Islands in Africa and Asia any more. Western
  Sahara is a Sovereign State here, so North Africa has 7 rather than the UN's 6. Their old Leaderboards for a part
  of the Continent (*Asia (Middle East)*, *Africa (without the islands)*) stay stored but can't be shown.
- **No Presets and no ticking single Countries** on the Selection page (plan 13), for now.
- **Only Country and capital names are translated** (request 16), not the rest of the app (yet). Capitals keep their
  local name unless the Language has its own (*Wenen*, *Peking*).
