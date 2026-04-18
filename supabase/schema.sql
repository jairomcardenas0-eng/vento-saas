create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  uid uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Owner',
  default_catalog_id uuid null,
  system_role text not null default 'merchant' check (system_role in ('owner', 'merchant')),
  created_at timestamptz not null default timezone('utc', now())
);

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
end
$$;
