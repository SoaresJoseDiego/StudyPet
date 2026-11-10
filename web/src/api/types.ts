import type { SlimeKind } from '../slimes'

export type LessonProgress = 'NotStarted' | 'InProgress' | 'Completed'
export type SessionStatus = 'InProgress' | 'Completed' | 'Cancelled'
export type CourseCategory = 'Faculdade' | 'CursoOnline' | 'Cursinho' | 'Livro' | 'Outro'
export type CourseColor = 'verde' | 'azul' | 'pessego' | 'lilas'
export type StudyMood = 'Facil' | 'Ok' | 'Dificil'

export interface Character {
  id: number
  name: string
  level: number
  experience: number
  coins: number
  experienceForCurrentLevel: number
  experienceForNextLevel: number
  /** Forma do pet: 1 Semente, 2 Broto, 3 Muda, 4 Florescido. */
  stage: number
  stageName: string
  nextStageName: string | null
  nextStageLevel: number | null
}

export interface User {
  id: number
  displayName: string
  email: string
  dailyGoalMinutes: number
  character: Character | null
}

/** Resposta de criar conta e de entrar: o usuário mais o token de login. */
export interface AuthUser extends User {
  token: string
}

export interface AchievementSummary {
  key: string
  name: string
  description: string
  icon: string
}

export interface Dashboard {
  id: number
  displayName: string
  character: Character | null
  today: {
    focusMinutes: number
    goalMinutes: number
    goalReached: boolean
    sessions: number
    experience: number
  }
  activeSession: {
    id: number
    lessonId: number
    lessonTitle: string
    startedAt: string
    plannedMinutes: number
  } | null
  activeCourses: number
}

export interface CourseSummary {
  id: number
  title: string
  category: CourseCategory
  color: CourseColor
  instructor: string | null
  provider: string | null
  sourceUrl: string | null
  isArchived: boolean
  weeklyGoalMinutes: number | null
  totalLessons: number
  completedLessons: number
  focusMinutes: number
  nextLesson: { id: number; title: string } | null
  isCompleted: boolean
}

export interface CourseList {
  counts: { inProgress: number; completed: number; archived: number; all: number }
  items: CourseSummary[]
}

export interface Lesson {
  id: number
  title: string
  position: number
  progress: LessonProgress
  sessions: number
}

export interface CourseModule {
  id: number
  title: string
  position: number
  lessons: Lesson[]
}

export interface Note {
  id: number
  courseId: number
  courseTitle: string
  courseColor: CourseColor
  studySessionId: number | null
  minutes: number
  mood: StudyMood
  text: string
  createdAt: string
}

export interface CourseDetail {
  id: number
  userId: number
  title: string
  category: CourseCategory
  color: CourseColor
  instructor: string | null
  provider: string | null
  sourceUrl: string | null
  isArchived: boolean
  weeklyGoalMinutes: number | null
  stats: {
    totalLessons: number
    completedLessons: number
    sessions: number
    focusMinutes: number
    experience: number
  }
  nextLesson: { id: number; title: string } | null
  modules: CourseModule[]
  recentNotes: Pick<Note, 'id' | 'createdAt' | 'minutes' | 'mood' | 'text'>[]
}

export interface NewCourse {
  title: string
  category: CourseCategory
  color: CourseColor
  instructor?: string | null
  provider?: string | null
  sourceUrl?: string | null
  weeklyGoalMinutes?: number | null
  modules?: { title: string; lessons: string[] }[]
}

export interface UdemyPreview {
  url: string
  title: string
  instructor: string | null
  description: string | null
  provider: string
  /** false quando a Udemy bloqueou a leitura e o título veio só do endereço. */
  fromPage: boolean
}

export interface StudySession {
  id: number
  userId: number
  lessonId: number
  lessonTitle: string | null
  courseId: number | null
  courseTitle: string | null
  status: SessionStatus
  startedAt: string
  finishedAt: string | null
  plannedMinutes: number
  focusSeconds: number
  focusMinutes: number
  breakMinutes: number
  /** Semente das waves: o front sorteia os mesmos slimes que a API. */
  seed: number
  slimeStartIndex: number
  earnedExperience: number
  earnedCoins: number
}

export interface SessionHistoryItem {
  id: number
  lessonId: number
  lessonTitle: string
  courseId: number
  courseTitle: string
  status: SessionStatus
  startedAt: string
  finishedAt: string | null
  plannedMinutes: number
  focusMinutes: number
  earnedExperience: number
  earnedCoins: number
  slimes: number
  kingSlimes: number
}

export interface FinishResult {
  session: StudySession
  reward: {
    experience: number
    coins: number
    suggestedBreakMinutes: number
    firstSessionOfDay: boolean
    dailyGoalReached: boolean
    baseExperience: number
  }
  slimes: { lilas: number; azul: number; rosa: number; rei: number; total: number }
  lessonProgress: LessonProgress
  character: Character | null
  leveledUp: boolean
  evolved: boolean
  today: { focusMinutes: number; goalMinutes: number }
  newAchievements: AchievementSummary[]
}

export interface Stats {
  today: { focusMinutes: number }
  week: {
    startsOn: string
    focusMinutes: number
    experience: number
    byCourse: { courseId: number; title: string; minutes: number; goalMinutes: number | null }[]
  }
  lastDays: {
    focusMinutes: number
    slimes: number
    daily: { date: string; minutes: number }[]
  }
  streak: { current: number; longest: number }
  totals: { focusMinutes: number; sessions: number; slimes: number; kingSlimes: number; experience: number }
  bestiary: { kind: SlimeKind; name: string; experience: number; rarity: string; defeated: number }[]
  lastEncounter: {
    finishedAt: string
    courseTitle: string
    lessonTitle: string
    focusMinutes: number
    earnedExperience: number
    slimes: number
    slimeKind: SlimeKind | null
    slimeName: string | null
  } | null
}

export interface AchievementItem {
  key: string
  group: string
  icon: 'flame' | 'crown' | 'clock' | 'leaf' | 'book' | 'pencil'
  name: string
  description: string
  metric: string
  target: number
  value: number
  earned: boolean
  earnedAt: string | null
}

export interface AchievementsResponse {
  earnedCount: number
  total: number
  closest: string | null
  groups: { title: string; items: AchievementItem[] }[]
}
