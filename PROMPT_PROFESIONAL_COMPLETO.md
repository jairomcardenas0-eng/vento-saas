# PROMPT PROFESIONAL - IMPLEMENTACIÓN DE 4 MÓDULOS CRÍTICOS

## ROL Y REGLA DE ITERACIÓN

**Rol:** Ingeniero sénior especializado en performance web, PWA, testing enterprise, y arquitectura Vue/Nuxt para mercados emergentes.

**Regla NO NEGOCIABLE:** NO finalices, NO entregues resumen, NO pares hasta que los CUATRO módulos estén 100% implementados, probados, y funcionando. Revisa cada módulo tres veces antes de declararlo terminado. Si un módulo requiere más trabajo, continúa hasta completarlo.

---

## CONTEXTO DEL PROYECTO

**Aplicación:** Vento - SaaS de catálogos digitales para pequeños negocios.
**Mercado primario:** Cuba (internet 2G/3G lento, costoso, intermitente; dispositivos Android gama baja 2-4GB RAM).

**Stack:** Nuxt.js 4.4.2 (Vue 3, Nitro, Vite), Supabase (PostgreSQL/Auth/Storage/Realtime), Pinia, TailwindCSS, TypeScript, Lucide icons, Leaflet, Chart.js, Upstash Redis, Sentry.

**Directorio:** `C:\Users\USUARIO\Desktop\Plantilla copia\plantilla-copia-completa\app-saas-core`
**Puerto dev:** `http://localhost:3001`
**Supabase URL:** `https://eydolnzvwkqwoubbgvjc.supabase.co`

**Estado actual:** 17 páginas admin funcionales, storefront ISR, onboarding, PWA básico, 4 tests unitarios mínimos. App funcional pero NO optimizada para condiciones adversas.

---

## PROBLEMA CENTRAL

La app debe funcionar como Facebook/Instagram: instantánea en 2G/3G, fluida en Android de $100, usable sin conexión, y 100% testeada para deploy sin miedo.

---

## MÓDULO 1: INTERNET LENTO + MODO OFFLINE (Prioridad CRÍTICA)

**Contexto:** Cuba = 2G/3G lento, intermitente, costoso por MB. La app debe cargar esencial en <2s y funcionar offline.

### 1.1 Service Worker Avanzado
Crear `app/service-worker.ts` o `public/sw.js`:
- **App shell (HTML/CSS/JS):** Cache First → background update
- **Datos de catálogo:** Stale-While-Revalidate (muestra cache inmediatamente, actualiza en background)
- **Imágenes:** Cache First con placeholder fallback
- **API usuario (pedidos):** Network First → fallback cache
- **Analytics:** Network Only (no cache)
- **Versionado** con invalidación inteligente
- **Precarga** de recursos críticos en install
- **Cleanup** de caches antiguas en activate
- **Background Sync API** para operaciones offline

### 1.2 Queue de Operaciones Offline
Crear `app/composables/useOfflineQueue.ts`:
- Guardar en IndexedDB operaciones que fallan por red
- Reintentar automáticamente al detectar conexión
- Manejar conflictos (pedido offline vs actualización online)
- UI: "3 cambios pendientes de sincronización" (sutil, no intrusivo)
- Sincronización prioritizada: pedidos primero, analytics al final
- Máximo 100 operaciones en queue
- TTL de 7 días para operaciones pendientes

### 1.3 Cache Inteligente de Catálogos
Crear `app/composables/useCatalogCache.ts`:
- Cachear catálogos completos en IndexedDB (productos, categorías, precios)
- Invalidación por tiempo configurable (1 hora default)
- Cachear SOLO lo necesario: NO imágenes alta resolución
- Sincronización incremental: solo descargar cambios desde última sync
- Compresión JSON antes de guardar en IndexedDB
- Límite 50MB total por catálogo

### 1.4 UI de Estado Offline
Crear `components/ConnectionStatus.vue`:
- Banner flotante SUTIL: "Sin conexión - Modo offline" (no bloqueante)
- Indicador "Sincronizando..." con spinner mínimo
- Toast "Datos sincronizados" al reconectar
- La app SIEMPRE funciona, nunca bloquear por falta de red
- Offline debe ser prácticamente invisible

### 1.5 Data Saver Mode
Crear `app/composables/useDataSaver.ts`:

**Detección automática:**
- `navigator.connection.effectiveType` = '2g' o 'slow-2g' → activar auto
- `connection.saveData === true` → activar
- Detectar velocidad de carga real y activar si >3s

