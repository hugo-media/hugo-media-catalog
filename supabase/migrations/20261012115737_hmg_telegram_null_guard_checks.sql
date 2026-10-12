create or replace function hmg_private.hmg_catalog_bot_authorize(p_secret text,p_chat_id text,p_user_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_secret text;v_chat text;v_token text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='hmg_catalog_telegram_webhook_secret';
 if p_secret is null or v_secret is null or p_secret<>v_secret then raise exception 'invalid webhook' using errcode='42501';end if;
 select decrypted_secret into v_chat from vault.decrypted_secrets where name='hmg_catalog_telegram_report_chat_id';
 if v_chat is null or p_chat_id is null or p_user_id is null or p_chat_id<>v_chat or p_user_id<>v_chat then return null;end if;
 select decrypted_secret into v_token from vault.decrypted_secrets where name='hmg_catalog_telegram_bot_token';
 return jsonb_build_object('token',v_token,'chatId',v_chat);
end $$;
create or replace function public.hmg_catalog_bot_commit(p_chat_id text,p_update_id bigint,p_version bigint,p_state jsonb,p_reply jsonb,p_product jsonb default null)
returns jsonb language plpgsql set search_path='' as $$
declare v_session hmg_private.hmg_bot_sessions;v_result jsonb;v_id bigint;v_images text[];
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 if p_update_id<0 or p_chat_id !~ '^[1-9][0-9]{0,15}$' or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>60000 then raise exception 'invalid update';end if;
 select * into v_session from hmg_private.hmg_bot_sessions where chat_id=p_chat_id for update;
 if not found then raise exception 'session missing';end if;
 select result into v_result from hmg_private.hmg_bot_updates where update_id=p_update_id and chat_id=p_chat_id;
 if found then return v_result;end if;
 if v_session.version<>p_version then raise exception 'session changed' using errcode='40001';end if;
 v_result:=jsonb_build_object('reply',p_reply);
 if p_product is not null then
  if v_session.state->>'step' is distinct from 'preview' or p_state is distinct from '{}'::jsonb then raise exception 'preview required';end if;
  select coalesce(array_agg(value),'{}'::text[]) into v_images from jsonb_array_elements_text(p_product->'images');
  if cardinality(v_images)<1 and (p_product->>'status')::smallint<>3 then raise exception 'photo required';end if;
  if exists(select 1 from unnest(v_images) v where v !~ '^telegram/[a-f0-9-]{36}/[0-9]+[.](jpg|png|webp)$') then raise exception 'invalid photo path';end if;
  insert into public.hmg_catalog_products(name,brand,cat,status,price,condition,warranty,desc_uk,desc_pl,specs,images)
  values(p_product->>'name',p_product->>'brand',(p_product->>'cat')::smallint,(p_product->>'status')::smallint,
   (p_product->>'price')::numeric,coalesce(p_product->>'condition',''),coalesce(p_product->>'warranty',''),
   coalesce(p_product->>'desc_uk',''),coalesce(p_product->>'desc_pl',''),p_product->'specs',v_images) returning id into v_id;
  v_result:=v_result||jsonb_build_object('productId',v_id,'draft',(p_product->>'status')::smallint=3);
 end if;
 update hmg_private.hmg_bot_sessions set state=p_state,version=version+1,updated_at=now() where chat_id=p_chat_id;
 insert into hmg_private.hmg_bot_updates(update_id,chat_id,result) values(p_update_id,p_chat_id,v_result);
 return v_result;
end $$;

