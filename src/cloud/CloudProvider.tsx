import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { setLocalChangeListener } from '../storage/syncBridge.ts'
import { createAccount, signInWithEmail, signInWithGoogle, signOutAccount, watchAuth, type AuthUser } from './auth.ts'
import { authErrorMessage } from './authErrors.ts'
import type { CloudBackend } from './backend.ts'
import { readCloudConfig } from './config.ts'
import { CloudContext, type CloudUser, type CloudValue } from './context.ts'
import {
  acceptDeviceUpload,
  declineDeviceUpload,
  pushLocalChange,
  reconcile,
  setActiveSync,
  type SyncSnapshot,
  type SyncWarning,
} from './engine.ts'
import { createFirebaseBackend } from './firebaseBackend.ts'

export function CloudProvider({ children }: { children: ReactNode }) {
  const configured = readCloudConfig() !== null
  const [starting, setStarting] = useState(configured)
  const [user, setUser] = useState<CloudUser | null>(null)
  const [linked, setLinked] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [revision, setRevision] = useState(0)
  const [offer, setOffer] = useState<CloudValue['offer']>(null)
  const [manualUpload, setManualUpload] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [warning, setWarning] = useState<SyncWarning | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const userRef = useRef<CloudUser | null>(null)

  function apply(snapshot: SyncSnapshot) {
    setBlocked(snapshot.blocked)
    setLinked(userRef.current !== null && !snapshot.blocked)
    setOffer(snapshot.offer)
    setManualUpload(snapshot.manualUpload)
    setWarning(snapshot.warning)
    setRevision((value) => value + 1)
  }

  useEffect(() => {
    if (!configured) return
    const alive = { current: true }
    let unsub = () => {}
    setLocalChangeListener((change) => pushLocalChange(change, localStorage))
    void (async () => {
      try {
        const backend = await createFirebaseBackend()
        if (!alive.current) return
        unsub = await watchAuth({
          onUser: (next) => {
            if (!alive.current) return
            void receive(next, backend)
          },
          onError: (message) => {
            if (alive.current) setError(message)
          },
        })
      } catch (caught) {
        if (!alive.current) return
        setStarting(false)
        setError(authErrorMessage(caught))
      }
    })()

    async function receive(next: AuthUser | null, backend: CloudBackend) {
      userRef.current = next
      setUser(next)
      if (!next) {
        setActiveSync(null)
        setLinked(false)
        setBlocked(false)
        setOffer(null)
        setManualUpload(false)
        setStarting(false)
        return
      }
      setActiveSync({ uid: next.uid, backend })
      setStarting(true)
      try {
        const snapshot = await reconcile(localStorage, { onProgress: setProgress })
        if (!alive.current) return
        apply(snapshot)
      } catch {
        if (alive.current) setWarning('incomplete')
      } finally {
        if (!alive.current) return
        setProgress(null)
        setStarting(false)
      }
    }

    return () => {
      alive.current = false
      unsub()
      setLocalChangeListener(null)
      setActiveSync(null)
    }
  }, [configured])

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(authErrorMessage(caught))
      throw caught
    } finally {
      setBusy(false)
    }
  }

  async function afterSync(action: () => Promise<SyncSnapshot>): Promise<void> {
    if (!userRef.current) return
    setBusy(true)
    setError(null)
    try {
      const snapshot = await action()
      apply(snapshot)
    } catch {
      setWarning('incomplete')
    } finally {
      setProgress(null)
      setBusy(false)
    }
  }

  const value: CloudValue = {
    configured,
    starting,
    user,
    linked,
    blocked,
    revision,
    offer,
    manualUpload,
    progress,
    warning,
    error,
    busy,
    signIn: (email, password) => run(() => signInWithEmail(email, password)),
    signUp: (email, password) => run(() => createAccount(email, password)),
    signInGoogle: () => run(() => signInWithGoogle()),
    signOut: () => run(() => signOutAccount()),
    acceptOffer: () => afterSync(() => acceptDeviceUpload(localStorage, { onProgress: setProgress })),
    declineOffer: () => afterSync(() => declineDeviceUpload(localStorage)),
    refresh: () => afterSync(() => reconcile(localStorage, { onProgress: setProgress })),
  }

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}
