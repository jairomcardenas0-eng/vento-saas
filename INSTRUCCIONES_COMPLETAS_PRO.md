# INSTRUCCIONES COMPLETAS PARA IA PRO - Vento a Produccion Nacional

Eres IA Pro. Lleva Vento (Nuxt3+Vue3+TS+Pinia+Supabase) de MVP a plataforma nacional para miles de negocios en Cuba.

ANTES DE TOCAR CODIGO:
1. Lee absolutamente todos los archivos del proyecto.
2. Detecta errores no listados aqui.
3. `npm run build` y `npx nuxt typecheck` deben pasar antes y despues de cada fase.
4. Implementa en ORDEN exacto.
5. No borres funcionalidades existentes.
6. Documenta en CAMBIOS_APLICADOS_FINAL.md.

LO YA IMPLEMENTADO (NO TOCAR):
Service role, endpoints endurecidos, RLS, permisos equipo, payload storefront unico, cache local, fallback offline, pedidos/resenas paginados, realtime incremental, admin bootstrap, layout store, lightbox, historial pedidos, uploads jpeg/png/webp, year/month, validacion slug, modularizacion backend, anti-duplicados, barra nav movil, timers, colores tienda independientes.

FASES:
0. Analisis exhaustivo (build, encoding, any, duplicados, seguridad, performance)
1. Integridad operativa (inventario profesional, estados pedido, planes)
2. Seguridad y abuso (rate limit real, validacion server, observabilidad)
3. Arquitectura escalado (CI/CD, jobs, cache edge, CDN)
4. Experiencia negocio (onboarding wizard, multi-catalogo, permisos finos)
5. Datos y modelo nacional (ubicacion, logistica, zonas, repartidores, tracking)
6. Producto y crecimiento (moderacion master, analitica util)
7. UX faltantes (crop modal, icon picker, paleta colores, live preview, infinite scroll)
8. Validacion final (tests, smoke tests, despliegue)

REGLA DE ORO: Cada fase pasa build+typecheck antes de la siguiente.

---

## FASE 0: ANALISIS EXHAUSTIVO Y DETECCION DE ERRORES

0.1 Build y TypeCheck: ejecuta `npm run build` y `npx nuxt typecheck`. Corrige TODO error, warning, import roto o referencia a tipo inexistente. Bloqueante antes de avanzar.

0.2 Encoding roto: busca en `app/` y `server/` caracteres rotos `Ã¡`->`a`, `Ã©`->`e`, `Ã­`->`i`, `Ã³`->`o`, `Ãº`->`u`, `Ã±`->`n`, `â€"`->`"`, `â€œ`/`â€`->comillas. Afecta SEO, confianza y compartidos.

0.3 select('*') residual: grep `\.select\('\*'\)` en `app/` y `server/`. Reemplaza por columnas exactas en cada ruta critica.

0.4 any residual: grep `\bany\b` en `app/composables/`, `app/stores/`, `app/utils/`, `server/`. Tipa correctamente. Usa `unknown` + narrowing.

0.5 Duplicados y legacy: elimina componentes duplicados, funciones sin uso, imports no usados, codigo comentado muerto.

0.6 Seguridad: endpoints publicos NO exponen emails, hashes, keys. RLS cubre TODAS las tablas privadas. Mutaciones verifican ownership via SQL. Headers CSP, X-Frame-Options, X-Content-Type-Options.

0.7 Performance: sin N+1 en endpoints server. Storefront usa cache HTTP. Imagenes con lazy loading. Sin chunks innecesarios.

Salida Fase 0: build limpio, typecheck limpio, encoding limpio, sin any injustificado.

---

## FASE 1: INTEGRIDAD OPERATIVA REAL (CRITICO)

### 1.1 Inventario Profesional
Objetivo: mover variantes desde JSONB a tablas relacionales con stock real.

