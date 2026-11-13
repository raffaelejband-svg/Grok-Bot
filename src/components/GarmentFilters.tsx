import { useState } from 'react'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COLOUR_LABELS,
  COLOURS,
  OCCASION_LABELS,
  OCCASIONS,
  SEASON_LABELS,
  SEASONS,
  type Category,
  type Colour,
  type Occasion,
  type Season,
} from '../domain/types.ts'
import { EMPTY_GARMENT_FILTER, hasGarmentFilter, type GarmentFilter } from '../domain/garments.ts'

type GarmentFiltersProps = {
  filter: GarmentFilter
  total: number
  visible: number
  onChange: (filter: GarmentFilter) => void
}

const selectClass =
  'min-h-14 w-full rounded-2xl border border-line bg-linen px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay'

function capoCount(count: number): string {
  return count === 1 ? '1 capo' : `${count} capi`
}

function pick<T extends string>(value: string, allowed: readonly T[]): T | '' {
  return (allowed as readonly string[]).includes(value) ? (value as T) : ''
}

type FilterSelectProps<T extends string> = {
  label: string
  value: T | ''
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T | '') => void
}

function FilterSelect<T extends string>({ label, value, options, labels, onChange }: FilterSelectProps<T>) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium">{label}</span>
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(pick(event.target.value, options))}
      >
        <option value="">Qualsiasi</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function GarmentFilters({ filter, total, visible, onChange }: GarmentFiltersProps) {
  const [open, setOpen] = useState(false)
  const summary = visible === total ? capoCount(total) : `${capoCount(visible)} di ${total}`
  const active = hasGarmentFilter(filter)

  return (
    <div className="rounded-[1.5rem] border border-line bg-paper p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-1 text-left text-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-clay"
      >
        <span>{open ? 'Nascondi i filtri' : 'Filtra i capi'}</span>
        <svg
          viewBox="0 0 24 24"
          className={`size-6 shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <p aria-live="polite" className="mt-1 text-muted">
        {summary}
      </p>
      {visible === 0 ? (
        <p className="mt-3 text-base leading-relaxed">
          Nessun capo con questi filtri. Cambia una scelta oppure azzera per rivederli tutti.
        </p>
      ) : null}
      {active ? (
        <button
          type="button"
          className="mt-3 min-h-12 rounded-full px-1 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
          onClick={() => onChange(EMPTY_GARMENT_FILTER)}
        >
          Azzera i filtri
        </button>
      ) : null}
      {open ? (
        <fieldset className="mt-4 min-w-0 border-0 p-0">
          <legend className="sr-only">Filtra i capi</legend>
          <div className="grid grid-cols-2 gap-3">
            <FilterSelect<Category>
              label="Categoria"
              value={filter.category}
              options={CATEGORIES}
              labels={CATEGORY_LABELS}
              onChange={(category) => onChange({ ...filter, category })}
            />
            <FilterSelect<Colour>
              label="Colore"
              value={filter.colour}
              options={COLOURS}
              labels={COLOUR_LABELS}
              onChange={(colour) => onChange({ ...filter, colour })}
            />
            <FilterSelect<Season>
              label="Stagione"
              value={filter.season}
              options={SEASONS}
              labels={SEASON_LABELS}
              onChange={(season) => onChange({ ...filter, season })}
            />
            <FilterSelect<Occasion>
              label="Stile"
              value={filter.occasion}
              options={OCCASIONS}
              labels={OCCASION_LABELS}
              onChange={(occasion) => onChange({ ...filter, occasion })}
            />
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}
