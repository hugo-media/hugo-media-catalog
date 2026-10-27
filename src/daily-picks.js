import { warsawDate, warsawDateTimeToUtc, utcToWarsawDateTime } from './core.js';

export function endOfWarsawDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const next = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(next.getTime()) || next.toISOString().slice(0, 10) !== date) return null;
  next.setUTCDate(next.getUTCDate() + 1);
  return warsawDateTimeToUtc(next.toISOString().slice(0, 10) + 'T00:00');
}
export function normalizeDailyPicks(row) {
  const end = row?.expires_at ? Date.parse(row.expires_at) : Date.parse(endOfWarsawDay(row?.for_date));
  return { date: row?.for_date || '', ids: (row?.product_ids || []).map(Number),
    endsAt: Number.isFinite(end) ? new Date(end).toISOString() : '' };
}
export function dailyPicksActive(picks, now = Date.now()) {
  return Boolean(picks.date && picks.date <= warsawDate(new Date(now)) && Date.parse(picks.endsAt) > now);
}
export function picksExpiryPreset(preset, now = Date.now()) {
  const end = preset === 'today' ? endOfWarsawDay(warsawDate(new Date(now)))
    : ['24', '72', '168'].includes(String(preset))
      ? new Date(Math.ceil((now + Number(preset) * 3600000) / 60000) * 60000).toISOString() : '';
  return utcToWarsawDateTime(end);
}
export function validatePicksExpiry(value, now = Date.now()) {
  const ms = Date.parse(value || '');
  if (!Number.isFinite(ms) || ms <= now) throw Error('picksExpiryInvalid');
  return new Date(ms).toISOString();
}
// Recheck when a sleeping tab returns. Never revive an older publication.
export function watchPicksExpiry(endsAt, onExpire, {
  now = () => Date.now(), schedule = setTimeout, cancel = clearTimeout,
  visibility = globalThis.document
} = {}) {
  const deadline = Date.parse(endsAt);
  let timer, done = false;
  const stop = () => { done = true; cancel(timer); visibility?.removeEventListener('visibilitychange', check); };
  function check() {
    if (done) return;
    cancel(timer);
    const remaining = deadline - now();
    if (remaining <= 0) { stop(); onExpire(); }
    else timer = schedule(check, Math.min(remaining, 2147483647));
  }
  if (Number.isFinite(deadline) && deadline > now()) {
    visibility?.addEventListener('visibilitychange', check);
    check();
  }
  return stop;
}
