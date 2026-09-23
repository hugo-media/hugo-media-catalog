-- Non-destructive catalog enhancements: public display settings, private versions and click placements.
begin;
create table if not exists public.hmg_catalog_settings (
 id smallint primary key default 1 check(id=1),
 links jsonb not null default '{}' check(jsonb_typeof(links)='object' and octet_length(links::text)<=4000),
 trust jsonb not null default '{}' check(jsonb_typeof(trust)='object' and octet_length(trust::text)<=50000),
 updated_at timestamptz not null default now()
);
alter table public.hmg_catalog_settings enable row level security;
revoke all on public.hmg_catalog_settings from anon, authenticated;
grant select on public.hmg_catalog_settings to anon, authenticated;
grant update on public.hmg_catalog_settings to authenticated;
create policy hmg_settings_read on public.hmg_catalog_settings for select to anon, authenticated using(true);
create policy hmg_settings_update on public.hmg_catalog_settings for update to authenticated
 using((select public.hmg_catalog_is_admin())) with check((select public.hmg_catalog_is_admin()));
insert into public.hmg_catalog_settings(id) values(1) on conflict do nothing;
create trigger hmg_settings_updated before update on public.hmg_catalog_settings for each row execute function public.hmg_catalog_touch_updated_at();

create table if not exists public.hmg_catalog_versions (
 id bigint generated always as identity primary key,
 product_id bigint not null,
 saved_at timestamptz not null default now(),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object')
);
create index hmg_versions_product_date on public.hmg_catalog_versions(product_id,id desc);
alter table public.hmg_catalog_versions enable row level security;
revoke all on public.hmg_catalog_versions from anon,authenticated;
grant select on public.hmg_catalog_versions to authenticated;
create policy hmg_versions_admin_read on public.hmg_catalog_versions for select to authenticated using((select public.hmg_catalog_is_admin()));
-- Capture current records before further editing, without altering their content.
insert into public.hmg_catalog_versions(product_id,snapshot)
 select p.id,to_jsonb(p) from public.hmg_catalog_products p;
create or replace function hmg_private.capture_catalog_version() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.hmg_catalog_versions(product_id,snapshot) values(new.id,to_jsonb(new));
 return new;
end $$;
revoke all on function hmg_private.capture_catalog_version() from public,anon,authenticated;
create trigger hmg_product_version after insert or update on public.hmg_catalog_products for each row execute function hmg_private.capture_catalog_version();

-- Invoker privileges: the same RLS restrictions as normal product edits apply.
create or replace function public.hmg_catalog_restore_version(version_id bigint, expected_updated_at timestamptz)
returns public.hmg_catalog_products language plpgsql security invoker set search_path='' as $$
declare v public.hmg_catalog_versions; p public.hmg_catalog_products; result public.hmg_catalog_products;
begin
 if not public.hmg_catalog_is_admin() then raise exception 'notAdmin'; end if;
 select * into v from public.hmg_catalog_versions where id=version_id;
 if not found then raise exception 'versionUnavailable'; end if;
 select * into p from public.hmg_catalog_products where id=v.product_id for update;
 if not found then raise exception 'versionUnavailable'; end if;
 if p.updated_at is distinct from expected_updated_at then raise exception 'editConflict'; end if;
 update public.hmg_catalog_products set
 name=v.snapshot->>'name',brand=v.snapshot->>'brand',cat=(v.snapshot->>'cat')::smallint,
 status=(v.snapshot->>'status')::smallint,price=(v.snapshot->>'price')::numeric,
 condition=coalesce(v.snapshot->>'condition',''),warranty=coalesce(v.snapshot->>'warranty',''),
 desc_uk=coalesce(v.snapshot->>'desc_uk',''),desc_pl=coalesce(v.snapshot->>'desc_pl',''),
 specs=coalesce(v.snapshot->'specs','{}'::jsonb),
 images=array(select jsonb_array_elements_text(v.snapshot->'images'))
 where id=v.product_id returning * into result;
 return result;
end $$;
revoke all on function public.hmg_catalog_restore_version(bigint,timestamptz) from public,anon;
grant execute on function public.hmg_catalog_restore_version(bigint,timestamptz) to authenticated;

alter table public.hmg_catalog_events add column if not exists placement text not null default '' check(char_length(placement)<=40);
grant insert(placement) on public.hmg_catalog_events to anon,authenticated;
alter table public.hmg_catalog_audit drop constraint hmg_catalog_audit_entity_check;
alter table public.hmg_catalog_audit add constraint hmg_catalog_audit_entity_check check(entity in ('product','review','recommendation','settings'));
create or replace function hmg_private.log_catalog_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_data jsonb; new_data jsonb; actor uuid; item_id bigint;
begin
 if tg_op <> 'INSERT' then old_data:=to_jsonb(old); end if;
 if tg_op <> 'DELETE' then new_data:=to_jsonb(new); end if;
 if old_data is not distinct from new_data then return coalesce(new,old); end if;
 actor:=(select auth.uid());item_id:=case when tg_op='DELETE' then old.id else new.id end;
 insert into public.hmg_catalog_audit(actor_id,actor_email,entity,entity_id,action,before_data,after_data)
 values(actor,(select u.email from auth.users u where u.id=actor),case tg_table_name
 when 'hmg_catalog_products' then 'product' when 'hmg_catalog_reviews' then 'review'
 when 'hmg_catalog_settings' then 'settings' else 'recommendation' end,item_id,tg_op,old_data,new_data);
 return coalesce(new,old);
end $$;
revoke all on function hmg_private.log_catalog_change() from public,anon,authenticated;
create trigger hmg_settings_audit after update on public.hmg_catalog_settings for each row execute function hmg_private.log_catalog_change();
notify pgrst,'reload schema';
commit;
