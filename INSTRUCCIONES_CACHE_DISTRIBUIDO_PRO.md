# INSTRUCCIONES: CACHE DISTRIBUIDO NIVEL UBER/RAPPI PARA VENTO

## DIRECTIVA

Implementa sistema de cache distribuido profesional (patron Uber/DoorDash/Rappi).
Regla fundamental del usuario: la primera visita despues de mutacion desbloquea cache reconstruyendo desde Supabase. Todos los siguientes reciben cache distribuido durante horas.

---

## PATRON: LAZY-WARMING CACHE-ASIDE + STALE-WHILE-REVALIDATE

- Admin muta datos -> cache se invalida INMEDIATAMENTE para ese catalogo
- Primera visita despues de invalidacion -> pega a Supabase, reconstruye, cachea en Redis/Edge
- Siguientes visitas -> reciben cache sin tocar Supabase
- NO warming proactivo. Warming es LAZY y ON-DEMAND por primera visita real
- TTL escalonado: storefront 5min, producto 15min, metadata 60min, analytics 24h
- Stale-while-revalidate: si cache expiro pero reconstruccion falla, servir stale + reconstruir async sin bloquear
- Invalidacion selectiva: admin edita producto -> SOLO purga cache de ese catalogo
- Deduplicacion: si 1000 usuarios llegan simultaneos despues de purge, SOLO la primera reconstruye con lock distribuido. Las demas esperan resultado sin pegar a Supabase

---

## 1. INFRAESTRUCTURA CACHE

Usar Upstash Redis (REST API, serverless-friendly, edge-compatible):
- Env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
- Conectar desde server Nitro via @upstash/redis (REST, no WebSocket)
- Fallback a memoria local (Map + TTL) si Redis no disponible
- Si Redis caido, app funciona pegando a Supabase con circuit breaker

### 1.1 Jerarquia de Claves

```
vento:{env}:storefront:{catalogId}:v1        -> Payload storefront completo (JSON)
vento:{env}:storefront:{catalogId}:v1:lock   -> Lock distribuido
vento:{env}:product:{catalogId}:{productId}  -> Producto individual
vento:{env}:catalog:{catalogId}:meta         -> Metadata (nombre, logo, colores)
vento:{env}:catalog:{catalogId}:categories   -> Lista categorias
vento:{env}:catalog:{catalogId}:reviews:count -> Conteo reviews
vento:{env}:orders:{catalogId}:{date}        -> Pedidos del dia (admin)
vento:{env}:marketplace:landing              -> Landing publico
vento:{env}:marketplace:landing:lock         -> Lock landing
vento:{env}:analytics:{catalogId}:{granularity}:{date} -> Agregados analytics
```

{env} = dev | staging | prod. Nunca mezclar caches de entornos.

### 1.2 TTLs Escalonados

| Dato | TTL Cache | Stale-While-Revalidate |
|------|-----------|------------------------|
| Storefront payload completo | 300s (5min) | 300s extra |
| Producto individual | 900s (15min) | 900s |
| Catalogo metadata | 3600s (60min) | 3600s |
| Categorias catalogo | 3600s (60min) | 1800s |
| Reviews conteo | 600s (10min) | 600s |
| Orders admin dia | 120s (2min) | 60s |
| Marketplace landing | 60s (1min) | 120s |
| Analytics agregados | 86400s (24h) | 86400s |

---

## 2. SERVICIO CENTRAL getOrReconstruct()

Crear server/utils/cache.ts con funcion central:

```typescript
async function getOrReconstruct<T>(
  key: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  reconstructFn: () => Promise<T>,
  options?: {
    lockTimeoutMs?: number;   // default 30000
    maxWaitMs?: number;       // default 5000
    catalogId?: string;       // para invalidacion selectiva
  }
): Promise<T>
```

### 2.1 Flujo Paso a Paso (La primera visita desbloquea)

PASO 1: Intentar leer cache
  - Cache FRESH (age < TTL): servir inmediatamente. Fin.
  - Cache STALE (TTL <= age < TTL+SWR): servir AHORA + reconstruir en background (no bloquear). Fin.
  - Cache EXPIRADO total o MISS: ir a PASO 2.

