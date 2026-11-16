import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GEMINI_KEY_STORAGE, saveGeminiKey } from './apiKey.ts'
import { recognizeOnDevice } from './recognizeOnDevice.ts'
import { CLOUD_FALLBACK_NOTE } from './guess.ts'
import { recognizeGarment } from './recognizeGarment.ts'

vi.mock('./recognizeOnDevice.ts', () => ({
  recognizeOnDevice: vi.fn(async () => ({
    category: 'top' as const,
    subType: 'altro' as const,
    colour: 'blu' as const,
    colourSecondary: null,
    pattern: 'tinta unita' as const,
    material: 'sconosciuto' as const,
    occasion: null,
    season: null,
    source: 'device' as const,
  })),
}))

const KEY = 'chiave-di-prova'

function cloudBody() {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                category: 'scarpe',
                subType: 'sneakers',
                colour: 'bianco',
                colourSecondary: 'nessuno',
                pattern: 'tinta unita',
                material: 'sintetico',
                formality: 'sport',
                season: 'tutte',
              }),
            },
          ],
        },
      },
    ],
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(recognizeOnDevice).mockClear()
  vi.unstubAllGlobals()
})

describe('riconoscimento', () => {
  it('senza chiave non chiama la rete e usa il telefono', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const guess = await recognizeGarment(new Blob(['foto']))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(recognizeOnDevice).toHaveBeenCalledOnce()
    expect(guess.source).toBe('device')
    expect(guess.category).toBe('top')
    expect(guess.note).toBeUndefined()
  })

  it('con la chiave legge la risposta di Gemini e non manda la chiave nel corpo', async () => {
    saveGeminiKey(KEY)
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(cloudBody()), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const logs: unknown[] = []
    const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args)
    })
    const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logs.push(args)
    })

    const guess = await recognizeGarment(new Blob(['foto'], { type: 'image/jpeg' }))

    expect(recognizeOnDevice).not.toHaveBeenCalled()
    expect(guess).toMatchObject({ category: 'scarpe', subType: 'sneakers', source: 'cloud', occasion: 'sport' })
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined)?.[1]
    if (!init) throw new Error('manca la chiamata')
    expect(String(init.body).includes(KEY)).toBe(false)
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe(KEY)
    expect(JSON.stringify(logs).includes(KEY)).toBe(false)
    expect(localStorage.getItem(GEMINI_KEY_STORAGE)).toBe(KEY)
    log.mockRestore()
    error.mockRestore()
  })

  it('se Gemini non risponde, torna sul telefono e lo dice', async () => {
    saveGeminiKey(KEY)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('rete'))))

    const guess = await recognizeGarment(new Blob(['foto']))

    expect(recognizeOnDevice).toHaveBeenCalledOnce()
    expect(guess.source).toBe('device')
    expect(guess.note).toBe(CLOUD_FALLBACK_NOTE)
    expect(guess.note?.includes(KEY)).toBe(false)
  })
})
