import { useState } from 'react'
import type { FormEvent } from 'react'
import { primaryButtonClass, secondaryButtonClass } from '../components/buttonStyles.ts'
import { GENDER_LABELS, GENDERS, type Gender, type Profile } from '../domain/types.ts'
import { useProfiles } from '../profiles/context.tsx'

const fieldClass =
  'min-h-14 w-full rounded-2xl border border-line bg-paper px-4 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-clay'

function countLine(garments: number, outfits: number): string {
  const capi = garments === 1 ? '1 capo' : `${garments} capi`
  const preferiti = outfits === 1 ? '1 preferito' : `${outfits} preferiti`
  return `${capi} · ${preferiti}`
}

export function ProfiliPage() {
  const profiles = useProfiles()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('uomo')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const onlyOne = profiles.profiles.length <= 1

  function onAdd(event: FormEvent) {
    event.preventDefault()
    void profiles.add(name, gender).then((saved) => {
      if (saved) setName('')
    })
  }

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="font-display text-4xl leading-none tracking-tight">Profili</h1>
      <p className="mt-3 text-lg leading-snug text-muted">
        Ogni persona ha i suoi capi, le sue foto e i suoi outfit. Ora stai usando {profiles.active.name}.
      </p>
      {profiles.error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-clay-soft px-4 py-3 text-base leading-snug">
          {profiles.error}
        </p>
      ) : null}

      <ul className="mt-6 flex flex-col gap-4">
        {profiles.profiles.map((profile) => (
          <li key={profile.id}>
            <ProfileCard
              profile={profile}
              active={profile.id === profiles.active.id}
              counts={profiles.counts[profile.id] ?? { garments: 0, outfits: 0 }}
              onlyOne={onlyOne}
              confirming={pendingDelete === profile.id}
              onUse={() => void profiles.switchTo(profile.id)}
              onSave={(next) => void profiles.rename(next)}
              onAskDelete={() => setPendingDelete(profile.id)}
              onCancelDelete={() => setPendingDelete(null)}
              onDelete={() => {
                setPendingDelete(null)
                void profiles.remove(profile.id)
              }}
            />
          </li>
        ))}
      </ul>

      <form className="mt-8 grid gap-4" onSubmit={onAdd}>
        <h2 className="text-2xl leading-snug font-medium">Aggiungi un profilo</h2>
        <label className="block">
          <span className="mb-2 block font-medium">Nome</span>
          <input
            className={fieldClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={40}
          />
        </label>
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-2 font-medium">Uomo o donna</legend>
          <div className="grid grid-cols-2 gap-3">
            {GENDERS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={gender === option}
                onClick={() => setGender(option)}
                className={gender === option ? primaryButtonClass : secondaryButtonClass}
              >
                {GENDER_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-base leading-snug text-muted">
          Per una donna ci sono anche gonna, vestito, tacchi e borsa. Un uomo tiene top, pantaloni, scarpe, giacca e accessori.
        </p>
        <button type="submit" className={primaryButtonClass}>
          Aggiungi
        </button>
      </form>
    </section>
  )
}

function ProfileCard({
  profile,
  active,
  counts,
  onlyOne,
  confirming,
  onUse,
  onSave,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  profile: Profile
  active: boolean
  counts: { garments: number; outfits: number }
  onlyOne: boolean
  confirming: boolean
  onUse: () => void
  onSave: (profile: Profile) => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const dirty = name.trim() !== profile.name || gender !== profile.gender

  return (
    <article className="rounded-[1.5rem] border border-line bg-paper p-4">
      <p className="text-base text-muted">{active ? 'Profilo attivo' : 'Altro profilo'}</p>
      <h2 className="mt-1 text-2xl leading-snug font-medium">{profile.name}</h2>
      <p className="mt-1 text-base text-muted">{countLine(counts.garments, counts.outfits)}</p>
      {active ? null : (
        <button type="button" className={`${secondaryButtonClass} mt-4`} onClick={onUse}>
          Usa questo profilo
        </button>
      )}
      <label className="mt-4 block">
        <span className="mb-2 block font-medium">Nome</span>
        <input className={fieldClass} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="mt-4 block">
        <span className="mb-2 block font-medium">Uomo o donna</span>
        <select className={fieldClass} value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
          {GENDERS.map((option) => (
            <option key={option} value={option}>
              {GENDER_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      {dirty ? (
        <button
          type="button"
          className={`${primaryButtonClass} mt-4`}
          onClick={() => onSave({ ...profile, name, gender })}
        >
          Salva
        </button>
      ) : null}
      {onlyOne ? (
        <p className="mt-4 text-base leading-snug text-muted">Serve almeno un profilo.</p>
      ) : confirming ? (
        <div className="mt-4 grid gap-3">
          <p className="text-base leading-snug">
            Eliminare {profile.name}? I capi e i preferiti di questo profilo vengono tolti.
          </p>
          <button type="button" className={primaryButtonClass} onClick={onDelete}>
            Elimina
          </button>
          <button type="button" className={secondaryButtonClass} onClick={onCancelDelete}>
            Annulla
          </button>
        </div>
      ) : (
        <button type="button" className={`${secondaryButtonClass} mt-4`} onClick={onAskDelete}>
          Elimina
        </button>
      )}
    </article>
  )
}
