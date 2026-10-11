import { warsawDate } from './core.js';

export const MAX_ANALYTICS_DAYS = 366;
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'});
const hourFormatter = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Warsaw',hour:'2-digit',hourCycle:'h23'});
const dayMs = 86400000;
export function validAnalyticsDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4))<1) return false;
  const date = new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function shiftAnalyticsDate(value, days) {
  if(!validAnalyticsDate(value) || !Number.isInteger(days)) throw Error('analyticsDates');
  return new Date(new Date(value+'T12:00:00Z').getTime()+days*dayMs).toISOString().slice(0,10);
}
export function analyticsDayCount(from, to) {
  if(!validAnalyticsDate(from) || !validAnalyticsDate(to)) throw Error('analyticsDates');
  return Math.round((new Date(to+'T12:00:00Z')-new Date(from+'T12:00:00Z'))/dayMs)+1;
}
export function validateAnalyticsDates(range, now=new Date()) {
  const from=range?.from, to=range?.to, days=analyticsDayCount(from,to);
  if(days<1 || days>MAX_ANALYTICS_DAYS || to>warsawDate(now)) throw Error('analyticsDates');
  return {from,to};
}
export function presetAnalyticsDates(preset=7, now=new Date()) {
  const today=warsawDate(now);
  if(preset==='yesterday'){const day=shiftAnalyticsDate(today,-1);return {from:day,to:day};}
  const days=[1,7,30].includes(Number(preset))?Number(preset):7;
  return {from:shiftAnalyticsDate(today,1-days),to:today};
}
export function analyticsDateLabel(date, lang='uk') {
  if(!validAnalyticsDate(date)) throw Error('analyticsDates');
  return new Intl.DateTimeFormat(lang==='pl'?'pl-PL':'uk-UA',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
}
export function analyticsPeriodLabel(range,lang='uk') {
  return range.from===range.to?analyticsDateLabel(range.from,lang):analyticsDateLabel(range.from,lang)+' — '+analyticsDateLabel(range.to,lang);
}
export function analyticsBuckets(events, range, hourly=false) {
  const days=analyticsDayCount(range.from,range.to);
  if(days<1 || days>MAX_ANALYTICS_DAYS) throw Error('analyticsDates');
  const points=hourly && days===1
    ? Array.from({length:24},(_,hour)=>({key:range.from+'-'+String(hour).padStart(2,'0'),label:String(hour).padStart(2,'0')+':00',rows:[]}))
    : Array.from({length:days},(_,index)=>{const date=shiftAnalyticsDate(range.from,index);return {key:date,label:date.slice(8,10)+'.'+date.slice(5,7),rows:[]};});
  const byKey=new Map(points.map(point=>[point.key,point]));
  for(const event of events){
    const date=new Date(event.created_at);
    if(!Number.isFinite(date.getTime())) continue;
    const key=dayFormatter.format(date)+(hourly && days===1?'-'+hourFormatter.format(date):'');
    byKey.get(key)?.rows.push(event);
  }
  return points;
}
export function dailyAnalytics(events,range) {
  return analyticsBuckets(events,range).map(point=>{
    const pageViews=point.rows.filter(event=>event.event_type==='page_view');
    return {date:point.key,visitors:new Set(pageViews.map(event=>event.visitor_id).filter(Boolean)).size,
      pageViews:pageViews.length,productViews:point.rows.filter(event=>event.event_type==='product_view').length,
      contactClicks:point.rows.filter(event=>event.event_type==='telegram_click' && ['telegram_order','telegram_cart_order','telegram_contact'].includes(event.destination)).length};
  });
}
