import { CATEGORY_LABELS, COLOUR_LABELS, OCCASION_LABELS, SEASON_LABELS, type Garment } from '../domain/types.ts'
import { GARMENT_COLOUR_SWATCH } from './colourSwatch.ts'
import { PhotoView } from './PhotoView.tsx'

export function PieceCard({ garment, onSwap }: { garment: Garment; onSwap?: () => void }) {
  const category = CATEGORY_LABELS[garment.category]

  return (
    <article className="flex gap-3 rounded-[1.5rem] border border-line bg-paper p-3">
      <PhotoView
        photo={garment.photo}
        alt={`${category} ${COLOUR_LABELS[garment.colour]}`}
        className="size-24 shrink-0 rounded-2xl border border-line object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm text-muted">{category}</p>
        <p className="mt-0.5 flex items-center gap-2 text-lg leading-tight font-medium">
          <span
            className="size-3.5 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: GARMENT_COLOUR_SWATCH[garment.colour] }}
            aria-hidden="true"
          />
          {COLOUR_LABELS[garment.colour]}
        </p>
        <p className="mt-1 text-sm text-muted">
          {OCCASION_LABELS[garment.occasion]} · {SEASON_LABELS[garment.season]}
        </p>
        {onSwap ? (
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Cambia ${category.toLowerCase()}`}
            className="mt-3 inline-flex min-h-12 items-center justify-center self-start rounded-full border border-line bg-linen px-4 text-base font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Cambia
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function MissingPieceCard() {
  return (
    <article className="flex min-h-24 items-center rounded-[1.5rem] border border-dashed border-line bg-paper px-4 py-4">
      <p className="text-base leading-relaxed text-muted">Questo capo non è più nel guardaroba.</p>
    </article>
  )
}
