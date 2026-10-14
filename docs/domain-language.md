# Domain language

The shared vocabulary for SnoozieWorld. Use these terms in conversation, docs and code. When a new
concept appears, add it here first. Terms marked *(future)* are not implemented yet.

## Screen parts

| Term | Meaning | In code |
| --- | --- | --- |
| **Navbar** | The bar fixed at the top of the screen. Clicking its title (only the globe up to 960px wide) opens the Pause Screen during a Quiz Run, the Start Screen otherwise. Its **Status** area shows what the current Mode is about: the Explored Country, or the Quiz Progress and Prompt. | `Navbar` — `src/navbar/` |
| **Map** | The world map filling the screen below the Navbar, in Mercator projection. Zoom: scroll wheel or pinch. Pan: drag with left/middle mouse button or one finger. Panning left or right never ends: the world repeats (feedback 07). | `WorldMap` — `src/map/` (named so because `Map` is a JavaScript built-in) |
| **Capital Dot** | A small black dot on the Map for every capital, always shown, the same size at every zoom level. Not clickable. | `.map__capital-dot` |
| **Tiny Country Marker** | A clickable circle on a Country smaller than 2,500 km² (Vatican City, Malta, Nauru, …). Shown while the Country itself is too small on screen to click; hidden once zoomed in far enough. | `.map__marker` |
| **Start Screen** | The modal shown when the app opens and when the Navbar title is clicked. Left: the player ticks Categories (and optionally Individual States in USA), picks a Game Mode and sets its Modifiers to start a Quiz, or chooses Explore Mode or, from the Explore button's split menu (its arrow), Practice Mode. Below the Modifier buttons, the one clicked last is explained. Right: the Leaderboard for the current choice. It has a fixed size, like the End Screen. Closing it with Escape keeps the current Mode going. | `StartScreen` — `src/start-screen/` |
| **Pause Screen** | Shown instead of the Start Screen while a Quiz Run is active: after a page reload (when a Quiz Session is saved) and when the Navbar title is clicked. Left: the Quiz Settings, question number and progress bar, Prompt Result counts, Running Score and Session Time. Right: the Leaderboard. Fixed size. *Continue current quiz* (or Escape) resumes; *Abandon* drops the Quiz Run and opens the Start Screen. | `PauseScreen` — `src/pause-screen/` |
| **End Screen** | The modal shown when a Quiz Run is finished. It has a fixed height, so opening a list never resizes it. Left: the title (*Perfect!* when every Prompt was Correct, with the Quiz Streak it carries over), the final Score in large type, collapsible (scrolling) lists of the Correct, Half Correct and Missed Countries, and *Back to start*. Right: the Leaderboard with the new entry highlighted. | `EndScreen` — `src/quiz/end-screen.ts` |
| **Sound Toggle** | The speaker button in the top-right corner of the Navbar: turns Sound Effects on or off. Remembered in the browser. | `createSoundToggle` — `src/sound/` |
| **Map Notice** | A short instruction at the top of the Map, optionally with a button. Used for "Missed: Chile. Click the flashing country to continue." with a **Focus** button. It appears only after two wrong clicks while a Confirm is due. Called *Map Hint* before request 06. | `WorldMap.setNotice` |
| **Hint** | A small popup pointing at where the player clicked on a wrong Try: the Flag, name and capital of the Country they clicked, so they learn while playing (feedback 08: the capital in every Game Mode). Disappears after 2.5 s. Turned off by the Hints Modifier. With Flag only it also names the Prompt once it is found or Confirmed, whatever the Hints Modifier (feedback 10). | `WorldMap.showHint`, `AnswerFeedback` |
| **Fun Fact** | A short, surprising fact about a Country, with the URL of a source that confirms it. A Country has several; Country Info shows a random one. | `FunFact` — `src/country/country-info.ts` |
| **Country Info** | A small modal about one Country: capital, population, area, the Sovereign State it belongs to (Overseas Territories), and a random Fun Fact. A dice button shows another one (never the same twice in a row); the external-link button opens its source in a new tab. Opened by clicking the Explored Country in the Navbar, or the Prompt during a Name to Location Quiz Run with the Hints Modifier on (feedback 08), or in Practice Mode; the Session Time stops while it is open. With No hints, clicking the Prompt only shows "Hints are disabled" below it; in Capital to Location (feedback 09) and with Flag only (feedback 10) the Prompt is not clickable at all, since its Country Info would name the answer. | `CountryInfoDialog`, `createCountryInfoButton` — `src/country-info/` |
| **Focus** | The Map Notice's button: flies the Map to the Missed Prompt. It always centres it, and zooms in until it is at least ~120px (up to the maximum zoom), or out until it fits. | `WorldMap.showCountry` |
| **Country Label** | A Country's Flag followed by its name. | `createCountryLabel` — `src/country/country-label.ts` |