**Funcionalidades en Data Saver:**
- Imágenes: cargar thumbnails 200px width (no full)
- Deshabilitar TODAS las animaciones CSS (transiciones, fade)
- No cargar videos nunca
- Skeletons en lugar de spinners animados
- Lazy loading agresivo (solo visible en viewport)
- Reemplazar Chart.js con SVG/texto simple
- Reducir realtime polling a 30s (no 5s)
- Comprimir payloads JSON (sin whitespace, códigos cortos)
- Persistir preferencia en localStorage
- Toggle manual en settings
- Mostrar MB ahorrados

### 1.6 Background Sync
- Pedidos creados offline → IndexedDB → Background Sync al reconectar
- Periodic Background Sync para mantener catálogos actualizados (si disponible)
- Notificación de resultado al usuario

---

## MÓDULO 2: OPTIMIZACIÓN EXTREMA DE PERFORMANCE (Prioridad CRÍTICA)

**Contexto:** La app debe sentirse instantánea. Bundle mínimo, imágenes inmediatas, TTI <2s en 3G.

### 2.1 Bundle Size Minimización
Modificar `nuxt.config.ts` y toda la app:

**Objetivos:**
- Initial JS: <150KB (actual probablemente >500KB)
- CSS crítico: <30KB inline
- Total primera carga: <500KB

**Implementación:**
- Dynamic imports para TODOS los componentes no críticos:
  ```typescript
  const AdminChart = defineAsyncComponent(() => import('~/components/admin/Chart.vue'))
  ```
- Code splitting por ruta: cada página admin su propio chunk
- Tree shaking agresivo
- Eliminar dead code
- Reemplazar Chart.js con SVG/charts nativos livianos
- Importar SOLO los iconos Lucide necesarios (no toda la librería)
- Lazy load Leaflet solo cuando se necesita mapa
- Cargar storefront antes que panel admin
- Usar `nuxt analyze` o @nuxtjs/webpack-analyzer para identificar peso

### 2.2 Optimización Extrema de Imágenes
Crear `app/composables/useImageOptimizer.ts`:

**REGLA DE ORO:** Calidad visual perfecta para ojo humano, archivo MÍNIMO para la red.

**Implementación:**
1. **Compresión:**
   - WebP calidad 70-75% (imperceptible humano, ~60% menos peso)
   - JPEG fallback calidad 75% para navegadores antiguos
   - Eliminar TODOS los metadatos EXIF (GPS, cámara, fecha, etc.)
   - Usar mozjpeg para compresión óptima

2. **Dimensiones responsivas:**
   - Thumbnail listado: 200px width
   - Detalle producto: 600px width
   - Lightbox: 1200px width máximo
   - srcset obligatorio: `200w, 400w, 600w, 800w`
   - Attribute `sizes` correcto en cada contexto

3. **Loading strategy:**
   - `loading="lazy"` nativo en TODAS las imágenes excepto primera
   - Placeholder blur-up: tiny thumbnail 20px base64 encoded
   - Priority preload para imagen hero

4. **Supabase Storage:**
   - Usar transformaciones on-the-fly: `/storage/v1/object/sign/...?width=200&quality=70`
   - Cache headers: `max-age=31536000` (1 año) para imágenes estáticas

5. **Sprite sheets** para iconos pequeños repetidos

### 2.3 Critical CSS y Render Path
Modificar `app/app.vue`:
- Inline CSS crítico para First Paint
- Preconnect a Supabase y dominios externos
- Preload de fuentes web si se usan
- DNS prefetch para analytics
- Defer scripts no críticos

### 2.4 JavaScript Performance
Implementar en TODOS los composables/stores:

1. **Virtual scrolling** para listas >50 items (no renderizar DOM fuera de viewport)
2. **Debounce/throttle** en TODOS los inputs:
   - Búsqueda: debounce 300ms
   - Slug validation: debounce 500ms
   - Resize: throttle 100ms
   - Scroll: throttle 16ms (1 frame)
3. **Memoización:** computed() con dependencias exactas, NO recalcular arrays filtrados en cada render
4. **List rendering:** `:key` único y estable, NUNCA usar index como key
5. **Watch optimization:** `{ deep: false }`, `flush: 'post'`, cleanup en `onUnmounted`

### 2.5 Network Optimization
Optimizar TODAS las llamadas Supabase:

1. **Query optimization:**
   - `select()` SOLO columnas necesarias, NUNCA `*`
   - Limitar a 20 items por página (paginación)
   - Usar `head()` en lugar de `select()` cuando solo se necesita existencia
   - Batch operations: insert múltiple en una query, update con `in_()`
   - Eliminar N+1 queries

2. **Caching layer (SWR pattern):**
   - Catálogo config: 5 minutos TTL
   - Productos: 2 minutos TTL
   - Pedidos: 30 segundos TTL
   - Analytics: 5 minutos TTL

