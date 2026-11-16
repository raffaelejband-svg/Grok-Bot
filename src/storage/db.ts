/**
 * Archivio locale (IndexedDB) per capi e outfit.
 * Le foto sono Blob dentro il record del capo.
 * Con un account, una copia può andare sul progetto Firebase: la chiave Gemini no.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  CATEGORIES,
  COLOURS,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  GENDERS,
  MATERIALS,
  OCCASIONS,
  PATTERNS,
  SEASONS,
  SUBTYPES,
  type Category,
  type Colour,
  type Garment,
  type Gender,
  type Material,
  type Occasion,
  type Outfit,
  type Pattern,
  type Profile,
  type Season,
  type SubType,
} from '../domain/types.ts'
import { notifyLocalChange } from './syncBridge.ts'

export const DATABASE_NAME = 'armadio-outfit'
const DATABASE_VERSION = 2
const ACTIVE_PROFILE_KEY = 'activeProfileId'
const PROFILE_PICKED_KEY = 'profilePicked'

interface ArmadioSchema extends DBSchema {
  garments: {
    key: string
    value: Garment
  }
  outfits: {
    key: string
    value: Outfit
  }
  profiles: {
    key: string
    value: Profile
  }
  meta: {
    key: string
    value: string
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
      async upgrade(database, oldVersion, _newVersion, transaction) {
        if (!database.objectStoreNames.contains('garments')) {
          database.createObjectStore('garments', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('outfits')) {
          database.createObjectStore('outfits', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('profiles')) {
          database.createObjectStore('profiles', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('meta')) {
          database.createObjectStore('meta')
        }
        if (oldVersion >= 2) return
        const now = new Date().toISOString()
        const profiles = transaction.objectStore('profiles')
        const meta = transaction.objectStore('meta')
        await profiles.put({
          id: DEFAULT_PROFILE_ID,
          name: DEFAULT_PROFILE_NAME,
          gender: 'uomo',
          createdAt: now,
          updatedAt: now,
        })
        await meta.put(DEFAULT_PROFILE_ID, ACTIVE_PROFILE_KEY)
        const garmentStore = transaction.objectStore('garments')
        let garmentCursor = await garmentStore.openCursor()
        while (garmentCursor) {
          if (!garmentCursor.value.profileId) {
            await garmentCursor.update({ ...garmentCursor.value, profileId: DEFAULT_PROFILE_ID })
          }
          garmentCursor = await garmentCursor.continue()
        }
        const outfitStore = transaction.objectStore('outfits')
        let outfitCursor = await outfitStore.openCursor()
        while (outfitCursor) {
          if (!outfitCursor.value.profileId) {
            await outfitCursor.update({ ...outfitCursor.value, profileId: DEFAULT_PROFILE_ID })
          }
          outfitCursor = await outfitCursor.continue()
        }
      },
    })
      .then(async (database) => {
        await ensureDefaultProfile(database)
        return database
      })
      .catch((error: unknown) => {
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

function isListed<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function profileIdOf(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : DEFAULT_PROFILE_ID
}

/** I capi salvati prima di questi campi non li hanno: qui ricevono i valori di ripiego. */
export function normalizeGarment(value: Garment): Garment {
  const raw = value as Garment & {
    subType?: unknown
    colourSecondary?: unknown
    pattern?: unknown
    material?: unknown
    profileId?: unknown
  }
  const colourSecondary = raw.colourSecondary == null
    ? null
    : isListed<Colour>(raw.colourSecondary, COLOURS)
      ? raw.colourSecondary
      : null
  return {
    ...value,
    subType: isListed<SubType>(raw.subType, SUBTYPES) ? raw.subType : 'altro',
    colourSecondary,
    pattern: isListed<Pattern>(raw.pattern, PATTERNS) ? raw.pattern : 'tinta unita',
    material: isListed<Material>(raw.material, MATERIALS) ? raw.material : 'sconosciuto',
    profileId: profileIdOf(raw.profileId),
  }
}

