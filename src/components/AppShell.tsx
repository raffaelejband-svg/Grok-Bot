import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCloud } from '../cloud/context.ts'
import { BottomNav } from './BottomNav.tsx'

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const { offer } = useCloud()

  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-20 focus:rounded-full focus:bg-clay focus:px-4 focus:py-3 focus:text-paper"
      >
        Vai al contenuto
      </a>
      <header className="shrink-0 px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <p className="font-display text-3xl leading-none tracking-tight">Armadio Outfit</p>
        <div className="mt-3 flex flex-wrap gap-x-4">
          <Link
            to="/impostazioni"
            className="inline-flex min-h-12 items-center rounded-full px-1 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
          >
            Impostazioni
          </Link>
          <Link
            to="/account"
            className="inline-flex min-h-12 items-center rounded-full px-1 text-lg font-medium text-clay outline-none focus-visible:ring-2 focus-visible:ring-clay"
          >
            Account
          </Link>
        </div>
      </header>
      <main
        ref={mainRef}
        id="contenuto"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-8 pb-6 outline-none"
      >
        {offer && pathname !== '/account' ? (
          <p className="mb-4 rounded-2xl bg-clay-soft px-4 py-3 text-base leading-snug">
            Ci sono capi su questo dispositivo da caricare sull’account.{' '}
            <Link to="/account" className="font-medium text-clay underline">
              Apri Account
            </Link>
          </p>
        ) : null}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
