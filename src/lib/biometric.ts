// Helper de autenticación biométrica (Capacitor).
// Solo funciona dentro del APK nativo (Android/iOS). En el navegador web la
// biometría no está disponible y estas funciones devuelven false sin romper nada.
// Se usa import dinámico para no evaluar el plugin durante el prerender web.

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const info = await BiometricAuth.checkBiometry()
    return info.isAvailable
  } catch {
    return false
  }
}

/**
 * Lanza el prompt biométrico nativo. Devuelve true si el usuario se autenticó,
 * false si canceló, falló o no hay soporte.
 */
export async function authenticateBiometric(
  reason = 'Confirma tu identidad'
): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
      androidTitle: 'Flowi',
      androidSubtitle: 'Desbloquea con tu biometría',
    })
    return true
  } catch {
    return false
  }
}
