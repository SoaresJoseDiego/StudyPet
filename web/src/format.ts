export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

export const progressLabel = {
  NotStarted: 'Não iniciada',
  InProgress: 'Em andamento',
  Completed: 'Concluída',
} as const

export const numberFormat = new Intl.NumberFormat('pt-BR')

export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${hours}h`
}

export const CATEGORY_LABELS = {
  Faculdade: 'Faculdade',
  CursoOnline: 'Curso online',
  Cursinho: 'Cursinho',
  Livro: 'Livro',
  Outro: 'Outro',
} as const

/** Cores dos cards de curso (design "Meus cursos"): faixa do topo e fundo da etiqueta. */
export const COURSE_COLORS = {
  verde: { stripe: '#8CCB9B', tint: '#E3F3EA', label: 'Verde' },
  azul: { stripe: '#9DC3E8', tint: '#E4EFF9', label: 'Azul' },
  pessego: { stripe: '#F7C4A8', tint: '#FBE9DF', label: 'Pêssego' },
  lilas: { stripe: '#D5C4EE', tint: '#EFE8F8', label: 'Lilás' },
} as const

export const MOOD_LABELS = { Facil: 'Fácil', Ok: 'Ok', Dificil: 'Difícil' } as const
export const MOOD_TINTS = { Facil: '#DDF0E6', Ok: '#EEF2F0', Dificil: '#FBE3D6' } as const
