# Auditoria tecnica inicial de Vento Cuba hacia produccion

Fecha: 2026-04-24
Carpeta auditada: `C:\Users\USUARIO\Desktop\Plantilla copia\plantilla-copia-completa\app-saas-core`

Este documento es la primera auditoria por capas. No es una lista de ideas bonitas: es una lista de problemas reales que hoy pueden explicar por que la aplicacion a veces carga lento, no carga datos, o se siente inestable. La prioridad de esta primera ronda es velocidad y estabilidad de carga. Seguridad, pagos, inventario avanzado y logistica vienen despues, porque si la app no carga rapido, todo lo demas pierde valor.

## Veredicto sincero

Vento ya esta bastante adelantada para ser una demo funcional o un MVP fuerte. Tiene Nuxt, Pinia, Supabase, tablas separadas, RLS, analytics, realtime, catalogos publicos, admin, pedidos, cupones, resenas, equipo y marketplace. Eso es una base real.

Pero no esta lista para ser una aplicacion nacional de Cuba con miles o decenas de miles de negocios. El problema principal no es el frontend. El problema principal es que todavia hay muchas operaciones hechas como aplicacion pequena:

- Se descargan demasiados datos completos con `select('*')`.
- Hay pantallas que dependen de varias llamadas a Supabase para pintar una sola vista.
- El admin mezcla datos de configuracion, productos, pedidos, resenas y metricas sin una estrategia clara de cache por seccion.
- Algunos watchers realtime vuelven a descargar listas completas ante cada cambio.
- Hay timeouts y keep-alive que intentan tapar sintomas, pero no resuelven la arquitectura.
- La base de datos tiene buenos indices iniciales, pero faltan indices y RPCs especificas para busqueda, marketplace, admin, pedidos, disponibilidad e inventario.
- El codigo tiene texto roto por encoding (`CatÃ¡logo`, `menÃº`, `reseÃ±as`). No es el problema numero uno de rendimiento, pero es senal de que hay que limpiar antes de produccion.
- Hay credenciales publicas de Supabase hardcodeadas en `nuxt.config.ts`. Aunque la anon key es publica por diseno, no debe vivir como fallback fijo en codigo de produccion.

Mi conclusion directa: hoy la app esta en una fase "MVP avanzado". Para llegar a una app de valor serio, primero hay que convertirla en una plataforma de datos rapida. Eso significa mover mas carga a SQL/RPC, cachear de forma intencional, limitar payloads, paginar, medir y despues optimizar.

## Prioridad absoluta: velocidad

La velocidad no se arregla con animaciones ni skeletons. Se arregla con menos datos, menos viajes a Supabase, consultas mejores, cache correcto y pantallas que puedan pintar con datos parciales.

Objetivo tecnico de la fase 1:

- Home marketplace: primer contenido visible en menos de 1 segundo si hay cache local, menos de 2 segundos en red normal.
- Storefront publico `/b/[slug]`: una sola llamada principal para cargar catalogo publico.
- Admin inicial: mostrar sidebar y catalogo activo rapido, sin traer pedidos/resenas/productos completos hasta que la pagina los necesite.
- Pedidos: cargar ultimos pedidos paginados, no todo el historial.
- Resenas: cargar paginado y con filtros, no toda la tabla.
- Analytics: usar una sola RPC o endpoint agregado, no varias consultas desde cliente.

## Archivos revisados en esta primera ronda

### `nuxt.config.ts`

Problemas:

- `devtools: { enabled: true }` esta activo. En produccion debe estar apagado o condicionado por entorno.
- `supabaseUrl` y `supabaseAnonKey` tienen fallback hardcodeado. La anon key no es secreta como una service key, pero dejarla fija en el repo crea malos habitos y dificulta separar dev/staging/prod.
- Hay texto roto por encoding en title/meta: `Vento â€”`, `catÃ¡logo`, `lÃ­der`. Esto debe corregirse porque afecta confianza, SEO y compartidos.
- Solo se separa el chunk de Supabase. Falta revisar otros chunks grandes: storefront, admin, chart.js, leaflet, QR, country-state-city.

