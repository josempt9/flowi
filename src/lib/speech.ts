// Wrapper mínimo y tipado sobre la Web Speech API (SpeechRecognition).
// Soportada en Chrome (incluido Chrome Android). En navegadores sin soporte
// los getters devuelven null/false y la UI oculta el botón de voz.

export interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

export interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
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
