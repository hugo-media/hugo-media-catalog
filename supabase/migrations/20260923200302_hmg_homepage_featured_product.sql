alter table public.hmg_catalog_settings add column homepage jsonb not null default '{}'::jsonb constraint hmg_catalog_settings_homepage_check check (jsonb_typeof(homepage)='object' and octet_length(homepage::text)<=2000);
notify pgrst, 'reload schema';