3. **Realtime optimization:**
   - Suscribirse SOLO a tablas necesarias
   - Unsubscribe al abandonar página
   - Filtros en suscripción (no recibir todos los cambios)
   - Reconexión automática con backoff exponencial

### 2.6 Compression y Minification
Configurar build:
- Gzip/Brotli en servidor
- Minificación HTML en SSR
- Tree shake CSS (purge unused Tailwind)
- Inline CSS crítico
- Prefetch de rutas probables según comportamiento usuario

---

## MÓDULO 3: DISPOSITIVOS DE GAMA BAJA (Prioridad ALTA)

**Contexto:** Cuba = mayoría Android 2-4GB RAM, procesadores 1.4GHz 4-core, pantallas 5.5" 720p. No debe crashear ni laggear.

### 3.1 Responsive Ultra-Adaptativo
Todos los componentes deben funcionar desde 320px:
- Touch targets mínimo 48x48px (dedos + accesibilidad)
- NO hover effects (no hay mouse en móvil)
- Estados active/pressed en lugar de hover
- Font size mínimo 14px (sin zoom)
- Contraste WCAG AA mínimo
- NO position:fixed con inputs (problema teclado virtual)
- Testear en Chrome DevTools con CPU throttling 4x

### 3.2 Memory Management
En TODOS los stores/composables:
- Limpiar arrays grandes al abandonar página
- Usar WeakMap/WeakRef donde sea posible
- Revoke ObjectURLs después de usar imágenes
- Decoding async para imágenes grandes
- Liberar imágenes fuera de viewport
- Resetear estado admin al desmontar componente
- Limitar historial en memoria
- Limpiar setInterval/setTimeout en `onUnmounted`
- Unsubscribe realtime channels
- Cancelar requests en vuelo (AbortController)

### 3.3 Touch y Gestos
Crear `app/composables/useTouchGestures.ts`:
- Pull-to-refresh en listas
- Swipe entre tabs
- Swipe para eliminar items (con confirmación)
- Long press para acciones contextuales
- Pinch-to-zoom SOLO en imágenes producto
- Haptic feedback (vibración) en acciones importantes
- Pull-up para cerrar modales

### 3.4 Batería y CPU
- GPS/Geolocation: solo cuando usuario solicita, NO polling constante, low accuracy
- Reducir animaciones: usar `prefers-reduced-motion`, CSS animations (no JS), limitar a 60fps
- Page Visibility API: pausar sync cuando tab no es visible
- Reducir polling frequency en background

### 3.5 Performance Budgets (OBLIGATORIOS)
- Storefront público: <200KB JS, <100KB CSS, <500KB imágenes
- Panel admin: <400KB JS, <150KB CSS
- Onboarding: <300KB JS
- Time to Interactive: <2s en 3G
- First Contentful Paint: <1s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <200ms
- Cumulative Layout Shift: <0.1
- Lighthouse Performance score mínimo: 90 en móvil

---

## MÓDULO 4: TESTING PROFESIONAL Y COMPLETO (Prioridad ALTA)

**Contexto:** Solo 4 tests unitarios básicos existen. Cada cambio requiere prueba manual completa. INACEPTABLE para producción.

### 4.1 Tests Unitarios Exhaustivos (Vitest)
Crear tests para TODAS las unidades de lógica. Estructura:

```
tests/unit/
├── auth/login.test.ts (validación credenciales, errores)
├── auth/register.test.ts (validación campos, creación perfil)
├── auth/session.test.ts (refresh token, expiración, logout)
├── catalog/createCatalog.test.ts (slug, duplicados, límites plan)
├── catalog/updateCatalog.test.ts (cambios nombre, tema, settings)
├── products/createProduct.test.ts (validación, precios, stock)
├── products/variants.test.ts (grupos, opciones, stock variante)
├── orders/createOrder.test.ts (cálculo total, impuestos, delivery)
├── orders/updateStatus.test.ts (transiciones estado válidas)
├── orders/cancelOrder.test.ts (restaurar stock)
├── cart/addToCart.test.ts (agregar, incrementar)
├── cart/calculateTotal.test.ts (subtotal, descuentos, delivery, total)
├── coupons/validateCoupon.test.ts (expiración, uso único, mínimo)
├── utils/slugify.test.ts (transformaciones, especiales)
├── utils/formatCurrency.test.ts (formato)
├── utils/validators.test.ts (email, teléfono)
├── composables/useOfflineQueue.test.ts (guardar, reintentar, conflictos)
├── composables/useImageOptimizer.test.ts (dimensiones, formatos, calidad)
└── composables/useDataSaver.test.ts (detección, toggle, persistencia)
```

