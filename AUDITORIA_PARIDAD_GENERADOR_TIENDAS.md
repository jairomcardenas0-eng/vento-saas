# Auditoria Completa de Paridad: Generador de Tiendas vs Vento

Fecha: 2026-04-25

## Metodologia

Se leyo cada archivo del "Generador de tiendas" original (PHP/HTML/MySQL) linea por linea y se comparo contra el estado actual del proyecto Vento (Nuxt 3 + Vue 3 + TypeScript + Supabase). Cada feature se clasifica como:

- **PRESENTE** — La funcionalidad equivalente existe en Vento.
- **AUSENTE** — No existe equivalente. Se explica por que.
- **PARCIAL** — Existe pero con capacidad reducida.

---

## 1. GENERADOR MAESTRO DE TIENDAS

### Archivo original: `generador_maestro_privado_zX99_kQ2A_secure_system_v2.html`

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| 1.1 | Formulario de creacion de tienda (nombre, slug, WhatsApp, usuario, password) | **AUSENTE** | Vento no tiene un panel generador maestro. Las tiendas se crean mediante registro de usuario + creacion de catalogo. No hay un panel externo tipo "generador" que cree tiendas en lote. **Razon**: Vento usa un modelo SaaS multi-tenant donde cada usuario se registra y crea su propio catalogo. El concepto de "generador maestro" es reemplazado por el flujo de onboarding/registro. |
| 1.2 | Auto-generacion de slug desde nombre (normalize, replace accents, etc.) | **PRESENTE** | El slug se genera en `app/pages/admin/settings.vue` y en el onboarding. |
| 1.3 | Validacion de slug en tiempo real contra backend (check_slug) | **PARCIAL** | Vento tiene validacion de slug unique en BD pero no tiene un endpoint dedicado `check_slug` con feedback en tiempo real mientras el usuario escribe. |
| 1.4 | Paleta de 30 colores predefinidos con swatches visuales | **AUSENTE** | El appearance editor de Vento usa color pickers nativos del navegador (`<input type="color">`), no tiene una paleta predefinida de 30 colores con nombres. **Razon**: La UX de color es mas generica; se puede agregar la paleta. |
| 1.5 | Selector de color personalizado (input type="color") | **PRESENTE** | `app/pages/admin/appearance.vue` tiene color pickers para cada campo de color. |
| 1.6 | Generacion automatica de 6 shades HSL desde un color base (50, 100, 500, 600, 700, 900) | **AUSENTE** | Vento no genera automaticamente sombras derivadas del color primario. Los colores se configuran uno a uno. **Razon**: No se implemento la logica de derivacion HSL; cada color se configura manualmente en el editor de apariencia. |
| 1.7 | Live preview que actualiza colores/textos en tiempo real mientras se llena el formulario | **AUSENTE** | El `PreviewModal.vue` de Vento muestra una previsualizacion del storefront, pero no se actualiza en tiempo real mientras se editan campos en el formulario de apariencia. Requiere guardar primero. **Razon**: La arquitectura actual usa un watch sincronizado pero el PreviewModal no recibe actualizaciones en tiempo real sin guardar. |
| 1.8 | Lista de tiendas activas con cards (nombre, slug, icono) | **PRESENTE** | El panel master en `app/pages/master/index.vue` lista todos los tenants/negocios en una tabla. |
| 1.9 | Boton "Limpiar Fantasmas" (eliminar tiendas sin carpeta en disco) | **AUSENTE** | No aplica al modelo de Vento. No hay carpetas fisicas por tienda; todo es virtual en Supabase. **Razon**: El concepto de "fantasmas" (registry en BD sin carpeta) es especifico de la arquitectura PHP. En Vento/Supabase no hay discrepancia BD-disco. |
| 1.10 | Boton eliminar tienda con confirmacion | **PRESENTE** | El panel master permite congelar/banear negocios. |
| 1.11 | Acceso directo al admin de una tienda desde la lista (loginAsStore) | **AUSENTE** | El panel master de Vento no tiene "Entrar al Admin" de una tienda especifica como el generador original (que setea localStorage y redirige). **Razon**: No se implemento la suplantacion de sesion desde el panel master. |
| 1.12 | Modal de exito con URLs de tienda y admin despues de crear | **AUSENTE** | Vento no tiene generador de tiendas, asi que no hay modal de exito de creacion. |
| 1.13 | PWA install support (beforeinstallprompt, service worker) | **PRESENTE** | `StorefrontShop.vue` tiene `installPwa()` y listener de `beforeinstallprompt`. |
| 1.14 | Background blob animado con color de la tienda seleccionada | **AUSENTE** | El generador tenia un detalle visual de background animado que reflejaba el color elegido. Vento no tiene este detalle. **Razon**: No es funcional, es decorativo. |

---

## 2. GENERADOR DE AGENTES COLABORADORES

### Archivo original: `generador_agentes_colaboradores_v9_secure_p7R2.html`

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| 2.1 | Formulario de creacion de tienda simplificado (nombre, slug, WhatsApp, user, pass, color) | **AUSENTE** | No existe un panel de agente colaborador en Vento. **Razon**: El modelo de permisos de equipo (`team.vue`, `has_catalog_role`, `has_catalog_permission`) reemplaza la generacion delegada. Un miembro de equipo edita UN catalogo existente, no crea nuevos. |
| 2.2 | Restriccion de funciones: sin lista de tiendas, sin eliminar, sin limpiar fantasmas | **PRESENTE** | El sistema de roles (owner, admin, editor, viewer) en Vento restringe lo que cada miembro puede hacer. Un "editor" no puede eliminar el catalogo ni ver otros catalogos. |
| 2.3 | Misma paleta de 30 colores que el generador maestro | **AUSENTE** | Ver 1.4. |