PASO 2: Cache MISS o expirado -> Reconstruccion con lock distribuido
  - Intentar adquirir lock Redis con NX + PX (expira automaticamente si worker muere).
  - LOCK ADQUIRIDO (la primera visita): ejecutar reconstructFn(), guardar en cache con ex=TTL+SWR, liberar lock con eval delete-if-matches, retornar datos.
  - LOCK NO ADQUIRIDO (visitas 2..N): otra instancia reconstruye. Hacer poll cada 100ms hasta que cache aparezca o timeout (maxWaitMs). Si aparece, retornar cache. Si timeout, fallback a Supabase directo.

PASO 3: Si reconstruccion falla
  - Si hay stale cache (aunque expiro), SERVIRLO igual. Log error. No crash.
  - Si no hay nada, propagar error al storefront mostrando estado amigable.

### 2.2 Reconstruccion en Background (Stale-While-Revalidate)

Para stale hits, reconstruir en background fire-and-forget (NO await, NO bloquear request):
- Intentar adquirir lock
- Si lock adquirido: reconstruir, guardar cache, liberar lock
- Si lock no adquirido: otro worker ya reconstruye, no hacer nada
- Cualquier error en background se loguea, el stale sigue sirviendo

### 2.3 Deduplicacion con Lock Distribuido

Usar script LUA para liberar lock solo si el valor coincide:
```
if redis.call('get', KEYS[1]) == ARGV[1]
then return redis.call('del', KEYS[1])
else return 0 end
```
Esto previene que un worker lento libere el lock de otro worker.

---

## 3. INVALIDACION SELECTIVA (Admin muta -> purga SOLO su catalogo)

### 3.1 Funcion invalidateByCatalog(catalogId)

En server/utils/cache.ts:
```typescript
async function invalidateByCatalog(catalogId: string): Promise<void>
```
- Buscar todas las claves con pattern `vento:{env}:*:{catalogId}:*`
- Eliminar cada clave encontrada
- Eliminar locks asociados (:*:lock)
- Registrar en log: "Cache invalidated for catalog X at timestamp"
- Si Redis no disponible, limpiar fallback en memoria local

### 3.2 Puntos de Hook para Invalidacion

Cada endpoint server de mutacion debe invalidar cache del catalogo afectado INMEDIATAMENTE despues de exito:

- POST /api/products/create|update|delete -> invalidateByCatalog(body.catalog_id)
- POST /api/categories/create|update|delete -> invalidateByCatalog(body.catalog_id)
- POST /api/orders/create|update -> invalidateByCatalog(body.catalog_id)
- POST /api/reviews/approve|reject -> invalidateByCatalog(body.catalog_id)
- POST /api/catalogs/update -> invalidateByCatalog(body.catalog_id)
- POST /api/settings/update -> invalidateByCatalog(body.catalog_id)
- POST /api/appearance/update -> invalidateByCatalog(body.catalog_id)
- POST /api/team/invite|remove|update -> invalidateByCatalog(body.catalog_id)

IMPORTANTE: Invalidar ANTES de retornar 200 al cliente, asi el admin ve cambios inmediatamente al recargar.

### 3.3 Invalidacion de Marketplace Landing

Cuando un catalogo cambia de status (publico/privado/suspendido) o se crea/destruye:
- invalidateKey('marketplace:landing')
- Esto afecta TODOS los catalogos pero es necesario para consistencia del landing

---

## 4. CACHE EN PAGINAS NUXT (Server-Side Rendering)

### 4.1 useAsyncData con Cache

En `app/pages/b/[slug]/index.vue`:
```typescript
const { data: storefront } = await useAsyncData(
  `storefront-${slug}`,
  () => getOrReconstruct(
    `storefront:${catalogId}:v1`,
    300,     // TTL 5min
    300,     // SWR 5min
    () => $fetch(`/api/storefront/${slug}`),
    { catalogId }
  ),
  { server: true }
);
```

### 4.2 Nitro Route Rules

En `nuxt.config.ts`, agregar:
```typescript
nitro: {
  routeRules: {
    '/b/**': { isr: 60, headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    '/api/storefront/**': { headers: { 'Cache-Control': 'public, max-age=5, stale-while-revalidate=300' } }
  }
}
```
ISR (Incremental Static Regeneration) en Nitro + cache Redis = doble capa de cache.

---

## 5. CACHE PARA ADMIN (Optimistic + Refetch)

Admin necesita datos frescos pero no tiene que pegar a Supabase cada 2 segundos:
- Cache orders del dia: TTL 120s, SWR 60s
- Cache analytics: TTL 3600s (admin ve analytics con delay aceptable)
- Cache productos/categorias: TTL 0 (siempre fresh, se invalida on mutation)
- Realtime para pedidos nuevos: cuando llega pedido nuevo via Supabase realtime, invalidar orders cache manualmente y refetch

