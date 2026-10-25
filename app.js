// Menú móvil y cabecera
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.nav-toggle');
const navList = document.getElementById('nav-list');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
  navList.classList.toggle('open', !open);
});
navList.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    navList.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Reserva (solo demostración, no envía nada)
const booker = document.getElementById('booker');
const steps = [...booker.querySelectorAll('.step')];
const progress = [...booker.querySelectorAll('.progress li')];
const daysEl = booker.querySelector('.days');
const slotsEl = booker.querySelector('.slots');
const monthEl = booker.querySelector('.cal-month');
const prevWeek = booker.querySelector('[data-week="-1"]');
const nextWeek = booker.querySelector('[data-week="1"]');
const step2Next = booker.querySelector('.step[data-step="2"] [data-next]');

const HOURS = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];
const MAX_WEEKS = 4;
const fmtDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const today = new Date();
today.setHours(0, 0, 0, 0);
const firstMonday = (() => {
  const d = new Date(today);
  d.setDate(d.getDate() + 1);
  const wd = d.getDay();
  d.setDate(d.getDate() - ((wd + 6) % 7));
  if (wd === 0 || wd === 6) d.setDate(d.getDate() + 7);
  return d;
})();

const state = { week: 0, date: null, time: null };

// Ocupación simulada estable por fecha
function busy(date, hour) {
  const seed = date.getFullYear() * 1000 + date.getMonth() * 40 + date.getDate() + hour.length * 7 + parseInt(hour, 10) * 13;
  return ((seed * 9301 + 49297) % 233280) / 233280 < 0.42;
}
function isFull(date) {
  return HOURS.every((h) => busy(date, h));
}

function renderWeek() {
  const start = new Date(firstMonday);
  start.setDate(start.getDate() + state.week * 7);
  monthEl.textContent = fmtMonth.format(start);
  prevWeek.disabled = state.week === 0;
  nextWeek.disabled = state.week >= MAX_WEEKS - 1;
  daysEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day';
    btn.setAttribute('role', 'option');
    btn.innerHTML = `<small>${fmtDay.format(d).replace('.', '')}</small><b>${d.getDate()}</b>`;
    const disabled = d <= today || isFull(d);
    btn.disabled = disabled;
    btn.setAttribute('aria-label', fmtLong.format(d) + (disabled ? ', sin horas libres' : ''));
    const selected = state.date && d.getTime() === state.date.getTime();
    btn.setAttribute('aria-selected', String(!!selected));
    btn.addEventListener('click', () => {
      state.date = d;
      state.time = null;
      renderWeek();
    });
    daysEl.appendChild(btn);
  }
  renderSlots();
}

function renderSlots(fresh = true) {
  slotsEl.innerHTML = '';
  slotsEl.classList.toggle('fresh', fresh);
  if (!state.date) {
    slotsEl.innerHTML = '<p class="slots-empty">Elige un día para ver las horas libres.</p>';
  } else {
    HOURS.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.style.setProperty('--s', i);
      b.textContent = h;
      b.setAttribute('role', 'option');
      b.disabled = busy(state.date, h);
      b.setAttribute('aria-selected', String(state.time === h));
      if (b.disabled) b.setAttribute('aria-label', h + ', ocupada');
      b.addEventListener('click', () => {
        state.time = h;
        renderSlots(false);
      });
      slotsEl.appendChild(b);
    });
  }
  step2Next.disabled = !(state.date && state.time);
}

prevWeek.addEventListener('click', () => { state.week--; renderWeek(); });
nextWeek.addEventListener('click', () => { state.week++; renderWeek(); });

function choice(name) {
  return booker.querySelector(`input[name="${name}"]:checked`).value;
}

function go(n) {
  steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
  progress.forEach((p) => {
    const k = Number(p.dataset.step);
    p.classList.toggle('is-current', k === n);
    p.classList.toggle('is-done', k < n);
  });
  if (n === 3) {
    booker.querySelector('.summary').textContent =
      `${choice('tipo')} (${choice('modo').toLowerCase()}), ${fmtLong.format(state.date)} a las ${state.time}.`;
  }
  const active = steps.find((s) => Number(s.dataset.step) === n);
  const focusTarget = n === 4 ? active : active.querySelector('legend');
  if (focusTarget) {
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }
  booker.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
}

booker.addEventListener('click', (e) => {
  const current = Number(steps.find((s) => s.classList.contains('is-active')).dataset.step);
  if (e.target.closest('[data-next]')) go(current + 1);
  if (e.target.closest('[data-prev]')) go(current - 1);
  if (e.target.closest('[data-confirm]')) confirmBooking();
  if (e.target.closest('[data-reset]')) {
    state.date = null;
    state.time = null;
    state.week = 0;
    booker.querySelectorAll('input[type=text], input:not([type]), input[type=tel], input[type=email], textarea').forEach((i) => (i.value = ''));
    booker.querySelector('#f-priv').checked = false;
    renderWeek();
    go(1);
  }
});

