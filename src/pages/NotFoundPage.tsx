import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Pagina non trovata</h1>
      <p className="mt-3 text-lg leading-snug text-muted">Questo indirizzo non esiste in Armadio Outfit.</p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-14 items-center justify-center self-start rounded-full bg-clay px-6 text-base font-semibold text-paper outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
      >
        Torna al guardaroba
      </Link>
    </section>
  )
}
