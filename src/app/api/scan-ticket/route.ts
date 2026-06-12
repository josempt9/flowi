import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TRANSACTION_TYPES = [
  'expense',
  'income',
  'transfer',
  'withdrawal',
  'card_payment',
  'deposit',
] as const

const CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Hogar',
  'Salud',
  'Entretenimiento',
  'Ropa',
  'Educación',
  'Nómina',
  'Servicios',
  'General',
] as const

const TransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number(),
  account: z.string().nullable(),
  card: z.string().nullable(),
  category: z.enum(CATEGORIES),
  description: z.string(),
  confidence: z.number(),
  confidence_reason: z.string(),
})

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de tickets y recibos de compra mexicanos a partir de una foto.
Identifica el TOTAL pagado, el comercio y la categoría más probable.

Categorías válidas: Alimentación, Transporte, Hogar, Salud, Entretenimiento, Ropa, Educación, Nómina, Servicios, General.

Reglas:
- "type" casi siempre es "expense" (un ticket es un gasto), salvo evidencia clara de lo contrario.
- "amount" es el TOTAL del ticket, número positivo.
- "description" es el nombre del comercio en 2-4 palabras.
- "account" y "card": usa el nombre si lo identificas en el ticket, si no null.
- "confidence" entre 0 y 1: baja si la imagen es borrosa o el total no es claro.
- "confidence_reason" explica brevemente el nivel de confianza.`

export async function POST(request: Request) {
  let body: { image?: unknown; mediaType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const rawImage = typeof body.image === 'string' ? body.image : ''
  const image = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage
  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : 'image/jpeg'

  if (!image) {
    return NextResponse.json(
      { error: 'El campo "image" (base64) es obligatorio.' },
      { status: 400 }
    )
  }
  if (!ALLOWED_MEDIA.includes(mediaType as (typeof ALLOWED_MEDIA)[number])) {
    return NextResponse.json(
      { error: 'Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.' },
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
    const message = await anthropic.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(TransactionSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as (typeof ALLOWED_MEDIA)[number],
                data: image,
              },
            },
            { type: 'text', text: 'Extrae los datos de este ticket de compra.' },
          ],
        },
      ],
    })

    if (!message.parsed_output) {
      return NextResponse.json(
        { error: 'No se pudieron extraer los datos del ticket.' },
        { status: 502 }
      )
    }
    return NextResponse.json(message.parsed_output)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de la API de Claude: ${error.message}` },
        { status: error.status ?? 502 }
      )
    }
    return NextResponse.json(
      { error: 'Error inesperado al procesar el ticket.' },
      { status: 500 }
    )
  }
}
