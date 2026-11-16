/**
 * Decide cosa scaricare, cosa caricare e quando chiedere il permesso.
 * Non parla con la rete e non legge la chiave Gemini.
 */
import type { Decision } from './deviceState.ts'

export type Stamp = { id: string; updatedAt: string }

export type SyncPlan = {
  askGarmentIds: string[]
  askOutfitIds: string[]
  downloadGarmentIds: string[]
  downloadOutfitIds: string[]
  uploadGarmentIds: string[]
  uploadOutfitIds: string[]
  deleteLocalGarmentIds: string[]
  deleteLocalOutfitIds: string[]
}

type CollectionPlan = {
  ask: string[]
  download: string[]
  upload: string[]
  deleteLocal: string[]
}

function planCollection(input: {
  local: readonly Stamp[]
  cloud: readonly Stamp[]
  decision: Decision | null
  privateIds: readonly string[]
  sharedIds: readonly string[]
  skippedIds: readonly string[]
}): CollectionPlan {
  const local = new Map(input.local.map((item) => [item.id, item.updatedAt]))
  const cloud = new Map(input.cloud.map((item) => [item.id, item.updatedAt]))
  const keptPrivate = new Set(input.privateIds)
  const shared = new Set(input.sharedIds)
  const skipped = new Set(input.skippedIds)
  const ask: string[] = []
  const download: string[] = []
  const upload: string[] = []
  const deleteLocal: string[] = []

  for (const [id, cloudAt] of cloud) {
    const localAt = local.get(id)
    if (localAt === undefined || cloudAt > localAt) download.push(id)
  }

  for (const [id, localAt] of local) {
    const cloudAt = cloud.get(id)
    if (cloudAt === undefined) {
      if (shared.has(id)) deleteLocal.push(id)
      else if (keptPrivate.has(id) || skipped.has(id)) continue
      else if (input.decision === null) ask.push(id)
      else upload.push(id)
      continue
    }
    if (localAt > cloudAt && !keptPrivate.has(id) && !skipped.has(id)) upload.push(id)
  }

  return { ask, download, upload, deleteLocal }
}

export function planSync(input: {
  localGarments: readonly Stamp[]
  localOutfits: readonly Stamp[]
  cloudGarments: readonly Stamp[]
  cloudOutfits: readonly Stamp[]
  decision: Decision | null
  privateGarmentIds: readonly string[]
  privateOutfitIds: readonly string[]
  sharedGarmentIds: readonly string[]
  sharedOutfitIds: readonly string[]
  skippedGarmentIds: readonly string[]
}): SyncPlan {
  const garments = planCollection({
    local: input.localGarments,
    cloud: input.cloudGarments,
    decision: input.decision,
    privateIds: input.privateGarmentIds,
    sharedIds: input.sharedGarmentIds,
    skippedIds: input.skippedGarmentIds,
  })
  const outfits = planCollection({
    local: input.localOutfits,
    cloud: input.cloudOutfits,
    decision: input.decision,
    privateIds: input.privateOutfitIds,
    sharedIds: input.sharedOutfitIds,
    skippedIds: [],
  })
  return {
    askGarmentIds: garments.ask,
    askOutfitIds: outfits.ask,
    downloadGarmentIds: garments.download,
    downloadOutfitIds: outfits.download,
    uploadGarmentIds: garments.upload,
    uploadOutfitIds: outfits.upload,
    deleteLocalGarmentIds: garments.deleteLocal,
    deleteLocalOutfitIds: outfits.deleteLocal,
  }
}

export function planProfileSync(input: {
  local: readonly Stamp[]
  cloud: readonly Stamp[]
  decision: Decision | null
  privateIds: readonly string[]
  sharedIds: readonly string[]
}): { downloadIds: string[]; uploadIds: string[]; deleteLocalIds: string[] } {
  const planned = planCollection({
    local: input.local,
    cloud: input.cloud,
    decision: input.decision,
    privateIds: input.privateIds,
    sharedIds: input.sharedIds,
    skippedIds: [],
  })
  const incoming = planned.download.filter((id) => !input.local.some((item) => item.id === id))
  const survivors = input.local.filter((item) => !planned.deleteLocal.includes(item.id)).length + incoming.length
  return {
    downloadIds: planned.download,
    uploadIds: planned.upload,
    deleteLocalIds: survivors < 1 ? [] : planned.deleteLocal,
  }
}
