alter table public.hmg_catalog_products drop constraint hmg_catalog_products_status_check;
alter table public.hmg_catalog_products add constraint hmg_catalog_products_status_check check (status >= 0 and status <= 5);
alter policy hmg_public_products on public.hmg_catalog_products using (status = any (array[0, 1, 2, 4, 5]));