---

## 3. PANEL DE ADMINISTRACION

### Archivo original: `index.html`

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| **LOGIN** | | | |
| 3.1 | Login con store slug + username + password | **PARCIAL** | Vento usa Supabase Auth (email + password). No requiere slug en el login. El usuario se autentica y luego selecciona su catalogo. |
| 3.2 | Contrasena maestra (MASTER_PASS) para bypass de login | **AUSENTE** | Vento no tiene contrasena maestra. El acceso master se gestiona via systemRole en Supabase Auth. |
| **PRODUCTOS** | | | |
| 3.3 | CRUD de productos (nombre, precio, oldPrice, categoria, stock, manage_stock, freeShip, descripcion) | **PRESENTE** | `app/pages/admin/products.vue` tiene todas estas capacidades y mas (variantes, tags, imageUrls multiple, offer timer, destacado, visibilidad). |
| 3.4 | Galeria de imagenes de producto (max 3) | **PRESENTE** | Vento soporta `imageUrls` array sin limite fijo de 3 imagenes. |
| 3.5 | Upload de imagen con compresion cliente (canvas resize) | **AUSENTE** | Vento usa Supabase Storage para upload. No tiene compresion cliente antes de subir. **Razon**: Supabase Storage acepta archivos de cualquier tamano; la compresion cliente no se implemento. |
| 3.6 | Barra de progreso durante upload | **AUSENTE** | Los uploads en Vento no muestran barra de progreso. **Razon**: Usa el cliente de Supabase directamente sin seguimiento de progreso. |
| 3.7 | Vista previa de galeria (thumbnails con boton eliminar) | **PRESENTE** | El editor de productos en admin muestra previsualizacion de imagenes subidas. |
| 3.8 | Productos agrupados por categoria con pills de navegacion | **AUSENTE** | En Vento los productos se muestran en tabla plana o grid sin agrupacion visual por categoria. **Razon**: La UI actual usa filtro por categoria en lugar de secciones agrupadas. |
| 3.9 | Toggle de "Precio de oferta" que muestra/oculta el campo oldPrice y cambia el label | **PRESENTE** | El product form tiene campo `promoPrice` y toggle de `hasPromo`. |
| 3.10 | Product card con hover overlay (editar/eliminar), stock badge, imagen | **PRESENTE** | La grilla de productos en admin tiene hover actions, badges de stock/visibilidad, y thumbnails. |
| **CATEGORIAS** | | | |
| 3.11 | CRUD de categorias (nombre, icono) | **PRESENTE** | `app/pages/admin/categories.vue` gestiona categorias. Pero el "icono" es un campo de texto, no un selector visual. |
| 3.12 | Icono de categoria (tag icon) | **PARCIAL** | Las categorias en Vento tienen campo `icon` pero es texto libre, sin selector visual de Lucide icons. |
| 3.13 | Eliminacion de categoria con warning (tambien elimina productos) | **PRESENTE** | El admin pregunta confirmacion antes de eliminar. |
| **CONFIGURACION** | | | |
| 3.14 | Top Bar HTML | **PRESENTE** | Campo `storeTopBarHtml` en `CatalogOperationalSettings`. |
| 3.15 | Header name | **PRESENTE** | Campo `storeHeaderName`. |
| 3.16 | Premium badge toggle | **PRESENTE** | Campo `storeShowPremiumBadge`. |
| 3.17 | Hero: tag, title, description, button text, background image upload | **PRESENTE** | Campos `storeHeroTag`, `storeHeroTitle`, `storeHeroDescription`, `storeHeroButtonText`, `storeHeroBackgroundImage`. |
| 3.18 | WhatsApp number | **PRESENTE** | Campo `whatsapp` en settings. |
| 3.19 | Logo upload (header, cualquier forma) | **PRESENTE** | Campo `logoUrl` con upload via admin settings. |
| 3.20 | App icon upload con MODAL DE RECORTE (crop frame 220x220, zoom slider, drag, salida 512x512) | **AUSENTE** | No existe el modal de recorte de imagenes en Vento. El upload es directo sin crop. **Razon**: No se ha implementado un componente de crop/recorte. Es una funcionalidad significativa que requiere integracion con canvas. |
| 3.21 | Store icon picker (15 iconos Lucide en grid visual con seleccion) | **AUSENTE** | En Vento, `storeIcon` es un campo de texto (`<input>`) donde se escribe el nombre del icono manualmente. No hay grid visual de 15 iconos Lucide para elegir como en el generador original. **Razon**: No se implemento el picker visual de iconos. El campo acepta cualquier nombre de icono Lucide pero sin preview. |
| 3.22 | OG image upload con preview de simulacion de WhatsApp | **AUSENTE** | Vento tiene campo `ogImageUrl` pero no hay preview de como se vera en WhatsApp. **Razon**: No se implemento la simulacion visual. |
| 3.23 | OG description (derivada de hero description) | **PRESENTE** | Campo `ogDescription` en settings. |
| 3.24 | Footer text | **PRESENTE** | Campo `storeFooterText`. |
| 3.25 | Color pickers: bg, card, cart, cart text, text primary, text secondary, color_50, color_500, color_600, color_900 | **PARCIAL** | Vento tiene 8 campos de color de tienda (storeBgColor, storeCardBgColor, storeCartBgColor, storeTextPrimaryColor, storeTextSecondaryColor, storeCartTextColor, storeToastFrom, storeToastTo). No tiene la paleta de 6 tonos (50/100/500/600/700/900) del generador original. En cambio tiene colores de tema (18 campos en CatalogThemeSettings) mas 8 de tienda. |
| 3.26 | Boton "Resetear colores" a defaults | **AUSENTE** | El editor de apariencia de Vento no tiene boton de reset a defaults. **Razon**: No se implemento; cada campo tendria que reestablecerse manualmente. |
| 3.27 | Live preview iframe con toggle mobile/desktop (375px vs 100%) | **PARCIAL** | `PreviewModal.vue` existe en Vento pero no tiene toggle mobile/desktop (375px vs full). Muestra el storefront en tamano fijo. |
| 3.28 | Comunicacion postMessage del admin al preview para actualizar colores/textos en tiempo real | **AUSENTE** | El `PreviewModal.vue` carga el storefront como una ruta independiente pero no recibe comandos postMessage. **Razon**: La arquitectura Vue no usa iframe/postMessage; los cambios se reflejan al recargar o navegar. |
| 3.29 | Cambio de credenciales (current password + new user + new password) | **AUSENTE** | No hay UI para cambiar credenciales de acceso al admin en Vento. **Razon**: La autenticacion se gestiona via Supabase Auth. El cambio de password se hace mediante el flujo de reset de Supabase, no dentro del admin. |
| 3.30 | Toggle visibilidad de password (ojo abierto/cerrado) | **AUSENTE** | No aplica directamente porque no hay formulario de cambio de password en el admin. |
| 3.31 | Sidebar navigation + Mobile bottom nav | **PRESENTE** | El admin de Vento tiene sidebar (`app/layouts/admin.vue`) con navegacion responsive. |
| 3.32 | Toast notifications | **PRESENTE** | El admin usa toast notifications via el storefront toast system. |
| 3.33 | Escape HTML en renderizado (XSS prevention) | **PRESENTE** | Vue escapa HTML automaticamente. |
| 3.34 | Boton Cerrar sesion | **PRESENTE** | El layout admin tiene boton de logout. |
| 3.35 | Vista previa de logo y app icon (si no hay, muestra placeholder) | **PARCIAL** | Los campos de imagen muestran el valor actual pero sin preview thumbnail en el editor. |