Mejoras:

- Mover configuracion publica a `.env` obligatorio. Si falta, fallar claro.
- Desactivar devtools por defecto.
- Revisar bundle analyzer para saber que pesa mas.
- Cargar `chart.js`, `leaflet`, `qr-code-styling` y mapas solo en paginas que los necesitan.
- Revisar SSR: ahora existe `ssr: true`, pero algunas paginas usan `server: false`, lo cual reduce beneficio de SSR.

### `app/plugins/supabase.client.ts`

Problemas:

- Hay un keep-alive cada 4 minutos que hace query a `catalogs`. Eso intenta mantener caliente la conexion, pero en una app grande puede generar trafico artificial por cada usuario abierto.
- Timeout global de 12 segundos: ayuda a no quedarse colgado, pero puede abortar consultas lentas sin mostrar una recuperacion elegante.
- El plugin es solo cliente. Muchas cargas importantes se hacen desde cliente, no desde server/Nitro.

Riesgo:

- Si 10,000 usuarios tienen la app abierta, ese keep-alive puede convertirse en miles de queries innecesarias.

Mejoras:

- Eliminar o limitar keep-alive a admin autenticado, no a todos.
- Crear endpoints server para cargas publicas criticas con cache headers.
- Medir latencia real antes de usar keep-alive como solucion.

### `app/composables/useSupabaseBackend.ts`

Este es el archivo mas importante del backend cliente. Hoy concentra demasiada responsabilidad.

Problemas graves de velocidad:

- `getCatalogHeaderById()` usa `.select('*')`.
- `fetchCatalogRelations()` hace 4 consultas paralelas: categorias, productos, reviews y orders.
- `getCatalogById()` termina trayendo todo el catalogo, productos, resenas y pedidos. Para muchas pantallas del admin esto es demasiado.
- `fetchPublicCatalogRelations()` hace varias consultas para la vista publica.
- `getCoupons()` se llama separado en algunas rutas.
- `watchOrders()`, `watchReviews()` y `watchCoupons()` reaccionan a cambios realtime volviendo a descargar listas completas.
- `buildMasterDashboard()` es N+1: trae todos los catalogos y luego, por cada catalogo, cuenta orders, reviews y products. Eso explota cuando existan miles de negocios.
- `recalculateReviewStats()` recalcula ratings desde el cliente/SDK leyendo reviews y productos, y luego actualiza producto por producto.
- El archivo mezcla auth, catalogos, marketplace, analytics, master dashboard, cupones, pedidos, resenas, referidos y equipo. Es demasiado grande para mantener.

Lo que ya esta bien:

- Hay intentos buenos: funciones RPC para marketplace, analytics agregadas, realtime, separacion de tablas, RLS.
- `getMarketplaceLanding()` ya usa RPCs para home.
- Existe una idea correcta de payload unico para storefront publico.

Mejoras prioritarias:

1. Dividir este archivo en modulos:
   - `backend/auth.ts`
   - `backend/catalog-admin.ts`
   - `backend/storefront.ts`
   - `backend/marketplace.ts`
   - `backend/orders.ts`
   - `backend/reviews.ts`
   - `backend/analytics.ts`
   - `backend/team.ts`

2. Reemplazar `select('*')` por columnas exactas.

3. Crear RPCs especificas:
   - `get_admin_bootstrap(owner_uid)` para sidebar y catalogos basicos.
   - `get_catalog_editor_payload(catalog_id)` para categorias/productos del editor.
   - `get_orders_page(catalog_id, status, cursor, limit)` para pedidos paginados.
   - `get_reviews_page(catalog_id, approved, cursor, limit)` para resenas paginadas.
   - `get_storefront_payload(slug)` para publico.
   - `get_master_dashboard_summary()` para el owner master sin N+1.

4. Cambiar realtime:
   - Para INSERT de pedido, anadir solo el nuevo pedido al estado local.
   - Para UPDATE, modificar solo el item cambiado.
   - Para DELETE, quitar solo el item.
   - No volver a pedir toda la lista salvo reconexion o inconsistencia.

