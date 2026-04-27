# Cambios aplicados para produccion

Fecha: 2026-04-24

## Cambios de velocidad aplicados

- El editor de catalogo ya no necesita cargar pedidos y resenas para editar productos.
- `useSupabaseBackend.ts` dejo de usar `select('*')` en las rutas criticas auditadas.
- La carga de productos/categorias del editor usa `get_catalog_editor_payload`.
- Realtime de pedidos ahora carga una pagina inicial limitada y aplica INSERT/UPDATE/DELETE en memoria.
- Realtime de resenas ahora carga una pagina inicial limitada y aplica cambios incrementales.
- La lista inicial de pedidos/resenas se limita a 50 registros para evitar bloquear admin con historiales grandes.
- El cambio de catalogo activo en el admin ya no dispara una carga completa de productos, pedidos y resenas.
- El keep-alive de Supabase ya no corre para visitantes publicos; queda restringido a rutas admin/master.

## Cambios SQL agregados

Aplicar `supabase/schema.sql` en Supabase antes de desplegar el frontend.

Funciones nuevas:

- `get_admin_bootstrap()`
- `get_marketplace_landing_payload(query_text text, user_tags jsonb, stores_limit integer, products_limit integer, hubs_limit integer, feed_limit integer)`
- `get_public_storefront_payload(slug_text text)`
- `get_catalog_editor_payload(target_catalog_id uuid)`
- `get_orders_page(target_catalog_id uuid, status_filter text, before_created_at timestamptz, limit_count integer)`
- `get_reviews_page(target_catalog_id uuid, approved_filter boolean, before_created_at timestamptz, limit_count integer)`
- `search_marketplace_stores(query_text text, limit_count integer)`
- `search_marketplace_feed(query_text text, limit_count integer)`
- `search_marketplace_hubs(query_text text, limit_count integer)`
- `has_catalog_role(target_catalog uuid, allowed_roles text[])`
- `has_catalog_permission(target_catalog uuid, permission_key text)`

Indices nuevos:

- `idx_catalogs_slug_lower`
- `idx_catalogs_settings_gin`
- `idx_products_catalog_active_order`
- `idx_products_tags_gin`
- `idx_catalogs_marketplace_search`
- `idx_products_marketplace_search`
- `idx_reviews_catalog_approved_created`
- `idx_orders_catalog_status_created`
- `idx_coupons_catalog_public_active`

## Cambios de seguridad inicial

- `server/api/analytics/collect.post.ts` tiene rate limit basico en memoria por IP.
- `app/pages/admin/team.vue` ya no usa `select('*')` para miembros del equipo.
- `nuxt.config.ts` ya no trae Supabase URL/key hardcodeadas como fallback.
- `devtools` queda apagado salvo que `NUXT_DEVTOOLS=true`.

## Variables obligatorias

En produccion deben existir:

