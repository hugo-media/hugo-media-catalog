// Small, dependency-free controller for the existing homepage feature.
export function mountHomeSpotlight(root) {
  if (!root) return () => {};
  const doc = root.ownerDocument, win = doc.defaultView;
  const slides = [...root.querySelectorAll('[data-spotlight-slide]')];
  if (slides.length < 2) return () => {};
  const stage = root.querySelector('[data-spotlight-stage]');
  const toggle = root.querySelector('[data-spotlight-toggle]');
  const controls = root.querySelector('[data-spotlight-controls]');
  const dots = [...root.querySelectorAll('[data-spotlight-to]')];
  const count = root.querySelector('[data-spotlight-current]');
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new win.AbortController(), options = {signal: abort.signal};
  const delay = 6500;
  let index = 0, timer = null, wantsRotation = !motion.matches;
  let inView = !win.IntersectionObserver, hovered = false, disposed = false;
  let touch = null, suppressClickUntil = 0;
  const stopTimer = () => { win.clearTimeout(timer); timer = null; };
  function sync() {
    stopTimer();
    if (disposed) return;
    const playing = wantsRotation && inView && !hovered && !doc.hidden;
    root.classList.toggle('is-playing', playing);
    stage.setAttribute('aria-live', playing ? 'off' : 'polite');
    toggle.setAttribute('aria-label', wantsRotation ? toggle.dataset.pauseLabel : toggle.dataset.playLabel);
    toggle.querySelector('[data-spotlight-toggle-text]').textContent = wantsRotation ? toggle.dataset.pauseText : toggle.dataset.playText;
    toggle.dataset.playing = String(wantsRotation);
    if (playing) timer = win.setTimeout(() => show(index + 1), delay);
  }
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const active = position === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
      slide.querySelector('a').tabIndex = active ? 0 : -1;
    });
    dots.forEach((dot, position) => {
      dot.setAttribute('aria-disabled', String(position === index));
      dot.classList.toggle('is-active', position === index);
    });
    count.textContent = String(index + 1).padStart(2, '0');
    sync();
  }
  function stopRotation() { wantsRotation = false; sync(); }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button === toggle) { wantsRotation = !wantsRotation; sync(); return; }
    if (button.hasAttribute('data-spotlight-step')) {
      wantsRotation = false; show(index + Number(button.dataset.spotlightStep));
    } else if (button.hasAttribute('data-spotlight-to') && button.getAttribute('aria-disabled') !== 'true') {
      wantsRotation = false; show(Number(button.dataset.spotlightTo));
    }
  }, options);
  root.addEventListener('focusin', event => {
    if (!event.target.closest('[data-spotlight-toggle]')) stopRotation();
  }, options);
  root.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; sync(); }
  }, options);
  root.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; sync(); }
  }, options);
  controls.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); wantsRotation = false;
    show(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : index + (event.key === 'ArrowLeft' ? -1 : 1));
  }, options);
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    touch = {id:event.pointerId,x:event.clientX,y:event.clientY};
    stopRotation();
  }, options);
  stage.addEventListener('pointerup', event => {
    if (!touch || event.pointerId !== touch.id) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      suppressClickUntil = win.performance.now() + 500;
      show(index + (dx < 0 ? 1 : -1));
    }
  }, options);
  stage.addEventListener('pointercancel', () => { touch = null; }, options);
  stage.addEventListener('click', event => {
    if (win.performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, {...options,capture:true});
  doc.addEventListener('visibilitychange', sync, options);
  win.addEventListener('pagehide', stopTimer, options);
  win.addEventListener('pageshow', sync, options);
  const onMotion = () => { if (motion.matches) stopRotation(); };
  motion.addEventListener('change', onMotion);
  const observer = win.IntersectionObserver ? new win.IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
    sync();
  }, {threshold:[0,.25]}) : null;
  observer?.observe(root);
  controls.hidden = false; toggle.hidden = false;
  show(0);
  return () => {
    disposed = true; stopTimer(); abort.abort(); observer?.disconnect();
    motion.removeEventListener('change', onMotion);
  };
}
