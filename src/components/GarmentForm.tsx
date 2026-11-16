import { useId, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
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
  type Material,
  type Pattern,
  type SubType,
} from '../domain/types.ts'
import type { Garment } from '../domain/types.ts'
import type { GarmentGuess } from '../vision/guess.ts'
import { recognizeGarment } from '../vision/recognizeGarment.ts'
import { PhotoView } from './PhotoView.tsx'

type GarmentFormProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  garment?: Garment
  /** Dopo un capo nuovo il modulo resta aperto, pronto per un’altra foto. */
  repeatAfterSave?: boolean
  onCancel: () => void
  onSave: (garment: Garment) => Promise<void>
  onDelete?: () => Promise<void>
}

type GuessState = 'idle' | 'pending' | 'ready' | 'failed'

const IMAGE_EXTENSION = /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i

function isLikelyImage(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSION.test(file.name)
}

const selectClass =
  'min-h-14 w-full rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay'

const photoButton =
  'flex min-h-14 cursor-pointer items-center justify-center rounded-full px-5 text-center text-lg font-medium outline-none focus-within:ring-2 focus-within:ring-clay focus-within:ring-offset-2 focus-within:ring-offset-linen'

const PHOTO_RULES = [
  'Un capo per foto',
  'Sfondo chiaro e semplice',
  'Il capo tutto dentro la cornice',
  'Luce buona e uniforme',
] as const

function PhotoGuide({ framed }: { framed: boolean }) {
  const rules = (
    <ul className={framed ? 'relative z-10 flex h-full flex-col justify-center gap-3 px-8 text-center text-lg leading-snug' : 'mt-3 grid gap-1 text-base leading-snug text-muted'}>
      {PHOTO_RULES.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  )
  if (!framed) return rules
  return (
    <div className="relative mt-3 h-72 overflow-hidden rounded-[1.5rem] border border-line bg-paper">
      <div className="pointer-events-none absolute inset-[12%] rounded-[1rem] border-2 border-dashed border-clay" aria-hidden="true" />
      {rules}
    </div>
  )
}

type ChoiceFieldProps<T extends string> = {
  label: string
  value: string
  error?: string
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: string) => void
  allowEmpty?: boolean
  emptyLabel?: string
}