**Reglas para cada test:**
- Happy path (caso normal)
- Edge cases (vacío, null, undefined, muy largo)
- Errores esperados (inválido, permisos insuficientes)
- Mocks para Supabase, localStorage, IndexedDB, navigator.connection
- Coverage mínimo 80% de código

### 4.2 Tests de Componentes (Vue Test Utils + Vitest)
Crear tests para componentes críticos:
- `StorefrontProductCard.test.ts`: renderiza info, click agrega carrito, badge agotado, lazy loading
- `AdminOrderCard.test.ts`: estado correcto, click abre detalle, botones según estado
- `CheckoutForm.test.ts`: validación campos, cálculo total, submit crea pedido, errores
- `CartDrawer.test.ts`: lista productos, cambiar cantidad, eliminar, vacío
- `ConnectionStatus.test.ts`: online/offline, contador cambios pendientes

### 4.3 Tests End-to-End (Playwright)
Instalar y configurar Playwright. Crear tests de flujos completos:

```
tests/e2e/
├── auth/
│   ├── register.spec.ts (registro completo, validación email, creación perfil)
│   └── login.spec.ts (login correcto, error credenciales, recovery)
├── catalog/
│   ├── createCatalog.spec.ts (onboarding, slug check, crear, verificar existe)
│   └── manageCatalog.spec.ts (editar, cambiar tema, settings)
├── products/
│   ├── addProduct.spec.ts (crear producto, subir imagen, stock, variantes)
│   └── editProduct.spec.ts (cambiar precio, desactivar, eliminar)
├── storefront/
│   ├── browseCatalog.spec.ts (ver productos, categorías, buscar)
│   ├── addToCart.spec.ts (agregar, cambiar cantidad, calcular total)
│   └── checkout.spec.ts (completar checkout, crear pedido, confirmación)
├── orders/
│   └── manageOrders.spec.ts (ver pedidos, cambiar estado, notificaciones)
└── offline/
    ├── offlineBrowse.spec.ts (cargar catálogo, navegar sin red)
    ├── offlineOrder.spec.ts (crear pedido offline, reconectar, sync)
    └── dataSaver.spec.ts (activar data saver, verificar imágenes comprimidas)
```

**Cada test E2E debe:**
- Usar datos de prueba determinísticos (seed database)
- Limpiar estado antes y después
- Tomar screenshots en fallos
- Medir performance (cuánto tarda cada paso)
- Funcionar en móvil (viewport 375x667)

### 4.4 Tests de Performance y Accesibilidad
- **Lighthouse CI:** Ejecutar Lighthouse en cada build, fallar si score <90
- **Bundle size tests:** Fallar si bundle excede budgets definidos
- **Accessibility tests:** Axe-core para detectar problemas de accesibilidad
- **Visual regression:** Comparar screenshots con baseline

### 4.5 Tests de API/Integración
Crear tests para endpoints de API:
```
tests/api/
├── health.test.ts (endpoint /api/health responde 200)
├── storefront.test.ts (/api/storefront/[slug] devuelve datos correctos)
└── orders.test.ts (crear pedido vía API, validaciones)
```

### 4.6 CI/CD con Tests Automáticos
Modificar `.github/workflows/deploy.yml`:
```yaml
jobs:
  lint-and-test:
    - npm ci
    - npx nuxt typecheck
    - npm run lint
    - npm run test:unit
    - npm run test:component
    - npm run test:e2e
    - npm run lighthouse
    - npm run build
```

---

## RESTRICCIONES Y REGLAS

1. **NO romper funcionalidad existente:** Los 17 módulos de admin y el storefront deben seguir funcionando igual o mejor.
2. **NO agregar dependencias pesadas:** Cada nueva dependencia debe justificar su peso en KB.
3. **Mantener TypeScript estricto:** Todo nuevo código debe tener tipos completos.
4. **NO modificar Supabase schema:** Trabajar con tablas existentes. Si se necesita algo nuevo, crear PR separado.
5. **Mantener español como idioma UI:** Todo texto nuevo en español.
6. **Backward compatibility:** Service worker debe funcionar incluso si navegador no soporta ciertas APIs.
7. **Graceful degradation:** Si una feature no funciona en un dispositivo, la app sigue usable.
8. **Documentar todo:** Cada nuevo composable debe tener JSDoc. Cada test debe describir qué prueba.

---

## ESTRUCTURA DE ARCHIVOS ESPERADA

