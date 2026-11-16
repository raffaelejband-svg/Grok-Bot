/**
 * Allinea il guardaroba sul dispositivo con quello dell’account.
 * Il primo caricamento dei capi già presenti chiede il permesso: non parte da solo.
 */
import type { Garment, Outfit, Profile } from '../domain/types.ts'
import {
  listAllGarments,
  listAllOutfits,
  listProfiles,
  preferProfileWithClothesIfUntouched,
  putGarmentFromCloud,
  putOutfitFromCloud,
  putProfileFromCloud,
  removeProfileFromCloud,
  removeGarmentFromCloud,
  removeOutfitFromCloud,
} from '../storage/db.ts'
import type { LocalChange } from '../storage/syncBridge.ts'
import type { CloudBackend } from './backend.ts'
import {
  readDecision,
  readIds,
  readLastUid,
  writeDecision,
  writeIds,
  writeLastUid,
  type IdBucket,
} from './deviceState.ts'
import { PhotoTooLargeError } from './photoLimit.ts'
import { planProfileSync, planSync, type SyncPlan } from './plan.ts'
import { garmentFromCloud, stampOf, type CloudGarmentRecord } from './records.ts'
import { applyCloudSettings, settingsForCloud, type CloudSettings } from './secrets.ts'
import type { KeyValueStore } from './store.ts'

type Session = { uid: string; backend: CloudBackend }

export type SyncHooks = {
  onProgress?: (message: string | null) => void
}

export type SyncWarning = 'incomplete' | 'too-large' | 'both'

export type SyncSnapshot = {
  blocked: boolean
  offer: { garments: number; outfits: number } | null
  manualUpload: boolean
  warning: SyncWarning | null
}

const idleSnapshot: SyncSnapshot = { blocked: false, offer: null, manualUpload: false, warning: null }

let active: Session | null = null
let tail: Promise<void> = Promise.resolve()

export function setActiveSync(next: Session | null): void {
  active = next
}

export function resetSyncQueueForTests(): void {
  active = null
  tail = Promise.resolve()
}

