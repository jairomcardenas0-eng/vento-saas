# CAMBIOS FASE 1.1

- Se agrego schema relacional de variantes e inventario en `supabase/schema.sql`.
- Se agregaron funciones SQL para migracion, reserva y liberacion de stock.
- `server/api/orders/create.post.ts` ahora acepta `variantOptionIds` y reserva stock antes de insertar.
- `app/pages/admin/products.vue` se rehizo como editor estructurado de variantes e inventario por opcion.
- `app/pages/admin/inventory.vue` se agrego como vista operativa de stock.
- `app/components/storefront/StorefrontShop.vue` muestra estado de stock y bloquea quick add si no hay disponibilidad.
- `npx nuxt typecheck` pasa.
- `npm run build` pasa.
