-- ─── Analytics: RPC atómica anti race-condition ──────────────────────────────
-- Ejecuta esta migración en el SQL Editor de Supabase.
-- Registra sesión + evento en una sola transacción atómica.
-- SECURITY DEFINER permite que el server route (anon key) escriba sin RLS.

create or replace function public.track_analytics_event(
  p_catalog_id   uuid,
  p_session_uuid uuid,
  p_event_type   text,
  p_product_id   text    default null,
  p_path         text    default null,
  p_user_agent   text    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validación básica de event_type
  if p_event_type not in ('page_view', 'product_click') then
    raise exception 'event_type invalido: %', p_event_type;
  end if;

  -- Upsert atómico de sesión:
  --   · Si es nueva  → inserta con first_seen_at = now()
  --   · Si ya existe → solo actualiza last_seen_at y last_path
  insert into public.catalog_analytics_sessions (
    catalog_id,
    session_uuid,
    first_seen_at,
    last_seen_at,
    user_agent,
    last_path
  ) values (
    p_catalog_id,
    p_session_uuid,
    now(),
    now(),
    p_user_agent,
    p_path
  )
  on conflict (catalog_id, session_uuid) do update
    set last_seen_at = greatest(
          public.catalog_analytics_sessions.last_seen_at,
          excluded.last_seen_at
        ),
        last_path  = coalesce(excluded.last_path,  public.catalog_analytics_sessions.last_path),
        user_agent = coalesce(excluded.user_agent, public.catalog_analytics_sessions.user_agent);

  -- Insertar el evento.
  -- El trigger `trg_catalog_analytics_daily` se encarga automáticamente de:
  --   · Actualizar catalog_analytics_daily (page_views, product_clicks, active_users, new_users)
  --   · Insertar en catalog_analytics_daily_sessions (idempotente por ON CONFLICT DO NOTHING)
  insert into public.catalog_analytics_events (
    catalog_id,
    session_uuid,
    event_type,
    product_id,
    path,
    created_at
  ) values (
    p_catalog_id,
    p_session_uuid,
    p_event_type,
    p_product_id,
    p_path,
    now()
  );
end;
$$;
