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

/**
 * Sotto-tipi fissi. «altro» vale quando non si sa.
 * Top: camicia, maglione, t-shirt, felpa, polo.
 * Pantaloni: jeans, chino, pantaloni eleganti, shorts.
 * Giacca: blazer, cappotto, giubbotto, cardigan.
 * Scarpe: sneakers, stivali, mocassini, sandali, scarpe eleganti.
 * Accessori: borsa, cintura, cappello, sciarpa.
 */
export const SUBTYPES = [
  'camicia',
  'maglione',
  't-shirt',
  'felpa',
  'polo',
  'jeans',
  'chino',
  'pantaloni eleganti',
  'shorts',
  'blazer',
  'cappotto',
  'giubbotto',
  'cardigan',
  'sneakers',
  'stivali',
  'mocassini',
  'sandali',
  'scarpe eleganti',
  'borsa',
  'cintura',
  'cappello',
  'sciarpa',
  'altro',
] as const
export type SubType = (typeof SUBTYPES)[number]

export const SUBTYPE_LABELS: Record<SubType, string> = {
  camicia: 'Camicia',
  maglione: 'Maglione',
  't-shirt': 'T-shirt',
  felpa: 'Felpa',
  polo: 'Polo',
  jeans: 'Jeans',
  chino: 'Chino',
  'pantaloni eleganti': 'Pantaloni eleganti',
  shorts: 'Shorts',
  blazer: 'Blazer',
  cappotto: 'Cappotto',
  giubbotto: 'Giubbotto',
  cardigan: 'Cardigan',
  sneakers: 'Sneakers',
  stivali: 'Stivali',
  mocassini: 'Mocassini',
  sandali: 'Sandali',
  'scarpe eleganti': 'Scarpe eleganti',
  borsa: 'Borsa',
  cintura: 'Cintura',
  cappello: 'Cappello',
  sciarpa: 'Sciarpa',
  altro: 'Altro',
}

export const SUBTYPES_BY_CATEGORY: Record<Category, readonly SubType[]> = {
  top: ['camicia', 'maglione', 't-shirt', 'felpa', 'polo', 'altro'],
  pantaloni: ['jeans', 'chino', 'pantaloni eleganti', 'shorts', 'altro'],
  giacca: ['blazer', 'cappotto', 'giubbotto', 'cardigan', 'altro'],
  scarpe: ['sneakers', 'stivali', 'mocassini', 'sandali', 'scarpe eleganti', 'altro'],
  accessori: ['borsa', 'cintura', 'cappello', 'sciarpa', 'altro'],
}

export function subtypesForCategory(category: Category | ''): readonly SubType[] {
  if (category === '') return ['altro']
  return SUBTYPES_BY_CATEGORY[category]
}

export function subtypeFits(category: Category, subType: SubType): boolean {
  return SUBTYPES_BY_CATEGORY[category].includes(subType)
}

/** Disegno del tessuto. La tinta unita sta con tutto. */
export const PATTERNS = ['tinta unita', 'righe', 'quadri', 'fantasia'] as const
export type Pattern = (typeof PATTERNS)[number]

export const PATTERN_LABELS: Record<Pattern, string> = {
  'tinta unita': 'Tinta unita',
  righe: 'Righe',
  quadri: 'Quadri',
  fantasia: 'Fantasia',
}

/**
 * Materiale, solo se si può dire. «sconosciuto» è il valore quando non si sa.
 * «altro» è un materiale visto, ma fuori da questo elenco.
 */
export const MATERIALS = ['cotone', 'lana', 'denim', 'pelle', 'sintetico', 'altro', 'sconosciuto'] as const
export type Material = (typeof MATERIALS)[number]

export const MATERIAL_LABELS: Record<Material, string> = {
  cotone: 'Cotone',
  lana: 'Lana',
  denim: 'Denim',
  pelle: 'Pelle',
  sintetico: 'Sintetico',
  altro: 'Altro',
  sconosciuto: 'Non lo so',
}

export type Garment = {
  id: string
  /** Foto del capo. È un Blob salvato in IndexedDB, non un indirizzo remoto. */
  photo: Blob
  category: Category
  colour: Colour
  /** Secondo colore. Assente o null sui capi vecchi e quando non c’è. */
  colourSecondary?: Colour | null
  /** Sotto-tipo. Assente sui capi vecchi: vale «altro». */
  subType?: SubType
  /** Disegno. Assente sui capi vecchi: vale «tinta unita». */
  pattern?: Pattern
  /** Materiale. Assente sui capi vecchi: vale «sconosciuto». */
  material?: Material
  season: Season
  /** Stile del capo. Sono le stesse occasioni: casual, lavoro, elegante, sport. */
  occasion: Occasion
  /** Data di creazione in formato ISO 8601, per esempio 2026-11-13T13:00:00.000Z. */
  createdAt: string
  /** Ultima modifica, per allineare i dispositivi. Se manca, vale createdAt. */
  updatedAt?: string
}

export type Outfit = {
  id: string
  name: string
  garmentIds: string[]
  occasion: Occasion
  season: Season
  /** Data di creazione in formato ISO 8601, per esempio 2026-11-13T13:00:00.000Z. */
  createdAt: string
  /** Ultima modifica, per allineare i dispositivi. Se manca, vale createdAt. */
  updatedAt?: string
}