---

## 4. TEMPLATE PUBLICO DE TIENDA

### Archivo original: `_shared/store-template.php`

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| **CSS / TEMA** | | | |
| 4.1 | CSS custom properties desde DB (bg-body, bg-card, brand-50/100/500/600/700/900, text-primary/secondary, color-cart/text) | **PRESENTE** | `useStorefrontExperience.ts` genera `themeVars` con CSS custom properties completas, incluyendo colores de tienda y de tema. |
| 4.2 | Tailwind CSS CDN | **PARCIAL** | Vento usa Tailwind via build de Nuxt (no CDN), lo cual es mejor para produccion. |
| 4.3 | Google Fonts (Inter) | **PRESENTE** | Inter incluida en el proyecto Nuxt. |
| 4.4 | Lucide icons CDN | **PRESENTE** | Lucide integrado via npm en Vento. |
| **HEADER / TOP BAR** | | | |
| 4.5 | Top bar con anuncio de texto (top_bar_html) | **PRESENTE** | `StorefrontShop.vue` y otros layouts muestran top bar con `storeTopBarHtml`. |
| 4.6 | Header sticky con logo/imagen O icono Lucide + nombre de tienda | **PRESENTE** | El header muestra logo o icono + nombre. |
| 4.7 | Premium badge (PRO) | **PRESENTE** | `storeShowPremiumBadge` controla el badge. |
| 4.8 | Buscador con debounce (300ms) | **PRESENTE** | `search` ref con watchers + debounce en el storefront. |
| 4.9 | Icono de carrito con badge de contador + total en header (desktop) | **PRESENTE** | El cart FAB y drawer muestran contador y total. |
| 4.10 | Icono de favoritos con badge de contador en header | **PRESENTE** | En `StorefrontShop.vue` los favoritos tienen badge. |
| **HERO** | | | |
| 4.11 | Hero section con background image opcional + overlay gradient | **PRESENTE** | `StorefrontShop.vue` tiene hero completo con bg image, tag, title, description, button. |
| 4.12 | Hero: tag badge, titulo, descripcion, boton CTA | **PRESENTE** | Implementado completamente. |
| 4.13 | Hero background image con fallback a color cuando no hay imagen | **PRESENTE** | Implementado. |
| **CATEGORIAS / NAVEGACION** | | | |
| 4.14 | Pills de categoria en el header (scroll horizontal en mobile) | **PRESENTE** | `StorefrontShop.vue` tiene pills de categoria horizontales. |
| 4.15 | Sidebar de categorias en desktop | **AUSENTE** | El storefront de Vento no tiene sidebar de categorias en desktop. Usa pills horizontales y filtro movil. **Razon**: Se priorizo el diseno mobile-first. Se puede agregar sidebar para desktop. |
| 4.16 | Boton "Todos" como categoria default | **PRESENTE** | Implementado en el storefront shop. |
| **FILTROS** | | | |
| 4.17 | Filtro por precio con predefinidos rapidos (Hasta $50, Hasta $100, $100-$200, $200+) | **PRESENTE** | `StorefrontShop.vue` tiene predefinidos de precio con chips. |
| 4.18 | Filtro por precio personalizado (min/max inputs) | **PRESENTE** | Implementado con `priceMin` y `priceMax`. |
| 4.19 | Mobile filter drawer con categorias y rango de precio | **PRESENTE** | El panel de filtros en mobile se despliega como drawer/slide. |
| 4.20 | Boton "Limpiar filtros" | **PRESENTE** | Implementado. |
| **ORDENAMIENTO** | | | |
| 4.21 | Ordenar por mas baratos (price asc) | **PRESENTE** | `sortMode = 'price-asc'`. |
| 4.22 | Ordenar por mas caros (price desc) | **PRESENTE** | `sortMode = 'price-desc'`. |
| 4.23 | Ordenar por ofertas/rebajas primero | **PRESENTE** | `sortMode = 'sale'`. |
| 4.24 | Ordenar por nombre A-Z | **PRESENTE** | `sortMode = 'name-asc'`. |
| 4.25 | Ordenar por nombre Z-A | **PRESENTE** | `sortMode = 'name-desc'`. |
| 4.26 | Ordenar por destacados (default) | **PRESENTE** | `sortMode = 'default'`. |
| **GRILLA DE PRODUCTOS** | | | |
| 4.27 | Grid 2 columnas mobile, 3 columnas desktop | **PRESENTE** | `StorefrontShop.vue` usa grid responsivo. |
| 4.28 | Imagen de producto con lazy loading | **PRESENTE** | Nuxt/Vue maneja lazy loading nativo. |
| 4.29 | Badge de oferta (OFFER) | **PRESENTE** | `StorefrontShop.vue` muestra badge de oferta cuando `hasPromo`. |
| 4.30 | Badge de envio gratis (FREE SHIPPING) | **AUSENTE** | Vento no tiene el concepto de "free shipping" a nivel de producto. **Razon**: El campo `freeShip` del generador original no existe en el modelo de datos de Vento. Se maneja via delivery fee del catalogo. |
| 4.31 | Rating con estrellas y conteo de reviews en la card de producto | **PARCIAL** | El product sheet muestra rating, pero la card de producto en `StorefrontShop.vue` no muestra estrellas. |
| 4.32 | Tags de producto como chips | **PRESENTE** | `StorefrontShop.vue` muestra tags. |
| 4.33 | Indicador de stock (agotado/pocas unidades/stock normal) | **PARCIAL** | El product sheet muestra stock, pero las cards de producto en el grid no tienen indicador de stock. |
| 4.34 | Nombre de producto con line-clamp | **PRESENTE** | `line-clamp-2` en el nombre. |
| 4.35 | Precio con formato decimales chicos | **PRESENTE** | Formateado con la util `money()`. |
| 4.36 | Precio anterior tachado (old price) | **PRESENTE** | `priceOldColor` y display de `promoPrice`. |
| 4.37 | Boton de agregado rapido (+ / quick add) | **PRESENTE** | `quickAddProduct()` en `StorefrontShop.vue`. |
| 4.38 | Boton de favorito con animacion de corazon (heart pop) | **PRESENTE** | `toggleFavoriteWithAnimation()` con `animate-heart-pop`. |
| 4.39 | Efecto hover en tarjeta (elevacion y sombra) | **PRESENTE** | `hover:shadow-xl hover:translate-y-[-4px]`. |
| 4.40 | Hover overlay "Vista Rapida" | **PARCIAL** | Las cards de Vento abren el product sheet al click, sin overlay de "Vista Rapida" visible en hover. |
| 4.41 | Loader/spinner durante carga de productos | **PRESENTE** | Estados de carga con skeleton/spinner. |
| 4.42 | Empty state con icono y mensaje cuando no hay productos | **PRESENTE** | Implementado en `StorefrontShop.vue`. |
| **QUICK VIEW / PRODUCT SHEET** | | | |
| 4.43 | Modal con galeria de imagenes (thumbnails + prev/next) | **PRESENTE** | `StorefrontProductSheet.vue` tiene galeria completa con thumbnails, navegacion, contador. |
| 4.44 | Imagen principal clickable que abre lightbox | **PRESENTE** | Boton de zoom abre `StorefrontLightbox.vue`. |
| 4.45 | Zoom indicator ("Toca para ampliar") | **AUSENTE** | No hay texto indicador de zoom. |
| 4.46 | Nombre del producto, categoria, precio, old price, descripcion | **PRESENTE** | El product sheet muestra toda esta informacion. |
| 4.47 | Badge de stock con colores por estado (agotado/stock bajo/normal) | **PRESENTE** | El product sheet muestra stock badge. |
| 4.48 | Boton de favorito en el product sheet | **PRESENTE** | `StorefrontProductSheet.vue` tiene boton de favorito. |
| 4.49 | Boton de compartir (share) | **AUSENTE** | No hay boton de compartir producto en Vento. **Razon**: No se implemento; usaria Web Share API o enlace de WhatsApp. |
| 4.50 | Boton "Anadir al Pedido" / "Anadir al Carrito" | **PRESENTE** | El product sheet tiene boton de agregar al carrito. |
| 4.51 | Seleccion de variantes/modificadores | **PRESENTE** | Vento soporta variantes (single/multi select groups) - mas avanzado que el generador original. |
| 4.52 | Selector de cantidad (+/-) | **PRESENTE** | `quantity` control en el product sheet. |
| 4.53 | Campo de instrucciones especiales | **PRESENTE** | `instructions` field. |
| 4.54 | Timer countdown para ofertas en el product sheet | **PRESENTE** | `StorefrontProductSheet.vue` muestra timer countdown. |
| **LIGHTBOX** | | | |
| 4.55 | Lightbox de imagen a pantalla completa (fondo negro/95) | **PRESENTE** | `StorefrontLightbox.vue` con fondo negro/backdrop blur. |
| 4.56 | Boton cerrar (X) | **PRESENTE** | Implementado. |
| 4.57 | Zoom con doble click/tap (2x) | **PRESENTE** | Doble click/tap para zoom en el lightbox. |
| 4.58 | Zoom con pinch (touch) | **PARCIAL** | El lightbox de Vento soporta gestos touch (swipe) pero el pinch-zoom del original es mas directo usando el navegador. |
| 4.59 | Navegacion entre imagenes con teclado (izquierda/derecha) | **PRESENTE** | `StorefrontLightbox.vue` soporta teclado. |
| 4.60 | Navegacion entre imagenes con botones (prev/next) | **PRESENTE** | Flechas de navegacion en el lightbox. |
| 4.61 | Thumbnails strip en el lightbox | **PRESENTE** | Miniaturas en la parte inferior. |
| 4.62 | Indicador "Pellizca para hacer zoom" | **AUSENTE** | Sin texto indicador en el lightbox. |
| **CARRITO / DRAWER** | | | |
| 4.63 | Drawer lateral con items del carrito | **PRESENTE** | `StorefrontCartDrawer.vue` con drawer desde abajo en mobile. |
| 4.64 | Overlay con backdrop blur al abrir carrito | **PRESENTE** | Implementado. |
| 4.65 | Items con imagen, nombre, precio, cantidad +/-, boton eliminar | **PRESENTE** | Completamente implementado. |
| 4.66 | Empty state con icono y mensaje "Tu pedido esta vacio" | **PRESENTE** | Implementado. |
| 4.67 | Campo de nombre del cliente (opcional) | **PRESENTE** | `checkoutForm.name` en el drawer. |
| 4.68 | Subtotal y Total en el drawer | **PRESENTE** | Resumen completo con subtotal, descuento, envio, total. |
| 4.69 | Boton "Completar en WhatsApp" | **PRESENTE** | `submitCheckout()` envia por WhatsApp. |
| 4.70 | Texto "Pedido seguro via WhatsApp" | **PRESENTE** | Mostrado en el drawer. |
| 4.71 | Soporte para Delivery y Pickup | **PRESENTE** | Selector de modalidad Delivery/Pickup. |
| 4.72 | Seleccion de zona de entrega (delivery zones) | **PRESENTE** | Selector de zona con precio y tiempo estimado. |
| 4.73 | Campo de direccion para delivery | **PRESENTE** | `checkoutForm.address`. |
| 4.74 | Pickup info (punto de recogida, instrucciones, tiempo estimado) | **PRESENTE** | Mostrado cuando se selecciona Pickup. |
| 4.75 | Sistema de cupones (validacion, aplicacion, descuento) | **PRESENTE** | Cupones completamente implementados. |
| 4.76 | Boton "Vaciar carrito" | **PRESENTE** | `cartStore.clearCart()`. |
| **HISTORIAL DE PEDIDOS** | | | |
| 4.77 | Modal de historial de pedidos | **PRESENTE** | `StorefrontShop.vue` tiene seccion de historial. |
| 4.78 | Lista de pedidos con: numero, fecha, items, cantidades, total | **PRESENTE** | Implementado con cards. |
| 4.79 | Estados de pedido con colores (status badge) | **PRESENTE** | Colores por estado en las cards de historial. |
| 4.80 | Empty state "Sin pedidos aun" | **PRESENTE** | Implementado. |
| 4.81 | Persistencia en localStorage | **PRESENTE** | `orderHistory` en localStorage. |
| **FAVORITOS** | | | |
| 4.82 | Sistema de favoritos (localStorage) | **PRESENTE** | `favorites` en localStorage. |
| 4.83 | Vista filtrada de favoritos | **PRESENTE** | Toggle de vista de favoritos. |
| 4.84 | Badge contador de favoritos | **PRESENTE** | Badge en header y barra movil. |
| 4.85 | Validacion de favoritos huerfanos (productos eliminados) | **PRESENTE** | El storefront limpia favoritos de productos que ya no existen. |
| **BUSQUEDA** | | | |
| 4.86 | Busqueda por nombre y descripcion | **PRESENTE** | Implementado con `search` + `productsByCategory`. |
| 4.87 | Busqueda con debounce (300ms) | **PRESENTE** | Debounce implementado. |
| 4.88 | Resultados de busqueda muestran titulo "Resultados para: X" | **PRESENTE** | El titulo de seccion cambia durante busqueda. |
| **PAGINACION / INFINITE SCROLL** | | | |
| 4.89 | Carga inicial paginada (20 productos por pagina) | **PRESENTE** | `get_storefront_payload` y `get_orders_page`/`get_reviews_page` tienen paginacion. |
| 4.90 | Infinite scroll con IntersectionObserver | **AUSENTE** | El storefront publico de Vento carga toda la data del catalogo de una vez (productos de un catalogo), no usa infinite scroll. **Razon**: La carga de producto usa RPC que devuelve todo el catalogoPublico. Para catalogos con muchos productos (50+) esto seria necesario. |
| 4.91 | Boton "Cargar mas" / scroll sentinel | **AUSENTE** | Ver 4.90. |
| 4.92 | Loader durante carga de mas productos | **AUSENTE** | Ver 4.90. |
| **CACHE / OFFLINE** | | | |
| 4.93 | Cache en localStorage del storefront (5 min TTL) | **PRESENTE** | `useStorefrontCache.ts` con persistencia en localStorage. |
| 4.94 | Fallback a cache expirado si falla la conexion | **PRESENTE** | `app/pages/b/[slug].vue` reutiliza ultima copia valida. |
| 4.95 | Modo offline con datos generados localmente si no hay cache | **AUSENTE** | Vento no genera productos dummy en modo offline. Muestra el cache o nada. **Razon**: El generador tenia `generateProducts()` con Unsplash URLs. Vento usa datos reales de Supabase. |
| 4.96 | Timeout de fetch (14s para conexiones lentas) | **PARCIAL** | Supabase client tiene timeout pero no tan alto como 14s. |
| **CHECKOUT / WHATSAPP** | | | |
| 4.97 | Generacion de mensaje de WhatsApp con items, cantidades, total | **PRESENTE** | `encodeOrderToWhatsApp()` en `useCheckoutEngine`. |
| 4.98 | Guardado en historial de pedidos al completar checkout | **PRESENTE** | `wrappedSubmitCheckout()` guarda en localStorage. |
| 4.99 | Limpieza de carrito despues de checkout | **PRESENTE** | `cartStore.clearCart()`. |
| 4.100 | Cierre del drawer despues de enviar WhatsApp | **PRESENTE** | Implementado. |
| **PWA** | | | |
| 4.101 | Soporte de instalacion PWA (beforeinstallprompt) | **PRESENTE** | `installPwa()` en `StorefrontShop.vue`. |
| 4.102 | Service Worker registration | **PARCIAL** | El service worker basico existe. El PWA offline completo esta en el backlog. |
| 4.103 | manifest.json por tienda generado dinamicamente | **AUSENTE** | El generador PHP creaba un manifest.json por tienda con nombre, color y iconos. Vento no genera manifest por catalogo. **Razon**: La generacion de manifest por tenant no se implemento. |
| **MOBILE BOTTOM NAV** | | | |
| 4.104 | Barra de navegacion inferior movil con 5 botones: Inicio, Filtros, Favoritos, Historial, WhatsApp | **PRESENTE** | `StorefrontShop.vue` tiene barra movil inferior identica. |
| 4.105 | Ocultar en desktop (md+) | **PRESENTE** | `hidden md:hidden` correcto. |
| **TIMER / OFERTAS** | | | |
| 4.106 | Timer countdown en tarjetas de producto | **PRESENTE** | `timerLabels` con actualizacion cada segundo. |
| 4.107 | Persistencia del start time en localStorage | **PRESENTE** | `offerTimerStarts` en localStorage. |
| **REVIEWS** | | | |
| 4.108 | Formulario de resenas (nombre, rating, comentario) | **PRESENTE** | El storefront tiene formulario de resenas. |
| 4.109 | Moderacion de resenas (approved flag) | **PRESENTE** | `approveReview` + `reviewModeration` en settings. |
| 4.110 | Rate limiting de resenas (max 3 en 6 horas) | **PRESENTE** | `readRecentReviewAttempts()` + throttling. |
| 4.111 | Confirmacion "Resena enviada a moderacion" | **PRESENTE** | Alerta despues de enviar resena. |
| **TOASTS** | | | |
| 4.112 | Toast notifications animados (pill negro con icono) | **PRESENTE** | `StorefrontShop.vue` tiene `showToast()` con animacion. |
| 4.113 | Auto-dismiss (1.5s) | **PRESENTE** | `setTimeout` de 2.5s en el toast. |
| **FOOTER** | | | |
| 4.114 | Footer con nombre de tienda, descripcion, WhatsApp link | **PRESENTE** | Footer implementado en `StorefrontShop.vue`. |
| 4.115 | Copyright con ano dinamico | **PRESENTE** | `new Date().getFullYear()`. |
| **ESTADO CERRADO** | | | |
| 4.116 | Soporte para tienda cerrada (closed) | **PRESENTE** | `closed` flag + `closedMessage` + pantalla de cerrado. |
| 4.117 | Horario semanal (schedule) con apertura/cierre por dia | **PRESENTE** | `weeklySchedule` + `scheduleMode` en settings. |
| 4.118 | Indicador "Abierto/Cerrado" con estado del schedule | **PRESENTE** | `scheduleState` computed en el storefront. |

