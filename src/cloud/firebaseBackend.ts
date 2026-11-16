/**
 * Copia su Firestore e Cloud Storage.
 * Le foto grandi vengono ridotte solo su questa copia.
 */
import { DEFAULT_PROFILE_ID, type Garment, type Outfit, type Profile } from '../domain/types.ts'
import type { CloudBackend } from './backend.ts'
import { getFirebaseApp } from './firebaseApp.ts'
import { PhotoTooLargeError, MAX_CLOUD_PHOTO_BYTES } from './photoLimit.ts'
import { parseCloudGarment, parseCloudOutfit, parseCloudProfile, toCloudRecord, type CloudGarmentRecord } from './records.ts'
import { stripSecretFields, type CloudSettings } from './secrets.ts'
import { shrinkPhoto } from './shrinkPhoto.ts'

function photoType(blob: Blob): string {
  return blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
}

async function database() {
  const { getFirestore } = await import('firebase/firestore')
  return getFirestore(await getFirebaseApp())
}

async function bucket() {
  const { getStorage } = await import('firebase/storage')
  return getStorage(await getFirebaseApp())
}

function cleanSettings(value: unknown): CloudSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as { updatedAt?: unknown; values?: unknown }
  if (typeof record.updatedAt !== 'string' || Number.isNaN(Date.parse(record.updatedAt))) return null
  const stripped = stripSecretFields(record.values)
  if (!stripped || typeof stripped !== 'object' || Array.isArray(stripped)) return null
  const values: Record<string, string> = {}
  for (const [key, inner] of Object.entries(stripped)) {
    if (typeof inner === 'string' && inner !== '') values[key] = inner
  }
  if (Object.keys(values).length === 0) return null
  return { updatedAt: record.updatedAt, values }
}

function profileOf(id: string | undefined): string {
  return id && id.trim() !== '' ? id : DEFAULT_PROFILE_ID
}

async function readCollection(path: [string, ...string[]]): Promise<Record<string, unknown>[]> {
  const { collection, getDocs } = await import('firebase/firestore')
  const [first, ...rest] = path
  const snap = await getDocs(collection(await database(), first, ...rest))
  return snap.docs.map((item) => item.data() as Record<string, unknown>)
}

async function photoContentType(uid: string, profileId: string, id: string): Promise<string> {
  const { doc, getDoc } = await import('firebase/firestore')
  const db = await database()
  const nested = await getDoc(doc(db, 'users', uid, 'profiles', profileId, 'garments', id))
  const parsed = nested.exists() ? parseCloudGarment(nested.data()) : null
  if (parsed) return parsed.photoContentType
  const legacy = await getDoc(doc(db, 'users', uid, 'garments', id))
  const older = legacy.exists() ? parseCloudGarment(legacy.data()) : null
  return older?.photoContentType ?? 'image/jpeg'
}

async function knownProfileIds(uid: string): Promise<string[]> {
  const ids = new Set<string>([DEFAULT_PROFILE_ID])
  try {
    const rows = await readCollection(['users', uid, 'profiles'])
    for (const row of rows) {
      const parsed = parseCloudProfile(row)
      if (parsed) ids.add(parsed.id)
    }
  } catch {
    // Senza progetto i profili non si leggono.
  }
  return [...ids]
}

