import { useEffect, useState } from 'react'
import { CATEGORY_LABELS, COLOUR_LABELS, type Garment } from '../domain/types.ts'
import { GARMENT_COLOUR_SWATCH } from './colourSwatch.ts'

export function GarmentPhoto({
  garment,
  className,
  decorative = false,
}: {
  garment: Garment
  className?: string
  decorative?: boolean
}) {
  const url = useObjectUrl(garment.photo)
  const label = `${CATEGORY_LABELS[garment.category]} ${COLOUR_LABELS[garment.colour]}`

  if (!url) {
    return (
      <div
        className={className}
        style={{ backgroundColor: GARMENT_COLOUR_SWATCH[garment.colour] }}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative ? true : undefined}
      />
    )
  }

  return <img src={url} alt={decorative ? '' : label} className={className} />
}

function useObjectUrl(blob: Blob): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    let next: string
    try {
      next = URL.createObjectURL(blob)
    } catch {
      return
    }
    // The blob URL only exists after the browser creates it, then has to be revoked.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}
