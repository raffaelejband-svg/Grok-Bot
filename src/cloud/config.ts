/**
 * Configurazione pubblica di Firebase, letta al momento della build dalle variabili VITE_.
 * Non è una chiave privata: la sicurezza sta nelle regole del progetto.
 * Se manca anche un solo valore, l’app non contatta Firebase.
 */
export type FirebasePublicConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

type EnvLike = {
  VITE_FIREBASE_API_KEY?: string
  VITE_FIREBASE_AUTH_DOMAIN?: string
  VITE_FIREBASE_PROJECT_ID?: string
  VITE_FIREBASE_STORAGE_BUCKET?: string
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  VITE_FIREBASE_APP_ID?: string
}

function filled(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function readCloudConfig(env: EnvLike = import.meta.env): FirebasePublicConfig | null {
  const apiKey = filled(env.VITE_FIREBASE_API_KEY)
  const authDomain = filled(env.VITE_FIREBASE_AUTH_DOMAIN)
  const projectId = filled(env.VITE_FIREBASE_PROJECT_ID)
  const storageBucket = filled(env.VITE_FIREBASE_STORAGE_BUCKET)
  const messagingSenderId = filled(env.VITE_FIREBASE_MESSAGING_SENDER_ID)
  const appId = filled(env.VITE_FIREBASE_APP_ID)
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) return null
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }
}

export function isCloudConfigured(env?: EnvLike): boolean {
  return readCloudConfig(env) !== null
}
