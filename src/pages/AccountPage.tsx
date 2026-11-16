import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { primaryButtonClass, secondaryButtonClass } from '../components/buttonStyles.ts'
import { useCloud } from '../cloud/context.ts'

const fieldClass =
  'min-h-14 w-full rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay'

function offerCount(offer: { garments: number; outfits: number }): string {
  const parts: string[] = []
  if (offer.garments === 1) parts.push('1 capo')
  else if (offer.garments > 1) parts.push(`${offer.garments} capi`)
  if (offer.outfits === 1) parts.push('1 preferito')
  else if (offer.outfits > 1) parts.push(`${offer.outfits} preferiti`)
  return parts.join(' e ')
}

export function AccountPage() {
  const cloud = useCloud()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(mode: 'in' | 'up', event?: FormEvent) {
    event?.preventDefault()
    setFormError(null)
    if (email.trim() === '' || password === '') {
      setFormError('Scrivi email e password.')
      return
    }
    if (mode === 'up' && password.length < 6) {
      setFormError('La password deve avere almeno 6 caratteri.')
      return
    }
    try {
      if (mode === 'in') await cloud.signIn(email.trim(), password)
      else await cloud.signUp(email.trim(), password)
    } catch {
      // Il messaggio sta nel contesto.
    }
  }

  const alert = formError ?? cloud.error

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Account</h1>

      {!cloud.configured ? (
        <>
          <h2 className="mt-6 text-2xl leading-snug font-medium">Sincronizzazione da attivare</h2>
          <p className="mt-3 text-lg leading-snug">
            Per avere lo stesso guardaroba su telefono e computer serve un collegamento a Firebase, il servizio
            gratuito di Google. Finché non è attivo, i vestiti restano su questo dispositivo e l’app si usa come
            sempre.
          </p>
          <p className="mt-3 text-lg leading-snug">
            La chiave Gemini, se l’hai salvata in Impostazioni, resta solo su questo dispositivo.
          </p>
          <Link to="/impostazioni" className={`${secondaryButtonClass} mt-6`}>
            Apri Impostazioni
          </Link>
        </>
      ) : null}

      {cloud.configured && cloud.starting ? <p className="mt-6 text-lg text-muted">Controllo l’accesso…</p> : null}

      {cloud.configured && !cloud.starting && !cloud.user ? (
        <>
          <p className="mt-3 text-lg leading-snug text-muted">
            Entra per ritrovare gli stessi capi, le foto e i preferiti su telefono e computer.
          </p>
          <form className="mt-6 grid gap-4" onSubmit={(event) => void submit('in', event)}>
            <label className="block">
              <span className="mb-2 block font-medium">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-medium">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <button type="submit" className={primaryButtonClass} disabled={cloud.busy}>
              {cloud.busy ? 'Entro…' : 'Accedi'}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={cloud.busy}
              onClick={() => void submit('up')}
            >
              Crea un account
            </button>
          </form>
          <button
            type="button"
            className={`${secondaryButtonClass} mt-3`}
            disabled={cloud.busy}
            onClick={() => {
              setFormError(null)
              void cloud.signInGoogle().catch(() => {})
            }}
          >
            Continua con Google
          </button>
          <p className="mt-4 text-base leading-relaxed text-muted">
            La chiave Gemini resta su questo dispositivo e non entra nell’account.
          </p>
        </>
      ) : null}

      {cloud.user ? (
        <>
          <p className="mt-3 text-lg leading-snug">
            {cloud.user.email ? `Sei dentro come ${cloud.user.email}.` : 'Sei dentro.'}
          </p>

          {cloud.blocked ? (
            <p className="mt-4 text-lg leading-snug" role="alert">
              Questo dispositivo ha già il guardaroba di un altro account. Non lo mescolo e non lo carico.
            </p>
          ) : null}

          {cloud.offer ? (
            <div className="mt-6 rounded-[1.5rem] border border-line bg-paper p-4">
              <p className="text-lg leading-snug">
                Vuoi caricare sull’account il guardaroba già presente su questo dispositivo? Qui ci sono{' '}
                {offerCount(cloud.offer)}. Li ritrovi poi anche sugli altri telefoni e computer. Se scegli no, questi
                restano solo qui. Quelli che aggiungi dopo vanno sull’account.
              </p>
              <button
                type="button"
                className={`${primaryButtonClass} mt-4`}
                disabled={cloud.busy}
                onClick={() => void cloud.acceptOffer()}
              >
                Sì, carica il guardaroba
              </button>
              <button
                type="button"
                className={`${secondaryButtonClass} mt-3`}
                disabled={cloud.busy}
                onClick={() => void cloud.declineOffer()}
              >
                No, lasciali qui
              </button>
            </div>
          ) : null}

          {cloud.manualUpload && !cloud.offer ? (
            <div className="mt-6">
              <p className="text-lg leading-snug">
                Su questo dispositivo ci sono capi che non sono sull’account.
              </p>
              <button
                type="button"
                className={`${primaryButtonClass} mt-4`}
                disabled={cloud.busy}
                onClick={() => void cloud.acceptOffer()}
              >
                Carica i capi di questo dispositivo
              </button>
            </div>
          ) : null}

          {cloud.progress ? (
            <p role="status" className="mt-4 text-lg leading-snug">
              {cloud.progress}
            </p>
          ) : null}

          {!cloud.blocked && !cloud.offer && !cloud.warning ? (
            <p className="mt-4 text-lg leading-snug text-muted">
              Capi, foto e preferiti di questo account sono anche su questo dispositivo. La chiave Gemini resta qui.
            </p>
          ) : null}

          {cloud.warning === 'incomplete' || cloud.warning === 'both' ? (
            <p role="alert" className="mt-4 text-lg leading-snug">
              Non sono riuscito a copiare tutto. I vestiti restano su questo dispositivo. Tocca Aggiorna il guardaroba
              per riprovare.
            </p>
          ) : null}
          {cloud.warning === 'too-large' || cloud.warning === 'both' ? (
            <p className="mt-4 text-lg leading-snug">
              Alcune foto sono troppo grandi per l’account e restano solo su questo dispositivo.
            </p>
          ) : null}

          {!cloud.blocked ? (
            <button
              type="button"
              className={`${secondaryButtonClass} mt-6`}
              disabled={cloud.busy}
              onClick={() => void cloud.refresh()}
            >
              Aggiorna il guardaroba
            </button>
          ) : null}
          <button
            type="button"
            className={`${primaryButtonClass} mt-3`}
            disabled={cloud.busy}
            onClick={() => void cloud.signOut().catch(() => {})}
          >
            Esci
          </button>
          <p className="mt-3 text-base leading-relaxed text-muted">Esci lascia i vestiti su questo dispositivo.</p>
        </>
      ) : null}

      {alert ? (
        <p role="alert" className="mt-4 text-lg leading-snug text-clay">
          {alert}
        </p>
      ) : null}
    </section>
  )
}
