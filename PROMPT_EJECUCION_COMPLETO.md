# PROMPT DE EJECUCION OBLIGATORIA - IA PRO

> OBLIGACION ABSOLUTA: Ejecuta TODO lo que aparece en este archivo. No omitas NADA. No te detengas hasta terminar. Si necesitas 40 horas, las necesitas. Si el contexto se llena, guarda progreso en un archivo temporal y continua. NO entregues resumenes parciales. NO digas "lo dejo para despues". Implementa cada item, verifica build, y marca como hecho antes de pasar al siguiente.

---

## REGLAS INQUEBRANTABLES

1. **Build y TypeCheck pasan ANTES y DESPUES de cada sub-fase.** Si rompes algo, lo arreglas antes de avanzar.
2. **No borres funcionalidades existentes.** Lee el codigo actual antes de editar.
3. **Documenta en CAMBIOS_APLICADOS_FINAL.md** cada cambio que hagas.
4. **Si algo ya existe y funciona, NO lo rehagas.** Si existe pero esta mal, reparalo.
5. **Lee el proyecto real** antes de tocar. Grep, lee archivos, entiende la estructura.
6. **Usa los tipos y patrones existentes.** No inventes nuevas convenciones.

---

## ESTADO ACTUAL VERIFICADO (YA IMPLEMENTADO - SOLO LEE, NO TOQUES)

- Build + typecheck limpios (pasan actualmente).
- Rate limit distribuido: `server/utils/rateLimit.ts` con Upstash Redis + fallback local.
- Rate limit integrado en: `analytics/collect`, `check-slug`, `orders/create`, `reviews/create`.
- `nuxt.config.ts` tiene `upstashRedisRestUrl`, `upstashRedisRestToken`, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, sourcemaps.
- Schema SQL: `order_status_history`, `order_events` con triggers, indices, RLS, maquina de estados completa.
- Tabla `orders` tiene `assigned_to_uid`, `assigned_to_name`, `internal_notes`.
- `freeShip` en tipos (`CatalogProduct`), stores, admin, storefront.
- `previewStore` basico en `admin/appearance.vue`.
- **Fase 1.1 completa**: Schema SQL variantes/inventario (`product_variant_groups`, `product_variant_options`, `inventory_items`, `inventory_movements`), migracion JSONB, tipos TS (`CatalogVariantGroup`, `CatalogVariantOption`, `InventoryItem`), CRUD admin drag-drop en `products.vue`, reserva stock en `orders/create.post.ts`, liberacion al cancelar via trigger, `inventory.vue`, badges stock storefront.
- **Fase 1.3 base completa**: Schema `catalog_plans`, `catalog_plan_history`, tipos (`CatalogPlan`, `CatalogPlanType`), utilidades `server/utils/plans.ts` (`getPlanLimits`, `getPlanFeatures`, `checkPlanLimit`), UI plan en `admin/settings.vue`, panel master `master/index.vue` con filtros y cambio manual.

---

## TAREAS PENDIENTES (EJECUTAR EN ORDEN, SIN EXCEPCIONES)

---

### PARTE 1: FASE 1.2 - UI PEDIDOS COMPLETA

**Contexto**: La parte SQL ya esta (`order_status_history`, `order_events`, triggers, campos en `orders`). Falta SOLO la UI en `app/pages/admin/orders.vue` y componentes relacionados.

#### 1.1 Timeline Vertical por Pedido

Crear componente `app/components/admin/OrderTimeline.vue`:
- Recibe `orderId` y `catalogId`.
- Carga `order_status_history` y `order_events` desde Supabase, ordenados por `created_at desc`.
- Renderiza linea vertical con puntos.
- Cada punto muestra: estado (con icono y color), timestamp, `changed_by_name`, nota (si existe).
- Estados colores: `new` azul, `viewed` gris, `preparing` amarillo, `ready` verde claro, `delivered` verde oscuro, `cancelled` rojo.
- Integrar este componente en el drawer/modal de detalle de pedido en `app/pages/admin/orders.vue`.

#### 1.2 Botones Cambio de Estado

