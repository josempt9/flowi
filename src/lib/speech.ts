// Wrapper mínimo y tipado sobre la Web Speech API (SpeechRecognition).
// Soportada en Chrome (incluido Chrome Android). En navegadores sin soporte
// los getters devuelven null/false y la UI oculta el botón de voz.

export interface SpeechAlternative {
  readonly transcript: string
}

// Numeric index signature + propiedades string-named (length/isFinal) es válido en TS.
export interface SpeechRecognitionResultLike {
  readonly length: number
  readonly isFinal: boolean
  readonly [index: number]: SpeechAlternative
}

export interface SpeechResultsLike {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResultLike
}

export interface SpeechResultEvent {
  readonly resultIndex: number
  readonly results: SpeechResultsLike
}

export interface SpeechErrorEvent {
  readonly error: string
}

export interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return getCtor() !== null
}

export function createRecognition(): SpeechRecognitionLike | null {
  const Ctor = getCtor()
  return Ctor ? new Ctor() : null
}

/**
 * Solicita explícitamente el permiso de micrófono antes de iniciar el
 * reconocimiento. En el WebView de Android (Capacitor) la Web Speech API se
 * silencia SIN error visible si el permiso no fue concedido; getUserMedia fuerza
 * el diálogo nativo del sistema. Devuelve true si el micrófono está disponible.
 *
 * En navegadores de escritorio donde SpeechRecognition ya gestiona su propio
 * permiso, un fallo aquí no debe bloquear: devolvemos true para no regresar.
 */
export async function ensureMicPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    // Sin mediaDevices (p. ej. contexto no seguro): dejamos que el reconocimiento lo intente.
    return true
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Liberamos el micrófono de inmediato; solo queríamos disparar el permiso.
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    // Permiso denegado o sin dispositivo: el llamador no debe iniciar el dictado.
    return false
  }
}
