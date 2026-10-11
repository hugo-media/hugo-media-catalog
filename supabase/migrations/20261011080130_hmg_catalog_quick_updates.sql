-- Atomic quick edits. Existing RLS, product audit and version triggers still apply.
create or replace function public.hmg_catalog_quick_update(p_changes jsonb)
returns setof public.hmg_catalog_products
language plpgsql security invoker set search_path = ''
as $$
declare
 item jsonb; fields jsonb; key text; value jsonb; n numeric;
 ids bigint[] := '{}'; id_value bigint; expected timestamptz;
 product public.hmg_catalog_products%rowtype;
 result public.hmg_catalog_products%rowtype;
 new_specs jsonb; new_price numeric; new_status integer; processed integer := 0;
begin
 if not coalesce(public.hmg_catalog_is_admin(), false) then
  raise exception 'notAdmin' using errcode = '42501';
 end if;
 if p_changes is null or jsonb_typeof(p_changes) <> 'array' then raise exception 'validation'; end if;
 if jsonb_array_length(p_changes) not between 1 and 100 then raise exception 'validation'; end if;
 for item in select v from jsonb_array_elements(p_changes) as a(v) loop
  if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'number'
     or jsonb_typeof(item->'expected_updated_at') is distinct from 'string' then raise exception 'validation'; end if;
  n := (item->>'id')::numeric;
  if n <> trunc(n) or n not between 1 and 9007199254740991 then raise exception 'validation'; end if;
  id_value := n::bigint;
  if id_value = any(ids) then raise exception 'validation'; end if;
  ids := array_append(ids, id_value);
  begin expected := (item->>'expected_updated_at')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'validation'; end;
  if expected is null or not isfinite(expected) then raise exception 'validation'; end if;
  fields := item->'fields';
  if jsonb_typeof(fields) is distinct from 'object' or fields = '{}'::jsonb then raise exception 'validation'; end if;
  for key, value in select * from jsonb_each(fields) loop
   if key in ('price','discount','quantity','status') then
    if jsonb_typeof(value) <> 'number' then raise exception 'validation'; end if;
    n := (value#>>'{}')::numeric;
    if key = 'price' then
     if n not between 0 and 10000000 then raise exception 'validation'; end if;
    elsif n <> trunc(n) or n < 0 or n > (case when key = 'status' then 5 else 99 end) then
     raise exception 'validation';
    end if;
   elsif key in ('newArrival','bestseller') then
    if jsonb_typeof(value) <> 'string' or (value#>>'{}') not in ('','true') then raise exception 'validation'; end if;
   else raise exception 'validation';
   end if;
  end loop;
 end loop;
 -- Lock in ID order to prevent competing bulk edits from acquiring opposite locks.
 for product in
  select p.* from public.hmg_catalog_products p where p.id = any(ids) order by p.id for update
 loop
  select v into item from jsonb_array_elements(p_changes) as a(v) where (v->>'id')::bigint = product.id;
  if product.updated_at is distinct from (item->>'expected_updated_at')::timestamptz then
   raise exception 'editConflict';
  end if;
  fields := item->'fields';
  new_specs := coalesce(product.specs,'{}'::jsonb);
  for key in select jsonb_object_keys(fields) loop
   if key in ('discount','quantity','newArrival','bestseller') then
    new_specs := new_specs || jsonb_build_object(key, fields->>key);
   end if;
  end loop;
  new_price := case when fields ? 'price' then round((fields->>'price')::numeric,2) else product.price end;
  new_status := case when fields ? 'status' then (fields->>'status')::integer else product.status end;
  if new_specs is distinct from product.specs or new_price is distinct from product.price or new_status is distinct from product.status then
   update public.hmg_catalog_products p set price = new_price, status = new_status, specs = new_specs
    where p.id = product.id returning p.* into result;
   return next result;
  else return next product;
  end if;
  processed := processed + 1;
 end loop;
 if processed <> jsonb_array_length(p_changes) then raise exception 'editConflict'; end if;
 return;
end;
$$;
revoke all on function public.hmg_catalog_quick_update(jsonb) from public, anon;
grant execute on function public.hmg_catalog_quick_update(jsonb) to authenticated;
notify pgrst, 'reload schema';
