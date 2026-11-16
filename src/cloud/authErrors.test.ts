import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './authErrors.ts'

describe('messaggi di accesso', () => {
  it('traduce gli errori più comuni', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Email o password non corretti.')
    expect(authErrorMessage({ code: 'auth/unauthorized-domain' })).toContain('domini autorizzati')
    expect(authErrorMessage(new Error('Sincronizzazione da attivare.'))).toBe('Sincronizzazione da attivare.')
  })
})