export function normalizeProfile(value: Profile): Profile {
  const name = value.name.trim()
  return {
    id: value.id,
    name: name || DEFAULT_PROFILE_NAME,
    gender: isListed<Gender>(value.gender, GENDERS) ? value.gender : 'uomo',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt ?? value.createdAt,
  }
}

function normalizeOutfit(value: Outfit): Outfit {
  return { ...value, profileId: profileIdOf(value.profileId) }
}

function prepareGarment(garment: Garment): Garment {
  const subType = garment.subType ?? 'altro'
  const pattern = garment.pattern ?? 'tinta unita'
  const material = garment.material ?? 'sconosciuto'
  const colourSecondary = garment.colourSecondary ?? null
  assertOneOf<SubType>(subType, SUBTYPES, 'Tipo non valido.')
  if (colourSecondary !== null) assertOneOf<Colour>(colourSecondary, COLOURS, 'Secondo colore non valido.')
  assertOneOf<Pattern>(pattern, PATTERNS, 'Disegno non valido.')
  assertOneOf<Material>(material, MATERIALS, 'Materiale non valido.')
  return { ...garment, subType, colourSecondary, pattern, material }
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
  prepareGarment(garment)
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

export async function listAllGarments(): Promise<Garment[]> {
  const database = await getDatabase()
  const garments = await database.getAll('garments')
  return byNewest(garments.map((garment) => normalizeGarment(garment)))
}

export async function listGarments(): Promise<Garment[]> {
  const active = await getActiveProfileId()
  const garments = await listAllGarments()
  return garments.filter((garment) => garment.profileId === active)
}

export async function getGarment(id: string): Promise<Garment | undefined> {
  const database = await getDatabase()
  const garment = await database.get('garments', id)
  return garment ? normalizeGarment(garment) : undefined
}

export async function addGarment(garment: Garment): Promise<void> {
  const profileId = profileIdOf(garment.profileId ?? (await getActiveProfileId()))
  const stored = prepareGarment({ ...garment, profileId, updatedAt: new Date().toISOString() })
  assertGarment(stored)
  const database = await getDatabase()
  const existing = await database.get('garments', garment.id)
  if (existing) {
    throw new Error('Esiste già un capo con questo id.')
  }
  await database.add('garments', stored)
  await notifyLocalChange({ kind: 'garment-put', garment: stored })
}

export async function updateGarment(garment: Garment): Promise<void> {
  const database = await getDatabase()
  const existing = await database.get('garments', garment.id)
  if (!existing) {
    throw new Error('Capo non trovato.')
  }
  const profileId = profileIdOf(garment.profileId ?? existing.profileId)
  const stored = prepareGarment({ ...garment, profileId, updatedAt: new Date().toISOString() })
  assertGarment(stored)
  await database.put('garments', stored)
  await notifyLocalChange({ kind: 'garment-put', garment: stored })
}

/** Arriva dall’account: non rimanda la copia e non cambia l’orario. */
export async function putGarmentFromCloud(garment: Garment): Promise<void> {
  const stored = prepareGarment({
    ...garment,
    profileId: profileIdOf(garment.profileId),
    updatedAt: garment.updatedAt ?? garment.createdAt,
  })
  assertGarment(stored)
  const database = await getDatabase()
  await database.put('garments', stored)
}

export async function removeGarmentFromCloud(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('garments', id)
}

/** Elimina il capo. Gli outfit che lo citano restano invariati. */
export async function deleteGarment(id: string): Promise<void> {
  const database = await getDatabase()
  const existing = await database.get('garments', id)
  await database.delete('garments', id)
  await notifyLocalChange({ kind: 'garment-delete', id, profileId: profileIdOf(existing?.profileId) })
}

export async function listAllOutfits(): Promise<Outfit[]> {
  const database = await getDatabase()
  const outfits = await database.getAll('outfits')
  return byNewest(outfits.map((outfit) => normalizeOutfit(outfit)))
}

export async function listOutfits(): Promise<Outfit[]> {
  const active = await getActiveProfileId()
  const outfits = await listAllOutfits()
  return outfits.filter((outfit) => outfit.profileId === active)
}

/** Crea l’outfit oppure sostituisce quello con lo stesso id. */
export async function saveOutfit(outfit: Outfit): Promise<void> {
  const profileId = profileIdOf(outfit.profileId ?? (await getActiveProfileId()))
  const stored = normalizeOutfit({ ...outfit, profileId, updatedAt: new Date().toISOString() })
  assertOutfit(stored)
  const database = await getDatabase()
  await database.put('outfits', stored)
  await notifyLocalChange({ kind: 'outfit-put', outfit: stored })
}

export async function putOutfitFromCloud(outfit: Outfit): Promise<void> {
  const stored = normalizeOutfit({ ...outfit, updatedAt: outfit.updatedAt ?? outfit.createdAt })
  assertOutfit(stored)
  const database = await getDatabase()
  await database.put('outfits', stored)
}

export async function removeOutfitFromCloud(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('outfits', id)
}

export async function deleteOutfit(id: string): Promise<void> {
  const database = await getDatabase()
  const existing = await database.get('outfits', id)
  await database.delete('outfits', id)
  await notifyLocalChange({ kind: 'outfit-delete', id, profileId: profileIdOf(existing?.profileId) })
}

function checkedProfileName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new Error('Scrivi un nome.')
  if (trimmed.length > 40) throw new Error('Il nome è troppo lungo.')
  return trimmed
}

