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

create index if not exists idx_catalogs_owner_uid on public.catalogs (owner_uid);
create index if not exists idx_catalogs_status_ban on public.catalogs (status, is_banned);
create index if not exists idx_categories_catalog_order on public.categories (catalog_id, sort_order);
create index if not exists idx_products_catalog_order on public.products (catalog_id, sort_order);
create index if not exists idx_reviews_catalog_created on public.reviews (catalog_id, created_at desc);
create index if not exists idx_orders_catalog_created on public.orders (catalog_id, created_at desc);
create index if not exists idx_coupons_catalog_created on public.coupons (catalog_id, created_at desc);

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
    select public.is_catalog_owner(target_catalog_id) as allowed
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