5. Mover recalculo de reviews a triggers SQL:
   - Al aprobar/eliminar review, trigger actualiza rating del catalogo y del producto.
   - El cliente no debe recalcular ratings completos.

### `app/stores/catalogs.ts`

Problemas:

- `loadOwnerCatalogs()` carga catalogos por owner, pero sin relaciones; eso esta bien para listado. Luego `setActiveCatalog()` trae el catalogo completo con `getCatalogById()`, que incluye pedidos, resenas y productos. Esto es pesado.
- `activeCatalog` se usa como fuente para muchas paginas. Eso provoca que el admin dependa de una carga grande inicial o de cargas mezcladas.
- `addOrder()` y `addReview()` tambien mutan `publicCatalog` y `activeCatalog`, mezclando responsabilidades.

Mejoras:

- Separar `activeCatalogHeader` de `catalogEditorPayload`.
- El layout admin solo necesita: id, slug, businessName, logo, plan, status.
- Productos solo se cargan en `/admin/catalog`.
- Pedidos solo se cargan en `/admin/orders`.
- Reviews solo se cargan en `/admin/reviews`.
- Cupones solo se cargan en `/admin/coupons`.

Impacto:

- El panel admin dejaria de esperar a que carguen datos que no necesita para pintar la navegacion.

### `app/stores/catalog.ts`

Problemas:

- `hydrateCatalog(storeId)` llama `backend.getCatalogById(storeId)`, que trae tambien orders/reviews. Para el gestor de productos solo hacen falta categorias y productos.
- `upsertProduct()` no es optimista de verdad: primero espera `backend.upsertProduct()` y despues actualiza estado local. Si Supabase tarda, el usuario siente lentitud.
- `deleteProduct()` espera backend y despues actualiza. Puede sentirse lento.

Mejoras:

- Crear `getCatalogEditorPayload(catalogId)` que solo traiga categorias y productos.
- Hacer optimistic update con rollback:
  - Actualizar UI inmediatamente.
  - Enviar a Supabase.
  - Si falla, revertir y mostrar error.
- Separar inventario/stock de producto base. Hoy variantes viven en JSON; para inventario real se necesitan tablas.

### `app/stores/orders.ts`

Problemas:

- `startRealtime()` depende de `backend.watchOrders()`, y este vuelve a descargar todos los pedidos.
- `items` mantiene todos los pedidos cargados en memoria.
- `monthSales` calcula ventas del mes recorriendo lo cargado. Si no esta cargado todo el mes, el dato puede ser falso. Si se carga todo, sera lento.
- Notificaciones se basan en cambios locales, pero no hay canal robusto de push real.

Mejoras:

- Cargar solo ultimos 25 o 50 pedidos.
- Agregar paginacion por cursor `created_at`.
- Agregar RPC `get_order_counts_by_status(catalog_id)`.
- Calcular ventas del mes en SQL, no en frontend.
- Realtime debe aplicar cambios incrementales, no refetch completo.
- Push real debe ser por service worker o proveedor, no solo `Notification` del navegador abierto.

### `app/stores/reviews.ts`

Problemas:

- Misma pauta: realtime termina refrescando lista completa.
- `averageApprovedRating` calcula sobre lo que este cargado, no necesariamente toda la realidad.

Mejoras:

- Paginacion por estado: pendientes, aprobadas.
- Totales y rating agregados desde SQL.
- Moderacion con optimistic update.

### `app/layouts/admin.vue`

Problemas:

- El layout hace bootstrap de catalogos y revalidacion en focus/visibility.
- Si el usuario tiene catalogo por defecto, `ensureOwnerCatalogs()` puede recargar cuando no siempre hace falta.
- El layout depende de `catalogStore.activeCatalog`, que puede ser mas pesado de lo necesario.
- Texto roto por encoding en muchas etiquetas.

Mejoras:

- Layout debe cargar solo `admin_bootstrap`: usuario + lista minima de catalogos + catalogo activo minimo.
- Nada de productos/pedidos/resenas en layout.
- Cachear bootstrap durante la sesion.
- Mostrar shell inmediatamente y cargar secciones dentro.

