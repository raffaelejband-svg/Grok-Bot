import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useCloud } from '../cloud/context.ts'
import {
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  type Gender,
  type Profile,
} from '../domain/types.ts'
import {
  addProfile,
  deleteProfile,
  getActiveProfile,
  listAllGarments,
  listAllOutfits,
  listProfiles,
  setActiveProfile,
  updateProfile,
} from '../storage/db.ts'

export type ProfileSnapshot = {
  profiles: Profile[]
  active: Profile
  counts: Record<string, { garments: number; outfits: number }>
}

const fallbackProfile: Profile = {
  id: DEFAULT_PROFILE_ID,
  name: DEFAULT_PROFILE_NAME,
  gender: 'uomo',
  createdAt: '2026-01-01T00:00:00.000Z',
}

type ProfileActions = {
  ready: boolean
  error: string | null
  switchTo: (id: string) => Promise<boolean>
  add: (name: string, gender: Gender) => Promise<boolean>
  rename: (profile: Profile) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
}

const ProfileContext = createContext<ProfileSnapshot & ProfileActions>({
  profiles: [fallbackProfile],
  active: fallbackProfile,
  counts: {},
  ready: true,
  error: null,
  switchTo: async () => false,
  add: async () => false,
  rename: async () => false,
  remove: async () => false,
})

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { revision, starting } = useCloud()
  const [snapshot, setSnapshot] = useState<ProfileSnapshot>({
    profiles: [fallbackProfile],
    active: fallbackProfile,
    counts: {},
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(async () => {
    const [profiles, active, garments, outfits] = await Promise.all([
      listProfiles(),
      getActiveProfile(),
      listAllGarments(),
      listAllOutfits(),
    ])
    const counts: ProfileSnapshot['counts'] = {}
    for (const profile of profiles) counts[profile.id] = { garments: 0, outfits: 0 }
    for (const garment of garments) {
      const id = garment.profileId ?? DEFAULT_PROFILE_ID
      const bucket = counts[id] ?? { garments: 0, outfits: 0 }
      bucket.garments += 1
      counts[id] = bucket
    }
    for (const outfit of outfits) {
      const id = outfit.profileId ?? DEFAULT_PROFILE_ID
      const bucket = counts[id] ?? { garments: 0, outfits: 0 }
      bucket.outfits += 1
      counts[id] = bucket
    }
    setSnapshot({ profiles, active, counts })
    setReady(true)
  }, [])

  useEffect(() => {
    if (starting) return
    let alive = true
    void reload()
      .catch(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [reload, revision, starting, tick])

  async function run(work: () => Promise<void>, fallback: string): Promise<boolean> {
    setError(null)
    try {
      await work()
      setTick((value) => value + 1)
      return true
    } catch (caught) {
      setError(message(caught, fallback))
      return false
    }
  }

  const value: ProfileSnapshot & ProfileActions = {
    ...snapshot,
    ready,
    error,
    switchTo: (id) => run(() => setActiveProfile(id), 'Non sono riuscito a cambiare profilo.'),
    add: (name, gender) =>
      run(async () => {
        const created = await addProfile({ name, gender })
        await setActiveProfile(created.id)
      }, 'Non sono riuscito ad aggiungere il profilo.'),
    rename: (profile) => run(async () => { await updateProfile(profile) }, 'Non sono riuscito a salvare il profilo.'),
    remove: (id) => run(() => deleteProfile(id), 'Non sono riuscito a eliminare il profilo.'),
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfiles(): ProfileSnapshot & ProfileActions {
  return useContext(ProfileContext)
}
