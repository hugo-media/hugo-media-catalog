-- Read/write smoke test within a single transaction; ROLLBACK removes all test changes.
begin;
select set_config('request.jwt.claim.sub',
  (select a.user_id::text from public.hmg_catalog_admins a where a.role = 'owner' limit 1), true);
set local role authenticated;
do $$
declare test_id bigint;
begin
  if not public.hmg_catalog_is_owner() then raise exception 'Owner RPC denied'; end if;
  insert into public.hmg_catalog_products(name, brand, cat, status, price)
  values ('__hmg_audit_test__', 'test', 0, 3, 1) returning id into test_id;
  update public.hmg_catalog_products set price = 2 where id = test_id;
  delete from public.hmg_catalog_products where id = test_id;
  if (select count(*) from public.hmg_catalog_audit where entity_id = test_id and entity = 'product') <> 3 then
    raise exception 'Insert, update, delete not logged';
  end if;
  if exists(select 1 from public.hmg_catalog_audit where entity_id = test_id and actor_email is null) then
    raise exception 'Missing actor email';
  end if;
  begin
    delete from public.hmg_catalog_audit where entity_id = test_id;
    raise exception 'Owner tampered with audit log';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;
do $$ begin
  if public.hmg_catalog_is_owner() then raise exception 'Nonowner granted owner role'; end if;
  if exists(select 1 from public.hmg_catalog_audit) then raise exception 'Audit visible to nonowner'; end if;
  begin
    insert into public.hmg_catalog_audit(entity, entity_id, action)
    values ('product', 1, 'INSERT');
    raise exception 'Nonowner forged audit entry';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
