-- Applied as catalog_search_no_results_events. Existing permissions and RLS are unchanged.
alter table public.hmg_catalog_events drop constraint hmg_catalog_events_event_type_check;
alter table public.hmg_catalog_events add constraint hmg_catalog_events_event_type_check check (event_type in ('page_view','product_view','telegram_click','catalog_click','cart_add','compare_add','bundle_select','search_no_results'));
