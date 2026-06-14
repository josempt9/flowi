// Rate limiting simple en memoria (sin librerías). Por IP, ventana deslizante.
// NOTA: en serverless (Vercel) la memoria no se comparte entre instancias ni
// sobrevive a cold starts → es best-effort, suficiente para frenar abuso básico.
// Para límites estrictos a escala se necesitaría un store compartido (Upstash/Redis).

const WINDOW_MS = 60_000
const MAX_REQUESTS = 30

const hits = new Map<string, number[]>()

/** Devuelve la IP del cliente desde los headers (x-forwarded-for en Vercel). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * true si la petición está dentro del límite; false si lo excede.
 * Por defecto 30 req/min por IP.
 */
export function checkRateLimit(
  ip: string,
  max = MAX_REQUESTS,
  windowMs = WINDOW_MS
): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)

  if (recent.length >= max) {
    hits.set(ip, recent)
    return false
  }

  recent.push(now)
  hits.set(ip, recent)

  // Limpieza oportunista para que el Map no crezca sin control.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(key)
    }
  }

  return true
}
