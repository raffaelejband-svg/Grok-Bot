/**
 * Chiave Gemini scritta da Impostazioni.
 * Resta in localStorage di questo browser. Non va nel codice, nei log, né nell’archivio dei capi.
 */
export const GEMINI_KEY_STORAGE = 'armadio-outfit.gemini-key'

export function readGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveGeminiKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) {
    localStorage.removeItem(GEMINI_KEY_STORAGE)
    return
  }
  localStorage.setItem(GEMINI_KEY_STORAGE, trimmed)
}

export function clearGeminiKey(): void {
  try {
    localStorage.removeItem(GEMINI_KEY_STORAGE)
  } catch {
    // Il browser può negare l’archivio: senza chiave si usa il riconoscimento sul telefono.
  }
}