```
app/
├── composables/
│   ├── useOfflineQueue.ts              (Módulo 1)
│   ├── useCatalogCache.ts              (Módulo 1)
│   ├── useDataSaver.ts                 (Módulo 1)
│   ├── useImageOptimizer.ts            (Módulo 2)
│   ├── useTouchGestures.ts             (Módulo 3)
│   ├── usePerformanceMonitor.ts        (Módulo 2)
│   └── useMemoryManager.ts             (Módulo 3)
├── components/
│   └── ConnectionStatus.vue            (Módulo 1)
├── plugins/
│   └── performance.client.ts           (Módulo 2 - métricas Web Vitals)
├── service-worker.ts  o  public/sw.js   (Módulo 1)
└── utils/
    ├── offlineStorage.ts               (Módulo 1 - helpers IndexedDB)
    ├── imageCompression.ts             (Módulo 2 - compresión client-side)
    └── performanceBudgets.ts          (Módulo 2 - verificación budgets)

tests/
├── unit/                               (Módulo 4)
│   ├── auth/
│   ├── catalog/
│   ├── products/
│   ├── orders/
│   ├── cart/
│   ├── coupons/
│   ├── utils/
│   └── composables/
├── component/                          (Módulo 4)
│   ├── StorefrontProductCard.test.ts
│   ├── AdminOrderCard.test.ts
│   ├── CheckoutForm.test.ts
│   ├── CartDrawer.test.ts
│   └── ConnectionStatus.test.ts
├── e2e/                                (Módulo 4)
│   ├── auth/
│   ├── catalog/
│   ├── products/
│   ├── storefront/
│   ├── orders/
│   └── offline/
├── api/                                (Módulo 4)
└── performance/                        (Módulo 4)

playwright.config.ts                    (Módulo 4)
vitest.config.ts  (modificar)           (Módulo 4)
nuxt.config.ts  (modificar)             (Módulos 1, 2, 3)
```

---

## CHECKLIST DE ENTREGA FINAL

Antes de declarar TODO terminado, verifica que TODO esté listo:

### Módulo 1 - Internet Lento + Offline
- [ ] Service Worker funciona (cache, sync, cleanup)
- [ ] Queue offline guarda y reintenta operaciones
- [ ] Cache de catálogos en IndexedDB funciona
- [ ] UI offline muestra estado sutilmente
- [ ] Data Saver detecta conexión lenta automáticamente
- [ ] Data Saver reduce peso de carga visiblemente
- [ ] Background Sync funciona en Chrome/Android
- [ ] App funciona completamente sin internet (modo offline)

### Módulo 2 - Performance Extrema
- [ ] Bundle initial <150KB JS
- [ ] Imágenes WebP 70% calidad funcionan
- [ ] srcset y sizes en todas las imágenes
- [ ] Lazy loading nativo funciona
- [ ] Dynamic imports en componentes no críticos
- [ ] Debounce/throttle en todos los inputs
- [ ] Virtual scrolling en listas >50 items
- [ ] Supabase queries solo select columnas necesarias
- [ ] Realtime unsubscribe al abandonar página
- [ ] Lighthouse Performance score >90 en móvil

### Módulo 3 - Gama Baja
- [ ] App funciona en viewport 320px
- [ ] Touch targets 48x48px mínimo
- [ ] No memory leaks detectados (Chrome DevTools heap snapshot)
- [ ] App no crashea después de 30 min de uso
- [ ] CPU throttling 4x no hace que se congele
- [ ] Gestos táctiles funcionan (swipe, pull-to-refresh)
- [ ] App usable en Android 8+ con 2GB RAM

### Módulo 4 - Testing
- [ ] >50 tests unitarios pasando
- [ ] Tests de componentes pasando
- [ ] Tests E2E pasando (flujo completo registro→pedido)
- [ ] Tests offline pasando (crear pedido sin red, sync al reconectar)
- [ ] Tests performance pasando (budgets)
- [ ] Coverage >80%
- [ ] CI/CD ejecuta todos los tests en cada push

---

## INSTRUCCIÓN FINAL

Implementa todo. NO me des resúmenes parciales. NO declares algo "terminado" hasta que pase todos los checks. Si encuentras un bug, arréglalo. Si algo puede mejorarse, mejóralo. Trabaja como si fueras el ingeniero líder de Facebook lanzando una feature para 2 mil millones de usuarios. La calidad es NO NEGOCIABLE.

Cuando TODO esté implementado, probado, y el checklist esté 100% verde, entonces y solo entonces entrega el resumen final con:
1. Lista exacta de archivos creados/modificados
2. Métricas de performance antes/después (si puedes medir)
3. Número total de tests creados y pasando
4. Cualquier decisión técnica importante que tomaste
