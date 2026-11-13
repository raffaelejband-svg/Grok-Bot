import { describe, expect, it } from 'vitest'
import { COLOURS } from './types.ts'
import { dominantColour, nearestColour } from './dominantColour.ts'

const ANCHORS: Record<(typeof COLOURS)[number], [number, number, number]> = {
  nero: [0x1c, 0x19, 0x17],
  bianco: [0xf7, 0xf4, 0xef],
  grigio: [0x8a, 0x84, 0x7c],
  beige: [0xd9, 0xc7, 0xa6],
  marrone: [0x6b, 0x44, 0x23],
  blu: [0x24, 0x57, 0xa6],
  azzurro: [0x7e, 0xb6, 0xd9],
  verde: [0x2f, 0x6b, 0x45],
  rosso: [0xb4, 0x33, 0x2a],
  bordeaux: [0x6e, 0x24, 0x30],
  rosa: [0xe7, 0xa3, 0xb5],
  giallo: [0xe2, 0xc0, 0x4a],
  arancione: [0xe0, 0x7a, 0x2f],
  viola: [0x6a, 0x3d, 0x86],
  oro: [0xc6, 0xa1, 0x5b],
  argento: [0xc5, 0xc8, 0xce],
}

function image(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = fill(x, y)
      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = a
    }
  }
  return data
}

describe('colore più vicino', () => {
  it('riporta ogni campione dell’elenco su se stesso', () => {
    for (const colour of COLOURS) {
      const [r, g, b] = ANCHORS[colour]
      expect(nearestColour(r, g, b)).toBe(colour)
    }
  })
})

describe('colore dominante', () => {
  it('legge un capo blu al centro e scarta il bordo bianco', () => {
    const [r, g, b] = ANCHORS.blu
    const data = image(40, 40, (x, y) => {
      const inGarment = x >= 15 && x <= 24 && y >= 15 && y <= 24
      return inGarment ? [r, g, b, 255] : [255, 255, 255, 255]
    })
    expect(dominantColour(data, 40, 40)).toBe('blu')
  })

  it('un capo che riempie il riquadro resta del suo colore', () => {
    const [r, g, b] = ANCHORS.verde
    const data = image(24, 24, () => [r, g, b, 255])
    expect(dominantColour(data, 24, 24)).toBe('verde')
  })

  it('uno sfondo bianco uniforme, senza capo, è bianco', () => {
    const data = image(24, 24, () => [250, 250, 250, 255])
    expect(dominantColour(data, 24, 24)).toBe('bianco')
  })

  it('ignora i pixel trasparenti', () => {
    const [r, g, b] = ANCHORS.rosso
    const data = image(20, 20, (x) => (x < 2 ? [0, 0, 0, 0] : [r, g, b, 255]))
    expect(dominantColour(data, 20, 20)).toBe('rosso')
  })

  it('rifiuta un’immagine vuota', () => {
    expect(dominantColour(new Uint8ClampedArray(0), 0, 0)).toBeNull()
    expect(dominantColour(new Uint8ClampedArray(8), 4, 4)).toBeNull()
  })
})
