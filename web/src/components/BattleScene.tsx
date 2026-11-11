import { useState, type CSSProperties, type ReactNode } from 'react'
import { SLIMES, WAVE_MS, type SlimeKind, type SlimeSpawn } from '../slimes'
import { Pet } from './Pet'
import { Slime } from './Slime'

// Cena "Web · Batalha" do design. Os slimes chegam em waves de 4 (ver slimes.ts): todos nascem
// juntos na cerca quando a wave começa, entram pulando até o campo, seguem avançando devagar,
// sempre para frente, e cada um dá o bote para chegar ao pet no seu `deathMs`, um por minuto.
// A wave seguinte entra quando o último cai, então a cena nunca esvazia. Os deslocamentos são
// animações CSS (suaves, 60 fps), sincronizadas com o tempo de foco ao montar e congeladas na
// pausa; a etapa de cada slime (entrando, na fila, no bote, morrendo) vem de `focusMs`.

const PET_ZONE = 236 // px reservados ao pet à esquerda
const ENTER_MS = 15_000
const CHARGE_MS = 4_000
/** Onde cada slime da wave termina a entrada: 0 é o pet, 1 é a cerca. O primeiro a cair fica mais perto. */
const QUEUE_SLOTS = [0.35, 0.55, 0.75, 0.9]
/** Até que fração da sua posição inicial o slime avança antes do bote. */
const ADVANCE_RATIO = 0.4
const DIE_MS = 400
const BURST_MS = 320
const POP_MS = 1_200
const LUNGE_BEFORE_MS = 300
const LUNGE_AFTER_MS = 120
const WAVE_BANNER_MS = 2_500
const LANES = [0, 22, 10, 30]

interface BattleSceneProps {
  focusMs: number
  paused: boolean
  /** false antes de começar: só o pet e a cerca, sem slimes. */
  active: boolean
  stage: number
  spawns?: SlimeSpawn[]
  badge?: string
  banner?: string | null
  evolving?: boolean
  children?: ReactNode
}

export function BattleScene({ focusMs, paused, active, stage, spawns = [], badge, banner, evolving, children }: BattleSceneProps) {
  const visible = active
    ? spawns.filter((spawn) => spawn.wave * WAVE_MS <= focusMs && focusMs < spawn.deathMs + DIE_MS)
    : []
  const recentDeaths = active ? spawns.filter((spawn) => spawn.deathMs <= focusMs && focusMs < spawn.deathMs + POP_MS) : []
  const lunging =
    active &&
    !paused &&
    spawns.some((spawn) => focusMs >= spawn.deathMs - LUNGE_BEFORE_MS && focusMs < spawn.deathMs + LUNGE_AFTER_MS)

  const wave = Math.floor(focusMs / WAVE_MS)
  const waveSpawns = active ? spawns.filter((spawn) => spawn.wave === wave) : []
  const showWave = active && !banner && waveSpawns.length > 0 && focusMs - wave * WAVE_MS < WAVE_BANNER_MS
  const hasKing = waveSpawns.some((spawn) => spawn.kind === 'Rei')

  const petAction = evolving ? 'pet-evolve' : lunging ? 'pet-lunge' : ''

  return (
    <div className="scene">
      <SceneBackground />

      {badge && <div className="scene-badge">{badge}</div>}
      {banner ? (
        <div role="status" className="scene-banner">
          {banner}
        </div>
      ) : (
        showWave && (
          <div key={`wave-${wave}`} className={`scene-banner scene-wave ${hasKing ? 'scene-wave-king' : ''}`}>
            Wave {wave + 1} · {waveSpawns.length} {waveSpawns.length === 1 ? 'slime' : 'slimes'}
            {hasKing ? ' · Slime Rei!' : ''}
          </div>
        )
      )}

      <div className="scene-pet">
        <Pet stage={stage} size={220} mood={paused ? 'sleepy' : 'idle'} actionClass={petAction} />
      </div>

      {visible.map((spawn) =>
        focusMs < spawn.deathMs ? (
          <ApproachingSlime key={spawn.number} spawn={spawn} focusMs={focusMs} paused={paused} />
        ) : (
          <DyingSlime key={spawn.number} spawn={spawn} burst={focusMs < spawn.deathMs + BURST_MS} />
        ),
      )}

      {recentDeaths.map((spawn, index) => (
        <ExpPop key={`pop-${spawn.number}`} kind={spawn.kind} offset={index} />
      ))}

      {children}
    </div>
  )
}