function lock<T>(work: () => Promise<T>): Promise<T> {
  const run = tail.then(work, work)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function remember(storage: KeyValueStore, uid: string, bucket: IdBucket, ids: Set<string>): void {
  writeIds(storage, uid, bucket, [...ids])
}

function addWarning(current: SyncWarning | null, next: Exclude<SyncWarning, 'both'>): SyncWarning {
  if (current === null || current === next) return next
  return 'both'
}

async function uploadGarments(
  session: Session,
  storage: KeyValueStore,
  ids: readonly string[],
  hooks: SyncHooks,
  shared: Set<string>,
  skipped: Set<string>,
  warn: (kind: Exclude<SyncWarning, 'both'>) => void,
): Promise<void> {
  if (ids.length === 0) return
  const local = new Map((await listAllGarments()).map((garment) => [garment.id, garment]))
  let index = 0
  for (const id of ids) {
    const garment = local.get(id)
    if (!garment) continue
    index += 1
    hooks.onProgress?.(`Carico il capo ${index} di ${ids.length}…`)
    try {
      await session.backend.saveGarment(session.uid, garment)
      shared.add(id)
      skipped.delete(id)
    } catch (error) {
      if (error instanceof PhotoTooLargeError) {
        skipped.add(id)
        warn('too-large')
      } else {
        warn('incomplete')
      }
    }
  }
  hooks.onProgress?.(null)
  remember(storage, session.uid, 'shared-garments', shared)
  remember(storage, session.uid, 'skipped-photos', skipped)
}

async function uploadOutfits(
  session: Session,
  storage: KeyValueStore,
  ids: readonly string[],
  hooks: SyncHooks,
  shared: Set<string>,
  warn: (kind: Exclude<SyncWarning, 'both'>) => void,
): Promise<void> {
  if (ids.length === 0) return
  const local = new Map((await listAllOutfits()).map((outfit) => [outfit.id, outfit]))
  let index = 0
  for (const id of ids) {
    const outfit = local.get(id)
    if (!outfit) continue
    index += 1
    hooks.onProgress?.(`Carico il preferito ${index} di ${ids.length}…`)
    try {
      await session.backend.saveOutfit(session.uid, outfit)
      shared.add(id)
    } catch {
      warn('incomplete')
    }
  }
  hooks.onProgress?.(null)
  remember(storage, session.uid, 'shared-outfits', shared)
}

async function syncSettings(
  session: Session,
  storage: KeyValueStore,
  warn: (kind: Exclude<SyncWarning, 'both'>) => void,
): Promise<void> {
  const local = settingsForCloud(storage)
  let cloud: CloudSettings | null
  try {
    cloud = await session.backend.getSettings(session.uid)
  } catch {
    warn('incomplete')
    return
  }
  try {
    if (local && (!cloud || local.updatedAt > cloud.updatedAt)) {
      await session.backend.saveSettings(session.uid, local)
    } else if (cloud && (!local || cloud.updatedAt > local.updatedAt)) {
      applyCloudSettings(storage, cloud)
    }
  } catch {
    warn('incomplete')
  }
}

async function retryDeletes(session: Session, storage: KeyValueStore, warn: (kind: Exclude<SyncWarning, 'both'>) => void): Promise<void> {
  const garmentDeletes = readIds(storage, session.uid, 'pending-garment-deletes')
  const outfitDeletes = readIds(storage, session.uid, 'pending-outfit-deletes')
  const profileDeletes = readIds(storage, session.uid, 'pending-profile-deletes')
  const garmentsLeft: string[] = []
  const outfitsLeft: string[] = []
  const profilesLeft: string[] = []
  for (const id of garmentDeletes) {
    try {
      await session.backend.deleteGarment(session.uid, id)
    } catch {
      garmentsLeft.push(id)
      warn('incomplete')
    }
  }
  for (const id of outfitDeletes) {
    try {
      await session.backend.deleteOutfit(session.uid, id)
    } catch {
      outfitsLeft.push(id)
      warn('incomplete')
    }
  }
  for (const id of profileDeletes) {
    try {
      await session.backend.deleteProfile(session.uid, id)
    } catch {
      profilesLeft.push(id)
      warn('incomplete')
    }
  }
  writeIds(storage, session.uid, 'pending-garment-deletes', garmentsLeft)
  writeIds(storage, session.uid, 'pending-outfit-deletes', outfitsLeft)
  writeIds(storage, session.uid, 'pending-profile-deletes', profilesLeft)
}

async function syncProfiles(
  session: Session,
  storage: KeyValueStore,
  decision: ReturnType<typeof readDecision>,
  cloudProfiles: readonly Profile[],
  warn: (kind: Exclude<SyncWarning, 'both'>) => void,
): Promise<void> {
  const localProfiles = await listProfiles()
  const shared = new Set(readIds(storage, session.uid, 'shared-profiles'))
  const pending = new Set(readIds(storage, session.uid, 'pending-profile-deletes'))
  const visibleCloud = cloudProfiles.filter((profile) => !pending.has(profile.id))
  const plan = planProfileSync({
    local: localProfiles.map((profile) => stampOf(profile)),
    cloud: visibleCloud.map((profile) => stampOf(profile)),
    decision,
    privateIds: readIds(storage, session.uid, 'private-profiles'),
    sharedIds: [...shared],
  })
  for (const id of plan.deleteLocalIds) {
    const removed = await removeProfileFromCloud(id)
    if (removed) shared.delete(id)
  }
  for (const id of plan.downloadIds) {
    const profile = visibleCloud.find((item) => item.id === id)
    if (!profile) continue
    try {
      await putProfileFromCloud(profile)
      shared.add(id)
    } catch {
      warn('incomplete')
    }
  }
  const localAfter = new Map((await listProfiles()).map((profile) => [profile.id, profile]))
  for (const id of plan.uploadIds) {
    const profile = localAfter.get(id)
    if (!profile) continue
    try {
      await session.backend.saveProfile(session.uid, profile)
      shared.add(id)
    } catch {
      warn('incomplete')
    }
  }
  remember(storage, session.uid, 'shared-profiles', shared)
}

async function reconcileLocked(storage: KeyValueStore, hooks: SyncHooks): Promise<SyncSnapshot> {
  const session = active
  if (!session) return idleSnapshot
  const last = readLastUid(storage)
  if (last && last !== session.uid) {
    return { blocked: true, offer: null, manualUpload: false, warning: null }
  }
  writeLastUid(storage, session.uid)

  let warning: SyncWarning | null = null
  const warn = (kind: Exclude<SyncWarning, 'both'>) => {
    warning = addWarning(warning, kind)
  }

  await retryDeletes(session, storage, warn)

  let cloudProfiles: Profile[]
  let cloudGarments: CloudGarmentRecord[]
  let cloudOutfits: Outfit[]
  try {
    cloudProfiles = await session.backend.listProfiles(session.uid)
    cloudGarments = await session.backend.listGarments(session.uid)
    cloudOutfits = await session.backend.listOutfits(session.uid)
  } catch {
    return { blocked: false, offer: null, manualUpload: false, warning: 'incomplete' }
  }
  const pendingGarmentDeletes = new Set(readIds(storage, session.uid, 'pending-garment-deletes'))
  const pendingOutfitDeletes = new Set(readIds(storage, session.uid, 'pending-outfit-deletes'))
  cloudGarments = cloudGarments.filter((garment) => !pendingGarmentDeletes.has(garment.id))
  cloudOutfits = cloudOutfits.filter((outfit) => !pendingOutfitDeletes.has(outfit.id))

  const localGarments = await listAllGarments()
  const localOutfits = await listAllOutfits()
  const sharedGarments = new Set(readIds(storage, session.uid, 'shared-garments'))
  const sharedOutfits = new Set(readIds(storage, session.uid, 'shared-outfits'))
  const localGarmentIds = new Set(localGarments.map((garment) => garment.id))
  const localOutfitIds = new Set(localOutfits.map((outfit) => outfit.id))
  const cloudGarmentIds = new Set(cloudGarments.map((garment) => garment.id))
  const cloudOutfitIds = new Set(cloudOutfits.map((outfit) => outfit.id))
  for (const id of sharedGarments) {
    if (!localGarmentIds.has(id) && !cloudGarmentIds.has(id)) sharedGarments.delete(id)
  }
  for (const id of sharedOutfits) {
    if (!localOutfitIds.has(id) && !cloudOutfitIds.has(id)) sharedOutfits.delete(id)
  }
  for (const id of localGarmentIds) if (cloudGarmentIds.has(id)) sharedGarments.add(id)
  for (const id of localOutfitIds) if (cloudOutfitIds.has(id)) sharedOutfits.add(id)

  let decision = readDecision(storage, session.uid)
  const privateGarments = readIds(storage, session.uid, 'private-garments')
  const privateOutfits = readIds(storage, session.uid, 'private-outfits')
  const skipped = new Set(readIds(storage, session.uid, 'skipped-photos'))
  const input = {
    localGarments: localGarments.map(stampOf),
    localOutfits: localOutfits.map(stampOf),
    cloudGarments: cloudGarments.map(stampOf),
    cloudOutfits: cloudOutfits.map(stampOf),
    privateGarmentIds: privateGarments,
    privateOutfitIds: privateOutfits,
    sharedGarmentIds: [...sharedGarments],
    sharedOutfitIds: [...sharedOutfits],
    skippedGarmentIds: [...skipped],
  }
  let plan: SyncPlan = planSync({ ...input, decision })
  if (decision === null && plan.askGarmentIds.length === 0 && plan.askOutfitIds.length === 0) {
    decision = 'accepted'
    writeDecision(storage, session.uid, 'accepted')
    plan = planSync({ ...input, decision })
  }

  await syncProfiles(session, storage, decision, cloudProfiles, warn)

  for (const id of plan.deleteLocalGarmentIds) {
    await removeGarmentFromCloud(id)
    sharedGarments.delete(id)
    localGarmentIds.delete(id)
  }
  for (const id of plan.deleteLocalOutfitIds) {
    await removeOutfitFromCloud(id)
    sharedOutfits.delete(id)
    localOutfitIds.delete(id)
  }

  let photoIndex = 0
  for (const id of plan.downloadGarmentIds) {
    const record = cloudGarments.find((garment) => garment.id === id)
    if (!record) continue
    photoIndex += 1
    hooks.onProgress?.(`Scarico il capo ${photoIndex} di ${plan.downloadGarmentIds.length}…`)
    try {
      const photo = await session.backend.getGarmentPhoto(session.uid, record.profileId, id)
      await putGarmentFromCloud(garmentFromCloud(record, photo))
      sharedGarments.add(id)
    } catch {
      warn('incomplete')
    }
  }
  hooks.onProgress?.(null)
  for (const id of plan.downloadOutfitIds) {
    const outfit = cloudOutfits.find((item) => item.id === id)
    if (!outfit) continue
    try {
      await putOutfitFromCloud(outfit)
      sharedOutfits.add(id)
    } catch {
      warn('incomplete')
    }
  }

  const offer = decision === null && (plan.askGarmentIds.length > 0 || plan.askOutfitIds.length > 0)
    ? { garments: plan.askGarmentIds.length, outfits: plan.askOutfitIds.length }
    : null

  await uploadGarments(session, storage, plan.uploadGarmentIds, hooks, sharedGarments, skipped, warn)
  await uploadOutfits(session, storage, plan.uploadOutfitIds, hooks, sharedOutfits, warn)
  remember(storage, session.uid, 'shared-garments', sharedGarments)
  remember(storage, session.uid, 'shared-outfits', sharedOutfits)
  await syncSettings(session, storage, warn)
  await preferProfileWithClothesIfUntouched()

  const manualUpload = decision === 'declined'
    && (privateGarments.some((id) => localGarmentIds.has(id)) || privateOutfits.some((id) => localOutfitIds.has(id)))

  return { blocked: false, offer, manualUpload, warning }
}

export function reconcile(storage: KeyValueStore, hooks: SyncHooks = {}): Promise<SyncSnapshot> {
  return lock(() => reconcileLocked(storage, hooks))
}

export function acceptDeviceUpload(storage: KeyValueStore, hooks: SyncHooks = {}): Promise<SyncSnapshot> {
  return lock(async () => {
    if (!active) return idleSnapshot
    writeDecision(storage, active.uid, 'accepted')
    writeIds(storage, active.uid, 'private-garments', [])
    writeIds(storage, active.uid, 'private-outfits', [])
    writeIds(storage, active.uid, 'private-profiles', [])
    return reconcileLocked(storage, hooks)
  })
}

export function declineDeviceUpload(storage: KeyValueStore, hooks: SyncHooks = {}): Promise<SyncSnapshot> {
  return lock(async () => {
    if (!active) return idleSnapshot
    let cloudGarmentIds = new Set<string>()
    let cloudOutfitIds = new Set<string>()
    let cloudProfileIds = new Set<string>()
    try {
      cloudProfileIds = new Set((await active.backend.listProfiles(active.uid)).map((profile) => profile.id))
      cloudGarmentIds = new Set((await active.backend.listGarments(active.uid)).map((garment) => garment.id))
      cloudOutfitIds = new Set((await active.backend.listOutfits(active.uid)).map((outfit) => outfit.id))
    } catch {
      return { blocked: false, offer: null, manualUpload: false, warning: 'incomplete' }
    }
    const localGarments = await listAllGarments()
    const localOutfits = await listAllOutfits()
    const localProfiles = await listProfiles()
    writeDecision(storage, active.uid, 'declined')
    writeIds(
      storage,
      active.uid,
      'private-garments',
      localGarments.filter((garment) => !cloudGarmentIds.has(garment.id)).map((garment) => garment.id),
    )
    writeIds(
      storage,
      active.uid,
      'private-outfits',
      localOutfits.filter((outfit) => !cloudOutfitIds.has(outfit.id)).map((outfit) => outfit.id),
    )
    writeIds(
      storage,
      active.uid,
      'private-profiles',
      localProfiles.filter((profile) => !cloudProfileIds.has(profile.id)).map((profile) => profile.id),
    )
    return reconcileLocked(storage, hooks)
  })
}

export function pushLocalChange(change: LocalChange, storage: KeyValueStore): Promise<void> {
  return lock(() => pushLocked(change, storage))
}

async function pushLocked(change: LocalChange, storage: KeyValueStore): Promise<void> {
  const session = active
  if (!session) return
  const decision = readDecision(storage, session.uid)
  if (change.kind === 'garment-put') {
    await pushGarment(session, storage, change.garment, decision)
    return
  }
  if (change.kind === 'garment-delete') {
    await pushGarmentDelete(session, storage, change.id, change.profileId, decision)
    return
  }
  if (change.kind === 'outfit-put') {
    await pushOutfit(session, storage, change.outfit, decision)
    return
  }
  if (change.kind === 'outfit-delete') {
    await pushOutfitDelete(session, storage, change.id, change.profileId, decision)
    return
  }
  if (change.kind === 'profile-put') {
    await pushProfile(session, storage, change.profile, decision)
    return
  }
  await pushProfileDelete(session, storage, change.id, decision)
}

async function pushGarment(session: Session, storage: KeyValueStore, garment: Garment, decision: ReturnType<typeof readDecision>): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-garments'))
  if (privateIds.has(garment.id)) return
  const shared = new Set(readIds(storage, session.uid, 'shared-garments'))
  if (decision === null && !shared.has(garment.id)) return
  try {
    await session.backend.saveGarment(session.uid, garment)
    shared.add(garment.id)
    remember(storage, session.uid, 'shared-garments', shared)
    const skipped = new Set(readIds(storage, session.uid, 'skipped-photos'))
    if (skipped.delete(garment.id)) remember(storage, session.uid, 'skipped-photos', skipped)
  } catch (error) {
    if (error instanceof PhotoTooLargeError) {
      const skipped = new Set(readIds(storage, session.uid, 'skipped-photos'))
      skipped.add(garment.id)
      remember(storage, session.uid, 'skipped-photos', skipped)
    }
  }
}