#### 1.1.1 Schema SQL Nuevo
Agrega al final de `supabase/schema.sql`:
- `product_variant_groups(id, catalog_id, product_id, group_name, selection_type, required, sort_order)`
- `product_variant_options(id, group_id, name, price_delta, is_required, sort_order)`
- `inventory_items(id, catalog_id, product_id, variant_option_id, sku, quantity, reserved, low_stock_threshold, track_stock)` con UNIQUE(product_id, variant_option_id)
- `inventory_movements(id, catalog_id, inventory_item_id, type, quantity, reason, reference_id, created_by)` donde type IN ('in','out','adjustment','reservation','release','cancel')
- Indices: idx_variant_groups_product, idx_variant_options_group, idx_inventory_product, idx_inventory_variant, idx_inventory_catalog, idx_movements_item, idx_movements_catalog
- RLS en todas las tablas nuevas con has_catalog_permission

#### 1.1.2 Migracion de Datos JSONB
Crea funcion SQL `migrate_product_variants()` que lea `products.variants` JSONB, inserte en tablas nuevas, cree `inventory_items` base con quantity=0, reserved=0, track_stock=false, y marque `variants_migrated=true`.

#### 1.1.3 Tipos TypeScript
En `app/types/catalog.ts` agrega `CatalogVariantGroup`, `CatalogVariantOption`, `InventoryItem`. Marca `CatalogProduct.variants` como @deprecated.

#### 1.1.4 CRUD de Variantes en Admin
En `app/pages/admin/products.vue` agrega seccion variantes con grupos drag-drop, opciones con priceDelta, flag required. Actualiza `app/composables/backend/catalog.ts` con funciones para CRUD de variantes.

#### 1.1.5 Stock en Cards de Producto
En `app/components/storefront/StorefrontShop.vue`: badge "Agotado"(rojo), "Pocas unidades"(naranja), "En stock"(verde). Si trackStock=true y quantity-reserved<=0, deshabilitar boton agregar.

#### 1.1.6 Reserva de Stock al Crear Pedido
En `server/api/orders/create.post.ts`: buscar inventory_items por productId+variantOptionId. Si track_stock=true y disponible < cantidad: rechazar 400. Si pasa: UPDATE reserved, INSERT movement 'reservation', todo atomico via RPC.

#### 1.1.7 Liberacion de Stock al Cancelar
Crea `server/api/orders/update.post.ts` o trigger SQL: cuando pedido cambia a 'cancelled', UPDATE reserved (restar), INSERT movement 'release', INSERT order_events.

#### 1.1.8 Alertas de Bajo Stock
Crea `app/pages/admin/inventory.vue` nueva: tabla productos con stock bajo, badge rojo en sidebar si hay alertas, filtros por estado de stock.

### 1.2 Estados de Pedido Completos

#### 1.2.1 Schema SQL
- `order_status_history(id, order_id, status, previous_status, changed_by, changed_by_name, note)`
- `order_events(id, order_id, event_type, payload, created_by)` donde event_type IN ('viewed','preparing','ready','delivered','cancelled','payment_received','note_added','assigned')

#### 1.2.2 Maquina de Estados
new->viewed->preparing->ready->delivered. Todo puede ir a cancelled. Transiciones validas via SQL `can_transition_order_status()`.

#### 1.2.3 UI de Pedidos
En `app/pages/admin/orders.vue`: timeline vertical por pedido, botones cambio estado con modal nota, selector "Asignar a" con miembros equipo, SLA visual (verde<15min, amarillo<1h, rojo>1h), notas internas textarea.

### 1.3 Planes y Autorizacion Manual

#### 1.3.1 Schema SQL
- `catalog_plans(id, catalog_id, plan_type, status, activated_at, expires_at, payment_reference, notes)` plan_type IN ('free','basic','pro','enterprise'), status IN ('trial','active','paused','blocked','expired'), UNIQUE(catalog_id)
- `catalog_plan_history(id, catalog_id, previous_plan, new_plan, changed_by, reason)`

#### 1.3.2 Limites por Plan
En `server/utils/plans.ts`: free=20 productos/2 miembros/5 imagenes, basic=100/5/10, pro=500/15/ilimitado, enterprise=ilimitado. Features flags: analytics avanzado, multi-sucursal, webhook, dominio personalizado.

