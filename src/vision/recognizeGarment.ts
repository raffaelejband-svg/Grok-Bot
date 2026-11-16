/**
 * Se in Impostazioni c’è una chiave Gemini, prova il servizio online.
 * Se la chiave manca, o la chiamata fallisce, resta il riconoscimento sul telefono.
 * La chiave non viene scritta nei log.
 */
import type { Gender } from '../domain/types.ts'
import { readGeminiKey } from './apiKey.ts'
import { recognizeWithGemini } from './gemini.ts'
import { CLOUD_FALLBACK_NOTE, type GarmentGuess } from './guess.ts'
import { recognizeOnDevice } from './recognizeOnDevice.ts'

export type { GarmentGuess } from './guess.ts'
export { CLOUD_FALLBACK_NOTE } from './guess.ts'

export async function recognizeGarment(blob: Blob, gender: Gender = 'uomo'): Promise<GarmentGuess> {
  const key = readGeminiKey()
  if (!key) return recognizeOnDevice(blob)
  try {
    return await recognizeWithGemini(blob, key, gender)
  } catch {
    const local = await recognizeOnDevice(blob)
    return { ...local, note: CLOUD_FALLBACK_NOTE }
  }
}