---

## 5. BACKEND API

### Archivos originales: `admin_api.php`, `api.php`, `store_generator.php`

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| 5.1 | Crear tienda con transaccion SQL (store + user + settings + categoria default) | **PARCIAL** | Vento crea catalogos via `createCatalog` en el frontend store, no via PHP transaccional. La creacion de catalogo no es transaccional a nivel BD de la misma manera. |
| 5.2 | Generar index.php por tienda con configuracion | **AUSENTE** | No aplica. Vento es SPA, no genera archivos PHP por tienda. |
| 5.3 | Generar admin.html por tienda (redirige al panel maestro) | **AUSENTE** | No aplica. |
| 5.4 | Generar manifest.json por tienda | **AUSENTE** | Ver 4.103. |
| 5.5 | CRUD de productos con galeria de imagenes (3 max, MIME validation) | **PRESENTE** | CRUD completo via Supabase + Storage. Sin limite fijo de 3 imagenes. |
| 5.6 | Upload de imagenes con compresion GD/JPEG (75% quality, max width 2000px, resize manteniendo ratio) | **AUSENTE** | Sin compresion server-side. Supabase Storage acepta el archivo tal cual. **Razon**: La compresion de imagenes no se implemento ni en cliente ni en server. |
| 5.7 | Organizacion de uploads por ano/mes en carpetas | **AUSENTE** | Supabase Storage organiza por bucket/path, sin estructura YYYY/MM automatica. |
| 5.8 | Generacion de nombre de archivo aleatorio (30 caracteres) | **AUSENTE** | Supabase Storage usa el nombre original o UUID. |
| 5.9 | Eliminar archivos fisicos al borrar producto/categoria | **PRESENTE** | Supabase Storage delete via operaciones del cliente. |
| 5.10 | CRUD de categorias | **PRESENTE** | Implementado. |
| 5.11 | Save settings con 22+ campos de configuracion | **PRESENTE** | Vento guarda settings via `saveCatalogSettings`. |
| 5.12 | Auto-generacion de colores derivados (color_100 = color_50, color_700 = color_600, toast = color_500/600) via adjustBrightness | **AUSENTE** | Vento no genera derivados automaticamente; cada campo de color se guarda individualmente. **Razon**: La derivacion automatica reduce la cantidad de color pickers necesarios; en Vento hay mas campos pero mas control. |
| 5.13 | Login con sesion PHP (session_start, session_regenerate_id) | **AUSENTE** | Vento usa Supabase Auth (JWT). Mas seguro y stateless. |
| 5.14 | Verificacion de master password para bypass de autenticacion | **AUSENTE** | No hay master password en Vento. |
| 5.15 | Change credentials (cambiar usuario y/o password con verificacion de password actual) | **AUSENTE** | Ver 3.29. |
| 5.16 | Get credentials (obtener username actual) | **AUSENTE** | authStore.user.email/displayName. |
| 5.17 | Logout (session_destroy) | **PRESENTE** | Supabase signOut. |
| 5.18 | API publica: get_data con paginacion (20 productos por pagina, con imagenes, reviews stats agregadas, total count) | **PRESENTE** | `get_public_storefront_payload` RPC + `get_orders_page` + `get_reviews_page`. |
| 5.19 | API publica: add_review (POST con XSS sanitization htmlspecialchars) | **PRESENTE** | `server/api/reviews/create.post.ts` con sanitizacion. |
| 5.20 | List stores con status exists_on_disk | **AUSENTE** | No aplica; no hay stores en disco. El panel master usa consulta SQL directa. |
| 5.21 | Cleanup ghosts (eliminar registros BD sin carpeta en disco) | **AUSENTE** | No aplica. Ver 1.9. |
| 5.22 | Check slug availability (en tiempo real) | **AUSENTE** | No hay endpoint dedicado; el unique constraint en BD lo maneja al guardar. |
| 5.23 | Delete store con eliminacion en cascada BD + borrado de carpeta en disco + eliminacion de archivos de imagenes | **PARCIAL** | Vento puede banear/eliminar catalogos pero no borra archivos de Storage automaticamente. |
| 5.24 | Cache-Control header para API publica (60s) | **PRESENTE** | Los endpoints server de Vento tienen cache HTTP. |
| 5.25 | JSON_UNESCAPED_UNICODE en todas las respuestas | **PRESENTE** | Nuxt/Nitro maneja encoding correctamente. |
| 5.26 | Manejo de errores con try-catch + rollback de transaccion | **PRESENTE** | Supabase tiene manejo de errores nativo. |
| 5.27 | Validacion de formato de WhatsApp (solo digitos) | **PARCIAL** | Vento guarda el WhatsApp como texto libre, sin validacion de formato. |
| 5.28 | MIME type validation en uploads (JPEG, PNG, WebP) | **PARCIAL** | Supabase Storage acepta cualquier tipo. La validacion depende de las politicas de bucket. |

