import type { Garment, Outfit, Profile } from '../domain/types.ts'
import type { CloudSettings } from './secrets.ts'
import type { CloudGarmentRecord } from './records.ts'

/** Cosa l’app chiede all’account. I test usano un oggetto finto, senza rete. */
export interface CloudBackend {
  listProfiles(uid: string): Promise<Profile[]>
  saveProfile(uid: string, profile: Profile): Promise<void>
  deleteProfile(uid: string, id: string): Promise<void>
  listGarments(uid: string): Promise<CloudGarmentRecord[]>
  getGarmentPhoto(uid: string, profileId: string, id: string): Promise<Blob>
  saveGarment(uid: string, garment: Garment): Promise<void>
  deleteGarment(uid: string, id: string, profileId?: string): Promise<void>
  listOutfits(uid: string): Promise<Outfit[]>
  saveOutfit(uid: string, outfit: Outfit): Promise<void>
  deleteOutfit(uid: string, id: string, profileId?: string): Promise<void>
  getSettings(uid: string): Promise<CloudSettings | null>
  saveSettings(uid: string, settings: CloudSettings): Promise<void>
}
