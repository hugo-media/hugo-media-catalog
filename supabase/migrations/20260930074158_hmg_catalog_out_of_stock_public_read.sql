alter policy hmg_public_products on public.hmg_catalog_products
  using (status = any (array[0, 1, 2, 4]));