function checkedGender(gender: Gender): Gender {
  if (!isListed<Gender>(gender, GENDERS)) throw new Error('Scegli uomo o donna.')
  return gender
}

async function ensureDefaultProfile(database: IDBPDatabase<ArmadioSchema>): Promise<void> {
  const existing = await database.getAll('profiles')
  if (existing.length === 0) {
    const now = new Date().toISOString()
    await database.put('profiles', {
      id: DEFAULT_PROFILE_ID,
      name: DEFAULT_PROFILE_NAME,
      gender: 'uomo',
      createdAt: now,
      updatedAt: now,
    })
  }
  const active = await database.get('meta', ACTIVE_PROFILE_KEY)
  if (typeof active !== 'string' || active.trim() === '') {
    const profiles = await database.getAll('profiles')
    await database.put('meta', profiles[0]?.id ?? DEFAULT_PROFILE_ID, ACTIVE_PROFILE_KEY)
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const database = await getDatabase()
  const profiles = await database.getAll('profiles')
  return profiles
    .map((profile) => normalizeProfile(profile))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name, 'it'))
}

export async function getActiveProfileId(): Promise<string> {
  const database = await getDatabase()
  const active = await database.get('meta', ACTIVE_PROFILE_KEY)
  if (typeof active === 'string' && active.trim() !== '') {
    const found = await database.get('profiles', active)
    if (found) return active
  }
  const profiles = await listProfiles()
  const id = profiles[0]?.id ?? DEFAULT_PROFILE_ID
  await database.put('meta', id, ACTIVE_PROFILE_KEY)
  return id
}

export async function getActiveProfile(): Promise<Profile> {
  const id = await getActiveProfileId()
  const database = await getDatabase()
  const found = await database.get('profiles', id)
  if (found) return normalizeProfile(found)
  const profiles = await listProfiles()
  const first = profiles[0]
  if (!first) throw new Error('Manca il profilo.')
  return first
}

export async function setActiveProfile(id: string): Promise<void> {
  const database = await getDatabase()
  const found = await database.get('profiles', id)
  if (!found) throw new Error('Profilo non trovato.')
  await database.put('meta', id, ACTIVE_PROFILE_KEY)
  await database.put('meta', '1', PROFILE_PICKED_KEY)
}

export async function addProfile(input: { name: string; gender: Gender }): Promise<Profile> {
  const name = checkedProfileName(input.name)
  const gender = checkedGender(input.gender)
  const now = new Date().toISOString()
  const profile: Profile = { id: crypto.randomUUID(), name, gender, createdAt: now, updatedAt: now }
  const database = await getDatabase()
  await database.put('profiles', profile)
  await notifyLocalChange({ kind: 'profile-put', profile })
  return profile
}

