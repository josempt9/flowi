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
