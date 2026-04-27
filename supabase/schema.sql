create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  uid uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Owner',
  default_catalog_id uuid null,
  system_role text not null default 'merchant' check (system_role in ('owner', 'merchant')),
  referral_code text unique,
  referred_by uuid null references public.user_profiles (uid) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- Asegurar que las columnas de referidos existen (por si la tabla ya estaba creada)
alter table public.user_profiles 
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid null references public.user_profiles (uid) on delete set null;

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_uid uuid not null references public.user_profiles (uid) on delete cascade,
  status text not null default 'published' check (status in ('draft', 'published')),
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'gold')),
  is_banned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  rating_average numeric(10, 2) not null default 0,
  rating_approved_count integer not null default 0,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb
);

alter table public.user_profiles
  drop constraint if exists user_profiles_default_catalog_id_fkey;

alter table public.user_profiles
  add constraint user_profiles_default_catalog_id_fkey
  foreign key (default_catalog_id) references public.catalogs (id) on delete set null;

create table if not exists public.categories (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  sort_order integer not null default 1,
  is_active boolean not null default true,
  primary key (catalog_id, id)
);

create table if not exists public.products (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  id text not null,
  category_id text null,
  name text not null,
  description text not null default '',
  base_price numeric(12, 2) not null default 0,
  promo_price numeric(12, 2) null,
  has_promo boolean not null default false,
  image_url text null,
  image_urls jsonb not null default '[]'::jsonb,
  sort_order integer not null default 1,
  is_active boolean not null default true,
  promo_tag jsonb not null default '{}'::jsonb,
  timer jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  product_rating numeric(10, 2) not null default 0,
  product_rating_count integer not null default 0,
  reviews_approved_count integer not null default 0,
  primary key (catalog_id, id)
);

create table if not exists public.reviews (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  id text not null,
  product_id text null,
  product_name text not null default '',
  customer_name text not null default '',
  comment text not null default '',
  rating integer not null default 5 check (rating between 1 and 5),
  approved boolean not null default false,
  admin_reply jsonb null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, id)
);

create table if not exists public.orders (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  id text not null,
  channel text not null default 'whatsapp',
  status text not null default 'new' check (status in ('new', 'preparing', 'completed', 'cancelled', 'viewed', 'closed')),
  customer_name text not null default '',
  customer_address text not null default '',
  payment_method text not null default '',
  delivery_mode text not null check (delivery_mode in ('delivery', 'pickup')),
  delivery_zone_id text null,
  delivery_zone_name text null,
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  applied_coupon jsonb null,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, id)
);

create table if not exists public.coupons (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  id text not null,
  name text not null default '',
  code text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null default 0,
  minimum_order numeric(12, 2) not null default 0,
  usage_limit integer null,
  used_count integer not null default 0,
  starts_at timestamptz null,
  expires_at timestamptz null,
  visible_publicly boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, id),
  unique (catalog_id, code)
);

-- Funciones wrapper IMMUTABLE para índices GIN de búsqueda
-- Deben definirse antes de los índices que las usan
create or replace function public.catalog_search_vector(settings jsonb)
returns tsvector
language sql
immutable
as $$
  select to_tsvector(
    'simple',
    concat_ws(
      ' ',
      coalesce(settings->>'businessName', ''),
      coalesce(settings->>'tagline', ''),
      coalesce(settings->'address'->>'city', ''),
      coalesce(settings->'address'->>'stateCode', ''),
      coalesce(settings->'address'->>'countryCode', ''),
      coalesce(settings->>'businessType', '')
    )
  );
$$;

create or replace function public.product_search_vector(name text, description text)
returns tsvector
language sql
immutable
as $$
  select to_tsvector('simple', concat_ws(' ', coalesce(name, ''), coalesce(description, '')));
$$;

create index if not exists idx_catalogs_owner_uid on public.catalogs (owner_uid);
create index if not exists idx_catalogs_status_ban on public.catalogs (status, is_banned);
create index if not exists idx_catalogs_slug_lower on public.catalogs (lower(slug));
create index if not exists idx_catalogs_settings_gin on public.catalogs using gin (settings);
create index if not exists idx_categories_catalog_order on public.categories (catalog_id, sort_order);
create index if not exists idx_products_catalog_order on public.products (catalog_id, sort_order);
create index if not exists idx_products_catalog_active_order on public.products (catalog_id, is_active, sort_order);
create index if not exists idx_products_tags_gin on public.products using gin (tags);
create index if not exists idx_catalogs_marketplace_search on public.catalogs using gin (
  public.catalog_search_vector(settings)
);
create index if not exists idx_products_marketplace_search on public.products using gin (
  public.product_search_vector(name, description)
);
create index if not exists idx_reviews_catalog_created on public.reviews (catalog_id, created_at desc);
create index if not exists idx_reviews_catalog_approved_created on public.reviews (catalog_id, approved, created_at desc);
create index if not exists idx_orders_catalog_created on public.orders (catalog_id, created_at desc);
create index if not exists idx_orders_catalog_status_created on public.orders (catalog_id, status, created_at desc);
create index if not exists idx_coupons_catalog_created on public.coupons (catalog_id, created_at desc);
create index if not exists idx_coupons_catalog_public_active on public.coupons (catalog_id, visible_publicly, is_active, created_at desc);

create table if not exists public.catalog_team_members (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('active', 'pending', 'suspended')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.user_profiles (uid) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (catalog_id, email)
);

alter table public.catalog_team_members enable row level security;

-- El dueño del catálogo puede hacerlo todo
drop policy if exists "owner_manage_team" on public.catalog_team_members;
create policy "owner_manage_team"
  on public.catalog_team_members for all
  using (
    exists (
      select 1 from public.catalogs
      where id = catalog_team_members.catalog_id
      and owner_uid = auth.uid()
    )
  );

-- Los miembros del equipo pueden ver su propia fila (sin recursión)
drop policy if exists "member_view_team" on public.catalog_team_members;
create policy "member_view_team"
  on public.catalog_team_members for select
  using (email = auth.email());

create table if not exists public.catalog_analytics_sessions (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  session_uuid uuid not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  user_agent text null,
  last_path text null,
  primary key (catalog_id, session_uuid)
);

create table if not exists public.catalog_analytics_events (
  id bigint generated always as identity primary key,
  catalog_id uuid not null,
  session_uuid uuid not null,
  event_type text not null check (event_type in ('page_view', 'product_click')),
  product_id text null,
  path text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint catalog_analytics_events_session_fkey
    foreign key (catalog_id, session_uuid)
    references public.catalog_analytics_sessions (catalog_id, session_uuid)
    on delete cascade
);

create table if not exists public.catalog_analytics_daily_sessions (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  day_bucket date not null,
  session_uuid uuid not null,
  is_new_user boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, day_bucket, session_uuid)
);

create table if not exists public.catalog_analytics_daily (
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  day_bucket date not null,
  page_views integer not null default 0,
  product_clicks integer not null default 0,
  active_users integer not null default 0,
  new_users integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, day_bucket)
);

create index if not exists idx_catalog_analytics_sessions_catalog_last_seen
  on public.catalog_analytics_sessions (catalog_id, last_seen_at desc);
create index if not exists idx_catalog_analytics_events_catalog_created
  on public.catalog_analytics_events (catalog_id, created_at desc);
create index if not exists idx_catalog_analytics_events_catalog_type_created
  on public.catalog_analytics_events (catalog_id, event_type, created_at desc);
create index if not exists idx_catalog_analytics_daily_catalog_day
  on public.catalog_analytics_daily (catalog_id, day_bucket desc);
create index if not exists idx_catalog_analytics_daily_sessions_catalog_day
  on public.catalog_analytics_daily_sessions (catalog_id, day_bucket desc);

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where uid = auth.uid()
      and system_role = 'owner'
  );
$$;

create or replace function public.is_catalog_owner(target_catalog uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.catalogs
    where id = target_catalog
      and owner_uid = auth.uid()
  ) or public.is_platform_owner();
$$;

