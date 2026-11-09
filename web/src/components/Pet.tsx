// Pet do design "Pet de Estudos" (canvas no claude.ai), convertido de Pet.dc.html.
// Quatro formas: 1 Semente, 2 Broto, 3 Muda, 4 Florescido. Cores fixas do design;
// as animações (respirar, piscar, balançar) ficam em index.css nas classes pet-*.

export type PetStageNumber = 1 | 2 | 3 | 4
export type PetMood = 'idle' | 'sleepy' | 'celebrate'

const STAGE_LABELS: Record<PetStageNumber, string> = {
  1: 'Pet no estágio Semente',
  2: 'Pet no estágio Broto',
  3: 'Pet no estágio Muda, segurando um livro',
  4: 'Pet no estágio Florescido: monstro com chifres, presas, garras e cauda com espinhos, ainda com a flor na cabeça',
}

const STAGES = { 1: Stage1, 2: Stage2, 3: Stage3, 4: Stage4 } as const

interface PetProps {
  stage: number
  size?: number
  mood?: PetMood
  /** Classe extra no wrapper, para animações de batalha (pet-lunge, pet-evolve). */
  actionClass?: string
}

export function Pet({ stage, size = 200, mood = 'idle', actionClass = '' }: PetProps) {
  const safeStage = (Math.min(4, Math.max(1, Math.round(stage))) as PetStageNumber)
  const Drawing = STAGES[safeStage]
  return (
    <div className={`pet pet-mood-${mood} ${actionClass}`} style={{ width: size, height: Math.round((size * 340) / 320) }}>
      <div className="pet-breathe">
        <svg role="img" aria-label={STAGE_LABELS[safeStage]} viewBox="0 0 320 340" width="100%" height="100%">
          <Drawing />
        </svg>
      </div>
    </div>
  )
}

function Stage1() {
  return (
    <>
      <g transform="translate(160 320) scale(0.74) translate(-120 -262)" stroke="#4F9A80" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="90" cy="250" rx="20" ry="12" fill="#A3D9C1" />
      <ellipse cx="150" cy="250" rx="20" ry="12" fill="#A3D9C1" />
      <path d="M120 98 C168 98 200 134 200 178 C200 222 164 250 120 250 C76 250 40 222 40 178 C40 134 72 98 120 98 Z" fill="#BDE7D3" />
      <g className="pet-sprout">
      <path d="M120 100 C120 88 120 78 120 68" fill="none" stroke="#5FA877" strokeWidth="7" />
      <path d="M120 70 C104 42 78 44 70 58 C84 76 106 80 120 70 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 70 C136 42 162 44 170 58 C156 76 134 80 120 70 Z" fill="#8CCB9B" stroke="#5FA877" />
      </g>
      <g stroke="none">
      <ellipse cx="66" cy="202" rx="14" ry="8" fill="#F7C4A8" />
      <ellipse cx="174" cy="202" rx="14" ry="8" fill="#F7C4A8" />
      <g className="pet-eyes">
      <ellipse cx="90" cy="176" rx="17" ry="21" fill="#2C4742" />
      <ellipse cx="150" cy="176" rx="17" ry="21" fill="#2C4742" />
      <circle cx="96" cy="167" r="7" fill="#FFFFFF" />
      <circle cx="156" cy="167" r="7" fill="#FFFFFF" />
      <circle cx="84" cy="186" r="3.5" fill="#FFFFFF" />
      <circle cx="144" cy="186" r="3.5" fill="#FFFFFF" />
      </g>
      </g>
      <path d="M112 204 Q120 212 128 204" fill="none" stroke="#2C4742" strokeWidth="4" />
      </g>
    </>
  )
}

