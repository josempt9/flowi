/** Evento global para que los hooks de datos refresquen tras una mutación. */
export const DATA_CHANGED_EVENT = 'flowi:data-changed'

/** Evento global para abrir el bottom sheet de registro desde cualquier pantalla. */
export const OPEN_REGISTER_EVENT = 'flowi:open-register'

/** Abre el bottom sheet de registro (lo escucha BottomNav en el layout). */
export function openRegisterSheet() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_REGISTER_EVENT))
  }
}

/**
 * Notifica a todos los hooks (useAccounts, useTransactions, useCards, useBudgets)
 * que los datos cambiaron y deben recargar. Útil cuando una mutación ocurre en
 * un componente distinto (p. ej. el bottom sheet de registro sobre cualquier página).
 */
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
  }
}
