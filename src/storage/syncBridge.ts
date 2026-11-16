/**
 * Il salvataggio locale avvisa chi vuole copiare il cambiamento sull’account.
 * Senza un ascoltatore non fa nulla: l’app resta utilizzabile solo sul dispositivo.
 */
import type { Garment, Outfit, Profile } from '../domain/types.ts'

export type LocalChange =
  | { kind: 'garment-put'; garment: Garment }
  | { kind: 'garment-delete'; id: string; profileId?: string }
  | { kind: 'outfit-put'; outfit: Outfit }
  | { kind: 'outfit-delete'; id: string; profileId?: string }
  | { kind: 'profile-put'; profile: Profile }
  | { kind: 'profile-delete'; id: string }

type Listener = (change: LocalChange) => Promise<void> | void

let listener: Listener | null = null

export function setLocalChangeListener(next: Listener | null): void {
  listener = next
}

export async function notifyLocalChange(change: LocalChange): Promise<void> {
  if (!listener) return
  try {
    await listener(change)
  } catch {
    // Il capo è già sul dispositivo. La copia sull’account si ritenta al prossimo aggiornamento.
  }
}