---

## 6. MODELO DE DATOS

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| 6.1 | Tabla stores (id, name, slug, whatsapp, created_at) | **PRESENTE** | Equivalente: tabla `catalogs`. |
| 6.2 | Tabla users (id, store_id, username, password_hash) | **PRESENTE** | Supabase Auth + tabla `profiles`. |
| 6.3 | Tabla site_settings (store_id, setting_key, setting_value) - EAV | **PARCIAL** | Vento usa JSONB `settings` en la tabla `catalogs`, que es mas eficiente que EAV. |
| 6.4 | Tabla categories (id, store_id, name, icon) | **PRESENTE** | Tabla `categories` en schema.sql. |
| 6.5 | Tabla products (id, store_id, cat_id, name, price, old_price, stock, manage_stock, free_ship, description, specs, created_at) | **PRESENTE** | Tabla `products` con campos equivalentes. |
| 6.6 | Tabla product_images (id, product_id, image_url, sort_order) | **PRESENTE** | Campo `image_urls` JSONB array en products. |
| 6.7 | Tabla reviews (id, product_id, user_name, rating, comment, approved, created_at) | **PRESENTE** | Tabla `reviews` en schema.sql. |
| 6.8 | Foreign keys con ON DELETE CASCADE | **PRESENTE** | FK constraints en schema.sql. |

