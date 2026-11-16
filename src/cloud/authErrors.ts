const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Esiste già un account con questa email. Accedi.',
  'auth/invalid-email': 'Questa email non va bene.',
  'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
  'auth/invalid-credential': 'Email o password non corretti.',
  'auth/wrong-password': 'Email o password non corretti.',
  'auth/user-not-found': 'Email o password non corretti.',
  'auth/too-many-requests': 'Troppi tentativi. Aspetta un momento e riprova.',
  'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google. Puoi riprovare.',
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di Google. Consentila e riprova.',
  'auth/unauthorized-domain': 'Questo sito non è ancora tra i domini autorizzati del progetto Firebase.',
  'auth/network-request-failed': 'Non c’è rete. I vestiti restano su questo dispositivo.',
  'auth/operation-not-allowed': 'Questo tipo di accesso non è attivo nel progetto Firebase.',
  'auth/invalid-api-key': 'La configurazione di Firebase non è valida. Controlla i valori pubblici.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La configurazione di Firebase non è valida. Controlla i valori pubblici.',
}

export function firebaseErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return ''
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'Sincronizzazione da attivare.') return error.message
  const code = firebaseErrorCode(error)
  return MESSAGES[code] ?? 'Non sono riuscito a entrare. Riprova.'
}
