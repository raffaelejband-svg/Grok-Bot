/**
 * Le foto grandi della scheda SD vengono ridotte solo per la copia sull’account.
 * Sul dispositivo resta il file originale.
 */
const SHRINK_ABOVE_BYTES = 500_000
const MAX_EDGE = 1600

export async function shrinkPhoto(blob: Blob): Promise<Blob> {
  if (blob.size < SHRINK_ABOVE_BYTES) return blob
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return blob
  try {
    const bitmap = await createImageBitmap(blob)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close?.()
      return blob
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const shrunk = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.82)
    })
    if (!shrunk || shrunk.size >= blob.size) return blob
    return shrunk
  } catch {
    return blob
  }
}
