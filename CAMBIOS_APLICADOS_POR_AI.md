# CAMBIOS APLICADOS POR AI

Fecha: 2026-04-26
Proyecto: `app-saas-core`

## Resumen

Se ejecutó una auditoría práctica sobre el estado real del repositorio. La revisión confirmó que varias partes pedidas en `INSTRUCCIONES_AI_AUDITORIA_COMPLETA.md` ya estaban implementadas parcialmente o totalmente, por lo que se rectificó el alcance y se aplicaron mejoras donde todavía había huecos reales sin introducir cambios de modelo de datos no soportados.

## Rectificaciones sobre las instrucciones originales

- La validación de permisos de equipo no estaba totalmente ausente.
  Ya existe enforcement centralizado en [middleware/auth.global.ts](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/middleware/auth.global.ts) y en [app/utils/adminAccess.ts](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/app/utils/adminAccess.ts).
- El esquema SQL ya contiene políticas RLS de equipo basadas en `public.has_catalog_permission(...)`.
- No existe `app/pages/admin/analytics.vue` en este proyecto.
  El acceso al dashboard principal se resuelve en `app/pages/admin/index.vue`.
- Los permisos sugeridos en el documento (`manageCategories`, `manageSettings`, `manageAppearance`, `manageTeam`) no existen como claves reales en el modelo actual.
  El sistema vigente usa permisos como `viewProducts`, `manageProducts`, `viewSettings`, `viewStats`, etc.
- Las mejoras de `stock` en cards e `icono visual de categoría` no aplican todavía sin cambios de esquema/tipos.

## Cambios aplicados

### 1. Seguridad y hardening

Archivo: [server/api/check-slug.post.ts](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/server/api/check-slug.post.ts)

- Se reemplazó `readBody` por `safeReadJsonBody` con límite de payload.
- Se agregó rate limiting en memoria por IP para evitar abuso del endpoint de validación de slug.
- Se conservó la validación RPC existente y se endureció la superficie de entrada.

Razón:
- Era un endpoint público útil para automatización o scraping y no tenía protección básica equivalente a otros endpoints críticos del proyecto.

### 2. Corrección de contratos de datos y tipado en preview/storefront

Archivo: [app/components/admin/PreviewModal.vue](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/app/components/admin/PreviewModal.vue)

- Se tiparon las estructuras mixtas usadas por el preview.
- Se normalizó el mapeo de variantes para trabajar solo con el contrato vigente `groupName/type/priceDelta`.
- Se añadió `freeShip` y campos de carrusel al producto transformado para evitar inconsistencias entre preview y storefront.
- Se eliminaron varios `any` evitables en filtros y ordenamientos del preview.

Razón:
- El preview estaba mezclando formatos de producto/categoría de distintas etapas del proyecto, con riesgo de regresiones silenciosas.

Archivo: [app/utils/storefrontPayload.ts](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/app/utils/storefrontPayload.ts)

- Se sustituyeron mapeos con `any` por `Record<string, unknown>`.
- Se endurecieron conversiones a `string`, `number` y arreglos antes de construir el payload storefront.

Razón:
- Este archivo es frontera de datos RPC y debe fallar menos por payloads parciales o campos opcionales.

Archivo: [server/utils/marketplace.ts](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/server/utils/marketplace.ts)

- Se eliminó el uso directo de `any` en los mapeadores públicos del marketplace.
- Se normalizó la coerción de campos entrantes.

Razón:
- Reduce deuda de tipado en utilidades server-side que forman payloads consumidos por UI.

Archivo: [app/components/storefront/StorefrontShop.vue](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/app/components/storefront/StorefrontShop.vue)

- Se tipó el mapa de iconos de tienda.
- Se tipó el evento `beforeinstallprompt`.
- Se tiparon helpers de timers, ordenamiento, filtros de precio, quick-add y tracking local de órdenes.

Razón:
- Era uno de los componentes con más lógica de UX y con varios `any` evitables en zonas críticas.

### 3. Consistencia del editor de productos

Archivo: [app/pages/admin/products.vue](C:/Users/USUARIO/Desktop/Plantilla copia/plantilla-copia-completa/app-saas-core/app/pages/admin/products.vue)

- Se completó el `emptyProduct()` con `carouselEnabled` y `carouselIntervalSeconds`.

Razón:
- El tipo `CatalogProduct` ya exige esos campos y el editor estaba construyendo objetos incompletos.

## Hallazgos documentados pero no aplicados

- `login` y `register` no exponen endpoints propios en `server/api`.
  La autenticación va directa por Supabase Auth desde cliente, por lo que el rate limiting local del proyecto no se puede imponer ahí sin rediseñar el flujo.
- La validación RLS ya estaba avanzada en `supabase/schema.sql`.
  No se tocaron políticas porque el estado actual ya usa `auth.uid()` y `has_catalog_permission(...)` en la capa de equipo.
- El build ya estaba funcionando antes de mis cambios.
- La verificación de typecheck no quedó completamente operativa en este entorno porque falta `@vue/language-core` en `node_modules`, dependencia que `nuxt typecheck` intenta resolver.

## Archivos modificados por esta intervención

- `server/api/check-slug.post.ts`
- `app/components/admin/PreviewModal.vue`
- `app/utils/storefrontPayload.ts`
- `server/utils/marketplace.ts`
- `app/components/storefront/StorefrontShop.vue`
- `app/pages/admin/products.vue`
- `CAMBIOS_APLICADOS_POR_AI.md`

## Verificación realizada

- `npm run build` ejecutado con éxito después de los cambios.

## Riesgos o siguientes pasos recomendados

- Instalar la dependencia faltante de typecheck (`@vue/language-core`) y correr `npx nuxt typecheck`.
- Si se quiere cumplir literalmente con los permisos sugeridos por el documento original, primero hay que rediseñar el modelo de permisos y el esquema SQL para introducir nuevas claves reales.
- Si se desea stock en cards o iconos por categoría, hay que extender tipos, UI, persistencia y esquema Supabase.