En `app/pages/admin/orders.vue`, para cada pedido en detalle:
- Botones visibles segun transiciones validas (usar logica de `server/api/orders/update.post.ts` o duplicar logica frontend).
- Transiciones: `new` -> `viewed`, `viewed` -> `preparing`, `preparing` -> `ready`, `ready` -> `delivered`, cualquiera -> `cancelled`.
- Al hacer click en cambiar estado, abrir modal con:
  - Select del nuevo estado (filtrado por transiciones validas).
  - Textarea para nota interna (opcional, guarda en `order_status_history.note`).
  - Boton "Confirmar" que llama a API update.

#### 1.3 Selector "Asignar a"

En detalle de pedido:
- Dropdown con miembros del equipo del catalogo (cargar desde tabla `catalog_access` o via composable existente).
- Al seleccionar, actualiza `assigned_to_uid` y `assigned_to_name`.
- Mostrar avatar/nombre del asignado actual.

#### 1.4 SLA Visual

En lista de pedidos y detalle:
- Calcular tiempo transcurrido desde `created_at`.
- Badge: verde < 15 minutos, amarillo < 1 hora, rojo > 1 hora.
- Mostrar tiempo transcurrido en formato legible ("Hace 5 min", "Hace 45 min", "Hace 2h").

#### 1.5 Notas Internas

- Textarea en detalle de pedido para `internal_notes`.
- Guardar al perder foco o con boton explicito.
- Mostrar icono de nota en lista si `internal_notes` no esta vacio.

#### 1.6 Contador por Estado en Sidebar

En `app/pages/admin/orders.vue` sidebar (o donde este la navegacion de pedidos):
- Contadores: Nuevos (status=new), En preparacion (preparing), Listos (ready), Cancelados (cancelled).
- Actualizar en tiempo real via Supabase realtime si es posible, o recalcular al cargar.

#### 1.7 Marcar como Viewed

- Al abrir un pedido con status `new`, automaticamente llamar API para cambiar a `viewed`.
- Esto debe reflejarse en timeline (aparece entrada `viewed`).

**Verificacion obligatoria despues de esta parte:**
- `npx nuxt typecheck` pasa.
- `npm run build` pasa.
- La UI de pedidos muestra timeline, permite cambiar estado con nota, asignar, ver SLA, notas internas.

---

### PARTE 2: FASE 1.3 - ENFORCEMENT DE PLANES

**Contexto**: Schema, tipos, utilidades y UI ya existen. Falta rechazar operaciones si excede limite.

#### 2.1 Enforcement en Creacion de Producto

En `server/api/products/create.post.ts`:
- Antes de insertar, contar productos actuales del catalogo (filtrar `products` por `catalog_id`).
- Llamar `checkPlanLimit(catalogId, 'products', currentCount + 1)`.
- Si excede, retornar 403 con mensaje: "Has alcanzado el limite de productos de tu plan. Actualiza para agregar mas."

#### 2.2 Enforcement en Invitacion de Miembro

En `server/api/team/invite.post.ts` (o endpoint equivalente):
- Contar miembros actuales del catalogo (tabla `catalog_access` o similar).
- Llamar `checkPlanLimit(catalogId, 'teamMembers', currentCount + 1)`.
- Si excede, retornar 403.

#### 2.3 Enforcement en Upload de Imagen

En endpoint de upload de producto/logo/hero:
- Contar imagenes actuales del catalogo (tabla `catalog_images` o similar, o contar productos con imagen).
- Llamar `checkPlanLimit(catalogId, 'images', currentCount + 1)`.
- Si excede, retornar 403.

#### 2.4 Enforcement en Multi-Catalogo

Si existe logica de multi-catalogo (aunque no este completo), verificar `maxCatalogs` por plan.

#### 2.5 UI Feedback

En frontend admin (`products.vue`, `team.vue`, upload components):
- Mostrar contador actual / limite del plan (ej: "12/20 productos").
- Si cerca del limite (>= 80%), mostrar warning amarillo.
- Si en el limite, deshabilitar boton crear con tooltip explicativo y link a upgrade.

**Verificacion obligatoria:** build + typecheck limpio.

---

### PARTE 3: FASE 2.1 - VALIDACION SERVER DURA

#### 3.1 Instalar Zod

```bash
npm install zod
```

#### 3.2 Crear Schemas

Crear directorio `server/schemas/`:

`server/schemas/product.schema.ts`:
```typescript
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).max(999999),
  offerPrice: z.number().min(0).optional(),
  sku: z.string().max(50).optional(),
  categoryId: z.string().uuid(),
  catalogId: z.string().uuid(),
  freeShip: z.boolean().optional(),
  featured: z.boolean().optional(),
  onSale: z.boolean().optional(),
})
```

