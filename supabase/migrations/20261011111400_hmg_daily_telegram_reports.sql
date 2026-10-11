
-- Shared Warsaw-time windows. Private helpers are never callable anonymously.
create schema if not exists hmg_private;
revoke all on schema hmg_private from public, anon;
grant usage on schema hmg_private to authenticated, service_role;

create or replace function hmg_private.hmg_catalog_analytics_between(
 p_current_from timestamptz,p_current_until timestamptz,
 p_previous_from timestamptz,p_previous_until timestamptz)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_periods jsonb;v_current jsonb;v_previous jsonb;v_changes jsonb;
 v_top_source jsonb;v_top_product jsonb;v_weak_product jsonb;v_top_search text;
begin
 if not (coalesce(public.hmg_catalog_is_admin(),false)
   or coalesce(auth.jwt()->>'role','')='service_role') then
  raise exception 'admin access required' using errcode='42501';
 end if;
 if p_current_from>=p_current_until or p_previous_from>=p_previous_until
  or p_current_until-p_previous_from>interval '62 days' then
  raise exception 'invalid report window';
 end if;
  with periods(is_current) as (
    values (true), (false)
  ),
  scoped as materialized (
    select e.id, e.created_at, e.visitor_id, e.session_id, e.event_type,
      e.product_id, e.traffic_source, e.destination, e.placement,
      e.created_at >= p_current_from as is_current
    from public.hmg_catalog_events as e
    where (e.created_at >= p_previous_from and e.created_at < p_previous_until)
       or (e.created_at >= p_current_from and e.created_at < p_current_until)
  ),
  events_by_period as (
    select p.is_current,
      count(e.id) filter (where e.event_type = 'page_view')::integer as page_views,
      count(distinct e.visitor_id) filter (where e.event_type = 'page_view')::integer as visitors,
      count(e.id) filter (where e.event_type = 'product_view')::integer as product_views,
      count(e.id) filter (where e.event_type = 'cart_add')::integer as cart_adds,
      count(e.id) filter (
        where e.event_type = 'telegram_click'
          and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact')
      )::integer as contact_clicks,
      count(e.id) filter (where e.event_type = 'search_no_results')::integer as no_result_searches
    from periods as p
    left join scoped as e on e.is_current = p.is_current
    group by p.is_current
  ),
  session_events as (
    select e.is_current, e.session_id,
      bool_or(e.event_type = 'product_view') as has_product_view,
      max(e.created_at) filter (where e.event_type = 'telegram_click'
        and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact'))
        >= min(e.created_at) filter (where e.event_type = 'product_view') as has_contact
    from scoped as e
    where e.session_id is not null
    group by e.is_current, e.session_id
  ),
  journeys_by_period as (
    select p.is_current,
      count(s.session_id) filter (where s.has_product_view)::integer as product_sessions,
      count(s.session_id) filter (where s.has_product_view and s.has_contact)::integer as product_contact_sessions
    from periods as p
    left join session_events as s on s.is_current = p.is_current
    group by p.is_current
  )
  select jsonb_object_agg(
    case when e.is_current then 'current' else 'previous' end,
    jsonb_build_object(
      'pageViews', e.page_views,
      'visitors', e.visitors,
      'productViews', e.product_views,
      'cartAdds', e.cart_adds,
      'contactClicks', e.contact_clicks,
      'productSessions', j.product_sessions,
      'contactSessions', j.product_contact_sessions,
      'noResultSearches', e.no_result_searches
    )
  )
  into v_periods
  from events_by_period as e
  join journeys_by_period as j using (is_current);

  v_current := v_periods -> 'current';
  v_previous := v_periods -> 'previous';

  select jsonb_build_array(coalesce(nullif(e.traffic_source, ''), 'direct'), count(*)::integer)
  into v_top_source
  from public.hmg_catalog_events as e
  where e.created_at >= p_current_from and e.created_at < p_current_until
    and e.event_type = 'page_view'
  group by coalesce(nullif(e.traffic_source, ''), 'direct')
  order by count(*) desc, coalesce(nullif(e.traffic_source, ''), 'direct')
  limit 1;

  select jsonb_build_array(e.product_id, count(*)::integer)
  into v_top_product
  from public.hmg_catalog_events as e
  where e.created_at >= p_current_from and e.created_at < p_current_until
    and e.event_type = 'product_view' and e.product_id is not null
  group by e.product_id
  order by count(*) desc, e.product_id
  limit 1;

  with session_funnel as (
    select e.product_id, e.session_id,
      bool_or(e.event_type = 'product_view') as viewed,
      max(e.created_at) filter (where e.event_type = 'telegram_click'
        and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact'))
        >= min(e.created_at) filter (where e.event_type = 'product_view') as contacted,
      count(*) filter (where e.event_type = 'product_view')::integer as views
    from public.hmg_catalog_events as e
    where e.created_at >= p_current_from and e.created_at < p_current_until
      and e.product_id is not null and e.session_id is not null
      and (
        e.event_type = 'product_view'
        or (e.event_type = 'telegram_click'
          and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact'))
      )
    group by e.product_id, e.session_id
  ),
  product_funnel as (
    select f.product_id, sum(f.views)::integer as views,
      count(*) filter (where f.viewed)::integer as sessions,
      count(*) filter (where f.viewed and f.contacted)::integer as contacts,
      round(
        100.0 * count(*) filter (where f.viewed and f.contacted)
        / nullif(count(*) filter (where f.viewed), 0)
      )::integer as rate
    from session_funnel as f
    group by f.product_id
  )
  select jsonb_build_object(
    'id', f.product_id, 'views', f.views, 'sessions', f.sessions,
    'contactSessions', f.contacts, 'rate', f.rate
  )
  into v_weak_product
  from product_funnel as f
  where f.sessions >= 5 and f.rate < 5
  order by f.rate asc, f.sessions desc, f.product_id
  limit 1;

  select lower(regexp_replace(trim(e.destination), '[[:space:]]+', ' ', 'g'))
  into v_top_search
  from public.hmg_catalog_events as e
  where e.created_at >= p_current_from and e.created_at < p_current_until
    and e.event_type = 'search_no_results'
    and char_length(trim(e.destination)) between 2 and 80
    and e.destination !~* '(@|https?://|www[.]|[0-9][0-9[:space:]()+.-]{7,}[0-9])'
  group by lower(regexp_replace(trim(e.destination), '[[:space:]]+', ' ', 'g'))
  order by count(*) desc, lower(regexp_replace(trim(e.destination), '[[:space:]]+', ' ', 'g'))
  limit 1;

  v_current := v_current || jsonb_build_object(
    'topSource', v_top_source,
    'topProduct', v_top_product,
    'weakProduct', v_weak_product,
    'topSearch', v_top_search
  );

  v_changes := jsonb_build_object(
    'visitors', case when (v_previous ->> 'visitors')::integer = 0
      then case when (v_current ->> 'visitors')::integer = 0 then 0 else null end
      else round(100.0 * ((v_current ->> 'visitors')::integer - (v_previous ->> 'visitors')::integer)
        / (v_previous ->> 'visitors')::integer)::integer end,
    'pageViews', case when (v_previous ->> 'pageViews')::integer = 0
      then case when (v_current ->> 'pageViews')::integer = 0 then 0 else null end
      else round(100.0 * ((v_current ->> 'pageViews')::integer - (v_previous ->> 'pageViews')::integer)
        / (v_previous ->> 'pageViews')::integer)::integer end,
    'productViews', case when (v_previous ->> 'productViews')::integer = 0
      then case when (v_current ->> 'productViews')::integer = 0 then 0 else null end
      else round(100.0 * ((v_current ->> 'productViews')::integer - (v_previous ->> 'productViews')::integer)
        / (v_previous ->> 'productViews')::integer)::integer end,
    'contactClicks', case when (v_previous ->> 'contactClicks')::integer = 0
      then case when (v_current ->> 'contactClicks')::integer = 0 then 0 else null end
      else round(100.0 * ((v_current ->> 'contactClicks')::integer - (v_previous ->> 'contactClicks')::integer)
        / (v_previous ->> 'contactClicks')::integer)::integer end,
    'cartAdds', case when (v_previous ->> 'cartAdds')::integer = 0
      then case when (v_current ->> 'cartAdds')::integer = 0 then 0 else null end
      else round(100.0 * ((v_current ->> 'cartAdds')::integer - (v_previous ->> 'cartAdds')::integer)
        / (v_previous ->> 'cartAdds')::integer)::integer end
  );

  return jsonb_build_object(
    'period', jsonb_build_object('from',p_current_from,'to',p_current_until,
      'previousFrom',p_previous_from,'previousTo',p_previous_until,'timezone','Europe/Warsaw'),
    'current', v_current,
    'previous', v_previous,
    'changes', v_changes
  );
end;
$function$;
revoke all on function hmg_private.hmg_catalog_analytics_between(timestamptz,timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function hmg_private.hmg_catalog_analytics_between(timestamptz,timestamptz,timestamptz,timestamptz) to authenticated,service_role;

create or replace function public.hmg_catalog_analytics_window(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_days integer:=case when p_days in (1,7,30) then p_days else 7 end;
 v_until timestamptz:=statement_timestamp();
 v_local timestamp:=date_trunc('day',v_until at time zone 'Europe/Warsaw');
begin
 if not coalesce(public.hmg_catalog_is_admin(),false) then
  raise exception 'admin access required' using errcode='42501';
 end if;
 return jsonb_build_object('since',(v_local-make_interval(days=>v_days-1)) at time zone 'Europe/Warsaw',
  'until',v_until,'timezone','Europe/Warsaw');
end;
$function$;
revoke all on function public.hmg_catalog_analytics_window(integer) from public,anon;
grant execute on function public.hmg_catalog_analytics_window(integer) to authenticated;

create or replace function public.hmg_catalog_analytics_report(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_days integer:=case when p_days in (1,7,30) then p_days else 7 end;
 v_until timestamptz:=statement_timestamp();
 v_local timestamp:=v_until at time zone 'Europe/Warsaw';
 v_start timestamp:=date_trunc('day',v_local)-make_interval(days=>v_days-1);
begin
 if not coalesce(public.hmg_catalog_is_admin(),false) then
  raise exception 'admin access required' using errcode='42501';
 end if;
 return hmg_private.hmg_catalog_analytics_between(
  v_start at time zone 'Europe/Warsaw',v_until,
  (v_start-make_interval(days=>v_days)) at time zone 'Europe/Warsaw',
  (v_local-make_interval(days=>v_days)) at time zone 'Europe/Warsaw')
  || jsonb_build_object('days',v_days,'comparison','same_warsaw_time');
end;
$function$;
revoke all on function public.hmg_catalog_analytics_report(integer) from public,anon;
grant execute on function public.hmg_catalog_analytics_report(integer) to authenticated;

create or replace function public.hmg_catalog_daily_report(p_report_date date default null)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_today date:=(statement_timestamp() at time zone 'Europe/Warsaw')::date;
 v_date date:=coalesce(p_report_date,v_today-1);
 v_report jsonb;
 v_top_name text;v_weak_name text;
begin
 if not (coalesce(public.hmg_catalog_is_admin(),false)
   or coalesce(auth.jwt()->>'role','')='service_role') then
  raise exception 'admin access required' using errcode='42501';
 end if;
 if v_date>=v_today or v_date<v_today-7 then raise exception 'completed recent days only';end if;
 v_report:=hmg_private.hmg_catalog_analytics_between(
  v_date::timestamp at time zone 'Europe/Warsaw',(v_date+1)::timestamp at time zone 'Europe/Warsaw',
  (v_date-1)::timestamp at time zone 'Europe/Warsaw',v_date::timestamp at time zone 'Europe/Warsaw');
 select name into v_top_name from public.hmg_catalog_products where id=(v_report#>>'{current,topProduct,0}')::bigint;
 select name into v_weak_name from public.hmg_catalog_products where id=(v_report#>>'{current,weakProduct,id}')::bigint;
 return v_report || jsonb_build_object('days',1,'reportDate',v_date,'completed',true,
  'productNames',jsonb_build_object('top',v_top_name,'weak',v_weak_name));
end;
$function$;
revoke all on function public.hmg_catalog_daily_report(date) from public,anon;
grant execute on function public.hmg_catalog_daily_report(date) to authenticated,service_role;

-- Tokens and recipient IDs live only in Vault. No API ever returns them to an admin.
create table if not exists hmg_private.hmg_catalog_report_config(
 id smallint primary key default 1 check(id=1),
 enabled boolean not null default false,
 first_report_date date,
 recipient_verified_at timestamptz,
 bot_username text,
 updated_at timestamptz not null default now()
);
alter table hmg_private.hmg_catalog_report_config enable row level security;
revoke all on hmg_private.hmg_catalog_report_config from public,anon,authenticated;
grant select,update on hmg_private.hmg_catalog_report_config to service_role;
insert into hmg_private.hmg_catalog_report_config(id) values(1) on conflict(id) do nothing;

create table if not exists public.hmg_catalog_report_deliveries(
 report_date date primary key,
 status text not null default 'pending' check(status in ('pending','preparing','sending','sent','retry','failed','uncertain')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 lease_id uuid,
 lease_until timestamptz,
 next_attempt_at timestamptz,
 last_error text check(last_error is null or last_error ~ '^[a-z0-9_]{1,80}$'),
 telegram_message_id bigint,
 sent_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.hmg_catalog_report_deliveries enable row level security;
revoke all on public.hmg_catalog_report_deliveries from public,anon,authenticated;
grant select on public.hmg_catalog_report_deliveries to authenticated;
grant select,insert,update on public.hmg_catalog_report_deliveries to service_role;
create policy hmg_report_owner_read on public.hmg_catalog_report_deliveries for select to authenticated
 using((select public.hmg_catalog_is_owner()));
create index if not exists hmg_catalog_report_pending_idx on public.hmg_catalog_report_deliveries(status,next_attempt_at)
 where status in ('pending','retry','preparing','sending');

create or replace function hmg_private.hmg_catalog_telegram_report_settings()
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_config hmg_private.hmg_catalog_report_config;v_last jsonb;v_count integer;
begin
 if auth.uid() is null or not coalesce(public.hmg_catalog_is_admin(),false) then
  raise exception 'admin access required' using errcode='42501';
 end if;
 select * into v_config from hmg_private.hmg_catalog_report_config where id=1;
 select count(*) into v_count from vault.secrets where name in ('hmg_catalog_telegram_bot_token','hmg_catalog_telegram_report_chat_id');
 select jsonb_build_object('reportDate',report_date,'status',status,'attempts',attempts,
   'lastError',last_error,'sentAt',sent_at,'updatedAt',updated_at) into v_last
  from public.hmg_catalog_report_deliveries order by report_date desc limit 1;
 return jsonb_build_object('canConfigure',coalesce(public.hmg_catalog_is_owner(),false),
  'configured',v_count=2,'enabled',v_config.enabled,'botUsername',v_config.bot_username,
  'recipientVerified',v_config.recipient_verified_at is not null,
  'lastDelivery',v_last,'timezone','Europe/Warsaw','hour',9,
  'firstReportDate',v_config.first_report_date);
end;
$function$;
revoke all on function hmg_private.hmg_catalog_telegram_report_settings() from public,anon;
grant execute on function hmg_private.hmg_catalog_telegram_report_settings() to authenticated;
create or replace function public.hmg_catalog_telegram_report_settings()
returns jsonb language sql stable security invoker set search_path=''
as $$ select hmg_private.hmg_catalog_telegram_report_settings(); $$;
revoke all on function public.hmg_catalog_telegram_report_settings() from public,anon;
grant execute on function public.hmg_catalog_telegram_report_settings() to authenticated;

create or replace function hmg_private.hmg_catalog_save_telegram_report_settings(
 p_token text default null,p_chat_id text default null,p_enabled boolean default false)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_id uuid;v_count integer;v_config hmg_private.hmg_catalog_report_config;
begin
 if auth.uid() is null or not coalesce(public.hmg_catalog_is_owner(),false) then
  raise exception 'owner access required' using errcode='42501';
 end if;
 select * into v_config from hmg_private.hmg_catalog_report_config where id=1 for update;
 p_token:=nullif(trim(p_token),'');p_chat_id:=nullif(trim(p_chat_id),'');
 if p_token is not null then
  if p_token !~ '^[0-9]{1,16}:[A-Za-z0-9_-]{20,100}$' then raise exception 'invalid bot token';end if;
  select id into v_id from vault.secrets where name='hmg_catalog_telegram_bot_token';
  if v_id is null then perform vault.create_secret(p_token,'hmg_catalog_telegram_bot_token');
   else perform vault.update_secret(v_id,p_token);end if;
 end if;
 if p_chat_id is not null then
  if p_chat_id !~ '^[1-9][0-9]{0,15}$' then raise exception 'private chat id required';end if;
  select id into v_id from vault.secrets where name='hmg_catalog_telegram_report_chat_id';
  if v_id is null then perform vault.create_secret(p_chat_id,'hmg_catalog_telegram_report_chat_id');
   else perform vault.update_secret(v_id,p_chat_id);end if;
 end if;
 select count(*) into v_count from vault.secrets where name in ('hmg_catalog_telegram_bot_token','hmg_catalog_telegram_report_chat_id');
 if coalesce(p_enabled,false) and v_count<>2 then raise exception 'bot and private chat required';end if;
 if p_token is not null or p_chat_id is not null then
  update public.hmg_catalog_report_deliveries set status='pending',attempts=0,last_error=null,next_attempt_at=null,updated_at=now()
   where status='failed';
 end if;
 update hmg_private.hmg_catalog_report_config set
  enabled=coalesce(p_enabled,false),
  first_report_date=case when coalesce(p_enabled,false) and not v_config.enabled
   then (statement_timestamp() at time zone 'Europe/Warsaw')::date-1 else first_report_date end,
  recipient_verified_at=case when p_token is not null or p_chat_id is not null then null else recipient_verified_at end,
  bot_username=case when p_token is not null then null else bot_username end,
  updated_at=now() where id=1;
 return hmg_private.hmg_catalog_telegram_report_settings();
end;
$function$;
revoke all on function hmg_private.hmg_catalog_save_telegram_report_settings(text,text,boolean) from public,anon;
grant execute on function hmg_private.hmg_catalog_save_telegram_report_settings(text,text,boolean) to authenticated;
create or replace function public.hmg_catalog_save_telegram_report_settings(
 p_token text default null,p_chat_id text default null,p_enabled boolean default false)
returns jsonb language sql security invoker set search_path=''
as $$ select hmg_private.hmg_catalog_save_telegram_report_settings(p_token,p_chat_id,p_enabled); $$;
revoke all on function public.hmg_catalog_save_telegram_report_settings(text,text,boolean) from public,anon;
grant execute on function public.hmg_catalog_save_telegram_report_settings(text,text,boolean) to authenticated;

-- Service-only gateway: shared cron secret verified inside the private schema.
create or replace function hmg_private.hmg_catalog_report_credentials(p_cron_secret text default null,p_owner_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_secret text;v_token text;v_chat text;v_config hmg_private.hmg_catalog_report_config;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then
  raise exception 'service access required' using errcode='42501';
 end if;
 if p_owner_id is not null then
  if not exists(select 1 from public.hmg_catalog_admins where user_id=p_owner_id and role='owner') then
   raise exception 'owner access required' using errcode='42501';end if;
 else
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='hmg_catalog_report_cron_secret';
  if p_cron_secret is null or v_secret is null or p_cron_secret<>v_secret then raise exception 'invalid cron authorization' using errcode='42501';end if;
 end if;
 select * into v_config from hmg_private.hmg_catalog_report_config where id=1;
 select decrypted_secret into v_token from vault.decrypted_secrets where name='hmg_catalog_telegram_bot_token';
 select decrypted_secret into v_chat from vault.decrypted_secrets where name='hmg_catalog_telegram_report_chat_id';
 return jsonb_build_object('enabled',v_config.enabled,'configured',v_token is not null and v_chat is not null,
  'token',v_token,'chatId',v_chat,'firstReportDate',v_config.first_report_date,'updatedAt',v_config.updated_at);
end;
$function$;
revoke all on function hmg_private.hmg_catalog_report_credentials(text,uuid) from public,anon,authenticated;
grant execute on function hmg_private.hmg_catalog_report_credentials(text,uuid) to service_role;
create or replace function public.hmg_catalog_report_credentials(p_cron_secret text default null,p_owner_id uuid default null)
returns jsonb language sql stable security invoker set search_path=''
as $$ select hmg_private.hmg_catalog_report_credentials(p_cron_secret,p_owner_id); $$;
revoke all on function public.hmg_catalog_report_credentials(text,uuid) from public,anon,authenticated;
grant execute on function public.hmg_catalog_report_credentials(text,uuid) to service_role;


create or replace function public.hmg_catalog_report_recipient_verified(p_config_updated_at timestamptz,p_bot_username text default null)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if p_bot_username is not null and p_bot_username !~ '^[A-Za-z0-9_]{5,32}$' then raise exception 'invalid bot username';end if;
 update hmg_private.hmg_catalog_report_config set recipient_verified_at=now(),bot_username=p_bot_username
  where id=1 and updated_at=p_config_updated_at;
 get diagnostics v_count=row_count;return v_count=1;
end;
$function$;
revoke all on function public.hmg_catalog_report_recipient_verified(timestamptz,text) from public,anon,authenticated;
grant execute on function public.hmg_catalog_report_recipient_verified(timestamptz,text) to service_role;

create or replace function public.hmg_catalog_claim_daily_report()
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare
 v_today date:=(statement_timestamp() at time zone 'Europe/Warsaw')::date;
 v_start date;v_enabled boolean;v_date date;v_claim public.hmg_catalog_report_deliveries;
begin
 select enabled,first_report_date into v_enabled,v_start from hmg_private.hmg_catalog_report_config where id=1;
 if not coalesce(v_enabled,false) or v_start is null then return null;end if;
 -- A crashed request after starting Telegram must never be resent blindly.
 update public.hmg_catalog_report_deliveries set status='uncertain',last_error='delivery_unknown',lease_until=null,updated_at=now()
  where status='sending' and lease_until<now();
 update public.hmg_catalog_report_deliveries set status='retry',last_error='preparation_interrupted',
  lease_until=null,next_attempt_at=now(),updated_at=now()
  where status='preparing' and lease_until<now() and attempts<5;
 update public.hmg_catalog_report_deliveries set status='failed',last_error='attempt_limit',lease_until=null,updated_at=now()
  where status='preparing' and lease_until<now() and attempts>=5;
 insert into public.hmg_catalog_report_deliveries(report_date)
  select d::date from generate_series(greatest(v_start,v_today-7)::timestamp,(v_today-1)::timestamp,interval '1 day') d
  on conflict(report_date) do nothing;
 select report_date into v_date from public.hmg_catalog_report_deliveries
  where report_date>=greatest(v_start,v_today-7) and report_date<v_today and attempts<5
   and status in ('pending','retry') and (next_attempt_at is null or next_attempt_at<=now())
  order by report_date for update skip locked limit 1;
 if v_date is null then return null;end if;
 update public.hmg_catalog_report_deliveries set status='preparing',attempts=attempts+1,
  lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',next_attempt_at=null,last_error=null,updated_at=now()
  where report_date=v_date returning * into v_claim;
 return jsonb_build_object('reportDate',v_claim.report_date,'leaseId',v_claim.lease_id,'attempts',v_claim.attempts);
end;
$function$;
revoke all on function public.hmg_catalog_claim_daily_report() from public,anon,authenticated;
grant execute on function public.hmg_catalog_claim_daily_report() to service_role;

create or replace function public.hmg_catalog_finish_daily_report(
 p_report_date date,p_lease_id uuid,p_status text,p_error text default null,
 p_message_id bigint default null,p_retry_after integer default 900,p_config_updated_at timestamptz default null)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if p_status='sending' and not exists(select 1 from hmg_private.hmg_catalog_report_config
  where id=1 and enabled and updated_at=p_config_updated_at) then return false;end if;
 if p_status not in ('sending','sent','retry','failed','uncertain') then raise exception 'invalid delivery status';end if;
 if p_error is not null and p_error !~ '^[a-z0-9_]{1,80}$' then raise exception 'invalid delivery error';end if;
 update public.hmg_catalog_report_deliveries set status=case when p_status='retry' and attempts>=5 then 'failed' else p_status end,
  last_error=p_error,telegram_message_id=coalesce(p_message_id,telegram_message_id),
  sent_at=case when p_status='sent' then now() else sent_at end,
  lease_until=case when p_status='sending' then now()+interval '5 minutes' else null end,
  next_attempt_at=case when p_status='retry' and attempts<5 then now()+make_interval(secs=>greatest(60,least(coalesce(p_retry_after,900),86400))) else null end,
  updated_at=now()
  where report_date=p_report_date and lease_id=p_lease_id
   and status in ('preparing','sending') and lease_until>now()
   and (p_status<>'sending' or status='preparing');
 get diagnostics v_count=row_count;
 return v_count=1;
end;
$function$;
revoke all on function public.hmg_catalog_finish_daily_report(date,uuid,text,text,bigint,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.hmg_catalog_finish_daily_report(date,uuid,text,text,bigint,integer,timestamptz) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net;
-- pg_net queues contain authorization headers; keep transport metadata server-only.
revoke select on net.http_request_queue,net._http_response from public,anon,authenticated;
do $$
begin
 if not exists(select 1 from vault.secrets where name='hmg_catalog_report_cron_secret') then
  perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'hmg_catalog_report_cron_secret');
 end if;
end;$$;
create or replace function hmg_private.hmg_catalog_invoke_daily_report()
returns bigint language plpgsql security invoker set search_path=''
as $function$
declare v_today date:=(now() at time zone 'Europe/Warsaw')::date;v_start date;v_enabled boolean;v_secret text;
begin
 if extract(hour from now() at time zone 'Europe/Warsaw')<9 then return null;end if;
 select enabled,first_report_date into v_enabled,v_start from hmg_private.hmg_catalog_report_config where id=1;
 if not coalesce(v_enabled,false) or v_start is null then return null;end if;
 if not exists(
  select 1 from generate_series(greatest(v_start,v_today-7)::timestamp,(v_today-1)::timestamp,interval '1 day') d
  left join public.hmg_catalog_report_deliveries r on r.report_date=d::date
  where r.report_date is null or (r.status in ('pending','retry') and r.attempts<5 and (r.next_attempt_at is null or r.next_attempt_at<=now()))
   or (r.status in ('preparing','sending') and r.lease_until<now())
 ) then return null;end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='hmg_catalog_report_cron_secret';
 return net.http_post(
  url:='https://lukxdctqcaprfwfisblw.supabase.co/functions/v1/hmg-daily-report',
  headers:=jsonb_build_object('Content-Type','application/json','X-HMG-Cron-Secret',v_secret),
  body:='{"action":"scheduled"}'::jsonb,timeout_milliseconds:=15000);
end;
$function$;
revoke all on function hmg_private.hmg_catalog_invoke_daily_report() from public,anon,authenticated,service_role;
select cron.schedule('hmg-catalog-daily-telegram-report','*/15 * * * *',
 $$select hmg_private.hmg_catalog_invoke_daily_report();$$);
