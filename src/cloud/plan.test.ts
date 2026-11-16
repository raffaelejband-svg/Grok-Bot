import { describe, expect, it } from 'vitest'
import { planSync } from './plan.ts'

const empty = {
  localGarments: [],
  localOutfits: [],
  cloudGarments: [],
  cloudOutfits: [],
  decision: null,
  privateGarmentIds: [],
  privateOutfitIds: [],
  sharedGarmentIds: [],
  sharedOutfitIds: [],
  skippedGarmentIds: [],
} as const

describe('piano di sincronizzazione', () => {
  it('chiede il permesso e non carica se il cloud è vuoto', () => {
    const plan = planSync({
      ...empty,
      localGarments: [{ id: 'capo-1', updatedAt: '2026-11-01T00:00:00.000Z' }],
    })
    expect(plan.askGarmentIds).toEqual(['capo-1'])
    expect(plan.uploadGarmentIds).toEqual([])
    expect(plan.downloadGarmentIds).toEqual([])
  })

  it('dopo il sì carica i capi solo locali', () => {
    const plan = planSync({
      ...empty,
      decision: 'accepted',
      localGarments: [{ id: 'capo-1', updatedAt: '2026-11-01T00:00:00.000Z' }],
    })
    expect(plan.askGarmentIds).toEqual([])
    expect(plan.uploadGarmentIds).toEqual(['capo-1'])
  })

  it('dopo il no non ricarica i capi già rifiutati, ma carica i nuovi', () => {
    const plan = planSync({
      ...empty,
      decision: 'declined',
      privateGarmentIds: ['vecchio'],
      localGarments: [
        { id: 'vecchio', updatedAt: '2026-11-01T00:00:00.000Z' },
        { id: 'nuovo', updatedAt: '2026-11-02T00:00:00.000Z' },
      ],
    })
    expect(plan.askGarmentIds).toEqual([])
    expect(plan.uploadGarmentIds).toEqual(['nuovo'])
  })

  it('scarica ciò che c’è solo sull’account e toglie in locale ciò che altrove è stato eliminato', () => {
    const plan = planSync({
      ...empty,
      decision: 'accepted',
      localGarments: [{ id: 'tolto', updatedAt: '2026-11-01T00:00:00.000Z' }],
      cloudGarments: [{ id: 'remoto', updatedAt: '2026-11-02T00:00:00.000Z' }],
      sharedGarmentIds: ['tolto'],
    })
    expect(plan.downloadGarmentIds).toEqual(['remoto'])
    expect(plan.deleteLocalGarmentIds).toEqual(['tolto'])
    expect(plan.uploadGarmentIds).toEqual([])
  })
})
