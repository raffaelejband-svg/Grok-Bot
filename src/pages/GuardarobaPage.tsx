import { EmptyState } from '../components/EmptyState.tsx'

export function GuardarobaPage() {
  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Guardaroba</h1>
      <p className="mt-3 text-lg leading-snug text-muted">I capi che hai davvero, in un unico posto.</p>
      <div className="mt-8 flex flex-1">
        <EmptyState
          icon="hanger"
          title="Il guardaroba è ancora vuoto"
          text="Qui vedrai i capi che aggiungi. Foto e vestiti restano solo su questo telefono."
        />
      </div>
    </section>
  )
}
