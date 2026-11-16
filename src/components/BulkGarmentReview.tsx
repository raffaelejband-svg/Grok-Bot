import { useEffect, useRef, useState } from 'react'
import { parseGarmentForm, type GarmentFormErrors } from '../domain/garments.ts'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COLOUR_LABELS,
  COLOURS,
  MATERIAL_LABELS,
  MATERIALS,
  OCCASION_LABELS,
  OCCASIONS,
  PATTERN_LABELS,
  PATTERNS,
  SEASON_LABELS,
  SEASONS,
  SUBTYPE_LABELS,
  subtypeFits,
  subtypesForCategory,
  type Category,
  type Garment,
  type SubType,
} from '../domain/types.ts'
import type { GarmentGuess } from '../vision/guess.ts'
import { recognizeGarment } from '../vision/recognizeGarment.ts'
import { primaryButtonClass, secondaryButtonClass } from './buttonStyles.ts'
import { PhotoView } from './PhotoView.tsx'

type Draft = {
  key: string
  photo: File
  name: string
  category: string
  subType: string
  colour: string
  colourSecondary: string
  pattern: string
  material: string
  season: string
  occasion: string
  note: string | null
}

type BulkGarmentReviewProps = {
  files: File[]
  skipped: number
  onCancel: () => void
  onSave: (garment: Garment) => Promise<void>
}

const selectClass =
  'min-h-14 w-full rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `capo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function draftFromFile(file: File, guess: GarmentGuess | null): Draft {
  const category = guess?.category ?? ''
  const subType = guess?.subType && category !== '' && subtypeFits(category as Category, guess.subType)
    ? guess.subType
    : 'altro'
  return {
    key: createId(),
    photo: file,
    name: file.name,
    category,
    subType,
    colour: guess?.colour ?? '',
    colourSecondary: guess?.colourSecondary ?? '',
    pattern: guess?.pattern ?? 'tinta unita',
    material: guess?.material ?? 'sconosciuto',
    season: guess?.season ?? 'tutte',
    occasion: guess?.occasion ?? 'casual',
    note: guess?.note ?? null,
  }
}

