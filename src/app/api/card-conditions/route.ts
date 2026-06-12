import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Búsqueda web infrecuente (solo al dar de alta una tarjeta): usamos un modelo
// con buen soporte de web search. Cámbialo si quieres ajustar costo/calidad.
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un asistente que investiga las condiciones de tarjetas de crédito MEXICANAS.
Dado el nombre de una tarjeta o banco, busca en fuentes confiables (Condusef, RECA, el sitio oficial del banco) sus condiciones.

Busca en internet y luego responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, con esta forma exacta:
{
  "institution": "nombre del banco o null",
  "cut_day": número del 1 al 31 o null,        // día de corte típico
  "payment_day": número del 1 al 31 o null,    // día límite de pago típico
  "grace_days": número o null,                 // días de gracia
  "cat": número o null,                         // CAT promedio en % (ej. 45.3)
  "cashback_rate": número o null,               // como fracción (ej. 0.01 = 1%)
  "annual_fee": número o null,                  // anualidad en MXN
  "confidence": "alta" | "media" | "baja",
  "note": "advertencia breve: las condiciones varían por producto/cliente y deben confirmarse"
}

Reglas:
- Si no encuentras un dato, usa null. NO inventes números.
- cut_day y payment_day muchas veces dependen del cliente; si solo hay rango o son variables, deja null y acláralo en note.
- confidence "baja" si la info es genérica o no específica de esa tarjeta.
- Responde solo el JSON.`

function extractJson(text: string): unknown | null {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json(
      { error: 'El campo "name" (nombre de la tarjeta o banco) es obligatorio.' },
      { status: 400 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' },
      { status: 500 }
    )
  }

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content: `Investiga las condiciones de la tarjeta de crédito: "${name}".`,
        },
      ],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const parsed = extractJson(text)
    if (!parsed) {
      return NextResponse.json(
        { error: 'No se pudieron interpretar las condiciones encontradas.' },
        { status: 502 }
      )
    }

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de la API de Claude: ${error.message}` },
        { status: error.status ?? 502 }
      )
    }
    return NextResponse.json(
      { error: 'Error inesperado al buscar las condiciones.' },
      { status: 500 }
    )
  }
}