### `app/middleware/auth.global.ts`

Problemas:

- Middleware corre en cliente solamente. Eso significa que paginas protegidas no estan protegidas desde SSR.
- Cada navegacion protegida llama `authStore.initAuth()`. Tiene promesa compartida, lo cual ayuda, pero el flujo aun depende de Supabase en cliente.

Mejoras:

- Mantenerlo por ahora, pero para produccion fuerte considerar auth server-side con cookies Supabase.
- Evitar bloquear rutas publicas por inicializacion de auth innecesaria.
- Medir si `initAuth()` esta retrasando la primera entrada al admin.

### `app/pages/index.vue`

Lo bueno:

- Hay SWR local con `useMarketplaceCache`.
- El home intenta pintar cache y refrescar en segundo plano.
- `getMarketplaceLanding()` usa RPCs, mejor que muchas consultas sueltas.

Problemas:

- `useAsyncData` no se usa para server data; el refresh ocurre en `onMounted`, o sea despues de montar en cliente.
- Si no hay cache, el usuario ve skeleton hasta que respondan 4 RPCs.
- `forceRefresh` llama toda la carga.
- El filtro/busqueda es local sobre lo recibido; para busqueda nacional real hace falta backend search.

Mejoras:

- Crear endpoint server `/api/marketplace/landing` con cache corto.
- Hacer RPC unica `get_marketplace_landing_payload()` que devuelva topStores, viralProducts, hubs y forYou en un JSON.
- Para busqueda real: tabla de busqueda o vista materializada con `tsvector`, indices GIN y ranking.
- Soportar filtros por ciudad/provincia desde SQL, no solo cliente.

### `app/pages/b/[slug].vue`

Problemas historicos:

- La vista publica antes necesitaba varias cargas: catalogo, relaciones, cupones.
- Tiene `server: false` y `lazy: true`, entonces no aprovecha SSR para entregar contenido rapido y SEO.
- Si la conexion tarda, el usuario ve pantalla de "Preparando experiencia".

Mejoras:

- Usar una RPC unica de storefront.
- Evaluar SSR o prerender/cache para catalogos publicos populares.
- Cache HTTP por slug con revalidacion corta.
- Crear fallback offline: ultimo menu visto por slug en IndexedDB/localStorage.

### `app/pages/admin/index.vue`

Problemas:

- Analytics se reconsulta cada 15 segundos desde cliente.
- El watcher actual consulta varias tablas (`catalog_analytics_daily`, sessions, daily_sessions).
- Para un admin abierto todo el dia, esto suma muchas consultas.

Mejoras:

- Volver a usar o consolidar `get_catalog_analytics_snapshot` como RPC unica.
- Polling adaptativo:
  - Cada 15s solo si la pestana esta visible y hay actividad reciente.
  - Cada 60s o 120s si no hay cambios.
- Cachear ultimo resultado.
- No bloquear el admin si analytics falla.

### `app/pages/admin/orders.vue`

Problemas:

- Lista renderiza todo lo que `ordersStore.items` tenga.
- No hay paginacion visual.
- Si el catalogo tiene 20,000 pedidos, esto no escala.

Mejoras:

- Filtros por estado desde SQL.
- Paginacion por cursor.
- Busqueda por cliente/id desde SQL.
- Detalle del pedido bajo demanda si el payload resumido es pequeno.

### `app/pages/admin/catalog.vue`

Problemas:

- Carga todo el catalogo de productos/categorias en el editor.
- El editor usa imagenes directas y uploads desde cliente.
- Hay timeouts manuales de 15s para tapar demora.
- Hay funciones antiguas sin uso aparente (`handleFileSelection`, `removeImage`) que parecen legacy.

Mejoras:

- Payload especifico de editor.
- Productos paginados o virtualizados si el negocio tiene cientos/miles de items.
- Upload con compresion/redimensionamiento antes o durante subida.
- Generar thumbnails.
- No borrar imagen anterior hasta confirmar que el producto nuevo quedo guardado.

