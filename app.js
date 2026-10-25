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

function renderSlots() {
  slotsEl.innerHTML = '';
  if (!state.date) {
    slotsEl.innerHTML = '<p class="slots-empty">Elige un día para ver las horas libres.</p>';
  } else {
    HOURS.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.textContent = h;
      b.setAttribute('role', 'option');
      b.disabled = busy(state.date, h);
      b.setAttribute('aria-selected', String(state.time === h));
      if (b.disabled) b.setAttribute('aria-label', h + ', ocupada');
      b.addEventListener('click', () => {
        state.time = h;
        renderSlots();
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
