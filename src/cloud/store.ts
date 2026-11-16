/** Lettura e scrittura di poche chiavi, come localStorage. Nei test è un oggetto in memoria. */
export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
