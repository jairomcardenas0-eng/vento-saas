# TAREAS ANTES DEL CACHE - Vento

> IA Pro: Ejecuta estas fases ANTES de implementar el cache distribuido.
> Lee `INSTRUCCIONES_COMPLETAS_PRO.md` para detalles tecnicos de cada seccion.
> Build+typecheck limpio antes y despues de cada fase.

## LO YA IMPLEMENTADO (NO rehacer)

1. Build + typecheck limpios.
2. Rate limit distribuido: `server/utils/rateLimit.ts` con Upstash Redis + fallback local.
3. Rate limit en: `analytics/collect`, `check-slug`, `orders/create`, `reviews/create`.
4. `nuxt.config.ts` tiene `upstashRedisRestUrl` y `upstashRedisRestToken`.
5. Schema: `order_status_history`, `order_events` con triggers, indices, RLS, maquina de estados.
6. `orders` tiene `assigned_to_uid`, `assigned_to_name`, `internal_notes`.
7. `freeShip` en tipos, stores, admin, storefront.
8. `previewStore` basico en `admin/appearance.vue`.
9. **Fase 1.1 completa**: Schema SQL variantes/inventario, tipos TS, CRUD admin drag-drop, reserva stock en pedidos, liberacion al cancelar, `inventory.vue`, badges stock storefront.

---

## TAREAS PENDIENTES (Ejecutar en orden)

### Fase 0 - Limpieza Final

**0.1 Headers Seguridad en `nuxt.config.ts`:**
```typescript
app: {
  head: {
    meta: [
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
      { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.upstash.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self';" }
    ]
  }
}
```
Ajustar CSP para no romper Supabase, Tailwind, imagenes.

**0.2 Corregir `any` real:**
En `server/api/orders/create.post.ts:174`, tipar `entry` como `DeliveryZone` (ya importado).

**0.3 Revisar `select('*')` residual:**
Grep `\.select\('\*'\)` en `app/` y `server/`. Reemplazar por columnas exactas donde aplique.

---

### Fase 1.2 - UI Pedidos Completa

La parte SQL ya esta (`order_status_history`, `order_events`, triggers). Falta solo UI.

En `app/pages/admin/orders.vue`:
- Timeline vertical por pedido usando `order_status_history` (datos desde Supabase).
- Botones cambio estado con modal para ingresar nota (actualiza `order_status_history.note`).
- Selector "Asignar a" con miembros del equipo (actualiza `assigned_to_uid` y `assigned_to_name`).
- SLA visual: verde (<15min desde `created_at`), amarillo (<1h), rojo (>1h).
- Notas internas textarea (actualiza `internal_notes`).
- Badge de estado con colores (new=azul, viewed=gris, preparing=amarillo, ready=verde, delivered=verde oscuro, cancelled=rojo).
- Contador de pedidos por estado en sidebar.
- Al abrir un pedido por primera vez, marcar como `viewed` (trigger o explicito).

---

### Fase 1.3 - Planes y Autorizacion Manual

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 1.3.

**1.3.1 Schema SQL:**
Agregar a `supabase/schema.sql`:
```sql
create table if not exists public.catalog_plans (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  plan_type text not null check (plan_type in ('free','basic','pro','enterprise')),
  status text not null check (status in ('trial','active','paused','blocked','expired')),
  activated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  payment_reference text,
  notes text,
  unique(catalog_id)
);

create table if not exists public.catalog_plan_history (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  previous_plan text,
  new_plan text not null,
  changed_by uuid references auth.users(id),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);
```
Indices y RLS con has_catalog_permission.

**1.3.2 Limites por Plan:**
Crear `server/utils/plans.ts`:
```typescript
const PLAN_LIMITS = {
  free: { maxProducts: 20, maxTeamMembers: 2, maxImages: 5 },
  basic: { maxProducts: 100, maxTeamMembers: 5, maxImages: 10 },
  pro: { maxProducts: 500, maxTeamMembers: 15, maxImages: Infinity },
  enterprise: { maxProducts: Infinity, maxTeamMembers: Infinity, maxImages: Infinity }
}

const PLAN_FEATURES = {
  free: ['basic_analytics'],
  basic: ['basic_analytics', 'multi_catalog'],
  pro: ['advanced_analytics', 'multi_catalog', 'webhooks', 'custom_domain'],
  enterprise: ['advanced_analytics', 'multi_catalog', 'webhooks', 'custom_domain', 'api_access']
}
```

