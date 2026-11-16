// @vitest-environment node
// jsdom non conserva i Blob nello structured clone. Node sì, come il browser.
import 'fake-indexeddb/auto'
import { deleteDB, openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Garment, Outfit } from '../domain/types.ts'
import { DEFAULT_PROFILE_ID } from '../domain/types.ts'
import {
  DATABASE_NAME,
  addGarment,
  addProfile,
  closeDatabase,
  deleteGarment,
  deleteOutfit,
  deleteProfile,
  getActiveProfile,
  getGarment,
  listGarments,
  listOutfits,
  listProfiles,
  saveOutfit,
  setActiveProfile,
  updateGarment,
} from './db.ts'

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'capo-1',
    photo: new Blob(['foto-blu'], { type: 'image/jpeg' }),
    category: 'top',
    colour: 'blu',
    season: 'estate',
    occasion: 'casual',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function outfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    id: 'look-1',
    name: 'Lunedì in ufficio',
    garmentIds: ['capo-1'],
    occasion: 'lavoro',
    season: 'autunno',
    createdAt: '2026-10-02T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(async () => {
  await closeDatabase()
  await deleteDB(DATABASE_NAME)
})

describe('archivio capi e outfit', () => {
  it('salva la foto del capo e aggiorna, elenca ed elimina', async () => {
    await addGarment(garment())
    await addGarment(
      garment({
        id: 'capo-2',
        colour: 'nero',
        createdAt: '2026-07-01T10:00:00.000Z',
        photo: new Blob(['foto-nera'], { type: 'image/png' }),
      }),
    )

    const listed = await listGarments()
    expect(listed.map((item) => item.id)).toEqual(['capo-2', 'capo-1'])

    const saved = await getGarment('capo-1')
    expect(saved?.photo).toBeInstanceOf(Blob)
    expect(saved?.photo.type).toBe('image/jpeg')
    expect(await saved?.photo.text()).toBe('foto-blu')

    const updatedPhoto = new Blob(['foto-nuova'], { type: 'image/webp' })
    await updateGarment(garment({ colour: 'verde', photo: updatedPhoto }))
    const updated = await getGarment('capo-1')
    expect(updated?.colour).toBe('verde')
    expect(await updated?.photo.text()).toBe('foto-nuova')

    await deleteGarment('capo-1')
    expect(await getGarment('capo-1')).toBeUndefined()
    expect(await listGarments()).toHaveLength(1)
  })

  it('un capo vecchio, senza i campi nuovi, si legge con i valori di ripiego', async () => {
    const database = await openDB(DATABASE_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('garments', { keyPath: 'id' })
        db.createObjectStore('outfits', { keyPath: 'id' })
      },
    })
    await database.put('garments', {
      id: 'vecchio',
      photo: new Blob(['vecchia'], { type: 'image/jpeg' }),
      category: 'top',
      colour: 'blu',
      season: 'estate',
      occasion: 'casual',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await database.put('outfits', {
      id: 'look-vecchio',
      name: 'Lunedì',
      garmentIds: ['vecchio'],
      occasion: 'lavoro',
      season: 'autunno',
      createdAt: '2026-02-01T00:00:00.000Z',
    })
    database.close()

    const loaded = await getGarment('vecchio')
    expect(loaded?.subType).toBe('altro')
    expect(loaded?.colourSecondary).toBeNull()
    expect(loaded?.pattern).toBe('tinta unita')
    expect(loaded?.material).toBe('sconosciuto')
    expect(loaded?.category).toBe('top')
    expect(loaded?.profileId).toBe(DEFAULT_PROFILE_ID)
    const profiles = await listProfiles()
    expect(profiles.map((profile) => profile.name)).toEqual(['Il mio profilo'])
    expect(profiles[0]?.gender).toBe('uomo')
    expect((await listGarments()).map((item) => item.id)).toEqual(['vecchio'])
    expect((await listOutfits()).map((item) => item.id)).toEqual(['look-vecchio'])
  })

  it('tiene i capi di ogni profilo separati e non elimina l’ultimo', async () => {
    await addGarment(garment())
    await saveOutfit(outfit())
    const maria = await addProfile({ name: 'Maria', gender: 'donna' })
    await setActiveProfile(maria.id)
    expect(await listGarments()).toEqual([])
    expect(await listOutfits()).toEqual([])
    await addGarment(garment({ id: 'gonna', category: 'gonna', subType: 'gonna' }))
    expect((await getActiveProfile()).name).toBe('Maria')
    expect((await listGarments()).map((item) => item.id)).toEqual(['gonna'])

    await setActiveProfile(DEFAULT_PROFILE_ID)
    expect((await listGarments()).map((item) => item.id)).toEqual(['capo-1'])
    expect((await listOutfits()).map((item) => item.id)).toEqual(['look-1'])

    await deleteProfile(maria.id)
    expect((await listProfiles()).map((profile) => profile.id)).toEqual([DEFAULT_PROFILE_ID])
    await expect(deleteProfile(DEFAULT_PROFILE_ID)).rejects.toThrow('Serve almeno un profilo.')
    expect((await listGarments()).map((item) => item.id)).toEqual(['capo-1'])
  })

  it('un capo nuovo senza i campi extra li riceve al salvataggio', async () => {
    await addGarment(garment())
    const saved = await getGarment('capo-1')
    expect(saved?.subType).toBe('altro')
    expect(saved?.pattern).toBe('tinta unita')
    expect(saved?.material).toBe('sconosciuto')
    expect(saved?.colourSecondary).toBeNull()
  })

  it('rifiuta un tipo che non è nell’elenco', async () => {
    await expect(addGarment(garment({ subType: 'giubba' as Garment['subType'] }))).rejects.toThrow('Tipo non valido.')
  })

  it('salva, sostituisce ed elimina un outfit', async () => {
    await saveOutfit(outfit())
    await saveOutfit(outfit({ id: 'look-2', name: 'Sabato', createdAt: '2026-11-01T18:00:00.000Z' }))
    await saveOutfit(outfit({ name: 'Riunione' }))

    const listed = await listOutfits()
    expect(listed.map((item) => item.name)).toEqual(['Sabato', 'Riunione'])

    await deleteOutfit('look-2')
    expect((await listOutfits()).map((item) => item.id)).toEqual(['look-1'])
  })

  it('rifiuta un capo duplicato e un aggiornamento di un capo assente', async () => {
    await addGarment(garment())
    await expect(addGarment(garment())).rejects.toThrow('Esiste già un capo con questo id.')
    await expect(updateGarment(garment({ id: 'manca' }))).rejects.toThrow('Capo non trovato.')
  })
})
