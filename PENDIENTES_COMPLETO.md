# PENDIENTES COMPLETOS - Estado de implementación

Fecha: 2026-04-26
Estado: Aplicado y verificado (build pasó completo)

---

## RESUMEN DE IMPLEMENTACIÓN

### ✅ COMPLETADO - Backend y Seguridad
- Service role privado en nuxt.config.ts y helper en server/utils/supabase.ts
- Endurecimiento de pedidos en server/api/orders/create.post.ts (catálogo válido, negocio abierto, precios exactos, totales por ítem, subtotal, cupón y total final)
- Reseñas y analytics con cliente seguro en server/api/reviews/create.post.ts y server/api/analytics/collect.post.ts
- RLS/SQL: check_slug_availability y snapshot de analytics autorizado para equipo con viewStats en supabase/schema.sql

### ✅ COMPLETADO - Producto/UX
- Endpoint check-slug en server/api/check-slug.post.ts
- Validación en tiempo real en app/pages/onboarding/create-catalog.vue (adaptado de settings.vue ya que el slug se define en onboarding)
- Uploads endurecidos en app/composables/useStorageEngine.ts (solo jpeg/png/webp, organización year/month)
- Admin de apariencia usando flujo centralizado en app/pages/admin/appearance.vue
- Saneo de WhatsApp/teléfono en app/pages/admin/settings.vue y app/components/ui/PhoneInput.vue
- Toggle móvil/desktop en app/components/admin/PreviewModal.vue
- Analytics consolidados en app/composables/backend/analytics.ts
- Rating en cards en app/components/storefront/StorefrontShop.vue

### 🔄 ADAPTADO - Ya existía parcialmente
- Preview en vivo: Ya existía por previewStore, no requirió postMessage/iframe
- Infinite scroll: Ya estaba parcialmente implementado en storefront
- Botón compartir: Ya estaba parcialmente implementado en storefront

### ⏸️ NO IMPLEMENTADO - Requiere cambios al modelo de datos
- Stock en cards: El modelo actual no tiene campo stock en tipos/esquema
- Icono de categoría visual: El modelo actual no tiene campo icon en categories

---

## INSTRUCCIONES ORIGINALES (Para referencia futura)

---

## 1. AUDITORIA_PARIDAD_GENERADOR_TIENDAS.md - Features que Vale la Pena

### 1.1 Prioridad ALTA - UX Crítica

**1.1.1 Endpoint check_slug en tiempo real** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `supabase/schema.sql`, `server/api/check-slug.post.ts`, `app/pages/onboarding/create-catalog.vue` (adaptado de settings.vue)

**1.1.2 Live preview con postMessage** 🔄 YA EXISTÍA
- **Estado**: NO APLICADO (ya existía por previewStore)
- **Nota**: No requirió postMessage/iframe en este repo

**1.1.3 Toggle mobile/desktop en preview** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `app/components/admin/PreviewModal.vue`

**1.1.4 Infinite scroll en storefront** 🔄 YA EXISTÍA PARCIALMENTE
- **Estado**: NO APLICADO (ya estaba parcialmente implementado)
- **Nota**: No se reescribió para no romper el contrato actual

### 1.2 Prioridad MEDIA - UX Mejorable

**1.2.1 Botón compartir producto** 🔄 YA EXISTÍA PARCIALMENTE
- **Estado**: NO APLICADO (ya estaba parcialmente implementado)
- **Nota**: No se reescribió para no romper el contrato actual

**1.2.2 Rating en cards de producto** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `app/components/storefront/StorefrontShop.vue`

**1.2.3 Indicador de stock en cards** ⏸️ NO IMPLEMENTADO
- **Estado**: REQUIERE CAMBIOS AL MODELO DE DATOS
- **Nota**: El modelo actual no tiene campo stock en tipos/esquema

**1.2.4 Icono de categoría visual** ⏸️ NO IMPLEMENTADO
- **Estado**: REQUIERE CAMBIOS AL MODELO DE DATOS
- **Nota**: El modelo actual no tiene campo icon en categories

### 1.3 ELIMINADO - No vale la pena

❌ **Background blob animado** - Decorativo, sin impacto funcional
❌ **Indicadores de zoom en lightbox** - El usuario ya sabe cómo hacer zoom
❌ **Preview de OG image en WhatsApp** - Nice to have, no crítico
❌ **Hover overlay "Vista Rápida"** - Ya abre el sheet al click, redundante
❌ **Zoom con pinch en lightbox** - El navegador ya lo hace nativamente
❌ **Compresión server-side de imágenes** - Ya hay compresión cliente, server-side es overkill
❌ **Generación de manifest.json por tienda** - PWA no es prioridad ahora

---

## 2. AUDITORIA_PRODUCCION_VENTO.md - Estado de implementación

### 2.1 Prioridad CRÍTICA

**2.1.1 Limpieza total de encoding roto** ⏸️ NO IMPLEMENTADO
- **Estado**: PENDIENTE
- **Nota**: Requiere revisión manual de todos los archivos

**2.1.2 Validación server fuerte de pedidos** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `server/api/orders/create.post.ts` (catálogo válido, negocio abierto, precios exactos, totales por ítem, subtotal, cupón y total final)