**1.3.3 UI Planes en Admin:**
En `app/pages/admin/settings.vue`:
- Card plan actual con nombre, vencimiento, features activas.
- Notificacion 7 dias antes de vencimiento (if expires_at < now + 7d).
- Boton "Upgrade plan" (link a pricing o master panel).

**1.3.4 Panel Master de Planes:**
En `app/pages/master/index.vue`:
- Columna plan en tabla de catalogos.
- Boton "Cambiar plan" con modal (seleccionar plan, razon).
- Filtros por status plan (trial, active, paused, expired).
- Alertas de catalogos expirados.

**1.3.5 Enforcement:**
Al crear producto/miembro/imagen, verificar plan y rechazar 400 si excede limite.
En `server/api/products/create.post.ts`, `server/api/team/invite.post.ts`, upload endpoints.

---

### Fase 2.1 - Validacion Server Dura

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 2.2.

**2.1.1 Schemas Formales:**
Instalar zod o valibot. Crear `server/schemas/` con:
- `order.schema.ts`: validacion campos pedido, cupones, zonas entrega.
- `product.schema.ts`: validacion nombre, descripcion, precio, stock.
- `catalog.schema.ts`: validacion slug, nombre, whatsapp.
- `coupon.schema.ts`: validacion expiracion, usos, minimos.

Usar estos schemas en TODOS los endpoints de mutacion.

**2.1.2 Limites de Longitud:**
- Nombre producto: max 100 caracteres.
- Descripcion: max 2000 caracteres.
- Slug: max 50, solo alfanumerico + guiones.
- Notas: max 500 caracteres.
- Cupon code: max 20 caracteres.
- Email: max 100, formato valido.

**2.1.3 Validacion Cupones:**
En `server/api/orders/create.post.ts`:
- Verificar que cupon existe y esta activo.
- Verificar expiracion (if expires_at < now, reject).
- Verificar usos maximos (if used_count >= max_uses, reject).
- Verificar minimo compra (if subtotal < min_amount, reject).

**2.1.4 Validacion Zonas Entrega:**
Verificar que delivery_zone_id existe y pertenece al catalogo.

**2.1.5 Validacion Horarios:**
Verificar que catalogo esta abierto (usar `getCurrentScheduleState`).

**2.1.6 Sanitizacion:**
Sanitizar inputs publicos server-side (DOMPurify equivalente o whitelist simple).

---

### Fase 2.2 - Observabilidad

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 2.3.

**2.2.1 Sentry:**
Instalar `@sentry/vue` y `@sentry/node`.

Crear `app/plugins/sentry.client.ts`:
```typescript
import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  if (config.public.sentryDsn) {
    Sentry.init({
      app: nuxtApp.vueApp,
      dsn: config.public.sentryDsn,
      environment: config.public.sentryEnvironment || 'dev',
      tracesSampleRate: 0.1
    })
  }
})
```

Crear `server/plugins/sentry.server.ts`:
```typescript
import * as Sentry from '@sentry/node'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (config.private.sentryDsn) {
    Sentry.init({
      dsn: config.private.sentryDsn,
      environment: config.private.sentryEnvironment || 'dev',
      tracesSampleRate: 0.1
    })
  }
})
```

Agregar env vars en `nuxt.config.ts`:
```typescript
public: {
  sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
  sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || 'dev'
},
private: {
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'dev'
}
```

Sourcemaps en build (ver documentacion Sentry).

**2.2.2 Logger Centralizado:**
Crear `server/utils/logger.ts`:
```typescript
import { randomUUID } from 'crypto'

let correlationId: string | null = null

export const setCorrelationId = (id: string) => { correlationId = id }
export const getCorrelationId = () => correlationId || randomUUID()

export const logError = (context: string, error: unknown, meta?: Record<string, unknown>) => {
  console.error(`[${context}] ${getCorrelationId()}`, error, meta)
  // Persistir en audit_log si es critico
}

export const logInfo = (context: string, message: string, meta?: Record<string, unknown>) => {
  console.log(`[${context}] ${getCorrelationId()}`, message, meta)
}
```

**2.2.3 Endpoint /api/health:**
Crear `server/api/health.get.ts`:
- Uptime
- Estado de conexion Supabase
- Estado de Redis (si existe)
- Contador de errores por endpoint (si logger lo trackea)

---

### Fase 3.1 - CI/CD

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 3.1.

Crear `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npx nuxt typecheck
      - run: npm run build

  deploy-staging:
    if: github.event_name == 'pull_request'
    needs: test
    # deploy a staging environment

  deploy-production:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: test
    # deploy a production environment
    # run smoke tests post-deploy
```

---

### Fase 3.2 - Jobs y Colas

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 3.2.