`server/schemas/order.schema.ts`:
```typescript
import { z } from 'zod'

export const createOrderSchema = z.object({
  catalogId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(5).max(20),
  customerEmail: z.string().email().max(100).optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryZoneId: z.string().optional(),
  note: z.string().max(500).optional(),
  couponCode: z.string().max(20).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantOptionId: z.string().optional(),
    quantity: z.number().int().min(1).max(99),
  })).min(1),
})
```

`server/schemas/coupon.schema.ts`:
```typescript
import { z } from 'zod'

export const createCouponSchema = z.object({
  code: z.string().min(1).max(20),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  minAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  catalogId: z.string().uuid(),
})
```

`server/schemas/catalog.schema.ts`:
```typescript
import { z } from 'zod'

export const updateCatalogSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  whatsapp: z.string().min(5).max(20),
  description: z.string().max(500).optional(),
})
```

#### 3.3 Aplicar Schemas en Endpoints

En TODOS los endpoints de mutacion POST/PUT:
- Parsear body con `schema.parse()` o `schema.safeParse()`.
- Si falla, retornar 400 con detalle de errores.

Endpoints obligatorios a cubrir:
- `server/api/products/create.post.ts`
- `server/api/products/update.post.ts`
- `server/api/orders/create.post.ts`
- `server/api/coupons/create.post.ts`
- `server/api/catalogs/update.post.ts`
- `server/api/settings/update.post.ts`
- `server/api/appearance/update.post.ts`
- `server/api/team/invite.post.ts`

#### 3.4 Validacion de Cupones en Pedidos

En `server/api/orders/create.post.ts`:
- Si `couponCode` presente, buscar en tabla `coupons`.
- Verificar activo: `is_active = true`.
- Verificar expiracion: `expires_at IS NULL OR expires_at > now()`.
- Verificar usos: `used_count < max_uses` (o similar).
- Verificar minimo compra: `subtotal >= min_amount`.
- Si falla cualquiera, retornar 400 con razon especifica.

#### 3.5 Validacion de Zonas Entrega

En `server/api/orders/create.post.ts`:
- Si `deliveryZoneId` presente, verificar que existe en tabla `delivery_zones` (si existe tabla) o en config del catalogo.
- Verificar que pertenece al catalogo del pedido.

#### 3.6 Validacion de Horarios

En `server/api/orders/create.post.ts`:
- Usar funcion existente `getCurrentScheduleState` para verificar catalogo abierto.
- Si cerrado, retornar 400 con mensaje "El negocio esta cerrado en este horario".

#### 3.7 Sanitizacion Server-Side

Crear `server/utils/sanitize.ts`:
```typescript
export const sanitizeHtml = (input: string): string => {
  // Whitelist simple: permitir solo tags basicos si es necesario
  // Para texto plano: escapar < > & "
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

Aplicar en endpoints para campos de texto libre: `name`, `description`, `note`, `customerName`, `customerAddress`.

**Verificacion obligatoria:** build + typecheck limpio.

---

### PARTE 4: FASE 2.2 - OBSERVABILIDAD

#### 4.1 Instalar Sentry

```bash
npm install @sentry/vue @sentry/node
```

#### 4.2 Plugin Cliente

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
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
  }
})
```

#### 4.3 Plugin Server

Crear `server/plugins/sentry.server.ts`:
```typescript
import * as Sentry from '@sentry/node'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (config.private.sentryDsn) {
    Sentry.init({
      dsn: config.private.sentryDsn,
      environment: config.private.sentryEnvironment || 'dev',
      tracesSampleRate: 0.1,
    })
  }
})
```

#### 4.4 Configurar Env Vars

En `nuxt.config.ts`, agregar a runtimeConfig:
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

#### 4.5 Logger Centralizado

Crear `server/utils/logger.ts`:
```typescript
import { randomUUID } from 'crypto'

const correlationIdMap = new WeakMap<object, string>()

export const setCorrelationId = (event: object, id: string) => {
  correlationIdMap.set(event, id)
}

export const getCorrelationId = (event: object): string => {
  return correlationIdMap.get(event) || randomUUID()
}

export const logError = (event: object, context: string, error: unknown, meta?: Record<string, unknown>) => {
  const cid = getCorrelationId(event)
  console.error(`[${context}] ${cid}`, error, meta)
  // Opcional: persistir en tabla audit_log si es critico
}

export const logInfo = (event: object, context: string, message: string, meta?: Record<string, unknown>) => {
  const cid = getCorrelationId(event)
  console.log(`[${context}] ${cid}`, message, meta)
}
```

