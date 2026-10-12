
create table hmg_private.hmg_bot_sessions (
 chat_id text primary key, version bigint not null default 0,
 state jsonb not null default '{}'::jsonb check(jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
create table hmg_private.hmg_bot_updates (
 update_id bigint primary key, chat_id text not null,
 result jsonb not null, delivered_at timestamptz, created_at timestamptz not null default now()
);
alter table hmg_private.hmg_bot_sessions enable row level security;
alter table hmg_private.hmg_bot_updates enable row level security;
revoke all on hmg_private.hmg_bot_sessions,hmg_private.hmg_bot_updates from public,anon,authenticated;
grant select,insert,update on hmg_private.hmg_bot_sessions,hmg_private.hmg_bot_updates to service_role;

create function hmg_private.hmg_catalog_bot_authorize(p_secret text,p_chat_id text,p_user_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_secret text;v_chat text;v_token text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='hmg_catalog_telegram_webhook_secret';
 if p_secret is null or v_secret is null or p_secret<>v_secret then raise exception 'invalid webhook' using errcode='42501';end if;
 select decrypted_secret into v_chat from vault.decrypted_secrets where name='hmg_catalog_telegram_report_chat_id';
 if p_chat_id is null or p_user_id is null or p_chat_id<>v_chat or p_user_id<>v_chat then return null;end if;
 select decrypted_secret into v_token from vault.decrypted_secrets where name='hmg_catalog_telegram_bot_token';
 return jsonb_build_object('token',v_token,'chatId',v_chat);
end $$;
revoke all on function hmg_private.hmg_catalog_bot_authorize(text,text,text) from public,anon,authenticated;
grant execute on function hmg_private.hmg_catalog_bot_authorize(text,text,text) to service_role;

create function public.hmg_catalog_bot_authorize(p_secret text,p_chat_id text,p_user_id text)
returns jsonb language sql stable set search_path='' as $$
 select hmg_private.hmg_catalog_bot_authorize(p_secret,p_chat_id,p_user_id);
$$;

create function public.hmg_catalog_bot_context(p_chat_id text,p_update_id bigint)
returns jsonb language plpgsql set search_path='' as $$
declare v_session hmg_private.hmg_bot_sessions;v_update hmg_private.hmg_bot_updates;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 select * into v_update from hmg_private.hmg_bot_updates where update_id=p_update_id and chat_id=p_chat_id;
 if found then return jsonb_build_object('duplicate',true,'delivered',v_update.delivered_at is not null,'result',v_update.result);end if;
 insert into hmg_private.hmg_bot_sessions(chat_id) values(p_chat_id) on conflict do nothing;
 select * into v_session from hmg_private.hmg_bot_sessions where chat_id=p_chat_id;
 return jsonb_build_object('version',v_session.version,'state',v_session.state);
end $$;

create function public.hmg_catalog_bot_commit(p_chat_id text,p_update_id bigint,p_version bigint,p_state jsonb,p_reply jsonb,p_product jsonb default null)
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
  if v_session.state->>'step'<>'preview' or p_state<>'{}'::jsonb then raise exception 'preview required';end if;
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

create function public.hmg_catalog_bot_delivered(p_chat_id text,p_update_id bigint)
returns void language sql set search_path='' as $$
 update hmg_private.hmg_bot_updates set delivered_at=coalesce(delivered_at,now()) where chat_id=p_chat_id and update_id=p_update_id;
$$;

create function public.hmg_catalog_bot_report(p_period text default 'today')
returns jsonb language plpgsql stable set search_path='' as $$
declare v_today date:=(statement_timestamp() at time zone 'Europe/Warsaw')::date;
 v_from date;v_to date;v_days integer;v_report jsonb;v_until timestamptz;v_previous_until timestamptz;v_top text;v_weak text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service access required' using errcode='42501';end if;
 if p_period not in ('today','yesterday','7','30') then raise exception 'invalid period';end if;
 v_days:=case when p_period in ('today','yesterday') then 1 else p_period::integer end;
 v_from:=case when p_period='today' then v_today else v_today-v_days end;
 v_to:=case when p_period='today' then v_today else v_today-1 end;
 v_until:=case when p_period='today' then statement_timestamp() else v_today::timestamp at time zone 'Europe/Warsaw' end;
 v_previous_until:=case when p_period='today' then ((statement_timestamp() at time zone 'Europe/Warsaw')-interval '1 day') at time zone 'Europe/Warsaw' else v_from::timestamp at time zone 'Europe/Warsaw' end;
 v_report:=hmg_private.hmg_catalog_analytics_between(v_from::timestamp at time zone 'Europe/Warsaw',v_until,
  (v_from-v_days)::timestamp at time zone 'Europe/Warsaw',v_previous_until);
 select name into v_top from public.hmg_catalog_products where id=(v_report#>>'{current,topProduct,0}')::bigint;
 select name into v_weak from public.hmg_catalog_products where id=(v_report#>>'{current,weakProduct,id}')::bigint;
 return v_report||jsonb_build_object('fromDate',v_from,'toDate',v_to,'partial',p_period='today','periodKey',p_period,
  'generatedAt',to_char(statement_timestamp() at time zone 'Europe/Warsaw','HH24:MI'),
  'productNames',jsonb_build_object('top',v_top,'weak',v_weak));
end $$;

revoke all on function public.hmg_catalog_bot_authorize(text,text,text),public.hmg_catalog_bot_context(text,bigint),
 public.hmg_catalog_bot_commit(text,bigint,bigint,jsonb,jsonb,jsonb),public.hmg_catalog_bot_delivered(text,bigint),
 public.hmg_catalog_bot_report(text) from public,anon,authenticated;
grant execute on function public.hmg_catalog_bot_authorize(text,text,text),public.hmg_catalog_bot_context(text,bigint),
 public.hmg_catalog_bot_commit(text,bigint,bigint,jsonb,jsonb,jsonb),public.hmg_catalog_bot_delivered(text,bigint),
 public.hmg_catalog_bot_report(text) to service_role;
