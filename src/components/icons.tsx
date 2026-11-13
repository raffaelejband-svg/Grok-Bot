type IconProps = {
  className?: string
}

export function HangerIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4.2a1.8 1.8 0 0 1 1.8 1.8c0 .8-.5 1.3-1.1 1.6" />
      <path d="M12.7 7.6 12 8.5" />
      <path d="M4.2 18.2 12 8.5l7.8 9.7" />
      <path d="M3.4 18.2h17.2" />
    </svg>
  )
}

export function LayersIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="7" width="12" height="12" rx="2.2" />
      <path d="M16.5 7V5.8A1.8 1.8 0 0 0 14.7 4H5.8A1.8 1.8 0 0 0 4 5.8v8.9A1.8 1.8 0 0 0 5.8 16.5H7" />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19.2s-6.4-3.9-6.4-8.2A3.5 3.5 0 0 1 12 8.2a3.5 3.5 0 0 1 6.4 2.8c0 4.3-6.4 8.2-6.4 8.2z" />
    </svg>
  )
}
