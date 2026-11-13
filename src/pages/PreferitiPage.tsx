import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { primaryButtonClass, secondaryButtonClass } from '../components/buttonStyles.ts'
import { EmptyState } from '../components/EmptyState.tsx'
import { MissingPieceCard, PieceCard } from '../components/PieceCard.tsx'
import { PhotoView } from '../components/PhotoView.tsx'
import { OCCASION_LABELS, SEASON_LABELS, type Garment, type Outfit } from '../domain/types.ts'
import { deleteOutfit, listGarments, listOutfits } from '../storage/db.ts'

type Archive = {
  outfits: Outfit[]
  garments: Map<string, Garment>
}

export function PreferitiPage() {
  const [archive, setArchive] = useState<Archive | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listOutfits(), listGarments()])
      .then(([outfits, garments]) => {
        if (!active) return
        setArchive({ outfits, garments: new Map(garments.map((garment) => [garment.id, garment])) })
      })
      .catch(() => {
        if (active) setArchive({ outfits: [], garments: new Map() })
      })
    return () => {
      active = false
    }
  }, [])

  const selected = archive?.outfits.find((outfit) => outfit.id === selectedId)

  async function remove(id: string) {
    await deleteOutfit(id)
    setArchive((current) =>
      current ? { ...current, outfits: current.outfits.filter((outfit) => outfit.id !== id) } : current,
    )
    setSelectedId(null)
  }

  return (
    <section className="flex flex-1 flex-col" aria-busy={archive === null}>
      <h1 className="font-display text-4xl leading-none tracking-tight">Preferiti</h1>
      {selected ? null : (
        <p className="mt-3 text-lg leading-snug text-muted">Gli outfit che vuoi tenere a portata di mano.</p>
      )}

      {archive === null ? (
        <p className="mt-8 text-lg text-muted">Sto guardando i preferiti…</p>
      ) : selected ? (
        <OutfitDetail
          outfit={selected}
          garments={archive.garments}
          onBack={() => setSelectedId(null)}
          onDelete={() => remove(selected.id)}
        />
      ) : archive.outfits.length === 0 ? (
        <div className="mt-8 flex flex-1 flex-col gap-4">
          <EmptyState
            icon="heart"
            title="Nessun preferito"
            text="Quando salvi un outfit, lo ritrovi qui."
          />
          <Link to="/outfit" className={primaryButtonClass}>
            Crea un outfit
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {archive.outfits.map((outfit) => (
            <button
              key={outfit.id}
              type="button"
              onClick={() => setSelectedId(outfit.id)}
              className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-line bg-paper p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
            >
              <span className="font-display text-[1.7rem] leading-tight tracking-tight">{outfit.name}</span>
              <span className="text-base text-muted">
                {OCCASION_LABELS[outfit.occasion]} · {SEASON_LABELS[outfit.season]}
              </span>
              <span className="text-sm text-muted">{formatWhen(outfit.createdAt)}</span>
              <span className="flex gap-2">
                {outfit.garmentIds.slice(0, 4).map((id, index) => {
                  const garment = archive.garments.get(id)
                  return garment ? (
                    <PhotoView
                      key={`${id}-${index}`}
                      photo={garment.photo}
                      alt=""
                      className="size-14 rounded-xl border border-line object-cover"
                    />
                  ) : (
                    <span key={`${id}-${index}`} className="size-14 rounded-xl border border-dashed border-line bg-linen" />
                  )
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function OutfitDetail({
  outfit,
  garments,
  onBack,
  onDelete,
}: {
  outfit: Outfit
  garments: Map<string, Garment>
  onBack: () => void
  onDelete: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setPending(true)
    setError(null)
    try {
      await onDelete()
    } catch {
      setPending(false)
      setConfirming(false)
      setError('Non sono riuscito a eliminare l’outfit.')
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-12 items-center rounded-full px-1 text-base font-semibold text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
      >
        Indietro
      </button>
      <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight">{outfit.name}</h2>
      <p className="mt-2 text-base text-muted">
        {OCCASION_LABELS[outfit.occasion]} · {SEASON_LABELS[outfit.season]}
      </p>
      <p className="mt-1 text-sm text-muted">{formatWhen(outfit.createdAt)}</p>
      <div className="mt-5 flex flex-col gap-3">
        {outfit.garmentIds.length === 0 ? (
          <p className="text-base leading-relaxed text-muted">Questo outfit non ha capi.</p>
        ) : (
          outfit.garmentIds.map((id, index) => {
            const garment = garments.get(id)
            return garment ? (
              <PieceCard key={`${id}-${index}`} garment={garment} />
            ) : (
              <MissingPieceCard key={`${id}-${index}`} />
            )
          })
        )}
      </div>
      {error ? (
        <p role="status" className="mt-4 text-base font-medium text-clay">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={`mt-6 ${confirming ? primaryButtonClass : secondaryButtonClass}`}
        onClick={() => void remove()}
        disabled={pending}
      >
        {confirming ? 'Conferma eliminazione' : 'Elimina'}
      </button>
    </div>
  )
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