Integrar en cada endpoint: `setCorrelationId(event, randomUUID())` al inicio.

#### 4.6 Endpoint /api/health

Crear `server/api/health.get.ts`:
```typescript
export default defineEventHandler(async (event) => {
  const checks = {
    supabase: false,
    redis: false,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }

  // Verificar Supabase
  try {
    const supabase = createSupabaseServiceRoleClient(event)
    const { data, error } = await supabase.from('catalogs').select('count').limit(1)
    checks.supabase = !error
  } catch {
    checks.supabase = false
  }

  // Verificar Redis (si existe)
  try {
    const config = useRuntimeConfig(event)
    if (config.private.upstashRedisRestUrl && config.private.upstashRedisRestToken) {
      // Ping Redis
      checks.redis = true // Implementar ping real si existe cliente Redis
    } else {
      checks.redis = null // No configurado
    }
  } catch {
    checks.redis = false
  }

  const statusCode = checks.supabase ? 200 : 503

  return {
    status: checks.supabase ? 'healthy' : 'degraded',
    checks,
  }
})
```

#### 4.7 Sourcemaps en Build

En `nuxt.config.ts`, asegurar:
```typescript
vite: {
  build: {
    sourcemap: true,
  }
}
```

**Verificacion obligatoria:** build + typecheck limpio.

---

### PARTE 5: FASE 3.1 - CI/CD

#### 5.1 Crear Workflow GitHub Actions

Crear `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx nuxt typecheck
      - run: npm run build
      # Si existen tests:
      # - run: npm test

  deploy-staging:
    if: github.event_name == 'pull_request'
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy to staging environment"
      # Comandos de deploy a staging

  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy to production environment"
      # Comandos de deploy a produccion
      - run: |
          # Smoke tests post-deploy
          curl -f https://tu-dominio.com/api/health || exit 1
          curl -f https://tu-dominio.com/ || exit 1
```

Ajustar URLs de deploy segun tu plataforma (Vercel, Netlify, servidor propio).

---

### PARTE 6: FASE 3.2 - JOBS Y COLAS (BASE)

#### 6.1 Crear Directorio de Jobs

Crear `server/jobs/`:

`server/jobs/index.ts`:
```typescript
export const runDailyJobs = async () => {
  await recalcDailyStats()
  await cleanupOldAnalytics()
  await notifyExpiringPlans()
}

export const recalcDailyStats = async () => {
  // Recalcular estadisticas agregadas diarias
}

export const cleanupOldAnalytics = async () => {
  // Eliminar analytics > 90 dias
}

export const notifyExpiringPlans = async () => {
  // Notificar planes que expiran en 7 dias
}
```

#### 6.2 Trigger de Jobs

Opcion A: Supabase pg_cron (requiere extension en Supabase).
Opcion B: Endpoint protegido que llama los jobs (llamar desde cron externo).

Crear `server/api/jobs/run.post.ts` (protegido con secret):
```typescript
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-job-secret')
  const config = useRuntimeConfig(event)
  if (secret !== config.private.jobSecret) {
    throw createError({ statusCode: 401 })
  }

  await runDailyJobs()
  return { ok: true }
})
```

---

### PARTE 7: FASE 4 - EXPERIENCIA DE NEGOCIO (BASE)

#### 7.1 Onboarding Wizard (Estructura)

Crear `app/pages/onboarding/index.vue`:
- Paso 1: Seleccionar tipo negocio (restaurante, tienda, ferreteria, ropa, farmacia, servicios, belleza, tecnologia).
- Paso 2: Nombre, slug (validacion en tiempo real via API), whatsapp.
- Paso 3: Sugerencias de categorias iniciales segun tipo de negocio.
- Paso 4: Checklist publicacion (logo subido, minimo 3 productos, horarios configurados).
- Bloquear publicacion hasta que checklist este completo.
- Guardar progreso en tabla `catalogs` (campo `onboarding_step`) o localStorage.

#### 7.2 Multi-Catalogo (Estructura)

