/**
 * Archivio locale (IndexedDB) per capi e outfit.
 * Le foto sono Blob dentro il record del capo: restano nel browser e non vanno su un server.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  CATEGORIES,
  COLOURS,
  OCCASIONS,
  SEASONS,
  type Category,
  type Colour,
  type Garment,
  type Occasion,
  type Outfit,
  type Season,
} from '../domain/types.ts'

export const DATABASE_NAME = 'armadio-outfit'
const DATABASE_VERSION = 1

interface ArmadioSchema extends DBSchema {
  garments: {
    key: string
    value: Garment
  }
  outfits: {
    key: string
    value: Outfit
  }
}

let connection: Promise<IDBPDatabase<ArmadioSchema>> | undefined

function assertIndexedDb(): void {
  if (typeof indexedDB === 'undefined') {
    throw new Error('Questo browser non può conservare i vestiti sul dispositivo.')
  }
}

function getDatabase(): Promise<IDBPDatabase<ArmadioSchema>> {
  assertIndexedDb()
  if (!connection) {
    connection = openDB<ArmadioSchema>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('garments')) {
          database.createObjectStore('garments', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('outfits')) {
          database.createObjectStore('outfits', { keyPath: 'id' })
        }
      },
    }).catch((error: unknown) => {
      connection = undefined
      throw error
    })
  }
  return connection
}

/** Chiude il database. Utile nei test, per ripartire da un archivio vuoto. */
export async function closeDatabase(): Promise<void> {
  const pending = connection
  connection = undefined
  if (!pending) return
  const database = await pending
  database.close()
}

function assertId(id: string, message: string): void {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error(message)
  }
}

function assertCreatedAt(createdAt: string, message: string): void {
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
    throw new Error(message)
  }
}

function assertOneOf<T extends string>(value: string, allowed: readonly T[], message: string): void {
  if (!allowed.includes(value as T)) {
    throw new Error(message)
  }
}

function assertGarment(garment: Garment): void {
  assertId(garment.id, 'Manca l’id del capo.')
  if (!(garment.photo instanceof Blob)) {
    throw new Error('La foto del capo deve essere un file salvato nel browser.')
  }
  assertOneOf<Category>(garment.category, CATEGORIES, 'Categoria non valida.')
  assertOneOf<Colour>(garment.colour, COLOURS, 'Colore non valido.')
  assertOneOf<Season>(garment.season, SEASONS, 'Stagione non valida.')
  assertOneOf<Occasion>(garment.occasion, OCCASIONS, 'Occasione non valida.')
  assertCreatedAt(garment.createdAt, 'Data del capo non valida.')
}

function assertOutfit(outfit: Outfit): void {
  assertId(outfit.id, 'Manca l’id dell’outfit.')
  if (typeof outfit.name !== 'string' || outfit.name.trim() === '') {
    throw new Error('Manca il nome dell’outfit.')
  }
  if (!Array.isArray(outfit.garmentIds) || outfit.garmentIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
    throw new Error('L’outfit deve elencare gli id dei capi.')
  }
  assertOneOf<Occasion>(outfit.occasion, OCCASIONS, 'Occasione non valida.')
  assertOneOf<Season>(outfit.season, SEASONS, 'Stagione non valida.')
  assertCreatedAt(outfit.createdAt, 'Data dell’outfit non valida.')
}

function byNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listGarments(): Promise<Garment[]> {
  const database = await getDatabase()
  const garments = await database.getAll('garments')
  return byNewest(garments)
}

export async function getGarment(id: string): Promise<Garment | undefined> {
  const database = await getDatabase()
  return database.get('garments', id)
}

export async function addGarment(garment: Garment): Promise<void> {
  assertGarment(garment)
  const database = await getDatabase()
  const existing = await database.get('garments', garment.id)
  if (existing) {
    throw new Error('Esiste già un capo con questo id.')
  }
  await database.add('garments', garment)
}

export async function updateGarment(garment: Garment): Promise<void> {
  assertGarment(garment)
  const database = await getDatabase()
  const existing = await database.get('garments', garment.id)
  if (!existing) {
    throw new Error('Capo non trovato.')
  }
  await database.put('garments', garment)
}

/** Elimina il capo. Gli outfit che lo citano restano invariati. */
export async function deleteGarment(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('garments', id)
}

export async function listOutfits(): Promise<Outfit[]> {
  const database = await getDatabase()
  const outfits = await database.getAll('outfits')
  return byNewest(outfits)
}

/** Crea l’outfit oppure sostituisce quello con lo stesso id. */
export async function saveOutfit(outfit: Outfit): Promise<void> {
  assertOutfit(outfit)
  const database = await getDatabase()
  await database.put('outfits', outfit)
}

export async function deleteOutfit(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('outfits', id)
}
