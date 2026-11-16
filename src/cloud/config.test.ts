import { describe, expect, it } from 'vitest'
import { readCloudConfig } from './config.ts'

const full = {
  VITE_FIREBASE_API_KEY: 'public-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

describe('configurazione pubblica', () => {
  it('manca del tutto', () => {
    expect(readCloudConfig({})).toBeNull()
  })

  it('manca un valore', () => {
    expect(readCloudConfig({ ...full, VITE_FIREBASE_APP_ID: '  ' })).toBeNull()
  })

  it('accetta i sei valori e toglie gli spazi', () => {
    expect(readCloudConfig({ ...full, VITE_FIREBASE_API_KEY: '  public-key  ' })).toEqual({
      apiKey: 'public-key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    })
  })
})