En `app/pages/admin/index.vue` (o dashboard):
- Si usuario tiene >1 catalogo, mostrar grid de catalogos.
- Boton "Duplicar catalogo" que copia productos, categorias, ajustes base (sin pedidos ni reviews).
- Grupo de catalogos por negocio/brand (campo `business_group` opcional en `catalogs`).

#### 7.3 Permisos de Equipo Finos (Estructura)

Ya existe tabla `catalog_access` con campo `role`. Extender:
- Agregar campo `permissions` JSONB a `catalog_access`: `{ manageProducts: true, viewOrders: true, ... }`.
- Actualizar `has_catalog_permission` SQL para leer de JSONB.
- UI en `app/pages/admin/team.vue` para asignar permisos granulares por miembro.
- Invitaciones expiran en 7 dias (campo `invited_at`, trigger o logica).
- Aceptacion formal: email con magic link o codigo.

---

### PARTE 8: FASE 5 - DATOS Y MODELO NACIONAL (BASE)

#### 8.1 Ubicacion Cuba

Agregar a `supabase/schema.sql`:
```sql
create table if not exists public.provinces (
  id text primary key,
  name text not null
);

create table if not exists public.municipalities (
  id text primary key,
  province_id text not null references public.provinces(id),
  name text not null
);
```

Insertar datos de provincias y municipios de Cuba.

#### 8.2 Business Locations

```sql
create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  province_id text references public.provinces(id),
  municipality_id text references public.municipalities(id),
  address text,
  lat numeric,
  lng numeric
);
```

#### 8.3 Delivery Zones

```sql
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  name text not null,
  province_ids text[],
  municipality_ids text[],
  base_fee numeric not null default 0,
  estimated_minutes integer
);
```

#### 8.4 Drivers

```sql
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  name text not null,
  phone text,
  vehicle text,
  active boolean not null default true,
  current_location_lat numeric,
  current_location_lng numeric
);
```

#### 8.5 Audit Log

```sql
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_name text,
  actor_email text,
  catalog_id uuid references public.catalogs(id),
  action text not null check (action in ('create','update','delete','login','logout','export','setting_change','plan_change','status_change')),
  entity_type text not null,
  entity_id text,
  payload_before jsonb,
  payload_after jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_audit_log_actor on public.audit_log (actor_id, created_at desc);
create index idx_audit_log_catalog on public.audit_log (catalog_id, created_at desc);
create index idx_audit_log_entity on public.audit_log (entity_type, entity_id, created_at desc);
```

Integrar en endpoints de mutacion: insertar en `audit_log` antes o despues del cambio.

---

### PARTE 9: FASE 6 - PRODUCTO Y CRECIMIENTO (BASE)

#### 9.1 Moderacion Master

Crear `app/pages/master/moderation.vue`:
- Tabla de catalogos con filtro por status (`active`, `suspended`, `draft`).
- Boton "Suspender" que cambia `status` a `suspended` con modal de razon.
- Panel de fraude: detectar pedidos/reviews sospechosos (misma IP, contenido repetido).
- Bandeja de incidencias: tabla con prioridad, estado, asignado a.

#### 9.2 Analitica Util

En `app/pages/admin/analytics.vue` (o index):
- Conversion funnel: visitas -> producto visto -> carrito -> checkout -> pedido.
- Ventas por categoria (top 5).
- Ventas por producto (top 10).
- Ticket promedio por dia/semana/mes.
- Cohortes: repeticion a 7/30/90 dias.
- Horas pico de pedidos.
- Metricas accionables: alertas cuando bajo stock + alta demanda.

---

### PARTE 10: FASE 7 - UX GENERADOR

#### 10.1 Crop Modal

Crear/mejora `app/components/admin/CropModal.vue`:
- Canvas con frame 220x220 visible.
- Zoom slider (0.5x a 3x).
- Drag para mover imagen dentro del frame.
- Salida forzada 512x512.
- Usar para logo, app icon, hero background.
- Integrar en `admin/settings.vue` y `admin/appearance.vue`.

#### 10.2 Selector Visual de Iconos Lucide

En `admin/appearance.vue` o `admin/settings.vue`:
- Grid de 20 iconos Lucide populares renderizados realmente.
- Star, Store, ShoppingBag, Coffee, Pizza, Beef, CupSoda, Gift, Truck, Phone, Heart, Home, User, Settings, Bell, Search, Menu, X, Check, ArrowRight.
- Click selecciona, preview inmediato.
- Guardar nombre en `storeIcon`.

