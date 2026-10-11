begin;
do $test$
declare actor uuid; a public.hmg_catalog_products%rowtype; b public.hmg_catalog_products%rowtype; r public.hmg_catalog_products%rowtype;
 rows_saved jsonb; before_versions bigint; rejected boolean;
begin
 select user_id into actor from public.hmg_catalog_admins order by user_id limit 1;
 if actor is null then raise exception 'No existing catalog administrator for verification'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor::text,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select * into a from public.hmg_catalog_products order by id limit 1;
 select * into b from public.hmg_catalog_products order by id offset 1 limit 1;
 if a.id is null or b.id is null then raise exception 'Need two existing products for verification'; end if;
 select count(*) into before_versions from public.hmg_catalog_versions where product_id in (a.id,b.id);
 select jsonb_agg(to_jsonb(s)) into rows_saved from public.hmg_catalog_quick_update(jsonb_build_array(
  jsonb_build_object('id',a.id,'expected_updated_at',a.updated_at,'fields',jsonb_build_object('price',a.price+0.01,'discount',7,'quantity',2)),
  jsonb_build_object('id',b.id,'expected_updated_at',b.updated_at,'fields',jsonb_build_object('bestseller',case when b.specs->>'bestseller'='true' then '' else 'true' end))
 )) s;
 if jsonb_array_length(rows_saved) <> 2 then raise exception 'Did not return both products'; end if;
 select * into r from public.hmg_catalog_products where id=a.id;
 if r.price<>a.price+0.01 or r.specs->>'discount'<>'7' or r.specs->>'quantity'<>'2' then raise exception 'Quick fields not persisted'; end if;
 if (r.specs-'discount'-'quantity') is distinct from (a.specs-'discount'-'quantity') or r.images is distinct from a.images or r.name is distinct from a.name then raise exception 'Unrelated product data changed'; end if;
 if (select count(*) from public.hmg_catalog_versions where product_id in (a.id,b.id)) <> before_versions+2 then raise exception 'Version history missing'; end if;
 rejected:=false;
 begin
  perform public.hmg_catalog_quick_update(jsonb_build_array(
   jsonb_build_object('id',a.id,'expected_updated_at',r.updated_at,'fields',jsonb_build_object('price',r.price+123)),
   jsonb_build_object('id',b.id,'expected_updated_at',b.updated_at,'fields',jsonb_build_object('discount',5))
  ));
 exception when others then
  if sqlerrm<>'editConflict' then raise; end if;
  rejected:=true;
 end;
 if not rejected or (select price from public.hmg_catalog_products where id=a.id)<>r.price then raise exception 'Conflict did not roll back entire batch'; end if;
 rejected:=false;
 begin
  perform public.hmg_catalog_quick_update(jsonb_build_array(jsonb_build_object('id',a.id,'expected_updated_at',r.updated_at,'fields',jsonb_build_object('name','not allowed'))));
 exception when others then
  if sqlerrm<>'validation' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'Unlisted fields accepted'; end if;
 rejected:=false;
 begin
  perform public.hmg_catalog_quick_update(jsonb_build_array(jsonb_build_object('id',a.id,'expected_updated_at',r.updated_at,'fields',jsonb_build_object('discount',100))));
 exception when others then
  if sqlerrm<>'validation' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'Invalid discount accepted'; end if;
 rejected:=false;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin perform public.hmg_catalog_quick_update('[]'::jsonb);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Non-admin access accepted'; end if;
 if has_function_privilege('anon','public.hmg_catalog_quick_update(jsonb)','execute') then raise exception 'Anonymous execution permitted'; end if;
end;
$test$;
rollback;
select 'Passed: atomic edits, field validation, concurrent edit rollback, version history, admin authorization; all test changes rolled back' as verification;