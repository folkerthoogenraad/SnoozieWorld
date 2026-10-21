import { CountryInfoDialog } from './country-info/country-info-dialog.ts'
import { toCountry, loadCountryShapes, type Country } from './country/country.ts'
import { ExploreMode } from './explore/explore-mode.ts'
import { addToLeaderboard, type LeaderboardEntry } from './leaderboard/leaderboard.ts'
import { WorldMap } from './map/world-map.ts'
import type { Mode } from './mode.ts'
import { createLanguageSwitcher } from './language/language-switcher.ts'
import { Navbar } from './navbar/navbar.ts'
import { PauseScreen } from './pause-screen/pause-screen.ts'
import { PracticeMode } from './practice/practice-mode.ts'
import { loadSkillProgress, loadStreak } from './practice/practice-progress.ts'
import { PracticeRun } from './practice/practice-run.ts'
import { EndScreen } from './quiz/end-screen.ts'
import { QuizMode } from './quiz/quiz-mode.ts'
import { QuizRun } from './quiz/quiz-run.ts'
import { loadQuizStreak } from './quiz/quiz-streak.ts'
import { clearQuizSession, hasQuizSession, loadQuizSession } from './quiz/quiz-session.ts'
import { activeModifiers, practiceSettings, quizCountries, quizRules, type QuizSettings } from './quiz/quiz-settings.ts'
import { SoundPlayer } from './sound/sound-player.ts'
import { createSoundToggle } from './sound/sound-toggle.ts'
import { createSettingsMenu } from './settings-menu/settings-menu.ts'
import { StartScreen } from './start-screen/start-screen.ts'

// Pause between the last Answer and the End Screen, so the player sees the final colouring.
const END_SCREEN_DELAY = 600
// Longer after Sudden Death, so the player sees which Country they missed.
const FAILED_END_SCREEN_DELAY = 1800

/**
 * Composes the Navbar, the Map and the screens, and switches between Explore
 * Mode, Practice Mode and Quiz Runs. While a Quiz Run is active, the Navbar title opens the
 * Pause Screen instead of the Start Screen; after a reload, a saved Quiz
 * Session is restored and the Pause Screen shown.
 */
export class App {
  private readonly root: HTMLElement
  private readonly map = new WorldMap()
  private readonly sounds = new SoundPlayer()
  private readonly navbar = new Navbar({
    onTitleClick: () => this.openMenu(),
    // The Settings Menu replaces the other two on phones and tablets.
    controls: [createLanguageSwitcher(), createSoundToggle(this.sounds), createSettingsMenu(this.sounds)],
  })
  private readonly countryInfo = new CountryInfoDialog()
  private readonly startScreen = new StartScreen({
    onExplore: () => this.explore(),
    onPractice: (settings) => this.practice(settings),
    onStartQuiz: (settings) => {
      const countries = quizCountries(settings, this.countries)
      const streak = loadQuizStreak(settings, countries.length)
      this.startQuiz(settings, QuizRun.start(countries, quizRules(settings), streak))
    },
  })
  private readonly pauseScreen = new PauseScreen({
    onContinue: () => this.activeQuiz()?.resume(),
    onAbandon: () => {
      clearQuizSession()
      this.explore()
      this.startScreen.open()
    },
  })
  private readonly endScreen = new EndScreen({ onBackToStart: () => this.startScreen.open() })
  private countries: Country[] = []
  private mode: Mode | null = null

  constructor(root: HTMLElement) {
    this.root = root
  }

  async start(): Promise<void> {
    this.root.append(
      this.navbar.element,
      this.map.element,
      this.startScreen.element,
      this.pauseScreen.element,
      this.endScreen.element,
      this.countryInfo.element,
    )
    this.explore()
    // A saved Quiz Session needs the Countries to restore; otherwise show the Start Screen right away.
    const resuming = hasQuizSession()
    if (!resuming) this.startScreen.open()

    try {
      const shapes = await loadCountryShapes()
      this.map.render(shapes)
      this.countries = shapes.map(toCountry)
      this.startScreen.setCountries(this.countries)
      this.countryInfo.setCountries(this.countries)
    } catch (error) {
      console.error(error)
      this.map.setStatus('Could not load the map.')
      return
    }

    if (resuming) {
      const session = loadQuizSession(this.countries)
      if (session) {
        this.startQuiz(session.settings, session.run, session.elapsedMs)
        this.openMenu()
      } else {
        this.startScreen.open()
      }
    }
  }

  /** The Navbar title: the Pause Screen during a Quiz Run, the Start Screen otherwise. */
  private openMenu(): void {
    const quiz = this.activeQuiz()
    if (quiz) {
      quiz.pause()
      this.pauseScreen.open({ settings: quiz.settings, run: quiz.run, elapsedMs: quiz.elapsedMs })
    } else {
      this.startScreen.open()
    }
  }

  /** The current Quiz Mode, if its Quiz Run is still going. */
  private activeQuiz(): QuizMode | null {
    return this.mode instanceof QuizMode && !this.mode.run.finished ? this.mode : null
  }

  private explore(): void {
    this.switchMode(new ExploreMode({ map: this.map, navbar: this.navbar, countryInfo: this.countryInfo }))
  }

  private practice(chosen: QuizSettings): void {
    const settings = practiceSettings(chosen)
    this.switchMode(
      new PracticeMode({
        map: this.map,
        navbar: this.navbar,
        settings,
        run: PracticeRun.start(
          quizCountries(settings, this.countries),
          loadSkillProgress(settings),
          loadStreak(settings),
        ),
        allCountries: this.countries,
        sounds: this.sounds,
        countryInfo: this.countryInfo,
      }),
    )
  }

  private startQuiz(settings: QuizSettings, run: QuizRun, elapsedMs = 0): void {
    this.switchMode(
      new QuizMode({
        map: this.map,
        navbar: this.navbar,
        settings,
        run,
        elapsedMs,
        allCountries: this.countries,
        sounds: this.sounds,
        countryInfo: this.countryInfo,
        onFinished: (run, elapsedMs) => this.finishQuiz(run, settings, elapsedMs),
      }),
    )
  }

  private finishQuiz(run: QuizRun, settings: QuizSettings, elapsedMs: number): void {
    clearQuizSession()
    const entry: LeaderboardEntry = {
      // Not crypto.randomUUID(): that needs a secure context, which a phone on the LAN (plain http) is not.
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      score: run.finalScore,
      correct: run.count('correct'),
      halfCorrect: run.count('half-correct'),
      missed: run.count('missed'),
      durationMs: Math.round(elapsedMs),
      date: new Date().toISOString(),
      modifiers: activeModifiers(settings),
    }
    const leaderboard = addToLeaderboard(settings, entry)
    const delay = run.failed ? FAILED_END_SCREEN_DELAY : END_SCREEN_DELAY
    setTimeout(() => this.endScreen.open({ run, settings, leaderboard, entry }), delay)
  }

  private switchMode(mode: Mode): void {
    this.mode?.stop()
    this.mode = mode
    mode.start()
  }
}