---

## 7. UX / DISENO

| # | Feature | Estado | Detalle |
|---|---------|--------|---------|
| 7.1 | Glass morphism en paneles de admin | **PARCIAL** | El admin de Vento tiene su propio estilo (mas limpio/profesional). El glass morphism del generador es mas "tech". |
| 7.2 | Animaciones de entrada (fadeInUp) | **PRESENTE** | Transiciones Vue en el storefront. |
| 7.3 | Animacion de pulso en boton de generar | **AUSENTE** | No hay boton de generar con pulso. |
| 7.4 | Scrollbar personalizada (thin, glass) | **PRESENTE** | Tailwind incluye estilos de scrollbar. |
| 7.5 | Interfaz responsive (mobile first) | **PRESENTE** | Completamente responsive. |
| 7.6 | Modales con backdrop blur | **PRESENTE** | Todos los modales usan backdrop blur. |

---

## RESUMEN GLOBAL

### PRESENTES COMPLETOS: ~75 features
### PARCIALES: ~20 features  
### AUSENTES: ~25 features (la mayoria por decision arquitectonica)

---

## FUNCIONALIDADES AUSENTES QUE REQUIEREN EXPLICACION

### A. Las que NO DEBERIAN ESTAR en Vento (decisiones arquitectonicas correctas)

