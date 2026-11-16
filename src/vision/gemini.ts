/**
 * Riconoscimento con Gemini, solo se in Impostazioni c’è una chiave.
 * La chiave viaggia nell’intestazione verso Google e da nessun’altra parte.
 * Non viene messa nell’indirizzo, nel corpo, né nei messaggi di errore.
 */
import {
  CATEGORIES,
  COLOURS,
  MATERIALS,
  OCCASIONS,
  PATTERNS,
  SEASONS,
  SUBTYPES,
  subtypeFits,
  type Category,
  type Colour,
  type Material,
  type Occasion,
  type Pattern,
  type Season,
  type SubType,
} from '../domain/types.ts'
import type { GarmentGuess } from './guess.ts'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const NO_SECONDARY = 'nessuno'

export function geminiPrompt(): string {
  return [
    'Look at the photo. It should show one clothing item.',
    'Reply with JSON only. Use exactly the allowed values. Do not add words.',
    `category: ${CATEGORIES.join(', ')}`,
    `subType: ${SUBTYPES.join(', ')}. Use altro if you are not sure. The subType must fit the category.`,
    `colour: ${COLOURS.join(', ')}`,
    `colourSecondary: ${COLOURS.join(', ')}, or ${NO_SECONDARY} if there is no clear second colour.`,
    `pattern: ${PATTERNS.join(', ')}`,
    `material: ${MATERIALS.join(', ')}. Use sconosciuto if you cannot tell the material. Use altro only for a material you can see that is not in the list.`,
    `formality: ${OCCASIONS.join(', ')}. This is how formal the item is.`,
    `season: ${SEASONS.join(', ')}. Use tutte if it works in every season or you cannot tell.`,
  ].join('\n')
}

function enumSchema(values: readonly string[]) {
  return { type: 'string', enum: [...values] }
}

export function geminiRequestBody(mimeType: string, data: string): Record<string, unknown> {
  return {
    contents: [
      {
        parts: [
          { text: geminiPrompt() },
          { inlineData: { mimeType: mimeType || 'image/jpeg', data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
      responseSchema: {
        type: 'object',
        properties: {
          category: enumSchema(CATEGORIES),
          subType: enumSchema(SUBTYPES),
          colour: enumSchema(COLOURS),
          colourSecondary: enumSchema([NO_SECONDARY, ...COLOURS]),
          pattern: enumSchema(PATTERNS),
          material: enumSchema(MATERIALS),
          formality: enumSchema(OCCASIONS),
          season: enumSchema(SEASONS),
        },
        required: ['category', 'subType', 'colour', 'colourSecondary', 'pattern', 'material', 'formality', 'season'],
      },
    },
  }
}

function asOne<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function jsonText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const candidates = (value as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return null
  const parts = (candidates[0] as { content?: { parts?: unknown } } | undefined)?.content?.parts
  if (!Array.isArray(parts)) return null
  const texts = parts
    .filter((part): part is { text: string; thought?: boolean } => {
      if (!part || typeof part !== 'object') return false
      const record = part as { text?: unknown; thought?: unknown }
      return typeof record.text === 'string' && record.thought !== true
    })
    .map((part) => part.text)
  const joined = texts.join('').trim()
  return joined === '' ? null : joined
}

export function parseGeminiLabel(payload: unknown): GarmentGuess | null {
  const text = typeof payload === 'string' ? payload : jsonText(payload)
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let data: unknown
  try {
    data = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const category = asOne<Category>(record.category, CATEGORIES)
  const colour = asOne<Colour>(record.colour, COLOURS)
  if (!category && !colour) return null
  const rawSubType = asOne<SubType>(record.subType, SUBTYPES)
  const subType = rawSubType && category && !subtypeFits(category, rawSubType) ? 'altro' : (rawSubType ?? (category ? 'altro' : null))
  const secondary = asOne<Colour>(record.colourSecondary, COLOURS)
  return {
    category,
    subType,
    colour,
    colourSecondary: secondary && secondary !== colour ? secondary : null,
    pattern: asOne<Pattern>(record.pattern, PATTERNS) ?? 'tinta unita',
    material: asOne<Material>(record.material, MATERIALS) ?? 'sconosciuto',
    occasion: asOne<Occasion>(record.formality, OCCASIONS),
    season: asOne<Season>(record.season, SEASONS),
    source: 'cloud',
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunk = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

async function payloadBlob(blob: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return blob
  try {
    const bitmap = await createImageBitmap(blob)
    const maxSide = 768
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > maxSide ? maxSide / longest : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return blob
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const scaled = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })
    return scaled ?? blob
  } catch {
    return blob
  }
}

export async function recognizeWithGemini(blob: Blob, apiKey: string): Promise<GarmentGuess> {
  const image = await payloadBlob(blob)
  const body = geminiRequestBody(image.type || blob.type || 'image/jpeg', await toBase64(image))
  let response: Response
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Rete non disponibile.')
  }
  if (!response.ok) throw new Error('Servizio non disponibile.')
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Risposta illeggibile.')
  }
  const guess = parseGeminiLabel(payload)
  if (!guess) throw new Error('Risposta senza dati utili.')
  return guess
}
