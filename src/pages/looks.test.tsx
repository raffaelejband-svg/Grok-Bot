import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Garment, Outfit } from '../domain/types.ts'
import { deleteOutfit, listGarments, listOutfits, saveOutfit } from '../storage/db.ts'
import { OutfitPage } from './OutfitPage.tsx'
import { PreferitiPage } from './PreferitiPage.tsx'

vi.mock('../storage/db.ts', () => ({
  listGarments: vi.fn(),
  listOutfits: vi.fn(),
  saveOutfit: vi.fn(),
  deleteOutfit: vi.fn(),
}))

function garment(overrides: Partial<Garment> & Pick<Garment, 'id' | 'category'>): Garment {
  return {
    photo: new Blob(['foto'], { type: 'image/jpeg' }),
    colour: 'nero',
    season: 'estate',
    occasion: 'lavoro',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

const wardrobe = [
  garment({ id: 'top-nero', category: 'top', colour: 'nero' }),
  garment({ id: 'top-bianco', category: 'top', colour: 'bianco' }),
  garment({ id: 'pants', category: 'pantaloni', colour: 'beige' }),
  garment({ id: 'shoes', category: 'scarpe', colour: 'grigio' }),
]

function renderPage(page: ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(listGarments).mockReset()
  vi.mocked(listOutfits).mockReset()
  vi.mocked(saveOutfit).mockReset()
  vi.mocked(deleteOutfit).mockReset()
  vi.mocked(saveOutfit).mockResolvedValue(undefined)
  vi.mocked(deleteOutfit).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe('pagina Outfit', () => {
  it('spiega cosa manca se il guardaroba non basta', async () => {
    vi.mocked(listGarments).mockResolvedValue([garment({ id: 'solo-top', category: 'top' })])

    renderPage(<OutfitPage />)

    expect(await screen.findByText('Nessun outfit')).toBeInTheDocument()
    expect(screen.getByText(/un paio di pantaloni e un paio di scarpe/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Genera' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai al guardaroba' })).toHaveAttribute('href', '/')
  })

  it('genera, cambia un capo, salva e rigenera', async () => {
    vi.mocked(listGarments).mockResolvedValue(wardrobe)

    renderPage(<OutfitPage />)

    expect(await screen.findByRole('button', { name: 'Genera' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Estate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Genera' }))

    expect(screen.getByRole('heading', { name: 'Il tuo look' })).toBeInTheDocument()
    expect(screen.getByText('I capi vanno bene per questa occasione e questa stagione.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sport' }))
    expect(screen.queryByRole('heading', { name: 'Il tuo look' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lavoro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Genera' }))

    const before = screen.queryByText('Nero') ? 'Nero' : 'Bianco'
    fireEvent.click(screen.getByRole('button', { name: 'Cambia top' }))
    const after = before === 'Nero' ? 'Bianco' : 'Nero'
    expect(screen.getByText(after)).toBeInTheDocument()
    expect(screen.queryByText(before)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Outfit salvato nei preferiti.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvato' })).toBeDisabled()

    const saved = vi.mocked(saveOutfit).mock.calls[0]?.[0] as Outfit
    expect(saved.name).toBe('Lavoro · Estate')
    expect(saved.occasion).toBe('lavoro')
    expect(saved.season).toBe('estate')
    expect(saved.garmentIds).toEqual([before === 'Nero' ? 'top-bianco' : 'top-nero', 'pants', 'shoes'])

    fireEvent.click(screen.getByRole('button', { name: 'Rigenera' }))
    expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled()
  })

  it('dice quando non c’è un altro capo da cambiare', async () => {
    vi.mocked(listGarments).mockResolvedValue([
      garment({ id: 'top', category: 'top' }),
      garment({ id: 'pants', category: 'pantaloni', colour: 'beige' }),
      garment({ id: 'shoes', category: 'scarpe', colour: 'grigio' }),
    ])

    renderPage(<OutfitPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Genera' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambia top' }))

    expect(screen.getByRole('status')).toHaveTextContent('Non ho un altro capo che stia bene in questo outfit.')
    expect(screen.getByText('Nero')).toBeInTheDocument()
  })
})

describe('pagina Preferiti', () => {
  it('apre un outfit salvato e lo elimina', async () => {
    const outfit: Outfit = {
      id: 'look-1',
      name: 'Ufficio',
      garmentIds: ['top-nero', 'manca'],
      occasion: 'lavoro',
      season: 'autunno',
      createdAt: '2026-11-01T10:00:00.000Z',
    }
    vi.mocked(listOutfits).mockResolvedValue([outfit])
    vi.mocked(listGarments).mockResolvedValue([wardrobe[0]!])

    renderPage(<PreferitiPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Ufficio/ }))
    expect(screen.getByRole('heading', { name: 'Ufficio' })).toBeInTheDocument()
    expect(screen.getByText('Nero')).toBeInTheDocument()
    expect(screen.getByText('Questo capo non è più nel guardaroba.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(screen.getByRole('button', { name: /Ufficio/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Ufficio/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))
    expect(vi.mocked(deleteOutfit)).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Conferma eliminazione' }))
    expect(await screen.findByText('Nessun preferito')).toBeInTheDocument()
    expect(vi.mocked(deleteOutfit)).toHaveBeenCalledWith('look-1')
    expect(screen.getByRole('link', { name: 'Crea un outfit' })).toHaveAttribute('href', '/outfit')
  })
})
