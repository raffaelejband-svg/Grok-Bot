/**
 * Traduce le etichette ImageNet di MobileNet nelle cinque categorie dell’armadio.
 * Il confronto è sul nome intero della classe: «cardigan» non è il cane Welsh corgi,
 * e «running shoe» non è un negozio di scarpe.
 */
import type { Category } from './types.ts'

/** Sotto questa probabilità la proposta non viene compilata. */
export const MIN_CATEGORY_PROBABILITY = 0.1

const LABEL_CATEGORY: Record<string, Category> = {
  'jersey, t-shirt, tee shirt': 'top',
  sweatshirt: 'top',
  'brassiere, bra, bandeau': 'top',
  'bikini, two-piece': 'top',
  maillot: 'top',
  'maillot, tank suit': 'top',

  'jean, blue jean, denim': 'pantaloni',
  'swimming trunks, bathing trunks': 'pantaloni',

  cardigan: 'giacca',
  'suit, suit of clothes': 'giacca',
  cloak: 'giacca',
  'fur coat': 'giacca',
  'lab coat, laboratory coat': 'giacca',
  'trench coat': 'giacca',
  poncho: 'giacca',
  kimono: 'giacca',
  vestment: 'giacca',
  'academic gown, academic robe, judge\'s robe': 'giacca',
  'military uniform': 'giacca',

  'running shoe': 'scarpe',
  loafer: 'scarpe',
  sandal: 'scarpe',
  'clog, geta, patten, sabot': 'scarpe',
  'cowboy boot': 'scarpe',

  'bow tie, bow-tie, bowtie': 'accessori',
  'bolo tie, bolo, bola tie, bola': 'accessori',
  'windsor tie': 'accessori',
  'sunglasses, dark glasses, shades': 'accessori',
  sunglass: 'accessori',
  sombrero: 'accessori',
  'cowboy hat, ten-gallon hat': 'accessori',
  'bonnet, poke bonnet': 'accessori',
  mortarboard: 'accessori',
  'bathing cap, swimming cap': 'accessori',
  'shower cap': 'accessori',
  'crash helmet': 'accessori',
  'football helmet': 'accessori',
  'ski mask': 'accessori',
  'gasmask, respirator, gas helmet': 'accessori',
  mask: 'accessori',
  'oxygen mask': 'accessori',
  necklace: 'accessori',
  sock: 'accessori',
  mitten: 'accessori',
  'feather boa, boa': 'accessori',
  purse: 'accessori',
  'wallet, billfold, notecase, pocketbook': 'accessori',
  'backpack, back pack, knapsack, packsack, rucksack, haversack': 'accessori',
  umbrella: 'accessori',
  'digital watch': 'accessori',
  stole: 'accessori',
}

export type LabelScore = {
  className: string
  probability: number
}

function categoryForLabel(className: string): Category | null {
  return LABEL_CATEGORY[className.trim().toLowerCase()] ?? null
}

export function categoryFromLabels(labels: readonly LabelScore[]): Category | null {
  let best: Category | null = null
  let bestProbability = 0
  for (const label of labels) {
    if (!Number.isFinite(label.probability)) continue
    const category = categoryForLabel(label.className)
    if (!category || label.probability <= bestProbability) continue
    best = category
    bestProbability = label.probability
  }
  if (!best || bestProbability < MIN_CATEGORY_PROBABILITY) return null
  return best
}
