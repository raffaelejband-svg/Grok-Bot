import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CloudContext, cloudState } from '../cloud/context.ts'
import { AccountPage } from './AccountPage.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('account', () => {
  it('senza configurazione dice che la sincronizzazione è da attivare e non chiama la rete', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rete'))
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Sincronizzazione da attivare' })).toBeInTheDocument()
    expect(screen.getByText(/i vestiti restano su questo dispositivo/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accedi' })).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('mostra Accedi, Crea un account e Google, e li chiama solo al tocco', () => {
    const signIn = vi.fn(async () => {})
    const signUp = vi.fn(async () => {})
    const signInGoogle = vi.fn(async () => {})
    render(
      <CloudContext.Provider value={cloudState({ configured: true, signIn, signUp, signInGoogle })}>
        <AccountPage />
      </CloudContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(screen.getByText('Scrivi email e password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'raffaele@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea un account' }))
    expect(screen.getByText('La password deve avere almeno 6 caratteri.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'segreta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(signIn).toHaveBeenCalledWith('raffaele@example.com', 'segreta')
    fireEvent.click(screen.getByRole('button', { name: 'Crea un account' }))
    expect(signUp).toHaveBeenCalledWith('raffaele@example.com', 'segreta')
    fireEvent.click(screen.getByRole('button', { name: 'Continua con Google' }))
    expect(signInGoogle).toHaveBeenCalledOnce()
  })

  it('da dentro mostra Esci e carica il guardaroba solo se lo chiedi', () => {
    const acceptOffer = vi.fn(async () => {})
    const signOut = vi.fn(async () => {})
    const { rerender } = render(
      <CloudContext.Provider
        value={cloudState({
          configured: true,
          user: { uid: 'io', email: 'raffaele@example.com' },
          linked: true,
          offer: { garments: 2, outfits: 1 },
          acceptOffer,
          signOut,
        })}
      >
        <AccountPage />
      </CloudContext.Provider>,
    )

    expect(screen.getByText('Sei dentro come raffaele@example.com.')).toBeInTheDocument()
    expect(acceptOffer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sì, carica il guardaroba' }))
    expect(acceptOffer).toHaveBeenCalledOnce()

    rerender(
      <CloudContext.Provider
        value={cloudState({
          configured: true,
          user: { uid: 'io', email: 'raffaele@example.com' },
          linked: true,
          signOut,
        })}
      >
        <AccountPage />
      </CloudContext.Provider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