## Modes

Exactly one Mode is active at a time (`Mode` in `src/mode.ts`).

| Term | Meaning | In code |
| --- | --- | --- |
| **Explore Mode** | Free practice, not a game. Hovering Highlights a Country; clicking it makes it the Explored Country. Active when the app opens. | `ExploreMode` — `src/explore/` |
| **Explored Country** | The Country the player last clicked or tapped in Explore Mode (request 06; before, hovering was enough). It is Selected on the Map and its Country Label stays in the Navbar, where clicking it opens Country Info. Clicking the Ocean clears it. | `ExploreMode.exploredCountry` |
| **Quiz Mode** | Plays a Quiz Run on the Map. | `QuizMode` — `src/quiz/` |
| **Practice Mode** | Learning, not a game (request 10). Uses the chosen Categories and Game Mode, but ignores the Modifiers except Flag. Plays a Practice Run. The Map keeps no results: a found Prompt shows its colour for a moment and a Missed one until Confirmed, then it turns back to land. No Score, Session Time, Leaderboard or Quiz Session. Spelled *Practice* (the noun); request 10 calls it *practise mode*. | `PracticeMode` — `src/practice/` |
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
| **Quiz Settings** | The Categories, Game Mode and Modifiers chosen on the Start Screen. The last ones used are remembered in the browser. | `QuizSettings` — `src/quiz/quiz-settings.ts` |
| **Category** | A checkbox on the Start Screen selecting a group of Countries: one per Continent (its Sovereign States), and *Overseas Territories* (all of them, worldwide). | `CATEGORIES` — `src/quiz/category.ts` |
| **Individual States in USA** | A checkbox below the Categories that works like one (request 11): it adds the 51 US States to the Quiz Set, on its own or with Categories. The USA as a whole is then never asked, so with North America the States replace it. The Map shows the States instead of the USA. Part of the Leaderboard key, like a Category. | `QuizSettings.usStates` |
| **Game Mode** | What a Prompt asks; always answered by clicking the Country. **Name to Location**: a Country (how it is shown is up to the Flag Modifier). **Capital to Location**: a capital's name; click its Country. Each Game Mode has its own set of Modifiers. | `GAME_MODES` — `src/quiz/game-mode.ts` |
| **Modifier** | A setting on top of the Game Mode, shown as an icon button on the Start Screen. Each has a few **States**; the first is the default ("off"). Clicking moves it to the next State. Leaderboard Entries show the icons of the Modifiers not at their default. | `MODIFIERS` — `src/quiz/modifier.ts` |
| **Flag Modifier** | Name to Location only. **Name and flag** (default), **Name only**, **Flag only** (skips Countries without a Distinct Flag; this used to be the Flag to Location Game Mode). Icons: T + flag, T, flag. | `ModifierSettings.flag` |
| **Guesses Modifier** | **Two guesses** (default), **Single Guess** (one Try per Prompt), **Sudden Death** (one Try, and a Missed Prompt fails the Quiz Run). Icons: 2, 1, skull. A *guess* is a Try. | `ModifierSettings.guesses`, `QuizRules` |
| **Hints Modifier** | **Hints** (default) or **No hints**: no Hint after a wrong Try, and the Prompt doesn't open Country Info (it says "Hints are disabled"). Icon: lightbulb (crossed out for No hints). | `ModifierSettings.hints` |
| **Quiz Set** | The shuffled Countries a Quiz Run asks: those in the selected Categories that the Game Mode can ask (Flag only skips Countries without a Distinct Flag; Capital to Location skips Countries without a capital). | `QuizRun.quizSet` |
| **Quiz Run** | One play-through of a Quiz: every Country in the Quiz Set is asked once. | `QuizRun` — `src/quiz/quiz-run.ts` |
| **Prompt** | The Country currently asked. | `QuizRun.prompt` |
| **Try** | One click on a Country of the Quiz Set while a Prompt is asked. Each Prompt allows two Tries, or one with Single Guess or Sudden Death. Clicks on the Ocean or on Excluded Countries are not Tries. | `QuizRun.answer` |
| **Prompt Result** | How a Prompt ended. **Correct**: found on the first Try. **Half Correct**: found on the second Try (not possible with one Try; its pill is then hidden). **Missed** (shown as *Incorrect*): all Tries wrong. | `PromptResult` |
| **Failed** | A Quiz Run ended early by a Missed Prompt under Sudden Death. It still gets a Final Score (the Prompts not asked count as 0) and a Leaderboard Entry; the End Screen says *Sudden death!*. | `QuizRun.failed` |
| **Confirm** | After a Missed Prompt, the player must click it (it is Pulsing) before the next Prompt. Clicks elsewhere only flash; after two of them the Map Hint appears. | `QuizRun.awaitingConfirm` |
| **Score** | 0–100%: Correct counts 1, Half Correct ½, Missed 0, divided by the number of Prompts. Shown rounded down, so only a perfect Quiz Run shows 100%. The **Running Score** in the Navbar divides by the Prompts finished so far; the **Final Score** by the whole Quiz Set. | `QuizRun.runningScore`, `QuizRun.finalScore` |
| **Quiz Streak** | In a Quiz Run: Prompts found on the first Try in a row. A wrong Try ends it. A perfect Quiz Run (every Prompt Correct) keeps it going into the next Quiz Run with the same Leaderboard, so back-to-back perfect Quiz Runs earn a Multiplier. | `QuizRun.streak` — `src/quiz/quiz-streak.ts` |
| **Quiz Progress** | The pills in the Navbar during a Quiz Run: question number (`x / n`), Correct (✓), Half Correct (~), Missed (✗), the Running Score and the Quiz Streak (flame; hidden on narrow phones). Fixed widths, so nothing shifts while playing. A new Prompt fades in. | `QuizStatus` — `src/quiz/quiz-status.ts` |
| **Feedback Animation** | Correct: the ✓ pill pops (bouncy, green glow). Half Correct: the ~ pill nudges (calmer, yellow tint). Missed: the ✗ pill buzzes red. Every wrong Try: the Prompt shakes. | `QuizStatus.animate` |
| **Sound Effect** | Correct: a bright *pling*. Half Correct: a lower, softer pling. Every wrong Try: a soft buzzer. Confirm: a short neutral blip (moving on). Milestone: a soft two-note chime over the pling. Full Round: a rising fanfare over the pling. Synthesised in the browser (Web Audio API), no audio files. | `SoundPlayer` — `src/sound/sound-player.ts` |
| **Session Time** | Time spent playing a Quiz Run. The clock stops while the Pause Screen is open or the page is hidden. Shown on the Pause and End Screens and stored with Leaderboard Entries. | `Stopwatch` — `src/quiz/stopwatch.ts` |
| **Quiz Session** | The saved state of the active Quiz Run (Quiz Settings, Quiz Set order, Prompt Results, Tries, Session Time), so it survives a reload. Saved after every Try, on pause and when the page is left; cleared when finished or abandoned. | `src/quiz/quiz-session.ts` |
| **Leaderboard** | The top 10 Final Scores for one combination of Categories + Game Mode, stored in this browser only. Modifiers share the Leaderboard; each entry shows the ones it was played with. Ties: whoever got it first ranks higher. | `src/leaderboard/` |
| **Leaderboard Entry** | One finished Quiz Run on a Leaderboard: Final Score, the Modifier icons, the three Prompt Result counts, Session Time and the date (hidden on very small phones). | `LeaderboardEntry` |