async function pushGarmentDelete(
  session: Session,
  storage: KeyValueStore,
  id: string,
  profileId: string | undefined,
  decision: ReturnType<typeof readDecision>,
): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-garments'))
  privateIds.delete(id)
  remember(storage, session.uid, 'private-garments', privateIds)
  const shared = new Set(readIds(storage, session.uid, 'shared-garments'))
  if (decision === null && !shared.has(id)) {
    shared.delete(id)
    remember(storage, session.uid, 'shared-garments', shared)
    return
  }
  try {
    await session.backend.deleteGarment(session.uid, id, profileId)
    shared.delete(id)
    remember(storage, session.uid, 'shared-garments', shared)
  } catch {
    const pending = new Set(readIds(storage, session.uid, 'pending-garment-deletes'))
    pending.add(id)
    remember(storage, session.uid, 'pending-garment-deletes', pending)
  }
}

async function pushOutfit(session: Session, storage: KeyValueStore, outfit: Outfit, decision: ReturnType<typeof readDecision>): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-outfits'))
  if (privateIds.has(outfit.id)) return
  const shared = new Set(readIds(storage, session.uid, 'shared-outfits'))
  if (decision === null && !shared.has(outfit.id)) return
  try {
    await session.backend.saveOutfit(session.uid, outfit)
    shared.add(outfit.id)
    remember(storage, session.uid, 'shared-outfits', shared)
  } catch {
    // Il prossimo aggiornamento riprova i preferiti ancora solo sul dispositivo.
  }
}