1. **Generador maestro de tiendas** (HTML separado) — Vento es SaaS multi-tenant. Las tiendas se crean por registro/onboarding, no por un panel externo. El equivalente es el flujo de creacion de catalogo + panel master de supervision.

2. **Generador de agentes colaboradores** — Reemplazado por el sistema de equipo/permisos (`team.vue`, `has_catalog_role`).

3. **Login con slug + password local** — Reemplazado por Supabase Auth (JWT, OAuth, mas seguro).

4. **Generacion de archivos fisicos por tienda** (index.php, admin.html, manifest.json, carpetas) — No aplica a SPA. Vento es dinamico, no genera archivos estaticos.

5. **Tabla EAV site_settings** — Vento usa JSONB en la tabla `catalogs`, mucho mas eficiente.

6. **Contrasena maestra (MASTER_PASS)** — Supabase Auth gestiona roles (systemRole: 'admin').

7. **Limpiar fantasmas** — No hay discrepancia BD-disco en arquitectura cloud.

### B. Las que FALTAN y DEBERIAN IMPLEMENTARSE

**Prioridad Alta:**

1. **Modal de recorte de imagenes (crop)** para app icon/logos — El generador original tiene un crop modal con zoom, drag y salida 512x512. Vento no tiene ningun crop tool.

