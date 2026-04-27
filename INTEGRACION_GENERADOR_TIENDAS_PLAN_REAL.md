# Integracion real del generador de tiendas en Vento

Fecha: 2026-04-25

## Decision central

El prompt `PROMPT_INTEGRACION_GENERADOR_TIENDAS.md` se analizo completo, pero no debe ejecutarse de forma literal.

Motivo:

- propone crear un segundo dominio completo de `stores`, `store_products`, `store_categories`, `store_orders` y `store_reviews`;
- Vento ya tiene `catalogs`, `products`, `categories`, `orders`, `reviews`, `coupons`, analytics, permisos y storefront publico;
- duplicar esas entidades partiria el producto en dos sistemas paralelos con doble mantenimiento, doble RLS y doble superficie de errores.

La integracion correcta en Vento es esta:

- un catalogo puede operar como menu o como tienda;
- la diferencia principal vive en `storefrontLayout`, `theme` y `settings`;
- productos, categorias, pedidos, reseñas, cupones, QR y permisos siguen en el dominio actual;
- el generador de tiendas original se interpreta como una experiencia visual/comercial y un conjunto de overrides de configuracion, no como una segunda app aparte.

## Lo que ya se integro

### 1. Nuevo layout publico tipo tienda

Se agrego el layout `store` al modelo de configuracion actual.

Archivos:

- `app/types/catalog.ts`
- `app/data/defaults.ts`
- `app/components/storefront/StorefrontShop.vue`
- `app/pages/b/[slug].vue`
- `app/components/admin/PreviewModal.vue`

Capacidades ya integradas en este modo:

- hero comercial;
- barra superior editable;
- favoritos persistidos en `localStorage`;
- encabezado con branding de tienda;
- botonera comercial mas cercana a ecommerce;
- reutilizacion del carrito, checkout por WhatsApp, cupones, reseñas y modal de producto ya existentes;
- preview en vivo desde admin.

### 2. Overrides de configuracion tipo tienda

Se agregaron estos campos a `CatalogOperationalSettings`:

- `storeTopBarHtml`
- `storeHeaderName`
- `storeShowPremiumBadge`
- `storeHeroTag`
- `storeHeroTitle`
- `storeHeroDescription`
- `storeHeroButtonText`
- `storeHeroBackgroundImage`
- `storeFooterText`
- `storeIcon`

Estos campos se editan desde `app/pages/admin/appearance.vue`.

### 3. Primera adaptacion del prompt original

Del generador original se absorbio la parte que si pertenece a Vento:

- look and feel de tienda;
- hero con identidad propia;
- configuracion comercial separada del menu clasico;
- experiencia mas cercana al storefront PHP.

## Lo que NO se debe hacer como lo pide el prompt original

No se debe:

- crear `stores_*` como duplicado completo de `catalogs/products/categories/orders/reviews`;
- mover autenticacion de admin de tienda a credenciales paralelas fuera del sistema actual;
- generar archivos fisicos por tienda como en PHP;
- mantener dos pipelines distintas de storefront publico.

## Siguiente ejecucion correcta del prompt

Las siguientes iteraciones deben continuar por esta ruta:

1. Completar el mapeo visual del template PHP hacia `StorefrontShop.vue`.
2. Extender el editor de apariencia con mas campos del generador original.
3. Reutilizar `products`, `variants`, `reviews`, `orders` y `coupons` actuales para cubrir las funciones faltantes del storefront tienda.
4. Crear una capa de assets/imagenes mas fuerte para la experiencia de tienda.
5. Si de verdad se necesita multi-tienda por cuenta con identidades separadas, entonces modelarlo como varias filas en `catalogs` o como una capa ligera `catalog_brands`, nunca duplicando todo el dominio.

## Diferencia entre “seguir el prompt” y hacerlo bien

Seguir el prompt literalmente produciria una migracion vistosa pero fragil.

Seguir el prompt con criterio arquitectonico produce:

- una sola fuente de verdad;
- menos errores;
- menos SQL duplicado;
- menos deuda tecnica;
- mejor camino para escalar a miles de negocios.
