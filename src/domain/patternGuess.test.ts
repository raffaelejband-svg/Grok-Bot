import { describe, expect, it } from 'vitest'
import { guessPattern } from './patternGuess.ts'

const BLU: [number, number, number] = [0x24, 0x57, 0xa6]
const BIANCO: [number, number, number] = [0xf7, 0xf4, 0xef]
const AZZURRO: [number, number, number] = [0x7e, 0xb6, 0xd9]
const BEIGE: [number, number, number] = [0xd9, 0xc7, 0xa6]

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

function paint(width: number, height: number, colourAt: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  return image(width, height, (x, y) => {
    const inCentre = x >= width * 0.2 && x < width * 0.8 && y >= height * 0.2 && y < height * 0.8
    const [r, g, b] = inCentre ? colourAt(x, y) : BEIGE
    return [r, g, b, 255]
  })
}

describe('disegno dai pixel', () => {
  it('un colore solo resta tinta unita', () => {
    const data = paint(80, 80, () => BLU)
    expect(guessPattern(data, 80, 80)).toBe('tinta unita')
  })

  it('righe evidenti, in verticale o in orizzontale', () => {
    const vertical = paint(80, 80, (x) => (Math.floor(x / 4) % 2 === 0 ? BLU : BIANCO))
    const horizontal = paint(80, 80, (_x, y) => (Math.floor(y / 4) % 2 === 0 ? BLU : BIANCO))
    expect(guessPattern(vertical, 80, 80)).toBe('righe')
    expect(guessPattern(horizontal, 80, 80)).toBe('righe')
  })

  it('un quadretto evidente è quadri', () => {
    const checks = paint(80, 80, (x, y) => (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? BLU : BIANCO)
    expect(guessPattern(checks, 80, 80)).toBe('quadri')
  })

  it('una variazione di luce o una riga sola non bastano', () => {
    const shade = paint(80, 80, (x) => (x % 3 === 0 ? AZZURRO : BLU))
    const oneLine = paint(80, 80, (x) => (x === 40 ? BIANCO : BLU))
    expect(guessPattern(shade, 80, 80)).toBe('tinta unita')
    expect(guessPattern(oneLine, 80, 80)).toBe('tinta unita')
  })

  it('un’immagine troppo piccola non inventa un disegno', () => {
    expect(guessPattern(new Uint8ClampedArray(0), 0, 0)).toBe('tinta unita')
  })
})
