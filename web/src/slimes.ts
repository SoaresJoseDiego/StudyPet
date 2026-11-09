// Espelho de StudyPet.Application.Slimes (backend): mesmas waves, mesmas chances e o mesmo
// sorteio (mulberry32 com a semente da sessão). A tela anima exatamente os slimes que a API
// vai contar ao concluir; o Exp que vale é sempre o da resposta da API.

export type SlimeKind = 'Lilas' | 'Azul' | 'Rosa' | 'Rei'

export interface SlimeInfo {
  name: string
  experience: number
  rarity: string
  description: string
}

export const SLIMES: Record<SlimeKind, SlimeInfo> = {
  Lilas: {
    name: 'Slime Lilás',
    experience: 5,
    rarity: 'Comum',
    description: 'O mais frequente: 60% dos slimes que aparecem nas waves.',
  },
  Azul: {
    name: 'Slime Azul',
    experience: 10,
    rarity: 'Incomum',
    description: 'Um pouco mais resistente: 28% de chance em cada slime da wave.',
  },
  Rosa: {
    name: 'Slime Rosado',
    experience: 15,
    rarity: 'Raro',
    description: 'Só 12% de chance. Quando aparece, a wave fica mais animada.',
  },
  Rei: {
    name: 'Slime Rei',
    experience: 30,
    rarity: 'Chefe',
    description: 'Garantido a cada 60 slimes derrotados, contando todas as sessões.',
  },
}

export const SLIME_KINDS: SlimeKind[] = ['Lilas', 'Azul', 'Rosa', 'Rei']
export const KING_EVERY = 60
export const WAVE_MS = 120_000
export const ODDS = { Lilas: 0.6, Azul: 0.28, Rosa: 0.12 } as const
export const WAVE_SIZE_ODDS = { 1: 0.25, 2: 0.5, 3: 0.25 } as const

export interface SlimeSpawn {
  wave: number
  indexInWave: number
  waveSize: number
  kind: SlimeKind
  /** Número do slime na vida do usuário (o 60º, 120º... é Rei). */
  number: number
  /** Momento, em ms de foco, em que o pet derrota este slime. */
  deathMs: number
}

/** mulberry32: mesmo algoritmo e mesma sequência que Slimes.Mulberry32 em C#. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Todos os slimes das waves que começam antes de `untilMs`. */
export function generateSlimes(seed: number, startIndex: number, untilMs: number): SlimeSpawn[] {
  const random = mulberry32(seed)
  const spawns: SlimeSpawn[] = []
  let number = startIndex

  for (let wave = 0; wave * WAVE_MS < untilMs; wave++) {
    const sizeRoll = random()
    const size = sizeRoll < 0.25 ? 1 : sizeRoll < 0.75 ? 2 : 3

    for (let index = 0; index < size; index++) {
      number++
      const kindRoll = random()
      const kind: SlimeKind =
        number % KING_EVERY === 0 ? 'Rei' : kindRoll < 0.6 ? 'Lilas' : kindRoll < 0.88 ? 'Azul' : 'Rosa'
      const deathMs = wave * WAVE_MS + Math.floor((WAVE_MS * (index + 1)) / size)
      spawns.push({ wave, indexInWave: index, waveSize: size, kind, number, deathMs })
    }
  }

  return spawns
}

export function experienceOf(spawns: SlimeSpawn[]): number {
  return spawns.reduce((total, spawn) => total + SLIMES[spawn.kind].experience, 0)
}

/** Slimes até o próximo Rei, para quem já derrotou `defeated` slimes. */
export function slimesUntilKing(defeated: number): number {
  return KING_EVERY - (defeated % KING_EVERY)
}