function Stage2() {
  return (
    <>
      <g transform="translate(160 320) scale(0.9) translate(-120 -262)" stroke="#4F9A80" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="98" cy="256" rx="18" ry="10" fill="#A3D9C1" />
      <ellipse cx="142" cy="256" rx="18" ry="10" fill="#A3D9C1" />
      <path d="M86 196 C82 236 92 256 120 256 C148 256 158 236 154 196 Z" fill="#BDE7D3" />
      <ellipse cx="120" cy="232" rx="20" ry="17" fill="#FBF4E4" stroke="none" />
      <ellipse cx="78" cy="220" rx="11" ry="16" fill="#A3D9C1" transform="rotate(24 78 220)" />
      <ellipse cx="162" cy="220" rx="11" ry="16" fill="#A3D9C1" transform="rotate(-24 162 220)" />
      <path className="pet-ear-l" d="M50 122 C28 106 18 92 20 82 C38 82 58 96 64 112 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path className="pet-ear-r" d="M190 122 C212 106 222 92 220 82 C202 82 182 96 176 112 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 62 C176 62 202 98 202 138 C202 180 166 202 120 202 C74 202 38 180 38 138 C38 98 64 62 120 62 Z" fill="#BDE7D3" />
      <g className="pet-sprout">
      <path d="M120 64 C120 52 120 40 120 30" fill="none" stroke="#5FA877" strokeWidth="7" />
      <path d="M120 34 C100 2 68 6 58 22 C76 44 104 46 120 34 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 34 C140 2 172 6 182 22 C164 44 136 46 120 34 Z" fill="#8CCB9B" stroke="#5FA877" />
      </g>
      <g stroke="none">
      <ellipse cx="66" cy="162" rx="13" ry="8" fill="#F7C4A8" />
      <ellipse cx="174" cy="162" rx="13" ry="8" fill="#F7C4A8" />
      <g className="pet-eyes">
      <ellipse cx="90" cy="136" rx="17" ry="22" fill="#2C4742" />
      <ellipse cx="150" cy="136" rx="17" ry="22" fill="#2C4742" />
      <circle cx="96" cy="127" r="7" fill="#FFFFFF" />
      <circle cx="156" cy="127" r="7" fill="#FFFFFF" />
      <circle cx="84" cy="147" r="3.5" fill="#FFFFFF" />
      <circle cx="144" cy="147" r="3.5" fill="#FFFFFF" />
      </g>
      </g>
      <path d="M110 164 Q120 176 130 164" fill="none" stroke="#2C4742" strokeWidth="4" />
      </g>
    </>
  )
}

function Stage3() {
  return (
    <>
      <g transform="translate(160 320) scale(1.03) translate(-120 -262)" stroke="#4F9A80" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path className="pet-tail" d="M158 240 C190 252 216 238 222 212 C202 208 180 214 162 226 Z" fill="#8CCB9B" stroke="#5FA877" />
      <ellipse cx="96" cy="258" rx="20" ry="11" fill="#A3D9C1" />
      <ellipse cx="144" cy="258" rx="20" ry="11" fill="#A3D9C1" />
      <path d="M78 190 C70 236 84 260 120 260 C156 260 170 236 162 190 Z" fill="#BDE7D3" />
      <path d="M76 192 Q120 216 164 192 L160 208 Q120 232 80 208 Z" fill="#F7C4A8" stroke="#D98E6E" />
      <rect x="94" y="222" width="52" height="34" rx="5" fill="#EFA07F" stroke="#D98E6E" />
      <path d="M120 222 V256" fill="none" stroke="#D98E6E" />
      <ellipse cx="90" cy="240" rx="11" ry="14" fill="#A3D9C1" />
      <ellipse cx="150" cy="240" rx="11" ry="14" fill="#A3D9C1" />
      <path className="pet-ear-l" d="M44 112 C14 98 0 76 2 60 C24 58 54 74 64 98 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path className="pet-ear-r" d="M196 112 C226 98 240 76 238 60 C216 58 186 74 176 98 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 52 C180 52 206 90 206 132 C206 178 168 198 120 198 C72 198 34 178 34 132 C34 90 60 52 120 52 Z" fill="#BDE7D3" />
      <g className="pet-sprout">
      <path d="M120 54 C120 44 120 36 120 26" fill="none" stroke="#5FA877" strokeWidth="7" />
      <path d="M120 38 C96 10 62 12 50 30 C70 52 104 54 120 38 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 38 C144 10 178 12 190 30 C170 52 136 54 120 38 Z" fill="#8CCB9B" stroke="#5FA877" />
      <path d="M120 2 C134 8 136 24 120 30 C104 24 106 8 120 2 Z" fill="#F7C4A8" stroke="#D98E6E" />
      </g>
      <g stroke="none">
      <ellipse cx="64" cy="156" rx="13" ry="8" fill="#F7C4A8" />
      <ellipse cx="176" cy="156" rx="13" ry="8" fill="#F7C4A8" />
      <g className="pet-eyes">
      <ellipse cx="90" cy="128" rx="18" ry="23" fill="#2C4742" />
      <ellipse cx="150" cy="128" rx="18" ry="23" fill="#2C4742" />
      <circle cx="97" cy="118" r="8" fill="#FFFFFF" />
      <circle cx="157" cy="118" r="8" fill="#FFFFFF" />
      <circle cx="83" cy="140" r="4" fill="#FFFFFF" />
      <circle cx="143" cy="140" r="4" fill="#FFFFFF" />
      </g>
      </g>
      <path d="M108 158 Q120 172 132 158" fill="none" stroke="#2C4742" strokeWidth="4" />
      </g>
    </>
  )
}

