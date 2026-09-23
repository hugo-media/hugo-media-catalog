begin;
set local role anon;
do $$ begin
 if not exists(select 1 from public.hmg_catalog_settings where id=1) then raise exception 'Public settings unavailable'; end if;
 begin perform * from public.hmg_catalog_versions; raise exception 'Anonymous version leak'; exception when insufficient_privilege then null; end;
 begin update public.hmg_catalog_settings set links='{}' where id=1; raise exception 'Anonymous settings write'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n int; begin
 select count(*) into n from public.hmg_catalog_versions;if n<>0 then raise exception 'Non-admin version leak'; end if;
 update public.hmg_catalog_settings set links='{}' where id=1;get diagnostics n=row_count;if n<>0 then raise exception 'Non-admin settings write';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.hmg_catalog_admins where role='owner' limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare p public.hmg_catalog_products;v bigint;n int;begin
 update public.hmg_catalog_settings set links='{"catalog":"https://t.me/h_m_g_pl"}' where id=1;get diagnostics n=row_count;if n<>1 then raise exception 'Admin settings update failed';end if;
 insert into public.hmg_catalog_products(name,brand,cat,status,price) values('Temporary verification','Test',0,3,99) returning * into p;
 select id into v from public.hmg_catalog_versions where product_id=p.id order by id desc limit 1;
 if v is null then raise exception 'Version missing';end if;
 update public.hmg_catalog_products set price=199 where id=p.id returning * into p;
 begin perform public.hmg_catalog_restore_version(v,p.updated_at-interval '1 second');raise exception 'Stale restore accepted';exception when others then if sqlerrm<>'editConflict' then raise;end if;end;
 select * into p from public.hmg_catalog_restore_version(v,p.updated_at);
 if p.price<>99 then raise exception 'Restore failed';end if;
 if (select count(*) from public.hmg_catalog_versions where product_id=p.id)<>3 then raise exception 'Restore history missing';end if;
 begin insert into public.hmg_catalog_versions(product_id,snapshot) values(p.id,'{}');raise exception 'Version forgery allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
