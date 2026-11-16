/**
 * Dati del capo senza la foto: la foto sta in Cloud Storage.
 * I campi sono quelli del capo, niente chiave e niente blob.
 */
import { normalizeGarment, normalizeProfile } from '../storage/db.ts'
import {
  CATEGORIES,
  COLOURS,
  DEFAULT_PROFILE_ID,
  GENDERS,
  MATERIALS,
  OCCASIONS,
  PATTERNS,
  SEASONS,
  SUBTYPES,
  subtypeFits,
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

export type CloudGarmentRecord = {
  id: string
  profileId: string
  category: Category
  subType: SubType
  colour: Colour
  colourSecondary: Colour | null
  pattern: Pattern
  material: Material
  season: Season
  occasion: Occasion
  createdAt: string
  updatedAt: string
  photoContentType: string
}

export function stampOf(item: { id: string; createdAt: string; updatedAt?: string }): { id: string; updatedAt: string } {
  const updatedAt = typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt))
    ? item.updatedAt
    : item.createdAt
  return { id: item.id, updatedAt }
}

export function toCloudRecord(garment: Garment): CloudGarmentRecord {
  const normal = normalizeGarment(garment)
  const contentType = normal.photo.type.startsWith('image/') ? normal.photo.type : 'image/jpeg'
  return {
    id: normal.id,
    profileId: normal.profileId ?? DEFAULT_PROFILE_ID,
    category: normal.category,
    subType: normal.subType ?? 'altro',
    colour: normal.colour,
    colourSecondary: normal.colourSecondary ?? null,
    pattern: normal.pattern ?? 'tinta unita',
    material: normal.material ?? 'sconosciuto',
    season: normal.season,
    occasion: normal.occasion,
    createdAt: normal.createdAt,
    updatedAt: stampOf(normal).updatedAt,
    photoContentType: contentType,
  }
}

export function garmentFromCloud(record: CloudGarmentRecord, photo: Blob): Garment {
  return normalizeGarment({
    id: record.id,
    profileId: record.profileId,
    photo,
    category: record.category,
    subType: record.subType,
    colour: record.colour,
    colourSecondary: record.colourSecondary,
    pattern: record.pattern,
    material: record.material,
    season: record.season,
    occasion: record.occasion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function asDate(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

export function parseCloudGarment(value: unknown): CloudGarmentRecord | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const category = asEnum<Category>(value.category, CATEGORIES)
  const colour = asEnum<Colour>(value.colour, COLOURS)
  const season = asEnum<Season>(value.season, SEASONS)
  const occasion = asEnum<Occasion>(value.occasion, OCCASIONS)
  const createdAt = asDate(value.createdAt)
  if (!id || !category || !colour || !season || !occasion || !createdAt) return null
  const guessedType = asEnum<SubType>(value.subType, SUBTYPES) ?? 'altro'
  const colourSecondary = value.colourSecondary == null ? null : asEnum<Colour>(value.colourSecondary, COLOURS)
  const profileId = typeof value.profileId === 'string' && value.profileId.trim() !== ''
    ? value.profileId.trim()
    : DEFAULT_PROFILE_ID
  return {
    id,
    profileId,
    category,
    subType: subtypeFits(category, guessedType) ? guessedType : 'altro',
    colour,
    colourSecondary,
    pattern: asEnum<Pattern>(value.pattern, PATTERNS) ?? 'tinta unita',
    material: asEnum<Material>(value.material, MATERIALS) ?? 'sconosciuto',
    season,
    occasion,
    createdAt,
    updatedAt: asDate(value.updatedAt) ?? createdAt,
    photoContentType: typeof value.photoContentType === 'string' && value.photoContentType.startsWith('image/')
      ? value.photoContentType
      : 'image/jpeg',
  }
}

export function parseCloudOutfit(value: unknown): Outfit | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const occasion = asEnum<Occasion>(value.occasion, OCCASIONS)
  const season = asEnum<Season>(value.season, SEASONS)
  const createdAt = asDate(value.createdAt)
  const garmentIds = Array.isArray(value.garmentIds)
    ? value.garmentIds.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
  if (!id || !name || !occasion || !season || !createdAt || garmentIds.length === 0) return null
  const profileId = typeof value.profileId === 'string' && value.profileId.trim() !== ''
    ? value.profileId.trim()
    : DEFAULT_PROFILE_ID
  return {
    id,
    name,
    garmentIds,
    occasion,
    season,
    createdAt,
    updatedAt: asDate(value.updatedAt) ?? createdAt,
    profileId,
  }
}

export function parseCloudProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const gender = asEnum<Gender>(value.gender, GENDERS)
  const createdAt = asDate(value.createdAt)
  if (!id || !name || !gender || !createdAt) return null
  return normalizeProfile({
    id,
    name,
    gender,
    createdAt,
    updatedAt: asDate(value.updatedAt) ?? createdAt,
  })
}
