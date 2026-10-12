
begin;
set local statement_timeout='15s';
set local request.jwt.claims='{"role":"service_role"}';
set local role service_role;
do $test$
declare v_product jsonb;v_id bigint;v_open jsonb;v_result jsonb;v_state jsonb;v_chat text:='999999999999998';
begin
 select to_jsonb(p) into v_product from public.hmg_catalog_products p where p.status=0 and cardinality(p.images)>0 order by p.id desc limit 1;
 if v_product is null then raise exception 'test needs public product';end if;
 v_id:=(v_product->>'id')::bigint;
 if exists(select 1 from hmg_private.hmg_bot_sessions where chat_id=v_chat) then raise exception 'test session collision';end if;
 v_open:=public.hmg_catalog_bot_product(v_id);
 v_state:=jsonb_build_object('mode','manage','step','preview','productId',v_id,'fingerprint',v_open->>'fingerprint','draftId','12345678-1234-4234-8234-123456789012');
 insert into hmg_private.hmg_bot_sessions(chat_id,state) values(v_chat,v_state);
 v_product:=v_product||jsonb_build_object('cat',7,'specs',(v_product->'specs')||'{"deviceType":"console","consolePlatform":"PlayStation","consoleStorage":"1 TB SSD","controllerCount":"1"}'::jsonb);
 v_result:=public.hmg_catalog_bot_manage_commit(v_chat,900000000000004,0,'update',v_product,'{"text":"saved"}');
 if not exists(select 1 from public.hmg_catalog_products p where p.id=v_id and p.cat=7 and p.specs->>'consoleStorage'='1 TB SSD') then raise exception 'console edit did not save';end if;
 if not exists(select 1 from public.hmg_catalog_versions v where v.product_id=v_id and v.snapshot->>'cat'='7') then raise exception 'console version missing';end if;
 if not exists(select 1 from public.hmg_catalog_products p where p.id=v_id and p.images=ARRAY(select jsonb_array_elements_text(v_product->'images')) and p.price=(v_product->>'price')::numeric) then raise exception 'price or photos changed';end if;
 begin
  update public.hmg_catalog_products set cat=8 where id=v_id;
  raise exception 'out-of-range category accepted';
 exception when check_violation then null;
 end;
end $test$;
set local role anon;
do $test$
begin
 if not exists(select 1 from public.hmg_catalog_products where cat=7 and specs->>'consoleStorage'='1 TB SSD') then raise exception 'public console invisible';end if;
 if has_function_privilege('anon','public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb)','EXECUTE') then raise exception 'public management exposed';end if;
end $test$;
select 'PASS: category 7 saves through bot RPC, photos and price preserved, versions captured, public read works, category 8 rejected; rolled back' result;
rollback;
