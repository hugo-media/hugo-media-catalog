
-- Service-only product management; the webhook verifies the secret and private owner first.
create or replace function public.hmg_catalog_bot_products(p_query text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_query text:=btrim(coalesce(p_query,''));v_code text;v_result jsonb;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 if length(v_query)>180 or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'invalid search';end if;
 v_code:=regexp_replace(upper(v_query),'^HMG[- ]*','');
 with matches as (
  select p.*,row_number() over(order by p.id desc) n from public.hmg_catalog_products p
  where v_query='' or position(lower(v_query) in lower(p.name||' '||p.brand))>0
   or (v_code~'^[0-9]{1,15}$' and p.id::text=ltrim(v_code,'0'))
 ), page as (select * from matches where n>p_offset and n<=p_offset+7)
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price,'status',status,'specs',specs) order by id desc) filter(where n<=p_offset+6),'[]'::jsonb),'hasMore',coalesce(bool_or(n>p_offset+6),false)) into v_result from page;
 return v_result;
end $$;

create or replace function public.hmg_catalog_bot_product(p_id bigint)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_row jsonb;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 select to_jsonb(p) into v_row from public.hmg_catalog_products p where p.id=p_id;
 return jsonb_build_object('product',v_row,'fingerprint',md5(v_row::text));
end $$;

create or replace function public.hmg_catalog_bot_manage_commit(
 p_chat_id text,p_update_id bigint,p_version bigint,p_action text,p_product jsonb,p_reply jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_session hmg_private.hmg_bot_sessions;v_row public.hmg_catalog_products;v_result jsonb;
 v_id bigint;v_images text[];v_state jsonb;v_reply jsonb;v_required_step text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 if p_chat_id is null or p_chat_id!~'^[1-9][0-9]{0,15}$' or p_update_id is null or p_update_id<0
  or p_version is null or p_action is null or p_action not in ('update','delete')
  or jsonb_typeof(p_reply) is distinct from 'object' then raise exception 'invalid request';end if;
 select * into v_session from hmg_private.hmg_bot_sessions where chat_id=p_chat_id for update;
 if not found then raise exception 'session missing';end if;
 select result into v_result from hmg_private.hmg_bot_updates where update_id=p_update_id and chat_id=p_chat_id;
 if found then return v_result;end if;
 if v_session.version<>p_version then raise exception 'session changed' using errcode='40001';end if;
 v_required_step:=case when p_action='delete' then 'confirmDelete' else 'preview' end;
 if v_session.state->>'mode' is distinct from 'manage' or v_session.state->>'step' is distinct from v_required_step
  or coalesce(v_session.state->>'productId','')!~'^[1-9][0-9]{0,15}$'
  or coalesce(v_session.state->>'fingerprint','')!~'^[a-f0-9]{32} then raise exception 'product review required';end if;
 v_id:=(v_session.state->>'productId')::bigint;
 select * into v_row from public.hmg_catalog_products where id=v_id for update;
 if not found or md5(to_jsonb(v_row)::text) is distinct from v_session.state->>'fingerprint' then
  v_state:='{"step":"manageSearch"}'::jsonb;
  v_reply:=jsonb_build_object('text','Товар змінили в адмінці або видалили. Твої правки не перезаписали нові дані. Знайди та відкрий товар заново.','reply_markup',jsonb_build_object('keyboard',jsonb_build_array(jsonb_build_array('Останні товари'),jsonb_build_array('❌ Скасувати')),'resize_keyboard',true));
  return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,v_state,v_reply,null);
 end if;
 if p_action='delete' then
  if p_product is not null then raise exception 'unexpected product';end if;
  delete from public.hmg_catalog_products where id=v_id;
 else
  if jsonb_typeof(p_product) is distinct from 'object' or octet_length(p_product::text)>60000
   or jsonb_typeof(p_product->'specs') is distinct from 'object'
   or jsonb_typeof(p_product->'images') is distinct from 'array'
   or coalesce(length(btrim(p_product->>'name')),0) not between 1 and 180
   or coalesce(length(btrim(p_product->>'brand')),0) not between 1 and 80
   or p_product->>'status' is null or (p_product->>'status')::integer not between 0 and 5
   or p_product->>'cat' is null or (p_product->>'cat')::integer not between 0 and 6
   or p_product->>'price' is null or (p_product->>'price')::numeric<0 then raise exception 'invalid product';end if;
  select coalesce(array_agg(value),'{}'::text[]) into v_images from jsonb_array_elements_text(p_product->'images');
  if cardinality(v_images)>8 or (cardinality(v_images)=0 and (p_product->>'status')::integer<>3) then raise exception 'invalid photos';end if;
  if exists(select 1 from unnest(v_images) x where not(x=any(v_row.images)) and
   x !~ ('^telegram/'||(v_session.state->>'draftId')||'/[0-9]+[.](jpg|png|webp)$')) then raise exception 'invalid photo path';end if;
  update public.hmg_catalog_products set name=p_product->>'name',brand=p_product->>'brand',
   cat=(p_product->>'cat')::smallint,status=(p_product->>'status')::smallint,price=(p_product->>'price')::numeric,
   condition=coalesce(p_product->>'condition',''),warranty=coalesce(p_product->>'warranty',''),
   desc_uk=coalesce(p_product->>'desc_uk',''),desc_pl=coalesce(p_product->>'desc_pl',''),specs=p_product->'specs',images=v_images
  where id=v_id;
 end if;
 return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,'{}'::jsonb,p_reply,null);
