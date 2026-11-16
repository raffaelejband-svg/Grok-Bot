/**
 * Copia su Firestore e Cloud Storage.
 * Le foto grandi vengono ridotte solo su questa copia.
 */
import type { Garment, Outfit } from '../domain/types.ts'
import type { CloudBackend } from './backend.ts'
import { getFirebaseApp } from './firebaseApp.ts'
import { PhotoTooLargeError, MAX_CLOUD_PHOTO_BYTES } from './photoLimit.ts'
import { parseCloudGarment, parseCloudOutfit, toCloudRecord, type CloudGarmentRecord } from './records.ts'
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

export async function createFirebaseBackend(): Promise<CloudBackend> {
  await getFirebaseApp()
  return {
    async listGarments(uid) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(await database(), 'users', uid, 'garments'))
      const records: CloudGarmentRecord[] = []
      for (const item of snap.docs) {
        const parsed = parseCloudGarment(item.data())
        if (parsed) records.push(parsed)
      }
      return records
    },
    async getGarmentPhoto(uid, id) {
      const { getBytes, ref } = await import('firebase/storage')
      const { doc, getDoc } = await import('firebase/firestore')
      const stored = await getDoc(doc(await database(), 'users', uid, 'garments', id))
      const parsed = stored.exists() ? parseCloudGarment(stored.data()) : null
      const bytes = await getBytes(ref(await bucket(), `users/${uid}/photos/${id}`))
      return new Blob([bytes], { type: parsed?.photoContentType ?? 'image/jpeg' })
    },
    async saveGarment(uid, garment: Garment) {
      const photo = await shrinkPhoto(garment.photo)
      if (photo.size >= MAX_CLOUD_PHOTO_BYTES) throw new PhotoTooLargeError()
      const contentType = photoType(photo)
      const record = { ...toCloudRecord(garment), photoContentType: contentType }
      const { doc, setDoc } = await import('firebase/firestore')
      const { ref, uploadBytes } = await import('firebase/storage')
      await uploadBytes(ref(await bucket(), `users/${uid}/photos/${garment.id}`), photo, { contentType })
      await setDoc(doc(await database(), 'users', uid, 'garments', garment.id), record)
    },
    async deleteGarment(uid, id) {
      const { deleteDoc, doc } = await import('firebase/firestore')
      const { deleteObject, ref } = await import('firebase/storage')
      await deleteDoc(doc(await database(), 'users', uid, 'garments', id))
      try {
        await deleteObject(ref(await bucket(), `users/${uid}/photos/${id}`))
      } catch {
        // La foto può essere già assente.
      }
    },
    async listOutfits(uid) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(await database(), 'users', uid, 'outfits'))
      const outfits: Outfit[] = []
      for (const item of snap.docs) {
        const parsed = parseCloudOutfit(item.data())
        if (parsed) outfits.push(parsed)
      }
      return outfits
    },
    async saveOutfit(uid, outfit: Outfit) {
      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(await database(), 'users', uid, 'outfits', outfit.id), {
        id: outfit.id,
        name: outfit.name,
        garmentIds: outfit.garmentIds,
        occasion: outfit.occasion,
        season: outfit.season,
        createdAt: outfit.createdAt,
        updatedAt: outfit.updatedAt ?? outfit.createdAt,
      })
    },
    async deleteOutfit(uid, id) {
      const { deleteDoc, doc } = await import('firebase/firestore')
      await deleteDoc(doc(await database(), 'users', uid, 'outfits', id))
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
