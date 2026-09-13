# CrediPro — Fase 0 (Setup)

Esqueleto inicial del proyecto: React + Vite + TypeScript + Tailwind + Supabase.

## Estructura

```
src/
├── app/            # (se llenará en Fase 1 con las rutas reales: auth, onboarding, dashboard, admin)
├── components/ui/  # Button, Input, Card, Badge, Modal, Table (base de la librería visual)
├── features/       # lógica de negocio agrupada por dominio (clientes, préstamos, pagos...)
├── hooks/
├── services/       # llamadas a Supabase / Edge Functions
├── lib/            # supabaseClient.ts
├── types/          # tipos, incluido database.ts (se regenera desde Supabase)
├── validations/     # esquemas zod
└── utils/
```

## Pasos para arrancar

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear tu proyecto en https://supabase.com (si no lo tienes aún).

3. Copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de tu proyecto (Settings → API en el dashboard de Supabase).

4. Levantar el entorno de desarrollo:
   ```bash
   npm run dev
   ```

5. (Cuando ya tengas tablas creadas en Supabase, Fase 1) regenerar tipos:
   ```bash
   npx supabase gen types typescript --project-id <tu-project-ref> > src/types/database.ts
   ```

## Despliegue

Conectar el repo de GitHub directamente en https://vercel.com/new — Vercel detecta Vite automáticamente. Agregar las mismas variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en Vercel → Settings → Environment Variables.

## Fase 1 — Autenticación, organizaciones y RLS

### 1. Aplicar la migración SQL

En el dashboard de Supabase → SQL Editor, pega y ejecuta el contenido de:
```
supabase/migrations/0001_core_schema.sql
```
O si usas la CLI de Supabase:
```bash
npx supabase db push
```

Esto crea: `organizations`, `profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`,
las funciones helper (`current_organization_id()`, `is_platform_admin()`, `has_permission()`),
la función RPC `create_organization()`, el trigger que crea el `profile` automáticamente al
registrarse, y todas las políticas RLS.

### 2. Regenerar los tipos de TypeScript

```bash
npx supabase gen types typescript --project-id <tu-project-ref> > src/types/database.ts
```

### 3. Habilitar Google OAuth (opcional)

Si vas a usar el botón "Continuar con Google": Supabase → Authentication → Providers → Google,
y configurar el Client ID/Secret desde Google Cloud Console.

### 4. Convertir un usuario en administrador general de CrediPro

Por ahora esto se hace manualmente (no hay UI todavía — es intencional, es una operación sensible):
```sql
update public.profiles set is_platform_admin = true where email = 'tu-correo@ejemplo.com';
```

### 5. Probar el flujo completo

```
/registro → crea cuenta → /onboarding/crear-organizacion → crea org (RPC) →
/onboarding/seleccionar-plan (placeholder, Fase 2) → /dashboard
```

Verifica en la tabla `profiles` que `organization_id` quedó asignado, y en `user_roles`
que se creó el registro con el rol `admin`.

## Siguiente paso

Fase 2: planes, versiones de precio, suscripciones, trial de 15 días, integración con Wompi
y webhooks.
