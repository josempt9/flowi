import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

// El esquema y el prompt se construyen por petición para incluir las
// categorías del usuario (Sprint C5). Si no se envían, se usa la lista default.
function buildTransactionSchema(categories: string[]) {
  return z.object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.number(),
    account: z.string().nullable(),
    card: z.string().nullable(),
    category: z.enum(categories as [string, ...string[]]),
    description: z.string(),
    confidence: z.number(),
    confidence_reason: z.string(),
  })
}

function buildSystemPrompt(categories: string[]): string {
  return `Eres un parser de transacciones financieras para un usuario mexicano.
Tu tarea es interpretar texto libre y extraer datos estructurados de una transacción.

Tipos válidos (campo "type"): expense, income, transfer, withdrawal, card_payment, deposit.
Categorías válidas (campo "category"): ${categories.join(', ')}.

Reglas de interpretación:
- Si el texto menciona nómina, sueldo o ingreso → type: "income".
- Si menciona retiro o cajero → type: "withdrawal".
- Si menciona pago de tarjeta → type: "card_payment".
- Si menciona transferencia → type: "transfer".
- En cualquier otro caso de salida de dinero → type: "expense".
- El monto ("amount") siempre es un número positivo.
- "account" es el nombre exacto de la cuenta del usuario si lo identificas, o null.
- "card" es el nombre exacto de la tarjeta del usuario si lo identificas, o null.
- "description" es una descripción limpia de 2 a 4 palabras.
- "confidence" es un número entre 0 y 1 que refleja qué tan seguro estás de la interpretación.
- "confidence_reason" explica brevemente por qué asignaste ese nivel de confianza.
- Usa confidence < 0.7 si la cuenta o tarjeta no están claras.
- Usa confidence < 0.5 si el monto no aparece explícito en el texto.`
}

export async function POST(request: Request) {
  if (!checkRateLimit(getClientIp(request))) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un minuto e intenta de nuevo.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la petición debe ser JSON válido.' },
      { status: 400 }
    )
  }

  const { input, accounts, aliases, categories } = (body ?? {}) as {
    input?: unknown
    accounts?: unknown
    aliases?: unknown
    categories?: unknown
  }

  if (typeof input !== 'string' || input.trim() === '') {
    return NextResponse.json(
      { error: 'El campo "input" es obligatorio y debe ser un string no vacío.' },
      { status: 400 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' },
      { status: 500 }
    )
  }

  const accountsContext = JSON.stringify(accounts ?? [])
  const aliasesContext = JSON.stringify(aliases ?? [])

  const requestedCats = Array.isArray(categories)
    ? (categories as unknown[]).filter(
        (c): c is string => typeof c === 'string' && c.trim() !== ''
      )
    : []
  const cats = requestedCats.length ? requestedCats : [...CATEGORIES]

  try {
    const message = await anthropic.messages.parse({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: buildSystemPrompt(cats),
      output_config: {
        format: zodOutputFormat(buildTransactionSchema(cats)),
      },
      messages: [
        {
          role: 'user',
          content: `Cuentas conocidas del usuario: ${accountsContext}
Aliases personalizados: ${aliasesContext}

Texto a interpretar: "${input}"`,
        },
      ],
    })

    if (!message.parsed_output) {
      return NextResponse.json(
        { error: 'No se pudo interpretar la transacción.' },
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
      { error: 'Error inesperado al procesar la transacción.' },
      { status: 500 }
    )
  }
}
