-- Editorial picks for each Warsaw calendar day; at most two product IDs per date.
begin;
create table if not exists public.hmg_catalog_daily_picks (
  id bigint generated always as identity primary key,
  for_date date not null unique,
  product_ids bigint[] not null default '{}'::bigint[],
  constraint hmg_daily_picks_limit check (
    cardinality(product_ids) <= 2
    and array_position(product_ids, null) is null
    and (cardinality(product_ids) < 2 or product_ids[1] <> product_ids[2])
    and (cardinality(product_ids) = 0 or product_ids[1] > 0)
    and (cardinality(product_ids) < 2 or product_ids[2] > 0)
  )
);
alter table public.hmg_catalog_daily_picks enable row level security;
revoke all on public.hmg_catalog_daily_picks from anon, authenticated;
grant select on public.hmg_catalog_daily_picks to anon, authenticated;
grant insert, update on public.hmg_catalog_daily_picks to authenticated;
grant usage, select on sequence public.hmg_catalog_daily_picks_id_seq to authenticated;
drop policy if exists hmg_daily_picks_public on public.hmg_catalog_daily_picks;
create policy hmg_daily_picks_public on public.hmg_catalog_daily_picks
  for select to anon, authenticated using (true);
drop policy if exists hmg_daily_picks_admin_insert on public.hmg_catalog_daily_picks;
create policy hmg_daily_picks_admin_insert on public.hmg_catalog_daily_picks
  for insert to authenticated with check ((select public.hmg_catalog_is_admin()));
drop policy if exists hmg_daily_picks_admin_update on public.hmg_catalog_daily_picks;
create policy hmg_daily_picks_admin_update on public.hmg_catalog_daily_picks
  for update to authenticated using ((select public.hmg_catalog_is_admin()))
  with check ((select public.hmg_catalog_is_admin()));

-- The owner can see who changed the recommendations in the existing activity log.
alter table public.hmg_catalog_audit
  drop constraint if exists hmg_catalog_audit_entity_check,
  add constraint hmg_catalog_audit_entity_check
  check (entity in ('product', 'review', 'recommendation'));

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
    case tg_table_name
      when 'hmg_catalog_products' then 'product'
      when 'hmg_catalog_reviews' then 'review'
      else 'recommendation'
    end,
    item_id, tg_op, old_data, new_data
  );
  return coalesce(new, old);
end;
$$;
revoke all on function hmg_private.log_catalog_change() from public, anon, authenticated;
drop trigger if exists hmg_daily_picks_audit on public.hmg_catalog_daily_picks;
create trigger hmg_daily_picks_audit after insert or update
  on public.hmg_catalog_daily_picks for each row
  execute function hmg_private.log_catalog_change();
commit;
