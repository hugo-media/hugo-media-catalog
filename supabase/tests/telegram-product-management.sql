
begin;
set local statement_timeout='15s';
set local request.jwt.claims='{"role":"service_role"}';
set local role service_role;
do $$
#variable_conflict use_variable
declare r jsonb;changed jsonb;answer jsonb;again jsonb;id bigint;price numeric;denied boolean:=false;chat text:='999999999999999';fingerprint text;
begin
 if has_function_privilege('anon','public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb)','EXECUTE')
  or has_function_privilege('authenticated','public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb)','EXECUTE') then raise exception 'public management access';end if;
 select to_jsonb(p) into r from public.hmg_catalog_products p order by p.id desc limit 1;
 if r is null then raise exception 'test needs existing product';end if;
 id:=(r->>'id')::bigint;price:=(r->>'price')::numeric;
 if exists(select 1 from hmg_private.hmg_bot_sessions where chat_id=chat) then raise exception 'test session collision';end if;
 answer:=public.hmg_catalog_bot_products('HMG-'||lpad(id::text,3,'0'),0);
 if (answer#>>'{items,0,id}')::bigint is distinct from id then raise exception 'code lookup failed';end if;
 if jsonb_array_length(public.hmg_catalog_bot_products('',0)->'items')>6 then raise exception 'page size';end if;
 answer:=public.hmg_catalog_bot_product(id);fingerprint:=answer->>'fingerprint';
 insert into hmg_private.hmg_bot_sessions(chat_id,version,state) values(chat,0,jsonb_build_object('mode','manage','step','preview','productId',id,'fingerprint',fingerprint,'draftId','12345678-1234-4234-8234-123456789012'));
 changed:=r||jsonb_build_object('price',price+1);
 answer:=public.hmg_catalog_bot_manage_commit(chat,900000000000001,0,'update',changed,'{"text":"saved"}');
 if (select p.price from public.hmg_catalog_products p where p.id=id) is distinct from price+1 then raise exception 'update failed';end if;
 again:=public.hmg_catalog_bot_manage_commit(chat,900000000000001,0,'update',changed,'{"text":"duplicate"}');
 if again is distinct from answer then raise exception 'duplicate not replayed';end if;
 if not exists(select 1 from public.hmg_catalog_audit a where a.entity_id=id and a.after_data->>'price'=((price+1)::text)) then
  -- JSON numeric formatting may differ; check the numeric value explicitly.
  if not exists(select 1 from public.hmg_catalog_audit a where a.entity_id=id and (a.after_data->>'price')::numeric=price+1) then raise exception 'audit missing';end if;
 end if;
 update hmg_private.hmg_bot_sessions set state=jsonb_build_object('mode','manage','step','preview','productId',id,'fingerprint',fingerprint,'draftId','12345678-1234-4234-8234-123456789012') where chat_id=chat;
 answer:=public.hmg_catalog_bot_manage_commit(chat,900000000000002,1,'update',r,'{"text":"should not save"}');
 if (select p.price from public.hmg_catalog_products p where p.id=id) is distinct from price+1 or answer#>>'{reply,text}' not like 'Товар змінили%' then raise exception 'conflict protection failed';end if;
 answer:=public.hmg_catalog_bot_product(id);fingerprint:=answer->>'fingerprint';
 update hmg_private.hmg_bot_sessions set state=jsonb_build_object('mode','manage','step','preview','productId',id,'fingerprint',fingerprint,'draftId','12345678-1234-4234-8234-123456789012') where chat_id=chat;
 begin
  perform public.hmg_catalog_bot_manage_commit(chat,900000000000003,2,'delete',null,'{"text":"bad"}');
 exception when others then
  if sqlerrm='product review required' then denied:=true;else raise;end if;
 end;
 if not denied then raise exception 'unconfirmed deletion accepted';end if;
 update hmg_private.hmg_bot_sessions set state=jsonb_set(state,'{step}','"confirmDelete"') where chat_id=chat;
 perform public.hmg_catalog_bot_manage_commit(chat,900000000000003,2,'delete',null,'{"text":"deleted"}');
 if exists(select 1 from public.hmg_catalog_products p where p.id=id) then raise exception 'confirmed deletion failed';end if;
end $$;
select 'PASS: search, save, audit, replay, conflict, confirmation and deletion; all mutations rolled back' result;
rollback;
