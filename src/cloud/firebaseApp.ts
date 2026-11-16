/**
 * Avvio di Firebase solo se la configurazione pubblica c’è.
 * L’SDK viene caricato in quel momento, non all’apertura della pagina senza account.
 */
import type { FirebaseApp } from 'firebase/app'
import { readCloudConfig } from './config.ts'

let appPromise: Promise<FirebaseApp> | null = null

export function getFirebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = createApp().catch((error: unknown) => {
      appPromise = null
      throw error
    })
  }
  return appPromise
}

async function createApp(): Promise<FirebaseApp> {
  const config = readCloudConfig()
  if (!config) throw new Error('Sincronizzazione da attivare.')
  const { getApps, initializeApp } = await import('firebase/app')
  const existing = getApps()[0]
  if (existing) return existing
  return initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  })
}