Usar Supabase Edge Functions + pg_cron o `server/jobs/`:

**Jobs a implementar:**
1. Recalculo de stats diarios (analytics agregados).
2. Limpieza de analytics antiguos (>90 dias).
3. Reproceso de imagenes/thumbnails pendientes.
4. Notificaciones programadas (vencimiento planes, bajo stock).
5. Tareas periodicas de salud (verificar conexion servicios).

Crear `server/jobs/index.ts` o Edge Functions correspondientes.

---

### Fase 4 - Experiencia de Negocio

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 4.

**4.1 Onboarding Wizard:**
Crear `app/pages/onboarding/`:
- Paso 1: tipo negocio (restaurante, tienda, ferreteria, etc.)
- Paso 2: nombre, slug (validacion en tiempo real), whatsapp
- Paso 3: sugerencias categorias iniciales
- Paso 4: checklist publicacion (logo, 3+ productos, horarios)
- Deteccion config incompleta antes de publicar.

**4.2 Multi-Catalogo:**
- Busqueda de catalogos propios en admin.
- Agrupacion por negocio/brand.
- Duplicar catalogo como plantilla.
- Configuracion compartida entre sucursales.

**4.3 Permisos de Equipo Finos:**
Granulares por accion: `manageProducts`, `viewOrders`, `manageOrders`, `viewStats`, `manageSettings`, `manageAppearance`, `manageTeam`, `viewInventory`, `manageInventory`.
Expiracion invitaciones 7 dias. Aceptacion formal. Auditoria en audit_log.

---

### Fase 5 - Datos y Modelo Nacional

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 5.

**5.1 Ubicacion y Logistica:**
Schema SQL: `business_locations`, `delivery_zones`, `delivery_routes`, `drivers`.
Normalizar provincia/municipio/ciudad Cuba.
Zonas de entrega con costo y tiempo. Asignacion repartidores. Tracking entrega.

**5.2 Auditoria de Cambios:**
Schema SQL: `audit_log` (actor, action, entity, before/after, ip, user_agent).
Visible en panel master. Exportable CSV.

---

### Fase 6 - Producto y Crecimiento

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 6.

**6.1 Moderacion Master:**
Crear `app/pages/master/moderation.vue`:
- Suspender/revisar catalogos.
- Panel fraude/spam.
- Bandeja incidencias.

**6.2 Analitica Util:**
Metricas: funnel conversion, ventas por categoria/producto, ticket promedio, cohortes 7/30/90d, rendimiento por horario, metricas accionables.

---

### Fase 7 - UX Faltantes del Generador

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 7.

**7.1 Crop Modal:** Canvas 220x220, zoom 0.5x-3x, drag, salida 512x512.
**7.2 Icon Picker Lucide:** Grid 20 iconos renderizados real, click seleccionar.
**7.3 Paleta 30 Colores:** Swatches predefinidos + picker nativo, shades HSL auto.
**7.4 Live Preview:** Inline/iframe reactivo, toggle mobile/desktop 375px.
**7.5 Infinite Scroll:** 20 items inicial + IntersectionObserver + loader skeleton.
**7.6 Badge Envio Gratis:** Ya existe `freeShip` en tipos, agregar UI completa en carrito.

---

### Fase 8 - Validacion Final

Ver `INSTRUCCIONES_COMPLETAS_PRO.md` seccion 8.

**8.1 Tests Unitarios:** Stores criticos, composables, utilidades.
**8.2 Tests Integracion:** Endpoints server responden correctamente.
**8.3 Build + Typecheck:** Cero errores, cero warnings bloqueantes.
**8.4 Smoke Tests:** Home <2s, storefront <2s, admin carga, pedido end-to-end, realtime, upload, cache offline.
**8.5 Verificacion Seguridad:** No exponen datos otros catalogos, rate limit funciona, RLS bloquea cross-catalog.
**8.6 Documentacion Final:** Actualizar `CAMBIOS_APLICADOS_FINAL.md` con TODO implementado.

---

## CRITERIO DE SALIDA PARA PRODUCCION NACIONAL

La plataforma esta lista cuando:
- Alta/login/creacion catalogo sin errores.
- Pedidos validos con stock y plan confiable.
- Admin con permisos y trazabilidad.
- Observabilidad con alertas reales.
- Despliegue repetible CI/CD.
- Latencia controlada.
- Recuperacion ante fallos red.
- Datos consistentes con concurrencia.
- Build/typecheck siempre pasan.
- Rate limit protege abuso escala.
- Inventario profesional opera retail serio.
- Logistica por zonas organizada.
