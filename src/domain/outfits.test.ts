// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Garment } from './types.ts'
import {
  generateOutfit,
  listOutfitPieces,
  requiredGarmentsReason,
  swapPiece,
  type GenerateOutfitResult,
  type SuggestedOutfit,
} from './outfits.ts'

function garment(overrides: Partial<Garment> & Pick<Garment, 'id' | 'category'>): Garment {
  return {
    photo: new Blob(['foto']),
    colour: 'nero',
    season: 'estate',
    occasion: 'casual',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function signature(result: GenerateOutfitResult): string {
  if (!result.ok) return `no:${result.reason}`
  return listOutfitPieces(result.outfit)
    .map((piece) => piece.garment.id)
    .join(',')
}

type MensOutfit = SuggestedOutfit & { top: Garment; pantaloni: Garment }

function expectOutfit(result: GenerateOutfitResult): MensOutfit {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.reason)
  return result.outfit as MensOutfit
}

function topOf(outfit: SuggestedOutfit): Garment {
  if (!outfit.top) throw new Error('manca il top')
  return outfit.top
}

function pantsOf(outfit: SuggestedOutfit): Garment {
  if (!outfit.pantaloni) throw new Error('mancano i pantaloni')
  return outfit.pantaloni
}

const basics = [
  garment({ id: 'top', category: 'top' }),
  garment({ id: 'pants', category: 'pantaloni' }),
  garment({ id: 'shoes', category: 'scarpe' }),
]

describe('generateOutfit', () => {
  it('compone top, pantaloni e scarpe e lascia giacca e accessori facoltativi', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          ...basics,
          garment({ id: 'jacket', category: 'giacca', colour: 'beige' }),
          garment({ id: 'bag', category: 'accessori', colour: 'nero' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.top.category).toBe('top')
    expect(outfit.pantaloni.category).toBe('pantaloni')
    expect(outfit.scarpe.category).toBe('scarpe')
    expect(outfit.giacca?.id).toBe('jacket')
    expect(outfit.accessori?.id).toBe('bag')
    expect(listOutfitPieces(outfit).map((piece) => piece.slot)).toEqual([
      'top',
      'pantaloni',
      'scarpe',
      'giacca',
      'accessori',
    ])
  })

  it('un vestito sostituisce top e pantaloni', () => {
    const wardrobe = [
      garment({ id: 'dress', category: 'vestito', colour: 'rosso', subType: 'abito' }),
      garment({ id: 'bad-shoes', category: 'scarpe', colour: 'verde' }),
      garment({ id: 'heels', category: 'scarpe', colour: 'nero', subType: 'tacchi' }),
      garment({ id: 'jacket', category: 'giacca', colour: 'verde' }),
      garment({ id: 'bag', category: 'accessori', colour: 'beige', subType: 'borsa' }),
    ]
    expect(requiredGarmentsReason(wardrobe, 'donna')).toBeNull()
    expect(generateOutfit(wardrobe, 'elegante', 'estate', 1).ok).toBe(false)

    const outfit = expectOutfit(generateOutfit(wardrobe, 'elegante', 'estate', 1, 'donna'))

    expect(outfit.vestito?.id).toBe('dress')
    expect(outfit.scarpe.id).toBe('heels')
    expect(outfit.top).toBeUndefined()
    expect(outfit.pantaloni).toBeUndefined()
    expect(outfit.gonna).toBeUndefined()
    expect(outfit.giacca).toBeUndefined()
    expect(outfit.accessori?.id).toBe('bag')
    expect(listOutfitPieces(outfit).map((piece) => piece.slot)).toEqual(['vestito', 'scarpe', 'accessori'])
  })

  it('una gonna sostituisce i pantaloni', () => {
    const wardrobe = [
      garment({ id: 'top', category: 'top', colour: 'bianco' }),
      garment({ id: 'skirt', category: 'gonna', colour: 'blu', subType: 'gonna' }),
      garment({ id: 'heels', category: 'scarpe', colour: 'nero', subType: 'tacchi' }),
    ]
    expect(requiredGarmentsReason(wardrobe, 'donna')).toBeNull()

    const outfit = expectOutfit(generateOutfit(wardrobe, 'casual', 'estate', 2, 'donna'))

    expect(outfit.top?.id).toBe('top')
    expect(outfit.gonna?.id).toBe('skirt')
    expect(outfit.pantaloni).toBeUndefined()
    expect(outfit.vestito).toBeUndefined()
    expect(outfit.scarpe.id).toBe('heels')
    expect(listOutfitPieces(outfit).map((piece) => piece.slot)).toEqual(['top', 'gonna', 'scarpe'])
  })

  it('preferisce occasione e stagione, e tratta «tutte» come stagione adatta', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top-ok', category: 'top', occasion: 'lavoro', season: 'autunno', colour: 'blu' }),
          garment({ id: 'top-altro', category: 'top', occasion: 'sport', season: 'estate', colour: 'rosso' }),
          garment({ id: 'pants', category: 'pantaloni', occasion: 'lavoro', season: 'autunno', colour: 'grigio' }),
          garment({ id: 'shoes', category: 'scarpe', occasion: 'lavoro', season: 'tutte', colour: 'nero' }),
          garment({ id: 'jacket-estate', category: 'giacca', occasion: 'lavoro', season: 'estate', colour: 'nero' }),
        ],
        'lavoro',
        'autunno',
        9,
      ),
    )

    expect(outfit.relaxed).toBe('none')
    expect(outfit.top.id).toBe('top-ok')
    expect(outfit.scarpe.id).toBe('shoes')
    expect(outfit.giacca).toBeUndefined()
    expect(outfit.reason).toBe('I capi vanno bene per questa occasione e questa stagione.')
  })

  it('allenta l’occasione prima della stagione', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top-inverno', category: 'top', occasion: 'casual', season: 'inverno', colour: 'nero' }),
          garment({ id: 'top-sport', category: 'top', occasion: 'sport', season: 'estate', colour: 'bianco' }),
          garment({ id: 'pants', category: 'pantaloni', occasion: 'casual', season: 'estate', colour: 'beige' }),
          garment({ id: 'shoes', category: 'scarpe', occasion: 'casual', season: 'estate', colour: 'grigio' }),
        ],
        'casual',
        'estate',
        4,
      ),
    )

    expect(outfit.relaxed).toBe('occasion')
    expect(outfit.top.id).toBe('top-sport')
    expect(outfit.reason).toBe(
      'Non bastavano i capi per questa occasione: ho usato anche altre occasioni, nella stessa stagione.',
    )
  })

  it('allenta la stagione solo se l’occasione non basta', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', occasion: 'casual', season: 'inverno' }),
          garment({ id: 'pants', category: 'pantaloni', occasion: 'casual', season: 'inverno' }),
          garment({ id: 'shoes', category: 'scarpe', occasion: 'casual', season: 'inverno' }),
        ],
        'casual',
        'estate',
        2,
      ),
    )

    expect(outfit.relaxed).toBe('season')
    expect(outfit.reason).toBe('Non bastavano i capi di stagione: ho cercato anche nel resto del guardaroba.')
  })

  it('spiega quali capi mancano', () => {
    expect(requiredGarmentsReason([])).toBe(
      'Per un outfit servono un top, un paio di pantaloni e un paio di scarpe. Aggiungili nel guardaroba.',
    )
    expect(generateOutfit([], 'casual', 'estate', 1)).toEqual({
      ok: false,
      reason: 'Per un outfit servono un top, un paio di pantaloni e un paio di scarpe. Aggiungili nel guardaroba.',
    })
    expect(generateOutfit([garment({ id: 'top', category: 'top' })], 'elegante', 'inverno', 1).ok).toBe(false)
    expect(requiredGarmentsReason([garment({ id: 'top', category: 'top' }), garment({ id: 'pants', category: 'pantaloni' })])).toBe(
      'Per un outfit servono un paio di scarpe. Aggiungilo nel guardaroba.',
    )
  })

  it.each([
    ['rosso', 'verde'],
    ['bordeaux', 'verde'],
    ['arancione', 'viola'],
    ['giallo', 'viola'],
  ] as const)('evita di accostare %s e %s', (strong, clash) => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'bad', category: 'top', colour: strong }),
          garment({ id: 'good', category: 'top', colour: 'nero' }),
          garment({ id: 'pants', category: 'pantaloni', colour: clash }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'bianco' }),
        ],
        'casual',
        'estate',
        3,
      ),
    )

    expect(outfit.top.id).toBe('good')
  })

  it('un neutro non salva due colori che stonano', () => {
    const result = generateOutfit(
      [
        garment({ id: 'top', category: 'top', colour: 'rosso' }),
        garment({ id: 'pants', category: 'pantaloni', colour: 'nero' }),
        garment({ id: 'shoes', category: 'scarpe', colour: 'verde' }),
      ],
      'casual',
      'estate',
      1,
    )

    expect(result).toEqual({
      ok: false,
      reason: 'I colori non stanno bene insieme. Aggiungi un capo neutro, come nero, bianco, grigio o beige.',
    })
  })

  it.each(['nero', 'bianco', 'grigio', 'beige'] as const)('abbina %s a un colore forte', (neutral) => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'rosso' }),
          garment({ id: 'pants', category: 'pantaloni', colour: neutral }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'blu' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.top.colour).toBe('rosso')
    expect(outfit.pantaloni.colour).toBe(neutral)
  })

  it('accosta due colori forti che non stonano', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'blu' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'rosso' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'bianco' }),
        ],
        'casual',
        'estate',
        8,
      ),
    )

    expect(outfit.top.colour).toBe('blu')
    expect(outfit.pantaloni.colour).toBe('rosso')
  })

  it('lascia fuori giacca o accessorio se il colore stona', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'rosso' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'nero' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'bianco' }),
          garment({ id: 'jacket', category: 'giacca', colour: 'verde' }),
          garment({ id: 'bag', category: 'accessori', colour: 'beige' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.giacca).toBeUndefined()
    expect(outfit.accessori?.id).toBe('bag')
  })

  it('è deterministico e può cambiare combinazione con un altro seme', () => {
    const wardrobe = [
      garment({ id: 't1', category: 'top', colour: 'nero' }),
      garment({ id: 't2', category: 'top', colour: 'bianco' }),
      garment({ id: 't3', category: 'top', colour: 'grigio' }),
      garment({ id: 'p1', category: 'pantaloni', colour: 'beige' }),
      garment({ id: 'p2', category: 'pantaloni', colour: 'nero' }),
      garment({ id: 's1', category: 'scarpe', colour: 'bianco' }),
      garment({ id: 's2', category: 'scarpe', colour: 'marrone' }),
      garment({ id: 'j1', category: 'giacca', colour: 'grigio' }),
      garment({ id: 'j2', category: 'giacca', colour: 'beige' }),
    ]
    const order = wardrobe.map((item) => item.id)
    const first = signature(generateOutfit(wardrobe, 'casual', 'estate', 1))
    expect(signature(generateOutfit(wardrobe, 'casual', 'estate', 1))).toBe(first)
    expect(wardrobe.map((item) => item.id)).toEqual(order)

    const seen = new Set([first])
    for (let seed = 2; seed <= 40; seed += 1) seen.add(signature(generateOutfit(wardrobe, 'casual', 'estate', seed)))
    expect(seen.size).toBeGreaterThan(1)
  })

  it('non accosta righe e quadri se c’è una tinta unita', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'stripes', category: 'top', colour: 'blu', pattern: 'righe' }),
          garment({ id: 'plain', category: 'top', colour: 'bianco', pattern: 'tinta unita' }),
          garment({ id: 'checks', category: 'pantaloni', colour: 'nero', pattern: 'quadri' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.top.id).toBe('plain')
    expect(outfit.reason).not.toContain('disegni')
  })

  it('non mette due fantasie insieme', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'floral', category: 'top', colour: 'rosso', pattern: 'fantasia' }),
          garment({ id: 'plain', category: 'top', colour: 'bianco', pattern: 'tinta unita' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'nero', pattern: 'fantasia' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero' }),
        ],
        'casual',
        'estate',
        4,
      ),
    )

    expect(outfit.top.id).toBe('plain')
    expect(outfit.reason).not.toContain('disegni')
  })

  it('la tinta unita sta con le righe, e due righe stanno insieme', () => {
    const withStripes = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'bianco', pattern: 'tinta unita' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'blu', pattern: 'righe' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )
    expect(withStripes.top.id).toBe('top')
    expect(withStripes.reason).not.toContain('disegni')

    const bothStriped = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'bianco', pattern: 'righe' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'blu', pattern: 'righe' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero', pattern: 'tinta unita' }),
        ],
        'casual',
        'estate',
        2,
      ),
    )
    expect(bothStriped.reason).not.toContain('disegni')
  })

  it('accosta disegni diversi solo se non c’è alternativa, e lo dice', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'blu', pattern: 'righe' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'nero', pattern: 'quadri' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'bianco', pattern: 'tinta unita' }),
        ],
        'casual',
        'estate',
        6,
      ),
    )

    expect(outfit.top.id).toBe('top')
    expect(outfit.reason).toContain('Ho accostato disegni diversi perché non c’era un’alternativa migliore.')
  })

  it('un capo senza disegno conta come tinta unita', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', colour: 'bianco' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'blu', pattern: 'quadri' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.top.id).toBe('top')
    expect(outfit.reason).not.toContain('disegni')
  })

  it('non mette scarpe sport con una giacca elegante se c’è un’alternativa', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', occasion: 'elegante', colour: 'nero', season: 'tutte' }),
          garment({ id: 'pants', category: 'pantaloni', occasion: 'elegante', colour: 'grigio', season: 'tutte' }),
          garment({ id: 'sport', category: 'scarpe', occasion: 'sport', colour: 'bianco', season: 'tutte' }),
          garment({ id: 'dress', category: 'scarpe', occasion: 'elegante', colour: 'nero', season: 'tutte' }),
          garment({ id: 'jacket', category: 'giacca', occasion: 'elegante', colour: 'nero', season: 'tutte' }),
        ],
        'elegante',
        'inverno',
        1,
      ),
    )

    expect(outfit.scarpe.id).toBe('dress')
    expect(outfit.giacca?.id).toBe('jacket')
    expect(outfit.reason).not.toContain('sport ed elegante')
  })

  it('se non c’è alternativa, accosta sport ed elegante e lo dice', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'top', category: 'top', occasion: 'elegante', colour: 'nero', season: 'tutte' }),
          garment({ id: 'pants', category: 'pantaloni', occasion: 'elegante', colour: 'grigio', season: 'tutte' }),
          garment({ id: 'sport', category: 'scarpe', occasion: 'sport', colour: 'bianco', season: 'tutte' }),
          garment({ id: 'jacket', category: 'giacca', occasion: 'elegante', colour: 'nero', season: 'tutte' }),
        ],
        'elegante',
        'inverno',
        3,
      ),
    )

    expect(outfit.scarpe.id).toBe('sport')
    expect(outfit.giacca?.id).toBe('jacket')
    expect(outfit.relaxed).toBe('occasion')
    expect(outfit.reason).toContain('Ho messo insieme sport ed elegante perché non c’era un’alternativa migliore.')
  })

  it('in estate preferisce il cotone alla lana, se entrambi vanno bene', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const outfit = expectOutfit(
        generateOutfit(
          [
            garment({ id: 'lana', category: 'top', colour: 'grigio', season: 'estate', material: 'lana' }),
            garment({ id: 'cotone', category: 'top', colour: 'bianco', season: 'estate', material: 'cotone' }),
            garment({ id: 'pants', category: 'pantaloni', colour: 'beige', season: 'estate' }),
            garment({ id: 'shoes', category: 'scarpe', colour: 'nero', season: 'estate' }),
          ],
          'casual',
          'estate',
          seed,
        ),
      )
      expect(outfit.top.id).toBe('cotone')
    }
  })

  it('in mezza stagione il denim viene prima della lana', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const outfit = expectOutfit(
        generateOutfit(
          [
            garment({ id: 'top', category: 'top', colour: 'bianco', season: 'autunno' }),
            garment({ id: 'lana', category: 'pantaloni', colour: 'marrone', season: 'autunno', material: 'lana' }),
            garment({ id: 'denim', category: 'pantaloni', colour: 'blu', season: 'autunno', material: 'denim' }),
            garment({ id: 'shoes', category: 'scarpe', colour: 'nero', season: 'autunno' }),
          ],
          'casual',
          'autunno',
          seed,
        ),
      )
      expect(outfit.pantaloni.id).toBe('denim')
    }
  })

  it('se l’unico top estivo è di lana, lo usa lo stesso', () => {
    const outfit = expectOutfit(
      generateOutfit(
        [
          garment({ id: 'lana', category: 'top', colour: 'grigio', season: 'estate', material: 'lana' }),
          garment({ id: 'pants', category: 'pantaloni', colour: 'beige', season: 'estate', material: 'cotone' }),
          garment({ id: 'shoes', category: 'scarpe', colour: 'nero', season: 'estate' }),
        ],
        'casual',
        'estate',
        1,
      ),
    )

    expect(outfit.top.id).toBe('lana')
    expect(outfit.relaxed).toBe('none')
  })
})

