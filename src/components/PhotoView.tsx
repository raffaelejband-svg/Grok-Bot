import { useEffect, useState } from 'react'

type PhotoViewProps = {
  photo: Blob
  alt: string
  className?: string
}

function useObjectUrl(blob: Blob): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    let next: string | undefined
    try {
      next = URL.createObjectURL(blob)
    } catch {
      next = undefined
    }
    // L’indirizzo della foto esiste solo nel browser: si crea al montaggio e si revoca in uscita.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(next)
    return () => {
      if (next) URL.revokeObjectURL(next)
    }
  }, [blob])

  return url
}

export function PhotoView({ photo, alt, className }: PhotoViewProps) {
  const url = useObjectUrl(photo)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = url !== undefined && failedUrl === url
  const frame = className ?? ''

  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center bg-clay-soft text-clay ${frame}`}>
        {alt ? <span className="px-4 text-center font-display text-2xl leading-tight">{alt}</span> : null}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={frame}
      onError={() => setFailedUrl(url)}
    />
  )
}
