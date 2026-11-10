import type {
  AchievementSummary,
  AchievementsResponse,
  AuthUser,
  CourseDetail,
  CourseList,
  CourseModule,
  CourseSummary,
  Dashboard,
  FinishResult,
  Lesson,
  LessonProgress,
  NewCourse,
  Note,
  SessionHistoryItem,
  Stats,
  StudyMood,
  StudySession,
  UdemyPreview,
  User,
} from './types'

/** Erro vindo da API. `status` permite tratar 404/409 de forma diferente na tela. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

const TOKEN_KEY = 'studypet.token'

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

let authToken = readStoredToken()

export function hasAuthToken(): boolean {
  return authToken !== null
}

export function setAuthToken(token: string | null) {
  authToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Sem localStorage (janela privada etc.): o login vale só até recarregar.
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Ela está rodando?', null)
  }

  // Token vencido ou inválido: volta para a tela de entrada.
  if (response.status === 401 && authToken) {
    setAuthToken(null)
    window.location.assign('/')
  }

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Erro ${response.status} ao chamar a API.`
    throw new ApiError(response.status, message, data)
  }

  return data as T
}

const user = (userId: number) => `/users/${userId}`
const course = (userId: number, courseId: number) => `${user(userId)}/courses/${courseId}`

type WithAchievements<T> = T & { newAchievements: AchievementSummary[] }

export type CourseStatusFilter = 'andamento' | 'concluidos' | 'arquivados' | 'todos'

export const api = {
  createUser: (displayName: string, email: string, password: string, characterName?: string) =>
    request<AuthUser>('POST', '/users', { displayName, email, password, characterName: characterName || null }),
  signIn: (email: string, password: string) => request<AuthUser>('POST', '/users/sign-in', { email, password }),
  getUser: (userId: number) => request<User>('GET', user(userId)),
  updateDailyGoal: (userId: number, minutes: number) =>
    request<{ id: number; dailyGoalMinutes: number }>('PUT', `${user(userId)}/daily-goal`, { minutes }),
  getDashboard: (userId: number) => request<Dashboard>('GET', `${user(userId)}/dashboard`),
  getStats: (userId: number) => request<Stats>('GET', `${user(userId)}/stats`),
  getAchievements: (userId: number) => request<AchievementsResponse>('GET', `${user(userId)}/achievements`),

  listCourses: (userId: number, status: CourseStatusFilter = 'todos') =>
    request<CourseList>('GET', `${user(userId)}/courses?status=${status}`),
  getCourse: (userId: number, courseId: number) => request<CourseDetail>('GET', course(userId, courseId)),
  createCourse: (userId: number, payload: NewCourse) =>
    request<WithAchievements<Pick<CourseSummary, 'id' | 'title'>>>('POST', `${user(userId)}/courses`, payload),
  updateCourse: (userId: number, courseId: number, payload: Omit<NewCourse, 'modules' | 'weeklyGoalMinutes'>) =>
    request<CourseSummary>('PUT', course(userId, courseId), payload),
  setCourseArchived: (userId: number, courseId: number, isArchived: boolean) =>
    request<{ id: number; isArchived: boolean }>('PUT', `${course(userId, courseId)}/archived`, { isArchived }),
  setCourseWeeklyGoal: (userId: number, courseId: number, minutes: number | null) =>
    request<{ id: number; weeklyGoalMinutes: number | null }>('PUT', `${course(userId, courseId)}/weekly-goal`, {
      minutes,
    }),
  createModule: (userId: number, courseId: number, title: string, lessons: string[] = []) =>
    request<Omit<CourseModule, 'lessons'>>('POST', `${course(userId, courseId)}/modules`, { title, lessons }),
  createLessons: (userId: number, courseId: number, moduleId: number, titles: string[]) =>
    request<Lesson[]>('POST', `${course(userId, courseId)}/modules/${moduleId}/lessons/bulk`, { titles }),
  updateLessonProgress: (userId: number, courseId: number, moduleId: number, lessonId: number, progress: LessonProgress) =>
    request<WithAchievements<{ id: number; progress: LessonProgress }>>(
      'PUT',
      `${course(userId, courseId)}/modules/${moduleId}/lessons/${lessonId}/progress`,
      { progress },
    ),
  udemyPreview: (url: string) => request<UdemyPreview>('POST', '/udemy/preview', { url }),

  startSession: (userId: number, lessonId: number, plannedMinutes: number) =>
    request<StudySession>('POST', `${user(userId)}/study-sessions`, { lessonId, plannedMinutes }),
  getActiveSession: async (userId: number): Promise<StudySession | null> => {
    try {
      return await request<StudySession>('GET', `${user(userId)}/study-sessions/active`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },
  finishSession: (userId: number, sessionId: number, focusSeconds: number, completeLesson: boolean) =>
    request<FinishResult>('POST', `${user(userId)}/study-sessions/${sessionId}/finish`, { focusSeconds, completeLesson }),
  cancelSession: (userId: number, sessionId: number) =>
    request<StudySession>('POST', `${user(userId)}/study-sessions/${sessionId}/cancel`),
  listSessions: (userId: number, take = 30) =>
    request<SessionHistoryItem[]>('GET', `${user(userId)}/study-sessions?take=${take}`),

  listNotes: (userId: number, courseId?: number) =>
    request<{ total: number; items: Note[] }>('GET', `${user(userId)}/notes${courseId ? `?courseId=${courseId}` : ''}`),
  createNote: (
    userId: number,
    payload: { courseId: number; minutes: number; mood: StudyMood; text: string; studySessionId?: number | null },
  ) => request<WithAchievements<Note>>('POST', `${user(userId)}/notes`, payload),
}
