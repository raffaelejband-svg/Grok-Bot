import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState.tsx'
import { GarmentFilters } from '../components/GarmentFilters.tsx'
import { GarmentForm } from '../components/GarmentForm.tsx'
import { PhotoView } from '../components/PhotoView.tsx'
import { EMPTY_GARMENT_FILTER, filterGarments, type GarmentFilter } from '../domain/garments.ts'
import { CATEGORY_LABELS, COLOUR_LABELS, SEASON_LABELS, type Garment } from '../domain/types.ts'
import { addGarment, deleteGarment, listGarments, updateGarment } from '../storage/db.ts'

type Mode = { type: 'browse' } | { type: 'create' } | { type: 'edit'; garment: Garment }

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; garments: Garment[] }

function garmentLabel(garment: Garment): string {
  return `${CATEGORY_LABELS[garment.category]}, ${COLOUR_LABELS[garment.colour]}, ${SEASON_LABELS[garment.season]}`
}

export function GuardarobaPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const loadId = useRef(0)
  const seenMode = useRef<string | null>(null)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [filter, setFilter] = useState<GarmentFilter>(EMPTY_GARMENT_FILTER)
  const [mode, setMode] = useState<Mode>({ type: 'browse' })

  const modeKey = mode.type === 'edit' ? `edit:${mode.garment.id}` : mode.type

  useEffect(() => {
    const id = ++loadId.current
    let cancelled = false
    listGarments()
      .then((garments) => {
        if (cancelled || id !== loadId.current) return
        setLoad({ status: 'ready', garments })
      })
      .catch(() => {
        if (cancelled || id !== loadId.current) return
        setLoad({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    const first = seenMode.current === null
    seenMode.current = modeKey
    const main = document.getElementById('contenuto')
    if (main && typeof main.scrollTo === 'function') main.scrollTo(0, 0)
    if (!first) headingRef.current?.focus()
  }, [modeKey])

  function bumpLoad() {
    loadId.current += 1
  }

  async function saveNew(garment: Garment) {
    await addGarment(garment)
    bumpLoad()
    setLoad((current) => {
      const garments = current.status === 'ready' ? current.garments : []
      return { status: 'ready', garments: [garment, ...garments.filter((item) => item.id !== garment.id)] }
    })
    setFilter(EMPTY_GARMENT_FILTER)
    setMode({ type: 'browse' })
  }

  async function saveExisting(garment: Garment) {
    await updateGarment(garment)
    bumpLoad()
    setLoad((current) => {
      if (current.status !== 'ready') return { status: 'ready', garments: [garment] }
      return {
        status: 'ready',
        garments: current.garments.map((item) => (item.id === garment.id ? garment : item)),
      }
    })
    setMode({ type: 'browse' })
  }

  async function removeGarment(id: string) {
    await deleteGarment(id)
    bumpLoad()
    setLoad((current) => {
      if (current.status !== 'ready') return { status: 'ready', garments: [] }
      return { status: 'ready', garments: current.garments.filter((item) => item.id !== id) }
    })
    setMode({ type: 'browse' })
  }

  if (mode.type === 'create' || mode.type === 'edit') {
    const editing = mode.type === 'edit' ? mode.garment : undefined
    return (
      <GarmentForm
        key={editing?.id ?? 'new'}
        headingRef={headingRef}
        garment={editing}
        onCancel={() => setMode({ type: 'browse' })}
        onSave={editing ? saveExisting : saveNew}
        onDelete={editing ? () => removeGarment(editing.id) : undefined}
      />
    )
  }

  const garments = load.status === 'ready' ? load.garments : []
  const visible = filterGarments(garments, filter)

  return (
    <section className="flex flex-1 flex-col">
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl leading-none tracking-tight outline-none">
        Guardaroba
      </h1>
      <p className="mt-3 text-lg leading-snug text-muted">I capi che hai davvero, in un unico posto.</p>

      {load.status === 'loading' ? <p className="mt-8 text-lg text-muted">Sto aprendo il guardaroba…</p> : null}

      {load.status === 'error' ? (
        <div className="mt-8 rounded-[2rem] border border-line bg-paper px-6 py-10 text-center">
          <p role="alert" className="text-lg leading-snug">
            Non riesco ad aprire il guardaroba su questo dispositivo.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoad({ status: 'loading' })
              setReloadKey((value) => value + 1)
            }}
            className="mt-6 inline-flex min-h-14 items-center justify-center rounded-full bg-clay px-6 text-lg font-medium text-paper outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
          >
            Riprova
          </button>
        </div>
      ) : null}

      {load.status === 'ready' ? (
        <>
          <button
            type="button"
            onClick={() => setMode({ type: 'create' })}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-clay px-6 text-lg font-medium text-paper outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
          >
            Aggiungi un capo
          </button>

          {garments.length === 0 ? (
            <div className="mt-6 flex flex-1">
              <EmptyState
                icon="hanger"
                title="Il guardaroba è ancora vuoto"
                text="Aggiungi una foto: il capo resta solo su questo telefono."
              />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <GarmentFilters filter={filter} total={garments.length} visible={visible.length} onChange={setFilter} />
              </div>
              {visible.length > 0 ? (
                <ul aria-label="Capi nel guardaroba" className="mt-6 grid grid-cols-2 gap-3">
                  {visible.map((garment) => (
                    <li key={garment.id}>
                      <button
                        type="button"
                        aria-label={garmentLabel(garment)}
                        onClick={() => setMode({ type: 'edit', garment })}
                        className="w-full overflow-hidden rounded-[1.5rem] border border-line bg-paper text-left outline-none focus-visible:ring-2 focus-visible:ring-clay"
                      >
                        <PhotoView photo={garment.photo} alt="" className="aspect-[3/4] w-full object-cover" />
                        <span className="block px-3 pt-3 font-medium">{CATEGORY_LABELS[garment.category]}</span>
                        <span className="block px-3 pt-1 pb-3 text-sm text-muted">
                          {COLOUR_LABELS[garment.colour]} · {SEASON_LABELS[garment.season]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  )
}
