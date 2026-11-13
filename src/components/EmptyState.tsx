import { HangerIcon, HeartIcon, LayersIcon } from './icons.tsx'

type EmptyStateProps = {
  title: string
  text: string
  icon: 'hanger' | 'layers' | 'heart'
}

const ICONS = {
  hanger: HangerIcon,
  layers: LayersIcon,
  heart: HeartIcon,
}

export function EmptyState({ title, text, icon }: EmptyStateProps) {
  const Icon = ICONS[icon]

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center rounded-[2rem] border border-line bg-paper px-6 py-14 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-clay-soft text-clay">
        <Icon className="size-8" />
      </div>
      <h2 className="font-display text-[1.7rem] leading-tight tracking-tight">{title}</h2>
      <p className="mt-3 max-w-full text-base leading-relaxed text-muted">{text}</p>
    </div>
  )
}
