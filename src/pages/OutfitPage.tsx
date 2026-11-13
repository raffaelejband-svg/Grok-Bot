import { EmptyState } from '../components/EmptyState.tsx'

export function OutfitPage() {
  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Outfit</h1>
      <p className="mt-3 text-lg leading-snug text-muted">I look creati con i vestiti che hai già.</p>
      <div className="mt-8 flex flex-1">
        <EmptyState
          icon="layers"
          title="Nessun outfit"
          text="Quando salverai una combinazione di capi, la ritroverai in questa pagina."
        />
      </div>
    </section>
  )
}