### `app/pages/admin/team.vue`

Problemas:

- Usa Supabase directamente en la pagina, no a traves del backend composable.
- Usa `.select('*')`.
- El sistema de permisos se guarda, pero no se ve aplicado en middleware/rutas. Puede ser solo decorativo si no se valida en backend/RLS.

Mejoras:

- Mover team a `useSupabaseBackend` o modulo `backend/team`.
- Seleccionar columnas exactas.
- Aplicar permisos reales en RLS y en rutas admin.
- Crear invitaciones reales por email o magic link si esto sera multiusuario.

### `supabase/schema.sql`

Lo bueno:

- Hay tablas separadas para catalogos, productos, categorias, pedidos, resenas, cupones, analytics y equipo.
- Hay RLS en tablas principales.
- Hay indices basicos por `catalog_id` y fechas.
- Hay RPCs para marketplace.
- Hay analytics agregadas por dia.

Problemas:

- `catalogs.settings`, `catalogs.theme`, `products.variants`, `products.tags`, `orders.items` estan en JSONB. Eso es flexible, pero si todo vive en JSONB, despues buscar, filtrar e inventariar sera mas dificil.
- Faltan tablas para inventario real:
  - stock por variante
  - movimientos de stock
  - reservas de stock
  - sucursales
  - horarios por sucursal
  - repartidores
  - zonas/rutas
  - pagos
  - transacciones
  - estados de pago
  - auditoria de cambios
- Faltan indices para busqueda por texto y ubicacion.
- Hay definiciones duplicadas de `catalog_team_members` y politicas en el mismo schema. Eso debe limpiarse.
- Algunas politicas publicas permiten insert de orders/reviews/analytics si el catalogo esta publicado. Eso esta bien para MVP, pero necesita anti-spam, rate limit y validacion server.
- `security definer` debe revisarse funcion por funcion. Es potente, pero si una funcion no valida bien, puede saltarse RLS de forma peligrosa.

Mejoras de base de datos:

- Agregar busqueda:
  - `tsvector` para negocios y productos.
  - indice GIN.
  - tabla/vista `marketplace_search_index`.
- Agregar ubicacion:
  - columnas normalizadas country/state/city en `catalogs` o tabla `business_locations`.
  - si se usara mapa real: PostGIS.
- Agregar inventario:
  - `product_variants`
  - `inventory_items`
  - `inventory_movements`
  - `inventory_reservations`
- Agregar pedidos profesionales:
  - `order_status_history`
  - `order_payments`
  - `order_events`
- Agregar auditoria:
  - `audit_log`
  - quien cambio que y cuando.

## Por que a veces no cargan las cosas

Hipotesis mas probables segun el codigo:

1. Pantallas esperan consultas grandes desde cliente.
   - Admin puede terminar cargando catalogo completo con productos, pedidos y resenas aunque la pantalla no necesite todo.

2. Realtime dispara refetch completo.
   - Un cambio en pedidos/resenas/cupones puede provocar otra carga completa de la lista.

3. Timeouts de 12s/15s cortan cargas lentas.
   - Si Supabase o la red estan lentos, el fetch se aborta y la UI puede quedar en estado parcial.

4. No hay cache suficiente para admin.
   - Marketplace tiene cache local; admin no tiene una estrategia equivalente por seccion.

5. Dependencia de cliente.
   - Muchas cargas empiezan en `onMounted` o `server: false`, entonces el usuario espera a que JS cargue, se hidrate y luego consulte Supabase.

6. Payloads demasiado grandes.
   - `select('*')` trae columnas JSON grandes aunque solo hagan falta 3 campos.

7. Falta de paginacion.
   - Pedidos, reviews, team y productos pueden crecer sin limite.

## Orden recomendado de trabajo

### Fase 1: estabilidad y velocidad de carga

Objetivo: que home, storefront y admin abran rapido.

Tareas:

