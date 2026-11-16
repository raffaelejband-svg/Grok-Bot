/**
 * Compone un outfit con i capi che la persona ha già.
 * Stesso seme, stesso risultato. Un seme nuovo può scegliere un’altra combinazione.
 */
import type { Category, Colour, Garment, Material, Occasion, Pattern, Season } from './types.ts'

const PIECE_ORDER = ['top', 'pantaloni', 'scarpe', 'giacca', 'accessori'] as const satisfies readonly Category[]
const REQUIRED_SLOTS = ['top', 'pantaloni', 'scarpe'] as const satisfies readonly Category[]

/**
 * Nero, bianco, grigio e beige stanno con ogni colore.
 * Nell’elenco dei colori non ci sono navy né blu scuro: blu resta un colore forte.
 */
const NEUTRALS: ReadonlySet<Colour> = new Set(['nero', 'bianco', 'grigio', 'beige'])

/** Coppie forti che non mettiamo nello stesso outfit. L’ordine non conta. */
const CLASH_PAIRS: ReadonlyArray<readonly [Colour, Colour]> = [
  ['rosso', 'verde'],
  ['bordeaux', 'verde'],
  ['arancione', 'viola'],
  ['giallo', 'viola'],
]

const CLASHES: ReadonlySet<string> = new Set(CLASH_PAIRS.map(([left, right]) => clashKey(left, right)))

const REQUIRED_LABELS = {
  top: 'un top',
  pantaloni: 'un paio di pantaloni',
  scarpe: 'un paio di scarpe',
} as const

const SWAP_DONE: Record<Category, string> = {
  top: 'Ho cambiato il top.',
  pantaloni: 'Ho cambiato i pantaloni.',
  scarpe: 'Ho cambiato le scarpe.',
  giacca: 'Ho cambiato la giacca.',
  accessori: 'Ho cambiato l’accessorio.',
}

export type SuggestedOutfit = {
  top: Garment
  pantaloni: Garment
  scarpe: Garment
  giacca?: Garment
  accessori?: Garment
  occasion: Occasion
  season: Season
  /** none: occasione e stagione rispettate. occasion: stagione sì, occasione allargata. season: anche la stagione è allargata. */
  relaxed: 'none' | 'occasion' | 'season'
  /** Frase breve in italiano, da mostrare accanto al look. */
  reason: string
}

export type GenerateOutfitResult = { ok: true; outfit: SuggestedOutfit } | { ok: false; reason: string }

export type SwapPieceResult = {
  outfit: SuggestedOutfit
  swapped: boolean
  reason: string
}

type Relaxation = 0 | 1 | 2

type CorePieces = {
  top: Garment
  pantaloni: Garment
  scarpe: Garment
  giacca?: Garment
  accessori?: Garment
}

/** Null se top, pantaloni e scarpe ci sono già. Altrimenti il testo per la schermata vuota. */
export function requiredGarmentsReason(garments: readonly Garment[]): string | null {
  const missing = REQUIRED_SLOTS.filter((slot) => !garments.some((garment) => garment.category === slot))
  if (missing.length === 0) return null
  const names = missing.map((slot) => REQUIRED_LABELS[slot])
  const verb = missing.length === 1 ? 'Aggiungilo' : 'Aggiungili'
  return `Per un outfit servono ${joinItalian(names)}. ${verb} nel guardaroba.`
}

export function listOutfitPieces(outfit: SuggestedOutfit): Array<{ slot: Category; garment: Garment }> {
  const pieces: Array<{ slot: Category; garment: Garment }> = []
  for (const slot of PIECE_ORDER) {
    const garment = readPiece(outfit, slot)
    if (garment) pieces.push({ slot, garment })
  }
  return pieces
}

