import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GEMINI_KEY_STORAGE } from '../vision/apiKey.ts'
import { ImpostazioniPage } from './ImpostazioniPage.tsx'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('impostazioni', () => {
  it('salva la chiave solo nel browser e non la lascia in vista', () => {
    render(<ImpostazioniPage />)
    expect(screen.getByText('Nessuna chiave. Le foto restano sul telefono.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Google AI Studio' })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey',
    )

    fireEvent.change(screen.getByLabelText('Chiave Gemini'), { target: { value: 'chiave-di-prova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva la chiave' }))

    expect(localStorage.getItem(GEMINI_KEY_STORAGE)).toBe('chiave-di-prova')
    expect(screen.getByLabelText('Chiave Gemini')).toHaveValue('')
    expect(screen.getByText('Chiave salvata su questo telefono.')).toBeInTheDocument()
    expect(screen.queryByText('chiave-di-prova')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancella la chiave' }))
    expect(localStorage.getItem(GEMINI_KEY_STORAGE)).toBeNull()
    expect(screen.getByText('Chiave tolta. Le foto restano sul telefono.')).toBeInTheDocument()
  })
})