```env
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Si faltan, la app compila pero no podra conectar a Supabase.

## Verificacion

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto.

Warnings no bloqueantes:

- Sourcemap de `nuxt:module-preload-polyfill`.
- Deprecation warning de trailing slash mapping en dependencia de Vue/Nitro.

## Cambios de la tercera iteracion cerrados

- El shell admin ahora arranca con `get_admin_bootstrap()` y deja de recomponer catalogos/permisos con varias consultas cliente para pintar el layout.
- `/admin` vuelve a estar protegido con middleware real y ya no queda abierto por tener el guard desactivado.
- El store de catalogos ahora resuelve acceso por dueno y por miembro de equipo activo, no solo por `owner_uid`.
- La navegacion admin oculta secciones que el miembro actual no puede abrir segun sus permisos.
- El storefront publico `/b/[slug]` dejo de depender de `server: false` y ahora carga desde `server/api/storefront/[slug].get.ts` con cache HTTP corto.
- Se anadio mapeo compartido para el payload publico del storefront y util server de Supabase para soportar SSR/Nitro.
- El schema agrega helpers `has_catalog_role` y `has_catalog_permission` para que los permisos del equipo si se apliquen en RLS sobre catalogos, productos, pedidos, resenas, cupones, analytics y equipo.

## Cambios de la cuarta iteracion cerrados

- El endpoint server del marketplace ahora puede resolver home y busquedas desde una sola RPC JSON (`get_marketplace_landing_payload`) y deja fallback local por si el SQL nuevo aun no esta aplicado.
- El marketplace ya no depende solo de filtrado local en cliente para buscar tiendas y productos.
- Se anadio `server/api/marketplace/landing.get.ts` como capa server para home y busqueda, con cache HTTP corto.
- La home `app/pages/index.vue` ahora consume ese endpoint server para refresco del feed y para busquedas nacionales.
- Se agregaron indices GIN y funciones SQL de busqueda para tiendas, productos/feed y hubs regionales.
- La busqueda ahora puede encontrar por negocio, tagline, ciudad, provincia, tipo de negocio, nombre de producto, descripcion y tags.
- La lista de pendientes se ajusta: permisos reales de equipo ya no quedan como pendiente base de la auditoria.

## Cambios de la quinta iteracion cerrados

- La UI de `app/pages/admin/orders.vue` ahora usa filtros por estado conectados a paginacion server-side real y muestra progreso de carga, busqueda local y conteos de bandeja.
- La UI de `app/pages/admin/reviews.vue` ahora usa filtros por estado de moderacion conectados a paginacion server-side real y deja de depender de dos listas completas mezcladas.
- `app/stores/orders.ts` ahora mantiene un filtro activo, pagina por estado desde SQL y ajusta altas/modificaciones realtime segun la bandeja visible.
- `app/stores/reviews.ts` ahora mantiene un filtro activo, pagina por aprobacion desde SQL y tiene reconexion realtime mas robusta cuando se cae el canal.
- `supabase/schema.sql` y `app/composables/useSupabaseBackend.ts` ya aceptan estados agrupados de pedidos (`preparing` incluye `viewed`, `completed` incluye `closed`) para que la UI no tenga que reconstruir eso sola.

## Cambios de la sexta iteracion cerrados

- `app/stores/catalogs.ts` ahora cachea `admin_bootstrap` por usuario/sesion para que el middleware y el layout no rehagan la carga minima del admin en cada navegacion.
- `app/composables/useSupabaseBackend.ts` ahora usa polling adaptativo para analytics: mas frecuente cuando hay actividad visible y mucho mas espaciado cuando la sesion esta ociosa.
- `app/plugins/supabase.client.ts` deja de hacer keep-alive artificial sobre `catalogs` y amplia de forma prudente el timeout cliente para tolerar redes moviles lentas sin generar trafico basura.
- `nuxt.config.ts` ahora deriva el `preconnect` desde la URL real de Supabase y limpia metadatos base que seguian con texto roto o configuracion fija de entorno.

## Cambios de la septima iteracion cerrados

- `app/composables/useStorefrontCache.ts` agrega cache local por `slug` para storefront con persistencia en `localStorage`.
- `app/pages/b/[slug].vue` ahora persiste el payload correcto del catalogo publico y, si la API falla, reutiliza la ultima copia valida para no dejar al usuario sin menu.
- La ruta publica `/b/[slug]` muestra un aviso cuando esta sirviendo una copia guardada y reinicia correctamente el tracking al cambiar de catalogo.
- Se limpiaron textos rotos visibles en la pantalla publica critica de storefront para no degradar la percepcion de calidad en estados de carga o error.

## Lo que falta para completar toda la auditoria

Esta tanda ataca la velocidad mas urgente. Todavia faltan bloques grandes:

- Validacion server de pedidos en app ya existe, pero falta mover el rate limit a edge/WAF y endurecer antifraude real.
- Rate limit real en edge/WAF para pedidos, resenas y auth.
- Sentry/monitoreo.
- CI/CD.
- PWA/offline real mas alla del cache local de storefront.
- Limpieza de encoding/textos rotos en toda la base de componentes.
- `useSupabaseBackend.ts` sigue demasiado grande y conviene partirlo por dominios.
- Modelo de inventario con tablas de stock y variantes.
- Pagos y estados de pago.
- Logistica/repartidores.

## Cambios de la octava iteracion cerrados

- `app/composables/useSupabaseBackend.ts` ya no concentra toda la logica nueva de auth, analytics, cupones, equipo y referidos en un solo bloque: esas responsabilidades se movieron a `app/composables/backend/auth.ts`, `app/composables/backend/analytics.ts`, `app/composables/backend/operations.ts` y `app/composables/backend/types.ts`.
- El composable principal mantiene la misma API publica para no romper stores ni paginas, pero ahora delega esos dominios a modulos reutilizables para seguir partiendo el backend por capas sin rehacer medio proyecto.
- El componente legacy mal nombrado `app/components/storefront/torefrontProductSheet.vue` deja de ser una copia enorme fuera de sincronizacion y pasa a ser un alias del componente canonico `StorefrontProductSheet`, evitando otra fuente de drift en storefront.

## Verificacion adicional

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto despues de la modularizacion y la limpieza del alias legacy.

## Cambios de la novena iteracion cerrados

- `app/composables/useSupabaseBackend.ts` se reescribio para dejar de mezclar implementaciones duplicadas y pasar a ser un ensamblador limpio de modulos.
- La modularizacion del backend cliente ya cubre catalogos/storefront/marketplace/dashboard (`app/composables/backend/catalog.ts`) y pedidos/resenas/realtime (`app/composables/backend/commerce.ts`), ademas de auth, analytics, operaciones y tipos.
- El tamano del composable principal bajo de forma fuerte y con eso se reduce el riesgo de seguir tocando el backend desde un solo archivo gigante.
- Se agrego `PENDIENTES_PRODUCCION_DETALLADOS.md` como backlog detallado de lo que aun falta para convertir la plataforma en una operacion nacional robusta.

## Verificacion adicional de la novena iteracion

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto despues de partir completamente `useSupabaseBackend.ts`.

## Cambios de la decima iteracion cerrados

- Se agrego `server/utils/security.ts` como base compartida para endpoints publicos con lectura segura del body, limites de tamano, sanitizacion de texto, rate limit unificado en memoria, `requestId` por request y logging interno consistente.
- `server/api/orders/create.post.ts` ahora valida y sanea mejor el payload, acepta id de pedido cliente para tolerar reintentos en redes malas, evita duplicados por reenvio, y actualiza el uso del cupon despues de guardar el pedido.
- `server/api/reviews/create.post.ts` ahora usa la misma capa dura de validacion/sanitizacion y tambien evita duplicados por reintentos del cliente.
- `server/api/analytics/collect.post.ts` se limpio para usar utilidades compartidas, reducir payloads basura y dejar trazabilidad minima por request.
- `server/api/storefront/[slug].get.ts` agrega `requestId`, logging interno y encabezados mas consistentes para servir mejor el storefront publico.
- `app/utils/entityIds.ts`, `app/composables/useStorefrontExperience.ts` y `app/components/storefront/StorefrontMenuBase.vue` ahora generan ids cliente mas robustos para pedidos y resenas y evitan doble envio en la experiencia publica principal.

## Verificacion adicional de la decima iteracion

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto despues del endurecimiento de endpoints publicos y la proteccion contra reintentos duplicados.

## Cambios de la undecima iteracion cerrados

- Se analizo completo `PROMPT_INTEGRACION_GENERADOR_TIENDAS.md` y se aterrizo en una integracion compatible con Vento, sin duplicar el dominio actual de catalogos/productos/pedidos/resenas.
- `app/types/catalog.ts` y `app/data/defaults.ts` ahora soportan el layout publico `store` y sus nuevos campos de identidad comercial (`storeTopBarHtml`, `storeHeroTitle`, `storeFooterText`, etc.).
- Se creo `app/components/storefront/StorefrontShop.vue` como nueva experiencia publica de tienda, con hero, branding, favoritos, categorias, carrito y reutilizacion del checkout existente.
- `app/pages/b/[slug].vue`, `app/components/admin/PreviewModal.vue` y `app/pages/admin/appearance.vue` ya permiten usar, previsualizar y configurar este nuevo modo de tienda desde el admin actual.
- Se agrego `INTEGRACION_GENERADOR_TIENDAS_PLAN_REAL.md` para dejar documentado por que la migracion correcta debe apoyarse en el dominio actual y no crear un segundo backend paralelo `stores_*`.

## Verificacion adicional de la undecima iteracion

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto despues de agregar el layout `store`, sus nuevos campos de configuracion y el preview en admin.

## Cambios de la doceava iteracion cerrados

### Lightbox y galeria de imagenes

- Se creo `app/components/storefront/StorefrontLightbox.vue` como lightbox profesional con zoom, navegacion entre imagenes, miniaturas, gestos touch (swipe), teclado y modo pantalla completa.
- Se actualizo `app/components/storefront/StorefrontProductSheet.vue` para mostrar galeria completa de imagenes (no solo la principal), con miniaturas, navegacion lateral, contador de imagenes y boton de zoom que abre el lightbox.
- Se integro timer countdown visible dentro del product sheet para ofertas con tiempo limite.

### Ordenamiento y filtrado de productos

- Se agrego selector de ordenamiento al StorefrontShop: destacados, precio ascendente/descendente, nombre A-Z/Z-A, en oferta.
- Se implemento panel de filtros por rango de precio con predefinidos rapidos (hasta $50, hasta $100, $100-$200, $200+) y filtro personalizado con min/max.
- Los filtros y ordenamiento se aplican sin recargar la pagina y se combinan con la busqueda por texto.

### Barra de navegacion movil inferior

- Se agrego barra de navegacion inferior para movil con 5 accesos: Inicio, Filtros, Favoritos, Historial y WhatsApp.
- La barra se oculta en desktop (md+) y se muestra solo en movil.
- El boton de WhatsApp usa el icono oficial y se integra con el numero configurado.

### Tarjetas de producto mejoradas

- Se agrego timer countdown visible en las tarjetas de producto con actualizacion cada segundo.
- Se agrego boton de agregado rapido (+ quick-add) para productos sin variantes, con feedback toast.
- Animacion de corazon al marcar/desmarcar favoritos (heart pop).
- Efecto hover en tarjetas (elevacion y sombra).
- Los tags del producto se muestran como chips en la tarjeta.

### Historial de pedidos

- Se implemento vista de historial de pedidos persistida en localStorage.
- Muestra pedidos recientes con: ID, fecha, productos, total y estado (con colores por estado).
- Se registran automaticamente al completar un checkout.
- Boton dedicado en la barra de herramientas y en la barra movil inferior.

### Colores de interfaz de tienda independientes

- Se agregaron 8 nuevos campos a `CatalogOperationalSettings`: `storeBgColor`, `storeCardBgColor`, `storeCartBgColor`, `storeTextPrimaryColor`, `storeTextSecondaryColor`, `storeCartTextColor`, `storeToastFrom`, `storeToastTo`.
- El editor de apariencia (`appearance.vue`) ahora muestra una seccion dedicada de "Colores de tienda" con color pickers cuando el layout `store` esta seleccionado.
- `useStorefrontExperience.ts` ahora prefiere estos colores de tienda sobre los del tema cuando el layout es `store`.
- El `StorefrontCartDrawer` se adapta dinamicamente: usa los colores de tienda (fondo oscuro, texto claro) en modo store, y mantiene los colores claros originales en otros modos.

### Animaciones y pulido visual

- Toast de notificaciones al agregar productos al carrito.
- Transiciones mejoradas en el panel de filtros (slide + fade).
- Efecto hover en botones de header y pills de categoria.
- Animaciones en la barra de favoritos (heart pop).
- El carrito FAB tiene efecto hover y mejor sombra.

### Componentes nuevos

- `StorefrontLightbox.vue` - Lightbox/galeria profesional con zoom, touch, teclado.
- `StorefrontShop.vue` - Reescritura completa con todas las mejoras integradas.
- `StorefrontProductSheet.vue` - Actualizado con galeria de imagenes y timer.
- `StorefrontCartDrawer.vue` - Actualizado con colores dinamicos y mejor UX.

### Archivos modificados

- `app/types/catalog.ts` - 8 nuevos campos de color de tienda.
- `app/data/defaults.ts` - Defaults para los nuevos campos de color.
- `app/pages/admin/appearance.vue` - Seccion de colores de tienda con 8 color pickers.
- `app/composables/useStorefrontExperience.ts` - themeVars usa colores de tienda en modo store.

## Verificacion adicional de la doceava iteracion

Comando ejecutado:

```bash
npm run build
```

Resultado: build correcto despues de agregar lightbox, galeria, ordenamiento, filtros, barra movil, timers, historial, colores de tienda y animaciones premium.