create or replace function public.can_manage_profile(target_uid uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_owner() or (
    auth.uid() = target_uid
    and exists (
      select 1
      from public.user_profiles
      where uid = auth.uid()
        and system_role = target_role
    )
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.catalogs enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.coupons enable row level security;
alter table public.catalog_analytics_sessions enable row level security;
alter table public.catalog_analytics_events enable row level security;
alter table public.catalog_analytics_daily_sessions enable row level security;
alter table public.catalog_analytics_daily enable row level security;

drop policy if exists "profiles_select_self_or_owner" on public.user_profiles;
create policy "profiles_select_self_or_owner"
on public.user_profiles
for select
using (uid = auth.uid() or public.is_platform_owner());

drop policy if exists "profiles_insert_self" on public.user_profiles;
create policy "profiles_insert_self"
on public.user_profiles
for insert
with check (
  (uid = auth.uid() and system_role = 'merchant')
  or public.is_platform_owner()
);

drop policy if exists "profiles_update_self_or_owner" on public.user_profiles;
create policy "profiles_update_self_or_owner"
on public.user_profiles
for update
using (uid = auth.uid() or public.is_platform_owner())
with check (public.can_manage_profile(uid, system_role));

drop policy if exists "catalogs_public_or_owner_read" on public.catalogs;
create policy "catalogs_public_or_owner_read"
on public.catalogs
for select
using (
  public.is_catalog_owner(id)
  or (status = 'published' and is_banned = false)
);

drop policy if exists "catalogs_owner_insert" on public.catalogs;
create policy "catalogs_owner_insert"
on public.catalogs
for insert
with check (owner_uid = auth.uid() or public.is_platform_owner());

drop policy if exists "catalogs_owner_update" on public.catalogs;
create policy "catalogs_owner_update"
on public.catalogs
for update
using (public.is_catalog_owner(id))
with check (public.is_catalog_owner(id));

drop policy if exists "catalogs_owner_delete" on public.catalogs;
create policy "catalogs_owner_delete"
on public.catalogs
for delete
using (public.is_platform_owner());

drop policy if exists "categories_public_or_owner_read" on public.categories;
create policy "categories_public_or_owner_read"
on public.categories
for select
using (
  public.is_catalog_owner(catalog_id)
  or exists (
    select 1
    from public.catalogs
    where id = categories.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "categories_owner_write" on public.categories;
create policy "categories_owner_write"
on public.categories
for all
using (public.is_catalog_owner(catalog_id))
with check (public.is_catalog_owner(catalog_id));

drop policy if exists "products_public_or_owner_read" on public.products;
create policy "products_public_or_owner_read"
on public.products
for select
using (
  public.is_catalog_owner(catalog_id)
  or exists (
    select 1
    from public.catalogs
    where id = products.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "products_owner_write" on public.products;
create policy "products_owner_write"
on public.products
for all
using (public.is_catalog_owner(catalog_id))
with check (public.is_catalog_owner(catalog_id));

drop policy if exists "reviews_public_or_owner_read" on public.reviews;
create policy "reviews_public_or_owner_read"
on public.reviews
for select
using (
  public.is_catalog_owner(catalog_id)
  or (
    approved = true
    and exists (
      select 1
      from public.catalogs
      where id = reviews.catalog_id
        and status = 'published'
        and is_banned = false
    )
  )
);

drop policy if exists "reviews_public_insert" on public.reviews;
create policy "reviews_public_insert"
on public.reviews
for insert
with check (
  exists (
    select 1
    from public.catalogs
    where id = reviews.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "reviews_owner_update_delete" on public.reviews;
create policy "reviews_owner_update_delete"
on public.reviews
for update
using (public.is_catalog_owner(catalog_id))
with check (public.is_catalog_owner(catalog_id));

drop policy if exists "reviews_owner_delete" on public.reviews;
create policy "reviews_owner_delete"
on public.reviews
for delete
using (public.is_catalog_owner(catalog_id));

drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read"
on public.orders
for select
using (public.is_catalog_owner(catalog_id));

drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert"
on public.orders
for insert
with check (
  exists (
    select 1
    from public.catalogs
    where id = orders.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "orders_owner_update" on public.orders;
create policy "orders_owner_update"
on public.orders
for update
using (public.is_catalog_owner(catalog_id))
with check (public.is_catalog_owner(catalog_id));

drop policy if exists "coupons_public_or_owner_read" on public.coupons;
create policy "coupons_public_or_owner_read"
on public.coupons
for select
using (
  public.is_catalog_owner(catalog_id)
  or (
    visible_publicly = true
    and is_active = true
    and exists (
      select 1
      from public.catalogs
      where id = coupons.catalog_id
        and status = 'published'
        and is_banned = false
    )
  )
);

drop policy if exists "coupons_owner_write" on public.coupons;
create policy "coupons_owner_write"
on public.coupons
for all
using (public.is_catalog_owner(catalog_id))
with check (public.is_catalog_owner(catalog_id));

drop policy if exists "catalog_analytics_sessions_owner_read" on public.catalog_analytics_sessions;
create policy "catalog_analytics_sessions_owner_read"
on public.catalog_analytics_sessions
for select
using (public.is_catalog_owner(catalog_id));

drop policy if exists "catalog_analytics_sessions_public_insert" on public.catalog_analytics_sessions;
create policy "catalog_analytics_sessions_public_insert"
on public.catalog_analytics_sessions
for insert
with check (
  exists (
    select 1
    from public.catalogs
    where id = catalog_analytics_sessions.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "catalog_analytics_sessions_public_update" on public.catalog_analytics_sessions;
create policy "catalog_analytics_sessions_public_update"
on public.catalog_analytics_sessions
for update
using (
  exists (
    select 1
    from public.catalogs
    where id = catalog_analytics_sessions.catalog_id
      and status = 'published'
      and is_banned = false
  )
)
with check (
  exists (
    select 1
    from public.catalogs
    where id = catalog_analytics_sessions.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "catalog_analytics_events_owner_read" on public.catalog_analytics_events;
create policy "catalog_analytics_events_owner_read"
on public.catalog_analytics_events
for select
using (public.is_catalog_owner(catalog_id));

drop policy if exists "catalog_analytics_events_public_insert" on public.catalog_analytics_events;
create policy "catalog_analytics_events_public_insert"
on public.catalog_analytics_events
for insert
with check (
  exists (
    select 1
    from public.catalogs
    where id = catalog_analytics_events.catalog_id
      and status = 'published'
      and is_banned = false
  )
);

drop policy if exists "catalog_analytics_daily_sessions_owner_read" on public.catalog_analytics_daily_sessions;
create policy "catalog_analytics_daily_sessions_owner_read"
on public.catalog_analytics_daily_sessions
for select
using (public.is_catalog_owner(catalog_id));

drop policy if exists "catalog_analytics_daily_owner_read" on public.catalog_analytics_daily;
create policy "catalog_analytics_daily_owner_read"
on public.catalog_analytics_daily
for select
using (public.is_catalog_owner(catalog_id));

create or replace function public.bump_catalog_analytics_daily()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_day date;
  inserted_daily_session integer := 0;
  session_first_day date;
  day_page_views integer := 0;
  day_product_clicks integer := 0;
begin
  target_day := (new.created_at at time zone 'utc')::date;

  update public.catalog_analytics_sessions
  set
    last_seen_at = greatest(last_seen_at, new.created_at),
    last_path = coalesce(new.path, last_path)
  where catalog_id = new.catalog_id
    and session_uuid = new.session_uuid;

  day_page_views := case when new.event_type = 'page_view' then 1 else 0 end;
  day_product_clicks := case when new.event_type = 'product_click' then 1 else 0 end;

  insert into public.catalog_analytics_daily (
    catalog_id,
    day_bucket,
    page_views,
    product_clicks,
    active_users,
    new_users,
    updated_at
  )
  values (
    new.catalog_id,
    target_day,
    day_page_views,
    day_product_clicks,
    0,
    0,
    timezone('utc', now())
  )
  on conflict (catalog_id, day_bucket)
  do update set
    page_views = public.catalog_analytics_daily.page_views + excluded.page_views,
    product_clicks = public.catalog_analytics_daily.product_clicks + excluded.product_clicks,
    updated_at = timezone('utc', now());

  select (first_seen_at at time zone 'utc')::date
  into session_first_day
  from public.catalog_analytics_sessions
  where catalog_id = new.catalog_id
    and session_uuid = new.session_uuid;

  insert into public.catalog_analytics_daily_sessions (
    catalog_id,
    day_bucket,
    session_uuid,
    is_new_user
  )
  values (
    new.catalog_id,
    target_day,
    new.session_uuid,
    coalesce(session_first_day = target_day, false)
  )
  on conflict do nothing;

  get diagnostics inserted_daily_session = row_count;

  if inserted_daily_session > 0 then
    update public.catalog_analytics_daily
    set
      active_users = active_users + 1,
      new_users = new_users + case when coalesce(session_first_day = target_day, false) then 1 else 0 end,
      updated_at = timezone('utc', now())
    where catalog_id = new.catalog_id
      and day_bucket = target_day;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_catalog_analytics_daily on public.catalog_analytics_events;
create trigger trg_catalog_analytics_daily
after insert on public.catalog_analytics_events
for each row
execute function public.bump_catalog_analytics_daily();

drop function if exists public.get_catalog_analytics_snapshot(uuid, integer);
create or replace function public.get_catalog_analytics_snapshot(target_catalog_id uuid, range_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select greatest(coalesce(range_days, 7), 1) as range_days
  ),
  authorized as (
    select public.has_catalog_permission(target_catalog_id, 'viewStats') as allowed
  ),
  calendar as (
    select generate_series(
      current_date - ((select range_days from normalized) - 1),
      current_date,
      interval '1 day'
    )::date as day_bucket
  ),
  daily as (
    select
      c.day_bucket,
      coalesce(d.page_views, 0) as page_views,
      coalesce(d.active_users, 0) as active_users,
      coalesce(d.new_users, 0) as new_users,
      coalesce(d.product_clicks, 0) as product_clicks
    from calendar c
    left join public.catalog_analytics_daily d
      on d.catalog_id = target_catalog_id
     and d.day_bucket = c.day_bucket
  ),
  totals as (
    select
      coalesce(sum(page_views), 0) as page_views,
      coalesce(sum(product_clicks), 0) as product_clicks
    from daily
  ),
  distinct_active as (
    select count(distinct session_uuid)::integer as active_users
    from public.catalog_analytics_daily_sessions
    where catalog_id = target_catalog_id
      and day_bucket between current_date - ((select range_days from normalized) - 1) and current_date
  ),
  fresh_users as (
    select count(*)::integer as new_users
    from public.catalog_analytics_sessions
    where catalog_id = target_catalog_id
      and (first_seen_at at time zone 'utc')::date between current_date - ((select range_days from normalized) - 1) and current_date
  )
  select case
    when not (select allowed from authorized) then
      jsonb_build_object(
        'rangeDays', (select range_days from normalized),
        'totals', jsonb_build_object('pageViews', 0, 'activeUsers', 0, 'newUsers', 0, 'productClicks', 0),
        'daily', '[]'::jsonb
      )
    else
      jsonb_build_object(
        'rangeDays', (select range_days from normalized),
        'totals', jsonb_build_object(
          'pageViews', (select page_views from totals),
          'activeUsers', (select active_users from distinct_active),
          'newUsers', (select new_users from fresh_users),
          'productClicks', (select product_clicks from totals)
        ),
        'daily', (
          select jsonb_agg(jsonb_build_object(
            'day', to_char(day_bucket, 'YYYY-MM-DD'),
            'pageViews', page_views,
            'activeUsers', active_users,
            'newUsers', new_users,
            'productClicks', product_clicks
          ) order by day_bucket)
          from daily
        )
      )
  end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'coupons'
  ) then
    alter publication supabase_realtime add table public.coupons;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'catalogs'
  ) then
    alter publication supabase_realtime add table public.catalogs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_profiles'
  ) then
    alter publication supabase_realtime add table public.user_profiles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'catalog_analytics_daily'
  ) then
    alter publication supabase_realtime add table public.catalog_analytics_daily;
  end if;
end
$$;

-- ─── Team Members ────────────────────────────────────────────────────────────

create table if not exists public.catalog_team_members (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  permissions jsonb not null default '{
    "viewOrders": false,
    "manageOrders": false,
    "viewProducts": true,
    "manageProducts": false,
    "viewReviews": false,
    "manageReviews": false,
    "viewCoupons": false,
    "manageCoupons": false,
    "viewStats": true,
    "viewSettings": false
  }'::jsonb,
  status text not null default 'pending' check (status in ('active', 'pending', 'suspended')),
  invited_by uuid references public.user_profiles (uid) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (catalog_id, email)
);

-- RLS
alter table public.catalog_team_members enable row level security;

-- Only catalog owner can view their team members
drop policy if exists "owner_select_team" on public.catalog_team_members;
create policy "owner_select_team"
  on public.catalog_team_members for select
  using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and c.owner_uid = auth.uid()
    )
  );

-- Only catalog owner can insert
drop policy if exists "owner_insert_team" on public.catalog_team_members;
create policy "owner_insert_team"
  on public.catalog_team_members for insert
  with check (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and c.owner_uid = auth.uid()
    )
  );

-- Only catalog owner can update
drop policy if exists "owner_update_team" on public.catalog_team_members;
create policy "owner_update_team"
  on public.catalog_team_members for update
  using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and c.owner_uid = auth.uid()
    )
  );

-- Only catalog owner can delete
drop policy if exists "owner_delete_team" on public.catalog_team_members;
create policy "owner_delete_team"
  on public.catalog_team_members for delete
  using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and c.owner_uid = auth.uid()
    )
  );



-- ─── Referidos ───────────────────────────────────────────────────────────────

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_uid uuid not null references public.user_profiles (uid) on delete cascade,
  referred_uid uuid not null references public.user_profiles (uid) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rewarded')),
  reward_granted boolean not null default false,
  reward_meta jsonb null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (referrer_uid, referred_uid)
);

alter table public.referrals enable row level security;

create index if not exists idx_referrals_referrer on public.referrals (referrer_uid);
create index if not exists idx_referrals_referred on public.referrals (referred_uid);
create index if not exists idx_user_profiles_referral_code on public.user_profiles (referral_code);

-- Función pública para buscar UID de un referral_code (sin auth)
create or replace function public.get_uid_by_referral_code(code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select uid from public.user_profiles where referral_code = code limit 1;
$$;

-- Solo el referidor puede ver sus referidos
drop policy if exists "referrals_owner_select" on public.referrals;
create policy "referrals_owner_select"
  on public.referrals for select
  using (referrer_uid = auth.uid());

-- Solo inserción desde backend (service_role) o el propio usuario
drop policy if exists "referrals_public_insert" on public.referrals;
create policy "referrals_public_insert"
  on public.referrals for insert
  with check (true);

create index if not exists idx_products_active_visual
  on public.products (catalog_id, is_active, image_url)
  where is_active = true
    and image_url is not null
    and btrim(image_url) <> '';

create or replace function public.catalog_visual_url(settings jsonb)
returns text
language sql
immutable
as $$
  select nullif(
    coalesce(
      nullif(btrim(settings->>'coverImage'), ''),
      nullif(btrim(settings->>'logoUrl'), ''),
      nullif(btrim(settings->>'ogImageUrl'), '')
    ),
    ''
  );
$$;

create or replace function public.catalog_has_visual(settings jsonb)
returns boolean
language sql
immutable
as $$
  select public.catalog_visual_url(settings) is not null;
$$;

drop function if exists public.get_top_stores(integer);
create or replace function public.get_top_stores(limit_count integer default 12)
returns table (
  id uuid,
  slug text,
  business_name text,
  business_types jsonb,
  tagline text,
  city text,
  state_code text,
  logo_url text,
  cover_image text,
  rating_average numeric,
  rating_approved_count integer,
  recent_visits integer,
  active_products integer,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with catalog_pool as (
    select
      c.id,
      c.slug,
      c.rating_average,
      c.rating_approved_count,
      c.settings,
      coalesce(
        (
          select count(*)
          from public.products p
          where p.catalog_id = c.id
            and p.is_active = true
            and p.image_url is not null
            and btrim(p.image_url) <> ''
        ),
        0
      )::integer as active_products
    from public.catalogs c
    where c.status = 'published'
      and c.is_banned = false
      and public.catalog_has_visual(c.settings)
  ),
  visits as (
    select
      d.catalog_id,
      coalesce(sum(d.page_views + (d.product_clicks * 3)), 0)::integer as recent_visits
    from public.catalog_analytics_daily d
    where d.day_bucket >= current_date - 13
    group by d.catalog_id
  ),
  scored as (
    select
      cp.*,
      coalesce(v.recent_visits, 0) as recent_visits,
      (
        (
          ((cp.rating_average / 5.0) * greatest(cp.rating_approved_count, 0))
          + (4.2 * 10.0)
        )
        / nullif(greatest(cp.rating_approved_count, 0) + 10.0, 0)
      ) * 0.72
      + least(1.25, ln(coalesce(v.recent_visits, 0) + 1) / 4.8) * 0.28
      + least(cp.active_products, 24) / 120.0 as score
    from catalog_pool cp
    left join visits v on v.catalog_id = cp.id
    where cp.active_products > 0
  )
  select
    s.id,
    s.slug,
    coalesce(s.settings->>'businessName', 'Tienda') as business_name,
    case
      when jsonb_typeof(s.settings->'businessType') = 'array' then s.settings->'businessType'
      when nullif(btrim(s.settings->>'businessType'), '') is not null then jsonb_build_array(s.settings->>'businessType')
      else '[]'::jsonb
    end as business_types,
    coalesce(s.settings->>'tagline', '') as tagline,
    coalesce(s.settings->'address'->>'city', '') as city,
    coalesce(s.settings->'address'->>'stateCode', '') as state_code,
    coalesce(
      nullif(btrim(s.settings->>'logoUrl'), ''),
      public.catalog_visual_url(s.settings)
    ) as logo_url,
    public.catalog_visual_url(s.settings) as cover_image,
    round(s.rating_average::numeric, 2) as rating_average,
    s.rating_approved_count,
    s.recent_visits,
    s.active_products,
    round(s.score::numeric, 4) as score
  from scored s
  order by s.score desc, s.recent_visits desc, s.rating_average desc
  limit greatest(coalesce(limit_count, 12), 1);
$$;

drop function if exists public.search_marketplace_stores(text, integer);
create or replace function public.search_marketplace_stores(query_text text, limit_count integer default 12)
returns table (
  id uuid,
  slug text,
  business_name text,
  business_types jsonb,
  tagline text,
  city text,
  state_code text,
  logo_url text,
  cover_image text,
  rating_average numeric,
  rating_approved_count integer,
  recent_visits integer,
  active_products integer,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(query_text, '')), '') as q,
      plainto_tsquery('simple', nullif(btrim(coalesce(query_text, '')), '')) as tsq
  ),
  visits as (
    select
      catalog_id,
      coalesce(sum(page_views + product_clicks), 0)::integer as recent_visits
    from public.catalog_analytics_daily
    where day_bucket >= current_date - 20
    group by catalog_id
  ),
  active_products as (
    select
      p.catalog_id,
      count(*)::integer as active_products
    from public.products p
    where p.is_active = true
    group by p.catalog_id
  ),
  matched as (
    select
      c.id,
      c.slug,
      c.settings,
      c.rating_average,
      c.rating_approved_count,
      coalesce(v.recent_visits, 0) as recent_visits,
      coalesce(ap.active_products, 0) as active_products,
      greatest(
        ts_rank_cd(
          to_tsvector(
            'simple',
            concat_ws(
              ' ',
              coalesce(c.settings->>'businessName', ''),
              coalesce(c.settings->>'tagline', ''),
              coalesce(c.settings->'address'->>'city', ''),
              coalesce(c.settings->'address'->>'stateCode', ''),
              coalesce(c.settings->'address'->>'countryCode', ''),
              coalesce(c.settings->>'businessType', '')
            )
          ),
          (select tsq from normalized)
        ),
        coalesce((
          select max(ts_rank_cd(
            to_tsvector('simple', concat_ws(' ', coalesce(p.name, ''), coalesce(p.description, ''))),
            (select tsq from normalized)
          ))
          from public.products p
          where p.catalog_id = c.id
            and p.is_active = true
        ), 0)
      ) as search_rank
    from public.catalogs c
    left join visits v on v.catalog_id = c.id
    left join active_products ap on ap.catalog_id = c.id
    where c.status = 'published'
      and c.is_banned = false
      and public.catalog_has_visual(c.settings)
      and (
        (select q from normalized) is not null
        and (
          to_tsvector(
            'simple',
            concat_ws(
              ' ',
              coalesce(c.settings->>'businessName', ''),
              coalesce(c.settings->>'tagline', ''),
              coalesce(c.settings->'address'->>'city', ''),
              coalesce(c.settings->'address'->>'stateCode', ''),
              coalesce(c.settings->'address'->>'countryCode', ''),
              coalesce(c.settings->>'businessType', '')
            )
          ) @@ (select tsq from normalized)
          or exists (
            select 1
            from public.products p
            where p.catalog_id = c.id
              and p.is_active = true
              and to_tsvector('simple', concat_ws(' ', coalesce(p.name, ''), coalesce(p.description, ''))) @@ (select tsq from normalized)
          )
          or lower(coalesce(c.settings->>'businessName', '')) like '%' || lower((select q from normalized)) || '%'
          or lower(coalesce(c.settings->'address'->>'city', '')) like '%' || lower((select q from normalized)) || '%'
        )
      )
  )
  select
    m.id,
    m.slug,
    coalesce(m.settings->>'businessName', 'Tienda') as business_name,
    case
      when jsonb_typeof(m.settings->'businessType') = 'array' then m.settings->'businessType'
      when nullif(btrim(m.settings->>'businessType'), '') is not null then jsonb_build_array(m.settings->>'businessType')
      else '[]'::jsonb
    end as business_types,
    coalesce(m.settings->>'tagline', '') as tagline,
    coalesce(m.settings->'address'->>'city', '') as city,
    coalesce(m.settings->'address'->>'stateCode', '') as state_code,
    coalesce(nullif(btrim(m.settings->>'logoUrl'), ''), public.catalog_visual_url(m.settings)) as logo_url,
    public.catalog_visual_url(m.settings) as cover_image,
    round(m.rating_average::numeric, 2) as rating_average,
    m.rating_approved_count,
    m.recent_visits,
    m.active_products,
    round((m.search_rank * 12 + least(m.recent_visits, 3000) / 90.0 + least(m.active_products, 60) / 8.0 + m.rating_average)::numeric, 4) as score
  from matched m
  where m.active_products > 0
  order by score desc, recent_visits desc, rating_average desc
  limit greatest(coalesce(limit_count, 12), 1);
$$;

drop function if exists public.get_viral_products(integer);
create or replace function public.get_viral_products(limit_count integer default 12)
returns table (
  catalog_id uuid,
  catalog_slug text,
  product_id text,
  product_name text,
  description text,
  image_url text,
  price numeric,
  promo_price numeric,
  order_count integer,
  rating numeric,
  tags jsonb,
  business_name text,
  business_type text,
  logo_url text,
  city text,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with order_lines as (
    select
      o.catalog_id,
      item->>'productId' as product_id,
      sum(greatest(coalesce((item->>'qty')::integer, 0), 0))::integer as order_count
    from public.orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as item
    where o.status in ('new', 'preparing', 'completed', 'viewed', 'closed')
      and item->>'productId' is not null
      and btrim(item->>'productId') <> ''
    group by o.catalog_id, item->>'productId'
  ),
  recent_clicks as (
    select
      e.catalog_id,
      e.product_id,
      count(*)::integer as click_count
    from public.catalog_analytics_events e
    where e.event_type = 'product_click'
      and e.created_at >= timezone('utc', now()) - interval '21 days'
      and e.product_id is not null
    group by e.catalog_id, e.product_id
  )
  select
    p.catalog_id,
    c.slug as catalog_slug,
    p.id as product_id,
    p.name as product_name,
    coalesce(p.description, '') as description,
    p.image_url,
    p.base_price as price,
    p.promo_price,
    coalesce(ol.order_count, 0) as order_count,
    round(coalesce(p.product_rating, 0)::numeric, 2) as rating,
    coalesce(p.tags, '[]'::jsonb) as tags,
    coalesce(c.settings->>'businessName', 'Tienda') as business_name,
    coalesce(
      case
        when jsonb_typeof(c.settings->'businessType') = 'array' then c.settings->'businessType'->>0
        else c.settings->>'businessType'
      end,
      ''
    ) as business_type,
    coalesce(
      nullif(btrim(c.settings->>'logoUrl'), ''),
      public.catalog_visual_url(c.settings)
    ) as logo_url,
    coalesce(c.settings->'address'->>'city', '') as city,
    round((
      coalesce(ol.order_count, 0) * 0.68
      + coalesce(rc.click_count, 0) * 0.16
      + coalesce(p.product_rating, 0) * 4
      + coalesce(p.reviews_approved_count, 0) * 0.35
    )::numeric, 4) as score
  from public.products p
  join public.catalogs c on c.id = p.catalog_id
  left join order_lines ol on ol.catalog_id = p.catalog_id and ol.product_id = p.id
  left join recent_clicks rc on rc.catalog_id = p.catalog_id and rc.product_id = p.id
  where c.status = 'published'
    and c.is_banned = false
    and public.catalog_has_visual(c.settings)
    and p.is_active = true
    and p.image_url is not null
    and btrim(p.image_url) <> ''
  order by score desc, order_count desc, rating desc
  limit greatest(coalesce(limit_count, 12), 1);
$$;

create or replace function public.get_hubs_by_region()
returns table (
  region_key text,
  region_label text,
  city text,
  state_code text,
  country_code text,
  store_count integer,
  active_products integer,
  recent_visits integer,
  sample_image_url text,
  sample_store_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  with qualified_catalogs as (
    select
      c.id,
      c.slug,
      c.settings,
      public.catalog_visual_url(c.settings) as sample_image_url,
      coalesce(
        (
          select count(*)
          from public.products p
          where p.catalog_id = c.id
            and p.is_active = true
            and p.image_url is not null
            and btrim(p.image_url) <> ''
        ),
        0
      )::integer as active_products
    from public.catalogs c
    where c.status = 'published'
      and c.is_banned = false
      and public.catalog_has_visual(c.settings)
  ),
  visits as (
    select
      catalog_id,
      coalesce(sum(page_views + product_clicks), 0)::integer as recent_visits
    from public.catalog_analytics_daily
    where day_bucket >= current_date - 20
    group by catalog_id
  ),
  ranked as (
    select
      lower(
        concat_ws(
          '|',
          coalesce(nullif(btrim(qc.settings->'address'->>'countryCode'), ''), 'xx'),
          coalesce(nullif(btrim(qc.settings->'address'->>'stateCode'), ''), 'na'),
          coalesce(nullif(btrim(qc.settings->'address'->>'city'), ''), 'sin-ciudad')
        )
      ) as region_key,
      initcap(coalesce(nullif(btrim(qc.settings->'address'->>'city'), ''), 'Sin ciudad')) as city,
      upper(coalesce(nullif(btrim(qc.settings->'address'->>'stateCode'), ''), 'NA')) as state_code,
      upper(coalesce(nullif(btrim(qc.settings->'address'->>'countryCode'), ''), 'XX')) as country_code,
      qc.slug,
      qc.sample_image_url,
      qc.active_products,
      coalesce(v.recent_visits, 0) as recent_visits,
      row_number() over (
        partition by lower(
          concat_ws(
            '|',
            coalesce(nullif(btrim(qc.settings->'address'->>'countryCode'), ''), 'xx'),
            coalesce(nullif(btrim(qc.settings->'address'->>'stateCode'), ''), 'na'),
            coalesce(nullif(btrim(qc.settings->'address'->>'city'), ''), 'sin-ciudad')
          )
        )
        order by coalesce(v.recent_visits, 0) desc, qc.active_products desc, qc.slug
      ) as hero_rank
    from qualified_catalogs qc
    left join visits v on v.catalog_id = qc.id
    where qc.active_products > 0
  )
  select
    r.region_key,
    concat_ws(', ', r.city, nullif(r.state_code, 'NA')) as region_label,
    r.city,
    r.state_code,
    r.country_code,
    count(*)::integer as store_count,
    sum(r.active_products)::integer as active_products,
    sum(r.recent_visits)::integer as recent_visits,
    max(r.sample_image_url) filter (where r.hero_rank = 1) as sample_image_url,
    max(r.slug) filter (where r.hero_rank = 1) as sample_store_slug
  from ranked r
  group by r.region_key, r.city, r.state_code, r.country_code
  order by recent_visits desc, store_count desc, active_products desc;
$$;

create or replace function public.search_marketplace_hubs(query_text text, limit_count integer default 12)
returns table (
  region_key text,
  region_label text,
  city text,
  state_code text,
  country_code text,
  store_count integer,
  active_products integer,
  recent_visits integer,
  sample_image_url text,
  sample_store_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(lower(btrim(coalesce(query_text, ''))), '') as q
  ),
  source_hubs as (
    select *
    from public.get_hubs_by_region()
  )
  select
    h.region_key,
    h.region_label,
    h.city,
    h.state_code,
    h.country_code,
    h.store_count,
    h.active_products,
    h.recent_visits,
    h.sample_image_url,
    h.sample_store_slug
  from source_hubs h
  where (select q from normalized) is not null
    and (
      lower(coalesce(h.region_label, '')) like '%' || (select q from normalized) || '%'
      or lower(coalesce(h.city, '')) like '%' || (select q from normalized) || '%'
      or lower(coalesce(h.state_code, '')) like '%' || (select q from normalized) || '%'
      or lower(coalesce(h.country_code, '')) like '%' || (select q from normalized) || '%'
    )
  order by h.recent_visits desc, h.store_count desc, h.active_products desc
  limit greatest(coalesce(limit_count, 12), 1);
$$;

drop function if exists public.get_personalized_feed(jsonb, integer);
create or replace function public.get_personalized_feed(user_tags jsonb default '[]'::jsonb, limit_count integer default 18)
returns table (
  catalog_id uuid,
  slug text,
  product_id text,
  business_name text,
  business_types jsonb,
  tagline text,
  city text,
  state_code text,
  logo_url text,
  cover_image text,
  product_name text,
  product_description text,
  product_image_url text,
  price numeric,
  promo_price numeric,
  rating_average numeric,
  product_rating numeric,
  recent_visits integer,
  order_count integer,
  relevance_score numeric,
  matched_tags jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized_tags as (
    select distinct lower(value #>> '{}') as tag
    from jsonb_array_elements(coalesce(user_tags, '[]'::jsonb)) value
    where jsonb_typeof(value) in ('string')
      and nullif(btrim(value #>> '{}'), '') is not null
  ),
  order_lines as (
    select
      o.catalog_id,
      item->>'productId' as product_id,
      sum(greatest(coalesce((item->>'qty')::integer, 0), 0))::integer as order_count
    from public.orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as item
    where o.status in ('new', 'preparing', 'completed', 'viewed', 'closed')
      and item->>'productId' is not null
      and btrim(item->>'productId') <> ''
    group by o.catalog_id, item->>'productId'
  ),
  visits as (
    select
      catalog_id,
      coalesce(sum(page_views + product_clicks * 2), 0)::integer as recent_visits
    from public.catalog_analytics_daily
    where day_bucket >= current_date - 20
    group by catalog_id
  ),
  candidate_pool as (
    select
      c.id as catalog_id,
      c.slug,
      c.settings,
      c.rating_average,
      p.id as product_id,
      p.name as product_name,
      coalesce(p.description, '') as product_description,
      p.image_url as product_image_url,
      p.base_price as price,
      p.promo_price,
      p.product_rating,
      coalesce(p.tags, '[]'::jsonb) as tags,
      coalesce(ol.order_count, 0) as order_count,
      coalesce(v.recent_visits, 0) as recent_visits
    from public.catalogs c
    join public.products p on p.catalog_id = c.id
    left join order_lines ol on ol.catalog_id = p.catalog_id and ol.product_id = p.id
    left join visits v on v.catalog_id = c.id
    where c.status = 'published'
      and c.is_banned = false
      and public.catalog_has_visual(c.settings)
      and p.is_active = true
      and p.image_url is not null
      and btrim(p.image_url) <> ''
  ),
  scored as (
    select
      cp.*,
      coalesce(
        (
          select jsonb_agg(tag)
          from (
            select distinct nt.tag as tag
            from normalized_tags nt
            where exists (
              select 1
              from jsonb_array_elements_text(cp.tags) tag_value
              where lower(tag_value) = nt.tag
            )
               or lower(coalesce(cp.settings->>'businessName', '')) like '%' || nt.tag || '%'
               or lower(coalesce(cp.settings->>'tagline', '')) like '%' || nt.tag || '%'
               or lower(coalesce(cp.settings->'address'->>'city', '')) like '%' || nt.tag || '%'
               or lower(coalesce(cp.product_name, '')) like '%' || nt.tag || '%'
          ) matched
        ),
        '[]'::jsonb
      ) as matched_tags
    from candidate_pool cp
  )
  select
    s.catalog_id,
    s.slug,
    s.product_id,
    coalesce(s.settings->>'businessName', 'Tienda') as business_name,
    case
      when jsonb_typeof(s.settings->'businessType') = 'array' then s.settings->'businessType'
      when nullif(btrim(s.settings->>'businessType'), '') is not null then jsonb_build_array(s.settings->>'businessType')
      else '[]'::jsonb
    end as business_types,
    coalesce(s.settings->>'tagline', '') as tagline,
    coalesce(s.settings->'address'->>'city', '') as city,
    coalesce(s.settings->'address'->>'stateCode', '') as state_code,
    coalesce(
      nullif(btrim(s.settings->>'logoUrl'), ''),
      public.catalog_visual_url(s.settings)
    ) as logo_url,
    public.catalog_visual_url(s.settings) as cover_image,
    s.product_name,
    s.product_description,
    s.product_image_url,
    s.price,
    s.promo_price,
    round(coalesce(s.rating_average, 0)::numeric, 2) as rating_average,
    round(coalesce(s.product_rating, 0)::numeric, 2) as product_rating,
    s.recent_visits,
    s.order_count,
    round((
      coalesce(jsonb_array_length(s.matched_tags), 0) * 12
      + least(s.order_count, 40) * 0.9
      + least(s.recent_visits, 3000) / 55.0
      + coalesce(s.product_rating, 0) * 2.4
      + coalesce(s.rating_average, 0) * 1.8
    )::numeric, 4) as relevance_score,
    s.matched_tags
  from scored s
  order by relevance_score desc, recent_visits desc, order_count desc
  limit greatest(coalesce(limit_count, 18), 1);
$$;

create or replace function public.search_marketplace_feed(query_text text, limit_count integer default 18)
returns table (
  catalog_id uuid,
  slug text,
  product_id text,
  business_name text,
  business_types jsonb,
  tagline text,
  city text,
  state_code text,
  logo_url text,
  cover_image text,
  product_name text,
  product_description text,
  product_image_url text,
  price numeric,
  promo_price numeric,
  rating_average numeric,
  product_rating numeric,
  recent_visits integer,
  order_count integer,
  relevance_score numeric,
  matched_tags jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(query_text, '')), '') as q,
      plainto_tsquery('simple', nullif(btrim(coalesce(query_text, '')), '')) as tsq
  ),
  order_lines as (
    select
      o.catalog_id,
      item->>'productId' as product_id,
      sum(greatest(coalesce((item->>'qty')::integer, 0), 0))::integer as order_count
    from public.orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as item
    where o.status in ('new', 'preparing', 'completed', 'viewed', 'closed')
      and item->>'productId' is not null
      and btrim(item->>'productId') <> ''
    group by o.catalog_id, item->>'productId'
  ),
  visits as (
    select
      catalog_id,
      coalesce(sum(page_views + product_clicks * 2), 0)::integer as recent_visits
    from public.catalog_analytics_daily
    where day_bucket >= current_date - 20
    group by catalog_id
  ),
  candidate_pool as (
    select
      c.id as catalog_id,
      c.slug,
      c.settings,
      c.rating_average,
      p.id as product_id,
      p.name as product_name,
      coalesce(p.description, '') as product_description,
      p.image_url as product_image_url,
      p.base_price as price,
      p.promo_price,
      p.product_rating,
      coalesce(p.tags, '[]'::jsonb) as tags,
      coalesce(ol.order_count, 0) as order_count,
      coalesce(v.recent_visits, 0) as recent_visits,
      ts_rank_cd(
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            coalesce(c.settings->>'businessName', ''),
            coalesce(c.settings->>'tagline', ''),
            coalesce(c.settings->'address'->>'city', ''),
            coalesce(c.settings->'address'->>'stateCode', ''),
            coalesce(p.name, ''),
            coalesce(p.description, '')
          )
        ),
        (select tsq from normalized)
      ) as search_rank
    from public.catalogs c
    join public.products p on p.catalog_id = c.id
    left join order_lines ol on ol.catalog_id = p.catalog_id and ol.product_id = p.id
    left join visits v on v.catalog_id = c.id
    where c.status = 'published'
      and c.is_banned = false
      and public.catalog_has_visual(c.settings)
      and p.is_active = true
      and p.image_url is not null
      and btrim(p.image_url) <> ''
      and (
        (select q from normalized) is not null
        and (
          to_tsvector(
            'simple',
            concat_ws(
              ' ',
              coalesce(c.settings->>'businessName', ''),
              coalesce(c.settings->>'tagline', ''),
              coalesce(c.settings->'address'->>'city', ''),
              coalesce(c.settings->'address'->>'stateCode', ''),
              coalesce(p.name, ''),
              coalesce(p.description, '')
            )
          ) @@ (select tsq from normalized)
          or lower(coalesce(c.settings->>'businessName', '')) like '%' || lower((select q from normalized)) || '%'
          or lower(coalesce(c.settings->'address'->>'city', '')) like '%' || lower((select q from normalized)) || '%'
          or exists (
            select 1
            from jsonb_array_elements_text(coalesce(p.tags, '[]'::jsonb)) tag_value
            where lower(tag_value) like '%' || lower((select q from normalized)) || '%'
          )
        )
      )
  ),
  scored as (
    select
      cp.*,
      coalesce(
        (
          select jsonb_agg(tag)
          from (
            select distinct lower(tag_value) as tag
            from jsonb_array_elements_text(cp.tags) tag_value
            where lower(tag_value) like '%' || lower((select q from normalized)) || '%'
          ) matched
        ),
        '[]'::jsonb
      ) as matched_tags
    from candidate_pool cp
  )
  select
    s.catalog_id,
    s.slug,
    s.product_id,
    coalesce(s.settings->>'businessName', 'Tienda') as business_name,
    case
      when jsonb_typeof(s.settings->'businessType') = 'array' then s.settings->'businessType'
      when nullif(btrim(s.settings->>'businessType'), '') is not null then jsonb_build_array(s.settings->>'businessType')
      else '[]'::jsonb
    end as business_types,
    coalesce(s.settings->>'tagline', '') as tagline,
    coalesce(s.settings->'address'->>'city', '') as city,
    coalesce(s.settings->'address'->>'stateCode', '') as state_code,
    coalesce(nullif(btrim(s.settings->>'logoUrl'), ''), public.catalog_visual_url(s.settings)) as logo_url,
    public.catalog_visual_url(s.settings) as cover_image,
    s.product_name,
    s.product_description,
    s.product_image_url,
    s.price,
    s.promo_price,
    round(coalesce(s.rating_average, 0)::numeric, 2) as rating_average,
    round(coalesce(s.product_rating, 0)::numeric, 2) as product_rating,
    s.recent_visits,
    s.order_count,
    round((
      s.search_rank * 18
      + least(s.order_count, 40) * 0.9
      + least(s.recent_visits, 3000) / 55.0
      + coalesce(s.product_rating, 0) * 2.4
      + coalesce(s.rating_average, 0) * 1.8
    )::numeric, 4) as relevance_score,
    s.matched_tags
  from scored s
  order by relevance_score desc, recent_visits desc, order_count desc
  limit greatest(coalesce(limit_count, 18), 1);
$$;

drop function if exists public.get_marketplace_landing_payload(text, jsonb, integer, integer, integer, integer);
create or replace function public.get_marketplace_landing_payload(
  query_text text default null,
  user_tags jsonb default '[]'::jsonb,
  stores_limit integer default 10,
  products_limit integer default 8,
  hubs_limit integer default 12,
  feed_limit integer default 18
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(query_text, '')), '') as q,
      case
        when jsonb_typeof(coalesce(user_tags, '[]'::jsonb)) = 'array' then coalesce(user_tags, '[]'::jsonb)
        else '[]'::jsonb
      end as tags_json
  ),
  tags_array as (
    select
      coalesce(
        array(
          select distinct lower(btrim(tag_value))
          from jsonb_array_elements_text((select tags_json from normalized)) tag_value
          where btrim(tag_value) <> ''
          limit 18
        ),
        array[]::text[]
      ) as tags
  )
  select jsonb_build_object(
    'topStores',
    coalesce(
      case
        when (select q from normalized) is not null then (
          select jsonb_agg(to_jsonb(store_row))
          from public.search_marketplace_stores((select q from normalized), greatest(coalesce(stores_limit, 10), 1)) store_row
        )
        else (
          select jsonb_agg(to_jsonb(store_row))
          from public.get_top_stores(greatest(coalesce(stores_limit, 10), 1)) store_row
        )
      end,
      '[]'::jsonb
    ),
    'viralProducts',
    coalesce(
      case
        when (select q from normalized) is not null then (
          select jsonb_agg(to_jsonb(product_row))
          from public.search_marketplace_feed((select q from normalized), greatest(coalesce(products_limit, 8), 1)) product_row
        )
        else (
          select jsonb_agg(to_jsonb(product_row))
          from public.get_viral_products(greatest(coalesce(products_limit, 8), 1)) product_row
        )
      end,
      '[]'::jsonb
    ),
    'hubs',
    coalesce(
      case
        when (select q from normalized) is not null then (
          select jsonb_agg(to_jsonb(hub_row))
          from public.search_marketplace_hubs((select q from normalized), greatest(coalesce(hubs_limit, 12), 1)) hub_row
        )
        else (
          select jsonb_agg(to_jsonb(hub_row))
          from (
            select *
            from public.get_hubs_by_region()
            limit greatest(coalesce(hubs_limit, 12), 1)
          ) hub_row
        )
      end,
      '[]'::jsonb
    ),
    'forYou',
    coalesce(
      case
        when (select q from normalized) is not null then (
          select jsonb_agg(to_jsonb(feed_row))
          from public.search_marketplace_feed((select q from normalized), greatest(coalesce(feed_limit, 18), 1)) feed_row
        )
        else (
          select jsonb_agg(to_jsonb(feed_row))
          from public.get_personalized_feed(to_jsonb((select tags from tags_array)), greatest(coalesce(feed_limit, 18), 1)) feed_row
        )
      end,
      '[]'::jsonb
    )
  );
$$;

drop function if exists public.get_public_storefront_payload(text);
create or replace function public.get_public_storefront_payload(slug_text text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target_catalog as (
    select *
    from public.catalogs c
    where lower(c.slug) = lower(btrim(coalesce(slug_text, '')))
      and c.status = 'published'
      and c.is_banned = false
    limit 1
  )
  select
    case
      when not exists (select 1 from target_catalog) then null
      else jsonb_build_object(
        'catalog',
        (select to_jsonb(c) from target_catalog c),
        'categories',
        coalesce(
          (
            select jsonb_agg(to_jsonb(cat) order by cat.sort_order)
            from public.categories cat
            where cat.catalog_id = (select id from target_catalog)
              and cat.is_active = true
          ),
          '[]'::jsonb
        ),
        'products',
        coalesce(
          (
            select jsonb_agg(to_jsonb(p) order by p.sort_order)
            from public.products p
            where p.catalog_id = (select id from target_catalog)
              and p.is_active = true
          ),
          '[]'::jsonb
        ),
        'reviews',
        coalesce(
          (
            select jsonb_agg(to_jsonb(r) order by r.created_at desc)
            from public.reviews r
            where r.catalog_id = (select id from target_catalog)
              and r.approved = true
          ),
          '[]'::jsonb
        ),
        'coupons',
        coalesce(
          (
            select jsonb_agg(to_jsonb(co) order by co.created_at desc)
            from public.coupons co
            where co.catalog_id = (select id from target_catalog)
              and co.visible_publicly = true
              and co.is_active = true
          ),
          '[]'::jsonb
        )
      )
    end;
$$;

drop function if exists public.get_catalog_editor_payload(uuid);
create or replace function public.get_catalog_editor_payload(target_catalog_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when not public.is_catalog_owner(target_catalog_id) then null
      else jsonb_build_object(
        'categories',
        coalesce(
          (
            select jsonb_agg(to_jsonb(cat) order by cat.sort_order)
            from public.categories cat
            where cat.catalog_id = target_catalog_id
          ),
          '[]'::jsonb
        ),
        'products',
        coalesce(
          (
            select jsonb_agg(to_jsonb(p) order by p.sort_order)
            from public.products p
            where p.catalog_id = target_catalog_id
          ),
          '[]'::jsonb
        )
      )
    end;
$$;

drop function if exists public.get_admin_bootstrap();
create or replace function public.get_admin_bootstrap()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select
      up.uid,
      up.email,
      up.default_catalog_id
    from public.user_profiles up
    where up.uid = auth.uid()
    limit 1
  ),
  owned_catalogs as (
    select
      c.id,
      c.slug,
      c.owner_uid,
      c.status,
      c.plan_tier,
      c.is_banned,
      c.created_at,
      c.rating_average,
      c.rating_approved_count,
      c.theme,
      c.settings,
      true as is_owner,
      'admin'::text as role,
      jsonb_build_object(
        'viewOrders', true,
        'manageOrders', true,
        'viewProducts', true,
        'manageProducts', true,
        'viewReviews', true,
        'manageReviews', true,
        'viewCoupons', true,
        'manageCoupons', true,
        'viewStats', true,
        'viewSettings', true
      ) as permissions
    from public.catalogs c
    where c.owner_uid = auth.uid()
  ),
  team_catalogs as (
    select
      c.id,
      c.slug,
      c.owner_uid,
      c.status,
      c.plan_tier,
      c.is_banned,
      c.created_at,
      c.rating_average,
      c.rating_approved_count,
      c.theme,
      c.settings,
      false as is_owner,
      tm.role,
      coalesce(tm.permissions, '{}'::jsonb) as permissions
    from public.catalog_team_members tm
    join public.catalogs c on c.id = tm.catalog_id
    where tm.status = 'active'
      and lower(tm.email) = lower(coalesce((select email from me), auth.email(), ''))
      and not exists (
        select 1
        from owned_catalogs oc
        where oc.id = c.id
      )
  ),
  scoped_catalogs as (
    select * from owned_catalogs
    union all
    select * from team_catalogs
  ),
  ordered_catalogs as (
    select
      sc.*,
      row_number() over (order by sc.is_owner desc, sc.created_at desc, sc.id) as sort_index
    from scoped_catalogs sc
  ),
  resolved_active as (
    select
      coalesce(
        (
          select m.default_catalog_id
          from me m
          where m.default_catalog_id is not null
            and exists (
              select 1
              from ordered_catalogs oc
              where oc.id = m.default_catalog_id
            )
        ),
        (
          select oc.id
          from ordered_catalogs oc
          order by oc.sort_index
          limit 1
        )
      ) as active_catalog_id
  )
  select jsonb_build_object(
    'catalogs',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oc.id,
            'slug', oc.slug,
            'owner_uid', oc.owner_uid,
            'status', oc.status,
            'plan_tier', oc.plan_tier,
            'is_banned', oc.is_banned,
            'created_at', oc.created_at,
            'rating_average', oc.rating_average,
            'rating_approved_count', oc.rating_approved_count,
            'theme', oc.theme,
            'settings', oc.settings
          )
          order by oc.sort_index
        )
        from ordered_catalogs oc
      ),
      '[]'::jsonb
    ),
    'access',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'catalogId', oc.id,
            'isOwner', oc.is_owner,
            'role', oc.role,
            'permissions', oc.permissions
          )
          order by oc.sort_index
        )
        from ordered_catalogs oc
      ),
      '[]'::jsonb
    ),
    'activeCatalogId',
    (select active_catalog_id from resolved_active)
  );
