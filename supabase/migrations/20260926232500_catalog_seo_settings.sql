alter table public.hmg_catalog_settings add column if not exists seo jsonb not null default '{}'::jsonb;
do $$
begin
 if not exists(select 1 from pg_constraint where conname='hmg_catalog_settings_seo_check') then
  alter table public.hmg_catalog_settings add constraint hmg_catalog_settings_seo_check check(jsonb_typeof(seo)='object' and octet_length(seo::text)<=50000);
 end if;
end $$;
notify pgrst,'reload schema';