export function generateOutfit(
  garments: readonly Garment[],
  occasion: Occasion,
  season: Season,
  seed: number,
): GenerateOutfitResult {
  const missing = requiredGarmentsReason(garments)
  if (missing) return { ok: false, reason: missing }

  const random = mulberry32(seed)
  const harmonies: readonly Harmony[] = [
    { pattern: true, formality: true },
    { pattern: true, formality: false },
    { pattern: false, formality: false },
  ]
  for (const level of [0, 1, 2] as const) {
    for (const harmony of harmonies) {
      const pieces = assemble(garments, occasion, season, level, random, harmony)
      if (!pieces) continue
      return { ok: true, outfit: finishOutfit(pieces, occasion, season) }
    }
  }

  return {
    ok: false,
    reason: 'I colori non stanno bene insieme. Aggiungi un capo neutro, come nero, bianco, grigio o beige.',
  }
}

export function swapPiece(
  outfit: SuggestedOutfit,
  slot: Category,
  garments: readonly Garment[],
  seed: number,
): SwapPieceResult {
  const current = readPiece(outfit, slot)
  if (!current) {
    return { outfit, swapped: false, reason: 'Non c’è un capo da cambiare in questo posto.' }
  }

  const kept = listOutfitPieces(outfit)
    .filter((piece) => piece.slot !== slot)
    .map((piece) => piece.garment)
  const options = garments.filter((garment) => garment.category === slot && garment.id !== current.id)
  const ordered = shuffledByPreference(options, outfit.occasion, outfit.season, mulberry32(seed))
  const keptPatternClash = patternsClash(kept)
  const keptFormalityClash = formalitiesClash(kept)

  for (const candidate of ordered) {
    const group = [...kept, candidate]
    if (!coloursFit(group.map((garment) => garment.colour))) continue
    if (!keptPatternClash && patternsClash(group)) continue
    if (!keptFormalityClash && formalitiesClash(group)) continue
    return {
      outfit: finishOutfit(replacePiece(outfit, slot, candidate), outfit.occasion, outfit.season),
      swapped: true,
      reason: SWAP_DONE[slot],
    }
  }

  return { outfit, swapped: false, reason: 'Non ho un altro capo che stia bene in questo outfit.' }
}

function finishOutfit(pieces: CorePieces, occasion: Occasion, season: Season): SuggestedOutfit {
  const chosen = [pieces.top, pieces.pantaloni, pieces.scarpe, pieces.giacca, pieces.accessori].filter(
    (garment): garment is Garment => garment !== undefined,
  )
  return {
    top: pieces.top,
    pantaloni: pieces.pantaloni,
    scarpe: pieces.scarpe,
    ...(pieces.giacca ? { giacca: pieces.giacca } : {}),
    ...(pieces.accessori ? { accessori: pieces.accessori } : {}),
    occasion,
    season,
    ...describeRelaxation(maxLevel(chosen, occasion, season), chosen),
  }
}

function groupFits(garments: readonly Garment[], harmony: Harmony): boolean {
  if (!coloursFit(garments.map((garment) => garment.colour))) return false
  if (harmony.pattern && patternsClash(garments)) return false
  if (harmony.formality && formalitiesClash(garments)) return false
  return true
}

function assemble(
  garments: readonly Garment[],
  occasion: Occasion,
  season: Season,
  level: Relaxation,
  random: () => number,
  harmony: Harmony,
): CorePieces | null {
  const tops = garments.filter((garment) => garment.category === 'top' && minimumLevel(garment, occasion, season) <= level)
  const pants = garments.filter(
    (garment) => garment.category === 'pantaloni' && minimumLevel(garment, occasion, season) <= level,
  )
  const shoes = garments.filter(
    (garment) => garment.category === 'scarpe' && minimumLevel(garment, occasion, season) <= level,
  )
  if (tops.length === 0 || pants.length === 0 || shoes.length === 0) return null

  const orderedTops = shuffledByPreference(tops, occasion, season, random)
  const orderedPants = shuffledByPreference(pants, occasion, season, random)
  const orderedShoes = shuffledByPreference(shoes, occasion, season, random)

  for (const top of orderedTops) {
    for (const pantaloni of orderedPants) {
      for (const scarpe of orderedShoes) {
        const core = [top, pantaloni, scarpe]
        if (!groupFits(core, harmony)) continue
        const giacca = firstThatFits(garments, 'giacca', occasion, season, level, core, random, harmony)
        const withJacket = giacca ? [...core, giacca] : core
        const accessori = firstThatFits(garments, 'accessori', occasion, season, level, withJacket, random, harmony)
        return {
          top,
          pantaloni,
          scarpe,
          ...(giacca ? { giacca } : {}),
          ...(accessori ? { accessori } : {}),
        }
      }
    }
  }

  return null
}

