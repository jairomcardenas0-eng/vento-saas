# CAMBIOS APLICADOS FINAL

## Verificacion ejecutada

- `npx nuxt typecheck` pasa.
- `npm run build` pasa.
- `npm test` pasa.

## Implementado en esta ejecucion

### Parte 1 - UI de pedidos

- Se creo `app/components/admin/OrderTimeline.vue`.
- Se integro timeline vertical con `order_status_history` y `order_events`.
- Se reescribio `app/pages/admin/orders.vue` para incluir:
  - cambio de estado con transiciones validas
  - auto marcado de `new` a `viewed`
  - asignacion de responsable
  - notas internas
  - SLA visual
  - contadores por estado

### Parte 2 - Enforcement de planes

- Se extendio `server/utils/plans.ts` con limites por:
  - productos
  - miembros
  - imagenes
  - catalogos
- Se bloqueo creacion por limite en:
  - `app/composables/backend/catalog.ts`
  - `app/composables/backend/operations.ts`
  - `app/composables/useStorageEngine.ts`
- Se agrego feedback de uso actual/límite en:
  - `app/pages/admin/products.vue`
  - `app/pages/admin/team.vue`
  - `app/pages/admin/settings.vue`

### Parte 3 - Validacion server dura

- Se instalo `zod`.
- Se crearon schemas:
  - `server/schemas/product.schema.ts`
  - `server/schemas/order.schema.ts`
  - `server/schemas/coupon.schema.ts`
  - `server/schemas/catalog.schema.ts`
- Se creo `server/utils/sanitize.ts`.
- Se agregaron endpoints con validacion:
  - `server/api/products/create.post.ts`
  - `server/api/products/update.post.ts`
  - `server/api/coupons/create.post.ts`
  - `server/api/catalogs/update.post.ts`
  - `server/api/settings/update.post.ts`
  - `server/api/appearance/update.post.ts`
  - `server/api/team/invite.post.ts`
- Se reforzo `server/api/orders/create.post.ts` con:
  - validacion de horario
  - validacion de cupones
  - validacion de delivery
  - logs con correlation id

### Parte 4 - Observabilidad

- Se instalaron:
  - `@sentry/vue`
  - `@sentry/node`
- Se crearon:
  - `app/plugins/sentry.client.ts`
  - `server/plugins/sentry.server.ts`
  - `server/utils/logger.ts`
  - `server/api/health.get.ts`
- Se agregaron correlation IDs y logging en:
  - `server/api/orders/create.post.ts`
  - `server/api/reviews/create.post.ts`
  - `server/api/analytics/collect.post.ts`

### Parte 5 - CI/CD

- Se creo `.github/workflows/deploy.yml`.
- El workflow ejecuta:
  - `npm ci`
  - `npx nuxt typecheck`
  - `npm run build`
  - `npm test`
- Quedo preparado para staging y production con smoke tests por URL configurable.

### Parte 6 - Jobs y colas base

- Se creo `server/jobs/index.ts`.
- Se implementaron jobs base:
  - `recalcDailyStats`
  - `cleanupOldAnalytics`
  - `notifyExpiringPlans`
  - `runDailyJobs`
- Se creo endpoint protegido:
  - `server/api/jobs/run.post.ts`
- Se agrego `jobSecret` a `runtimeConfig.private` en `nuxt.config.ts`.

### Parte 7 - Experiencia de negocio base

- Se creo `app/pages/onboarding/index.vue` con:
  - seleccion de tipo de negocio
  - datos basicos
  - validacion de slug en tiempo real
  - sugerencias de categorias
  - checklist de publicacion
  - persistencia en `localStorage`

### Parte 8 - Datos y modelo nacional base

- Se extendio `supabase/schema.sql` con:
  - `onboarding_step` y `business_group` en `catalogs`
  - `invited_at` en `catalog_team_members`
  - tablas `provinces` y `municipalities`
  - datos iniciales de provincias y municipios base de Cuba
  - `business_locations`
  - `delivery_zones`
  - `drivers`
  - `audit_log`
