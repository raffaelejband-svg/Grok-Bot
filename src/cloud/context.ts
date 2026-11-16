import { createContext, useContext } from 'react'
import type { SyncWarning } from './engine.ts'

export type CloudUser = { uid: string; email: string | null }

export type CloudValue = {
  configured: boolean
  starting: boolean
  user: CloudUser | null
  linked: boolean
  blocked: boolean
  revision: number
  offer: { garments: number; outfits: number } | null
  manualUpload: boolean
  progress: string | null
  warning: SyncWarning | null
  error: string | null
  busy: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  acceptOffer: () => Promise<void>
  declineOffer: () => Promise<void>
  refresh: () => Promise<void>
}

const noop = async (): Promise<void> => {}

export const defaultCloudValue: CloudValue = {
  configured: false,
  starting: false,
  user: null,
  linked: false,
  blocked: false,
  revision: 0,
  offer: null,
  manualUpload: false,
  progress: null,
  warning: null,
  error: null,
  busy: false,
  signIn: noop,
  signUp: noop,
  signInGoogle: noop,
  signOut: noop,
  acceptOffer: noop,
  declineOffer: noop,
  refresh: noop,
}

export function cloudState(partial: Partial<CloudValue> = {}): CloudValue {
  return { ...defaultCloudValue, ...partial }
}

export const CloudContext = createContext<CloudValue>(defaultCloudValue)

export function useCloud(): CloudValue {
  return useContext(CloudContext)
}
