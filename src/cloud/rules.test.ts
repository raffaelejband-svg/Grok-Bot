import firestore from '../../firestore.rules?raw'
import storage from '../../storage.rules?raw'
import { describe, expect, it } from 'vitest'

describe('regole Firebase', () => {
  it('lascia leggere e scrivere solo i dati del proprio utente', () => {
    expect(firestore).toContain('profiles/{profileId}')
    expect(firestore).toContain('request.auth.uid == userId')
    expect(storage).toContain('profiles/{profileId}/photos')
    expect(firestore).toContain('geminiApiKey')
    expect(firestore).not.toContain('allow read, write: if true')
    expect(storage).toContain('request.auth.uid == userId')
    expect(storage).toContain('image/')
    expect(storage).not.toContain('allow read, write: if true')
  })
})