end $$;
revoke all on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) to service_role;

  or coalesce(v_session.state->>'draftId','')!~'^[a-f0-9-]{36} then raise exception 'product review required';end if;
 v_id:=(v_session.state->>'productId')::bigint;
 select * into v_row from public.hmg_catalog_products where id=v_id for update;
 if not found or md5(to_jsonb(v_row)::text) is distinct from v_session.state->>'fingerprint' then
  v_state:='{"step":"manageSearch"}'::jsonb;
  v_reply:=jsonb_build_object('text','Товар змінили в адмінці або видалили. Твої правки не перезаписали нові дані. Знайди та відкрий товар заново.','reply_markup',jsonb_build_object('keyboard',jsonb_build_array(jsonb_build_array('Останні товари'),jsonb_build_array('❌ Скасувати')),'resize_keyboard',true));
  return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,v_state,v_reply,null);
 end if;
 if p_action='delete' then
  if p_product is not null then raise exception 'unexpected product';end if;
  delete from public.hmg_catalog_products where id=v_id;
 else
  if jsonb_typeof(p_product) is distinct from 'object' or octet_length(p_product::text)>60000
   or jsonb_typeof(p_product->'specs') is distinct from 'object'
   or jsonb_typeof(p_product->'images') is distinct from 'array'
   or coalesce(length(btrim(p_product->>'name')),0) not between 1 and 180
   or coalesce(length(btrim(p_product->>'brand')),0) not between 1 and 80
   or p_product->>'status' is null or (p_product->>'status')::integer not between 0 and 5
   or p_product->>'cat' is null or (p_product->>'cat')::integer not between 0 and 6
   or p_product->>'price' is null or (p_product->>'price')::numeric<0 then raise exception 'invalid product';end if;
  select coalesce(array_agg(value),'{}'::text[]) into v_images from jsonb_array_elements_text(p_product->'images');
  if cardinality(v_images)>8 or (cardinality(v_images)=0 and (p_product->>'status')::integer<>3) then raise exception 'invalid photos';end if;
  if exists(select 1 from unnest(v_images) x where not(x=any(v_row.images)) and
   x !~ ('^telegram/'||(v_session.state->>'draftId')||'/[0-9]+[.](jpg|png|webp)$')) then raise exception 'invalid photo path';end if;
  update public.hmg_catalog_products set name=p_product->>'name',brand=p_product->>'brand',
   cat=(p_product->>'cat')::smallint,status=(p_product->>'status')::smallint,price=(p_product->>'price')::numeric,
   condition=coalesce(p_product->>'condition',''),warranty=coalesce(p_product->>'warranty',''),
   desc_uk=coalesce(p_product->>'desc_uk',''),desc_pl=coalesce(p_product->>'desc_pl',''),specs=p_product->'specs',images=v_images
  where id=v_id;
 end if;
 return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,'{}'::jsonb,p_reply,null);
end $$;
revoke all on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) to service_role;
 then raise exception 'product review required';end if;
 v_id:=(v_session.state->>'productId')::bigint;
 select * into v_row from public.hmg_catalog_products where id=v_id for update;
 if not found or md5(to_jsonb(v_row)::text) is distinct from v_session.state->>'fingerprint' then
  v_state:='{"step":"manageSearch"}'::jsonb;
  v_reply:=jsonb_build_object('text','Товар змінили в адмінці або видалили. Твої правки не перезаписали нові дані. Знайди та відкрий товар заново.','reply_markup',jsonb_build_object('keyboard',jsonb_build_array(jsonb_build_array('Останні товари'),jsonb_build_array('❌ Скасувати')),'resize_keyboard',true));
  return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,v_state,v_reply,null);
 end if;
 if p_action='delete' then
  if p_product is not null then raise exception 'unexpected product';end if;
  delete from public.hmg_catalog_products where id=v_id;
 else
  if jsonb_typeof(p_product) is distinct from 'object' or octet_length(p_product::text)>60000
   or jsonb_typeof(p_product->'specs') is distinct from 'object'
   or jsonb_typeof(p_product->'images') is distinct from 'array'
   or coalesce(length(btrim(p_product->>'name')),0) not between 1 and 180
   or coalesce(length(btrim(p_product->>'brand')),0) not between 1 and 80
   or p_product->>'status' is null or (p_product->>'status')::integer not between 0 and 5
   or p_product->>'cat' is null or (p_product->>'cat')::integer not between 0 and 6
   or p_product->>'price' is null or (p_product->>'price')::numeric<0 then raise exception 'invalid product';end if;
  select coalesce(array_agg(value),'{}'::text[]) into v_images from jsonb_array_elements_text(p_product->'images');
  if cardinality(v_images)>8 or (cardinality(v_images)=0 and (p_product->>'status')::integer<>3) then raise exception 'invalid photos';end if;
  if exists(select 1 from unnest(v_images) x where not(x=any(v_row.images)) and
   x !~ ('^telegram/'||(v_session.state->>'draftId')||'/[0-9]+[.](jpg|png|webp)$')) then raise exception 'invalid photo path';end if;
  update public.hmg_catalog_products set name=p_product->>'name',brand=p_product->>'brand',
   cat=(p_product->>'cat')::smallint,status=(p_product->>'status')::smallint,price=(p_product->>'price')::numeric,
   condition=coalesce(p_product->>'condition',''),warranty=coalesce(p_product->>'warranty',''),
   desc_uk=coalesce(p_product->>'desc_uk',''),desc_pl=coalesce(p_product->>'desc_pl',''),specs=p_product->'specs',images=v_images
  where id=v_id;
 end if;
 return public.hmg_catalog_bot_commit(p_chat_id,p_update_id,p_version,'{}'::jsonb,p_reply,null);
end $$;
revoke all on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hmg_catalog_bot_products(text,integer),public.hmg_catalog_bot_product(bigint),
 public.hmg_catalog_bot_manage_commit(text,bigint,bigint,text,jsonb,jsonb) to service_role;
