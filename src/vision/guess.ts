import type { Category, Colour, Material, Occasion, Pattern, Season, SubType } from '../domain/types.ts'

/** Proposta da mostrare nel modulo. I campi null non sovrascrivono quello che c’è già. */
export type GarmentGuess = {
  category: Category | null
  subType: SubType | null
  colour: Colour | null
  colourSecondary: Colour | null
  pattern: Pattern | null
  material: Material | null
  occasion: Occasion | null
  season: Season | null
  source: 'device' | 'cloud'
  /** Nota in italiano, per esempio se Gemini non ha risposto. */
  note?: string
}

export const CLOUD_FALLBACK_NOTE =
  'Il servizio online non ha risposto. Ho usato il riconoscimento sul telefono.'
