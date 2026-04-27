# TAREAS PENDIENTES - Vento Produccion

> IA Pro: Lee COMPLETO, luego lee `INSTRUCCIONES_COMPLETAS_PRO.md` y `INSTRUCCIONES_CACHE_DISTRIBUIDO_PRO.md` para detalles. Ejecuta fases en orden. Build+typecheck limpio antes y despues de cada fase.

## LO YA IMPLEMENTADO (NO rehacer)

1. Build + typecheck limpios.
2. Rate limit distribuido: `server/utils/rateLimit.ts` (Upstash Redis + fallback local).
3. Rate limit en endpoints: `analytics/collect`, `check-slug`, `orders/create`, `reviews/create`.
4. `nuxt.config.ts` tiene `upstashRedisRestUrl` y `upstashRedisRestToken`.
5. Schema: `order_status_history`, `order_events` con triggers, indices, RLS, maquina de estados.
6. `orders` tiene `assigned_to_uid`, `assigned_to_name`, `internal_notes`.
7. `freeShip` en tipos, stores, admin, storefront.
8. `previewStore` basico en `admin/appearance.vue`.

## LO QUE FALTA (Ejecutar en orden)

### Fase 0 - Limpieza Final
- Headers seguridad en `nuxt.config.ts`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Corregir `any` real: `server/api/orders/create.post.ts:174`.
- Revisar `select('*')` residual.

### Fase 1.1 - Inventario
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 1.1. Schema SQL variantes/inventario, migracion JSONB, tipos TS, CRUD admin drag-drop, badge stock storefront, reserva/liberacion stock, alertas bajo stock.

### Fase 1.2 - UI Pedidos
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 1.2.3. Parte SQL ya esta. Falta UI: timeline vertical, botones estado con modal, selector "Asignar a", SLA visual, notas internas, marcar viewed.

### Fase 1.3 - Planes
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 1.3. Schema `catalog_plans`, limites por plan, UI admin, panel master, enforcement.

### Fase 2.1 - Validacion Server
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 2.2. Schemas formales zod/valibot en endpoints mutacion, limites longitud, validacion cupones/zonas/horarios, sanitizacion.

### Fase 2.2 - Observabilidad
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 2.3. Sentry client+server, sourcemaps, logger con correlationId, endpoint `/api/health`.

### Fase 3.1 - CI/CD
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 3.1. `.github/workflows/deploy.yml`.

### Fase 3.2 - Jobs
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 3.2. Edge Functions o `server/jobs/`.

### Fase 3.3 - Cache Edge
Ver `INSTRUCCIONES_CACHE_DISTRIBUIDO_PRO.md` COMPLETO. Implementar: `server/utils/cache.ts`, invalidacion selectiva, compresion, circuit breaker, metricas, hooks mutacion, routeRules ISR.

### Fase 4 - Experiencia Negocio
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 4. Onboarding wizard, multi-catalogo, permisos finos granulares.

### Fase 5 - Datos Nacional
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 5. `business_locations`, `delivery_zones`, `drivers`, `audit_log`.

### Fase 6 - Producto y Crecimiento
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 6. Moderacion master, analitica util.

### Fase 7 - UX Generador
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 7. Crop modal, icon picker Lucide, paleta 30 colores, live preview real, infinite scroll.

### Fase 8 - Validacion Final
Ver `INSTRUCCIONES_COMPLETAS_PRO.md` 8. Tests, smoke tests, seguridad, documentacion.

## NOTA PARA LA IA PRO

La IA anterior quedo sin creditos. Completo rate limit y schema de pedidos pero NO completo UI pedidos, NO implemento headers seguridad, NO implemento cache distribuido, sentry, inventario, planes, UX, ni nada posterior. `INSTRUCCIONES_COMPLETAS_PRO.md` y `INSTRUCCIONES_CACHE_DISTRIBUIDO_PRO.md` tienen los detalles tecnicos completos de cada fase.
