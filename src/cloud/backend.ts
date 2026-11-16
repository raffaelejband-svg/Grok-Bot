import type { Garment, Outfit } from '../domain/types.ts'
import type { CloudSettings } from './secrets.ts'
import type { CloudGarmentRecord } from './records.ts'

/** Cosa l’app chiede all’account. I test usano un oggetto finto, senza rete. */
export interface CloudBackend {
  listGarments(uid: string): Promise<CloudGarmentRecord[]>
  getGarmentPhoto(uid: string, id: string): Promise<Blob>
  saveGarment(uid: string, garment: Garment): Promise<void>
  deleteGarment(uid: string, id: string): Promise<void>
  listOutfits(uid: string): Promise<Outfit[]>
  saveOutfit(uid: string, outfit: Outfit): Promise<void>
  deleteOutfit(uid: string, id: string): Promise<void>
  getSettings(uid: string): Promise<CloudSettings | null>
  saveSettings(uid: string, settings: CloudSettings): Promise<void>
}
