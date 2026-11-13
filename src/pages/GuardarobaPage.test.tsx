import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Garment } from '../domain/types.ts'
import { addGarment, deleteGarment, listGarments, updateGarment } from '../storage/db.ts'
import { recognizeGarment } from '../vision/recognizeGarment.ts'
import { GuardarobaPage } from './GuardarobaPage.tsx'

vi.mock('../vision/recognizeGarment.ts', () => ({
  recognizeGarment: vi.fn(async () => ({ category: null, colour: null })),
}))

vi.mock('../storage/db.ts', () => ({
  listGarments: vi.fn(),
  addGarment: vi.fn(),
  updateGarment: vi.fn(),
  deleteGarment: vi.fn(),
}))

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'capo-1',
    photo: new Blob(['foto-blu'], { type: 'image/jpeg' }),
    category: 'top',
    colour: 'blu',
    season: 'estate',
    occasion: 'casual',
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function chooseFile(label: string, file: File) {
  const input = screen.getByLabelText(label)
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input)
}

async function openFilters() {
  fireEvent.click(screen.getByRole('button', { name: 'Filtra i capi' }))
  expect(await screen.findByLabelText('Categoria')).toBeInTheDocument()
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listGarments).mockResolvedValue([])
  vi.mocked(addGarment).mockResolvedValue(undefined)
  vi.mocked(updateGarment).mockResolvedValue(undefined)
  vi.mocked(deleteGarment).mockResolvedValue(undefined)
  vi.mocked(recognizeGarment).mockReset()
  vi.mocked(recognizeGarment).mockResolvedValue({ category: null, colour: null })
})

