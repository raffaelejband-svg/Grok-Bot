import { useState } from 'react'
import type { FormEvent } from 'react'
import { primaryButtonClass, secondaryButtonClass } from '../components/buttonStyles.ts'
import { clearGeminiKey, readGeminiKey, saveGeminiKey } from '../vision/apiKey.ts'

export function ImpostazioniPage() {
  const [saved, setSaved] = useState(() => readGeminiKey() !== '')
  const [key, setKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (key.trim() === '') {
      setMessage(saved ? 'La chiave già salvata resta su questo telefono.' : 'Incolla la chiave, poi tocca Salva.')
      return
    }
    try {
      saveGeminiKey(key)
    } catch {
      setMessage('Non riesco a salvare la chiave su questo browser.')
      return
    }
    setSaved(true)
    setKey('')
    setVisible(false)
    setMessage('Chiave salvata su questo telefono.')
  }

  function onClear() {
    clearGeminiKey()
    setSaved(false)
    setKey('')
    setMessage('Chiave tolta. Le foto restano sul telefono.')
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Impostazioni</h1>
      <p className="mt-3 text-lg leading-snug text-muted">
        Senza una chiave, il telefono riconosce il capo da solo. È meno preciso. Con la tua chiave di Google Gemini la
        foto viene letta meglio.
      </p>
      <p className="mt-3 text-lg leading-snug">
        {saved
          ? 'Una chiave è già salvata su questo telefono. Le prossime foto usano Gemini.'
          : 'Nessuna chiave. Le foto restano sul telefono.'}
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block font-medium">Chiave Gemini</span>
          <input
            type={visible ? 'text' : 'password'}
            name="chiave"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay"
          />
        </label>
        <label className="flex min-h-12 items-center gap-3 text-base">
          <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
          Mostra la chiave mentre la incollo
        </label>
        <button type="submit" className={primaryButtonClass}>
          Salva la chiave
        </button>
      </form>

      {saved ? (
        <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={onClear}>
          Cancella la chiave
        </button>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 text-lg leading-snug">
          {message}
        </p>
      ) : null}

      <div className="mt-8 rounded-[1.5rem] border border-line bg-paper p-4">
        <h2 className="text-lg font-medium">Come ottenere la chiave</h2>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-base leading-relaxed">
          <li>
            Apri{' '}
            <a
              className="font-medium text-clay underline"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Google AI Studio
            </a>{' '}
            e entra con un account Google.
          </li>
          <li>Crea una chiave API. Se chiede un progetto, va bene quello proposto.</li>
          <li>Copiala, incollala qui sopra e tocca Salva la chiave.</li>
        </ol>
        <p className="mt-4 text-base leading-relaxed text-muted">
        La chiave resta solo in questo browser. Non finisce nel codice, su GitHub, né sull’account se ne usi uno. Con
        la chiave, la foto di un capo nuovo viene inviata a Google per essere letta. Senza chiave, la foto non esce
        dal telefono.
        </p>
      </div>
    </section>
  )
}
