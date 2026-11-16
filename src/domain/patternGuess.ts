/**
 * Disegno letto dai pixel, senza rete.
 * Solo un segnale evidente di righe o di quadri esce da «tinta unita».
 * La fantasia non si indovina da qui: servirebbe un modello che vede il motivo.
 */
import { coloursAreDistinct, nearestColour } from './dominantColour.ts'
import type { Colour, Pattern } from './types.ts'

const COLUMNS = 16
const ROWS = 20
/** Tanti cambi su un asse, e pochi sull’altro: righe. */
const BUSY = 0.38
const CALM = 0.14
/** Cambi forti in entrambe le direzioni: quadri. */
const CHECK = 0.35
const MIN_CHANGES = 4

function cellColour(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  column: number,
  row: number,
): Colour | null {
  const x = x0 + Math.min(x1 - x0 - 1, Math.floor(((column + 0.5) * (x1 - x0)) / COLUMNS))
  const y = y0 + Math.min(y1 - y0 - 1, Math.floor(((row + 0.5) * (y1 - y0)) / ROWS))
  const index = (y * width + x) * 4
  if ((data[index + 3] ?? 0) < 128) return null
  return nearestColour(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0)
}

function rate(changes: number, pairs: number): number {
  if (pairs === 0) return 0
  return changes / pairs
}

export function guessPattern(data: Uint8ClampedArray, width: number, height: number): Pattern {
  if (width < 8 || height < 8 || data.length < width * height * 4) return 'tinta unita'
  const x0 = Math.floor(width * 0.25)
  const y0 = Math.floor(height * 0.25)
  const x1 = Math.max(x0 + 1, Math.ceil(width * 0.75))
  const y1 = Math.max(y0 + 1, Math.ceil(height * 0.75))
  const grid: Array<Array<Colour | null>> = []
  for (let row = 0; row < ROWS; row += 1) {
    const line: Array<Colour | null> = []
    for (let column = 0; column < COLUMNS; column += 1) {
      line.push(cellColour(data, width, x0, y0, x1, y1, column, row))
    }
    grid.push(line)
  }

  let horizontalChanges = 0
  let horizontalPairs = 0
  let verticalChanges = 0
  let verticalPairs = 0
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const current = grid[row]?.[column]
      const right = grid[row]?.[column + 1]
      if (column + 1 < COLUMNS && current && right) {
        horizontalPairs += 1
        if (coloursAreDistinct(current, right)) horizontalChanges += 1
      }
      const below = grid[row + 1]?.[column]
      if (row + 1 < ROWS && current && below) {
        verticalPairs += 1
        if (coloursAreDistinct(current, below)) verticalChanges += 1
      }
    }
  }

  const horizontal = rate(horizontalChanges, horizontalPairs)
  const vertical = rate(verticalChanges, verticalPairs)
  if (horizontalChanges >= MIN_CHANGES && verticalChanges >= MIN_CHANGES && horizontal >= CHECK && vertical >= CHECK) {
    return 'quadri'
  }
  const horizontalStripes = horizontalChanges >= MIN_CHANGES && horizontal >= BUSY && vertical <= CALM
  const verticalStripes = verticalChanges >= MIN_CHANGES && vertical >= BUSY && horizontal <= CALM
  if (horizontalStripes || verticalStripes) return 'righe'
  return 'tinta unita'
}