function confirmBooking() {
  const err = booker.querySelector('.form-error');
  const nombre = booker.querySelector('#f-nombre');
  const tel = booker.querySelector('#f-tel');
  const priv = booker.querySelector('#f-priv');
  [nombre, tel].forEach((i) => i.removeAttribute('aria-invalid'));

  if (!nombre.value.trim()) { nombre.setAttribute('aria-invalid', 'true'); err.textContent = 'Escribe tu nombre para poder confirmarte la cita.'; nombre.focus(); return; }
  if (tel.value.replace(/\D/g, '').length < 9) { tel.setAttribute('aria-invalid', 'true'); err.textContent = 'Revisa el teléfono: necesita al menos 9 cifras.'; tel.focus(); return; }
  if (!priv.checked) { err.textContent = 'Acepta la política de privacidad para continuar.'; priv.focus(); return; }
  err.textContent = '';

  const btn = booker.querySelector('[data-confirm]');
  btn.disabled = true;
  btn.textContent = 'Confirmando…';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Confirmar cita';
    const name = nombre.value.trim().split(' ')[0];
    booker.querySelector('.done-text').textContent =
      `Gracias, ${name}. Has solicitado ${choice('tipo').toLowerCase()} ${choice('modo') === 'Online' ? 'online' : 'en consulta'} el ${fmtLong.format(state.date)} a las ${state.time}. Te escribiré al ${tel.value.trim()} para confirmarla.`;
    go(4);
  }, 900);
}

renderWeek();

// ============ Animaciones ============
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Titular palabra a palabra
const h1 = document.querySelector('.hero h1');
h1.setAttribute('aria-label', h1.textContent);
h1.innerHTML = h1.textContent.trim().split(/\s+/)
  .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
  .join(' ');

const start = () => requestAnimationFrame(() => document.body.classList.add('is-loaded'));
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
setTimeout(start, 1500);

// Hojas de palmera dibujadas con líneas
function frond(svg, seed) {
  const pts = [];
  const P0 = [110, 415], P1 = [96 + seed * 6, 220], P2 = [128, 12];
  const at = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  let d = `<path pathLength="1" style="--k:0" d="M${P0} Q${P1} ${P2}"/>`;
  let k = 1;
  for (let t = 0.18; t < 0.97; t += 0.055) {
    const [x, y] = at(t);
    const len = 92 * Math.sin(Math.PI * (t * 0.9 + 0.05)) * (1 - t * 0.25);
    [-1, 1].forEach((side) => {
      const ang = (side < 0 ? Math.PI : 0) + side * (-0.55 - t * 0.5);
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len * 0.8 - len * 0.35;
      const cx = x + Math.cos(ang) * len * 0.45, cy = y - len * 0.42;
      d += `<path pathLength="1" style="--k:${k++}" d="M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}"/>`;
    });
  }
  svg.innerHTML = d;
}
document.querySelectorAll('[data-frond]').forEach((s, i) => frond(s, i));

// Aparición al hacer scroll
const groups = [
  ['.about h2, .about-text p'], ['.facts li'], ['.section-head h2, .section-head p'], ['.topics li'],
  ['.space-photo'], ['.space-text > h2, .space-text > p, .steps-title'], ['.steps li'], ['.addr'],
  ['.review-track, .note'], ['.booking-intro > *'], ['.booker'], ['.faq h2'], ['.faq details'],
  ['.contact-info > *'], ['.map'], ['.footer-inner > *'],
];
groups.forEach(([sel]) => document.querySelectorAll(sel).forEach((el, i) => {
  el.classList.add('reveal');
  el.style.setProperty('--d', i % 6);
}));
document.querySelectorAll('main section:not(.hero) h2').forEach((h) => h.classList.add('line-h'));

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    if (e.target.matches('[data-count]')) countUp(e.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal, .line-h, [data-frond], [data-count]').forEach((el) => io.observe(el));

// Contador de la valoración
function countUp(el) {
  const to = Number(el.dataset.count);
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / 1400, 1);
    el.textContent = (to * (1 - (1 - p) ** 3)).toFixed(1).replace('.', ',');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Reseñas en cinta continua
const track = document.querySelector('.review-track');
const rail = document.createElement('div');
rail.className = 'rail';
[...track.children].forEach((r) => rail.appendChild(r));
[...rail.children].forEach((r) => {
  const c = r.cloneNode(true);
  c.setAttribute('aria-hidden', 'true');
  rail.appendChild(c);
});
track.appendChild(rail);
track.classList.add('auto');

// Barra de progreso y parallax
const hero = document.querySelector('.hero');
const photo = document.querySelector('.space-photo');
let ticking = false;
function onFrame() {
  ticking = false;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  header.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
  if (reduced) return;
  if (y < innerHeight * 1.2) hero.style.setProperty('--py', `${(y * 0.18).toFixed(1)}px`);
  const r = photo.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) {
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    photo.style.setProperty('--pp', `${(p * -40).toFixed(1)}px`);
  }
}
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
}, { passive: true });
onFrame();

// El monograma y los anillos siguen al ratón
if (!reduced && matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', (e) => {
    const b = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 2 - 1).toFixed(3));
    hero.style.setProperty('--my', ((e.clientY - b.top) / b.height * 2 - 1).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--mx', 0);
    hero.style.setProperty('--my', 0);
  });
}
