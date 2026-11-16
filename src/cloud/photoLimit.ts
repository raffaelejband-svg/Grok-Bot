/** Stesso tetto del modulo: una foto più grande non viene copiata sull’account. */
export const MAX_CLOUD_PHOTO_BYTES = 32 * 1024 * 1024

export class PhotoTooLargeError extends Error {
  constructor() {
    super('Foto troppo grande per l’account.')
    this.name = 'PhotoTooLargeError'
  }
}
