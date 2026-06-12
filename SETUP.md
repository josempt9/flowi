# Flowi — Puesta en marcha

Pasos para dejar el MVP funcionando end-to-end.

## 1. Base de datos (OBLIGATORIO — arregla `permission denied`)

Abre el **SQL Editor** de tu proyecto en Supabase y ejecuta el archivo completo
[`supabase/setup.sql`](./supabase/setup.sql).

Esto hace:
- **Otorga privilegios** (`GRANT`) al rol `authenticated` → arregla el error
  `permission denied for table transactions`.
- Habilita **RLS** y crea la política "cada quien ve solo sus datos" en las 9 tablas.
- Crea el trigger `handle_new_user`: al registrarse un usuario se crea su `profiles`
  y se siembran sus cuentas y tarjetas iniciales.
- **Backfill**: crea perfil + seed para los usuarios que ya existían.

Es idempotente: puedes correrlo varias veces sin problema.

Luego ejecuta también [`supabase/upgrades.sql`](./supabase/upgrades.sql) (migraciones
post-MVP, Sprints 7-10): añade la columna `cat` a `credit_cards` y la tabla
`budgets` para presupuestos. Sin esto, el alta inteligente de tarjetas y la
pantalla de presupuestos fallarán.

## 2. Variables de entorno

`.env.local` (ya presente) debe tener:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # opcional por ahora
ANTHROPIC_API_KEY=...              # requerido para el parser IA
```

## 3. Correr en local

```bash
npm run dev
```

Flujo: `/signup` o `/login` → redirige a `/registro` → escribe "Café $65 Mercado Pago"
→ Continuar → confirma → guarda. Verás el movimiento en `/` y `/dashboard`.

## 4. Deploy a Vercel (pendiente)

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → New Project → importa el repo.
3. Agrega las mismas variables de entorno del paso 2 en *Settings → Environment Variables*.
4. Deploy. Vercel detecta Next.js automáticamente.

> Nota PWA: los iconos están en SVG (`public/icon.svg`, `public/icon-maskable.svg`).
> Para instalabilidad 100% en todos los navegadores, conviene añadir PNG de 192px y
> 512px y referenciarlos en `src/app/manifest.ts`.