1. Crear medicion antes de tocar mas:
   - medir tiempo de `initAuth`
   - medir `loadOwnerCatalogs`
   - medir `setActiveCatalog`
   - medir `/b/[slug]`
   - medir `getMarketplaceLanding`

2. Crear `admin_bootstrap`:
   - Una RPC que devuelva usuario, catalogos minimos y catalogo activo minimo.
   - El layout admin no debe cargar productos/pedidos/resenas.

3. Crear payload de editor:
   - `get_catalog_editor_payload(catalog_id)`
   - Solo categorias y productos necesarios.

4. Crear pedidos paginados:
   - `get_orders_page(catalog_id, status, cursor, limit)`
   - `get_order_counts(catalog_id)`

5. Crear reviews paginadas:
   - `get_reviews_page(catalog_id, approved, cursor, limit)`
   - `get_review_stats(catalog_id)`

6. Unificar storefront publico:
   - Una RPC para catalogo publico completo.
   - Despues cache HTTP o SWR por slug.

7. Quitar `select('*')` de rutas criticas.

Resultado esperado:

- Admin abre aunque pedidos o analytics fallen.
- Storefront carga con una llamada principal.
- Pedidos no traen todo el historial.
- Menos pantallas bloqueadas por Supabase.

### Fase 2: seguridad minima de produccion

Objetivo: que no se pueda abusar facilmente del sistema.

Tareas:

1. Validar RLS completa.
2. Rate limit para:
   - crear pedidos
   - crear reviews
   - analytics
   - register/login
3. Validacion server de pedidos:
   - productos existen
   - precios coinciden
   - cupon valido
   - negocio acepta pedidos
4. Separar anon client de operaciones sensibles.
5. Revisar todas las funciones `security definer`.
6. Aplicar permisos reales del equipo.

### Fase 3: modelo de negocio real

Objetivo: que sirva para todos los negocios de Cuba, no solo menus.

Tareas:

1. Normalizar tipos de negocio:
   - restaurante
   - tienda
   - ferreteria
   - ropa
   - farmacia
   - servicios
   - belleza
   - tecnologia

2. Crear inventario real:
   - variantes como tablas, no solo JSON.
   - stock por variante.
   - alertas de bajo stock.

3. Crear pagos:
   - pago manual por QR
   - estado pendiente/confirmado/rechazado
   - comprobantes
   - integraciones futuras.

4. Crear logistica:
   - zonas
   - repartidores
   - asignacion
   - tracking de estado.

### Fase 4: marketplace nacional

Objetivo: descubrir negocios y productos rapido.

Tareas:

1. Busqueda nacional con indice.
2. Filtros por ciudad/provincia/tipo.
3. Ranking por:
   - actividad reciente
   - rating
   - disponibilidad
   - cercania
   - conversion
4. Moderacion de negocios.
5. Admin master escalable.

## Errores o deudas que deben corregirse antes de produccion

- Texto roto por encoding en muchos archivos.
- Credenciales fallback en `nuxt.config.ts`.
- `devtools` activo.
- Duplicacion/legacy en componentes: existe `StorefrontProductSheet.vue` y `torefrontProductSheet.vue`.
- `useSupabaseBackend.ts` demasiado grande.
- Direct access a Supabase en paginas como `admin/team.vue`.
- Sin paginacion fuerte en pedidos/resenas/productos.
- Realtime con refetch completo.
- Master dashboard con N+1 queries.
- Permisos de equipo no parecen aplicarse de forma real en backend/rutas.
- No hay service worker/PWA offline real revisado en esta ronda.
- No hay CI/CD, tests ni monitoreo configurados en lo revisado.
- No hay Sentry.
- No hay validacion server fuerte de pedidos.
- No hay colas/jobs para tareas pesadas.

## Primeros 10 cambios que yo haria, en orden

1. Crear medicion de performance simple y logs de tiempos por carga.
2. Sacar payload pesado del layout admin.
3. Crear RPC `get_admin_bootstrap`.
4. Crear RPC `get_catalog_editor_payload`.
5. Cambiar pedidos a paginacion SQL.
6. Cambiar reviews a paginacion SQL.
7. Cambiar realtime para aplicar cambios incrementales.
8. Quitar `select('*')` de rutas criticas.
9. Corregir encoding y textos rotos.
10. Desactivar devtools y limpiar config/env.

