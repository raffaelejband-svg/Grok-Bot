import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { primaryButtonClass, secondaryButtonClass } from '../components/buttonStyles.ts'
import { EmptyState } from '../components/EmptyState.tsx'
import { PieceCard } from '../components/PieceCard.tsx'
import {
  generateOutfit,
  listOutfitPieces,
  requiredGarmentsReason,
  swapPiece,
  type GenerateOutfitResult,
} from '../domain/outfits.ts'
import {
  OCCASIONS,
  OCCASION_LABELS,
  SEASON_LABELS,
  type Category,
  type Garment,
  type Occasion,
  type Season,
} from '../domain/types.ts'
import { listGarments, saveOutfit } from '../storage/db.ts'

const REQUEST_SEASONS = ['primavera', 'estate', 'autunno', 'inverno'] as const
type RequestSeason = (typeof REQUEST_SEASONS)[number]

function seasonForMonth(month: number): RequestSeason {
  if (month === 11 || month <= 1) return 'inverno'
  if (month <= 4) return 'primavera'
  if (month <= 7) return 'estate'
  return 'autunno'
}

function outfitName(occasion: Occasion, season: Season): string {
  return `${OCCASION_LABELS[occasion]} · ${SEASON_LABELS[season]}`
}

function nextSeed(counter: { current: number }): number {
  counter.current += 1
  return (Math.floor(Math.random() * 0x7fffffff) + counter.current) >>> 0
}

export function OutfitPage() {
  const [garments, setGarments] = useState<Garment[] | null>(null)
  const [occasion, setOccasion] = useState<Occasion>('casual')
  const [season, setSeason] = useState<RequestSeason>(() => seasonForMonth(new Date().getMonth()))
  const [result, setResult] = useState<GenerateOutfitResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const seedCounter = useRef(0)

  useEffect(() => {
    let active = true
    listGarments()
      .then((items) => {
        if (active) setGarments(items)
      })
      .catch(() => {
        if (active) setGarments([])
      })
    return () => {
      active = false
    }
  }, [])

  function clearLook() {
    setResult(null)
    setNotice(null)
    setSaved(false)
  }

  function chooseOccasion(next: Occasion) {
    if (next === occasion) return
    setOccasion(next)
    clearLook()
  }

  function chooseSeason(next: RequestSeason) {
    if (next === season) return
    setSeason(next)
    clearLook()
  }

  function onGenerate() {
    if (!garments) return
    setResult(generateOutfit(garments, occasion, season, nextSeed(seedCounter)))
    setNotice(null)
    setSaved(false)
  }

  function onSwap(slot: Category) {
    if (!garments || !result?.ok) return
    const swapped = swapPiece(result.outfit, slot, garments, nextSeed(seedCounter))
    if (!swapped.swapped) {
      setNotice(swapped.reason)
      return
    }
    setResult({ ok: true, outfit: swapped.outfit })
    setNotice(null)
    setSaved(false)
  }

  async function onSave() {
    if (!result?.ok || saved || saving) return
    setSaving(true)
    setNotice(null)
    try {
      await saveOutfit({
        id: crypto.randomUUID(),
        name: outfitName(result.outfit.occasion, result.outfit.season),
        garmentIds: listOutfitPieces(result.outfit).map((piece) => piece.garment.id),
        occasion: result.outfit.occasion,
        season: result.outfit.season,
        createdAt: new Date().toISOString(),
      })
      setSaved(true)
      setNotice('Outfit salvato nei preferiti.')
    } catch {
      setNotice('Non sono riuscito a salvare l’outfit.')
    } finally {
      setSaving(false)
    }
  }

  const gap = garments ? requiredGarmentsReason(garments) : null

  return (
    <section className="flex flex-1 flex-col" aria-busy={garments === null}>
      <h1 className="font-display text-4xl leading-none tracking-tight">Outfit</h1>
      <p className="mt-3 text-lg leading-snug text-muted">Componi un look con i vestiti che hai già.</p>

      {garments === null ? (
        <p className="mt-8 text-lg text-muted">Sto guardando il guardaroba…</p>
      ) : gap ? (
        <div className="mt-8 flex flex-1 flex-col gap-4">
          <EmptyState icon="layers" title="Nessun outfit" text={gap} />
          <Link to="/" className={primaryButtonClass}>
            Vai al guardaroba
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-5">
            <ChoiceGroup
              label="Occasione"
              value={occasion}
              options={OCCASIONS}
              labels={OCCASION_LABELS}
              onChange={chooseOccasion}
            />
            <ChoiceGroup
              label="Stagione"
              value={season}
              options={REQUEST_SEASONS}
              labels={SEASON_LABELS}
              onChange={chooseSeason}
            />
          </div>

          {result?.ok ? (
            <div className="mt-8" aria-live="polite">
              <h2 className="font-display text-3xl leading-none tracking-tight">Il tuo look</h2>
              <p
                className={
                  result.outfit.relaxed === 'none'
                    ? 'mt-3 text-base leading-relaxed text-muted'
                    : 'mt-3 rounded-2xl bg-clay-soft px-4 py-3 text-base leading-relaxed'
                }
              >
                {result.outfit.reason}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {listOutfitPieces(result.outfit).map(({ slot, garment }) => (
                  <PieceCard key={slot} garment={garment} onSwap={() => onSwap(slot)} />
                ))}
              </div>
              <p className="mt-4 text-base text-muted">Nei preferiti: {outfitName(occasion, season)}.</p>
              {notice ? (
                <p role="status" className="mt-3 text-base font-medium text-clay">
                  {notice}
                </p>
              ) : null}
              <div className="mt-5 flex flex-col gap-3">
                <button type="button" className={secondaryButtonClass} onClick={onGenerate}>
                  Rigenera
                </button>
                <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saved || saving}>
                  {saved ? 'Salvato' : saving ? 'Salvo…' : 'Salva'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-4">
              {result ? <EmptyState icon="layers" title="Nessuna combinazione" text={result.reason} /> : null}
              <button type="button" className={result ? secondaryButtonClass : primaryButtonClass} onClick={onGenerate}>
                {result ? 'Rigenera' : 'Genera'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  const labelId = `scelta-${label.toLowerCase()}`

  return (
    <div>
      <p id={labelId} className="text-base font-medium">
        {label}
      </p>
      <div role="group" aria-labelledby={labelId} className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={[
                'min-h-12 rounded-full px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen',
                selected ? 'bg-clay font-semibold text-paper' : 'border border-line bg-paper font-medium text-ink',
              ].join(' ')}
            >
              {labels[option]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
