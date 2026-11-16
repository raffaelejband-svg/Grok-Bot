/**
 * Traduce le etichette ImageNet di MobileNet nelle cinque categorie dell’armadio.
 * Il confronto è sul nome intero della classe: «cardigan» non è il cane Welsh corgi,
 * e «running shoe» non è un negozio di scarpe.
 */
import type { Category, Material, Occasion, SubType } from './types.ts'

/** Sotto questa probabilità la proposta non viene compilata. */
export const MIN_CATEGORY_PROBABILITY = 0.1

type LabelInfo = {
  category: Category
  subType?: SubType
  material?: Material
  occasion?: Occasion
}

/**
 * Solo le etichette ImageNet che corrispondono in modo pulito a un sotto-tipo
 * o a un materiale lo dichiarano. Il resto resta «altro» e «sconosciuto»:
 * MobileNet non vede il cotone, né una camicia distinta da una maglietta.
 */
const LABEL_INFO: Record<string, LabelInfo> = {
  'jersey, t-shirt, tee shirt': { category: 'top', subType: 't-shirt' },
  sweatshirt: { category: 'top', subType: 'felpa' },
  'brassiere, bra, bandeau': { category: 'top' },
  'bikini, two-piece': { category: 'top' },
  maillot: { category: 'top' },
  'maillot, tank suit': { category: 'top' },

  'jean, blue jean, denim': { category: 'pantaloni', subType: 'jeans', material: 'denim' },
  'swimming trunks, bathing trunks': { category: 'pantaloni', subType: 'shorts' },

  cardigan: { category: 'giacca', subType: 'cardigan' },
  'suit, suit of clothes': { category: 'giacca', subType: 'blazer', occasion: 'elegante' },
  cloak: { category: 'giacca' },
  'fur coat': { category: 'giacca', subType: 'cappotto' },
  'lab coat, laboratory coat': { category: 'giacca' },
  'trench coat': { category: 'giacca', subType: 'cappotto' },
  poncho: { category: 'giacca' },
  kimono: { category: 'giacca' },
  vestment: { category: 'giacca' },
  'academic gown, academic robe, judge\'s robe': { category: 'giacca' },
  'military uniform': { category: 'giacca' },

  'running shoe': { category: 'scarpe', subType: 'sneakers' },
  loafer: { category: 'scarpe', subType: 'mocassini' },
  sandal: { category: 'scarpe', subType: 'sandali' },
  'clog, geta, patten, sabot': { category: 'scarpe' },
  'cowboy boot': { category: 'scarpe', subType: 'stivali' },

  'bow tie, bow-tie, bowtie': { category: 'accessori' },
  'bolo tie, bolo, bola tie, bola': { category: 'accessori' },
  'windsor tie': { category: 'accessori' },
  'sunglasses, dark glasses, shades': { category: 'accessori' },
  sunglass: { category: 'accessori' },
  sombrero: { category: 'accessori', subType: 'cappello' },
  'cowboy hat, ten-gallon hat': { category: 'accessori', subType: 'cappello' },
  'bonnet, poke bonnet': { category: 'accessori', subType: 'cappello' },
  mortarboard: { category: 'accessori', subType: 'cappello' },
  'bathing cap, swimming cap': { category: 'accessori', subType: 'cappello' },
  'shower cap': { category: 'accessori', subType: 'cappello' },
  'crash helmet': { category: 'accessori', subType: 'cappello' },
  'football helmet': { category: 'accessori', subType: 'cappello' },
  'ski mask': { category: 'accessori' },
  'gasmask, respirator, gas helmet': { category: 'accessori' },
  mask: { category: 'accessori' },
  'oxygen mask': { category: 'accessori' },
  necklace: { category: 'accessori' },
  sock: { category: 'accessori' },
  mitten: { category: 'accessori' },
  'feather boa, boa': { category: 'accessori' },
  purse: { category: 'accessori', subType: 'borsa' },
  'wallet, billfold, notecase, pocketbook': { category: 'accessori' },
  'backpack, back pack, knapsack, packsack, rucksack, haversack': { category: 'accessori', subType: 'borsa' },
  umbrella: { category: 'accessori' },
  'digital watch': { category: 'accessori' },
  stole: { category: 'accessori' },
}

export type LabelDetails = {
  category: Category
  subType: SubType
  material: Material
  /** Null se l’etichetta non dice lo stile. Il completo sì: è elegante. */
  occasion: Occasion | null
}

export type LabelScore = {
  className: string
  probability: number
}

function infoForLabel(className: string): LabelInfo | null {
  return LABEL_INFO[className.trim().toLowerCase()] ?? null
}

export function detailsFromLabels(labels: readonly LabelScore[]): LabelDetails | null {
  let best: LabelInfo | null = null
  let bestProbability = 0
  for (const label of labels) {
    if (!Number.isFinite(label.probability)) continue
    const info = infoForLabel(label.className)
    if (!info || label.probability <= bestProbability) continue
    best = info
    bestProbability = label.probability
  }
  if (!best || bestProbability < MIN_CATEGORY_PROBABILITY) return null
  return {
    category: best.category,
    subType: best.subType ?? 'altro',
    material: best.material ?? 'sconosciuto',
    occasion: best.occasion ?? null,
  }
}

export function categoryFromLabels(labels: readonly LabelScore[]): Category | null {
  return detailsFromLabels(labels)?.category ?? null
}