## Como seguiremos archivo por archivo

Orden recomendado de analisis profundo:

1. `app/composables/useSupabaseBackend.ts`
   - Es el centro de datos. Hay que dividirlo y decidir RPCs.

2. `supabase/schema.sql`
   - Hay que limpiar duplicados, indices, funciones y modelo futuro.

3. `app/layouts/admin.vue`
   - Hay que hacer que el admin abra rapido.

4. `app/stores/catalogs.ts`
   - Hay que separar header de catalogo vs datos pesados.

5. `app/stores/catalog.ts`
   - Hay que optimizar editor de productos.

6. `app/stores/orders.ts` + `app/pages/admin/orders.vue`
   - Pedidos debe ser profesional, paginado y en tiempo real real.

7. `app/stores/reviews.ts` + `app/pages/admin/reviews.vue`
   - Moderacion y estadisticas.

8. `app/pages/index.vue`
   - Marketplace nacional y busqueda.

9. `app/pages/b/[slug].vue` + storefront components
   - Carga publica, cache, offline.

10. Seguridad:
   - middleware
   - RLS
   - team permissions
   - rate limits

## Estado real despues de las iteraciones aplicadas

Quedaron cerrados respecto a esta auditoria:

- payload unico de storefront publico con route server y cache corto;
- payload especifico del editor de catalogo;
- paginacion visual completa en UI de pedidos y reseÃ±as con filtros server-side y carga incremental;
- pedidos y reseñas paginados con estadisticas agregadas;
- realtime incremental para pedidos y reseñas;
- validacion server basica de pedidos y reseñas publicas;
- proteccion de `/admin` y permisos reales de equipo en rutas/RLS;
- base inicial para busqueda nacional por SQL y endpoint server del marketplace;
- una sola RPC JSON para el home marketplace y las busquedas principales;
- `admin_bootstrap` dedicado para que el layout admin cargue catalogos y permisos minimos sin rehidratar relaciones pesadas.
- cache de `admin_bootstrap` para evitar recargas en cada navegacion protegida del admin;
- polling de analytics del admin mas adaptativo para no consultar cada 15s de forma fija durante toda la sesion;
- eliminacion del keep-alive artificial de Supabase en cliente y configuracion base mas limpia para redes lentas.
- cache local del storefront por `slug` con fallback offline para seguir mostrando el catalogo si la API falla momentaneamente.
- endurecimiento de endpoints publicos con sanitizacion compartida, `requestId`, limite de payload y mejor tolerancia a reintentos en pedidos/resenas.
- proteccion contra duplicado de pedidos por reenvio bajo mala conectividad usando ids cliente mas robustos.
- actualizacion de uso de cupones en el endpoint server de pedidos, que antes quedaba inconsistente respecto a la ruta directa del backend.

Todavia no quedaron cerrados:

- limpieza total de encoding roto;
- observabilidad real (`Sentry`, persistencia/consulta central de logs y tracing distribuido);
- CI/CD, colas y PWA/offline mas profundo;
- inventario, logistica y auditoria de cambios.
- rate limit serio fuera de memoria local (Redis/WAF/edge).
- esquema formal de planes/autorizacion manual desde panel master, sin pagos integrados dentro de la app por ahora.

## Nota importante sobre produccion

Una app de "100,000 USD" no se define por tener muchas pantallas. Se define por:

- cargar rapido aunque haya datos grandes,
- no romperse con conexiones malas,
- proteger datos de negocios,
- permitir operar pedidos reales,
- tener monitoreo,
- tener backups,
- tener flujo de despliegue,
- tener modelo de datos preparado para crecer,
- poder medir errores y rendimiento.

Vento puede llegar ahi, pero la ruta correcta no es seguir agregando botones. La ruta correcta es primero convertir el backend en una plataforma seria: RPCs, indices, cache, paginacion, validacion, seguridad y observabilidad.