function slimeSize(kind: SlimeKind) {
  return kind === 'Rei' ? 176 : 124
}

function laneStyle(spawn: SlimeSpawn): CSSProperties {
  const lane = spawn.kind === 'Rei' ? 0 : LANES[spawn.indexInWave % LANES.length]
  return {
    bottom: 44 + lane,
    zIndex: 60 - lane,
    ['--slime-base' as string]: `${slimeSize(spawn.kind)}px`,
    ['--pet-zone' as string]: `${PET_ZONE}px`,
  }
}

/** Ponto do caminho entre o pet (0) e a cerca (1), como valor CSS de `left`. */
function trackPosition(fraction: number) {
  return `calc(var(--pet-zone) + (100% - var(--pet-zone) - var(--slime-size) - 16px) * ${fraction})`
}

interface SlimeMotionProps {
  spawn: SlimeSpawn
  focusMs: number
  paused: boolean
}

/** Escolhe o trecho do slime vivo: entrando pela cerca, avançando pelo campo ou dando o bote. */
function ApproachingSlime({ spawn, focusMs, paused }: SlimeMotionProps) {
  const spawnMs = spawn.wave * WAVE_MS
  const slotFraction = QUEUE_SLOTS[spawn.indexInWave % QUEUE_SLOTS.length]
  const slot = trackPosition(slotFraction)
  const advanced = trackPosition(slotFraction * ADVANCE_RATIO)
  const advanceStart = spawnMs + ENTER_MS
  const chargeStart = spawn.deathMs - CHARGE_MS
  const motion = { spawn, focusMs, paused }

  if (focusMs < advanceStart) {
    return <TravelingSlime key="enter" {...motion} from={trackPosition(1)} to={slot} startMs={spawnMs} durationMs={ENTER_MS} hop="slime-jump" />
  }
  if (focusMs < chargeStart) {
    return <TravelingSlime key="advance" {...motion} from={slot} to={advanced} startMs={advanceStart} durationMs={chargeStart - advanceStart} hop="slime-wait" />
  }
  return <TravelingSlime key="charge" {...motion} from={advanced} to={trackPosition(0)} startMs={chargeStart} durationMs={CHARGE_MS} hop="slime-charge" />
}

interface TravelingSlimeProps extends SlimeMotionProps {
  from: string
  to: string
  startMs: number
  durationMs: number
  hop: string
}

/** Desloca o slime com animação CSS. O atraso negativo é fixado ao montar. */
function TravelingSlime({ spawn, focusMs, paused, from, to, startMs, durationMs, hop }: TravelingSlimeProps) {
  // Quanto do trecho já passou ao aparecer na tela (ao retomar uma sessão, ele volta no meio do caminho).
  const [elapsedAtMount] = useState(() => focusMs - startMs)
  return (
    <div
      className="scene-slime scene-slime-travel"
      style={{
        ...laneStyle(spawn),
        ['--travel-from' as string]: from,
        ['--travel-to' as string]: to,
        animationDuration: `${durationMs}ms`,
        animationDelay: `${-elapsedAtMount}ms`,
        animationPlayState: paused ? 'paused' : 'running',
      }}
    >
      <HoppingSlime spawn={spawn} paused={paused} hop={hop} />
    </div>
  )
}

/** Os pulos ficam defasados entre os slimes para a wave não saltar em uníssono. */
function HoppingSlime({ spawn, paused, hop }: { spawn: SlimeSpawn; paused: boolean; hop: string }) {
  return (
    <div className={paused ? 'slime-rest' : hop} style={{ animationDelay: `${-spawn.indexInWave * 137}ms` }}>
      <Slime kind={spawn.kind} size={slimeSize(spawn.kind)} />
    </div>
  )
}

