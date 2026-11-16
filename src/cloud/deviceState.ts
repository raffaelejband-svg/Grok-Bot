/** Memoria sul dispositivo: scelta di caricamento, capi già sull’account, cancellazioni rimaste in sospeso. */
import type { KeyValueStore } from './store.ts'

export type Decision = 'accepted' | 'declined'

export type IdBucket =
  | 'private-garments'
  | 'private-outfits'
  | 'shared-garments'
  | 'shared-outfits'
  | 'skipped-photos'
  | 'pending-garment-deletes'
  | 'pending-outfit-deletes'

const LAST_UID_KEY = 'armadio-outfit.last-uid'

function scoped(bucket: string, uid: string): string {
  return `armadio-outfit.${bucket}.${uid}`
}

function readList(storage: KeyValueStore, key: string): string[] {
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  } catch {
    return []
  }
}

export function readLastUid(storage: KeyValueStore): string | null {
  const value = storage.getItem(LAST_UID_KEY)?.trim() ?? ''
  return value || null
}

export function writeLastUid(storage: KeyValueStore, uid: string): void {
  storage.setItem(LAST_UID_KEY, uid)
}

export function readDecision(storage: KeyValueStore, uid: string): Decision | null {
  const value = storage.getItem(scoped('sync-decision', uid))
  return value === 'accepted' || value === 'declined' ? value : null
}

export function writeDecision(storage: KeyValueStore, uid: string, decision: Decision): void {
  storage.setItem(scoped('sync-decision', uid), decision)
}

export function readIds(storage: KeyValueStore, uid: string, bucket: IdBucket): string[] {
  return readList(storage, scoped(bucket, uid))
}

export function writeIds(storage: KeyValueStore, uid: string, bucket: IdBucket, ids: readonly string[]): void {
  storage.setItem(scoped(bucket, uid), JSON.stringify([...new Set(ids)]))
}