async function pushOutfitDelete(
  session: Session,
  storage: KeyValueStore,
  id: string,
  profileId: string | undefined,
  decision: ReturnType<typeof readDecision>,
): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-outfits'))
  privateIds.delete(id)
  remember(storage, session.uid, 'private-outfits', privateIds)
  const shared = new Set(readIds(storage, session.uid, 'shared-outfits'))
  if (decision === null && !shared.has(id)) {
    shared.delete(id)
    remember(storage, session.uid, 'shared-outfits', shared)
    return
  }
  try {
    await session.backend.deleteOutfit(session.uid, id, profileId)
    shared.delete(id)
    remember(storage, session.uid, 'shared-outfits', shared)
  } catch {
    const pending = new Set(readIds(storage, session.uid, 'pending-outfit-deletes'))
    pending.add(id)
    remember(storage, session.uid, 'pending-outfit-deletes', pending)
  }
}

async function pushProfile(session: Session, storage: KeyValueStore, profile: Profile, decision: ReturnType<typeof readDecision>): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-profiles'))
  if (privateIds.has(profile.id)) return
  const shared = new Set(readIds(storage, session.uid, 'shared-profiles'))
  if (decision === null && !shared.has(profile.id)) return
  try {
    await session.backend.saveProfile(session.uid, profile)
    shared.add(profile.id)
    remember(storage, session.uid, 'shared-profiles', shared)
  } catch {
    // Il prossimo aggiornamento riprova.
  }
}

async function pushProfileDelete(session: Session, storage: KeyValueStore, id: string, decision: ReturnType<typeof readDecision>): Promise<void> {
  const privateIds = new Set(readIds(storage, session.uid, 'private-profiles'))
  privateIds.delete(id)
  remember(storage, session.uid, 'private-profiles', privateIds)
  const shared = new Set(readIds(storage, session.uid, 'shared-profiles'))
  if (decision === null && !shared.has(id)) {
    shared.delete(id)
    remember(storage, session.uid, 'shared-profiles', shared)
    return
  }
  try {
    await session.backend.deleteProfile(session.uid, id)
    shared.delete(id)
    remember(storage, session.uid, 'shared-profiles', shared)
  } catch {
    const pending = new Set(readIds(storage, session.uid, 'pending-profile-deletes'))
    pending.add(id)
    remember(storage, session.uid, 'pending-profile-deletes', pending)
  }
}
