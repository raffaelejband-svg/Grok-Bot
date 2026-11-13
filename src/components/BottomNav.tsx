import { NavLink } from 'react-router-dom'
import { HangerIcon, HeartIcon, LayersIcon } from './icons.tsx'

const ITEMS = [
  { to: '/', label: 'Guardaroba', icon: HangerIcon, end: true },
  { to: '/outfit', label: 'Outfit', icon: LayersIcon, end: false },
  { to: '/preferiti', label: 'Preferiti', icon: HeartIcon, end: false },
] as const

export function BottomNav() {
  return (
    <nav className="shrink-0 border-t border-line bg-paper" aria-label="Navigazione principale">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-base font-medium outline-none',
                'focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                isActive ? 'bg-clay-soft text-clay' : 'text-muted',
              ].join(' ')
            }
          >
            <Icon className="size-7" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
