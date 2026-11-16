/**
 * Ciò che può andare sull’account.
 * La chiave Gemini resta in GEMINI_KEY_STORAGE e non entra mai in questo oggetto.
 */
import { GEMINI_KEY_STORAGE } from '../vision/apiKey.ts'
import type { KeyValueStore } from './store.ts'

export const SETTINGS_STORAGE_KEY = 'armadio-outfit.settings'

const SECRET_NAME = /gemini|api[_-]?key|password|secret|token/i

export type CloudSettings = {
  updatedAt: string
  values: Record<string, string>
}

export function stripSecretFields(value: unknown, secretValues: readonly string[] = []): unknown {
  if (typeof value === 'string') {
    if (secretValues.some((secret) => secret.length > 0 && value === secret)) return undefined
    return value
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripSecretFields(item, secretValues))
      .filter((item) => item !== undefined)
  }
  if (!value || typeof value !== 'object') return value
  const cleaned: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value)) {
    if (SECRET_NAME.test(key)) continue
    const next = stripSecretFields(inner, secretValues)
    if (next !== undefined) cleaned[key] = next
  }
  return cleaned
}

function asDate(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

function stringValues(value: unknown, secretValues: readonly string[]): Record<string, string> {
  const stripped = stripSecretFields(value, secretValues)
  if (!stripped || typeof stripped !== 'object' || Array.isArray(stripped)) return {}
  const values: Record<string, string> = {}
  for (const [key, inner] of Object.entries(stripped)) {
    if (typeof inner === 'string' && inner !== '') values[key] = inner
  }
  return values
}

function secretValuesIn(storage: KeyValueStore): string[] {
  const key = storage.getItem(GEMINI_KEY_STORAGE)?.trim() ?? ''
  return key ? [key] : []
}

export function readStoredSettings(storage: KeyValueStore): CloudSettings | null {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const record = parsed as { updatedAt?: unknown; values?: unknown }
    const updatedAt = asDate(record.updatedAt)
    if (!updatedAt) return null
    return { updatedAt, values: stringValues(record.values, secretValuesIn(storage)) }
  } catch {
    return null
  }
}

function keepGeminiKey(storage: KeyValueStore, write: () => void): void {
  const gemini = storage.getItem(GEMINI_KEY_STORAGE)
  write()
  if (gemini === null) storage.removeItem(GEMINI_KEY_STORAGE)
  else storage.setItem(GEMINI_KEY_STORAGE, gemini)
}

/** Impostazioni da copiare sull’account. Non legge la chiave Gemini, e la toglie se è finita in mezzo. */
export function settingsForCloud(storage: KeyValueStore): CloudSettings | null {
  const raw = storage.getItem(SETTINGS_STORAGE_KEY)
  const stored = readStoredSettings(storage)
  if (!stored || Object.keys(stored.values).length === 0) {
    if (raw) keepGeminiKey(storage, () => storage.removeItem(SETTINGS_STORAGE_KEY))
    return null
  }
  const clean = JSON.stringify(stored)
  if (raw !== clean) keepGeminiKey(storage, () => storage.setItem(SETTINGS_STORAGE_KEY, clean))
  return stored
}

/** Scrive le impostazioni arrivate dall’account. Non tocca la chiave Gemini. */
export function applyCloudSettings(storage: KeyValueStore, cloud: CloudSettings): void {
  const updatedAt = asDate(cloud.updatedAt)
  if (!updatedAt) return
  const current = readStoredSettings(storage)
  if (current && current.updatedAt >= updatedAt) return
  const values = stringValues(cloud.values, secretValuesIn(storage))
  if (Object.keys(values).length === 0) return
  keepGeminiKey(storage, () => storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ updatedAt, values })))
}
