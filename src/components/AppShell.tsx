import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav.tsx'

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

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
      </header>
      <main
        ref={mainRef}
        id="contenuto"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-8 pb-6 outline-none"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
