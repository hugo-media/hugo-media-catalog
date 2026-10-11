-- Admin-only calendar periods, with inclusive dates in Europe/Warsaw.
-- Existing rolling-period and daily Telegram report functions remain compatible.
create or replace function public.hmg_catalog_analytics_date_window(p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_now timestamptz:=statement_timestamp();
 v_today date:=(v_now at time zone 'Europe/Warsaw')::date;
 v_days integer:=p_to-p_from+1;
 v_since timestamptz;
 v_until timestamptz;
begin
 if not coalesce(public.hmg_catalog_is_admin(),false) then
  raise exception 'admin access required' using errcode='42501';
 end if;
 if p_from is null or p_to is null or v_days<1 or v_days>366 or p_to>v_today then
  raise exception 'Choose ordered dates, at most 366 days, ending no later than today' using errcode='22023';
 end if;
 v_since:=p_from::timestamp at time zone 'Europe/Warsaw';
 v_until:=least((p_to+1)::timestamp at time zone 'Europe/Warsaw',v_now);
 return jsonb_build_object('since',v_since,'until',v_until,
  'previousSince',(p_from-v_days)::timestamp at time zone 'Europe/Warsaw',
  'previousUntil',((v_until at time zone 'Europe/Warsaw')-make_interval(days=>v_days)) at time zone 'Europe/Warsaw',
  'fromDate',p_from,'toDate',p_to,'days',v_days,'timezone','Europe/Warsaw',
  'comparison',case when p_to=v_today then 'same_warsaw_time' else 'complete_calendar_days' end);
end;
$function$;
revoke all on function public.hmg_catalog_analytics_date_window(date,date) from public,anon;
grant execute on function public.hmg_catalog_analytics_date_window(date,date) to authenticated;

create or replace function public.hmg_catalog_analytics_date_report(p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare
 v_window jsonb:=public.hmg_catalog_analytics_date_window(p_from,p_to);
begin
 return hmg_private.hmg_catalog_analytics_between(
  (v_window->>'since')::timestamptz,(v_window->>'until')::timestamptz,
  (v_window->>'previousSince')::timestamptz,(v_window->>'previousUntil')::timestamptz)
  || jsonb_build_object('fromDate',p_from,'toDate',p_to,'days',(v_window->>'days')::integer,
   'comparison',v_window->>'comparison');
end;
$function$;
revoke all on function public.hmg_catalog_analytics_date_report(date,date) from public,anon;
grant execute on function public.hmg_catalog_analytics_date_report(date,date) to authenticated;
notify pgrst, 'reload schema';
