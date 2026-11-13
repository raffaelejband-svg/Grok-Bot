import { EmptyState } from '../components/EmptyState.tsx'

export function PreferitiPage() {
  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Preferiti</h1>
      <p className="mt-3 text-lg leading-snug text-muted">Gli outfit che vuoi tenere a portata di mano.</p>
      <div className="mt-8 flex flex-1">
        <EmptyState
          icon="heart"
          title="Nessun preferito"
          text="I look che segni come preferiti compariranno qui, pronti da ritrovare."
        />
      </div>
    </section>
  )
}