export async function createFirebaseBackend(): Promise<CloudBackend> {
  await getFirebaseApp()
  return {
    async listProfiles(uid) {
      const rows = await readCollection(['users', uid, 'profiles'])
      const profiles: Profile[] = []
      for (const row of rows) {
        const parsed = parseCloudProfile(row)
        if (parsed) profiles.push(parsed)
      }
      return profiles
    },
    async saveProfile(uid, profile: Profile) {
      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(await database(), 'users', uid, 'profiles', profile.id), {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt ?? profile.createdAt,
      })
    },
    async deleteProfile(uid, profileId) {
      const { collection, deleteDoc, doc, getDocs } = await import('firebase/firestore')
      const { deleteObject, ref } = await import('firebase/storage')
      const db = await database()
      const garments = await getDocs(collection(db, 'users', uid, 'profiles', profileId, 'garments'))
      for (const item of garments.docs) {
        await deleteDoc(item.ref)
        try {
          await deleteObject(ref(await bucket(), `users/${uid}/profiles/${profileId}/photos/${item.id}`))
        } catch {
          // La foto può essere già assente.
        }
      }
      const outfits = await getDocs(collection(db, 'users', uid, 'profiles', profileId, 'outfits'))
      for (const item of outfits.docs) await deleteDoc(item.ref)
      await deleteDoc(doc(db, 'users', uid, 'profiles', profileId))
    },
    async listGarments(uid) {
      const records: CloudGarmentRecord[] = []
      const seen = new Set<string>()
      for (const profileId of await knownProfileIds(uid)) {
        let rows: Record<string, unknown>[] = []
        try {
          rows = await readCollection(['users', uid, 'profiles', profileId, 'garments'])
        } catch {
          rows = []
        }
        for (const row of rows) {
          const parsed = parseCloudGarment({ ...row, profileId })
          if (!parsed || seen.has(parsed.id)) continue
          seen.add(parsed.id)
          records.push(parsed)
        }
      }
      try {
        const legacy = await readCollection(['users', uid, 'garments'])
        for (const row of legacy) {
          const parsed = parseCloudGarment(row)
          if (!parsed || seen.has(parsed.id)) continue
          seen.add(parsed.id)
          records.push(parsed)
        }
      } catch {
        // Il percorso vecchio può non esserci.
      }
      return records
    },
    async getGarmentPhoto(uid, profileId, id) {
      const { getBytes, ref } = await import('firebase/storage')
      const storage = await bucket()
      const paths = [
        `users/${uid}/profiles/${profileOf(profileId)}/photos/${id}`,
        `users/${uid}/photos/${id}`,
      ]
      let bytes: ArrayBuffer | null = null
      let failure: unknown
      for (const path of paths) {
        try {
          bytes = await getBytes(ref(storage, path))
          break
        } catch (error) {
          failure = error
        }
      }
      if (!bytes) throw failure instanceof Error ? failure : new Error('Foto non trovata.')
      const contentType = await photoContentType(uid, profileOf(profileId), id)
      return new Blob([bytes], { type: contentType })
    },
    async saveGarment(uid, garment: Garment) {
      const photo = await shrinkPhoto(garment.photo)
      if (photo.size >= MAX_CLOUD_PHOTO_BYTES) throw new PhotoTooLargeError()
      const contentType = photoType(photo)
      const record = { ...toCloudRecord(garment), photoContentType: contentType }
      const profileId = record.profileId
      const { doc, setDoc } = await import('firebase/firestore')
      const { ref, uploadBytes } = await import('firebase/storage')
      await uploadBytes(ref(await bucket(), `users/${uid}/profiles/${profileId}/photos/${garment.id}`), photo, { contentType })
      await setDoc(doc(await database(), 'users', uid, 'profiles', profileId, 'garments', garment.id), record)
    },
    async deleteGarment(uid, id, profileId) {
      const { deleteDoc, doc } = await import('firebase/firestore')
      const { deleteObject, ref } = await import('firebase/storage')
      const db = await database()
      const storage = await bucket()
      const owner = profileOf(profileId)
      await deleteDoc(doc(db, 'users', uid, 'profiles', owner, 'garments', id)).catch(() => undefined)
      await deleteDoc(doc(db, 'users', uid, 'garments', id)).catch(() => undefined)
      for (const path of [`users/${uid}/profiles/${owner}/photos/${id}`, `users/${uid}/photos/${id}`]) {
        try {
          await deleteObject(ref(storage, path))
        } catch {
          // La foto può essere già assente.
        }
      }
    },
    async listOutfits(uid) {
      const outfits: Outfit[] = []
      const seen = new Set<string>()
      for (const profileId of await knownProfileIds(uid)) {
        let rows: Record<string, unknown>[] = []
        try {
          rows = await readCollection(['users', uid, 'profiles', profileId, 'outfits'])
        } catch {
          rows = []
        }
        for (const row of rows) {
          const parsed = parseCloudOutfit({ ...row, profileId })
          if (!parsed || seen.has(parsed.id)) continue
          seen.add(parsed.id)
          outfits.push(parsed)
        }
      }
      try {
        const legacy = await readCollection(['users', uid, 'outfits'])
        for (const row of legacy) {
          const parsed = parseCloudOutfit(row)
          if (!parsed || seen.has(parsed.id)) continue
          seen.add(parsed.id)
          outfits.push(parsed)
        }
      } catch {
        // Il percorso vecchio può non esserci.
      }
      return outfits
    },
    async saveOutfit(uid, outfit: Outfit) {
      const { doc, setDoc } = await import('firebase/firestore')
      const profileId = profileOf(outfit.profileId)
      await setDoc(doc(await database(), 'users', uid, 'profiles', profileId, 'outfits', outfit.id), {
        id: outfit.id,
        name: outfit.name,
        garmentIds: outfit.garmentIds,
        occasion: outfit.occasion,
        season: outfit.season,
        createdAt: outfit.createdAt,
        updatedAt: outfit.updatedAt ?? outfit.createdAt,
        profileId,
      })
    },
    async deleteOutfit(uid, id, profileId) {
      const { deleteDoc, doc } = await import('firebase/firestore')
      const db = await database()
      const owner = profileOf(profileId)
      await deleteDoc(doc(db, 'users', uid, 'profiles', owner, 'outfits', id)).catch(() => undefined)
      await deleteDoc(doc(db, 'users', uid, 'outfits', id)).catch(() => undefined)
    },
    async getSettings(uid) {
      const { doc, getDoc } = await import('firebase/firestore')
      const snap = await getDoc(doc(await database(), 'users', uid, 'settings', 'app'))
      if (!snap.exists()) return null
      return cleanSettings(snap.data())
    },
    async saveSettings(uid, settings: CloudSettings) {
      const { doc, setDoc } = await import('firebase/firestore')
      const safe = cleanSettings(settings)
      if (!safe) return
      await setDoc(doc(await database(), 'users', uid, 'settings', 'app'), safe)
    },
  }
}
