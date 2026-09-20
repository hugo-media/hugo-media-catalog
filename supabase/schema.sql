-- Hugo Media Catalog: isolated tables; safe to add to an existing Supabase project.
-- Apply as the database owner in a transaction. No existing project tables are changed.
begin;
create table if not exists public.hmg_catalog_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.hmg_catalog_admins enable row level security;
revoke all on public.hmg_catalog_admins from anon, authenticated;
grant select on public.hmg_catalog_admins to authenticated;
drop policy if exists hmg_admin_self on public.hmg_catalog_admins;
create policy hmg_admin_self on public.hmg_catalog_admins for select to authenticated
 using (user_id = (select auth.uid()));
-- No client can insert/update admin membership; only the DB owner provisions it.
create or replace function public.hmg_catalog_is_admin() returns boolean
 language sql stable security invoker set search_path = '' as $$
 select auth.uid() is not null and exists (
   select 1 from public.hmg_catalog_admins where user_id = auth.uid()
 );
$$;
revoke all on function public.hmg_catalog_is_admin() from public, anon;
grant execute on function public.hmg_catalog_is_admin() to authenticated;
create table if not exists public.hmg_catalog_products (
 id bigint generated always as identity primary key,
 name text not null check (char_length(btrim(name)) between 1 and 180),
 brand text not null check (char_length(btrim(brand)) between 1 and 80),
 cat smallint not null check (cat between 0 and 5),
 status smallint not null default 3 check (status between 0 and 3),
 price numeric(12,2) not null check (price between 0 and 10000000),
 condition text not null default '',
 warranty text not null default '',
 desc_uk text not null default '' check (char_length(desc_uk)<=10000),
 desc_pl text not null default '' check (char_length(desc_pl)<=10000),
 specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs)='object'),
 images text[] not null default '{}'::text[] check (cardinality(images)<=8),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists hmg_catalog_status_category_price on public.hmg_catalog_products(status,cat,price);
