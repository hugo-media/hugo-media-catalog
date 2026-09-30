alter table public.hmg_catalog_products drop constraint hmg_catalog_products_status_check;

alter table public.hmg_catalog_products
  add constraint hmg_catalog_products_status_check
  check (status >= 0 and status <= 4);
