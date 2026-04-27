-- =============================================================================
-- MIGRACIÓN: Agregar free_ship a la tabla products
-- Fecha: 2026-04-25
-- Descripción:
--   1. Agrega la columna free_ship (boolean, default false) a products
--   2. Actualiza el RPC get_catalog_editor_payload para incluir productos
--      con TODAS las columnas (to_jsonb ya las incluye automáticamente)
--   3. Actualiza el RPC get_public_storefront_payload (to_jsonb ya incluye
--      todas las columnas automáticamente)
--
-- NOTA: Los RPCs existentes usan to_jsonb(p) que serializa TODAS las columnas
-- automáticamente, por lo que free_ship se incluirá sin cambios adicionales.
-- =============================================================================

-- 1. Agregar columna free_ship a la tabla products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS free_ship boolean NOT NULL DEFAULT false;

-- 2. Las funciones RPC existentes usan to_jsonb() que incluye
--    automáticamente todas las columnas. No se requieren cambios.
--    Pero recreamos los RPCs principales por claridad y para
--    asegurar que el plan de ejecución se actualice:

-- Recrear get_public_storefront_payload (incluye free_ship vía to_jsonb)
CREATE OR REPLACE FUNCTION public.get_public_storefront_payload(slug_text text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_catalog AS (
    SELECT *
    FROM public.catalogs c
    WHERE lower(c.slug) = lower(btrim(coalesce(slug_text, '')))
      AND c.status = 'published'
      AND c.is_banned = false
    LIMIT 1
  )
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM target_catalog) THEN NULL
      ELSE jsonb_build_object(
        'catalog',
        (SELECT to_jsonb(c) FROM target_catalog c),
        'categories',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(cat) ORDER BY cat.sort_order)
            FROM public.categories cat
            WHERE cat.catalog_id = (SELECT id FROM target_catalog)
              AND cat.is_active = true
          ),
          '[]'::jsonb
        ),
        'products',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order)
            FROM public.products p
            WHERE p.catalog_id = (SELECT id FROM target_catalog)
              AND p.is_active = true
          ),
          '[]'::jsonb
        ),
        'reviews',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
            FROM public.reviews r
            WHERE r.catalog_id = (SELECT id FROM target_catalog)
              AND r.approved = true
          ),
          '[]'::jsonb
        ),
        'coupons',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(co) ORDER BY co.created_at DESC)
            FROM public.coupons co
            WHERE co.catalog_id = (SELECT id FROM target_catalog)
              AND co.visible_publicly = true
              AND co.is_active = true
          ),
          '[]'::jsonb
        )
      )
    END;
$$;

-- Recrear get_catalog_editor_payload (incluye free_ship vía to_jsonb)
CREATE OR REPLACE FUNCTION public.get_catalog_editor_payload(target_catalog_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN NOT public.is_catalog_owner(target_catalog_id) THEN NULL
      ELSE jsonb_build_object(
        'categories',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(cat) ORDER BY cat.sort_order)
            FROM public.categories cat
            WHERE cat.catalog_id = target_catalog_id
          ),
          '[]'::jsonb
        ),
        'products',
        coalesce(
          (
            SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order)
            FROM public.products p
            WHERE p.catalog_id = target_catalog_id
          ),
          '[]'::jsonb
        )
      )
    END;
$$;

-- 3. Verificación
DO $$
BEGIN
  RAISE NOTICE 'Migración free_ship completada.';
  RAISE NOTICE 'Columna free_ship en products: %',
    (SELECT column_name FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'free_ship');
END;
$$;
