/**
 * Colore dominante di una foto, senza rete e senza modello.
 * Si guarda il centro, si scarta lo sfondo se è un bordo uniforme,
 * e si sceglie il colore più vicino nell’elenco fisso dell’app.
 */
import type { Colour } from './types.ts'

type Rgb = { r: number; g: number; b: number }

/** Gli stessi campioni usati in interfaccia, in src/components/colourSwatch.ts. */
const ANCHOR_HEX: Record<Colour, string> = {
  nero: '#1c1917',
  bianco: '#f7f4ef',
  grigio: '#8a847c',
  beige: '#d9c7a6',
  marrone: '#6b4423',
  blu: '#2457a6',
  azzurro: '#7eb6d9',
  verde: '#2f6b45',
  rosso: '#b4332a',
  bordeaux: '#6e2430',
  rosa: '#e7a3b5',
  giallo: '#e2c04a',
  arancione: '#e07a2f',
  viola: '#6a3d86',
  oro: '#c6a15b',
  argento: '#c5c8ce',
}

const ANCHORS: Array<{ colour: Colour; rgb: Rgb }> = (Object.keys(ANCHOR_HEX) as Colour[]).map((colour) => ({
  colour,
  rgb: hexToRgb(ANCHOR_HEX[colour]),
}))

/** Distanza sotto la quale un pixel del centro è trattato come lo sfondo del bordo. */
const BACKGROUND_DISTANCE = 48

/** Se dopo lo scarto resta meno di questa frazione, si conta tutto il centro. */
const MIN_KEPT_RATIO = 0.12

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function colourDistance(a: Rgb, b: Rgb): number {
  const rMean = (a.r + b.r) / 2
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  const rWeight = 2 + rMean / 256
  const bWeight = 2 + (255 - rMean) / 256
  return Math.sqrt(rWeight * dr * dr + 4 * dg * dg + bWeight * db * db)
}

export function nearestColour(r: number, g: number, b: number): Colour {
  const pixel = { r, g, b }
  let best = ANCHORS[0]
  let bestDistance = colourDistance(pixel, best.rgb)
  for (const anchor of ANCHORS) {
    const distance = colourDistance(pixel, anchor.rgb)
    if (distance < bestDistance) {
      best = anchor
      bestDistance = distance
    }
  }
  return best.colour
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

function sampleStep(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.sqrt((width * height) / 5000)))
}

function borderColour(data: Uint8ClampedArray, width: number, height: number, step: number): Rgb | null {
  const margin = Math.max(1, Math.round(Math.min(width, height) * 0.08))
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const onBorder = x < margin || x >= width - margin || y < margin || y >= height - margin
      if (!onBorder) continue
      const index = (y * width + x) * 4
      if (data[index + 3] < 128) continue
      reds.push(data[index])
      greens.push(data[index + 1])
      blues.push(data[index + 2])
    }
  }
  if (reds.length === 0) return null
  return { r: median(reds), g: median(greens), b: median(blues) }
}

function countColours(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  step: number,
  background: Rgb | null,
  rejectBackground: boolean,
): { counts: Map<Colour, number>; kept: number; seen: number } {
  const x0 = Math.floor(width * 0.25)
  const y0 = Math.floor(height * 0.25)
  const x1 = Math.max(x0 + 1, Math.ceil(width * 0.75))
  const y1 = Math.max(y0 + 1, Math.ceil(height * 0.75))
  const counts = new Map<Colour, number>()
  let kept = 0
  let seen = 0
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const index = (y * width + x) * 4
      if (data[index + 3] < 128) continue
      seen += 1
      const pixel = { r: data[index], g: data[index + 1], b: data[index + 2] }
      if (rejectBackground && background && colourDistance(pixel, background) < BACKGROUND_DISTANCE) continue
      const colour = nearestColour(pixel.r, pixel.g, pixel.b)
      counts.set(colour, (counts.get(colour) ?? 0) + 1)
      kept += 1
    }
  }
  return { counts, kept, seen }
}

function winner(counts: Map<Colour, number>): Colour | null {
  let best: Colour | null = null
  let bestCount = 0
  for (const [colour, count] of counts) {
    if (count > bestCount) {
      best = colour
      bestCount = count
    }
  }
  return best
}

export function dominantColour(data: Uint8ClampedArray, width: number, height: number): Colour | null {
  if (width < 1 || height < 1 || data.length < width * height * 4) return null
  const step = sampleStep(width, height)
  const background = borderColour(data, width, height, step)
  const rejected = countColours(data, width, height, step, background, true)
  const usable = rejected.seen > 0 && rejected.kept / rejected.seen >= MIN_KEPT_RATIO
  if (usable) return winner(rejected.counts)
  return winner(countColours(data, width, height, step, null, false).counts)
}