function Stage4() {
  return (
    <>
      <g transform="translate(160 320) scale(1.12) translate(-120 -262)" stroke="#3F8069" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M70 186 C52 196 40 204 28 204 C36 214 40 222 36 234 C46 234 54 238 58 246 C50 252 46 258 44 264 L196 264 C194 258 190 252 182 246 C186 238 194 234 204 234 C200 222 204 214 212 204 C200 204 188 196 170 186 Z" fill="#6FB387" stroke="#4A8C6A" />
      <g className="pet-tail">
      <g fill="#FBF4E4" stroke="#B9A888">
      <path d="M184 232 L190 208 L202 226 Z" />
      <path d="M204 222 L214 198 L222 214 Z" />
      </g>
      <path d="M160 226 C182 234 202 228 214 210 L242 190 L236 226 C226 254 190 264 160 252 Z" fill="#8CCB9B" stroke="#4A8C6A" />
      </g>
      <ellipse cx="94" cy="258" rx="26" ry="12" fill="#A3D9C1" />
      <ellipse cx="146" cy="258" rx="26" ry="12" fill="#A3D9C1" />
      <g fill="#FBF4E4" stroke="#B9A888" strokeWidth="3">
      <path d="M74 262 L70 274 L82 268 Z" />
      <path d="M88 266 L86 278 L97 270 Z" />
      <path d="M104 266 L104 278 L113 268 Z" />
      <path d="M136 266 L136 278 L127 268 Z" />
      <path d="M152 266 L154 278 L143 270 Z" />
      <path d="M166 262 L170 274 L158 268 Z" />
      </g>
      <path d="M70 190 C54 236 76 262 120 262 C164 262 186 236 170 190 Z" fill="#BDE7D3" />
      <ellipse cx="120" cy="236" rx="27" ry="21" fill="#FBF4E4" stroke="none" />
      <path d="M97 228 Q120 236 143 228 M95 241 Q120 250 145 241" fill="none" stroke="#DDD0B2" strokeWidth="3" />
      <ellipse cx="62" cy="226" rx="16" ry="25" fill="#A3D9C1" transform="rotate(16 62 226)" />
      <ellipse cx="178" cy="226" rx="16" ry="25" fill="#A3D9C1" transform="rotate(-16 178 226)" />
      <g fill="#FBF4E4" stroke="#B9A888" strokeWidth="3">
      <path d="M44 244 L38 258 L51 252 Z" />
      <path d="M54 250 L51 264 L62 254 Z" />
      <path d="M196 244 L202 258 L189 252 Z" />
      <path d="M186 250 L189 264 L178 254 Z" />
      </g>
      <path className="pet-ear-l" d="M42 116 C20 108 8 100 -6 84 L8 84 L-6 58 L18 66 L22 46 C40 58 56 78 64 100 Z" fill="#8CCB9B" stroke="#4A8C6A" />
      <path className="pet-ear-r" d="M198 116 C220 108 232 100 246 84 L232 84 L246 58 L222 66 L218 46 C200 58 184 78 176 100 Z" fill="#8CCB9B" stroke="#4A8C6A" />
      <path d="M120 58 C96 30 62 32 50 50 C70 72 104 74 120 58 Z" fill="#6FB387" stroke="#4A8C6A" />
      <path d="M120 58 C144 30 178 32 190 50 C170 72 136 74 120 58 Z" fill="#6FB387" stroke="#4A8C6A" />
      <g fill="#FBF4E4" stroke="#B9A888">
      <path d="M70 74 C56 52 54 30 68 10 C72 32 84 50 98 60 Z" />
      <path d="M170 74 C184 52 186 30 172 10 C168 32 156 50 142 60 Z" />
      </g>
      <path d="M120 54 C180 54 206 92 208 134 C210 176 176 204 120 204 C64 204 30 176 32 134 C34 92 60 54 120 54 Z" fill="#BDE7D3" />
      <g className="pet-flower" fill="#EFA07F" stroke="#C97D5C">
      <path d="M120 36 C106 22 108 6 120 -6 C132 6 134 22 120 36 Z" />
      <path d="M120 36 C106 22 108 6 120 -6 C132 6 134 22 120 36 Z" transform="rotate(72 120 36)" />
      <path d="M120 36 C106 22 108 6 120 -6 C132 6 134 22 120 36 Z" transform="rotate(144 120 36)" />
      <path d="M120 36 C106 22 108 6 120 -6 C132 6 134 22 120 36 Z" transform="rotate(216 120 36)" />
      <path d="M120 36 C106 22 108 6 120 -6 C132 6 134 22 120 36 Z" transform="rotate(288 120 36)" />
      </g>
      <circle cx="120" cy="36" r="11" fill="#FBE7A8" stroke="#D9B45E" />
      <g stroke="none">
      <ellipse cx="60" cy="160" rx="12" ry="7" fill="#F7C4A8" />
      <ellipse cx="180" cy="160" rx="12" ry="7" fill="#F7C4A8" />
      <g className="pet-eyes">
      <ellipse cx="90" cy="130" rx="18" ry="23" fill="#2C4742" />
      <ellipse cx="150" cy="130" rx="18" ry="23" fill="#2C4742" />
      <circle cx="96" cy="128" r="7" fill="#FFFFFF" />
      <circle cx="156" cy="128" r="7" fill="#FFFFFF" />
      <circle cx="83" cy="144" r="4" fill="#FFFFFF" />
      <circle cx="143" cy="144" r="4" fill="#FFFFFF" />
      </g>
      <path d="M66 100 L116 100 L116 124 L66 108 Z" fill="#BDE7D3" />
      <path d="M174 100 L124 100 L124 124 L174 108 Z" fill="#BDE7D3" />
      <circle cx="10" cy="150" r="5" fill="#FBE7A8" />
      <circle cx="232" cy="150" r="4" fill="#FBE7A8" />
      <circle cx="24" cy="190" r="3" fill="#FBE7A8" />
      <circle cx="222" cy="112" r="3" fill="#FBE7A8" />
      </g>
      <path d="M66 108 L116 124 M174 108 L124 124" fill="none" stroke="#2C4742" strokeWidth="7" />
      <path d="M98 162 Q120 178 142 162" fill="none" stroke="#2C4742" strokeWidth="4" />
      <g fill="#FFFFFF" stroke="#2C4742" strokeWidth="2.5">
      <path d="M104 166 L108 182 L115 171 Z" />
      <path d="M136 166 L132 182 L125 171 Z" />
      </g>
      </g>
    </>
  )
}