describe('guardaroba', () => {
  it('mostra lo stato vuoto e non i filtri quando non ci sono capi', async () => {
    render(<GuardarobaPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Guardaroba' })).toBeInTheDocument()
    expect(await screen.findByText('Il guardaroba è ancora vuoto')).toBeInTheDocument()
    expect(screen.getByText('Aggiungi una foto: il capo resta solo su questo telefono.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filtra i capi' })).not.toBeInTheDocument()
    expect(listGarments).toHaveBeenCalledOnce()
  })

  it('mostra i capi in una griglia di foto', async () => {
    vi.mocked(listGarments).mockResolvedValue([
      garment(),
      garment({
        id: 'capo-2',
        category: 'scarpe',
        colour: 'nero',
        season: 'inverno',
        occasion: 'sport',
        createdAt: '2026-07-01T10:00:00.000Z',
      }),
    ])
    render(<GuardarobaPage />)

    expect(await screen.findByRole('button', { name: 'Top, Blu, Estate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scarpe, Nero, Inverno' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Capi nel guardaroba' })).toBeInTheDocument()
  })

  it('filtra per categoria, colore, stagione e stile, e poi azzera', async () => {
    vi.mocked(listGarments).mockResolvedValue([
      garment(),
      garment({
        id: 'giacca',
        category: 'giacca',
        colour: 'beige',
        season: 'tutte',
        occasion: 'lavoro',
      }),
      garment({
        id: 'scarpe',
        category: 'scarpe',
        colour: 'nero',
        season: 'inverno',
        occasion: 'sport',
      }),
    ])
    render(<GuardarobaPage />)
    expect(await screen.findByRole('button', { name: 'Top, Blu, Estate' })).toBeInTheDocument()

    await openFilters()
    fireEvent.change(screen.getByLabelText('Stagione'), { target: { value: 'estate' } })

    expect(screen.getByRole('button', { name: 'Top, Blu, Estate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giacca, Beige, Tutte le stagioni' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scarpe, Nero, Inverno' })).not.toBeInTheDocument()
    expect(screen.getByText('2 capi di 3')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'giacca' } })
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: 'beige' } })
    fireEvent.change(screen.getByLabelText('Stile'), { target: { value: 'lavoro' } })

    expect(screen.queryByRole('button', { name: 'Top, Blu, Estate' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giacca, Beige, Tutte le stagioni' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'accessori' } })
    expect(screen.getByText('Nessun capo con questi filtri. Cambia una scelta oppure azzera per rivederli tutti.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Capi nel guardaroba' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Azzera i filtri' }))
    expect(screen.getByRole('button', { name: 'Scarpe, Nero, Inverno' })).toBeInTheDocument()
    expect(screen.getByText('3 capi')).toBeInTheDocument()
  })

  it('non salva un capo se mancano foto o campi', async () => {
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))
    expect(screen.getByLabelText('Stagione')).toHaveValue('tutte')
    expect(screen.getByLabelText('Stile')).toHaveValue('casual')
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))

    expect(screen.getByText('Aggiungi una foto del capo.')).toBeInTheDocument()
    expect(screen.getByText('Scegli una categoria.')).toBeInTheDocument()
    expect(screen.getByText('Scegli un colore.')).toBeInTheDocument()
    expect(screen.queryByText('Scegli una stagione.')).not.toBeInTheDocument()
    expect(screen.queryByText('Scegli uno stile.')).not.toBeInTheDocument()
    expect(addGarment).not.toHaveBeenCalled()

    chooseFile('Scegli dalla galleria', new File(['note'], 'note.txt', { type: 'text/plain' }))
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'top' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(screen.getByText('Scegli un file immagine.')).toBeInTheDocument()
    expect(addGarment).not.toHaveBeenCalled()
  })

  it('salva un capo con la foto e lo mostra nella griglia', async () => {
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))

    const camera = screen.getByLabelText('Scatta una foto')
    expect(camera).toHaveAttribute('accept', 'image/*')
    expect(camera).toHaveAttribute('capture', 'environment')
    expect(screen.getByLabelText('Scegli dalla galleria')).toHaveAttribute('accept', 'image/*')
    expect(screen.getByLabelText('Stagione')).toHaveValue('tutte')
    expect(screen.getByLabelText('Stile')).toHaveValue('casual')

    vi.mocked(recognizeGarment).mockResolvedValue({ category: 'scarpe', colour: 'rosso' })
    const file = new File(['foto-nuova'], 'camicia.jpg', { type: 'image/jpeg' })
    chooseFile('Scegli dalla galleria', file)
    expect(await screen.findByText('Categoria e colore sono una proposta. Puoi cambiarli.')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toHaveValue('scarpe')
    expect(screen.getByLabelText('Colore')).toHaveValue('rosso')

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'pantaloni' } })
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: 'nero' } })
    fireEvent.change(screen.getByLabelText('Stagione'), { target: { value: 'autunno' } })
    fireEvent.change(screen.getByLabelText('Stile'), { target: { value: 'lavoro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))

    await waitFor(() => expect(addGarment).toHaveBeenCalledOnce())
    const saved = vi.mocked(addGarment).mock.calls[0][0]
    expect(saved.category).toBe('pantaloni')
    expect(saved.colour).toBe('nero')
    expect(saved.season).toBe('autunno')
    expect(saved.occasion).toBe('lavoro')
    expect(saved.id).not.toBe('')
    expect(Number.isNaN(Date.parse(saved.createdAt))).toBe(false)
    expect(await saved.photo.text()).toBe('foto-nuova')
    expect(screen.getByRole('heading', { name: 'Nuovo capo' })).toBeInTheDocument()
    expect(screen.getByText('Capo salvato. Puoi aggiungerne un altro.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Torna al guardaroba' }))
    expect(await screen.findByRole('button', { name: 'Pantaloni, Nero, Autunno' })).toBeInTheDocument()
  })

  it('aggiunge più foto di seguito senza uscire dal modulo', async () => {
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))

    vi.mocked(recognizeGarment).mockResolvedValueOnce({ category: 'top', colour: 'blu' })
    chooseFile('Scatta una foto', new File(['prima'], 'prima.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(screen.getByLabelText('Categoria')).toHaveValue('top'))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(await screen.findByText('Capo salvato. Puoi aggiungerne un altro.')).toBeInTheDocument()
    expect(screen.getByLabelText('Stagione')).toHaveValue('tutte')
    expect(screen.getByLabelText('Stile')).toHaveValue('casual')
    expect(screen.getByLabelText('Categoria')).toHaveValue('')

    vi.mocked(recognizeGarment).mockResolvedValueOnce({ category: 'giacca', colour: 'beige' })
    chooseFile('Scegli dalla galleria', new File(['seconda'], 'seconda.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(screen.getByLabelText('Categoria')).toHaveValue('giacca'))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))
    await waitFor(() => expect(addGarment).toHaveBeenCalledTimes(2))

    const [first, second] = vi.mocked(addGarment).mock.calls.map((call) => call[0])
    expect(first.category).toBe('top')
    expect(first.colour).toBe('blu')
    expect(first.season).toBe('tutte')
    expect(first.occasion).toBe('casual')
    expect(await first.photo.text()).toBe('prima')
    expect(second.category).toBe('giacca')
    expect(second.colour).toBe('beige')
    expect(second.season).toBe('tutte')
    expect(second.occasion).toBe('casual')
    expect(screen.getByRole('heading', { name: 'Nuovo capo' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Torna al guardaroba' }))
    expect(await screen.findByRole('button', { name: 'Top, Blu, Tutte le stagioni' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giacca, Beige, Tutte le stagioni' })).toBeInTheDocument()
  })

  it('non sovrascrive categoria e colore se li hai già cambiati', async () => {
    let finish: (guess: { category: 'scarpe'; colour: 'nero' }) => void = () => {}
    vi.mocked(recognizeGarment).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))
    chooseFile('Scegli dalla galleria', new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))
    expect(screen.getByRole('button', { name: 'Guardo la foto…' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'giacca' } })
    finish({ category: 'scarpe', colour: 'nero' })
    expect(await screen.findByText('Categoria e colore sono una proposta. Puoi cambiarli.')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toHaveValue('giacca')
    expect(screen.getByLabelText('Colore')).toHaveValue('nero')
  })

  it('annulla senza chiamare l’archivio', async () => {
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('heading', { name: 'Guardaroba' })).toBeInTheDocument()
    expect(addGarment).not.toHaveBeenCalled()
  })

  it('aggiorna i dati e sostituisce la foto', async () => {
    const saved = garment()
    vi.mocked(listGarments).mockResolvedValue([saved])
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Top, Blu, Estate' }))
    expect(screen.getByLabelText('Stagione')).toHaveValue('estate')
    expect(screen.getByLabelText('Stile')).toHaveValue('casual')

    const file = new File(['foto-verde'], 'verde.png', { type: 'image/png' })
    chooseFile('Scatta una foto', file)
    expect(await screen.findByRole('button', { name: 'Salva il capo' })).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: 'verde' } })
    fireEvent.change(screen.getByLabelText('Stile'), { target: { value: 'elegante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva il capo' }))

    await waitFor(() => expect(updateGarment).toHaveBeenCalledOnce())
    const updated = vi.mocked(updateGarment).mock.calls[0][0]
    expect(updated.id).toBe(saved.id)
    expect(updated.createdAt).toBe(saved.createdAt)
    expect(updated.category).toBe('top')
    expect(updated.colour).toBe('verde')
    expect(updated.occasion).toBe('elegante')
    expect(await updated.photo.text()).toBe('foto-verde')
    expect(await screen.findByRole('button', { name: 'Top, Verde, Estate' })).toBeInTheDocument()
    expect(addGarment).not.toHaveBeenCalled()
  })

  it('elimina un capo solo dopo la conferma', async () => {
    vi.mocked(listGarments).mockResolvedValue([garment()])
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Top, Blu, Estate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il capo' }))
    fireEvent.click(screen.getByRole('button', { name: 'No, tienilo' }))
    expect(deleteGarment).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Elimina il capo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sì, elimina' }))
    await waitFor(() => expect(deleteGarment).toHaveBeenCalledWith('capo-1'))
    expect(await screen.findByText('Il guardaroba è ancora vuoto')).toBeInTheDocument()
  })

  it('avvisa se il salvataggio non riesce', async () => {
    vi.mocked(addGarment).mockRejectedValue(new Error('pieno'))
    render(<GuardarobaPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Aggiungi un capo' }))
    chooseFile('Scegli dalla galleria', new File(['foto'], 'camicia.jpg', { type: 'image/jpeg' }))
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'top' } })
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: 'blu' } })
    expect(await screen.findByRole('button', { name: 'Conferma' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Non sono riuscito a salvare il capo. Riprova.')
    expect(screen.getByRole('heading', { name: 'Nuovo capo' })).toBeInTheDocument()
  })

  it('riprova se l’archivio non si apre', async () => {
    vi.mocked(listGarments).mockRejectedValueOnce(new Error('chiuso')).mockResolvedValue([garment()])
    render(<GuardarobaPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Non riesco ad aprire il guardaroba su questo dispositivo.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('button', { name: 'Top, Blu, Estate' })).toBeInTheDocument()
  })
})