export async function updateProfile(profile: Profile): Promise<Profile> {
  const database = await getDatabase()
  const existing = await database.get('profiles', profile.id)
  if (!existing) throw new Error('Profilo non trovato.')
  const stored: Profile = {
    ...existing,
    name: checkedProfileName(profile.name),
    gender: checkedGender(profile.gender),
    updatedAt: new Date().toISOString(),
  }
  await database.put('profiles', stored)
  await notifyLocalChange({ kind: 'profile-put', profile: stored })
  return stored
}

export async function putProfileFromCloud(profile: Profile): Promise<void> {
  const stored = normalizeProfile(profile)
  assertId(stored.id, 'Manca l’id del profilo.')
  assertCreatedAt(stored.createdAt, 'Data del profilo non valida.')
  const database = await getDatabase()
  await database.put('profiles', stored)
}

export async function deleteProfile(id: string): Promise<void> {
  const database = await getDatabase()
  const profiles = await database.getAll('profiles')
  if (profiles.length <= 1) throw new Error('Serve almeno un profilo.')
  if (!profiles.some((profile) => profile.id === id)) throw new Error('Profilo non trovato.')
  const garments = await database.getAll('garments')
  for (const garment of garments) {
    if (profileIdOf(garment.profileId) !== id) continue
    await database.delete('garments', garment.id)
    await notifyLocalChange({ kind: 'garment-delete', id: garment.id, profileId: id })
  }
  const outfits = await database.getAll('outfits')
  for (const outfit of outfits) {
    if (profileIdOf(outfit.profileId) !== id) continue
    await database.delete('outfits', outfit.id)
    await notifyLocalChange({ kind: 'outfit-delete', id: outfit.id, profileId: id })
  }
  await database.delete('profiles', id)
  const active = await database.get('meta', ACTIVE_PROFILE_KEY)
  if (active === id) {
    const next = profiles.find((profile) => profile.id !== id)
    if (next) await database.put('meta', next.id, ACTIVE_PROFILE_KEY)
  }
  await notifyLocalChange({ kind: 'profile-delete', id })
}

/** Arriva dall’account: toglie il profilo senza rimandarlo in copia. Non toglie l’ultimo. */
export async function removeProfileFromCloud(id: string): Promise<boolean> {
  const database = await getDatabase()
  const profiles = await database.getAll('profiles')
  if (profiles.length <= 1) return false
  if (!profiles.some((profile) => profile.id === id)) return false
  const garments = await database.getAll('garments')
  for (const garment of garments) {
    if (profileIdOf(garment.profileId) === id) await database.delete('garments', garment.id)
  }
  const outfits = await database.getAll('outfits')
  for (const outfit of outfits) {
    if (profileIdOf(outfit.profileId) === id) await database.delete('outfits', outfit.id)
  }
  await database.delete('profiles', id)
  const active = await database.get('meta', ACTIVE_PROFILE_KEY)
  if (active === id) {
    const next = profiles.find((profile) => profile.id !== id)
    if (next) await database.put('meta', next.id, ACTIVE_PROFILE_KEY)
  }
  return true
}

/** Su un dispositivo nuovo, se il profilo aperto è vuoto, mostra quello che ha i vestiti. */
export async function preferProfileWithClothesIfUntouched(): Promise<void> {
  const database = await getDatabase()
  if ((await database.get('meta', PROFILE_PICKED_KEY)) === '1') return
  const active = await getActiveProfileId()
  const garments = await listAllGarments()
  const outfits = await listAllOutfits()
  const owns = (id: string) =>
    garments.some((garment) => garment.profileId === id) || outfits.some((outfit) => outfit.profileId === id)
  if (owns(active)) return
  const richer = (await listProfiles()).find((profile) => profile.id !== active && owns(profile.id))
  if (!richer) return
  await database.put('meta', richer.id, ACTIVE_PROFILE_KEY)
}
