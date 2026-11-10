import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { api } from '../api/client'
import type { CourseDetail, CourseSummary, FinishResult, StudySession } from '../api/types'
import { BattleScene } from '../components/BattleScene'
import { ErrorBox, FormProgressBar, Loading, StatCard } from '../components/ui'
import { numberFormat } from '../format'
import { formProgress, levelFor } from '../progression'
import { useSession, useUser } from '../session-context'
import { SLIMES, WAVE_MS, experienceOf, generateSlimes, slimesUntilKing } from '../slimes'
import type { NotesLocationState } from './NotesPage'

const DURATIONS = [25, 50, 75, 90]
const MAX_SECONDS = 240 * 60
const EVOLVE_BANNER_MS = 7_500

/** Estado que outras telas passam ao navegar para cá (ex.: botão "Estudar" de uma aula). */
export interface StudyLocationState {
  courseId: number
  lessonId?: number
}

interface ActiveSession {
  id: number
  lessonTitle: string
  courseId: number | null
  startedAt: number
  plannedMinutes: number
  seed: number
  slimeStartIndex: number
  /** Exp do personagem quando a sessão começou, para a prévia de evolução ao vivo. */
  baseExperience: number
}

type Overlay =
  | { kind: 'none' }
  | { kind: 'reward'; result: FinishResult; courseId: number | null }
  | { kind: 'break'; minutes: number; endsAt: number }

function toActive(session: StudySession, baseExperience: number, lessonTitle?: string): ActiveSession {
  return {
    id: session.id,
    lessonTitle: session.lessonTitle ?? lessonTitle ?? 'Aula',
    courseId: session.courseId,
    startedAt: Date.parse(session.startedAt),
    plannedMinutes: session.plannedMinutes,
    seed: session.seed,
    slimeStartIndex: session.slimeStartIndex,
    baseExperience,
  }
}