#### 10.3 Paleta 30 Colores Predefinidos

En editor apariencia:
- Grid 30 swatches con nombres descriptivos ("Azul Royal", "Verde Esmeralda", etc.).
- Color picker nativo como alternativa.
- Al seleccionar swatch, generar shades HSL: 50, 100, 500(base), 600, 700, 900.
- Boton "Resetear colores" a defaults.

#### 10.4 Live Preview Real

En `app/components/admin/PreviewModal.vue`:
- Usar estado reactivo de Vue para reflejar cambios sin guardar.
- Inline o iframe con props reactivas.
- Toggle mobile/desktop: 375px mobile, 100% desktop.
- Label "Preview en vivo - cambios sin guardar".

#### 10.5 Infinite Scroll Storefront

En `app/components/storefront/StorefrontShop.vue`:
- Cargar 20 productos inicialmente.
- IntersectionObserver en sentinel al final.
- Cargar 20 mas al intersectar.
- Loader skeleton durante carga.
- Boton "Cargar mas" fallback.
- Mostrar total disponible.

#### 10.6 Badge Envio Gratis (Completar)

Ya existe `freeShip` en tipos. Completar UI:
- Toggle en `admin/products.vue` junto a "Destacado" y "En oferta".
- Badge "Envio gratis" en cards de producto y product sheet.
- Icono Truck de Lucide, verde.
- En carrito: si TODOS los items tienen freeShip, mostrar "Envio gratis" en resumen.
- Si algun item no tiene, calcular fee segun zona de entrega.

---

### PARTE 11: FASE 8 - VALIDACION FINAL

#### 11.1 Tests Unitarios (Minimos)

Si no hay tests, crear al menos:
- Test de `server/utils/plans.ts` (limites por plan).
- Test de `server/utils/rateLimit.ts` (rate limit local).
- Test de utilidades de storefront payload.

#### 11.2 Tests Integracion (Minimos)

- Endpoint `/api/health` responde 200.
- Endpoint `/api/storefront/[slug]` responde 200 con datos validos.
- Endpoint `/api/orders/create` rechaza sin stock.

#### 11.3 Build + Typecheck Final

```bash
npx nuxt typecheck
npm run build
```

Cero errores. Cero warnings bloqueantes.

#### 11.4 Smoke Tests

- Home carga < 2s.
- Storefront `/b/[slug]` carga < 2s.
- Admin carga sidebar sin bloquearse.
- Crear pedido end-to-end funciona.
- Cambio estado pedido se refleja.
- Upload imagen funciona.

#### 11.5 Verificacion Seguridad

- Ningun endpoint expone datos de otros catalogos (probar con dos catalogos).
- Rate limit funciona (10 requests rapidos -> 429).
- RLS bloquea acceso cross-catalog.

#### 11.6 Documentacion Final

Actualizar `CAMBIOS_APLICADOS_FINAL.md` con:
- Lista completa de todo implementado.
- Archivos modificados.
- Decisiones arquitectonicas importantes.
- Variables de entorno necesarias.
- Pasos de deploy.

---

## CRITERIO DE SALIDA ABSOLUTO

La plataforma NO esta lista hasta que:
- [ ] Build pasa siempre.
- [ ] Typecheck pasa siempre.
- [ ] Pedidos tienen UI completa con timeline, estados, asignacion, SLA, notas.
- [ ] Planes limitan operaciones reales (productos, miembros, imagenes).
- [ ] Validacion server dura en todos endpoints de mutacion.
- [ ] Sentry configurado (aunque DSN vacio, el codigo esta listo).
- [ ] /api/health responde.
- [ ] Audit log schema existe.
- [ ] CI/CD workflow existe.
- [ ] Documentacion actualizada.

---

## INSTRUCCION PARA LA IA PRO

Tu unica salida permitida despues de leer este archivo es CODIGO FUNCIONAL. No escribas resumenes. No escribas planes. Escribe archivos, edita archivos, ejecuta builds, y cuando termines cada parte, di "[PARTE X COMPLETADA]" y pasa a la siguiente. Si el contexto se agota, guarda el estado actual en un archivo temporal y continua exactamente donde te quedaste en la siguiente interaccion.
