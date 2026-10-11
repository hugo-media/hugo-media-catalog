-- Read-only calendar and permission checks. Always roll back JWT/role state.
begin;
do $test$ begin
 if has_function_privilege('anon','public.hmg_catalog_analytics_date_window(date,date)','execute')
 or has_function_privilege('anon','public.hmg_catalog_analytics_date_report(date,date)','execute') then
  raise exception 'Calendar analytics exposed to anon';
 end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
end $test$;
set local role authenticated;
do $test$ begin
 begin
  perform public.hmg_catalog_analytics_date_window('2026-10-01','2026-10-05');
  raise exception 'Non-admin window allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.hmg_catalog_analytics_date_report('2026-10-01','2026-10-05');
  raise exception 'Non-admin report allowed';
 exception when insufficient_privilege then null; end;
end $test$;
reset role;
do $test$ begin
 perform set_config('request.jwt.claim.sub',(select user_id::text from public.hmg_catalog_admins limit 1),true);
end $test$;
set local role authenticated;
do $test$
declare
 w jsonb; r jsonb; n integer;
 today date:=(statement_timestamp() at time zone 'Europe/Warsaw')::date;
begin
 w:=public.hmg_catalog_analytics_date_window('2026-10-01','2026-10-05');
 if (w->>'since')::timestamptz<>'2026-09-30 22:00:00+00'::timestamptz
 or (w->>'until')::timestamptz<>'2026-10-05 22:00:00+00'::timestamptz
 or (w->>'days')::integer<>5 then raise exception 'Inclusive Warsaw dates incorrect'; end if;
 w:=public.hmg_catalog_analytics_date_window('2026-03-29','2026-03-29');
 if (w->>'until')::timestamptz-(w->>'since')::timestamptz<>interval '23 hours' then raise exception 'Spring DST incorrect'; end if;
 w:=public.hmg_catalog_analytics_date_window('2025-10-26','2025-10-26');
 if (w->>'until')::timestamptz-(w->>'since')::timestamptz<>interval '25 hours' then raise exception 'Autumn DST incorrect'; end if;
 w:=public.hmg_catalog_analytics_date_window(today,today);
 if (w->>'until')::timestamptz<>statement_timestamp()
 or (w->>'since')::timestamptz<>today::timestamp at time zone 'Europe/Warsaw' then raise exception 'Today cut-off incorrect'; end if;
 if (w->>'previousUntil')::timestamptz<>((statement_timestamp() at time zone 'Europe/Warsaw')-interval '1 day') at time zone 'Europe/Warsaw' then raise exception 'Comparison Warsaw clock incorrect'; end if;
 begin
  perform public.hmg_catalog_analytics_date_window(null,today);raise exception 'Null dates accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.hmg_catalog_analytics_date_window(today,today-1);raise exception 'Reversed dates accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.hmg_catalog_analytics_date_window(today,today+1);raise exception 'Future dates accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.hmg_catalog_analytics_date_window(today-366,today);raise exception 'Oversized range accepted';
 exception when invalid_parameter_value then null;end;
 w:=public.hmg_catalog_analytics_date_window('2026-10-01','2026-10-05');
 r:=public.hmg_catalog_analytics_date_report('2026-10-01','2026-10-05');
 select count(*) into n from public.hmg_catalog_events where event_type='page_view'
 and created_at >= (w->>'since')::timestamptz and created_at < (w->>'until')::timestamptz;
 if (r->'current'->>'pageViews')::integer<>n or r->>'fromDate'<>'2026-10-01' or r->>'toDate'<>'2026-10-05'
 or r->>'comparison'<>'complete_calendar_days' then raise exception 'Report period differs from event list'; end if;
end $test$;
reset role;
rollback;
