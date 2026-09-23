-- Owner-only activity log. Apply once to the existing Hugo Media database.
alter table public.hmg_catalog_admins
  add column if not exists role text not null default 'admin'
  check (role in ('owner', 'admin'));

-- Initial installation has precisely one administrator: the verified owner.
-- Do not run first-time provisioning after adding a second administrator.
do $$
begin
  if not exists (select 1 from public.hmg_catalog_admins where role = 'owner') then
    if (select count(*) from public.hmg_catalog_admins) <> 1 then
      raise exception 'Expected exactly one existing administrator to provision owner';
    end if;
    update public.hmg_catalog_admins set role = 'owner';
  end if;
end $$;

create or replace function public.hmg_catalog_is_owner() returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.hmg_catalog_admins
    where user_id = (select auth.uid()) and role = 'owner'
  );
$$;
revoke all on function public.hmg_catalog_is_owner() from public, anon;
grant execute on function public.hmg_catalog_is_owner() to authenticated;

create table if not exists public.hmg_catalog_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  entity text not null check (entity in ('product', 'review')),
  entity_id bigint not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb
);
create index if not exists hmg_catalog_audit_created on public.hmg_catalog_audit(created_at desc);
alter table public.hmg_catalog_audit enable row level security;
revoke all on public.hmg_catalog_audit from anon, authenticated;
grant select on public.hmg_catalog_audit to authenticated;
drop policy if exists hmg_audit_owner_read on public.hmg_catalog_audit;
create policy hmg_audit_owner_read on public.hmg_catalog_audit for select
to authenticated using ((select public.hmg_catalog_is_owner()));

create schema if not exists hmg_private;
revoke all on schema hmg_private from public, anon, authenticated;
create or replace function hmg_private.log_catalog_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_data jsonb;
  new_data jsonb;
  actor uuid;
  item_id bigint;
begin
  if tg_op <> 'INSERT' then old_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_data := to_jsonb(new); end if;
  if old_data is not distinct from new_data then return coalesce(new, old); end if;
  actor := (select auth.uid());
  item_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.hmg_catalog_audit
    (actor_id, actor_email, entity, entity_id, action, before_data, after_data)
  values (
    actor,
    (select u.email from auth.users u where u.id = actor),
    case when tg_table_name = 'hmg_catalog_products' then 'product' else 'review' end,
    item_id, tg_op, old_data, new_data
  );
  return coalesce(new, old);
end;
$$;
revoke all on function hmg_private.log_catalog_change() from public, anon, authenticated;
drop trigger if exists hmg_product_audit on public.hmg_catalog_products;
create trigger hmg_product_audit after insert or update or delete
on public.hmg_catalog_products for each row
execute function hmg_private.log_catalog_change();
drop trigger if exists hmg_review_audit on public.hmg_catalog_reviews;
create trigger hmg_review_audit after insert or update or delete
on public.hmg_catalog_reviews for each row
execute function hmg_private.log_catalog_change();
