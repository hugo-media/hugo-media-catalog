-- Transactional smoke check. Run AFTER schema.sql, as database owner.
-- Requires an existing owner in hmg_catalog_admins for the owner section.
begin;
insert into public.hmg_catalog_products(name,brand,cat,status,price)
values ('__hmg_test_public__','test',0,0,1),('__hmg_test_draft__','test',0,3,1);
set local role anon;
do $$ begin
 if not exists(select 1 from public.hmg_catalog_products where name='__hmg_test_public__') then raise exception 'Public read failed'; end if;
 if exists(select 1 from public.hmg_catalog_products where name='__hmg_test_draft__') then raise exception 'Draft exposed to anon'; end if;
 begin
  insert into public.hmg_catalog_products(name,brand,cat,status,price) values('bad','test',0,0,1);
  raise exception 'Anonymous write succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare affected integer; begin
 if public.hmg_catalog_is_admin() then raise exception 'Non-admin treated as owner'; end if;
 if exists(select 1 from public.hmg_catalog_products where name='__hmg_test_draft__') then raise exception 'Draft exposed to non-admin'; end if;
 begin
  insert into public.hmg_catalog_products(name,brand,cat,status,price) values('bad','test',0,0,1);
  raise exception 'Non-admin insert succeeded';
 exception when insufficient_privilege then null; end;
 update public.hmg_catalog_products set price=999 where name='__hmg_test_public__';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Non-admin update succeeded'; end if;
 delete from public.hmg_catalog_products where name='__hmg_test_public__';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Non-admin delete succeeded'; end if;
 begin
  insert into public.hmg_catalog_admins(user_id) values ('00000000-0000-0000-0000-000000000001');
  raise exception 'Privilege escalation succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin if not exists(select 1 from public.hmg_catalog_admins) then raise exception 'Provision owner before running owner tests'; end if; end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from public.hmg_catalog_admins limit 1),true);
set local role authenticated;
do $$ declare affected integer; begin
 if not public.hmg_catalog_is_admin() then raise exception 'Owner not recognized'; end if;
 if not exists(select 1 from public.hmg_catalog_products where name='__hmg_test_draft__') then raise exception 'Owner cannot read draft'; end if;
 insert into public.hmg_catalog_products(name,brand,cat,status,price) values('__hmg_owner_test__','test',0,3,1);
 update public.hmg_catalog_products set price=2 where name='__hmg_owner_test__';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Owner update failed'; end if;
 delete from public.hmg_catalog_products where name='__hmg_owner_test__';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Owner delete failed'; end if;
end $$;
reset role;
rollback;
