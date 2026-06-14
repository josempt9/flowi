export const TOAST_EVENT = 'flowi:toast'

export type ToastType = 'success' | 'error'

export interface ToastPayload {
  message: string
  type: ToastType
}

/** Muestra un toast breve en la parte inferior. Lo renderiza <Toaster/> (root layout). */
export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, type } })
    )
  }
}