- Se agregaron indices y RLS para nuevas tablas.
- Se creo `server/utils/auditLog.ts`.
- Se integro audit log en:
  - `server/api/products/create.post.ts`
  - `server/api/team/invite.post.ts`
  - `server/api/settings/update.post.ts`
  - `server/api/appearance/update.post.ts`
  - `server/api/catalogs/update.post.ts`

### Parte 9 - Moderacion master base

- Se creo `app/pages/master/moderation.vue` con:
  - tabla de catalogos filtrable
  - accion base de suspension
  - panel de fraude
  - bandeja de incidencias

### Parte 10 - UX generador

- Se mantuvo y verifico `app/components/admin/CropModal.vue`.
- Se dejo `app/components/admin/PreviewModal.vue` operando como preview en vivo.
- Se completo `app/pages/admin/appearance.vue` con:
  - selector visual de iconos
  - paleta predefinida
  - color picker
  - reset de colores
- Se integraron assets de logo e icono con flujo de recorte y subida.

### Parte 11 - Tests minimos

- Se instalo `vitest`.
- Se agrego script `npm test`.
- Se creo `vitest.config.ts` con alias `~` y `@`.
- Se agregaron tests:
  - `tests/plans.test.ts`
  - `tests/rateLimit.test.ts`
  - `tests/storefrontPayload.test.ts`

## Archivos creados

- `.github/workflows/deploy.yml`
- `app/components/admin/OrderTimeline.vue`
- `app/pages/onboarding/index.vue`
- `app/pages/master/moderation.vue`
- `app/plugins/sentry.client.ts`
- `server/plugins/sentry.server.ts`
- `server/api/health.get.ts`
- `server/api/jobs/run.post.ts`
- `server/jobs/index.ts`
- `server/utils/logger.ts`
- `server/utils/auditLog.ts`
- `server/utils/sanitize.ts`
- `server/schemas/product.schema.ts`
- `server/schemas/order.schema.ts`
- `server/schemas/coupon.schema.ts`
- `server/schemas/catalog.schema.ts`
- `tests/plans.test.ts`
- `tests/rateLimit.test.ts`
- `tests/storefrontPayload.test.ts`
- `vitest.config.ts`

## Archivos modificados principales

- `app/pages/admin/orders.vue`
- `app/pages/admin/products.vue`
- `app/pages/admin/team.vue`
- `app/pages/admin/settings.vue`
- `app/pages/admin/appearance.vue`
- `app/components/admin/PreviewModal.vue`
- `app/components/admin/CropModal.vue`
- `app/composables/backend/catalog.ts`
- `app/composables/backend/operations.ts`
- `app/composables/useStorageEngine.ts`
- `app/composables/useSupabaseBackend.ts`
- `app/stores/catalogs.ts`
- `server/api/orders/create.post.ts`
- `server/api/reviews/create.post.ts`
- `server/api/analytics/collect.post.ts`
- `server/api/products/create.post.ts`
- `server/api/products/update.post.ts`
- `server/api/coupons/create.post.ts`
- `server/api/catalogs/update.post.ts`
- `server/api/settings/update.post.ts`
- `server/api/appearance/update.post.ts`
- `server/api/team/invite.post.ts`
- `server/utils/plans.ts`
- `server/utils/rateLimit.ts`
- `nuxt.config.ts`
- `package.json`
- `package-lock.json`
- `supabase/schema.sql`

## Variables de entorno necesarias

- `SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NUXT_PUBLIC_SENTRY_DSN`
- `NUXT_PUBLIC_SENTRY_ENVIRONMENT`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `JOB_SECRET`
- `SMOKE_TEST_BASE_URL`

## Decisiones arquitectonicas

- Se reutilizaron patrones existentes de Supabase en lugar de reestructurar el backend completo.
- El enforcement de planes se anclo primero donde hoy ocurren las operaciones reales del admin.
- La observabilidad se dejo lista aunque los DSN puedan estar vacios.
- Los tests minimos se montaron con `vitest` para no introducir una infraestructura de testing mas pesada.

## Nota de despliegue

- Las tablas y politicas nuevas requieren aplicar `supabase/schema.sql` en la base real antes de usar las nuevas rutas y pantallas.
- El `build` actual pasa con un warning no bloqueante de sourcemaps del plugin `nuxt:module-preload-polyfill`.