function firstThatFits(
  garments: readonly Garment[],
  slot: 'giacca' | 'accessori',
  occasion: Occasion,
  season: Season,
  level: Relaxation,
  chosen: readonly Garment[],
  random: () => number,
  harmony: Harmony,
): Garment | undefined {
  const pool = garments.filter((garment) => garment.category === slot && minimumLevel(garment, occasion, season) <= level)
  const ordered = shuffledByPreference(pool, occasion, season, random)
  return ordered.find((garment) => groupFits([...chosen, garment], harmony))
}

function shuffledByPreference(
  items: readonly Garment[],
  occasion: Occasion,
  season: Season,
  random: () => number,
): Garment[] {
  const tiers: [Garment[], Garment[], Garment[]] = [[], [], []]
  for (const item of items) tiers[minimumLevel(item, occasion, season)].push(item)
  return tiers.flatMap((tier) => shuffleByMaterial(tier, season, random))
}

function shuffleByMaterial(items: readonly Garment[], season: Season, random: () => number): Garment[] {
  const groups = new Map<number, Garment[]>()
  for (const item of items) {
    const rank = materialRank(item.material, season)
    const group = groups.get(rank) ?? []
    group.push(item)
    groups.set(rank, group)
  }
  const ranks = [...groups.keys()].sort((left, right) => right - left)
  return ranks.flatMap((rank) => shuffle(groups.get(rank) ?? [], random))
}

/** 0 occasione e stagione, 1 solo stagione, 2 anche la stagione è diversa. «tutte» vale per ogni stagione. */
function minimumLevel(garment: Garment, occasion: Occasion, season: Season): Relaxation {
  const seasonOk = garment.season === 'tutte' || season === 'tutte' || garment.season === season
  if (garment.occasion === occasion && seasonOk) return 0
  if (seasonOk) return 1
  return 2
}

function maxLevel(garments: readonly Garment[], occasion: Occasion, season: Season): Relaxation {
  let level: Relaxation = 0
  for (const garment of garments) {
    const next = minimumLevel(garment, occasion, season)
    if (next > level) level = next
  }
  return level
}

function describeRelaxation(level: Relaxation, pieces: readonly Garment[]): Pick<SuggestedOutfit, 'relaxed' | 'reason'> {
  const base =
    level === 0
      ? 'I capi vanno bene per questa occasione e questa stagione.'
      : level === 1
        ? 'Non bastavano i capi per questa occasione: ho usato anche altre occasioni, nella stessa stagione.'
        : 'Non bastavano i capi di stagione: ho cercato anche nel resto del guardaroba.'
  const notes = [base]
  if (formalitiesClash(pieces)) {
    notes.push('Ho messo insieme sport ed elegante perché non c’era un’alternativa migliore.')
  }
  if (patternsClash(pieces)) {
    notes.push('Ho accostato disegni diversi perché non c’era un’alternativa migliore.')
  }
  const relaxed = level === 0 ? 'none' : level === 1 ? 'occasion' : 'season'
  return { relaxed, reason: notes.join(' ') }
}

function patternOf(garment: Garment): Pattern {
  return garment.pattern ?? 'tinta unita'
}

/** Tinta unita sta con tutto. Righe e quadri non stanno insieme. Due fantasie, o una fantasia con un altro disegno, no. */
function pairPatternsClash(left: Pattern, right: Pattern): boolean {
  if (left === 'tinta unita' || right === 'tinta unita') return false
  if (left === 'fantasia' || right === 'fantasia') return true
  return left !== right
}