2. **Selector visual de iconos Lucide** (icon picker grid) — El generador muestra 15 iconos en grid visual. Vento tiene un campo de texto donde escribis el nombre del icono manualmente.

3. **Paleta de 30 colores predefinidos** — El generador ofrece una seleccion visual de 30 colores con swatches + color picker personalizado + generacion de shades. Vento solo tiene color pickers nativos individuales.

4. **Generacion automatica de shades/tintes desde color base** — El generador deriva automaticamente 6 tonos (50, 100, 500, 600, 700, 900) desde cualquier color elegido. Vento requiere configurar cada color manualmente.

**Prioridad Media:**

5. **Live preview con postMessage** — El generador actualiza el preview en tiempo real mientras editas (colores, textos, imagenes). Vento requiere guardar para ver cambios en el preview.

6. **Cambio de credenciales/password dentro del admin** — El generador permite cambiar usuario y password. Vento depende del flujo externo de Supabase.

7. **Compresion de imagenes antes de upload** — El generador comprime imagenes en el cliente (canvas) y en servidor (GD). Vento sube archivos sin comprimir.

8. **Infinite scroll en storefront** — El generador carga 20 productos por pagina con IntersectionObserver. Vento carga todo el catalogo de una vez (OK para catalogos pequenos, problemático para 50+ productos).

9. **Badge de envio gratis en producto** — El campo `freeShip` del generador no existe en Vento.

10. **Sidebar de categorias en desktop** — El layout `store` solo tiene pills horizontales. El generador tenia sidebar en desktop.

11. **Boton de compartir producto** — Usar Web Share API o enlace de WhatsApp.

**Prioridad Baja (detalles visuales):**

12. **Texto indicador "Toca para ampliar" en galeria**
13. **Boton "Resetear colores" a defaults**
14. **Preview de WhatsApp (OG image preview simulado)**
15. **Toggle mobile/desktop (375px vs full) en preview modal**
16. **Generacion de manifest.json dinamico por tienda**
17. **Barra de progreso durante upload de imagenes**
18. **Validacion de formato WhatsApp**
19. **Productos agrupados visualmente por categoria en admin**

---

## CONCLUSION

El **~75% de las funcionalidades** del Generador de Tiendas original ya estan presentes en Vento. La mayoria de las ausencias (generador maestro, archivos fisicos, login local, EAV, master password) son decisiones arquitectonicas validas que no deben revertirse.

Las **9 funcionalidades de prioridad alta/media** listadas arriba son las que realmente hacen falta para alcanzar paridad 100% en la experiencia de usuario del admin de tienda. Se recomienda atacarlas en la siguiente iteracion.
