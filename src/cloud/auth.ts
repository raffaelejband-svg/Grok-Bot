/**
 * Accesso con email e password, e con Google.
 * La finestra di Google, se il browser la blocca, diventa un ritorno alla pagina.
 */
import { authErrorMessage } from './authErrors.ts'
import { getFirebaseApp } from './firebaseApp.ts'

export type AuthUser = { uid: string; email: string | null }

type AuthHandlers = {
  onUser: (user: AuthUser | null) => void
  onError?: (message: string) => void
}

async function auth() {
  const app = await getFirebaseApp()
  const { getAuth, setPersistence, browserLocalPersistence } = await import('firebase/auth')
  const instance = getAuth(app)
  instance.languageCode = 'it'
  await setPersistence(instance, browserLocalPersistence)
  return instance
}

export async function watchAuth(handlers: AuthHandlers): Promise<() => void> {
  const instance = await auth()
  const { getRedirectResult, onAuthStateChanged } = await import('firebase/auth')
  try {
    await getRedirectResult(instance)
  } catch (error) {
    handlers.onError?.(authErrorMessage(error))
  }
  return onAuthStateChanged(instance, (user) => {
    handlers.onUser(user ? { uid: user.uid, email: user.email } : null)
  })
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { signInWithEmailAndPassword } = await import('firebase/auth')
  await signInWithEmailAndPassword(await auth(), email.trim(), password)
}

export async function createAccount(email: string, password: string): Promise<void> {
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  await createUserWithEmailAndPassword(await auth(), email.trim(), password)
}

export async function signInWithGoogle(): Promise<void> {
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth')
  const instance = await auth()
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(instance, provider)
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(instance, provider)
      return
    }
    throw error
  }
}

export async function signOutAccount(): Promise<void> {
  const { signOut } = await import('firebase/auth')
  await signOut(await auth())
}
