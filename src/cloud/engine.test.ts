// @vitest-environment node
import 'fake-indexeddb/auto'
import { deleteDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Garment, Outfit, Profile } from '../domain/types.ts'
import { GEMINI_KEY_STORAGE } from '../vision/apiKey.ts'
import { DATABASE_NAME, addGarment, closeDatabase, getGarment, listGarments, listOutfits } from '../storage/db.ts'
import { setLocalChangeListener } from '../storage/syncBridge.ts'
import type { CloudBackend } from './backend.ts'
import { readDecision, writeLastUid } from './deviceState.ts'
import {
  acceptDeviceUpload,
  declineDeviceUpload,
  pushLocalChange,
  reconcile,
  resetSyncQueueForTests,
  setActiveSync,
} from './engine.ts'
import { toCloudRecord, type CloudGarmentRecord } from './records.ts'
import { SETTINGS_STORAGE_KEY, type CloudSettings } from './secrets.ts'
import type { KeyValueStore } from './store.ts'

function memory(initial: Record<string, string> = {}): KeyValueStore & { dump: () => string } {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
    dump: () => JSON.stringify([...data.entries()]),
  }
}

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'capo-1',
    photo: new Blob(['foto-locale'], { type: 'image/jpeg' }),
    category: 'top',
    colour: 'blu',
    season: 'estate',
    occasion: 'casual',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function fakeBackend() {
  const garments = new Map<string, { record: CloudGarmentRecord; photo: Blob }>()
  const outfits = new Map<string, Outfit>()
  const profiles = new Map<string, Profile>()
  let settings: CloudSettings | null = null
  const saves: Garment[] = []
  const profileSaves: Profile[] = []
  const settingsSaves: CloudSettings[] = []
  let lists = 0
  const backend: CloudBackend = {
    async listProfiles() {
      return [...profiles.values()]
    },
    async saveProfile(_uid, profile) {
      profileSaves.push(profile)
      profiles.set(profile.id, profile)
    },
    async deleteProfile(_uid, id) {
      profiles.delete(id)
      for (const [garmentId, item] of garments) {
        if (item.record.profileId === id) garments.delete(garmentId)
      }
      for (const [outfitId, outfit] of outfits) {
        if (outfit.profileId === id) outfits.delete(outfitId)
      }
    },
    async listGarments() {
      lists += 1
      return [...garments.values()].map((item) => item.record)
    },
    async getGarmentPhoto(_uid, _profileId, id) {
      const found = garments.get(id)
      if (!found) throw new Error('manca la foto')
      return found.photo
    },
    async saveGarment(_uid, item) {
      saves.push(item)
      garments.set(item.id, { record: toCloudRecord(item), photo: item.photo })
    },
    async deleteGarment(_uid, id) {
      garments.delete(id)
    },
    async listOutfits() {
      return [...outfits.values()]
    },
    async saveOutfit(_uid, outfit) {
      outfits.set(outfit.id, outfit)
    },
    async deleteOutfit(_uid, id) {
      outfits.delete(id)
    },
    async getSettings() {
      return settings
    },
    async saveSettings(_uid, next) {
      settingsSaves.push(next)
      settings = next
    },
  }
  return {
    backend,
    garments,
    outfits,
    profiles,
    saves,
    profileSaves,
    settingsSaves,
    lists: () => lists,
    setSettings: (next: CloudSettings | null) => {
      settings = next
    },
  }
}

beforeEach(async () => {
  resetSyncQueueForTests()
  setLocalChangeListener(null)
  await closeDatabase()
  await deleteDB(DATABASE_NAME)
})

