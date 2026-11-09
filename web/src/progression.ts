// Espelho de StudyPet.Application.CharacterProgression (backend): curva do design
// "Sistema de Exp", em que subir do nível N para o N+1 custa 20 × N^1,35, arredondado de 5 em 5.
import type { Character } from './api/types'

export const STAGES = [
  { number: 1, name: 'Semente', minLevel: 1 },
  { number: 2, name: 'Broto', minLevel: 10 },
  { number: 3, name: 'Muda', minLevel: 25 },
  { number: 4, name: 'Florescido', minLevel: 50 },
] as const

export type Stage = (typeof STAGES)[number]

const MAX_LEVEL = 200

export function stepCost(level: number): number {
  return Math.round((20 * Math.pow(level, 1.35)) / 5) * 5
}

const TOTAL_TO_REACH: number[] = (() => {
  const table = [0, 0]
  for (let level = 2; level <= MAX_LEVEL + 1; level++) table[level] = table[level - 1] + stepCost(level - 1)
  return table
})()

export function experienceToReach(level: number): number {
  return level <= 1 ? 0 : TOTAL_TO_REACH[Math.min(level, MAX_LEVEL + 1)]
}

export function levelFor(experience: number): number {
  let level = 1
  while (level < MAX_LEVEL && experience >= experienceToReach(level + 1)) level++
  return level
}

export function stageFor(level: number): Stage {
  return [...STAGES].reverse().find((stage) => level >= stage.minLevel) ?? STAGES[0]
}

export interface FormProgress {
  stage: Stage
  next: Stage | null
  /** 0–100: progresso entre o Exp da forma atual e o da próxima. */
  percent: number
  experienceToNext: number
  experienceIntoForm: number
  experienceForForm: number
}

/** Progresso até a próxima forma do pet, como nos cards do design. */
export function formProgress(experience: number): FormProgress {
  const stage = stageFor(levelFor(experience))
  const next = STAGES.find((candidate) => candidate.number === stage.number + 1) ?? null
  if (!next) {
    return { stage, next, percent: 100, experienceToNext: 0, experienceIntoForm: 0, experienceForForm: 0 }
  }
  const from = experienceToReach(stage.minLevel)
  const to = experienceToReach(next.minLevel)
  return {
    stage,
    next,
    percent: Math.min(100, Math.floor(((experience - from) / (to - from)) * 100)),
    experienceToNext: to - experience,
    experienceIntoForm: experience - from,
    experienceForForm: to - from,
  }
}

export function characterFormProgress(character: Character | null | undefined): FormProgress {
  return formProgress(character?.experience ?? 0)
}

/** Progresso dentro do nível atual (barra "nível 12 → 13"). */
export function levelProgress(experience: number) {
  const level = levelFor(experience)
  const from = experienceToReach(level)
  const to = experienceToReach(level + 1)
  return { level, into: experience - from, needed: to - from, percent: Math.floor(((experience - from) / (to - from)) * 100) }
}
