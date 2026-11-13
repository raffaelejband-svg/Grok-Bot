import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'

vi.mock('./storage/db.ts', () => ({
  listGarments: vi.fn(async () => []),
  addGarment: vi.fn(),
  updateGarment: vi.fn(),
  deleteGarment: vi.fn(),
}))

describe('guscio dell’app', () => {
  it('mostra Guardaroba, Outfit e Preferiti', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Armadio Outfit')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Guardaroba' })).toBeInTheDocument()
    expect(await screen.findByText('Il guardaroba è ancora vuoto')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Outfit' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Outfit' })).toBeInTheDocument()
    expect(await screen.findByText('Nessun outfit')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Preferiti' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Preferiti' })).toBeInTheDocument()
    expect(await screen.findByText('Nessun preferito')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Guardaroba' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Guardaroba' })).toBeInTheDocument()
  })
})