function patternsClash(garments: readonly Garment[]): boolean {
  for (let left = 0; left < garments.length; left += 1) {
    for (let right = left + 1; right < garments.length; right += 1) {
      const first = garments[left]
      const second = garments[right]
      if (first && second && pairPatternsClash(patternOf(first), patternOf(second))) return true
    }
  }
  return false
}

/** Sport ed elegante non stanno nello stesso look, se c’è un’alternativa. */
function formalitiesClash(garments: readonly Garment[]): boolean {
  let sport = false
  let elegante = false
  for (const garment of garments) {
    if (garment.occasion === 'sport') sport = true
    if (garment.occasion === 'elegante') elegante = true
  }
  return sport && elegante
}

/**
 * Più alto è meglio, dentro lo stesso livello di occasione e stagione.
 * La lana esce dall’estate se c’è un’alternativa. Il denim in mezza stagione va bene.
 * Un materiale sconosciuto non viene punito come se fosse lana.
 */
function materialRank(material: Material | undefined, season: Season): number {
  const value = material ?? 'sconosciuto'
  if (season === 'tutte' || value === 'sconosciuto' || value === 'altro') return 1
  if (season === 'estate') {
    if (value === 'lana') return 0
    if (value === 'pelle') return 1
    if (value === 'denim') return 2
    return 3
  }
  if (season === 'inverno') {
    if (value === 'lana' || value === 'pelle') return 3
    if (value === 'cotone') return 1
    return 2
  }
  if (value === 'denim' || value === 'cotone') return 3
  if (value === 'lana' || value === 'pelle' || value === 'sintetico') return 2
  return 1
}

type Harmony = {
  pattern: boolean
  formality: boolean
}

function coloursFit(colours: readonly Colour[]): boolean {
  for (let left = 0; left < colours.length; left += 1) {
    for (let right = left + 1; right < colours.length; right += 1) {
      const first = colours[left]
      const second = colours[right]
      if (first !== undefined && second !== undefined && coloursClash(first, second)) return false
    }
  }
  return true
}

function coloursClash(left: Colour, right: Colour): boolean {
  if (left === right || NEUTRALS.has(left) || NEUTRALS.has(right)) return false
  return CLASHES.has(clashKey(left, right))
}

function clashKey(left: Colour, right: Colour): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

function readPiece(outfit: SuggestedOutfit, slot: Category): Garment | undefined {
  switch (slot) {
    case 'top':
      return outfit.top
    case 'pantaloni':
      return outfit.pantaloni
    case 'scarpe':
      return outfit.scarpe
    case 'giacca':
      return outfit.giacca
    case 'accessori':
      return outfit.accessori
    default: {
      const exhaustive: never = slot
      return exhaustive
    }
  }
}

function replacePiece(outfit: SuggestedOutfit, slot: Category, garment: Garment): CorePieces {
  const next: CorePieces = {
    top: outfit.top,
    pantaloni: outfit.pantaloni,
    scarpe: outfit.scarpe,
    ...(outfit.giacca ? { giacca: outfit.giacca } : {}),
    ...(outfit.accessori ? { accessori: outfit.accessori } : {}),
  }
  switch (slot) {
    case 'top':
      next.top = garment
      break
    case 'pantaloni':
      next.pantaloni = garment
      break
    case 'scarpe':
      next.scarpe = garment
      break
    case 'giacca':
      next.giacca = garment
      break
    case 'accessori':
      next.accessori = garment
      break
    default: {
      const exhaustive: never = slot
      return exhaustive
    }
  }
  return next
}

function joinItalian(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = copy[index]
    const other = copy[swapIndex]
    if (current === undefined || other === undefined) continue
    copy[index] = other
    copy[swapIndex] = current
  }
  return copy
}

/** Generatore deterministico. Lo stesso seme produce la stessa sequenza. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