---

---

## 6. COMPRESION DE CACHE

Cache payloads de storefront pueden ser 50KB-500KB (imagenes base64 o muchos productos). Comprimir con LZ-string o zlib antes de guardar en Redis:
- Umbral: comprimir solo si payload > 10KB
- Guardar flag `compressed: true` en entry metadata
- Descomprimir al leer
- Reducir significativamente uso de memoria Redis y latencia de transferencia REST

---

## 7. METRICAS Y MONITOREO DEL CACHE

Agregar endpoint server `/api/health/cache` o log periodico:
- Hit rate por tipo de clave (storefront, product, metadata, etc.)
- Miss rate despues de invalidacion
- Tiempo promedio de reconstruccion (p99, p95, p50)
- Lock contention rate (visitas que esperaron lock vs. reconstruyeron)
- Stale hits (veces que se sirvio stale mientras reconstruia)
- Redis memory usage por catalogo

Guardar metricas en tabla `cache_metrics` o enviar a Sentry/Analytics.

---

## 8. CIRCUIT BREAKER PARA SUPABASE

Cuando Redis esta caido y muchos usuarios llegan simultaneos, proteger Supabase de colapso:
- Si 10 reconstrucciones simultaneas fallan por timeout de Supabase, abrir circuit breaker por 30s
- Durante circuit breaker ABIERTO: servir ultimo stale cache si existe, o error amigable "Estamos teniendo problemas tecnicos, intenta en unos minutos"
- Cada 5s intentar HALF-OPEN: una reconstruccion de prueba, si pasa -> cerrar breaker
- Logear cada apertura/cierre de circuit breaker
- Estado del breaker visible en `/api/health`

---

## 9. MIGRACION DESDE ESTADO ACTUAL

Paso 1: Instalar dependencias: `@upstash/redis`, `lz-string` (opcional)
Paso 2: Crear `server/utils/cache.ts` con getOrReconstruct, invalidateByCatalog, invalidateKey
Paso 3: Modificar endpoint `server/api/storefront/[slug].get.ts` para usar getOrReconstruct con TTL 300s, SWR 300s
Paso 4: Modificar todos los endpoints de mutacion para invalidar cache del catalogo afectado ANTES de retornar 200
Paso 5: Agregar routeRules ISR en `nuxt.config.ts` para `/b/**`
Paso 6: Probar flujo completo: admin guarda cambio -> cache se invalida -> primera visita reconstruye -> siguientes visitas reciben cache
Paso 7: Verificar que build pasa: `npm run build` y `npx nuxt typecheck`
Paso 8: Documentar variables de entorno necesarias en `.env.example`

---

## RESUMEN EJECUTIVO PARA IA PRO

Este documento describe un sistema de cache distribuido de nivel millonario con las siguientes caracteristicas unicas:

1. **Lazy Warming**: NO hay warming proactivo. La primera visita despues de cada mutacion reconstruye el cache.
2. **Stale-While-Revalidate**: Cache expirado sigue sirviendo mientras se reconstruye en background, sin bloquear al usuario.
3. **Lock Distribuido con Deduplicacion**: 1000 visitas simultaneas despues de un purge generan UNA sola reconstruccion. Las demas esperan el resultado.
4. **Invalidacion Selectiva**: Admin edita su catalogo -> solo se purga cache de ese catalogo. Los demas siguen sirviendo cache intacto.
5. **Doble Capa**: Nitro ISR (60s en edge) + Redis Cache (5min) + Supabase (fallback). La capa mas rapida responde primero.
6. **Circuit Breaker**: Si Supabase colapsa, el sistema sirve stale cache o error amigable, nunca cascada.
7. **Compresion**: Payloads grandes se comprimen en Redis para reducir costo y latencia.
8. **Metricas**: Monitoreo completo de hit rate, lock contention, stale hits, y tiempos de reconstruccion.

ESTE DOCUMENTO FUE CREADO COMO INSTRUCCION COMPLETA PARA IA PRO. LA IA DEBE ANALIZAR EL PROYECTO REAL, DETECTAR ERRORES ADICIONALES NO LISTADOS AQUI, Y EJECUTAR TODAS LAS FASES EN ORDEN.
