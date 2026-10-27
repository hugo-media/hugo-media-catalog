-- NULL preserves the original Warsaw-midnight deadline.
-- New selections can span days; the newest publication replaces the previous one.
alter table public.hmg_catalog_daily_picks
  add column expires_at timestamptz,
  add constraint hmg_daily_picks_expiry_valid check (
    expires_at is null or (isfinite(expires_at)
      and expires_at > (for_date::timestamp at time zone 'Europe/Warsaw'))
  );
comment on column public.hmg_catalog_daily_picks.expires_at is
  'Exclusive visibility deadline. NULL preserves legacy expiry at the end of for_date in Europe/Warsaw.';
