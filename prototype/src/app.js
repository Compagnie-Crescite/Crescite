(() => {
  'use strict';

  /* ===================== outils ===================== */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const store = {
    get(k) { try { return window.localStorage.getItem('crescite2:' + k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem('crescite2:' + k, v); } catch (e) { /* stockage indisponible */ } }
  };
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lightMQ = window.matchMedia('(prefers-color-scheme: light)');
  const state = { calm: store.get('calm') === '1', profile: store.get('profile') || 'public' };
  const motionOK = () => !state.calm && !reduceMQ.matches;
  const syncMotion = () => { root.classList.toggle('motion', motionOK()); root.dataset.calm = state.calm ? '1' : '0'; };

  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOISC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const JOURSC = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const todayISO = isoOf(TODAY);
  const longDate = s => { const d = parse(s); return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const shortDate = s => { const d = parse(s); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOISC[d.getMonth()]}`; };
  const km = (a, b, c, d) => {
    const R = 6371, r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const ROUEN = [49.4431, 1.0993];

  /* ===================== données ===================== */
  const SHOWS = DATA.shows;
  const bySlug = Object.fromEntries(SHOWS.map(s => [s.slug, s]));
  const cast = s => (s.distribution || []).length;
  let seasonRows = DATA.season.map(r => ({ ...r }));
  const upcoming = () => seasonRows.filter(r => r.end >= todayISO).sort((a, b) => a.start.localeCompare(b.start) || a.id - b.id);
  const nextOf = slug => upcoming().find(r => r.slug === slug);
  const dateText = r => {
    if (r.precision === 'month') return `${MOIS[parse(r.start).getMonth()]} ${parse(r.start).getFullYear()}, jour à préciser`;
    return r.label;
  };
  const toast = (() => {
    const el = $('#toast'); let to = 0;
    return msg => { el.textContent = msg; el.classList.add('show'); clearTimeout(to); to = setTimeout(() => el.classList.remove('show'), 3200); };
  })();
  const downloadICS = (title, startISO, endISO, place, desc) => {
    const d1 = startISO.replace(/-/g, ''), d2 = isoOf(new Date(parse(endISO).getTime() + 864e5)).replace(/-/g, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crescite//Prototype//FR', 'BEGIN:VEVENT',
      `UID:${d1}-${norm(title).replace(/ /g, '-')}@crescite.fr`, `DTSTAMP:${isoOf(new Date()).replace(/-/g, '')}T000000Z`,
      `DTSTART;VALUE=DATE:${d1}`, `DTEND;VALUE=DATE:${d2}`, `SUMMARY:${title}`, `LOCATION:${place}`,
      `DESCRIPTION:${(desc || '').replace(/\n/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = `crescite-${d1}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Fichier agenda prêt : ouvrez-le pour ajouter la date.');
  };
  const osm = (lat, lon) => `https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`;

  /* ===================== réglages : profil, calme, lumière ===================== */
  function initMenu() {
    const btn = $('#menu-btn'), hd = $('.site-header');
    btn.addEventListener('click', () => { const open = !hd.classList.contains('is-open'); hd.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Fermer' : 'Menu'; });
    $$('.site-nav a').forEach(a => a.addEventListener('click', () => { hd.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; }));
  }
  function initControls() {
    const radios = $$('input[name="profile"]');
    radios.forEach(r => { r.checked = r.value === state.profile; r.addEventListener('change', () => {
      state.profile = r.value; store.set('profile', r.value); Agenda.render();
      toast(r.value === 'pro' ? 'Vue programmateur : fiches techniques et contacts en avant.' : r.value === 'classe' ? 'Vue enseignant : ressources scolaires en avant.' : 'Vue spectateur.');
    }); });
    const calmBtn = $('#calm-toggle');
    const syncCalm = () => { calmBtn.setAttribute('aria-pressed', String(state.calm)); syncMotion(); };
    calmBtn.addEventListener('click', () => { state.calm = !state.calm; store.set('calm', state.calm ? '1' : '0'); syncCalm(); Stage.wake(); TourMap.wake(); });
    reduceMQ.addEventListener?.('change', syncMotion);
    syncCalm();
    const themeBtn = $('#theme-toggle');
    const saved = store.get('theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
    const isLight = () => root.dataset.theme ? root.dataset.theme === 'light' : lightMQ.matches;
    const syncTheme = () => { themeBtn.setAttribute('aria-pressed', String(isLight())); themeBtn.textContent = isLight() ? 'Noir salle' : 'Lumière salle'; TourMap.wake(); };
    themeBtn.addEventListener('click', () => { const next = isLight() ? 'dark' : 'light'; root.dataset.theme = next; store.set('theme', next); syncTheme(); });
    lightMQ.addEventListener?.('change', syncTheme);
    syncTheme();
  }

  /* ===================== encre (transition) ===================== */
  const Ink = (() => {
    const cv = $('#ink'), ctx = cv.getContext('2d');
    let W = 0, H = 0, raf = 0;
    const size = () => {
      W = window.innerWidth; H = window.innerHeight; const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const blob = (x, y, r, t) => {
      if (r <= 0) return;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = i / 72 * Math.PI * 2;
        const rr = r * (1 + 0.07 * Math.sin(5 * a + t * 4) + 0.05 * Math.sin(9 * a - t * 5) + 0.03 * Math.sin(14 * a + t * 7));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    };
    function run(x, y, grow, dur, done) {
      size(); cv.hidden = false; cv.classList.remove('fade');
      const maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.2;
      const t0 = performance.now();
      cancelAnimationFrame(raf);
      const frame = now => {
        const p = clamp((now - t0) / dur, 0, 1), e = grow ? easeInOut(p) : 1 - easeInOut(p), t = now / 1000;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#bc3e80'; blob(x, y, maxR * e, t);
        ctx.fillStyle = '#5c1640'; blob(x, y, maxR * clamp((e - 0.2) / 0.8, 0, 1), t + 3);
        if (p < 1) raf = requestAnimationFrame(frame);
        else { if (!grow) { cv.hidden = true; ctx.clearRect(0, 0, W, H); } done && done(); }
      };
      raf = requestAnimationFrame(frame);
    }
    const cover = (x, y, done) => run(x, y, true, 520, done);
    const uncover = (x, y, done) => run(x, y, false, 560, done);
    const fill = () => { size(); cv.hidden = false; ctx.fillStyle = '#5c1640'; ctx.fillRect(0, 0, W, H); };
    const fadeOut = () => { cv.classList.add('fade'); setTimeout(() => { cv.hidden = true; cv.classList.remove('fade'); ctx.clearRect(0, 0, W, H); }, 320); };
    return { cover, uncover, fill, fadeOut };
  })();

  /* ===================== la scène : la pieuvre ===================== */
  const Stage = (() => {
    const el = $('.stage'), cv = $('.stage-canvas'), ctx = cv.getContext('2d');
    const logo = $('.stage-logo'), ul = $('.tentacle-labels'), hint = $('.stage-hint');
    const N = 24;
    let W = 0, H = 0, cx = 0, cy = 0, S = 0, mobile = false, pullDist = 140, raf = 0, visible = true, last = performance.now();
    let pointer = { x: -1e4, y: -1e4 }, grab = null, lastPointerAct = 0, rot = 0;
    let beckon = { T: null, t0: 0, next: performance.now() + 3500 };
    const T = SHOWS.map((show, i) => ({
      i, show, slug: show.slug,
      pts: Array.from({ length: N }, () => ({ x: 0, y: 0, px: 0, py: 0 })),
      rest: Array.from({ length: N }, () => ({ x: 0, y: 0 })),
      base: { x: 0, y: 0 }, tipHome: { x: 0, y: 0 }, tip: { x: 0, y: 0 }, len: 1,
      sign: i % 2 ? 1 : -1, phase: i * 1.73, right: true, level: -1, tension: 0,
      focus: false, hover: false, mode: 'idle', t0: 0, scale: 1, label: null, avail: 0, init: false
    }));

    /* étiquettes : de vrais boutons, accessibles au clavier */
    T.forEach(t => {
      const s = t.show, nx = nextOf(s.slug);
      const meta = s.annee ? `création ${s.annee}` : 'collèges, lycées, théâtres';
      const when = nx ? `prochaine date : ${shortDate(nx.start)}, ${nx.commune}` : (s.annee ? 'hors tournée cette saison' : 'projets avec les établissements');
      const li = document.createElement('li');
      li.innerHTML = `<button class="t-label" type="button" data-i="${t.i}" aria-describedby="tl-d-${t.i}">
        <span class="t-title">${esc(s.titre)}</span><span class="t-meta">${esc(meta)}</span><span class="t-when">${esc(when)}</span>
        <span class="t-reveal"><span><span class="t-reveal-inner" id="tl-d-${t.i}">${esc(s.accroche)}
        <span class="t-next">${nx ? esc(nx.details || `${dateText(nx)} · ${nx.commune} (${nx.dep})`) : 'Toute la page du spectacle vous attend au centre.'}</span>
        <span class="t-release">Lâchez pour entrer</span></span></span></span></button>`;
      ul.appendChild(li);
      t.label = li.firstElementChild;
    });

    function layout() {
      const r = el.getBoundingClientRect();
      W = r.width; H = r.height; mobile = W < 720;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!mobile) {
        S = clamp(Math.min(W, H) * 0.33, 190, 310); cx = W / 2; cy = H * 0.52;
        const rx = Math.min(W * 0.34, 500), ry = Math.min(H * 0.35, 290);
        const angles = [-30, 0, 28, 56, 124, 152, 180, 206];
        T.forEach((t, i) => {
          const a = angles[i] * Math.PI / 180, f = (angles[i] === 0 || angles[i] === 180) ? 0.88 : 1;
          t.tipHome = { x: cx + Math.cos(a) * rx * f, y: cy + Math.sin(a) * ry };
          t.base = { x: cx + Math.cos(a) * S * 0.2, y: cy + Math.sin(a) * S * 0.16 + S * 0.06 };
          t.right = Math.cos(a) >= 0;
        });
        pullDist = clamp(Math.min(W, H) * 0.2, 110, 170);
      } else {
        S = clamp(W * 0.4, 130, 170); cx = W / 2; cy = 210 + S * 0.5;
        const y0 = cy + S * 0.6 + 34, row = Math.min(60, (H - 160 - y0) / 7);
        T.forEach((t, i) => {
          const left = i % 2 === 0;
          t.tipHome = { x: left ? 20 : W - 20, y: y0 + i * row };
          const a = (left ? 128 : 52) * Math.PI / 180;
          t.base = { x: cx + Math.cos(a) * S * 0.22 + (left ? -1 : 1) * (i >> 1) * 3, y: cy + Math.sin(a) * S * 0.2 };
          t.right = left;
        });
        pullDist = 100;
      }
      logo.style.setProperty('--logo', S + 'px');
      T.forEach(t => { t.lh = t.label.offsetHeight; });
      T.forEach(t => { t.tip.x = t.tipHome.x; t.tip.y = t.tipHome.y; t.avail = -1; buildRest(t, performance.now()); if (!t.init) { t.pts.forEach((p, k) => { p.x = p.px = t.rest[k].x; p.y = p.py = t.rest[k].y; }); t.init = true; } });
      draw();
    }

    function beckonAmount(t, now) {
      if (beckon.T !== t) return 0;
      const p = (now - beckon.t0) / 1700;
      if (p >= 1) { beckon.T = null; return 0; }
      return Math.sin(Math.PI * p);
    }

    /* courbe de repos : une « tortue » qui ondule et s'enroule au bout, recalée de la base au bout */
    function buildRest(t, now) {
      const live = motionOK();
      const sw = live ? Math.sin(now * 0.0009 + t.phase) : 0;
      const sw2 = live ? Math.sin(now * 0.0014 + t.phase * 1.7) : 0;
      const bk = live ? beckonAmount(t, now) : 0;
      const P = t.rest;
      let x = 0, y = 0, h = 0;
      for (let k = 0; k < N; k++) {
        const s = k / (N - 1);
        P[k].x = x; P[k].y = y;
        const curl = t.sign * (2.4 + 4.2 * bk) * smooth(0.6, 1, s) * s;
        const kap = t.sign * 1.15 * Math.sin(Math.PI * 2 * 1.05 * s + t.phase) * 0.85 + 0.75 * sw * (0.3 + s) + 0.45 * sw2 * s * s + curl * 3;
        h += kap / (N - 1);
        x += Math.cos(h) / (N - 1); y += Math.sin(h) / (N - 1);
      }
      const ex = P[N - 1].x, ey = P[N - 1].y, le = Math.hypot(ex, ey) || 1;
      const dx = t.tip.x - t.base.x, dy = t.tip.y - t.base.y, L = Math.hypot(dx, dy);
      const sc = (L / le) * t.scale, ang = Math.atan2(dy, dx) - Math.atan2(ey, ex);
      const ca = Math.cos(ang) * sc, sa = Math.sin(ang) * sc;
      let len = 0;
      for (let k = 0; k < N; k++) {
        const X = P[k].x, Y = P[k].y;
        P[k].x = t.base.x + X * ca - Y * sa; P[k].y = t.base.y + X * sa + Y * ca;
        if (k) len += Math.hypot(P[k].x - P[k - 1].x, P[k].y - P[k - 1].y);
      }
      t.len = Math.max(len, 1);
    }

    function step(t, now) {
      const grabbed = grab && grab.T === t;
      // le bout se tend vers le visiteur (curiosité), sauf en mode calme
      let gx = t.tipHome.x, gy = t.tipHome.y;
      if (motionOK() && !grabbed && t.mode === 'idle') {
        const d = Math.hypot(pointer.x - t.tipHome.x, pointer.y - t.tipHome.y);
        if (d < 200) { const f = (1 - d / 200) * 0.28; gx += (pointer.x - t.tipHome.x) * f; gy += (pointer.y - t.tipHome.y) * f; }
      }
      t.tip.x = lerp(t.tip.x, gx, 0.12); t.tip.y = lerp(t.tip.y, gy, 0.12);
      if (t.mode === 'suck') {
        const p = clamp((now - t.t0) / 560, 0, 1); t.scale = 1 - 0.93 * easeInOut(p);
        if (p > 0.18) t.label.classList.add('is-sucked');
        if (p >= 0.62 && !t.fired) { t.fired = true; openFromStage(t); }
        if (p >= 1) t.mode = 'hidden';
      } else if (t.mode === 'grow') {
        const p = clamp((now - t.t0) / 900, 0, 1); t.scale = 0.07 + 0.93 * easeOut(p);
        if (p > 0.4) t.label.classList.remove('is-sucked');
        if (p >= 1) { t.mode = 'idle'; t.scale = 1; }
      } else if (t.mode === 'auto') {
        const p = clamp((now - t.t0) / 700, 0, 1), e = easeOut(p);
        const ox = t.tipHome.x - cx, oy = t.tipHome.y - cy, ol = Math.hypot(ox, oy) || 1;
        grab = { T: t, x: t.tipHome.x + ox / ol * pullDist * 1.05 * e, y: t.tipHome.y + oy / ol * pullDist * 1.05 * e, auto: true, ox: 0, oy: 0 };
        if (p >= 1) { grab = null; suck(t); }
      }
      buildRest(t, now);
      const P = t.pts, R = t.rest;
      const isGrab = grab && grab.T === t;
      for (let k = 1; k < N; k++) {
        const p = P[k], r = R[k], s = k / (N - 1);
        let stiff = 0.17 - 0.1 * s;
        if (isGrab) stiff *= 0.22;
        if (t.mode === 'suck' || t.mode === 'grow') stiff = 0.38;
        const vx = (p.x - p.px) * 0.8, vy = (p.y - p.py) * 0.8;
        p.px = p.x; p.py = p.y;
        p.x += vx + (r.x - p.x) * stiff; p.y += vy + (r.y - p.y) * stiff;
      }
      P[0].x = P[0].px = R[0].x; P[0].y = P[0].py = R[0].y;
      if (isGrab) {
        let gxp = grab.x + (grab.ox || 0), gyp = grab.y + (grab.oy || 0);
        const bx = gxp - t.base.x, by = gyp - t.base.y, bl = Math.hypot(bx, by), maxR = t.len * 1.7;
        if (bl > maxR) { gxp = t.base.x + bx / bl * maxR; gyp = t.base.y + by / bl * maxR; }
        const tp = P[N - 1]; tp.x = tp.px = gxp; tp.y = tp.py = gyp;
        t.tension = clamp((Math.hypot(gxp - t.tipHome.x, gyp - t.tipHome.y) - 8) / pullDist, 0, 1);
      } else if (t.mode === 'idle') t.tension = Math.max(0, t.tension - 0.06);
      const seg = t.len / (N - 1), maxSeg = seg * (isGrab ? 1.9 : 1.2);
      for (let it = 0; it < 3; it++) {
        for (let k = 1; k < N; k++) {
          const a = P[k - 1], b = P[k];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
          if (d > maxSeg) {
            const diff = (d - maxSeg) / d;
            if (k === 1) { b.x -= dx * diff; b.y -= dy * diff; }
            else if (isGrab && k === N - 1) { a.x += dx * diff; a.y += dy * diff; }
            else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
          }
        }
      }
    }

    function drawTentacle(t) {
      const P = t.pts, n = N;
      const wBase = S * (mobile ? 0.085 : 0.075), wTip = 1.4;
      const Lp = [], Rp = [], Wd = [];
      for (let k = 0; k < n; k++) {
        const a = P[Math.max(0, k - 1)], b = P[Math.min(n - 1, k + 1)];
        let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const s = k / (n - 1), w = (wBase * Math.pow(1 - s, 0.85) + wTip) / 2 * (t.mode === 'idle' ? 1 : 0.6 + 0.4 * t.scale);
        Lp.push([P[k].x - ty * w, P[k].y + tx * w]); Rp.push([P[k].x + ty * w, P[k].y - tx * w]); Wd.push(w);
      }
      ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
      for (let k = 1; k < n - 1; k++) ctx.quadraticCurveTo(Lp[k][0], Lp[k][1], (Lp[k][0] + Lp[k + 1][0]) / 2, (Lp[k][1] + Lp[k + 1][1]) / 2);
      ctx.lineTo(Lp[n - 1][0], Lp[n - 1][1]);
      const ex = P[n - 1].x + (P[n - 1].x - P[n - 2].x) * 0.9, ey = P[n - 1].y + (P[n - 1].y - P[n - 2].y) * 0.9;
      ctx.quadraticCurveTo(ex, ey, Rp[n - 1][0], Rp[n - 1][1]);
      for (let k = n - 2; k > 0; k--) ctx.quadraticCurveTo(Rp[k][0], Rp[k][1], (Rp[k][0] + Rp[k - 1][0]) / 2, (Rp[k][1] + Rp[k - 1][1]) / 2);
      ctx.lineTo(Rp[0][0], Rp[0][1]); ctx.closePath();
      const g = ctx.createLinearGradient(P[0].x, P[0].y, P[n - 1].x, P[n - 1].y);
      g.addColorStop(0, '#5c1640'); g.addColorStop(0.35, '#a8336f'); g.addColorStop(1, t.level > 0 ? '#f08cbf' : '#d55a99');
      ctx.fillStyle = g;
      const lit = t.level > 0 || t.focus || grab && grab.T === t;
      if (lit) { ctx.shadowColor = 'rgba(240,140,191,.75)'; ctx.shadowBlur = 26; }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(245,189,216,.5)';
      for (let k = 3; k < n - 2; k += 2) {
        const r = Math.max(0.7, Wd[k] * 0.38);
        ctx.beginPath(); ctx.arc(Rp[k][0] * 0.62 + P[k].x * 0.38, Rp[k][1] * 0.62 + P[k].y * 0.38, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let k = 1; k < n - 1; k++) { const x = Lp[k][0] * 0.5 + P[k].x * 0.5, y = Lp[k][1] * 0.5 + P[k].y * 0.5; if (k === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }

    function placeLabel(t) {
      const tip = t.pts[N - 1], gap = mobile ? 10 : 16;
      // l'étiquette suit le bout ; si elle sortirait de la scène, elle passe de l'autre côté
      const roomR = W - 12 - (tip.x + gap), roomL = tip.x - gap - 12;
      let right = t.right;
      if (right && roomR < 170 && roomL > roomR) right = false;
      else if (!right && roomL < 170 && roomR > roomL) right = true;
      const half = (t.lh || 50) / 2 + 8;
      const x = right ? tip.x + gap : tip.x - gap, y = clamp(tip.y, half, Math.max(half, H - half));
      const avail = Math.round(right ? roomR : roomL);
      if (Math.abs(avail - t.avail) > 6) { t.avail = avail; t.label.style.maxWidth = clamp(avail, 120, 300) + 'px'; }
      t.label.classList.toggle('right', !right);
      t.label.style.transform = right ? `translate(${x}px, calc(${y}px - 50%))` : `translate(calc(${x}px - 100%), calc(${y}px - 50%))`;
      const base = t.hover || t.focus ? 1 : 0;
      const lv = t.mode !== 'idle' && t.mode !== 'auto' ? t.level : Math.max(base, t.tension >= 0.85 ? 3 : t.tension >= 0.42 ? 2 : t.tension >= 0.12 ? 1 : 0);
      if (lv !== t.level) {
        t.level = lv;
        t.label.classList.toggle('lv1', lv >= 1); t.label.classList.toggle('lv2', lv >= 2); t.label.classList.toggle('lv3', lv >= 3);
        setTimeout(() => { t.lh = t.label.offsetHeight; }, 280);
      }
    }

    function draw() {
      // la tentacule tirée passe au premier plan, les autres étiquettes s'effacent
      const active = grab ? grab.T : T.find(t => t.mode === 'suck') || null;
      el.classList.toggle('has-active', !!active);
      for (const t of T) t.label.classList.toggle('is-active', t === active);
      ctx.clearRect(0, 0, W, H);
      for (const t of T) if (t.mode !== 'hidden') drawTentacle(t);
      for (const t of T) placeLabel(t);
      const tx = motionOK() ? clamp((pointer.x - cx) / W, -0.5, 0.5) * 6 : 0;
      rot = lerp(rot, pointer.x > -1e3 ? tx : 0, 0.08);
      logo.style.transform = `translate(${cx - S / 2}px, ${cy - S / 2}px) rotate(${rot.toFixed(2)}deg)`;
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      const dt = now - last; last = now;
      if (motionOK() && !grab && now > beckon.next) {
        const idle = T.filter(t => t.mode === 'idle' && !t.hover && !t.focus);
        if (idle.length) { beckon.T = idle[Math.floor(Math.random() * idle.length)]; beckon.t0 = now; }
        beckon.next = now + 4200 + Math.random() * 2600;
      }
      const steps = dt > 40 ? 2 : 1;
      for (let s = 0; s < steps; s++) for (const t of T) if (t.mode !== 'hidden') step(t, now);
      draw();
      raf = requestAnimationFrame(frame);
    }
    const wake = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    function local(e) { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function nearest(x, y) {
      let best = null, bd = 36 * 36;
      for (const t of T) {
        if (t.mode !== 'idle') continue;
        for (let k = Math.floor(N * 0.3); k < N; k++) { const p = t.pts[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
      }
      return best;
    }
    function hideHint() { hint.classList.add('is-hidden'); }
    function startGrab(t, e, target) {
      if (!t || t.mode !== 'idle' || e.button > 0) return;
      e.preventDefault();
      const p = local(e), tip = t.pts[N - 1];
      grab = { T: t, id: e.pointerId, x: p.x, y: p.y, ox: tip.x - p.x, oy: tip.y - p.y, sx: e.clientX, sy: e.clientY, moved: 0 };
      try { target.setPointerCapture(e.pointerId); } catch (err) { /* capture indisponible */ }
      el.classList.add('is-grabbing'); hideHint(); wake();
    }
    function moveGrab(e) {
      const p = local(e); pointer = p;
      if (grab && !grab.auto && e.pointerId === grab.id) {
        grab.x = p.x; grab.y = p.y; grab.moved = Math.max(grab.moved, Math.hypot(e.clientX - grab.sx, e.clientY - grab.sy));
      }
      wake();
    }
    function endGrab(e) {
      if (!grab || grab.auto || e.pointerId !== grab.id) return;
      const t = grab.T, moved = grab.moved;
      grab = null; el.classList.remove('is-grabbing');
      lastPointerAct = performance.now();
      if (moved < 6) activate(t);
      else if (t.tension >= 0.85) suck(t);
    }
    function activate(t) {
      if (!t || t.mode !== 'idle') return;
      hideHint();
      if (!motionOK()) { Panel.open(t.slug, { from: t.label }); return; }
      t.mode = 'auto'; t.t0 = performance.now(); wake();
    }
    function suck(t) { t.mode = 'suck'; t.t0 = performance.now(); t.fired = false; store.set('pulled', '1'); wake(); }
    function openFromStage(t) {
      const r = el.getBoundingClientRect();
      Ink.cover(r.left + cx, r.top + cy, () => Panel.open(t.slug, { from: t.label, viaInk: true }));
    }
    function returnAll() {
      const now = performance.now();
      T.forEach(t => { if (t.mode === 'hidden' || t.mode === 'suck') { t.mode = 'grow'; t.t0 = now; t.scale = 0.07; t.fired = false; } });
      wake();
    }
    function center() { const r = el.getBoundingClientRect(); return { x: r.left + cx, y: r.top + cy }; }

    cv.addEventListener('pointerdown', e => startGrab(nearest(...Object.values(local(e))), e, cv));
    el.addEventListener('pointermove', moveGrab);
    el.addEventListener('pointerleave', () => { pointer = { x: -1e4, y: -1e4 }; });
    window.addEventListener('pointerup', endGrab);
    window.addEventListener('pointercancel', e => { if (grab && e.pointerId === grab.id) { grab = null; el.classList.remove('is-grabbing'); } });
    T.forEach(t => {
      const b = t.label;
      b.addEventListener('pointerdown', e => startGrab(t, e, b));
      b.addEventListener('click', () => { if (performance.now() - lastPointerAct > 450) activate(t); });
      b.addEventListener('mouseenter', () => { t.hover = true; wake(); });
      b.addEventListener('mouseleave', () => { t.hover = false; });
      b.addEventListener('focus', () => { t.focus = true; wake(); });
      b.addEventListener('blur', () => { t.focus = false; });
      b.addEventListener('keydown', e => {
        const k = e.key, dir = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0;
        if (dir) { e.preventDefault(); T[(t.i + dir + T.length) % T.length].label.focus(); }
      });
    });
    new ResizeObserver(() => layout()).observe(el);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0.01 }).observe(el);
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });
    if (store.get('pulled') === '1') hideHint();
    layout(); wake();
    return { wake, returnAll, center, labelOf: slug => T.find(t => t.slug === slug)?.label };
  })();

  /* ===================== le centre : page spectacle ===================== */
  const Panel = (() => {
    const dlg = $('#panel');
    let current = null, from = null;
    const tabsDef = [['public', 'Je viens voir le spectacle'], ['classe', 'Je viens avec une classe'], ['pro', 'Je programme']];
    const nextDates = (slug, type) => upcoming().filter(r => r.slug === slug && (!type || r.type === type));
    const miniDates = list => list.length ? `<ul class="mini-dates">${list.slice(0, 5).map(r => `<li><b>${esc(dateText(r))}</b>${esc(r.commune)} (${esc(r.dep)}) · ${r.type === 'scolaire' ? 'scolaire' : 'tout public'}${r.details ? `<br><span style="color:var(--fg-2);font-size:.9rem">${esc(r.details)}</span>` : ''}</li>`).join('')}</ul>` : '<p>Aucune date annoncée pour l’instant.</p>';
    const todo = label => `<li><span>${esc(label)}</span><span class="example">à fournir</span></li>`;
    function tabPublic(s) {
      return `<div class="panel-cols"><div class="prose"><p class="quote">« ${esc(s.accroche)} »</p><p>${esc(s.texte)}</p>
        ${s.video ? `<p><a class="btn" href="${esc(s.video)}" target="_blank" rel="noopener">Voir la vidéo</a></p>` : ''}</div>
        <div><h3>Prochaines dates</h3>${miniDates(nextDates(s.slug))}
        <p style="margin-top:12px"><button class="btn-sm" type="button" data-agenda="${esc(s.slug)}">Toutes les dates dans l’agenda</button></p></div></div>`;
    }
    function tabClasse(s) {
      return `<div class="panel-cols"><div class="prose"><p class="quote">${esc(s.scolaire_note || 'Contactez la compagnie pour construire un projet avec votre établissement.')}</p>
        <dl class="facts"><dt>Durée</dt><dd>${esc(s.duree || 'à préciser')}</dd><dt>Niveaux conseillés</dt><dd>à préciser <span class="example">à fournir</span></dd>
        <dt>Guide du CRED76</dt><dd>${s.cred76 ? `<a href="${esc(s.cred76)}" target="_blank" rel="noopener">fiche du spectacle</a>` : 'non référencé'}</dd>
        <dt>Pass Culture</dt><dd>${s.pass_culture ? 'offre collective (ADAGE)' : 'non référencé'}</dd></dl>
        <h3>Ressources</h3><ul class="doc-list">${todo('Dossier pédagogique')}${todo('Pistes d’ateliers avant et après le spectacle')}</ul></div>
        <div><h3>Prochaines dates scolaires</h3>${miniDates(nextDates(s.slug, 'scolaire'))}
        <p style="margin-top:12px"><button class="btn-sm" type="button" data-open="actions-culturelles">Les actions culturelles</button></p></div></div>`;
    }
    function tabPro(s) {
      const eq = (s.equipe || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
      return `<div class="panel-cols"><div>
        <dl class="facts">${s.annee ? `<dt>Création</dt><dd>${s.annee}</dd>` : ''}${s.duree ? `<dt>Durée</dt><dd>${esc(s.duree)}</dd>` : ''}
        ${cast(s) ? `<dt>Au plateau</dt><dd>${cast(s)} comédien${cast(s) > 1 ? 's' : ''}</dd>` : ''}${eq}</dl>
        ${s.distribution?.length ? `<h3>Distribution</h3><p>${esc(s.distribution.join(', '))}</p>` : ''}
        ${s.copro ? `<h3>Coproduction</h3><p>${esc(s.copro)}</p>` : ''}${s.soutiens ? `<h3>Soutiens</h3><p>${esc(s.soutiens)}</p>` : ''}</div>
        <div><h3>Documents</h3><ul class="doc-list">${todo('Dossier de diffusion (PDF)')}${todo('Fiche technique (PDF)')}${todo('Photos haute définition')}
        ${s.video ? `<li><span>Vidéo</span><a href="${esc(s.video)}" target="_blank" rel="noopener">ouvrir</a></li>` : ''}</ul>
        <h3>Contact diffusion</h3><p>Nom, téléphone et e-mail <span class="example">à fournir</span></p>
        <h3>Dates à venir</h3>${miniDates(nextDates(s.slug))}</div></div>`;
    }
    function render(s) {
      const tab = state.profile;
      const letters = Array.from(s.titre).map((c, i) => c === ' ' ? ' ' : `<span class="ch" style="--i:${i}">${esc(c)}</span>`).join('');
      dlg.innerHTML = `<div class="panel-bar"><button class="btn-sm" type="button" id="panel-back">← Retour à la pieuvre</button></div>
        <div class="panel-hero"><img src="${DATA.photos[s.slug]}" alt="Photo de ${esc(s.titre)} par la compagnie Crescite"><span class="panel-credit">${esc(s.credit)}</span>
        <div class="panel-hero-text"><p class="eyebrow">${esc([s.annee ? 'création ' + s.annee : null, s.duree].filter(Boolean).join(' · '))}</p>
        <h2 id="panel-title"><span class="sr-only">${esc(s.titre)}</span><span aria-hidden="true">${letters}</span></h2><p class="panel-sub">${esc(s.sous_titre)}</p></div></div>
        <div class="panel-main"><div class="profile-tabs" role="tablist" aria-label="Lire cette page en tant que">
        ${tabsDef.map(([k, l]) => `<button class="tab" role="tab" id="pt-${k}" aria-controls="pp-${k}" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}">${l}</button>`).join('')}</div>
        <div role="tabpanel" id="pp-public" aria-labelledby="pt-public" ${tab === 'public' ? '' : 'hidden'}>${tabPublic(s)}</div>
        <div role="tabpanel" id="pp-classe" aria-labelledby="pt-classe" ${tab === 'classe' ? '' : 'hidden'}>${tabClasse(s)}</div>
        <div role="tabpanel" id="pp-pro" aria-labelledby="pt-pro" ${tab === 'pro' ? '' : 'hidden'}>${tabPro(s)}</div></div>`;
      $('#panel-back', dlg).addEventListener('click', close);
      Tabs.wire($('.profile-tabs', dlg));
      $$('[data-agenda]', dlg).forEach(b => b.addEventListener('click', () => { const slug = b.dataset.agenda; close(() => Agenda.focusShow(slug)); }));
      $$('[data-open]', dlg).forEach(b => b.addEventListener('click', () => open(b.dataset.open, { from })));
    }
    function open(slug, opts = {}) {
      const s = bySlug[slug]; if (!s) return;
      current = slug; from = opts.from || document.activeElement;
      render(s);
      if (!dlg.open) dlg.showModal();
      dlg.scrollTop = 0;
      $('#panel-back', dlg).focus({ preventScroll: true });
      if (opts.viaInk) Ink.fadeOut();
    }
    function close(after) {
      if (!dlg.open) return;
      const done = () => { if (typeof after === 'function') after(); else if (from && document.contains(from)) from.focus({ preventScroll: true }); };
      if (motionOK() && typeof after !== 'function') {
        Ink.fill(); dlg.close();
        let c = Stage.center();
        if (from && document.contains(from) && !from.classList.contains('t-label')) { const r = from.getBoundingClientRect(); c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        Stage.returnAll();
        Ink.uncover(c.x, clamp(c.y, 60, window.innerHeight - 60), done);
      } else { dlg.close(); Stage.returnAll(); done(); }
    }
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    return { open, close };
  })();

  /* onglets accessibles (flèches gauche/droite) */
  const Tabs = {
    wire(list, onChange) {
      const tabs = $$('[role="tab"]', list);
      const select = tab => {
        tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; const p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on; });
        onChange && onChange(tab);
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', e => {
          const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n); }
        });
      });
      return select;
    }
  };

  /* ===================== grille des spectacles ===================== */
  function renderGrid() {
    const ul = $('#show-grid');
    ul.innerHTML = SHOWS.map(s => {
      const nx = nextOf(s.slug);
      const next = s.slug === 'actions-culturelles' ? '<span class="sc-next">Pour les établissements</span>' : nx ? `<span class="sc-next">Prochaine date : ${esc(shortDate(nx.start))} · ${esc(nx.commune)}</span>` : '<span class="sc-next none">Pas de date annoncée</span>';
      return `<li><button class="show-card" type="button" data-open="${s.slug}"><img src="${DATA.photos[s.slug]}" alt="" loading="lazy">
        <span class="sc-body"><span class="sc-title">${esc(s.titre)}</span><span class="sc-sub">${esc(s.sous_titre)}${s.annee ? ' · ' + s.annee : ''}</span>${next}</span></button></li>`;
    }).join('');
    $$('[data-open]', ul).forEach(b => b.addEventListener('click', () => {
      if (motionOK()) { const r = b.getBoundingClientRect(); Ink.cover(r.left + r.width / 2, r.top + r.height / 2, () => Panel.open(b.dataset.open, { from: b, viaInk: true })); }
      else Panel.open(b.dataset.open, { from: b });
    }));
  }

  /* ===================== agenda ===================== */
  const Agenda = (() => {
    const box = $('#agenda-list'), count = $('#ag-count'), sel = $('#ag-show'), city = $('#ag-city'), form = $('#agenda-filters'), dl = $('#city-list');
    const cityIndex = new Map();
    DATA.cities.forEach(([n, la, lo]) => cityIndex.set(norm(n), [n, la, lo]));
    DATA.places.forEach(p => { if (!cityIndex.has(norm(p.c))) cityIndex.set(norm(p.c), [p.c, p.lat, p.lon]); });
    dl.innerHTML = Array.from(cityIndex.values()).sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(c => `<option value="${esc(c[0])}"></option>`).join('');
    SHOWS.filter(s => s.slug !== 'actions-culturelles').forEach(s => sel.insertAdjacentHTML('beforeend', `<option value="${s.slug}">${esc(s.titre)}</option>`));
    const f = { type: 'all', show: '', origin: null, originName: '' };
    function item(r, dist) {
      const s = bySlug[r.slug] || { titre: r.slug }, d = parse(r.start);
      const multi = r.precision === 'range' || (r.days && r.days.length > 1);
      const pro = state.profile === 'pro' ? `<p class="date-pro">${[s.duree ? 'durée ' + s.duree : null, cast(s) ? cast(s) + ' comédiens au plateau' : null, r.n ? r.n + ' représentation' + (r.n > 1 ? 's' : '') : null].filter(Boolean).join(' · ')}</p>` : '';
      const classe = state.profile === 'classe' && (s.cred76 || s.pass_culture) ? `<p class="date-pro">${[s.cred76 ? 'guide CRED76' : null, s.pass_culture ? 'Pass Culture, offre collective' : null].filter(Boolean).join(' · ')}</p>` : '';
      const link = (r.links || [])[0];
      return `<li class="date${r.isNew ? ' is-new' : ''}">
        <div class="date-cal" aria-hidden="true"><span class="dow">${r.precision === 'month' ? 'mois' : JOURSC[d.getDay()]}</span><span class="day">${r.precision === 'month' ? '·' : d.getDate()}</span><span class="mon">${MOISC[d.getMonth()]}</span></div>
        <div class="date-main"><p class="date-show"><button class="linklike" type="button" data-open="${esc(r.slug)}">${esc(s.titre)}</button>
          <span class="badge ${r.type === 'scolaire' ? 'sco' : 'tp'}">${r.type === 'scolaire' ? 'Scolaire' : 'Tout public'}</span>${r.isNew ? '<span class="badge new">Nouvelle date</span>' : ''}</p>
          <p class="date-where">${esc(multi || r.precision === 'month' ? dateText(r) + ' · ' : longDate(r.start) + ' · ')}${esc(r.commune)} (${esc(r.dep)})${dist != null ? `<span class="km"> · à ${Math.round(dist)} km</span>` : ''}</p>
          ${r.details ? `<p class="date-detail">${esc(r.details)}</p>` : ''}${pro}${classe}</div>
        <div class="date-actions">${link ? `<a class="btn-sm primary" href="${esc(link)}" target="_blank" rel="noopener">Infos et réservation</a>` : ''}
          <button class="btn-sm" type="button" data-ics="${r.id}">Ajouter à mon agenda</button>
          ${r.lat != null ? `<a class="btn-sm" href="${osm(r.lat, r.lon)}" target="_blank" rel="noopener">Itinéraire</a>` : ''}</div></li>`;
    }
    function render() {
      let list = upcoming().filter(r => (f.type === 'all' || r.type === f.type) && (!f.show || r.slug === f.show));
      let html = '';
      if (f.origin) {
        list = list.map(r => ({ r, d: r.lat != null ? km(f.origin[0], f.origin[1], r.lat, r.lon) : 1e9 })).sort((a, b) => a.d - b.d);
        html = `<ul class="dates">${list.map(x => item(x.r, x.d < 1e9 ? x.d : null)).join('')}</ul>`;
        count.textContent = `${list.length} date${list.length > 1 ? 's' : ''}, de la plus proche à la plus lointaine de ${f.originName}.`;
      } else {
        let month = '';
        list.forEach(r => {
          const d = parse(r.start), m = `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
          if (m !== month) { html += `${month ? '</ul>' : ''}<h3 class="month">${m.charAt(0).toUpperCase() + m.slice(1)}</h3><ul class="dates">`; month = m; }
          html += item(r, null);
        });
        if (month) html += '</ul>';
        count.textContent = `${list.length} date${list.length > 1 ? 's' : ''} à venir${f.show ? ' pour ' + bySlug[f.show].titre : ''}${f.type !== 'all' ? (f.type === 'scolaire' ? ', scolaires' : ', tout public') : ''}.`;
      }
      box.innerHTML = html || '<p>Aucune date ne correspond à ces filtres.</p>';
      $$('[data-open]', box).forEach(b => b.addEventListener('click', () => Panel.open(b.dataset.open, { from: b })));
      $$('[data-ics]', box).forEach(b => b.addEventListener('click', () => {
        const r = seasonRows.find(x => String(x.id) === b.dataset.ics); const s = bySlug[r.slug];
        downloadICS(`${s.titre} – Compagnie Crescite`, r.start, r.end, `${r.venue || ''} ${r.commune} (${r.dep})`.trim(), r.details);
      }));
      const past = seasonRows.filter(r => r.end < todayISO);
      $('#past-note').textContent = past.length ? `Archivées automatiquement depuis le début de la saison : ${past.map(r => `${r.commune} (${dateText(r)})`).join(', ')}.` : '';
    }
    form.addEventListener('change', e => {
      if (e.target.name === 'ag-type') f.type = e.target.value;
      if (e.target === sel) f.show = sel.value;
      render();
    });
    city.addEventListener('change', () => {
      const c = cityIndex.get(norm(city.value));
      if (city.value && !c) { f.origin = null; count.textContent = `Ville inconnue : essayez une grande ville voisine.`; return; }
      f.origin = c ? [c[1], c[2]] : null; f.originName = c ? c[0] : ''; render();
    });
    form.addEventListener('reset', () => { setTimeout(() => { f.type = 'all'; f.show = ''; f.origin = null; render(); }, 0); });
    form.addEventListener('submit', e => e.preventDefault());
    function focusShow(slug) { sel.value = slug; f.show = slug; render(); $('#agenda').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' }); }
    function add(r) { seasonRows.push(r); render(); TourMap.refresh(); }
    return { render, focusShow, add };
  })();

  /* ===================== carte de tournée ===================== */
  const TourMap = (() => {
    const svg = $('#map-svg'), cv = $('#map-canvas'), ctx = cv.getContext('2d'), wrap = $('#map-wrap'), tip = $('#map-tip'), head = $('#map-head');
    const M = DATA.map, VB = 800, VH = 780, R = M.rouen;
    svg.insertAdjacentHTML('beforeend', `<path class="map-foreign" d="${M.belgium}"/><path class="map-foreign" d="${M.lux}"/>
      <g>${M.depts.map(d => `<path class="map-land" d="${d.d}"><title>${esc(d.nom)} (${esc(d.code)})</title></path>`).join('')}</g>
      <path class="map-outline" d="${M.outline}"/>
      <text x="560" y="40" fill="currentColor" style="font:italic 15px var(--font-display);fill:var(--fg-2)">Belgique</text>
      <text x="36" y="738" style="font:13px var(--font-mono);fill:var(--fg-2)">↙ La Réunion</text>`);
    head.style.left = (R[0] / VB * 100) + '%'; head.style.top = (R[1] / VH * 100) + '%';
    const SHOWNAMES = { 'mon-royaume': 'Mon Royaume', 'imaginaire-force': 'L’imaginaire forcé', 'ci-gisait-cyrano': 'Ci-gisait Cyrano', 'berenice': 'Bérénice', 'cleophene': 'Cléophène', 'autres': 'Autres spectacles' };
    const chipsBox = $('#map-chips');
    const active = new Set([...DATA.mapShows, 'autres']);
    chipsBox.innerHTML = [...DATA.mapShows, 'autres'].map(k => `<button class="chip" type="button" aria-pressed="true" data-k="${k}">${esc(SHOWNAMES[k])}</button>`).join('');
    const f = { season: 2015, type: 'all' };
    const places = DATA.places.map((p, i) => ({ ...p, i, x: p.x ?? 40, y: p.y ?? 752, offmap: p.x == null }));
    // géométrie des tentacules : une courbe de Rouen vers chaque commune, toujours enroulée dans le même sens
    places.forEach(p => {
      const dx = p.x - R[0], dy = p.y - R[1], d = Math.hypot(dx, dy);
      p.dist = d; p.local = d < 7;
      const qx = (R[0] + p.x) / 2 - dy * 0.24, qy = (R[1] + p.y) / 2 + dx * 0.24;
      p.curve = Array.from({ length: 30 }, (_, k) => { const t = k / 29, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * R[0] + b * qx + c * p.x, a * R[1] + b * qy + c * p.y]; });
      p.grow = 0; p.target = 0; p.hl = 0;
    });
    let agg = new Map(), hover = null, raf = 0, playing = 0, visible = false, lastFilterAt = performance.now();
    function compute() {
      agg = new Map();
      const all = [];
      for (const [slug, year, ty, pi, d] of DATA.tour) {
        if (f.season !== 2015 && year !== f.season) continue;
        if (!active.has(slug)) continue;
        if (f.type !== 'all' && ((f.type === 'scolaire') !== (ty === 'S'))) continue;
        all.push([slug, pi, d]);
        let a = agg.get(pi); if (!a) { a = { n: 0, shows: new Set(), last: '' }; agg.set(pi, a); }
        a.n++; a.shows.add(slug); if (d > a.last) a.last = d;
      }
      // dates ajoutées en direct depuis l'administration
      seasonRows.filter(r => r.isNew).forEach(r => {
        const key = places.findIndex(p => norm(p.c) === norm(r.commune));
        if (key >= 0 && (f.season === 2015 || f.season === 2026)) { let a = agg.get(key); if (!a) { a = { n: 0, shows: new Set(), last: '' }; agg.set(key, a); } a.n++; a.shows.add(DATA.mapShows.includes(r.slug) ? r.slug : 'autres'); all.push([r.slug, key, r.start]); }
      });
      places.forEach(p => { p.target = agg.has(p.i) ? 1 : 0; if (!p.target) p.grow = Math.min(p.grow, 1); });
      const deps = new Set(), communes = new Set();
      agg.forEach((a, pi) => { communes.add(pi); deps.add(places[pi].dep); });
      $('#st-dates').textContent = all.length; $('#st-communes').textContent = communes.size; $('#st-deps').textContent = [...deps].filter(d => d !== 'BE').length;
      const out = $('#season-out'), range = $('#season-range');
      out.textContent = f.season === 2015 ? 'toutes (2016 à 2027)' : `${f.season}-${f.season + 1}`;
      range.setAttribute('aria-valuetext', out.textContent);
      renderTable();
      lastFilterAt = performance.now();
      places.forEach(p => { if (p.target && p.grow === 0) p.delay = motionOK() ? p.dist * 1.6 : 0; });
    }
    function renderTable() {
      const rows = [...agg.entries()].map(([pi, a]) => ({ p: places[pi], a })).sort((x, y) => y.a.n - x.a.n || x.p.c.localeCompare(y.p.c, 'fr'));
      $('#map-tbody').innerHTML = rows.map(({ p, a }) => `<tr><td>${esc(p.c)}</td><td>${esc(p.dep === 'BE' ? 'Belgique' : p.dep)}</td><td class="num">${a.n}</td><td>${esc([...a.shows].map(k => SHOWNAMES[k]).join(', '))}</td><td>${esc(longDate(a.last))}</td></tr>`).join('');
    }
    function size() {
      const r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr * r.width / VB, 0, 0, dpr * r.height / VH, 0, 0);
    }
    const css = n => getComputedStyle(root).getPropertyValue(n).trim();
    function drawOne(p, alpha, hi, now, col) {
      const a = agg.get(p.i), n = a ? a.n : 1, g = clamp(p.grow, 0, 1);
      if (g <= 0) return;
      if (p.local) { ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(R[0], R[1], 18 + Math.min(10, n * 0.25), 0, Math.PI * 2); ctx.strokeStyle = hi ? col.hi : col.a; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1; return; }
      const C = p.curve, last = Math.max(1, Math.floor(g * (C.length - 1)));
      const wb = clamp(1.3 + Math.sqrt(n) * 0.9, 1.4, 6.5) * (hi ? 1.25 : 1), wt = 0.5;
      const wob = motionOK() ? Math.sin(now * 0.0016 + p.i) * 2.2 : 0;
      const L = [], Rr = [];
      for (let k = 0; k <= last; k++) {
        const a0 = C[Math.max(0, k - 1)], b0 = C[Math.min(last, k + 1)];
        let tx = b0[0] - a0[0], ty = b0[1] - a0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const s = k / (C.length - 1), w = (wb * (1 - s) + wt) / 2, off = wob * s * s;
        const x = C[k][0] - ty * off, y = C[k][1] + tx * off;
        L.push([x - ty * w, y + tx * w]); Rr.push([x + ty * w, y - tx * w]);
      }
      ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
      for (let k = 1; k < L.length; k++) ctx.lineTo(L[k][0], L[k][1]);
      for (let k = Rr.length - 1; k >= 0; k--) ctx.lineTo(Rr[k][0], Rr[k][1]);
      ctx.closePath(); ctx.globalAlpha = alpha; ctx.fillStyle = hi ? col.hi : col.a; ctx.fill();
      if (g >= 1) { const e = L[L.length - 1]; ctx.beginPath(); ctx.arc(e[0], e[1], hi ? 4 : 2.6, 0, Math.PI * 2); ctx.fillStyle = col.fg; ctx.globalAlpha = alpha * 0.9; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      raf = 0;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore();
      let busy = false;
      const since = now - lastFilterAt;
      for (const p of places) {
        if (p.target) { if (p.grow < 1) { p.grow = motionOK() ? clamp((since - (p.delay || 0)) / 700, p.grow, 1) : 1; busy = busy || p.grow < 1; } }
        else p.grow = 0;
      }
      const col = { a: css('--accent'), hi: css('--accent-ink'), fg: css('--fg') };
      // fantômes : les communes hors filtre restent visibles en très pâle
      for (const p of places) if (!p.target) { const save = p.grow; p.grow = 1; drawOne(p, 0.07, false, now, col); p.grow = save; }
      for (const p of places) if (p.target && p !== hover) drawOne(p, 0.85, false, now, col);
      if (hover) drawOne(hover, 1, true, now, col);
      if (visible && (busy || motionOK())) raf = requestAnimationFrame(frame);
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function refresh() { compute(); wake(); }
    function pick(e) {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VB, y = (e.clientY - r.top) / r.height * VH;
      let best = null, bd = 16 * 16;
      for (const p of places) { if (!p.target) continue; const px = p.local ? R[0] : p.x, py = p.local ? R[1] : p.y, d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = p; } }
      return best;
    }
    function showTip(p) {
      if (!p) { tip.hidden = true; return; }
      const a = agg.get(p.i);
      const recent = DATA.tour.filter(t => t[3] === p.i && agg.has(p.i)).sort((x, y) => y[4].localeCompare(x[4])).slice(0, 4);
      tip.innerHTML = `<strong>${esc(p.c)}${p.dep === 'BE' ? ' (Belgique)' : ` (${esc(p.dep)})`}</strong>${a.n} date${a.n > 1 ? 's' : ''} · ${esc([...a.shows].map(k => SHOWNAMES[k]).join(', '))}
        <ul>${recent.map(t => `<li>${esc(longDate(t[4]))}</li>`).join('')}</ul>`;
      const px = p.local ? R[0] : p.x, py = p.local ? R[1] : p.y;
      tip.style.left = (px / VB * 100) + '%'; tip.style.top = (py / VH * 100) + '%'; tip.hidden = false;
    }
    cv.addEventListener('pointermove', e => { const p = pick(e); if (p !== hover) { hover = p; showTip(p); wake(); } });
    cv.addEventListener('pointerleave', () => { hover = null; showTip(null); wake(); });
    chipsBox.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const k = b.dataset.k, on = b.getAttribute('aria-pressed') === 'true';
      if (on && active.size === 1) return;
      b.setAttribute('aria-pressed', String(!on)); if (on) active.delete(k); else active.add(k);
      refresh();
    });
    $$('input[name="map-type"]').forEach(r => r.addEventListener('change', () => { f.type = r.value; refresh(); }));
    const range = $('#season-range');
    range.addEventListener('input', () => { f.season = Number(range.value); stopPlay(); refresh(); });
    const playBtn = $('#season-play');
    function stopPlay() { if (playing) { clearInterval(playing); playing = 0; playBtn.textContent = 'Rejouer dix ans de tournée'; } }
    playBtn.addEventListener('click', () => {
      if (playing) { stopPlay(); return; }
      let y = 2016; f.season = y; range.value = y; refresh();
      playBtn.textContent = 'Arrêter';
      playing = setInterval(() => { y++; if (y > 2026) { stopPlay(); f.season = 2015; range.value = 2015; refresh(); return; } f.season = y; range.value = y; refresh(); }, motionOK() ? 1500 : 2500);
    });
    const listBtn = $('#map-list-toggle'), table = $('#map-table');
    listBtn.addEventListener('click', () => { const open = table.hidden; table.hidden = !open; listBtn.setAttribute('aria-expanded', String(open)); listBtn.textContent = open ? 'Masquer la liste' : 'Voir la liste des communes'; });
    new ResizeObserver(() => { size(); wake(); }).observe(wrap);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { lastFilterAt = performance.now(); places.forEach(p => { if (p.target && p.grow < 1) p.grow = 0; }); wake(); } }, { threshold: 0.15 }).observe(wrap);
    size(); compute();
    return { wake, refresh };
  })();

  /* ===================== espace troupe ===================== */
  const Troupe = (() => {
    const who = 'Adrien Vada';
    const mine = SHOWS.filter(s => (s.distribution || []).some(n => n.includes(who))).map(s => s.slug);
    const rows = DATA.troupe.filter(r => mine.includes(r.slug) && r.jour >= todayISO).sort((a, b) => a.jour.localeCompare(b.jour) || (a.heure || '').localeCompare(b.heure || ''));
    const days = [];
    rows.forEach(r => { const k = r.jour + '|' + r.slug + '|' + r.lieu; let d = days.find(x => x.k === k); if (!d) { d = { k, jour: r.jour, slug: r.slug, lieu: r.lieu, ville: r.ville, items: [] }; days.push(d); } d.items.push(r); });
    let chosen = days[0];
    const pDates = $('#tp-dates'), pRoute = $('#tp-route'), pAdmin = $('#tp-admin');
    const selectTab = Tabs.wire($('.app-frame .tabs'));
    const coordsOf = ville => { const p = DATA.places.find(x => norm(x.c) === norm(ville)); return p ? [p.lat, p.lon] : null; };
    const hours = d => d.items.map(i => (i.heure || 'horaire à préciser') + (i.scolaire ? ' (scolaire)' : ' (tout public)')).join(' · ');
    function renderDates() {
      const n = days.length, first = days[0];
      const inDays = first ? Math.round((parse(first.jour) - TODAY) / 864e5) : 0;
      pDates.innerHTML = `<div class="rm-head"><h3>Mes dates</h3><span class="date-pro">${n} jours de jeu à venir${first ? ` · prochain dans ${inDays} jours` : ''} · ${esc(mine.map(s => bySlug[s].titre).join(' et '))}</span></div>
        <ul class="my-dates">${days.map((d, i) => `<li class="my-date"><div><h4>${esc(longDate(d.jour))} · ${esc(bySlug[d.slug].titre)}</h4><p>${esc(d.lieu)}</p><p>${esc(hours(d))}</p></div>
        <div class="date-actions"><span class="status">confirmée</span><button class="btn-sm" type="button" data-route="${i}">Feuille de route</button></div></li>`).join('')}</ul>
        <p style="margin-top:16px"><button class="btn-sm primary" type="button" id="sub-ical">S’abonner depuis mon agenda</button> <span class="example">démo</span></p>`;
      $$('[data-route]', pDates).forEach(b => b.addEventListener('click', () => { chosen = days[Number(b.dataset.route)]; renderRoute(); selectTab($('#tt-route')); $('#tt-route').focus(); }));
      $('#sub-ical').addEventListener('click', () => toast('Dans la version réelle : un lien privé à coller dans Google Agenda, Apple Calendrier ou Outlook.'));
    }
    function renderRoute() {
      const d = chosen;
      if (!d) { pRoute.innerHTML = '<p>Aucune date à venir.</p>'; return; }
      const s = bySlug[d.slug], c = coordsOf(d.ville), dist = c ? Math.round(km(ROUEN[0], ROUEN[1], c[0], c[1])) : null;
      const times = d.items.map(i => i.heure).filter(h => h && /\d/.test(h)).sort();
      const crew = [...(s.distribution || []), ...(s.equipe || []).filter(([k]) => /régie|Régie/.test(k)).map(([k, v]) => `${v} (${k.toLowerCase()})`)];
      pRoute.innerHTML = `<div class="rm-head"><h3>${esc(s.titre)} · ${esc(longDate(d.jour))}</h3><span class="date-pro">Feuille de route générée depuis la base · <span class="example">modèle</span></span></div>
        <div class="roadmap">
          <div class="rm-card"><h4>Rendez-vous</h4><dl><dt>Lieu</dt><dd>${esc(d.lieu)}</dd><dt>Adresse</dt><dd>depuis la fiche du lieu <span class="example">à compléter</span></dd><dt>Convocation</dt><dd>10h00 <span class="example">exemple</span></dd></dl></div>
          <div class="rm-card"><h4>Planning</h4><dl><dt>10h00</dt><dd>arrivée, déchargement <span class="example">exemple</span></dd><dt>10h30</dt><dd>montage et réglages <span class="example">exemple</span></dd>
            ${times.map(h => `<dt>${esc(h)}</dt><dd><strong>représentation</strong> ${d.items.find(i => i.heure === h)?.scolaire ? '(scolaire)' : '(tout public)'}</dd>`).join('')}
            <dt>après</dt><dd>démontage et chargement <span class="example">exemple</span></dd></dl></div>
          <div class="rm-card"><h4>Trajet</h4><dl><dt>Départ</dt><dd>Rouen</dd><dt>Distance</dt><dd>${dist != null ? `${dist} km à vol d’oiseau` : 'à calculer'}</dd><dt>Véhicules</dt><dd>camion et voiture <span class="example">exemple</span></dd></dl>
            ${c ? `<p style="margin:10px 0 0"><a class="btn-sm" href="${osm(c[0], c[1])}" target="_blank" rel="noopener">Itinéraire</a></p>` : ''}</div>
          <div class="rm-card"><h4>Équipe du jour</h4><p style="margin:0">${esc(crew.join(', '))}</p></div>
          <div class="rm-card"><h4>Repas et hébergement</h4><p style="margin:0">Déjeuner, dîner, hôtel <span class="example">à compléter</span></p></div>
          <div class="rm-card"><h4>Contacts sur place</h4><p style="margin:0">Régie du lieu, accueil, billetterie <span class="example">à compléter</span></p></div>
        </div>
        <p style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn-sm primary" type="button" id="rm-pdf">Télécharger le PDF</button><button class="btn-sm" type="button" id="rm-ics">Ajouter à mon agenda</button></p>`;
      $('#rm-pdf').addEventListener('click', () => toast('Dans la version réelle : un PDF d’une page, aussi lisible hors ligne sur téléphone.'));
      $('#rm-ics').addEventListener('click', () => downloadICS(`${s.titre} – ${d.ville}`, d.jour, d.jour, d.lieu, `Feuille de route Crescite : ${hours(d)}`));
    }
    function renderAdmin() {
      const shows = SHOWS.filter(s => s.slug !== 'actions-culturelles');
      const venues = DATA.venues.map(v => v.split('|'));
      pAdmin.innerHTML = `<div class="admin-grid"><form class="form" id="add-form" novalidate>
        <div class="form-row"><div class="field"><label for="ad-show">Spectacle</label><select class="input" id="ad-show">${shows.map(s => `<option value="${s.slug}">${esc(s.titre)}</option>`).join('')}</select></div>
        <div class="field"><label for="ad-date">Date</label><input class="input" type="date" id="ad-date" required></div>
        <div class="field"><label for="ad-hours">Horaires</label><input class="input" id="ad-hours" value="14h et 20h"></div></div>
        <div class="form-row"><div class="field"><label for="ad-venue">Lieu</label><input class="input" id="ad-venue" list="venue-list" placeholder="Nom du théâtre ou de l’établissement" required>
          <datalist id="venue-list">${venues.map(([v, c, dp]) => `<option value="${esc(v)}">${esc(c)} (${esc(dp)})</option>`).join('')}</datalist></div>
        <div class="field"><label for="ad-city">Commune</label><input class="input" id="ad-city" list="city-list" required></div>
        <div class="field"><label for="ad-dep">Département</label><input class="input" id="ad-dep" inputmode="numeric" maxlength="3" required></div></div>
        <fieldset class="seg light" aria-label="Public"><legend>Public</legend><input type="radio" name="ad-type" id="ad-tp" value="tout_public" checked><label for="ad-tp">Tout public</label><input type="radio" name="ad-type" id="ad-sco" value="scolaire"><label for="ad-sco">Scolaire</label></fieldset>
        <div class="field"><span id="ad-cast-l">Distribution (pré-remplie, cliquez pour retirer)</span><div class="cast-chips" id="ad-cast" role="group" aria-labelledby="ad-cast-l"></div></div>
        <div class="form-row"><div class="field"><label for="ad-status">Statut</label><select class="input" id="ad-status"><option value="option">Option</option><option value="confirmee" selected>Confirmée</option><option value="contrat">Contrat signé</option></select></div>
        <label class="switch" for="ad-visible"><input type="checkbox" id="ad-visible" checked> Visible sur le site</label></div>
        <p class="date-pro" id="ad-error" role="alert"></p>
        <div><button class="btn" type="submit">Ajouter la date</button></div></form>
        <div class="preview"><h4>Aperçu public, en direct</h4><ul class="dates" id="ad-preview"></ul><p class="date-pro" id="ad-effects"></p></div></div>`;
      const g = id => $('#' + id, pAdmin);
      const d0 = new Date(TODAY); d0.setDate(d0.getDate() + 45); g('ad-date').value = isoOf(d0);
      const castBox = g('ad-cast');
      const fillCast = () => { const s = bySlug[g('ad-show').value]; castBox.innerHTML = (s.distribution || []).map(n => `<button class="chip" type="button" aria-pressed="true">${esc(n)}</button>`).join(''); };
      castBox.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); preview(); } });
      g('ad-venue').addEventListener('change', () => { const v = venues.find(([n]) => n === g('ad-venue').value); if (v) { g('ad-city').value = v[1]; g('ad-dep').value = v[2]; } preview(); });
      g('ad-city').addEventListener('change', () => { const p = DATA.places.find(x => norm(x.c) === norm(g('ad-city').value)); if (p && !g('ad-dep').value) g('ad-dep').value = p.dep; preview(); });
      const draft = () => {
        const p = DATA.places.find(x => norm(x.c) === norm(g('ad-city').value));
        const date = g('ad-date').value || todayISO;
        return { id: 9e5 + seasonRows.length, slug: g('ad-show').value, start: date, end: date, days: [date], precision: 'day', commune: g('ad-city').value || 'Commune', dep: g('ad-dep').value || '??',
          lat: p ? p.lat : null, lon: p ? p.lon : null, venue: g('ad-venue').value, type: $('input[name="ad-type"]:checked', pAdmin).value,
          details: `${g('ad-hours').value} : représentation${/et|,/.test(g('ad-hours').value) ? 's' : ''} ${g('ad-venue').value ? 'à ' + g('ad-venue').value : ''}`.trim(), links: [], label: '', n: null, isNew: true };
      };
      function preview() {
        const r = draft(), s = bySlug[r.slug], d = parse(r.start);
        const n = $$('.chip[aria-pressed="true"]', castBox).length;
        g('ad-preview').innerHTML = `<li class="date is-new"><div class="date-cal" aria-hidden="true"><span class="dow">${JOURSC[d.getDay()]}</span><span class="day">${d.getDate()}</span><span class="mon">${MOISC[d.getMonth()]}</span></div>
          <div class="date-main"><p class="date-show"><span class="linklike">${esc(s.titre)}</span><span class="badge ${r.type === 'scolaire' ? 'sco' : 'tp'}">${r.type === 'scolaire' ? 'Scolaire' : 'Tout public'}</span></p>
          <p class="date-where">${esc(longDate(r.start))} · ${esc(r.commune)} (${esc(r.dep)})</p><p class="date-detail">${esc(r.details)}</p></div></li>`;
        const visibleOn = g('ad-visible').checked && g('ad-status').value !== 'option';
        g('ad-effects').textContent = `En un clic : ${visibleOn ? 'publiée dans l’agenda et sur la carte, ' : 'gardée en interne (non publiée), '}feuille de route créée, ${n} personne${n > 1 ? 's' : ''} prévenue${n > 1 ? 's' : ''}.`;
      }
      g('ad-show').addEventListener('change', () => { fillCast(); preview(); });
      pAdmin.addEventListener('input', preview); pAdmin.addEventListener('change', preview);
      g('add-form').addEventListener('submit', e => {
        e.preventDefault();
        const miss = ['ad-date', 'ad-venue', 'ad-city', 'ad-dep'].filter(id => !g(id).value.trim());
        if (miss.length) { g('ad-error').textContent = 'Il manque : ' + miss.map(id => ({ 'ad-date': 'la date', 'ad-venue': 'le lieu', 'ad-city': 'la commune', 'ad-dep': 'le département' }[id])).join(', ') + '.'; g(miss[0]).focus(); return; }
        g('ad-error').textContent = '';
        const r = draft();
        if (g('ad-visible').checked && g('ad-status').value !== 'option') { Agenda.add(r); toast(`Date ajoutée : ${bySlug[r.slug].titre}, ${longDate(r.start)}. Elle apparaît dans l’agenda.`); }
        else toast('Date enregistrée en interne : elle n’apparaît pas sur le site.');
      });
      fillCast(); preview();
    }
    renderDates(); renderRoute(); renderAdmin();
  })();

  /* ===================== démarrage ===================== */
  initMenu();
  initControls();
  renderGrid();
  Agenda.render();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#panel').open) { e.preventDefault(); Panel.close(); } });
})();