describe('sincronizzazione', () => {
  it('non carica il guardaroba già sul dispositivo finché non lo chiedi', async () => {
    const cloud = fakeBackend()
    const storage = memory()
    await addGarment(garment())
    setActiveSync({ uid: 'io', backend: cloud.backend })

    const asked = await reconcile(storage)
    expect(asked.offer).toEqual({ garments: 1, outfits: 0 })
    expect(cloud.saves).toHaveLength(0)

    await acceptDeviceUpload(storage)
    expect(cloud.saves.map((item) => item.id)).toEqual(['capo-1'])
    expect(cloud.profileSaves.map((profile) => profile.id)).toContain('il-mio-profilo')
    expect(readDecision(storage, 'io')).toBe('accepted')
  })

  it('se dici no, quei capi restano solo sul dispositivo', async () => {
    const cloud = fakeBackend()
    const storage = memory()
    await addGarment(garment())
    setActiveSync({ uid: 'io', backend: cloud.backend })
    setLocalChangeListener((change) => pushLocalChange(change, storage))

    await reconcile(storage)
    await declineDeviceUpload(storage)
    expect(cloud.saves).toHaveLength(0)
    expect(readDecision(storage, 'io')).toBe('declined')

    await reconcile(storage)
    expect(cloud.saves).toHaveLength(0)

    await addGarment(garment({ id: 'nuovo', photo: new Blob(['nuova'], { type: 'image/jpeg' }) }))
    expect(cloud.saves.map((item) => item.id)).toEqual(['nuovo'])
  })

  it('scarica i capi dell’account su un dispositivo vuoto', async () => {
    const cloud = fakeBackend()
    const photo = new Blob(['foto-nuvola'], { type: 'image/jpeg' })
    cloud.garments.set('remoto', {
      record: toCloudRecord(garment({ id: 'remoto', photo, colour: 'verde' })),
      photo,
    })
    cloud.outfits.set('look-1', {
      id: 'look-1',
      name: 'Lunedì',
      garmentIds: ['remoto'],
      occasion: 'lavoro',
      season: 'autunno',
      createdAt: '2026-10-02T08:00:00.000Z',
    })
    const storage = memory()
    setActiveSync({ uid: 'io', backend: cloud.backend })

    const snapshot = await reconcile(storage)
    expect(snapshot.offer).toBeNull()
    expect(cloud.saves).toHaveLength(0)
    const saved = await getGarment('remoto')
    expect(saved?.colour).toBe('verde')
    expect(await saved?.photo.text()).toBe('foto-nuvola')
    expect((await listOutfits()).map((outfit) => outfit.name)).toEqual(['Lunedì'])
    expect(readDecision(storage, 'io')).toBe('accepted')
  })

  it('non manda la chiave Gemini e non la cancella', async () => {
    const cloud = fakeBackend()
    const storage = memory({
      [GEMINI_KEY_STORAGE]: 'segreto-gemini',
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        updatedAt: '2026-11-16T00:00:00.000Z',
        values: { promemoria: 'lana', geminiApiKey: 'segreto-gemini', nota: 'segreto-gemini' },
      }),
    })
    setActiveSync({ uid: 'io', backend: cloud.backend })

    await reconcile(storage)

    expect(cloud.settingsSaves).toHaveLength(1)
    expect(JSON.stringify(cloud.settingsSaves)).not.toContain('segreto-gemini')
    expect(JSON.stringify(cloud.profileSaves)).not.toContain('segreto-gemini')
    expect(cloud.profileSaves.some((profile) => profile.name === 'Il mio profilo')).toBe(true)
    expect(cloud.settingsSaves[0]?.values).toEqual({ promemoria: 'lana' })
    expect(storage.getItem(GEMINI_KEY_STORAGE)).toBe('segreto-gemini')
    expect(storage.dump()).toContain('segreto-gemini')
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('segreto-gemini')
  })

  it('non mescola il guardaroba di un altro account', async () => {
    const cloud = fakeBackend()
    const storage = memory()
    writeLastUid(storage, 'altro')
    await addGarment(garment())
    setActiveSync({ uid: 'io', backend: cloud.backend })

    const snapshot = await reconcile(storage)
    expect(snapshot.blocked).toBe(true)
    expect(cloud.lists()).toBe(0)
    expect(cloud.saves).toHaveLength(0)
    expect(await listGarments()).toHaveLength(1)
  })
})
