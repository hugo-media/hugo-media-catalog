create or replace function public.hmg_catalog_analytics_report(p_days integer default 7)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_days integer;
  v_now timestamptz := statement_timestamp();
  v_current_start timestamptz;
  v_previous_start timestamptz;
  v_periods jsonb;
  v_current jsonb;
  v_previous jsonb;
  v_changes jsonb;
  v_top_source jsonb;
  v_top_product jsonb;
  v_weak_product jsonb;
  v_top_search text;
begin
  if not coalesce(public.hmg_catalog_is_admin(), false) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  v_days := case when p_days in (1, 7, 30) then p_days else 7 end;
  v_current_start :=
    (date_trunc('day', v_now at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw')
    - make_interval(days => v_days - 1);
  v_previous_start := v_current_start - make_interval(days => v_days);

  with periods(is_current) as (
    values (true), (false)
  ),
  scoped as materialized (
    select e.id, e.created_at, e.visitor_id, e.session_id, e.event_type,
      e.product_id, e.traffic_source, e.destination, e.placement,
      e.created_at >= v_current_start as is_current
    from public.hmg_catalog_events as e
    where e.created_at >= v_previous_start and e.created_at < v_now
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
      bool_or(e.event_type = 'telegram_click'
        and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact')) as has_contact
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
  where e.created_at >= v_current_start and e.created_at < v_now
    and e.event_type = 'page_view'
  group by coalesce(nullif(e.traffic_source, ''), 'direct')
  order by count(*) desc, coalesce(nullif(e.traffic_source, ''), 'direct')
  limit 1;

  select jsonb_build_array(e.product_id, count(*)::integer)
  into v_top_product
  from public.hmg_catalog_events as e
  where e.created_at >= v_current_start and e.created_at < v_now
    and e.event_type = 'product_view' and e.product_id is not null
  group by e.product_id
  order by count(*) desc, e.product_id
  limit 1;

  with session_funnel as (
    select e.product_id, e.session_id,
      bool_or(e.event_type = 'product_view') as viewed,
      bool_or(e.event_type = 'telegram_click'
        and e.destination in ('telegram_order', 'telegram_cart_order', 'telegram_contact')) as contacted,
      count(*) filter (where e.event_type = 'product_view')::integer as views
    from public.hmg_catalog_events as e
    where e.created_at >= v_current_start and e.created_at < v_now
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
  where e.created_at >= v_current_start and e.created_at < v_now
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
    'days', v_days,
    'current', v_current,
    'previous', v_previous,
    'changes', v_changes
  );
end;
$function$;

revoke all on function public.hmg_catalog_analytics_report(integer) from public;
revoke all on function public.hmg_catalog_analytics_report(integer) from anon;
grant execute on function public.hmg_catalog_analytics_report(integer) to authenticated;

comment on function public.hmg_catalog_analytics_report(integer)
is 'Returns admin-only analytics metrics, equal-length period comparisons, and concise product/search findings.';
