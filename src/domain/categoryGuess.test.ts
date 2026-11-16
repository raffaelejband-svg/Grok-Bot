import { describe, expect, it } from 'vitest'
import { MIN_CATEGORY_PROBABILITY, categoryFromLabels, detailsFromLabels } from './categoryGuess.ts'

function only(className: string, probability = 0.4) {
  return categoryFromLabels([{ className, probability }])
}

describe('categoria dalle etichette', () => {
  it('mappa i capi ImageNet sulle cinque categorie', () => {
    expect(only('jersey, T-shirt, tee shirt')).toBe('top')
    expect(only('sweatshirt')).toBe('top')
    expect(only('jean, blue jean, denim')).toBe('pantaloni')
    expect(only('swimming trunks, bathing trunks')).toBe('pantaloni')
    expect(only('cardigan')).toBe('giacca')
    expect(only('trench coat')).toBe('giacca')
    expect(only('suit, suit of clothes')).toBe('giacca')
    expect(only('running shoe')).toBe('scarpe')
    expect(only('Loafer')).toBe('scarpe')
    expect(only('cowboy boot')).toBe('scarpe')
    expect(only('purse')).toBe('accessori')
    expect(only('sunglasses, dark glasses, shades')).toBe('accessori')
    expect(only('bow tie, bow-tie, bowtie')).toBe('accessori')
  })

  it('non scambia un nome simile per un capo', () => {
    expect(only('Cardigan, Cardigan Welsh corgi')).toBeNull()
    expect(only('shoe shop, shoe-shop, shoe store')).toBeNull()
    expect(only('maillot, tank suit')).toBe('top')
    expect(only('miniskirt, mini')).toBeNull()
    expect(only('pajama, pyjama, pj\'s, jammies')).toBeNull()
    expect(only('gown')).toBeNull()
    expect(only('plastic bag')).toBeNull()
  })

  it('ignora una proposta troppo debole e tiene la più probabile', () => {
    expect(only('jersey, T-shirt, tee shirt', MIN_CATEGORY_PROBABILITY - 0.01)).toBeNull()
    expect(
      categoryFromLabels([
        { className: 'studio couch, day bed', probability: 0.62 },
        { className: 'jean, blue jean, denim', probability: 0.11 },
        { className: 'sock', probability: 0.09 },
      ]),
    ).toBe('pantaloni')
  })

  it('con un elenco vuoto non inventa una categoria', () => {
    expect(categoryFromLabels([])).toBeNull()
    expect(detailsFromLabels([])).toBeNull()
  })

  it('compila sotto-tipo e materiale solo quando l’etichetta è chiara', () => {
    expect(detailsFromLabels([{ className: 'jean, blue jean, denim', probability: 0.4 }])).toEqual({
      category: 'pantaloni',
      subType: 'jeans',
      material: 'denim',
      occasion: null,
    })
    expect(detailsFromLabels([{ className: 'running shoe', probability: 0.4 }])).toEqual({
      category: 'scarpe',
      subType: 'sneakers',
      material: 'sconosciuto',
      occasion: null,
    })
    expect(detailsFromLabels([{ className: 'Loafer', probability: 0.4 }])?.subType).toBe('mocassini')
    expect(detailsFromLabels([{ className: 'sandal', probability: 0.4 }])?.subType).toBe('sandali')
    expect(detailsFromLabels([{ className: 'cowboy boot', probability: 0.4 }])?.subType).toBe('stivali')
    expect(detailsFromLabels([{ className: 'jersey, T-shirt, tee shirt', probability: 0.4 }])?.subType).toBe('t-shirt')
    expect(detailsFromLabels([{ className: 'sweatshirt', probability: 0.4 }])?.subType).toBe('felpa')
    expect(detailsFromLabels([{ className: 'cardigan', probability: 0.4 }])).toMatchObject({
      subType: 'cardigan',
      material: 'sconosciuto',
    })
    expect(detailsFromLabels([{ className: 'trench coat', probability: 0.4 }])?.subType).toBe('cappotto')
    expect(detailsFromLabels([{ className: 'purse', probability: 0.4 }])?.subType).toBe('borsa')
    expect(detailsFromLabels([{ className: 'suit, suit of clothes', probability: 0.4 }])).toMatchObject({
      subType: 'blazer',
      occasion: 'elegante',
    })
  })

  it('non inventa il materiale se l’etichetta non lo dice', () => {
    expect(detailsFromLabels([{ className: 'running shoe', probability: 0.4 }])?.material).toBe('sconosciuto')
    expect(detailsFromLabels([{ className: 'cardigan', probability: MIN_CATEGORY_PROBABILITY - 0.01 }])).toBeNull()
  })
})