describe('swapPiece', () => {
  const wardrobe = [
    garment({ id: 'top-a', category: 'top', colour: 'nero' }),
    garment({ id: 'top-b', category: 'top', colour: 'bianco' }),
    garment({ id: 'pants', category: 'pantaloni', colour: 'beige' }),
    garment({ id: 'shoes', category: 'scarpe', colour: 'grigio' }),
  ]

  function built(): MensOutfit {
    return expectOutfit(generateOutfit(wardrobe, 'casual', 'estate', 1))
  }

  it('sostituisce solo la categoria chiesta, in modo stabile per lo stesso seme', () => {
    const outfit = built()
    const once = swapPiece(outfit, 'top', wardrobe, 5)
    const twice = swapPiece(outfit, 'top', wardrobe, 5)

    expect(once.swapped).toBe(true)
    expect(once.reason).toBe('Ho cambiato il top.')
    expect(topOf(once.outfit).id).not.toBe(outfit.top.id)
    expect(topOf(once.outfit).id).toBe(topOf(twice.outfit).id)
    expect(pantsOf(once.outfit).id).toBe(outfit.pantaloni.id)
    expect(once.outfit.scarpe.id).toBe(outfit.scarpe.id)
    expect(outfit.top.id).toBe(built().top.id)
  })

  it('con più alternative un seme diverso può scegliere un altro capo', () => {
    const extra = [
      ...wardrobe,
      garment({ id: 'top-c', category: 'top', colour: 'grigio' }),
    ]
    const outfit = expectOutfit(generateOutfit(extra, 'casual', 'estate', 1))
    const chosen = new Set<string>()
    for (let seed = 1; seed <= 30; seed += 1) {
      const swapped = swapPiece(outfit, 'top', extra, seed)
      expect(swapped.swapped).toBe(true)
      expect(topOf(swapped.outfit).id).not.toBe(outfit.top.id)
      chosen.add(topOf(swapped.outfit).id)
    }
    expect(chosen.size).toBeGreaterThan(1)
  })

  it('preferisce un capo che rispetta ancora le regole', () => {
    const outfit = built()
    const withLoose = [
      ...wardrobe,
      garment({ id: 'top-sport', category: 'top', occasion: 'sport', colour: 'beige' }),
    ]
    const swapped = swapPiece(outfit, 'top', withLoose, 7)

    expect(topOf(swapped.outfit).id).not.toBe('top-sport')
    expect(swapped.outfit.relaxed).toBe('none')
  })

  it('allenta il motivo se l’unico ricambio non è dell’occasione', () => {
    const only = [
      garment({ id: 'top', category: 'top', occasion: 'lavoro', colour: 'nero' }),
      garment({ id: 'top-sport', category: 'top', occasion: 'sport', colour: 'bianco' }),
      garment({ id: 'pants', category: 'pantaloni', occasion: 'lavoro', colour: 'beige' }),
      garment({ id: 'shoes', category: 'scarpe', occasion: 'lavoro', colour: 'grigio' }),
    ]
    const outfit = expectOutfit(generateOutfit(only, 'lavoro', 'estate', 1))
    const swapped = swapPiece(outfit, 'top', only, 2)

    expect(swapped.swapped).toBe(true)
    expect(topOf(swapped.outfit).id).toBe('top-sport')
    expect(swapped.outfit.relaxed).toBe('occasion')
  })

  it('non mette un colore che stona e lascia il capo se non c’è ricambio', () => {
    const clashing = [
      garment({ id: 'top', category: 'top', colour: 'nero' }),
      garment({ id: 'top-rosso', category: 'top', colour: 'rosso' }),
      garment({ id: 'pants', category: 'pantaloni', colour: 'verde' }),
      garment({ id: 'shoes', category: 'scarpe', colour: 'bianco' }),
    ]
    const outfit = expectOutfit(generateOutfit(clashing, 'casual', 'estate', 1))
    expect(outfit.top.id).toBe('top')

    const blocked = swapPiece(outfit, 'top', clashing, 4)
    expect(blocked.swapped).toBe(false)
    expect(topOf(blocked.outfit).id).toBe('top')
    expect(blocked.reason).toBe('Non ho un altro capo che stia bene in questo outfit.')

    const single = swapPiece(outfit, 'pantaloni', clashing, 4)
    expect(single.swapped).toBe(false)
    expect(single.outfit).toBe(outfit)
  })

  it('non sostituisce con un disegno che stona', () => {
    const clashing = [
      garment({ id: 'top', category: 'top', colour: 'bianco', pattern: 'tinta unita' }),
      garment({ id: 'top-quadri', category: 'top', colour: 'blu', pattern: 'quadri' }),
      garment({ id: 'pants', category: 'pantaloni', colour: 'nero', pattern: 'righe' }),
      garment({ id: 'shoes', category: 'scarpe', colour: 'nero' }),
    ]
    const outfit = expectOutfit(generateOutfit(clashing, 'casual', 'estate', 1))
    expect(outfit.top.id).toBe('top')
    const swapped = swapPiece(outfit, 'top', clashing, 2)
    expect(swapped.swapped).toBe(false)
    expect(swapped.reason).toBe('Non ho un altro capo che stia bene in questo outfit.')
  })

  it('rifiuta un posto vuoto', () => {
    const outfit = built()
    const result = swapPiece(outfit, 'giacca', wardrobe, 1)
    expect(result.swapped).toBe(false)
    expect(result.reason).toBe('Non c’è un capo da cambiare in questo posto.')
  })
})
