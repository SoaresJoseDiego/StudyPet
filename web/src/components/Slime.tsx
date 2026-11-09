import { SLIMES, type SlimeKind } from '../slimes'

// Slime do design "Pet de Estudos" (Slime.dc.html): quatro tipos com cores próprias.
const COLORS: Record<SlimeKind, { fill: string; stroke: string; eye: string }> = {
  Lilas: { fill: '#D5C4EE', stroke: '#8A6FB8', eye: '#3F3358' },
  Azul: { fill: '#BFD9F2', stroke: '#5F8DB8', eye: '#27405A' },
  Rosa: { fill: '#F6C6D0', stroke: '#C27088', eye: '#5A2D3B' },
  Rei: { fill: '#C9B2EC', stroke: '#6E52A0', eye: '#2E2445' },
}

interface SlimeProps {
  kind: SlimeKind
  size?: number
  /** Silhueta para slimes ainda não encontrados. */
  locked?: boolean
}

export function Slime({ kind, size = 120, locked = false }: SlimeProps) {
  const color = COLORS[kind]
  const isKing = kind === 'Rei'
  return (
    <svg
      role="img"
      aria-label={locked ? 'Slime ainda não encontrado' : SLIMES[kind].name}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={locked ? 'slime-locked' : undefined}
    >
      <g stroke={color.stroke} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        {isKing && <path d="M36 30 L40 6 L51 19 L60 2 L69 19 L80 6 L84 30 Z" fill="#FBE7A8" stroke="#C99F45" />}
        <path
          d="M10 100 C10 52 34 22 60 22 C86 22 110 52 110 100 C110 111 100 113 60 113 C20 113 10 111 10 100 Z"
          fill={color.fill}
        />
        <ellipse cx="42" cy="44" rx="9" ry="13" fill="#FFFFFF" stroke="none" opacity="0.7" transform="rotate(24 42 44)" />
        {isKing && <path d="M34 62 L52 70 M86 62 L68 70" fill="none" stroke={color.eye} strokeWidth="5" />}
        <circle cx="44" cy="74" r="6" fill={color.eye} stroke="none" />
        <circle cx="76" cy="74" r="6" fill={color.eye} stroke="none" />
        {kind === 'Rosa' && (
          <>
            <ellipse cx="30" cy="86" rx="7" ry="4" fill="#EFA0B2" stroke="none" />
            <ellipse cx="90" cy="86" rx="7" ry="4" fill="#EFA0B2" stroke="none" />
          </>
        )}
        <path d="M54 88 Q60 93 66 88" fill="none" stroke={color.eye} strokeWidth="3" />
      </g>
    </svg>
  )
}
