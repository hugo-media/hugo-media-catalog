import { metadata, pagePath, headMarkup, parseRoute } from './seo-core.js';
export function updateSeo({lang,view,cat,product,loading,search}) {
  if(loading && ['home','catalog','detail'].includes(view)) return;
  const isPublic=['home','catalog','detail','start'].includes(view);
  const missing=view==='detail'&&!product;
  if(isPublic&&!missing) {
    const url=new URL(location.href);
    url.pathname=pagePath({lang,view,cat,product});
    for(const key of ['admin','product','catalog','finder','selection']) url.searchParams.delete(key);
    if(url.pathname+url.search!==location.pathname+location.search) history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  const meta=metadata({lang,view,cat,product,base:window.HUGO_CONFIG?.supabaseUrl,
    noindex:!isPublic||missing||Boolean(search)||!['www.hugomedia.pl','hugomedia.pl'].includes(location.hostname)});
  document.head.querySelectorAll('title,meta[name="description"],meta[name="robots"],meta[name^="twitter:"],meta[property^="og:"],link[rel="canonical"],link[hreflang],#hmg-schema').forEach(el=>el.remove());
  document.head.insertAdjacentHTML('beforeend',headMarkup(meta));
}
export function currentRoute() {return parseRoute(location.pathname);}
