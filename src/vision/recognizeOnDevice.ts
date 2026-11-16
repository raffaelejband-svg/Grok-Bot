/**
 * Legge quello che i pixel e MobileNet possono dire davvero.
 * Colore e, se è netto, un secondo colore: dai pixel.
 * Disegno: solo righe o quadri evidenti, altrimenti tinta unita. Mai la fantasia.
 * Categoria, sotto-tipo e materiale: solo se l’etichetta ImageNet corrisponde in modo pulito.
 * La stagione non si vede. Lo stile nemmeno, tranne un completo, che è elegante.
 * La foto non esce dal telefono. Il modello (circa 5 MB) si scarica la prima volta.
 */
import type { Tensor3D } from '@tensorflow/tfjs-core'
import { detailsFromLabels } from '../domain/categoryGuess.ts'
import { readGarmentColours } from '../domain/dominantColour.ts'
import { guessPattern } from '../domain/patternGuess.ts'
import type { GarmentGuess } from './guess.ts'

const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.50_224/model.json'

let loading: Promise<Awaited<ReturnType<typeof import('@tensorflow/tfjs-layers').loadLayersModel>>> | null = null

function loadModel() {
  if (!loading) {
    loading = loadModelOnce().catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}

async function loadModelOnce() {
  const tf = await import('@tensorflow/tfjs-core')
  await import('@tensorflow/tfjs-backend-cpu')
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas')
  const webgl = canvas?.getContext('webgl')
  if (webgl) {
    webgl.getExtension('WEBGL_lose_context')?.loseContext()
    await import('@tensorflow/tfjs-backend-webgl')
    await tf.setBackend('webgl')
  } else {
    await tf.setBackend('cpu')
  }
  await tf.ready()
  const { loadLayersModel } = await import('@tensorflow/tfjs-layers')
  return loadLayersModel(MODEL_URL)
}

async function drawBlob(blob: Blob): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null
  try {
    const bitmap = await createImageBitmap(blob)
    const maxSide = 224
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > 0 ? Math.min(1, maxSide / longest) : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return canvas
  } catch {
    return null
  }
}

function pixelsFromCanvas(canvas: HTMLCanvasElement): { colour: GarmentGuess['colour']; colourSecondary: GarmentGuess['colourSecondary']; pattern: GarmentGuess['pattern'] } {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { colour: null, colourSecondary: null, pattern: null }
  try {
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const colours = readGarmentColours(image.data, image.width, image.height)
    return {
      colour: colours.colour,
      colourSecondary: colours.secondary,
      pattern: guessPattern(image.data, image.width, image.height),
    }
  } catch {
    return { colour: null, colourSecondary: null, pattern: null }
  }
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values)
  const exps = values.map((value) => Math.exp(value - max))
  const total = exps.reduce((sum, value) => sum + value, 0)
  return exps.map((value) => value / total)
}

async function detailsFromCanvas(canvas: HTMLCanvasElement) {
  const tf = await import('@tensorflow/tfjs-core')
  const { IMAGENET_CLASSES } = await import('@tensorflow-models/mobilenet/dist/imagenet_classes.js')
  const model = await loadModel()
  const pixels = tf.div(tf.cast(tf.browser.fromPixels(canvas), 'float32'), 255) as Tensor3D
  const resized = tf.image.resizeBilinear(pixels, [224, 224], true)
  const batched = tf.expandDims(resized, 0)
  try {
    const predicted = model.predict(batched)
    const output = Array.isArray(predicted) ? predicted[0] : predicted
    const raw = Array.from(await output.data())
    output.dispose()
    const min = Math.min(...raw)
    const sum = raw.reduce((total, value) => total + value, 0)
    const probabilities = min < 0 || sum < 0.98 || sum > 1.02 ? softmax(raw) : raw
    const labels = probabilities
      .map((probability, index) => ({ className: IMAGENET_CLASSES[index] ?? '', probability }))
      .sort((left, right) => right.probability - left.probability)
      .slice(0, 10)
    return detailsFromLabels(labels)
  } finally {
    pixels.dispose()
    resized.dispose()
    batched.dispose()
  }
}

function emptyGuess(partial: Partial<GarmentGuess>): GarmentGuess {
  return {
    category: null,
    subType: null,
    colour: null,
    colourSecondary: null,
    pattern: null,
    material: null,
    occasion: null,
    season: null,
    source: 'device',
    ...partial,
  }
}

export async function recognizeOnDevice(blob: Blob): Promise<GarmentGuess> {
  const canvas = await drawBlob(blob)
  if (!canvas) return emptyGuess({})
  const pixels = pixelsFromCanvas(canvas)
  try {
    const details = await detailsFromCanvas(canvas)
    return emptyGuess({
      ...pixels,
      category: details?.category ?? null,
      subType: details?.subType ?? 'altro',
      material: details?.material ?? 'sconosciuto',
      occasion: details?.occasion ?? null,
    })
  } catch {
    return emptyGuess(pixels)
  }
}