## Country States on the Map

| Term | Meaning | Colour |
| --- | --- | --- |
| **Highlighted** | The Country under the mouse (Explore and Quiz Mode). | light green |
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
| **Other Area** | Neither of the above: Antarctica, Bir Tawil, Southern Patagonian Ice Field, and a few disputed reefs. Never in a Quiz. | `kind: 'other'` |
| **Country Shape** | The geometry of a Country, used to draw it on the Map. | `CountryShape` |
| **Ocean** | All water on the Map: the area behind the Countries. | `.map__ocean` |
| **Continent** | The continent of a Country (Africa, Asia, Europe, North America, South America, Oceania, Antarctica). Mostly Natural Earth's; see the build script for the overrides. | `Country.continent` |
| **Capital** | The capital of a Country, from Country Info. Some have none (uninhabited islands, Other Areas, Tokelau, Dhekelia, Western Sahara). A capital name used twice (Kingston: Jamaica and Norfolk Island) is asked with its Continent: "Kingston (Oceania)". | `CountryInfo.capital`, `capitalPrompt` |
| **Flag** | The flag of a Country, looked up by `Country.isoA2` (a US State's by its id). Some Other Areas have none. | `flagUrl` — `src/country/flag.ts` |
| **Distinct Flag** | A Flag no other Country uses. Sovereign States always count as having one. A territory loses it when it shares a flag (e.g. Réunion uses the French flag). | `Country.distinctFlag` |
| **US State** | One of the 50 states of the United States, or the District of Columbia (Natural Earth "Admin 1"). A Country of its own that lies on top of the USA; the Map shows the States instead of the USA only during a Quiz or Practice with Individual States in USA. Has a Flag (request 12), so it is asked with Flag only too. Not to be confused with the *Country States* on the Map. | `kind: 'state'`, `Country.stateOf` |

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
  America ticked, the USA is left out. The District of Columbia counts as one of them. Flag only skipped them until they got Flags (request 12).
- **France's Country Info figures are for metropolitan France**, because its overseas regions are separate Countries.
