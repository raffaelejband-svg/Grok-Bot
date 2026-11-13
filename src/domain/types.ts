/**
 * Modello dei dati di Armadio Outfit.
 * Capi e outfit restano nel browser: questi tipi descrivono ciò che salviamo in IndexedDB.
 */

export const CATEGORIES = ['top', 'pantaloni', 'scarpe', 'giacca', 'accessori'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Top',
  pantaloni: 'Pantaloni',
  scarpe: 'Scarpe',
  giacca: 'Giacca',
  accessori: 'Accessori',
}

/** Elenco fisso di colori, in italiano. */
export const COLOURS = [
  'nero',
  'bianco',
  'grigio',
  'beige',
  'marrone',
  'blu',
  'azzurro',
  'verde',
  'rosso',
  'bordeaux',
  'rosa',
  'giallo',
  'arancione',
  'viola',
  'oro',
  'argento',
] as const
export type Colour = (typeof COLOURS)[number]

export const COLOUR_LABELS: Record<Colour, string> = {
  nero: 'Nero',
  bianco: 'Bianco',
  grigio: 'Grigio',
  beige: 'Beige',
  marrone: 'Marrone',
  blu: 'Blu',
  azzurro: 'Azzurro',
  verde: 'Verde',
  rosso: 'Rosso',
  bordeaux: 'Bordeaux',
  rosa: 'Rosa',
  giallo: 'Giallo',
  arancione: 'Arancione',
  viola: 'Viola',
  oro: 'Oro',
  argento: 'Argento',
}

export const SEASONS = ['primavera', 'estate', 'autunno', 'inverno', 'tutte'] as const
export type Season = (typeof SEASONS)[number]

export const SEASON_LABELS: Record<Season, string> = {
  primavera: 'Primavera',
  estate: 'Estate',
  autunno: 'Autunno',
  inverno: 'Inverno',
  tutte: 'Tutte le stagioni',
}

export const OCCASIONS = ['casual', 'lavoro', 'elegante', 'sport'] as const
export type Occasion = (typeof OCCASIONS)[number]

export const OCCASION_LABELS: Record<Occasion, string> = {
  casual: 'Casual',
  lavoro: 'Lavoro',
  elegante: 'Elegante',
  sport: 'Sport',
}

export type Garment = {
  id: string
  /** Foto del capo. È un Blob salvato in IndexedDB, non un indirizzo remoto. */
  photo: Blob
  category: Category
  colour: Colour
  season: Season
  occasion: Occasion
  /** Data di creazione in formato ISO 8601, per esempio 2026-11-13T13:00:00.000Z. */
  createdAt: string
}

export type Outfit = {
  id: string
  name: string
  garmentIds: string[]
  occasion: Occasion
  season: Season
  /** Data di creazione in formato ISO 8601, per esempio 2026-11-13T13:00:00.000Z. */
  createdAt: string
}
