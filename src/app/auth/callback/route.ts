import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Intercambia el `code` de OAuth (Google) por una sesión y deja las cookies.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/registro'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Sin código o con error: de vuelta al login.
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
