import { describe, expect, it } from 'vitest'
import { GEMINI_KEY_STORAGE } from '../vision/apiKey.ts'
import { SETTINGS_STORAGE_KEY, applyCloudSettings, settingsForCloud, stripSecretFields } from './secrets.ts'
import type { KeyValueStore } from './store.ts'

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe('segreti', () => {
  it('toglie i nomi vietati e il valore uguale alla chiave', () => {
    expect(stripSecretFields({ geminiApiKey: 'x', nota: 'segreto', promemoria: 'lana' }, ['segreto'])).toEqual({
      promemoria: 'lana',
    })
  })

  it('non manda la chiave Gemini sull’account e non la cancella dal dispositivo', () => {
    const storage = memory({
      [GEMINI_KEY_STORAGE]: 'segreto-gemini',
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        updatedAt: '2026-11-16T00:00:00.000Z',
        values: { promemoria: 'lana', geminiApiKey: 'segreto-gemini', nota: 'segreto-gemini' },
      }),
    })

    const cloud = settingsForCloud(storage)

    expect(cloud).toEqual({ updatedAt: '2026-11-16T00:00:00.000Z', values: { promemoria: 'lana' } })
    expect(JSON.stringify(cloud)).not.toContain('segreto-gemini')
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('segreto-gemini')
    expect(storage.getItem(GEMINI_KEY_STORAGE)).toBe('segreto-gemini')
  })

  it('applica le impostazioni dell’account senza toccare la chiave', () => {
    const storage = memory({ [GEMINI_KEY_STORAGE]: 'segreto-gemini' })
    applyCloudSettings(storage, {
      updatedAt: '2026-12-01T00:00:00.000Z',
      values: { promemoria: 'cotone', geminiApiKey: 'segreto-gemini' },
    })
    expect(storage.getItem(GEMINI_KEY_STORAGE)).toBe('segreto-gemini')
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('segreto-gemini')
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toContain('cotone')
  })
})
