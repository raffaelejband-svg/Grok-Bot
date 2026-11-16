import { describe, expect, it, vi } from 'vitest'
import { GEMINI_ENDPOINT, geminiRequestBody, parseGeminiLabel, recognizeWithGemini } from './gemini.ts'

const KEY = 'chiave-di-prova'

function geminiPayload(label: Record<string, string>) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(label) }] } }] }
}

const full = {
  category: 'top',
  subType: 'camicia',
  colour: 'blu',
  colourSecondary: 'bianco',
  pattern: 'righe',
  material: 'cotone',
  formality: 'lavoro',
  season: 'tutte',
}

describe('risposta di Gemini', () => {
  it('tiene solo i valori dell’elenco', () => {
    expect(parseGeminiLabel(geminiPayload(full))).toMatchObject({
      category: 'top',
      subType: 'camicia',
      colour: 'blu',
      colourSecondary: 'bianco',
      pattern: 'righe',
      material: 'cotone',
      occasion: 'lavoro',
      season: 'tutte',
      source: 'cloud',
    })
  })

  it('nessuno come secondo colore, e un tipo che non sta nella categoria, non passano', () => {
    const parsed = parseGeminiLabel(
      geminiPayload({ ...full, colourSecondary: 'nessuno', subType: 'sneakers' }),
    )
    expect(parsed?.colourSecondary).toBeNull()
    expect(parsed?.subType).toBe('altro')
  })

  it('scarta una risposta senza categoria né colore', () => {
    expect(parseGeminiLabel(geminiPayload({ ...full, category: 'cappello', colour: 'turchese' }))).toBeNull()
    expect(parseGeminiLabel({ candidates: [] })).toBeNull()
  })

  it('ignora il ragionamento e legge il JSON', () => {
    const parsed = parseGeminiLabel({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: 'penso a una chiave segreta' },
              { text: JSON.stringify(full) },
            ],
          },
        },
      ],
    })
    expect(parsed?.category).toBe('top')
  })
})

describe('chiamata a Gemini', () => {
  it('manda la foto a Google e la chiave solo nell’intestazione', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(geminiPayload(full)), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const photo = new Blob(['foto'], { type: 'image/jpeg' })

    const guess = await recognizeWithGemini(photo, KEY)

    expect(guess.category).toBe('top')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(GEMINI_ENDPOINT)
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe(KEY)
    expect(url.includes(KEY)).toBe(false)
    expect(String(init.body).includes(KEY)).toBe(false)
    const body = JSON.parse(String(init.body)) as { generationConfig: { thinkingConfig: { thinkingLevel: string } } }
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('MINIMAL')
    vi.unstubAllGlobals()
  })

  it('se Google non risponde, la chiamata fallisce senza citare la chiave', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 401 })))
    try {
      await expect(recognizeWithGemini(new Blob(['foto']), KEY)).rejects.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('corpo della richiesta', () => {
  it('non contiene la chiave', () => {
    const body = JSON.stringify(geminiRequestBody('image/jpeg', 'Zm90bw=='))
    expect(body.includes(KEY)).toBe(false)
    expect(body.includes('gemini-3.5-flash-lite')).toBe(false)
  })
})