export function StudyPage() {
  const user = useUser()
  const location = useLocation()
  const preselect = (location.state as StudyLocationState | null) ?? null
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' })

  useEffect(() => {
    api
      .getActiveSession(user.id)
      .then((active) => {
        if (active) setSession(toActive(active, user.character?.experience ?? 0))
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro inesperado.'))
      .finally(() => setLoading(false))
    // Só ao abrir a tela: depois disso a sessão é controlada aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Loading />

  return (
    <div className="page">
      {error && <ErrorBox message={error} />}
      {session ? (
        <RunningSession
          key={session.id}
          session={session}
          onFinished={(result) => {
            setOverlay({ kind: 'reward', result, courseId: session.courseId })
            setSession(null)
          }}
          onCancelled={() => setSession(null)}
        />
      ) : (
        <IdleSession
          preselect={preselect}
          overlay={overlay}
          onOverlay={setOverlay}
          onStarted={(started) => {
            setOverlay({ kind: 'none' })
            setSession(started)
          }}
        />
      )}
    </div>
  )
}

function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="stack-xs">
        <h1 className="page-title">Sessão de estudo</h1>
        <p className="page-subtitle">Os slimes chegam em waves pela cerca enquanto você estuda.</p>
      </div>
      <div className="header-controls">{children}</div>
    </div>
  )
}

/* ---------- Antes de começar: escolher curso, aula e duração ---------- */

function IdleSession({
  preselect,
  overlay,
  onOverlay,
  onStarted,
}: {
  preselect: StudyLocationState | null
  overlay: Overlay
  onOverlay: (overlay: Overlay) => void
  onStarted: (session: ActiveSession) => void
}) {
  const user = useUser()
  const [courses, setCourses] = useState<CourseSummary[] | null>(null)
  const [courseId, setCourseId] = useState<number>(preselect?.courseId ?? 0)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessonId, setLessonId] = useState<number>(preselect?.lessonId ?? 0)
  const [minutes, setMinutes] = useState(25)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listCourses(user.id, 'todos')
      .then((list) => {
        setCourses(list.items)
        setCourseId((current) => current || list.items.find((c) => c.nextLesson)?.id || list.items[0]?.id || 0)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro inesperado.'))
  }, [user.id])

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    api
      .getCourse(user.id, courseId)
      .then((detail) => {
        if (cancelled) return
        setCourse(detail)
        const lessons = detail.modules.flatMap((module) => module.lessons)
        setLessonId((current) =>
          lessons.some((lesson) => lesson.id === current) ? current : (detail.nextLesson?.id ?? lessons[0]?.id ?? 0),
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro inesperado.')
      })
    return () => {
      cancelled = true
    }
  }, [user.id, courseId])

  const lessons = course?.id === courseId ? course.modules.flatMap((module) => module.lessons) : []
  const lesson = lessons.find((candidate) => candidate.id === lessonId)

  async function start() {
    if (!lesson) return
    setBusy(true)
    setError(null)
    try {
      const started = await api.startSession(user.id, lesson.id, minutes)
      onStarted(toActive(started, user.character?.experience ?? 0, lesson.title))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  const noCourses = courses !== null && courses.length === 0

  return (
    <>
      <PageHeader>
        <label className="field-inline">
          <span>Curso</span>
          <select value={courseId} onChange={(e) => setCourseId(Number(e.target.value))} disabled={!courses?.length}>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <span>Aula</span>
          <select value={lessonId} onChange={(e) => setLessonId(Number(e.target.value))} disabled={!lessons.length}>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
                {l.progress === 'Completed' ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline field-narrow">
          <span>Duração</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={busy || !lesson}>
          {busy ? 'Iniciando…' : 'Começar sessão'}
        </button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      <BattleScene focusMs={0} paused={false} active={false} stage={formProgress(user.character?.experience ?? 0).stage.number}>
        {overlay.kind === 'reward' ? (
          <RewardOverlay
            result={overlay.result}
            courseId={overlay.courseId}
            onNewSession={() => onOverlay({ kind: 'none' })}
            onBreak={(breakMinutes) =>
              onOverlay({ kind: 'break', minutes: breakMinutes, endsAt: Date.now() + breakMinutes * 60_000 })
            }
          />
        ) : overlay.kind === 'break' ? (
          <BreakOverlay minutes={overlay.minutes} endsAt={overlay.endsAt} onDone={() => onOverlay({ kind: 'none' })} />
        ) : (
          <div className="scene-card scene-intro">
            {noCourses ? (
              <>
                <p className="scene-card-title">Adicione um curso primeiro</p>
                <p className="muted">Cadastre o curso que você está fazendo, com módulos e aulas.</p>
                <Link to="/cursos/novo" className="btn btn-primary">
                  Adicionar curso
                </Link>
              </>
            ) : course && !lessons.length ? (
              <>
                <p className="scene-card-title">Este curso ainda não tem aulas</p>
                <Link to={`/cursos/${courseId}`} className="btn btn-primary">
                  Adicionar aulas
                </Link>
              </>
            ) : (
              <>
                <p className="scene-card-title">Pronto para estudar?</p>
                <p className="muted">
                  Os slimes chegam em waves de 4, sem parar, e seu pet derrota um por minuto. A cada 60 slimes derrotados aparece um Slime Rei.
                </p>
              </>
            )}
          </div>
        )}
      </BattleScene>

      <div className="grid-stats-3">
        <StatCard label="Exp nesta sessão" value="+0" />
        <StatCard label="Slimes derrotados" value="0" />
        <StageCard experience={user.character?.experience ?? 0} />
      </div>
    </>
  )
}

/* ---------- Durante a sessão: batalha ao vivo ---------- */

interface PauseState {
  pausedTotalMs: number
  pausedAt: number | null
}

const pauseKey = (sessionId: number) => `studypet.pause.${sessionId}`

function readPause(sessionId: number): PauseState {
  try {
    const raw = localStorage.getItem(pauseKey(sessionId))
    if (raw) return JSON.parse(raw) as PauseState
  } catch {
    // sem pausa salva
  }
  return { pausedTotalMs: 0, pausedAt: null }
}

function writePause(sessionId: number, state: PauseState | null) {
  try {
    if (state) localStorage.setItem(pauseKey(sessionId), JSON.stringify(state))
    else localStorage.removeItem(pauseKey(sessionId))
  } catch {
    // a pausa só não sobrevive a um recarregamento
  }
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

function RunningSession({
  session,
  onFinished,
  onCancelled,
}: {
  session: ActiveSession
  onFinished: (result: FinishResult) => void
  onCancelled: () => void
}) {
  const user = useUser()
  const { refreshUser } = useSession()
  const [pause, setPause] = useState<PauseState>(() => readPause(session.id))
  const [confirming, setConfirming] = useState(false)
  const [completeLesson, setCompleteLesson] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = useNow(100)

  const paused = pause.pausedAt !== null
  const focusMs = Math.min(
    MAX_SECONDS * 1000,
    Math.max(0, now - session.startedAt - pause.pausedTotalMs - (pause.pausedAt !== null ? now - pause.pausedAt : 0)),
  )
  const plannedMs = session.plannedMinutes * 60_000
  const remainingMs = plannedMs - focusMs
  const overtime = remainingMs < 0

  // Waves sorteadas com a semente da sessão: as mesmas que a API vai contar.
  const waveBucket = Math.floor(focusMs / WAVE_MS)
  const spawns = useMemo(
    () => generateSlimes(session.seed, session.slimeStartIndex, Math.max(plannedMs, (waveBucket + 2) * WAVE_MS)),
    [session.seed, session.slimeStartIndex, plannedMs, waveBucket],
  )
  const defeated = spawns.filter((spawn) => spawn.deathMs <= focusMs)
  const sessionExperience = experienceOf(defeated)
  const kings = defeated.filter((spawn) => spawn.kind === 'Rei').length
  const untilKing = slimesUntilKing(session.slimeStartIndex + defeated.length)
  const previewExperience = session.baseExperience + sessionExperience
  const preview = formProgress(previewExperience)

  const evolvedAtMs = useMemo(() => {
    const startStage = formProgress(session.baseExperience).stage.number
    let total = session.baseExperience
    for (const spawn of spawns) {
      total += SLIMES[spawn.kind].experience
      if (formProgress(total).stage.number > startStage) return spawn.deathMs
    }
    return null
  }, [spawns, session.baseExperience])
  const showEvolve = evolvedAtMs !== null && focusMs >= evolvedAtMs && focusMs - evolvedAtMs < EVOLVE_BANNER_MS

  useEffect(() => {
    document.title = `${overtime ? '+' : ''}${formatClock(remainingMs)} · StudyPet`
  }, [remainingMs, overtime])
  useEffect(() => () => void (document.title = 'StudyPet'), [])

  const updatePause = useCallback(
    (next: PauseState) => {
      setPause(next)
      writePause(session.id, next)
    },
    [session.id],
  )

  function togglePause() {
    if (pause.pausedAt !== null) {
      updatePause({ pausedTotalMs: pause.pausedTotalMs + (Date.now() - pause.pausedAt), pausedAt: null })
    } else {
      updatePause({ ...pause, pausedAt: Date.now() })
    }
  }

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      const result = await api.finishSession(user.id, session.id, Math.floor(focusMs / 1000), completeLesson)
      writePause(session.id, null)
      await refreshUser().catch(() => undefined)
      onFinished(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      await api.cancelSession(user.id, session.id)
      writePause(session.id, null)
      onCancelled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  const statusText = paused ? 'Pausado' : overtime ? 'Tempo concluído!' : 'Tempo restante'
  const wave = waveBucket + 1

  return (
    <>
      <PageHeader>
        <div className="timer-box">
          <span className="timer-status">{statusText}</span>
          <span className="timer-clock" aria-live="off">
            {overtime ? '+' : ''}
            {formatClock(remainingMs)}
          </span>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={togglePause} disabled={busy || confirming}>
          {paused ? 'Continuar' : 'Pausar'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-lg"
          onClick={() => {
            if (!paused) togglePause()
            setConfirming(true)
          }}
          disabled={busy || confirming}
        >
          Concluir
        </button>
        <button type="button" className="btn btn-danger-ghost" onClick={cancel} disabled={busy}>
          Cancelar
        </button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      <BattleScene
        focusMs={focusMs}
        paused={paused}
        active
        stage={preview.stage.number}
        spawns={spawns}
        evolving={showEvolve}
        banner={showEvolve ? `Evoluiu para ${preview.stage.name}!` : null}
        badge={`${session.lessonTitle} · wave ${wave}`}
      >
        {confirming && (
          <div className="scene-overlay">
            <div role="dialog" aria-label="Concluir sessão" className="scene-card">
              <p className="scene-card-title">Concluir a sessão?</p>
              <p className="muted">
                {Math.floor(focusMs / 60_000)} min de foco, <strong>{defeated.length}</strong>{' '}
                {defeated.length === 1 ? 'slime derrotado' : 'slimes derrotados'} e{' '}
                <strong>+{sessionExperience} Exp</strong> antes dos bônus.
              </p>
              <label className="check">
                <input type="checkbox" checked={completeLesson} onChange={(e) => setCompleteLesson(e.target.checked)} />
                Terminei esta aula
              </label>
              <div className="row center wrap">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setConfirming(false)
                    togglePause()
                  }}
                  disabled={busy}
                >
                  Voltar a estudar
                </button>
                <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>
                  {busy ? 'Salvando…' : 'Concluir sessão'}
                </button>
              </div>
            </div>
          </div>
        )}
      </BattleScene>

      <div className="grid-stats-3">
        <StatCard label="Exp nesta sessão" value={`+${numberFormat.format(sessionExperience)}`} hint="bônus somados ao concluir" />
        <StatCard
          label="Slimes derrotados"
          value={defeated.length}
          hint={kings > 0 ? `${kings} ${kings === 1 ? 'Slime Rei' : 'Slimes Rei'}!` : `próximo Rei em ${untilKing} slimes`}
        />
        <StageCard experience={previewExperience} />
      </div>
    </>
  )
}

function StageCard({ experience }: { experience: number }) {
  const progress = formProgress(experience)
  return (
    <div className="stat-card">
      <div className="row-between">
        <span className="stage-name">{progress.stage.name}</span>
        <span className="strong">Nível {levelFor(experience)}</span>
      </div>
      <FormProgressBar percent={progress.percent} label="Progresso até a próxima forma" />
      <span className="small strong muted">
        {progress.next ? `${numberFormat.format(progress.experienceToNext)} Exp até ${progress.next.name}` : 'Forma final'}
      </span>
    </div>
  )
}

/* ---------- Depois: recompensa e pausa ---------- */

function RewardOverlay({
  result,
  courseId,
  onNewSession,
  onBreak,
}: {
  result: FinishResult
  courseId: number | null
  onNewSession: () => void
  onBreak: (minutes: number) => void
}) {
  const navigate = useNavigate()
  const { reward, character, evolved, leveledUp, slimes, newAchievements } = result
  const breakdown = [
    slimes.lilas && `${slimes.lilas} lilás`,
    slimes.azul && `${slimes.azul} ${slimes.azul === 1 ? 'azul' : 'azuis'}`,
    slimes.rosa && `${slimes.rosa} ${slimes.rosa === 1 ? 'rosado' : 'rosados'}`,
    slimes.rei && `${slimes.rei} ${slimes.rei === 1 ? 'Slime Rei' : 'Slimes Rei'}`,
  ].filter(Boolean)

  function writeNote() {
    const state: NotesLocationState = {
      courseId: courseId ?? undefined,
      minutes: result.session.focusMinutes,
      sessionId: result.session.id,
    }
    navigate('/registros', { state })
  }

  return (
    <div className="scene-overlay">
      <div role="status" className="scene-card">
        <p className="scene-card-title big">
          {evolved
            ? `Evoluiu para ${character?.stageName}!`
            : leveledUp
              ? `Subiu para o nível ${character?.level}!`
              : 'Sessão concluída!'}
        </p>
        <p className="strong muted">
          +{numberFormat.format(reward.experience)} Exp · {slimes.total}{' '}
          {slimes.total === 1 ? 'slime derrotado' : 'slimes derrotados'}
        </p>
        {breakdown.length > 0 && <p className="small muted">{breakdown.join(' · ')}</p>}
        {(reward.firstSessionOfDay || reward.dailyGoalReached) && (
          <div className="chips center">
            {reward.firstSessionOfDay && <span className="chip">Primeira sessão do dia +10%</span>}
            {reward.dailyGoalReached && <span className="chip">Meta diária concluída +20%</span>}
          </div>
        )}
        {newAchievements.length > 0 && (
          <div className="chips center">
            {newAchievements.map((achievement) => (
              <span key={achievement.key} className="chip chip-gold">
                Conquista: {achievement.name}
              </span>
            ))}
          </div>
        )}
        <p className="small muted">
          Que tal uma pausa de {reward.suggestedBreakMinutes} min? E anote no diário o que aprendeu.
        </p>
        <div className="row center wrap">
          <button type="button" className="btn btn-primary" onClick={writeNote}>
            Escrever registro
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onBreak(reward.suggestedBreakMinutes)}>
            Fazer pausa
          </button>
          <button type="button" className="btn btn-ghost" onClick={onNewSession}>
            Nova sessão
          </button>
        </div>
      </div>
    </div>
  )
}

function BreakOverlay({ minutes, endsAt, onDone }: { minutes: number; endsAt: number; onDone: () => void }) {
  const now = useNow(250)
  const remaining = endsAt - now
  const done = remaining <= 0

  useEffect(() => {
    document.title = done ? 'Pausa concluída · StudyPet' : `Pausa ${formatClock(remaining)} · StudyPet`
  }, [remaining, done])
  useEffect(() => () => void (document.title = 'StudyPet'), [])

  return (
    <div className="scene-overlay">
      <div role="status" className="scene-card">
        <p className="scene-card-title">{done ? 'Pausa concluída' : `Pausa de ${minutes} min`}</p>
        <span className="timer-clock">{done ? '00:00' : formatClock(remaining)}</span>
        <p className="muted">
          {done ? 'Pronto para o próximo ciclo?' : 'Levante, beba água, alongue-se. Seu pet também descansa.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {done ? 'Nova sessão' : 'Encerrar pausa'}
        </button>
      </div>
    </div>
  )
}
