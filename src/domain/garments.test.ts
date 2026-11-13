import { describe, expect, it } from 'vitest'
import type { Garment } from './types.ts'
import {
  EMPTY_GARMENT_FILTER,
  filterGarments,
  hasGarmentFilter,
  parseGarmentForm,
  validateGarmentForm,
  type GarmentFilter,
} from './garments.ts'

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'capo-1',
    photo: new Blob(['foto'], { type: 'image/jpeg' }),
    category: 'top',
    colour: 'blu',
    season: 'estate',
    occasion: 'casual',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

const validFields = {
  photo: new File(['foto'], 'camicia.jpg', { type: 'image/jpeg' }),
  hasCurrentPhoto: false,
  category: 'top',
  colour: 'blu',
  season: 'estate',
  occasion: 'casual',
}

describe('filtri del guardaroba', () => {
  const capi = [
    garment({ id: 'top-blu' }),
    garment({
      id: 'scarpe-nere',
      category: 'scarpe',
      colour: 'nero',
      season: 'inverno',
      occasion: 'sport',
    }),
    garment({
      id: 'giacca-tutte',
      category: 'giacca',
      colour: 'beige',
      season: 'tutte',
      occasion: 'lavoro',
    }),
  ]

  it('senza filtri restituisce i capi nello stesso ordine', () => {
    expect(filterGarments(capi, EMPTY_GARMENT_FILTER).map((item) => item.id)).toEqual([
      'top-blu',
      'scarpe-nere',
      'giacca-tutte',
    ])
    expect(hasGarmentFilter(EMPTY_GARMENT_FILTER)).toBe(false)
  })

  it('filtra per categoria, colore e stile', () => {
    const filter: GarmentFilter = {
      ...EMPTY_GARMENT_FILTER,
      category: 'scarpe',
      colour: 'nero',
      occasion: 'sport',
    }
    expect(filterGarments(capi, filter).map((item) => item.id)).toEqual(['scarpe-nere'])
    expect(hasGarmentFilter(filter)).toBe(true)
  })

  it('con una stagione precisa tiene anche i capi per tutte le stagioni', () => {
    expect(
      filterGarments(capi, { ...EMPTY_GARMENT_FILTER, season: 'estate' }).map((item) => item.id),
    ).toEqual(['top-blu', 'giacca-tutte'])
    expect(
      filterGarments(capi, { ...EMPTY_GARMENT_FILTER, season: 'inverno' }).map((item) => item.id),
    ).toEqual(['scarpe-nere', 'giacca-tutte'])
  })

  it('il filtro tutte mostra solo i capi segnati per tutte le stagioni', () => {
    expect(
      filterGarments(capi, { ...EMPTY_GARMENT_FILTER, season: 'tutte' }).map((item) => item.id),
    ).toEqual(['giacca-tutte'])
  })

  it('unisce i quattro filtri', () => {
    const soloGiacca: GarmentFilter = {
      category: 'giacca',
      colour: 'beige',
      season: 'inverno',
      occasion: 'lavoro',
    }
    expect(filterGarments(capi, soloGiacca).map((item) => item.id)).toEqual(['giacca-tutte'])
    expect(
      filterGarments(capi, { ...soloGiacca, occasion: 'sport' }).map((item) => item.id),
    ).toEqual([])
  })
})

describe('modulo del capo', () => {
  it('accetta foto, categoria, colore, stagione e stile', () => {
    expect(validateGarmentForm(validFields)).toEqual({})
    expect(parseGarmentForm(validFields)).toEqual({
      ok: true,
      choices: {
        category: 'top',
        colour: 'blu',
        season: 'estate',
        occasion: 'casual',
      },
    })
  })

  it('in modifica la foto già salvata basta', () => {
    expect(
      validateGarmentForm({
        ...validFields,
        photo: null,
        hasCurrentPhoto: true,
      }),
    ).toEqual({})
  })

  it('chiede i campi obbligatori quando manca tutto', () => {
    expect(
      validateGarmentForm({
        photo: null,
        hasCurrentPhoto: false,
        category: '',
        colour: '',
        season: '',
        occasion: '',
      }),
    ).toEqual({
      photo: 'Aggiungi una foto del capo.',
      category: 'Scegli una categoria.',
      colour: 'Scegli un colore.',
      season: 'Scegli una stagione.',
      occasion: 'Scegli uno stile.',
    })
  })

  it('rifiuta un valore fuori dagli elenchi e un file che non è una foto', () => {
    const errors = validateGarmentForm({
      ...validFields,
      photo: new File(['ciao'], 'appunti.txt', { type: 'text/plain' }),
      category: 'cappello',
      colour: 'turchese',
      season: 'natale',
      occasion: 'festa',
    })
    expect(errors).toEqual({
      photo: 'Scegli un file immagine.',
      category: 'Scegli una categoria.',
      colour: 'Scegli un colore.',
      season: 'Scegli una stagione.',
      occasion: 'Scegli uno stile.',
    })
    expect(parseGarmentForm({ ...validFields, category: 'cappello' }).ok).toBe(false)
  })

  it('accetta una foto heic anche se il telefono non indica il tipo', () => {
    expect(
      validateGarmentForm({
        ...validFields,
        photo: new File(['heic'], 'IMG_2204.HEIC', { type: '' }),
      }),
    ).toEqual({})
  })

  it('rifiuta una foto troppo grande', () => {
    const huge = new File(['jpg'], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(huge, 'size', { value: 32 * 1024 * 1024 + 1 })
    expect(validateGarmentForm({ ...validFields, photo: huge }).photo).toBe(
      'La foto è troppo grande. Scegline una sotto i 32 MB.',
    )
  })
})