function DyingSlime({ spawn, burst }: { spawn: SlimeSpawn; burst: boolean }) {
  return (
    <div className="scene-slime scene-slime-arrived" style={laneStyle(spawn)}>
      <div className="slime-die">
        <Slime kind={spawn.kind} size={slimeSize(spawn.kind)} />
      </div>
      {burst && (
        <svg className="hit-burst scene-burst" aria-hidden="true" viewBox="0 0 72 72" width="72" height="72">
          <path
            d="M36 2 L44 26 L70 20 L52 38 L68 60 L42 50 L32 70 L28 46 L4 50 L20 32 L6 12 L30 22 Z"
            fill="#FBE7A8"
            stroke="#EFA07F"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}

/** Balão "+N Exp" com as cores de cada slime (design "Sistema de Exp"). */
function ExpPop({ kind, offset }: { kind: SlimeKind; offset: number }) {
  return (
    <div className={`exp-pop scene-pop pop-${kind}`} aria-hidden="true" style={{ bottom: (kind === 'Rei' ? 285 : 230) + offset * 34 }}>
      {kind === 'Rei' && (
        <svg viewBox="0 0 40 22" width="36" height="20" className="pop-crown">
          <path d="M4 20 L7 4 L15 12 L20 2 L25 12 L33 4 L36 20 Z" fill="#FBE7A8" stroke="#C99F45" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      )}
      <div className="exp-pop-bubble">+{SLIMES[kind].experience} Exp</div>
      <svg viewBox="0 0 20 11" width="20" height="11" className="exp-pop-tail">
        <path d="M1 0 L10 10 L19 0" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Céu, morros, cerca e grama: decoração da cena, igual ao design. */
function SceneBackground() {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 1000 120" preserveAspectRatio="none" className="scene-clouds">
        <g fill="#FFFFFF" opacity="0.85">
          <ellipse cx="160" cy="50" rx="60" ry="18" />
          <ellipse cx="200" cy="38" rx="40" ry="20" />
          <ellipse cx="720" cy="70" rx="70" ry="16" />
          <ellipse cx="760" cy="58" rx="38" ry="18" />
        </g>
      </svg>
      <svg aria-hidden="true" viewBox="0 0 1000 200" preserveAspectRatio="none" className="scene-hills">
        <path d="M0 200 V120 C120 60 240 50 360 100 C480 150 600 70 720 60 C840 50 920 90 1000 80 V200 Z" fill="#CDEAD7" />
        <path d="M0 200 V150 C150 110 300 120 450 140 C600 160 750 110 1000 130 V200 Z" fill="#B9E0C7" />
      </svg>
      <svg aria-hidden="true" className="scene-fence">
        <defs>
          <pattern id="scene-fence-pattern" width="72" height="84" patternUnits="userSpaceOnUse">
            <rect x="0" y="30" width="72" height="9" fill="#E6C9A0" />
            <rect x="0" y="56" width="72" height="9" fill="#E6C9A0" />
            <path d="M28 84 V18 L36 6 L44 18 V84 Z" fill="#F3DEC0" stroke="#BF9A6E" strokeWidth="2.5" strokeLinejoin="round" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="84" fill="url(#scene-fence-pattern)" />
      </svg>
      <div className="scene-ground" />
      <svg aria-hidden="true" viewBox="0 0 1000 120" preserveAspectRatio="none" className="scene-grass">
        <g fill="none" stroke="#86C59A" strokeWidth="3" strokeLinecap="round">
          <path d="M120 100 L126 84 M130 100 L132 80 M140 100 L146 86" />
          <path d="M430 60 L436 44 M440 60 L442 40 M450 60 L456 46" />
          <path d="M640 108 L646 92 M650 108 L652 88 M660 108 L666 94" />
          <path d="M880 70 L886 54 M890 70 L892 50 M900 70 L906 56" />
        </g>
        <g fill="#F7C4A8" stroke="#EFA07F" strokeWidth="2">
          <circle cx="300" cy="96" r="5" />
          <circle cx="560" cy="40" r="4" />
          <circle cx="780" cy="100" r="5" />
          <circle cx="950" cy="30" r="4" />
        </g>
      </svg>
    </>
  )
}