function Field<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  allowEmpty = true,
  emptyLabel = 'Scegli…',
}: {
  label: string
  value: string
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: string) => void
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium">{label}</span>
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function BulkGarmentReview({ files, skipped, onCancel, onSave }: BulkGarmentReviewProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [progress, setProgress] = useState(`Riconosco la foto 1 di ${files.length}…`)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, GarmentFormErrors>>({})
  const [done, setDone] = useState<number | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Draft[] = []
      for (let index = 0; index < files.length; index += 1) {
        if (cancelled) return
        setProgress(`Riconosco la foto ${index + 1} di ${files.length}…`)
        let guess: GarmentGuess | null = null
        try {
          guess = await recognizeGarment(files[index]!)
        } catch {
          guess = null
        }
        if (cancelled) return
        next.push(draftFromFile(files[index]!, guess))
        setDrafts([...next])
      }
      if (cancelled) return
      setProgress('')
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [files])

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
  }

  async function confirm() {
    if (!ready || progress !== '') return
    const parsed = drafts.map((draft) => ({
      draft,
      result: parseGarmentForm({
        photo: draft.photo,
        hasCurrentPhoto: false,
        category: draft.category,
        subType: draft.subType,
        colour: draft.colour,
        colourSecondary: draft.colourSecondary,
        pattern: draft.pattern,
        material: draft.material,
        season: draft.season,
        occasion: draft.occasion,
      }),
    }))
    const errors: Record<string, GarmentFormErrors> = {}
    for (const item of parsed) {
      if (!item.result.ok) errors[item.draft.key] = item.result.errors
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Scegli categoria e colore per ogni foto.')
      return
    }
    setError(null)
    let saved = 0
    for (let index = 0; index < parsed.length; index += 1) {
      const item = parsed[index]!
      if (!item.result.ok) continue
      if (!alive.current) return
      setProgress(`Salvo il capo ${index + 1} di ${parsed.length}…`)
      try {
        await onSave({
          id: item.draft.key,
          photo: item.draft.photo,
          category: item.result.choices.category,
          subType: item.result.choices.subType,
          colour: item.result.choices.colour,
          colourSecondary: item.result.choices.colourSecondary,
          pattern: item.result.choices.pattern,
          material: item.result.choices.material,
          season: item.result.choices.season,
          occasion: item.result.choices.occasion,
          createdAt: new Date(Date.now() + index).toISOString(),
        })
        saved += 1
      } catch {
        if (!alive.current) return
        setProgress('')
        setDrafts(parsed.slice(index).map((entry) => entry.draft))
        setError('Non sono riuscito a salvare un capo. Quelli già salvati restano nel guardaroba. Riprova con gli altri.')
        return
      }
    }
    if (!alive.current) return
    setProgress('')
    setDone(saved)
  }

  if (done !== null) {
    return (
      <section className="flex flex-1 flex-col">
        <h1 className="font-display text-4xl leading-none tracking-tight">Tante foto</h1>
        <p role="status" className="mt-4 text-lg leading-snug">
          {done === 1 ? 'Ho salvato 1 capo.' : `Ho salvato ${done} capi.`}
        </p>
        <button type="button" className={`${primaryButtonClass} mt-6`} onClick={onCancel}>
          Torna al guardaroba
        </button>
      </section>
    )
  }

  const missing = drafts.some((draft) => draft.category === '' || draft.colour === '')

  return (
    <section className="flex flex-1 flex-col" aria-busy={progress !== '' || undefined}>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-12 self-start rounded-full px-1 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
      >
        Annulla
      </button>
      <h1 className="mt-3 font-display text-4xl leading-none tracking-tight">Tante foto</h1>
      <p className="mt-3 text-lg leading-snug text-muted">
        Riconosco ogni foto, poi controlli e confermi.
      </p>
      {skipped > 0 ? (
        <p className="mt-3 text-base leading-snug">
          {skipped === 1 ? 'Ho lasciato fuori 1 file che non è una foto.' : `Ho lasciato fuori ${skipped} file che non sono foto.`}
        </p>
      ) : null}
      {progress !== '' ? (
        <p role="status" className="mt-4 text-lg leading-snug">
          {progress}
        </p>
      ) : null}

      <ul className="mt-6 grid gap-6">
        {drafts.map((draft, index) => {
          const photoNumber = index + 1
          const category = (CATEGORIES as readonly string[]).includes(draft.category) ? (draft.category as Category) : ''
          const subtypeOptions = subtypesForCategory(category)
          const subtypeValue = (subtypeOptions as readonly string[]).includes(draft.subType) ? draft.subType : 'altro'
          const problems = fieldErrors[draft.key]
          return (
            <li key={draft.key} className="rounded-[1.5rem] border border-line bg-paper p-4">
              <PhotoView photo={draft.photo} alt={`Foto ${photoNumber}`} className="aspect-[3/4] w-full rounded-2xl object-cover" />
              <p className="mt-3 text-base text-muted">{draft.name}</p>
              {draft.note ? <p className="mt-2 text-base leading-snug">{draft.note}</p> : null}
              <div className="mt-4 grid gap-4">
                <Field
                  label={`Categoria, foto ${photoNumber}`}
                  value={draft.category}
                  options={CATEGORIES}
                  labels={CATEGORY_LABELS}
                  onChange={(value) => {
                    const nextType = (CATEGORIES as readonly string[]).includes(value)
                      && subtypeFits(value as Category, draft.subType as SubType)
                      ? draft.subType
                      : 'altro'
                    update(draft.key, { category: value, subType: nextType })
                  }}
                />
                <Field
                  label={`Tipo, foto ${photoNumber}`}
                  value={subtypeValue}
                  options={subtypeOptions}
                  labels={SUBTYPE_LABELS}
                  allowEmpty={false}
                  onChange={(value) => update(draft.key, { subType: value })}
                />
                <Field
                  label={`Colore, foto ${photoNumber}`}
                  value={draft.colour}
                  options={COLOURS}
                  labels={COLOUR_LABELS}
                  onChange={(value) => update(draft.key, { colour: value })}
                />
                <Field
                  label={`Secondo colore, foto ${photoNumber}`}
                  value={draft.colourSecondary}
                  options={COLOURS}
                  labels={COLOUR_LABELS}
                  emptyLabel="Nessuno"
                  onChange={(value) => update(draft.key, { colourSecondary: value })}
                />
                <Field
                  label={`Disegno, foto ${photoNumber}`}
                  value={draft.pattern}
                  options={PATTERNS}
                  labels={PATTERN_LABELS}
                  allowEmpty={false}
                  onChange={(value) => update(draft.key, { pattern: value })}
                />
                <Field
                  label={`Materiale, foto ${photoNumber}`}
                  value={draft.material}
                  options={MATERIALS}
                  labels={MATERIAL_LABELS}
                  allowEmpty={false}
                  onChange={(value) => update(draft.key, { material: value })}
                />
                <Field
                  label={`Stagione, foto ${photoNumber}`}
                  value={draft.season}
                  options={SEASONS}
                  labels={SEASON_LABELS}
                  allowEmpty={false}
                  onChange={(value) => update(draft.key, { season: value })}
                />
                <Field
                  label={`Stile, foto ${photoNumber}`}
                  value={draft.occasion}
                  options={OCCASIONS}
                  labels={OCCASION_LABELS}
                  allowEmpty={false}
                  onChange={(value) => update(draft.key, { occasion: value })}
                />
              </div>
              {problems?.category ? <p className="mt-2 text-base text-clay">{problems.category}</p> : null}
              {problems?.colour ? <p className="mt-2 text-base text-clay">{problems.colour}</p> : null}
              <button
                type="button"
                className="mt-4 min-h-12 text-lg font-medium text-clay"
                onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
              >
                {`Togli la foto ${photoNumber}`}
              </button>
            </li>
          )
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-4 text-base text-clay">
          {error}
        </p>
      ) : null}
      {ready && missing ? (
        <p className="mt-4 text-base leading-snug">Scegli categoria e colore per ogni foto.</p>
      ) : null}
      {ready && drafts.length > 0 ? (
        <button type="button" className={`${primaryButtonClass} mt-6`} disabled={progress !== '' || missing} onClick={() => void confirm()}>
          Conferma i capi
        </button>
      ) : null}
      {ready && drafts.length === 0 ? (
        <button type="button" className={`${secondaryButtonClass} mt-6`} onClick={onCancel}>
          Torna al guardaroba
        </button>
      ) : null}
    </section>
  )
}