$$;

drop function if exists public.get_orders_page(uuid, text, timestamptz, integer);
create or replace function public.get_orders_page(
  target_catalog_id uuid,
  status_filter text default null,
  before_created_at timestamptz default null,
  limit_count integer default 50
)
returns table (
  catalog_id uuid,
  id text,
  channel text,
  status text,
  customer_name text,
  customer_address text,
  payment_method text,
  delivery_mode text,
  delivery_zone_id text,
  delivery_zone_name text,
  notes text,
  items jsonb,
  subtotal numeric,
  discount_total numeric,
  delivery_fee numeric,
  applied_coupon jsonb,
  total numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.catalog_id,
    o.id,
    o.channel,
    o.status,
    o.customer_name,
    o.customer_address,
    o.payment_method,
    o.delivery_mode,
    o.delivery_zone_id,
    o.delivery_zone_name,
    o.notes,
    o.items,
    o.subtotal,
    o.discount_total,
    o.delivery_fee,
    o.applied_coupon,
    o.total,
    o.created_at
  from public.orders o
  where o.catalog_id = target_catalog_id
    and public.is_catalog_owner(target_catalog_id)
    and (
      status_filter is null
      or status_filter = ''
      or (status_filter = 'preparing' and o.status in ('preparing', 'viewed'))
      or (status_filter = 'completed' and o.status in ('completed', 'closed'))
      or (status_filter not in ('preparing', 'completed') and o.status = status_filter)
    )
    and (before_created_at is null or o.created_at < before_created_at)
  order by o.created_at desc
  limit least(greatest(coalesce(limit_count, 50), 1), 100);
$$;

drop function if exists public.get_orders_stats(uuid);
create or replace function public.get_orders_stats(target_catalog_id uuid)
returns table (
  total_count bigint,
  new_count bigint,
  preparing_count bigint,
  completed_count bigint,
  cancelled_count bigint,
  month_sales numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped_orders as (
    select *
    from public.orders o
    where o.catalog_id = target_catalog_id
      and public.is_catalog_owner(target_catalog_id)
  )
  select
    count(*) as total_count,
    count(*) filter (where status = 'new') as new_count,
    count(*) filter (where status in ('preparing', 'viewed')) as preparing_count,
    count(*) filter (where status in ('completed', 'closed')) as completed_count,
    count(*) filter (where status = 'cancelled') as cancelled_count,
    coalesce(
      sum(total) filter (
        where status <> 'cancelled'
          and created_at >= date_trunc('month', timezone('utc', now()))
      ),
      0
    ) as month_sales
  from scoped_orders;
$$;

drop function if exists public.get_reviews_page(uuid, boolean, timestamptz, integer);
create or replace function public.get_reviews_page(
  target_catalog_id uuid,
  approved_filter boolean default null,
  before_created_at timestamptz default null,
  limit_count integer default 50
)
returns table (
  catalog_id uuid,
  id text,
  product_id text,
  product_name text,
  customer_name text,
  comment text,
  rating integer,
  approved boolean,
  admin_reply jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.catalog_id,
    r.id,
    r.product_id,
    r.product_name,
    r.customer_name,
    r.comment,
    r.rating,
    r.approved,
    r.admin_reply,
    r.created_at
  from public.reviews r
  where r.catalog_id = target_catalog_id
    and public.is_catalog_owner(target_catalog_id)
    and (approved_filter is null or r.approved = approved_filter)
    and (before_created_at is null or r.created_at < before_created_at)
  order by r.created_at desc
  limit least(greatest(coalesce(limit_count, 50), 1), 100);
$$;

drop function if exists public.get_reviews_stats(uuid);
create or replace function public.get_reviews_stats(target_catalog_id uuid)
returns table (
  pending_count bigint,
  approved_count bigint,
  average_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where approved = false) as pending_count,
    count(*) filter (where approved = true) as approved_count,
    coalesce(avg(rating) filter (where approved = true), 0) as average_rating
  from public.reviews r
  where r.catalog_id = target_catalog_id
    and public.is_catalog_owner(target_catalog_id);
$$;

create or replace function public.has_catalog_role(target_catalog uuid, allowed_roles text[] default array['admin'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_catalog_owner(target_catalog) or exists (
    select 1
    from public.catalog_team_members member
    where member.catalog_id = target_catalog
      and member.status = 'active'
      and lower(member.email) = lower(coalesce(auth.email(), ''))
      and member.role = any(coalesce(allowed_roles, array['admin']))
  );
$$;

create or replace function public.has_catalog_permission(target_catalog uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_catalog_owner(target_catalog) or exists (
    select 1
    from public.catalog_team_members member
    where member.catalog_id = target_catalog
      and member.status = 'active'
      and lower(member.email) = lower(coalesce(auth.email(), ''))
      and (
        member.role = 'admin'
        or coalesce((member.permissions ->> permission_key)::boolean, false) = true
      )
  );
$$;

drop function if exists public.check_slug_availability(text, uuid);
create or replace function public.check_slug_availability(slug_text text, exclude_catalog_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select lower(btrim(coalesce(slug_text, ''))) as slug
  )
  select jsonb_build_object(
    'available',
    case
      when (select slug from normalized) = '' then false
      else not exists (
        select 1
        from public.catalogs c
        where lower(c.slug) = (select slug from normalized)
          and (exclude_catalog_id is null or c.id <> exclude_catalog_id)
      )
    end,
    'slug',
    (select slug from normalized)
  );
$$;

drop policy if exists "catalogs_team_read" on public.catalogs;
create policy "catalogs_team_read"
on public.catalogs
for select
using (public.has_catalog_role(id, array['admin', 'editor', 'viewer']));

drop policy if exists "catalogs_team_update_settings" on public.catalogs;
create policy "catalogs_team_update_settings"
on public.catalogs
for update
using (public.has_catalog_permission(id, 'viewSettings'))
with check (public.has_catalog_permission(id, 'viewSettings'));

drop policy if exists "categories_team_read" on public.categories;
create policy "categories_team_read"
on public.categories
for select
using (public.has_catalog_permission(catalog_id, 'viewProducts'));

drop policy if exists "categories_team_write" on public.categories;
create policy "categories_team_write"
on public.categories
for all
using (public.has_catalog_permission(catalog_id, 'manageProducts'))
with check (public.has_catalog_permission(catalog_id, 'manageProducts'));

drop policy if exists "products_team_read" on public.products;
create policy "products_team_read"
on public.products
for select
using (public.has_catalog_permission(catalog_id, 'viewProducts'));

drop policy if exists "products_team_write" on public.products;
create policy "products_team_write"
on public.products
for all
using (public.has_catalog_permission(catalog_id, 'manageProducts'))
with check (public.has_catalog_permission(catalog_id, 'manageProducts'));

drop policy if exists "orders_team_read" on public.orders;
create policy "orders_team_read"
on public.orders
for select
using (public.has_catalog_permission(catalog_id, 'viewOrders'));

drop policy if exists "orders_team_write" on public.orders;
create policy "orders_team_write"
on public.orders
for update
using (public.has_catalog_permission(catalog_id, 'manageOrders'))
with check (public.has_catalog_permission(catalog_id, 'manageOrders'));

drop policy if exists "reviews_team_read" on public.reviews;
create policy "reviews_team_read"
on public.reviews
for select
using (public.has_catalog_permission(catalog_id, 'viewReviews'));

drop policy if exists "reviews_team_write" on public.reviews;
create policy "reviews_team_write"
on public.reviews
for update
using (public.has_catalog_permission(catalog_id, 'manageReviews'))
with check (public.has_catalog_permission(catalog_id, 'manageReviews'));

drop policy if exists "reviews_team_delete" on public.reviews;
create policy "reviews_team_delete"
on public.reviews
for delete
using (public.has_catalog_permission(catalog_id, 'manageReviews'));

drop policy if exists "coupons_team_read" on public.coupons;
create policy "coupons_team_read"
on public.coupons
for select
using (public.has_catalog_permission(catalog_id, 'viewCoupons'));

drop policy if exists "coupons_team_write" on public.coupons;
create policy "coupons_team_write"
on public.coupons
for all
using (public.has_catalog_permission(catalog_id, 'manageCoupons'))
with check (public.has_catalog_permission(catalog_id, 'manageCoupons'));

drop policy if exists "analytics_daily_team_read" on public.catalog_analytics_daily;
create policy "analytics_daily_team_read"
on public.catalog_analytics_daily
for select
using (public.has_catalog_permission(catalog_id, 'viewStats'));

drop policy if exists "analytics_daily_sessions_team_read" on public.catalog_analytics_daily_sessions;
create policy "analytics_daily_sessions_team_read"
on public.catalog_analytics_daily_sessions
for select
using (public.has_catalog_permission(catalog_id, 'viewStats'));

drop policy if exists "analytics_events_team_read" on public.catalog_analytics_events;
create policy "analytics_events_team_read"
on public.catalog_analytics_events
for select
using (public.has_catalog_permission(catalog_id, 'viewStats'));

drop policy if exists "analytics_sessions_team_read" on public.catalog_analytics_sessions;
create policy "analytics_sessions_team_read"
on public.catalog_analytics_sessions
for select
using (public.has_catalog_permission(catalog_id, 'viewStats'));

drop policy if exists "team_admin_select" on public.catalog_team_members;
create policy "team_admin_select"
on public.catalog_team_members
for select
using (public.has_catalog_role(catalog_id, array['admin']));

drop policy if exists "team_admin_insert" on public.catalog_team_members;
create policy "team_admin_insert"
on public.catalog_team_members
for insert
with check (public.has_catalog_role(catalog_id, array['admin']));

drop policy if exists "team_admin_update" on public.catalog_team_members;
create policy "team_admin_update"
on public.catalog_team_members
for update
using (public.has_catalog_role(catalog_id, array['admin']))
with check (public.has_catalog_role(catalog_id, array['admin']));

drop policy if exists "team_admin_delete" on public.catalog_team_members;
create policy "team_admin_delete"
on public.catalog_team_members
for delete
using (public.has_catalog_role(catalog_id, array['admin']));

alter table public.orders
  add column if not exists assigned_to_uid uuid,
  add column if not exists assigned_to_name text,
  add column if not exists internal_notes text not null default '';

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  order_id text not null,
  foreign key (catalog_id, order_id) references public.orders(catalog_id, id) on delete cascade,
  status text not null check (status in ('new', 'viewed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled', 'closed')),
  previous_status text check (previous_status in ('new', 'viewed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled', 'closed')),
  changed_by uuid,
  changed_by_name text not null default 'Sistema',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  order_id text not null,
  foreign key (catalog_id, order_id) references public.orders(catalog_id, id) on delete cascade,
  event_type text not null check (event_type in ('viewed', 'preparing', 'ready', 'delivered', 'cancelled', 'payment_received', 'note_added', 'assigned')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_status_history_order_created
  on public.order_status_history (order_id, created_at desc);
create index if not exists idx_order_status_history_catalog_created
  on public.order_status_history (catalog_id, created_at desc);
create index if not exists idx_order_events_order_created
  on public.order_events (order_id, created_at desc);
create index if not exists idx_order_events_catalog_created
  on public.order_events (catalog_id, created_at desc);

alter table public.order_status_history enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "order_status_history_team_read" on public.order_status_history;
create policy "order_status_history_team_read"
on public.order_status_history
for select
using (public.has_catalog_permission(catalog_id, 'viewOrders'));

drop policy if exists "order_status_history_team_write" on public.order_status_history;
create policy "order_status_history_team_write"
on public.order_status_history
for all
using (public.has_catalog_permission(catalog_id, 'manageOrders'))
with check (public.has_catalog_permission(catalog_id, 'manageOrders'));

drop policy if exists "order_events_team_read" on public.order_events;
create policy "order_events_team_read"
on public.order_events
for select
using (public.has_catalog_permission(catalog_id, 'viewOrders'));

drop policy if exists "order_events_team_write" on public.order_events;
create policy "order_events_team_write"
on public.order_events
for all
using (public.has_catalog_permission(catalog_id, 'manageOrders'))
with check (public.has_catalog_permission(catalog_id, 'manageOrders'));

drop function if exists public.can_transition_order_status(text, text);
create or replace function public.can_transition_order_status(previous_status text, next_status text)
returns boolean
language sql
immutable
as $$
  select case
    when previous_status is null then next_status = 'new'
    when previous_status = next_status then true
    when next_status = 'cancelled' then previous_status in ('new', 'viewed', 'preparing', 'ready')
    when previous_status = 'new' then next_status in ('viewed', 'preparing')
    when previous_status = 'viewed' then next_status = 'preparing'
    when previous_status = 'preparing' then next_status = 'ready'
    when previous_status = 'ready' then next_status in ('delivered', 'completed', 'closed')
    when previous_status in ('delivered', 'completed', 'closed') then false
    else false
  end;
$$;

drop function if exists public.sync_order_workflow_audit();
create or replace function public.sync_order_workflow_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text := coalesce(nullif(new.assigned_to_name, ''), 'Sistema');
  normalized_note text := coalesce(new.internal_notes, '');
  status_event_type text := null;
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (
      order_id,
      catalog_id,
      status,
      previous_status,
      changed_by,
      changed_by_name,
      note
    )
    values (
      new.id,
      new.catalog_id,
      new.status,
      null,
      auth.uid(),
      actor_name,
      ''
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    if not public.can_transition_order_status(old.status, new.status) then
      raise exception 'Transicion de pedido invalida: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    insert into public.order_status_history (
      order_id,
      catalog_id,
      status,
      previous_status,
      changed_by,
      changed_by_name,
      note
    )
    values (
      new.id,
      new.catalog_id,
      new.status,
      old.status,
      auth.uid(),
      actor_name,
      normalized_note
    );

    status_event_type := case
      when new.status in ('viewed', 'preparing', 'ready', 'delivered', 'cancelled') then new.status
      when new.status in ('completed', 'closed') then 'delivered'
      else null
    end;

    if status_event_type is not null then
      insert into public.order_events (
        order_id,
        catalog_id,
        event_type,
        payload,
        created_by
      )
      values (
        new.id,
        new.catalog_id,
        status_event_type,
        jsonb_build_object(
          'previousStatus', old.status,
          'status', new.status,
          'assignedToUid', new.assigned_to_uid,
          'assignedToName', new.assigned_to_name
        ),
        auth.uid()
      );
    end if;
  end if;

  if old.assigned_to_uid is distinct from new.assigned_to_uid
    or old.assigned_to_name is distinct from new.assigned_to_name then
    insert into public.order_events (
      order_id,
      catalog_id,
      event_type,
      payload,
      created_by
    )
    values (
      new.id,
      new.catalog_id,
      'assigned',
      jsonb_build_object(
        'previousAssignedToUid', old.assigned_to_uid,
        'previousAssignedToName', old.assigned_to_name,
        'assignedToUid', new.assigned_to_uid,
        'assignedToName', new.assigned_to_name
      ),
      auth.uid()
    );
  end if;

  if old.internal_notes is distinct from new.internal_notes
    and nullif(btrim(normalized_note), '') is not null then
    insert into public.order_events (
      order_id,
      catalog_id,
      event_type,
      payload,
      created_by
    )
    values (
      new.id,
      new.catalog_id,
      'note_added',
      jsonb_build_object(
        'note', normalized_note
      ),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_order_workflow_audit on public.orders;
create trigger trg_sync_order_workflow_audit
after insert or update on public.orders
for each row
execute function public.sync_order_workflow_audit();

alter table public.products
  add column if not exists variants_migrated boolean not null default false;

create table if not exists public.product_variant_groups (
  id text primary key,
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  product_id text not null,
  foreign key (catalog_id, product_id) references public.products(catalog_id, id) on delete cascade,
  group_name text not null,
  selection_type text not null check (selection_type in ('single', 'multiple')),
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.product_variant_options (
  id text primary key,
  group_id text not null references public.product_variant_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.inventory_items (
  id text primary key,
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  product_id text not null,
  foreign key (catalog_id, product_id) references public.products(catalog_id, id) on delete cascade,
  variant_option_id text null references public.product_variant_options(id) on delete cascade,
  sku text not null default '',
  quantity integer not null default 0,
  reserved integer not null default 0,
  low_stock_threshold integer not null default 0,
  track_stock boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint inventory_items_product_variant_unique unique (product_id, variant_option_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  inventory_item_id text not null references public.inventory_items(id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjustment', 'reservation', 'release', 'cancel')),
  quantity integer not null,
  reason text not null default '',
  reference_id text null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_variant_groups_product on public.product_variant_groups(product_id, sort_order);
create index if not exists idx_variant_options_group on public.product_variant_options(group_id, sort_order);
create index if not exists idx_inventory_product on public.inventory_items(product_id);
create index if not exists idx_inventory_variant on public.inventory_items(variant_option_id);
create index if not exists idx_inventory_catalog on public.inventory_items(catalog_id);
create index if not exists idx_movements_item on public.inventory_movements(inventory_item_id, created_at desc);
create index if not exists idx_movements_catalog on public.inventory_movements(catalog_id, created_at desc);

alter table public.product_variant_groups enable row level security;
alter table public.product_variant_options enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "variant_groups_team_read" on public.product_variant_groups;
create policy "variant_groups_team_read"
on public.product_variant_groups
for select
using (public.has_catalog_permission(catalog_id, 'viewProducts'));

drop policy if exists "variant_groups_team_write" on public.product_variant_groups;
create policy "variant_groups_team_write"
on public.product_variant_groups
for all
using (public.has_catalog_permission(catalog_id, 'manageProducts'))
with check (public.has_catalog_permission(catalog_id, 'manageProducts'));

drop policy if exists "variant_options_team_read" on public.product_variant_options;
create policy "variant_options_team_read"
on public.product_variant_options
for select
using (
  exists (
    select 1
    from public.product_variant_groups grp
    where grp.id = product_variant_options.group_id
      and public.has_catalog_permission(grp.catalog_id, 'viewProducts')
  )
);

drop policy if exists "variant_options_team_write" on public.product_variant_options;
create policy "variant_options_team_write"
on public.product_variant_options
for all
using (
  exists (
    select 1
    from public.product_variant_groups grp
    where grp.id = product_variant_options.group_id
      and public.has_catalog_permission(grp.catalog_id, 'manageProducts')
  )
)
with check (
  exists (
    select 1
    from public.product_variant_groups grp
    where grp.id = product_variant_options.group_id
      and public.has_catalog_permission(grp.catalog_id, 'manageProducts')
  )
);

drop policy if exists "inventory_items_team_read" on public.inventory_items;
create policy "inventory_items_team_read"
on public.inventory_items
for select
using (public.has_catalog_permission(catalog_id, 'viewInventory'));

drop policy if exists "inventory_items_team_write" on public.inventory_items;
create policy "inventory_items_team_write"
on public.inventory_items
for all
using (public.has_catalog_permission(catalog_id, 'manageInventory'))
with check (public.has_catalog_permission(catalog_id, 'manageInventory'));

drop policy if exists "inventory_movements_team_read" on public.inventory_movements;
create policy "inventory_movements_team_read"
on public.inventory_movements
for select
using (public.has_catalog_permission(catalog_id, 'viewInventory'));

drop policy if exists "inventory_movements_team_write" on public.inventory_movements;
create policy "inventory_movements_team_write"
on public.inventory_movements
for all
using (public.has_catalog_permission(catalog_id, 'manageInventory'))
with check (public.has_catalog_permission(catalog_id, 'manageInventory'));

create or replace function public.touch_inventory_item_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_touch_inventory_item_updated_at on public.inventory_items;
create trigger trg_touch_inventory_item_updated_at
before update on public.inventory_items
for each row
execute function public.touch_inventory_item_updated_at();

create or replace function public.migrate_product_variants()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row record;
  migrated_count integer := 0;
  group_entry jsonb;
  option_entry jsonb;
  group_id text;
  option_id text;
begin
  for product_row in
    select id, catalog_id, variants
    from public.products
    where variants_migrated = false
      and jsonb_typeof(coalesce(variants, '[]'::jsonb)) = 'array'
  loop
    delete from public.inventory_items where product_id = product_row.id;
    delete from public.product_variant_groups where product_id = product_row.id;

    for group_entry in select * from jsonb_array_elements(coalesce(product_row.variants, '[]'::jsonb))
    loop
      group_id := coalesce(group_entry->>'id', product_row.id || '-group-' || migrated_count::text || '-' || floor(extract(epoch from now()))::text);

      insert into public.product_variant_groups (
        id,
        catalog_id,
        product_id,
        group_name,
        selection_type,
        required,
        sort_order
      )
      values (
        group_id,
        product_row.catalog_id,
        product_row.id,
        coalesce(group_entry->>'groupName', 'Grupo'),
        case when coalesce(group_entry->>'type', 'single') = 'multiple' then 'multiple' else 'single' end,
        coalesce((group_entry->>'required')::boolean, false),
        coalesce((group_entry->>'sortOrder')::integer, 0)
      )
      on conflict (id) do update
      set group_name = excluded.group_name,
          selection_type = excluded.selection_type,
          required = excluded.required,
          sort_order = excluded.sort_order;

      for option_entry in select * from jsonb_array_elements(coalesce(group_entry->'options', '[]'::jsonb))
      loop
        option_id := coalesce(option_entry->>'id', group_id || '-option-' || floor(extract(epoch from now()))::text);

        insert into public.product_variant_options (
          id,
          group_id,
          name,
          price_delta,
          is_required,
          sort_order
        )
        values (
          option_id,
          group_id,
          coalesce(option_entry->>'name', 'Opcion'),
          coalesce((option_entry->>'priceDelta')::numeric, 0),
          coalesce((option_entry->>'isRequired')::boolean, false),
          coalesce((option_entry->>'sortOrder')::integer, 0)
        )
        on conflict (id) do update
        set name = excluded.name,
            price_delta = excluded.price_delta,
            is_required = excluded.is_required,
            sort_order = excluded.sort_order;

        insert into public.inventory_items (
          id,
          catalog_id,
          product_id,
          variant_option_id,
          sku,
          quantity,
          reserved,
          low_stock_threshold,
          track_stock
        )
        values (
          product_row.id || '-' || option_id,
          product_row.catalog_id,
          product_row.id,
          option_id,
          '',
          0,
          0,
          0,
          false
        )
        on conflict (product_id, variant_option_id) do nothing;
      end loop;
    end loop;

    update public.products
    set variants_migrated = true
    where id = product_row.id;

    migrated_count := migrated_count + 1;
  end loop;

  return migrated_count;
end;
$$;

create or replace function public.reserve_order_inventory(
  order_catalog_id uuid,
  order_reference_id text,
  order_items_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_entry jsonb;
  option_id text;
  requested_qty integer;
  inventory_row public.inventory_items%rowtype;
  available_qty integer;
begin
  if jsonb_typeof(coalesce(order_items_payload, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'Payload de inventario invalido');
  end if;

  for item_entry in select * from jsonb_array_elements(order_items_payload)
  loop
    requested_qty := greatest(1, coalesce((item_entry->>'qty')::integer, 1));

    for option_id in
      select value::text
      from jsonb_array_elements_text(coalesce(item_entry->'variantOptionIds', '[]'::jsonb))
    loop
      select *
      into inventory_row
      from public.inventory_items
      where catalog_id = order_catalog_id
        and product_id = coalesce(item_entry->>'productId', '')
        and variant_option_id = option_id
      for update;

      if inventory_row.id is null then
        continue;
      end if;

      if inventory_row.track_stock then
        available_qty := inventory_row.quantity - inventory_row.reserved;
        if available_qty < requested_qty then
          return jsonb_build_object(
            'ok', false,
            'reason', 'Stock insuficiente para una de las variantes seleccionadas',
            'variantOptionId', option_id
          );
        end if;

        update public.inventory_items
        set reserved = reserved + requested_qty
        where id = inventory_row.id;

        insert into public.inventory_movements (
          catalog_id,
          inventory_item_id,
          type,
          quantity,
          reason,
          reference_id,
          created_by
        )
        values (
          order_catalog_id,
          inventory_row.id,
          'reservation',
          requested_qty,
          'Reserva al crear pedido',
          order_reference_id,
          auth.uid()
        );
      end if;
    end loop;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.release_order_inventory_reservations(
  order_catalog_id uuid,
  order_reference_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row record;
  released_count integer := 0;
begin
  for movement_row in
    select id, inventory_item_id, quantity
    from public.inventory_movements
    where catalog_id = order_catalog_id
      and reference_id = order_reference_id
      and type = 'reservation'
      and not exists (
        select 1
        from public.inventory_movements release_movement
        where release_movement.catalog_id = order_catalog_id
          and release_movement.reference_id = order_reference_id
          and release_movement.inventory_item_id = inventory_movements.inventory_item_id
          and release_movement.type = 'release'
      )
  loop
    update public.inventory_items
    set reserved = greatest(0, reserved - movement_row.quantity)
    where id = movement_row.inventory_item_id;

    insert into public.inventory_movements (
      catalog_id,
      inventory_item_id,
      type,
      quantity,
      reason,
      reference_id,
      created_by
    )
    values (
      order_catalog_id,
      movement_row.inventory_item_id,
      'release',
      movement_row.quantity,
      'Liberacion por cancelacion o rollback',
      order_reference_id,
      auth.uid()
    );

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

create or replace function public.handle_cancelled_order_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status = 'cancelled' then
    perform public.release_order_inventory_reservations(new.catalog_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_cancelled_order_inventory on public.orders;
create trigger trg_handle_cancelled_order_inventory
after update on public.orders
for each row
execute function public.handle_cancelled_order_inventory();

create table if not exists public.catalog_plans (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  plan_type text not null check (plan_type in ('free', 'basic', 'pro', 'enterprise')),
  status text not null check (status in ('trial', 'active', 'paused', 'blocked', 'expired')),
  activated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  payment_reference text,
  notes text,
  unique (catalog_id)
);

create table if not exists public.catalog_plan_history (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  previous_plan text,
  new_plan text not null check (new_plan in ('free', 'basic', 'pro', 'enterprise')),
  changed_by uuid references auth.users(id),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_catalog_plans_catalog on public.catalog_plans (catalog_id);
create index if not exists idx_catalog_plans_status on public.catalog_plans (status, expires_at);
create index if not exists idx_catalog_plan_history_catalog_created
on public.catalog_plan_history (catalog_id, created_at desc);

alter table public.catalog_plans enable row level security;
alter table public.catalog_plan_history enable row level security;

drop policy if exists "catalog_plans_team_read" on public.catalog_plans;
create policy "catalog_plans_team_read"
on public.catalog_plans
for select
using (public.has_catalog_permission(catalog_id, 'viewSettings'));

drop policy if exists "catalog_plans_team_write" on public.catalog_plans;
create policy "catalog_plans_team_write"
on public.catalog_plans
for all
using (public.has_catalog_permission(catalog_id, 'manageSettings'))
with check (public.has_catalog_permission(catalog_id, 'manageSettings'));

drop policy if exists "catalog_plan_history_team_read" on public.catalog_plan_history;
create policy "catalog_plan_history_team_read"
on public.catalog_plan_history
for select
using (public.has_catalog_permission(catalog_id, 'viewSettings'));

drop policy if exists "catalog_plan_history_team_write" on public.catalog_plan_history;
create policy "catalog_plan_history_team_write"
on public.catalog_plan_history
for all
using (public.has_catalog_permission(catalog_id, 'manageSettings'))
with check (public.has_catalog_permission(catalog_id, 'manageSettings'));

alter table public.catalogs
  add column if not exists onboarding_step integer not null default 1,
  add column if not exists business_group text;

alter table public.catalog_team_members
  add column if not exists invited_at timestamptz not null default timezone('utc', now());

create table if not exists public.provinces (
  id text primary key,
  name text not null
);

create table if not exists public.municipalities (
  id text primary key,
  province_id text not null references public.provinces(id),
  name text not null
);

insert into public.provinces (id, name) values
  ('art', 'Artemisa'),
  ('cam', 'Camaguey'),
  ('cfg', 'Cienfuegos'),
  ('cie', 'Ciego de Avila'),
  ('grn', 'Granma'),
  ('gtm', 'Guantanamo'),
  ('hab', 'La Habana'),
  ('hol', 'Holguin'),
  ('ijv', 'Isla de la Juventud'),
  ('ltu', 'Las Tunas'),
  ('may', 'Mayabeque'),
  ('mtz', 'Matanzas'),
  ('pri', 'Pinar del Rio'),
  ('ssp', 'Sancti Spiritus'),
  ('scu', 'Santiago de Cuba'),
  ('vcl', 'Villa Clara')
on conflict (id) do update set name = excluded.name;

insert into public.municipalities (id, province_id, name) values
  ('hab-centro-habana', 'hab', 'Centro Habana'),
  ('hab-habana-vieja', 'hab', 'La Habana Vieja'),
  ('hab-playa', 'hab', 'Playa'),
  ('hab-plaza', 'hab', 'Plaza de la Revolucion'),
  ('hab-cerro', 'hab', 'Cerro'),
  ('hab-10-octubre', 'hab', 'Diez de Octubre'),
  ('hab-arroyo-naranjo', 'hab', 'Arroyo Naranjo'),
  ('hab-boyeros', 'hab', 'Boyeros'),
  ('hab-cotorro', 'hab', 'Cotorro'),
  ('hab-guanabacoa', 'hab', 'Guanabacoa'),
  ('vcl-santa-clara', 'vcl', 'Santa Clara'),
  ('mtz-matanzas', 'mtz', 'Matanzas'),
  ('scu-santiago', 'scu', 'Santiago de Cuba'),
  ('hol-holguin', 'hol', 'Holguin'),
  ('cam-camaguey', 'cam', 'Camaguey'),
  ('pri-pinar-del-rio', 'pri', 'Pinar del Rio')
on conflict (id) do update set
  province_id = excluded.province_id,
  name = excluded.name;

create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  province_id text references public.provinces(id),
  municipality_id text references public.municipalities(id),
  address text,
  lat numeric,
  lng numeric
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  name text not null,
  province_ids text[] not null default '{}',
  municipality_ids text[] not null default '{}',
  base_fee numeric not null default 0,
  estimated_minutes integer
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  name text not null,
  phone text,
  vehicle text,
  active boolean not null default true,
  current_location_lat numeric,
  current_location_lng numeric
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_name text,
  actor_email text,
  catalog_id uuid references public.catalogs(id),
  action text not null check (action in ('create','update','delete','login','logout','export','setting_change','plan_change','status_change')),
  entity_type text not null,
  entity_id text,
  payload_before jsonb,
  payload_after jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_business_locations_catalog on public.business_locations (catalog_id);
create index if not exists idx_delivery_zones_catalog on public.delivery_zones (catalog_id);
create index if not exists idx_drivers_catalog on public.drivers (catalog_id, active);
create index if not exists idx_audit_log_actor on public.audit_log (actor_id, created_at desc);
create index if not exists idx_audit_log_catalog on public.audit_log (catalog_id, created_at desc);
create index if not exists idx_audit_log_entity on public.audit_log (entity_type, entity_id, created_at desc);

alter table public.business_locations enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.drivers enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "business_locations_team_access" on public.business_locations;
create policy "business_locations_team_access"
on public.business_locations
for all
using (public.has_catalog_permission(catalog_id, 'viewSettings'))
with check (public.has_catalog_permission(catalog_id, 'manageSettings'));

drop policy if exists "delivery_zones_team_access" on public.delivery_zones;
create policy "delivery_zones_team_access"
on public.delivery_zones
for all
using (public.has_catalog_permission(catalog_id, 'viewSettings'))
with check (public.has_catalog_permission(catalog_id, 'manageSettings'));

drop policy if exists "drivers_team_access" on public.drivers;
create policy "drivers_team_access"
on public.drivers
for all
using (public.has_catalog_permission(catalog_id, 'viewOrders'))
with check (public.has_catalog_permission(catalog_id, 'manageOrders'));

drop policy if exists "audit_log_team_read" on public.audit_log;
create policy "audit_log_team_read"
on public.audit_log
for select
using (catalog_id is null or public.has_catalog_permission(catalog_id, 'viewSettings'));