alter table public.hmg_catalog_products enable row level security;
revoke all on public.hmg_catalog_products from anon, authenticated;
grant select on public.hmg_catalog_products to anon;
grant select,insert,update,delete on public.hmg_catalog_products to authenticated;
grant usage,select on sequence public.hmg_catalog_products_id_seq to authenticated;
drop policy if exists hmg_public_products on public.hmg_catalog_products;
create policy hmg_public_products on public.hmg_catalog_products for select to anon,authenticated using (status in (0,1,2));
drop policy if exists hmg_admin_select on public.hmg_catalog_products;
create policy hmg_admin_select on public.hmg_catalog_products for select to authenticated using ((select public.hmg_catalog_is_admin()));
drop policy if exists hmg_admin_insert on public.hmg_catalog_products;
create policy hmg_admin_insert on public.hmg_catalog_products for insert to authenticated with check ((select public.hmg_catalog_is_admin()));
drop policy if exists hmg_admin_update on public.hmg_catalog_products;
create policy hmg_admin_update on public.hmg_catalog_products for update to authenticated using ((select public.hmg_catalog_is_admin())) with check ((select public.hmg_catalog_is_admin()));
drop policy if exists hmg_admin_delete on public.hmg_catalog_products;
create policy hmg_admin_delete on public.hmg_catalog_products for delete to authenticated using ((select public.hmg_catalog_is_admin()));
create or replace function public.hmg_catalog_touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
revoke all on function public.hmg_catalog_touch_updated_at() from public,anon,authenticated;
drop trigger if exists hmg_catalog_updated on public.hmg_catalog_products;
create trigger hmg_catalog_updated before update on public.hmg_catalog_products for each row execute function public.hmg_catalog_touch_updated_at();
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hmg-catalog-photos','hmg-catalog-photos',true,10485760,array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Photos are public merchandise images. Draft text is private; image URLs aren't.
-- No overwrite is allowed: each upload has a new UUID.
drop policy if exists hmg_photos_insert on storage.objects;
create policy hmg_photos_insert on storage.objects for insert to authenticated
with check (bucket_id='hmg-catalog-photos' and (select public.hmg_catalog_is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists hmg_photos_admin_read on storage.objects;
create policy hmg_photos_admin_read on storage.objects for select to authenticated
using (bucket_id='hmg-catalog-photos' and (select public.hmg_catalog_is_admin()));
drop policy if exists hmg_photos_delete on storage.objects;
create policy hmg_photos_delete on storage.objects for delete to authenticated
using (bucket_id='hmg-catalog-photos' and (select public.hmg_catalog_is_admin()));
-- Anonymous, cookie-free catalog analytics. Public visitors may append validated
-- events, while only an account listed in hmg_catalog_admins may read them.
create table if not exists public.hmg_catalog_events (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 visitor_id uuid not null,
 session_id uuid not null,
 event_type text not null check (event_type in ('page_view','product_view','telegram_click','cart_add')),
 product_id bigint,
 path text not null default '/' check (char_length(path) between 1 and 256),
 referrer_host text not null default '' check (char_length(referrer_host)<=255),
 device_type text not null check (device_type in ('desktop','tablet','mobile')),
 language text not null default 'uk' check (char_length(language) between 2 and 8)
);
create index if not exists hmg_catalog_events_created_at on public.hmg_catalog_events(created_at desc);
create index if not exists hmg_catalog_events_type_created_at on public.hmg_catalog_events(event_type,created_at desc);
create index if not exists hmg_catalog_events_product_created_at on public.hmg_catalog_events(product_id,created_at desc) where product_id is not null;
alter table public.hmg_catalog_events enable row level security;
revoke all on public.hmg_catalog_events from anon,authenticated;
grant insert (visitor_id,session_id,event_type,product_id,path,referrer_host,device_type,language) on public.hmg_catalog_events to anon,authenticated;
grant select on public.hmg_catalog_events to authenticated;
grant usage,select on sequence public.hmg_catalog_events_id_seq to anon,authenticated;
drop policy if exists hmg_analytics_insert on public.hmg_catalog_events;
create policy hmg_analytics_insert on public.hmg_catalog_events for insert to anon,authenticated with check (true);
drop policy if exists hmg_analytics_admin_select on public.hmg_catalog_events;
create policy hmg_analytics_admin_select on public.hmg_catalog_events for select to authenticated
 using ((select public.hmg_catalog_is_admin()));
alter table public.hmg_catalog_events
 add column if not exists traffic_source text not null default '' check (char_length(traffic_source)<=80);
alter table public.hmg_catalog_events drop constraint if exists hmg_catalog_events_event_type_check;
alter table public.hmg_catalog_events add constraint hmg_catalog_events_event_type_check
 check (event_type in ('page_view','product_view','telegram_click','catalog_click','cart_add','compare_add','bundle_select'));
grant insert (traffic_source) on public.hmg_catalog_events to anon,authenticated;
create table if not exists public.hmg_catalog_reviews (
 id bigint generated always as identity primary key,
 customer_name text not null check (char_length(btrim(customer_name)) between 1 and 80),
 text_uk text not null default '' check (char_length(text_uk)<=1200),
 text_pl text not null default '' check (char_length(text_pl)<=1200),
 rating smallint not null default 5 check (rating between 1 and 5),
 image_path text not null default '' check (char_length(image_path)<=500),
 is_published boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.hmg_catalog_reviews enable row level security;
revoke all on public.hmg_catalog_reviews from anon,authenticated;
grant select on public.hmg_catalog_reviews to anon,authenticated;
grant insert,update,delete on public.hmg_catalog_reviews to authenticated;
grant usage,select on sequence public.hmg_catalog_reviews_id_seq to authenticated;
create policy hmg_reviews_public_select on public.hmg_catalog_reviews for select to anon using (is_published);
create policy hmg_reviews_admin_select on public.hmg_catalog_reviews for select to authenticated using ((select public.hmg_catalog_is_admin()));
create policy hmg_reviews_admin_insert on public.hmg_catalog_reviews for insert to authenticated with check ((select public.hmg_catalog_is_admin()));
create policy hmg_reviews_admin_update on public.hmg_catalog_reviews for update to authenticated using ((select public.hmg_catalog_is_admin())) with check ((select public.hmg_catalog_is_admin()));
create policy hmg_reviews_admin_delete on public.hmg_catalog_reviews for delete to authenticated using ((select public.hmg_catalog_is_admin()));
create index if not exists hmg_catalog_reviews_published_created on public.hmg_catalog_reviews(is_published,created_at desc);
commit;
-- After creating/inviting the owner's auth account, provision EXACTLY that account:
-- insert into public.hmg_catalog_admins(user_id) values ('OWNER_AUTH_USER_UUID');
-- Disable public user signups in Auth settings; do not grant admin by user_metadata.