#### 1.3.3 UI Planes en Admin
En `app/pages/admin/settings.vue`: card plan actual, vencimiento, features activas, notificacion 7 dias antes vencimiento.

#### 1.3.4 Panel Master de Planes
En `app/pages/master/index.vue`: columna plan, boton cambiar plan con modal razon, filtro status plan, alertas expirados.

---

## FASE 2: SEGURIDAD Y ABUSO (CRITICO)

### 2.1 Rate Limit Distribuido
Implementa en `server/utils/rateLimit.ts` con Upstash Redis (env vars `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Fallback memoria local si no hay Redis.

Endpoints protegidos:
- POST /api/orders/create: 5/hora/IP/catalogo
- POST /api/reviews/create: 3/6horas/IP/catalogo
- POST /api/analytics/collect: 100/minuto/IP
- POST /api/check-slug: 20/minuto/IP
- Toda mutacion publica

Ademas fingerprint navegador (user-agent+headers) para IPs compartidas (NAT movil Cuba).

### 2.2 Validacion Server Dura
En TODO endpoint de mutacion:
- Validar payloads con schemas formales (zod o valibot)
- Limites de longitud en todos los campos
- Validar cupones complejos (expiracion, usos, minimos)
- Validar zonas entrega, horarios, disponibilidad
- Sanitizar inputs publicos (DOMPurify equivalente server-side)

### 2.3 Observabilidad
Integra Sentry (DSN desde env `SENTRY_DSN`):
- Frontend: `app/plugins/sentry.client.ts`
- Server: `server/plugins/sentry.server.ts`
- Sourcemaps en build
- Alertas email cuando error rate > 1%

Logs centralizados en `server/utils/logger.ts`:
- CorrelationId por request
- Persistir logs criticos en tabla audit_log
- Metricas de error por endpoint y catalogo

Dashboards de uptime y latencia por endpoint.

---

## FASE 3: ARQUITECTURA DE ESCALADO

### 3.1 CI/CD
Crea `.github/workflows/deploy.yml`:
- Trigger: push a main, pull request
- Jobs: lint, typecheck, build, test unitarios (si existen)
- Despliegue automatico staging en PR, produccion en push main
- Smoke tests post-deploy (3 endpoints criticos responden 200)

### 3.2 Jobs y Colas
Usa Supabase Edge Functions + pg_cron o server/jobs/:
- Recalculos agregados fuera del request (stats diarios)
- Limpieza analytics antiguos (>90 dias)
- Reproceso imagenes/thumbnails
- Notificaciones programadas
- Tareas periodicas salud

### 3.3 Cache Edge y CDN
- Cache HTTP marketplace: 60s landing, 300s storefront publico
- Invalidacion selectiva por catalogo (cuando owner guarda cambios)
- CDN imagenes Supabase Storage (public URL con cache headers)
- Revalidacion por tipo de pantalla

---

## FASE 4: EXPERIENCIA DE NEGOCIO

### 4.1 Onboarding Wizard
Nuevo flujo `app/pages/onboarding/`:
- Paso 1: tipo negocio (restaurante, tienda, ferreteria, ropa, farmacia, servicios, belleza, tecnologia)
- Paso 2: nombre, slug (validacion en tiempo real), whatsapp
- Paso 3: sugerencias categorias iniciales segun tipo de negocio
- Paso 4: checklist publicacion (logo subido, al menos 3 productos, horarios configurados)
- Deteccion configuracion incompleta antes de permitir publicar

### 4.2 Multi-Catalogo
- Busqueda de catalogos propios en admin
- Agrupacion por negocio/brand
- Duplicar catalogo como plantilla (copiar productos, categorias, ajustes base)
- Configuracion compartida entre sucursales (colores, horarios, zonas)

### 4.3 Permisos de Equipo Finos
Granulares por accion:
- manageProducts, viewOrders, manageOrders, viewStats
- manageSettings, manageAppearance, manageTeam
- viewInventory, manageInventory
- Por modulo y sucursal (si aplica multi-sucursal)
- Expiracion invitaciones (7 dias)
- Aceptacion formal de invitacion (magic link o codigo)
- Auditoria de cambios por miembro en audit_log

---

## FASE 5: DATOS Y MODELO NACIONAL

### 5.1 Ubicacion y Logistica
Schema SQL nuevo:
- `business_locations(id, catalog_id, country, province, municipality, city, address, lat, lng)`
- `delivery_zones(id, catalog_id, name, provinces[], municipalities[], cities[], base_fee, estimated_minutes)`
- `delivery_routes(id, zone_id, driver_id, status, assigned_at, completed_at)`
- `drivers(id, catalog_id, name, phone, vehicle, active, current_location_lat, current_location_lng)`

Normalizar provincia/municipio/ciudad segun division politica administrativa de Cuba.

Zonas de entrega con costo y tiempo estimado.
Asignacion de repartidores a pedidos.
Tracking de estado de entrega: asignado -> en camino -> entregado.

### 5.2 Auditoria de Cambios
Schema SQL:
- `audit_log(id, actor_id, actor_name, actor_email, catalog_id, action, entity_type, entity_id, payload_before, payload_after, ip_address, user_agent, created_at)`
- action IN ('create','update','delete','login','logout','export','setting_change','plan_change','status_change')
- Indices: actor_id, catalog_id, entity_type, created_at
- Visible en panel master para investigacion de incidentes
- Exportable a CSV desde panel master

---

## FASE 6: PRODUCTO Y CRECIMIENTO

### 6.1 Moderacion Master
Crea `app/pages/master/moderation.vue`:
- Suspender/revisar catalogos (cambiar status a 'suspended')
- Panel fraude/spam: lista de pedidos/reviews sospechosos (muchos desde misma IP, contenido repetido)
- Motivos de baneo con categorias: spam, contenido inapropiado, fraude, incumplimiento planes
- Bandeja de incidencias: tickets de soporte con prioridad, estado, asignado a
- Contexto de negocio en cada incidencia (nombre, plan, productos, pedidos recientes)

### 6.2 Analitica Util
Nuevas metricas en `app/pages/admin/analytics.vue` o `app/pages/admin/index.vue`:
- Conversion funnel: visitas -> producto visto -> carrito -> checkout -> pedido confirmado
- Ventas por categoria (top 5 categorias por volumen e ingreso)
- Ventas por producto (top 10 productos)
- Ticket promedio por dia/semana/mes
- Cohortes clientes: primer pedido, repeticion a 7/30/90 dias
- Rendimiento por horario: horas pico de pedidos
- Metricas accionables: "Aumenta stock de X" cuando bajo stock coincide con alta demanda, "Promociona Y en horario Z" cuando hay trafico pero poca conversion

---

## FASE 7: UX FALTANTES DEL GENERADOR

### 7.1 Modal Recorte Imagenes
Crea o mejora `app/components/admin/CropModal.vue`:
- Canvas crop frame 220x220 visible
- Zoom slider (0.5x a 3x)
- Drag para mover la imagen dentro del frame
- Salida forzada 512x512
- Usar para logo, app icon, hero background, OG image
- Integrar en `app/pages/admin/settings.vue` y `app/pages/admin/appearance.vue`

### 7.2 Selector Visual de Iconos Lucide
En `app/pages/admin/appearance.vue` o `app/pages/admin/settings.vue`:
- Grid visual de 20 iconos Lucide populares: Star, Store, ShoppingBag, Coffee, Pizza, Beef, CupSoda, Gift, Truck, Phone, Heart, Home, User, Settings, Bell, Search, Menu, X, Check, ArrowRight
- Cada icono renderizado realmente con el componente Lucide correspondiente
- Click para seleccionar, preview inmediato en header de tienda
- Guardar nombre icono en `storeIcon`
- Si no hay seleccionado, mostrar placeholder con interrogacion

### 7.3 Paleta 30 Colores Predefinidos
En editor de apariencia:
- Grid de 30 swatches de colores predefinidos con nombres descriptivos (ej: "Azul Royal", "Verde Esmeralda", "Rojo Coral", "Naranja Tangerine", "Violeta Real", "Gris Grafito", etc.)
- Color picker personalizado nativo como alternativa
- Al seleccionar un swatch predefinido, generar automaticamente los shades HSL: 50, 100, 500(base), 600, 700, 900
- Boton "Resetear colores" que vuelve a defaults del tema
- Preview inmediato del color aplicado

### 7.4 Live Preview Real
En `app/components/admin/PreviewModal.vue`:
- Actualizar preview SIN guardar primero
- Usar estado reactivo de Vue para reflejar cambios de color, texto, imagen en tiempo real
- El preview debe ser inline o iframe que reciba props reactivas, NO recargar ruta completa
- Toggle mobile/desktop con ancho exacto: 375px para mobile, 100% para desktop
- Mostrar label indicando "Preview en vivo" cuando hay cambios sin guardar

### 7.5 Infinite Scroll Storefront
En `app/components/storefront/StorefrontShop.vue`:
- Cargar 20 productos inicialmente (del payload ya paginado o nuevo parametro limit)
- IntersectionObserver en sentinel al final de la grilla
- Cargar 20 mas al intersectar
- Loader skeleton durante carga de mas productos
- Boton "Cargar mas" como fallback si IntersectionObserver falla
- Total de productos disponibles mostrado

### 7.6 Badge Envio Gratis
Agregar campo `freeShip` al producto:
- Toggle en `app/pages/admin/products.vue` junto a "Destacado" y "En oferta"
- Badge "Envio gratis" en cards de producto y product sheet
- Icono Truck de Lucide, color verde, posicionado junto a badge de oferta
- En carrito, si TODOS los items tienen freeShip, mostrar "Envio gratis" en resumen
- Si algun item no tiene freeShip, calcular fee segun zona de entrega normal

---

## FASE 8: VALIDACION FINAL

8.1 Tests unitarios: agregar tests para stores criticos (catalogs, orders, cart), composables (useStorefrontExperience, useSupabaseBackend modules), y utilidades (storefrontPayload, entityIds).

8.2 Tests de integracion: endpoints server deben responder correctamente con datos de prueba.

8.3 Ejecutar `npm run build` y `npx nuxt typecheck`. Cero errores. Cero warnings bloqueantes.

8.4 Smoke tests manuales o automaticos:
- Home marketplace carga en <2s
- Storefront publico `/b/[slug]` carga en <2s
- Admin carga sidebar sin bloquearse
- Crear pedido desde storefront funciona end-to-end
- Crear producto en admin se refleja en storefront en <30s (realtime)
- Cambiar estado de pedido en admin se refleja en tiempo real
- Upload de imagen funciona con compresion client-side
- Cache de storefront funciona offline

8.5 Verificacion de seguridad:
- Ningun endpoint expone datos de otros catalogos
- Rate limit funciona (prueba 10 requests rapidos)
- RLS bloquea acceso cross-catalog

8.6 Documentacion final en `CAMBIOS_APLICADOS_FINAL.md` listando TODO lo implementado, archivos modificados, y decisiones arquitectonicas importantes.

---

## CRITERIO DE SALIDA PARA PRODUCCION NACIONAL

La plataforma esta lista cuando:
- Alta, login y creacion de catalogo sin errores intermitentes
- Pedidos validos con stock y autorizacion comercial/plan confiable
- Panel admin con permisos y trazabilidad por equipo
- Observabilidad con alertas reales (Sentry configurado)
- Despliegue repetible con CI/CD
- Latencia controlada en pantallas publicas y admin
- Recuperacion razonable ante fallos de red
- Datos de negocio consistentes aun con concurrencia
- Build y typecheck pasan siempre
- Rate limit distribuido protege contra abuso a escala
- Inventario profesional permite operar retail serio
- Logistica por zonas permite entregas organizadas

---

ESTE DOCUMENTO FUE CREADO COMO INSTRUCCION COMPLETA PARA IA PRO. LA IA DEBE ANALIZAR EL PROYECTO REAL, DETECTAR ERRORES ADICIONALES NO LISTADOS AQUI, Y EJECUTAR TODAS LAS FASES EN ORDEN.