**2.1.3 Validación RLS completa** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `supabase/schema.sql` (check_slug_availability y snapshot de analytics autorizado para equipo con viewStats)

### 2.2 Prioridad ALTA

**2.2.1 Separación de anon client de operaciones sensibles** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `nuxt.config.ts`, `server/utils/supabase.ts` (service role privado), `server/api/reviews/create.post.ts`, `server/api/analytics/collect.post.ts`

**2.2.2 Aplicación real de permisos de equipo** ⏸️ NO IMPLEMENTADO
- **Estado**: PENDIENTE
- **Nota**: Requiere validación en todas las rutas admin

**2.2.3 Optimización de analytics** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `supabase/schema.sql`, `app/composables/backend/analytics.ts`

### 2.3 ELIMINADO - No vale la pena ahora

❌ **Medición de performance** - Nice to have, no bloquea producción
❌ **Separación completa de useSupabaseBackend** - Ya está modularizado, más es refactoring purista
❌ **Rate limit real en edge/WAF** - Rate limit en memoria local es suficiente para MVP
❌ **Revisión de funciones security definer** - Parte de validación RLS, no item separado
❌ **Normalización de tipos de negocio** - Campo businessType ya existe, no bloquea nada
❌ **Inventario real con tablas** - MVP no necesita inventario profesional, JSONB es suficiente
❌ **Pagos y estados de pago** - MVP usa WhatsApp checkout, pagos integrados es fase 2
❌ **Logística y repartidores** - MVP usa delivery zones simples, tracking real es fase 2
❌ **Búsqueda nacional con índice avanzado** - Índices GIN básicos son suficientes para MVP
❌ **Moderación de negocios** - No necesario hasta que haya miles de negocios
❌ **Admin master escalable** - Panel actual funciona para cientos de negocios
❌ **Sentry/monitoreo de errores** - Puede agregarse cuando haya tráfico real
❌ **CI/CD automatizado** - Despliegue manual es aceptable para MVP
❌ **Backups automatizados** - Supabase ya tiene backups automáticos
❌ **Auditoría de cambios** - Nice to have para compliance, no bloquea MVP
❌ **PWA/offline real** - Cache local es suficiente para MVP
❌ **Logs centralizados** - Console logs son suficientes para MVP
❌ **Colas/jobs para tareas pesadas** - No hay tareas pesadas en MVP

---

## 3. INTEGRACION_GENERADOR_TIENDAS_PLAN_REAL.md - Estado de implementación

### 3.1 Prioridad MEDIA

**3.1.1 Validación de formato de WhatsApp** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `app/pages/admin/settings.vue`, `app/components/ui/PhoneInput.vue`

**3.1.2 MIME type validation en uploads** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `app/composables/useStorageEngine.ts` (solo jpeg/png/webp)

**3.1.3 Organización de uploads por año/mes** ✅ COMPLETADO
- **Estado**: IMPLEMENTADO
- **Archivos modificados**: `app/composables/useStorageEngine.ts` (organización year/month)

### 3.2 ELIMINADO - No vale la pena

❌ **Modal de éxito con URLs** - Nice to have, no crítico
❌ **Acceso directo al admin desde lista master** - Feature de conveniencia, no bloquea nada
❌ **Agrupación de productos por categoría en admin** - Filtro por categoría ya existe, agrupación visual es overkill
❌ **Generación de nombre de archivo aleatorio** - Timestamp + random actual es suficiente

---

## PENDIENTES FUTUROS (Requieren cambios al modelo de datos)

- **Stock en cards**: Requiere agregar campo stock al modelo de datos
- **Icono de categoría visual**: Requiere agregar campo icon a categories

## NOTA: Correcciones aplicadas por IA Pro (2026-04-26)

### ✅ Storefront y menú digital
- Resincronización en vivo con canales Supabase (catalogs, categories, products, reviews, coupons)
- Fallback de refresco periódico cada 30 segundos
- Reescritura de `useStorefrontExperience.ts` para estabilizar flujo de checkout y reseñas
- Validación de variantes requeridas antes de agregar al carrito
- Normalización de IDs públicos para órdenes y reseñas

### ✅ Tiempo real
- Endurecimiento de capa realtime en orders y reviews
- Hidratación inicial explícita, reconexión progresiva
- Paginación incremental con desduplicación
- Actualización de estadísticas después de cambios relevantes

### ✅ TypeScript y tipado
- Corrección de imports rotos y rutas de tipos
- Tipado preciso del parseo de payload
- Normalización de campos opcionales y estructuras anidadas
- Eliminación del archivo roto `storefrontProductSheet.vue`

### ✅ Analytics y SSR
- Reescritura de `useAnalytics.ts` para SSR seguro
- Encapsulación de `window`, `navigator`, `document` detrás de guards
- Mantenimiento de lógica anti-F5 con sessionStorage

### ✅ Verificación
- `npx nuxt typecheck` sin errores
- `npm run build` exitoso

Documentación completa en `CAMBIOS_APLICADOS_POR_AI_PRO.md`