function ChoiceField<T extends string>({
  label,
  value,
  error,
  options,
  labels,
  onChange,
  allowEmpty = true,
  emptyLabel = 'Scegli…',
}: ChoiceFieldProps<T>) {
  const errorId = useId()
  return (
    <div>
      <label className="block">
        <span className="mb-2 block font-medium">{label}</span>
        <select
          className={selectClass}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          {allowEmpty ? <option value="">{emptyLabel}</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {labels[option]}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p id={errorId} className="mt-2 text-base text-clay">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function createGarmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `capo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function GarmentForm({
  headingRef,
  garment,
  repeatAfterSave = false,
  onCancel,
  onSave,
  onDelete,
}: GarmentFormProps) {
  const photoErrorId = useId()
  const requestId = useRef(0)
  const categoryTouched = useRef(false)
  const colourTouched = useRef(false)
  const subTypeTouched = useRef(false)
  const secondaryTouched = useRef(false)
  const patternTouched = useRef(false)
  const materialTouched = useRef(false)
  const seasonTouched = useRef(false)
  const occasionTouched = useRef(false)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [category, setCategory] = useState(garment?.category ?? '')
  const [subType, setSubType] = useState(garment?.subType ?? 'altro')
  const [colour, setColour] = useState(garment?.colour ?? '')
  const [colourSecondary, setColourSecondary] = useState(garment?.colourSecondary ?? '')
  const [pattern, setPattern] = useState(garment?.pattern ?? 'tinta unita')
  const [material, setMaterial] = useState(garment?.material ?? 'sconosciuto')
  const [season, setSeason] = useState(garment?.season ?? (garment ? '' : 'tutte'))
  const [occasion, setOccasion] = useState(garment?.occasion ?? (garment ? '' : 'casual'))
  const [errors, setErrors] = useState<GarmentFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [guess, setGuess] = useState<GuessState>('idle')
  const [guessNote, setGuessNote] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const preview = photo ?? garment?.photo ?? null
  const previewAlt = photo ? 'Anteprima della foto' : 'Foto attuale'
  const title = garment ? 'Modifica capo' : 'Nuovo capo'
  const recognizing = guess === 'pending'
  const submitLabel = pending === 'save' ? 'Salvo…' : recognizing ? 'Guardo la foto…' : garment ? 'Salva il capo' : 'Conferma'
  const leaveLabel = savedCount > 0 ? 'Torna al guardaroba' : 'Annulla'
  const proposal = 'Questi dati sono una proposta. Controlla e cambiali se serve.'
  const notice = recognizing
    ? 'Guardo la foto per proporti i dati del capo.'
    : guess === 'failed'
      ? guessNote
        ? `${guessNote} Scegli categoria e colore.`
        : 'Non ho riconosciuto la foto. Scegli categoria e colore.'
      : guess === 'ready'
        ? guessNote
          ? `${guessNote} ${proposal}`
          : proposal
        : savedCount > 0 && !photo
          ? 'Capo salvato. Puoi aggiungerne un altro.'
          : null

  function resetTouched() {
    categoryTouched.current = false
    colourTouched.current = false
    subTypeTouched.current = false
    secondaryTouched.current = false
    patternTouched.current = false
    materialTouched.current = false
    seasonTouched.current = false
    occasionTouched.current = false
  }

  function applyGuess(result: GarmentGuess): boolean {
    let applied = false
    const nextCategory = result.category && !categoryTouched.current ? result.category : category
    if (result.category && !categoryTouched.current) {
      setCategory(result.category)
      applied = true
    }
    if (result.subType && !subTypeTouched.current) {
      const allowed =
        (CATEGORIES as readonly string[]).includes(nextCategory) &&
        subtypeFits(nextCategory as Category, result.subType)
      setSubType(allowed ? result.subType : 'altro')
      applied = true
    }
    if (result.colour && !colourTouched.current) {
      setColour(result.colour)
      applied = true
    }
    if (!secondaryTouched.current && result.colourSecondary !== undefined) {
      setColourSecondary(result.colourSecondary ?? '')
      if (result.colourSecondary) applied = true
    }
    if (result.pattern && !patternTouched.current) {
      setPattern(result.pattern)
      applied = true
    }
    if (result.material && !materialTouched.current) {
      setMaterial(result.material)
      applied = true
    }
    if (result.occasion && !occasionTouched.current) {
      setOccasion(result.occasion)
      applied = true
    }
    if (result.season && !seasonTouched.current) {
      setSeason(result.season)
      applied = true
    }
    return applied
  }

  function takePhoto(file: File | null) {
    const request = ++requestId.current
    resetTouched()
    setPhoto(file)
    setGuessNote(null)
    setErrors((current) => ({ ...current, photo: undefined, category: undefined, colour: undefined }))
    setFormError(null)
    if (!file || !isLikelyImage(file)) {
      setGuess('idle')
      return
    }
    if (!garment) {
      setCategory('')
      setSubType('altro')
      setColour('')
      setColourSecondary('')
      setPattern('tinta unita')
      setMaterial('sconosciuto')
      setSeason('tutte')
      setOccasion('casual')
    }
    setGuess('pending')
    void recognizeGarment(file).then(
      (result) => {
        if (request !== requestId.current) return
        setGuessNote(result.note ?? null)
        const modelHasGuess = Boolean(
          result.category || result.colour || result.subType || result.pattern || result.material || result.occasion || result.season,
        )
        if (!modelHasGuess) {
          setGuess('failed')
          return
        }
        setGuess(applyGuess(result) ? 'ready' : 'idle')
      },
      () => {
        if (request !== requestId.current) return
        setGuess('failed')
      },
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const parsed = parseGarmentForm({
      photo,
      hasCurrentPhoto: Boolean(garment?.photo),
      category,
      subType,
      colour,
      colourSecondary,
      pattern,
      material,
      season,
      occasion,
    })
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }

    const savedPhoto = photo ?? garment?.photo
    if (!savedPhoto) {
      setErrors({ photo: 'Aggiungi una foto del capo.' })
      return
    }

    setPending('save')
    setFormError(null)
    try {
      await onSave({
        id: garment?.id ?? createGarmentId(),
        photo: savedPhoto,
        category: parsed.choices.category,
        subType: parsed.choices.subType,
        colour: parsed.choices.colour,
        colourSecondary: parsed.choices.colourSecondary,
        pattern: parsed.choices.pattern,
        material: parsed.choices.material,
        season: parsed.choices.season,
        occasion: parsed.choices.occasion,
        createdAt: garment?.createdAt ?? new Date().toISOString(),
      })
      if (repeatAfterSave) {
        requestId.current += 1
        resetTouched()
        setPhoto(null)
        setCategory('')
        setSubType('altro')
        setColour('')
        setColourSecondary('')
        setPattern('tinta unita')
        setMaterial('sconosciuto')
        setSeason('tutte')
        setOccasion('casual')
        setErrors({})
        setFormError(null)
        setGuess('idle')
        setGuessNote(null)
        setSavedCount((count) => count + 1)
        setPending(null)
        document.getElementById('contenuto')?.scrollTo?.(0, 0)
      }
    } catch {
      setFormError('Non sono riuscito a salvare il capo. Riprova.')
      setPending(null)
    }
  }

  async function handleDelete() {
    if (!onDelete || pending) return
    setPending('delete')
    setFormError(null)
    try {
      await onDelete()
    } catch {
      setFormError('Non sono riuscito a eliminare il capo. Riprova.')
      setPending(null)
    }
  }

  const knownCategory = (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : ''
  const subtypeOptions = subtypesForCategory(knownCategory)
  const subtypeValue = (subtypeOptions as readonly string[]).includes(subType) ? subType : 'altro'

  return (
    <section className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-12 self-start rounded-full px-1 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
      >
        {leaveLabel}
      </button>
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-4xl leading-none tracking-tight outline-none">
        {title}
      </h1>
      <p className="mt-3 text-lg leading-snug text-muted">
        {garment
          ? 'Puoi cambiare i dati e sostituire la foto.'
          : 'Scatta o scegli una foto. Controlla i dati e conferma.'}
      </p>
      {notice ? (
        <p role="status" className="mt-3 text-lg leading-snug">
          {notice}
        </p>
      ) : null}

      <form
        className="mt-6 grid gap-5"
        aria-busy={recognizing || undefined}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <fieldset aria-describedby={errors.photo ? photoErrorId : undefined}>
          <legend className="font-medium">Foto</legend>
          {preview ? (
            <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-line bg-clay-soft">
              <PhotoView photo={preview} alt={previewAlt} className="aspect-[3/4] w-full object-cover" />
            </div>
          ) : (
            <PhotoGuide framed />
          )}
          {preview ? <PhotoGuide framed={false} /> : null}
          <div className="mt-3 grid gap-3">
            <label className={`${photoButton} bg-clay text-paper`}>
              Scatta una foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  takePhoto(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </label>
            <label className={`${photoButton} border border-line bg-paper text-ink`}>
              Scegli dalla galleria
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  takePhoto(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          {errors.photo ? (
            <p id={photoErrorId} className="mt-2 text-base text-clay">
              {errors.photo}
            </p>
          ) : null}
        </fieldset>

        <ChoiceField
          label="Categoria"
          value={category}
          error={errors.category}
          options={CATEGORIES}
          labels={CATEGORY_LABELS}
          onChange={(value) => {
            categoryTouched.current = true
            setCategory(value)
            setSubType((current) =>
              (CATEGORIES as readonly string[]).includes(value) && subtypeFits(value as Category, current as SubType)
                ? current
                : 'altro',
            )
          }}
        />
        <ChoiceField
          label="Tipo"
          value={subtypeValue}
          error={errors.subType}
          options={subtypeOptions}
          labels={SUBTYPE_LABELS}
          allowEmpty={false}
          onChange={(value) => {
            subTypeTouched.current = true
            setSubType(value as SubType)
          }}
        />
        <ChoiceField
          label="Colore"
          value={colour}
          error={errors.colour}
          options={COLOURS}
          labels={COLOUR_LABELS}
          onChange={(value) => {
            colourTouched.current = true
            setColour(value)
          }}
        />
        <ChoiceField
          label="Secondo colore"
          value={colourSecondary}
          error={errors.colourSecondary}
          options={COLOURS}
          labels={COLOUR_LABELS}
          emptyLabel="Nessuno"
          onChange={(value) => {
            secondaryTouched.current = true
            setColourSecondary(value)
          }}
        />
        <ChoiceField
          label="Disegno"
          value={pattern}
          error={errors.pattern}
          options={PATTERNS}
          labels={PATTERN_LABELS}
          allowEmpty={false}
          onChange={(value) => {
            patternTouched.current = true
            setPattern(value as Pattern)
          }}
        />
        <ChoiceField
          label="Materiale"
          value={material}
          error={errors.material}
          options={MATERIALS}
          labels={MATERIAL_LABELS}
          allowEmpty={false}
          onChange={(value) => {
            materialTouched.current = true
            setMaterial(value as Material)
          }}
        />
        <ChoiceField
          label="Stagione"
          value={season}
          error={errors.season}
          options={SEASONS}
          labels={SEASON_LABELS}
          onChange={(value) => {
            seasonTouched.current = true
            setSeason(value)
          }}
        />
        <ChoiceField
          label="Stile"
          value={occasion}
          error={errors.occasion}
          options={OCCASIONS}
          labels={OCCASION_LABELS}
          onChange={(value) => {
            occasionTouched.current = true
            setOccasion(value)
          }}
        />

        {formError ? (
          <p role="alert" className="text-base text-clay">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending !== null || recognizing}
          className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-clay px-5 text-lg font-medium text-paper outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </form>

      {garment && onDelete ? (
        <div className="mt-10 rounded-[1.5rem] border border-line bg-paper p-4">
          {confirmDelete ? (
            <div role="group" aria-label="Conferma eliminazione">
              <p className="text-base leading-relaxed">
                Togliere questo capo dal guardaroba? Si cancella solo da questo telefono.
              </p>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void handleDelete()}
                className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-clay px-5 text-lg font-medium text-paper outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60"
              >
                {pending === 'delete' ? 'Elimino…' : 'Sì, elimina'}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => setConfirmDelete(false)}
                className="mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-full border border-line bg-paper px-5 text-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-clay"
              >
                No, tienilo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full px-5 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
            >
              Elimina il capo
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}
