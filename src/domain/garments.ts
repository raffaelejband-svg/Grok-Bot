/**
 * Regole del guardaroba che non toccano il browser:
 * quali capi restano visibili e quando il modulo è completo.
 */
import {
  CATEGORIES,
  COLOURS,
  OCCASIONS,
  SEASONS,
  type Category,
  type Colour,
  type Garment,
  type Occasion,
  type Season,
} from './types.ts'

export type GarmentFilter = {
  category: Category | ''
  colour: Colour | ''
  season: Season | ''
  occasion: Occasion | ''
}

export const EMPTY_GARMENT_FILTER: GarmentFilter = {
  category: '',
  colour: '',
  season: '',
  occasion: '',
}

export function hasGarmentFilter(filter: GarmentFilter): boolean {
  return filter.category !== '' || filter.colour !== '' || filter.season !== '' || filter.occasion !== ''
}

/**
 * Un campo vuoto non restringe.
 * Un capo «tutte le stagioni» resta visibile se scegli una stagione precisa,
 * perché lo indossi anche in quella. Il filtro «tutte» mostra solo quei capi.
 */
export function filterGarments(garments: readonly Garment[], filter: GarmentFilter): Garment[] {
  return garments.filter((garment) => {
    if (filter.category && garment.category !== filter.category) return false
    if (filter.colour && garment.colour !== filter.colour) return false
    if (!matchesSeason(garment.season, filter.season)) return false
    if (filter.occasion && garment.occasion !== filter.occasion) return false
    return true
  })
}

function matchesSeason(garmentSeason: Season, filterSeason: Season | ''): boolean {
  if (filterSeason === '') return true
  if (garmentSeason === filterSeason) return true
  return filterSeason !== 'tutte' && garmentSeason === 'tutte'
}

export type GarmentFormInput = {
  photo: Blob | null
  hasCurrentPhoto: boolean
  category: string
  colour: string
  season: string
  occasion: string
}

export type GarmentFormErrors = Partial<Record<'photo' | 'category' | 'colour' | 'season' | 'occasion', string>>

export type GarmentChoices = {
  category: Category
  colour: Colour
  season: Season
  occasion: Occasion
}

const MAX_PHOTO_BYTES = 32 * 1024 * 1024
const IMAGE_EXTENSION = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value)
}

function photoError(photo: Blob): string | undefined {
  if (photo.size > MAX_PHOTO_BYTES) {
    return 'La foto è troppo grande. Scegline una sotto i 32 MB.'
  }
  if (photo.type.startsWith('image/')) return undefined
  if (photo instanceof File && IMAGE_EXTENSION.test(photo.name)) return undefined
  return 'Scegli un file immagine.'
}

export function validateGarmentForm(input: GarmentFormInput): GarmentFormErrors {
  const errors: GarmentFormErrors = {}

  if (input.photo) {
    const problem = photoError(input.photo)
    if (problem) errors.photo = problem
  } else if (!input.hasCurrentPhoto) {
    errors.photo = 'Aggiungi una foto del capo.'
  }

  if (!isOneOf(input.category, CATEGORIES)) errors.category = 'Scegli una categoria.'
  if (!isOneOf(input.colour, COLOURS)) errors.colour = 'Scegli un colore.'
  if (!isOneOf(input.season, SEASONS)) errors.season = 'Scegli una stagione.'
  if (!isOneOf(input.occasion, OCCASIONS)) errors.occasion = 'Scegli uno stile.'

  return errors
}

export function parseGarmentForm(
  input: GarmentFormInput,
): { ok: true; choices: GarmentChoices } | { ok: false; errors: GarmentFormErrors } {
  const errors = validateGarmentForm(input)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  if (
    !isOneOf(input.category, CATEGORIES) ||
    !isOneOf(input.colour, COLOURS) ||
    !isOneOf(input.season, SEASONS) ||
    !isOneOf(input.occasion, OCCASIONS)
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    choices: {
      category: input.category,
      colour: input.colour,
      season: input.season,
      occasion: input.occasion,
    },
  }
}
