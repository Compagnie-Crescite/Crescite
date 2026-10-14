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

  /* ===================== réglages : la porte choisie, calme, lumière ===================== */
  const DOORS_OF = { voir: 'public', programmer: 'pro', etablissements: 'classe' };
  const DOOR_NAME = { public: 'Je viens voir', pro: 'Je programme', classe: 'Je fais venir dans mon établissement' };
  const DOOR_TOAST = {
    public: 'Porte « Je viens voir » : dates, lieux et réservations en avant.',
    pro: 'Porte « Je programme » : fiches, équipes et documents en avant.',
    classe: 'Porte « Je fais venir dans mon établissement » : spectacles qui se déplacent, Pass Culture et ateliers en avant.'
  };
  /* la porte choisie colore la lecture de tout le site : cartes, agenda, page d'un spectacle */
  function setProfile(k, announce) {
    if (!DOOR_NAME[k]) return;
    state.profile = k; store.set('profile', k);
    $$('.home-door').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.door === k)));
    $$('.door-link').forEach(a => a.classList.toggle('is-lens', a.dataset.door === k));
    Grid.render(); Agenda.render();
    if (announce) toast(DOOR_TOAST[k]);
  }
  function initMenu() {
    const sheet = $('#sheet-menu'), btns = [$('#menu-btn'), $('#tab-more')];
    const set = open => { sheet.hidden = !open; btns.forEach(b => b.setAttribute('aria-expanded', String(open))); };
    btns.forEach(b => b.addEventListener('click', () => set(sheet.hidden)));
    $$('a', sheet).forEach(a => a.addEventListener('click', () => set(false)));
    $$('[data-proxy]', sheet).forEach(b => b.addEventListener('click', () => { $('#' + b.dataset.proxy).click(); set(false); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) set(false); });
    document.addEventListener('click', e => { if (!sheet.hidden && !sheet.contains(e.target) && !btns.some(b => b.contains(e.target))) set(false); });
  }
  function initControls() {
    $$('.door-link').forEach(a => a.classList.toggle('is-lens', a.dataset.door === state.profile));
    const calmBtn = $('#calm-toggle');
    const syncCalm = () => { calmBtn.setAttribute('aria-pressed', String(state.calm)); syncMotion(); };
    calmBtn.addEventListener('click', () => { state.calm = !state.calm; store.set('calm', state.calm ? '1' : '0'); syncCalm(); Stage.wake(); TourMap.wake(); toast(state.calm ? 'Mode calme : plus aucune animation.' : 'Animations rétablies.'); });
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
  /* ouvrir un spectacle depuis n'importe quel bouton [data-open], avec l'encre de son univers */
  function openShow(slug, fromEl) {
    const s = bySlug[slug]; if (!s) return;
    const u = s.univers.couleurs;
    if (motionOK() && fromEl) { const r = fromEl.getBoundingClientRect(); Ink.cover(r.left + r.width / 2, r.top + r.height / 2, () => Panel.open(slug, { from: fromEl, viaInk: true }), [u.accent, u.fond]); }
    else Panel.open(slug, { from: fromEl });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b && !b.closest('#panel')) { e.preventDefault(); openShow(b.dataset.open, b); } });

  /* ===================== encre (transition), aux couleurs de l'univers visité ===================== */
  const Ink = (() => {
    const cv = $('#ink'), ctx = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, last = ['#bc3e80', '#5c1640'];
    const size = () => {
      W = window.innerWidth; H = window.innerHeight; const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const blob = (x, y, r, t) => {
      if (r <= 0) return;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = i / 72 * Math.PI * 2;
        const rr = r * (1 + 0.05 * Math.sin(5 * a + t * 3) + 0.03 * Math.sin(9 * a - t * 4));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    };
    function run(x, y, grow, dur, done, cols) {
      if (cols) last = cols;
      size(); cv.hidden = false; cv.classList.remove('fade');
      const maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.2;
      const t0 = performance.now();
      cancelAnimationFrame(raf);
      const frame = now => {
        const p = clamp((now - t0) / dur, 0, 1), e = grow ? easeInOut(p) : 1 - easeInOut(p), t = now / 1000;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = last[0]; blob(x, y, maxR * e, t);
        ctx.fillStyle = last[1]; blob(x, y, maxR * clamp((e - 0.2) / 0.8, 0, 1), t + 3);
        if (p < 1) raf = requestAnimationFrame(frame);
        else { if (!grow) { cv.hidden = true; ctx.clearRect(0, 0, W, H); } done && done(); }
      };
      raf = requestAnimationFrame(frame);
    }
    const cover = (x, y, done, cols) => run(x, y, true, 560, done, cols);
    const uncover = (x, y, done, cols) => run(x, y, false, 600, done, cols);
    const fill = col => { size(); cv.hidden = false; cv.classList.remove('fade'); ctx.fillStyle = col || last[1]; ctx.fillRect(0, 0, W, H); };
    const fadeOut = () => { cv.classList.add('fade'); setTimeout(() => { cv.hidden = true; cv.classList.remove('fade'); ctx.clearRect(0, 0, W, H); }, 320); };
    return { cover, uncover, fill, fadeOut };
  })();

  /* ===================== la scène : la pieuvre ===================== */
  /* Le logo 2.0 est dessiné sur le canevas et chaque spectacle prolonge l'un de ses huit bras. Le
     prolongement part de l'extrémité exacte du bras (même position, même direction, même épaisseur),
     glisse sous les autres traits du logo avec un liseré net, rejoint son titre, le souligne et s'enroule.
     Au repos rien ne bouge : seuls l'ouverture, le survol et la traction animent les bras. */
  const Stage = (() => {
    const el = $('.stage'), cv = $('.stage-canvas'), ctx = cv.getContext('2d');
    const ul = $('.tentacle-labels'), hint = $('.stage-hint'), copy = $('.stage-copy');
    const lay = document.createElement('canvas'), lctx = lay.getContext('2d');
    const msk = document.createElement('canvas'), mctx = msk.getContext('2d');
    const AR = DATA.arms, BOX = AR.box, W0 = AR.width, GAPL = AR.gap;
    const paths = $$('.stage-logo .t-group').map(p => new Path2D(p.getAttribute('d')));
    const INK = [247, 236, 241];
    const ROWS_D = { A1outer: 0, A1inner: 1, A2: 2, C1: 3 };
    const LANE = { A1outer: 0, A1inner: 1, A2: 2, C1: 3 };
    const ROWS_M = ['C1L', 'C1R', 'A2L', 'A2R', 'A1innerL', 'A1innerR', 'A1outerL', 'A1outerR'];
    const INTRO = ['A1outerL', 'A1outerR', 'A1innerL', 'A1innerR', 'A2L', 'A2R', 'C1L', 'C1R'];
    let W = 0, H = 0, dpr = 1, s = 0.5, ox = 0, oy = 0, mobile = false, gut = 24, pmax = 110;
    let raf = 0, visible = true, logoAlpha = 1, introT0 = 0, introOn = false, hovered = null, order = [];
    let grab = null, lastPointerAct = 0, beckonT = null, beckonTimer = 0;
    const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const T = SHOWS.map((show, i) => {
      const arm = DATA.armOf[show.slug];
      return { i, show, slug: show.slug, arm, side: arm.slice(-1), key: arm.slice(0, -1), A: AR.arms[arm],
        col: hexRgb(show.univers.couleurs.scene), P: [], cum: [], L: 1, sOwn: 0, sExit: 0, sUnder: 0, sCurl: 0,
        U: 60, ulead: 0, th: 30, lw: 120, grow: 1, hover: 0, focus: false, curl: 1, beck: 0,
        pull: { x: 0, y: 0 }, pull0: { x: 0, y: 0 }, tension: 0, mode: 'idle', t0: 0, fired: false, level: -1,
        target: { x: 0, y: 0 }, tdir: { x: -1, y: 0 }, lane: 0, maxW: 200, label: null };
    });

    /* étiquettes : de vrais boutons, dans l'ordre du répertoire pour le clavier */
    T.forEach(t => {
      const s_ = t.show, nx = nextOf(s_.slug);
      const meta = s_.annee ? `création ${s_.annee}${s_.duree ? ' · ' + s_.duree : ''}` : 'collèges, lycées, théâtres';
      const when = nx ? `→ ${shortDate(nx.start)} · ${nx.commune}` : (s_.annee ? 'pas de date annoncée' : 'avec les établissements');
      const li = document.createElement('li');
      li.innerHTML = `<button class="t-label" type="button" data-i="${t.i}" aria-describedby="tl-d-${t.i}" style="--c:${s_.univers.couleurs.scene}">
        <span class="t-title"><span class="t-tt">${esc(s_.titre)}</span></span><span class="t-info"><span class="t-meta">${esc(meta)}</span><span class="t-when">${nx ? '<span class="sr-only">prochaine date : </span>' : ''}${esc(when)}</span>
        <span class="t-reveal"><span><span class="t-reveal-inner" id="tl-d-${t.i}">${esc(s_.accroche)}<span class="t-release">Lâchez : la pieuvre vous emmène</span></span></span></span></span></button>`;
      ul.appendChild(li);
      t.label = li.firstElementChild; t.tt = $('.t-tt', t.label); t.ttl = $('.t-title', t.label);
    });

    /* ---------- géométrie ---------- */
    function bez(out, p0, p1, p2, p3, n) {
      for (let k = 1; k <= n; k++) {
        const u = k / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
      }
    }
    function buildPath(t) {
      const P = t.A.pts.map(([x, y]) => [ox + x * s, oy + y * s]);
      const iExit = P.length - 1, E = P[iExit], ed = t.A.exitdir, td = t.tdir;
      const tx = t.target.x + t.pull.x, ty = t.target.y + t.pull.y;
      let F = E, fd = ed;
      if (mobile) {
        // un crochet ou un S jusqu'au couloir, puis une descente droite : des parallèles, comme une portée
        const lane = t.lane, drop = clamp(Math.abs(E[0] - lane) * 0.75, 24, 74), yq = E[1] + drop, h = drop * 0.6;
        bez(P, E, [E[0] + ed[0] * h, E[1] + ed[1] * h], [lane, yq - h], [lane, yq], 18);
        const yf = Math.max(yq + 1, t.target.y - 24);
        P.push([lane, yf]); F = [lane, yf]; fd = [0, 1];
      }
      const d = Math.hypot(tx - F[0], ty - F[1]), k = d * (mobile ? 0.5 : 0.42);
      bez(P, F, [F[0] + fd[0] * k, F[1] + fd[1] * k], [tx - td.x * k, ty - td.y * k], [tx, ty], mobile ? 12 : 36);
      const iUnder = P.length - 1, ulen = t.U + t.ulead + 10, nU = Math.max(2, Math.round(ulen / 6));
      for (let j = 1; j <= nU; j++) P.push([tx + td.x * ulen * j / nU, ty + td.y * ulen * j / nU]);
      const iCurl = P.length - 1;
      // la pointe s'enroule vers le haut, courbure croissante ; tirer la déroule
      const Lc = mobile ? 44 : 62, n = 24, du = Lc / n, sign = td.x < 0 ? 1 : -1;
      const kap0 = 1.5 * Math.PI * 2.3 / Lc * t.curl * (1 - 0.92 * t.tension);
      let ang = Math.atan2(td.y, td.x), x = P[iCurl][0], y = P[iCurl][1];
      for (let j = 1; j <= n; j++) {
        const kap = kap0 * Math.pow((j - 0.5) / n, 1.3);
        ang += sign * kap * du * 0.5; x += Math.cos(ang) * du; y += Math.sin(ang) * du; ang += sign * kap * du * 0.5;
        P.push([x, y]);
      }
      const cum = [0];
      for (let j = 1; j < P.length; j++) cum.push(cum[j - 1] + Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]));
      t.P = P; t.cum = cum; t.L = cum[cum.length - 1];
      t.sOwn = cum[t.A.own]; t.sExit = cum[iExit]; t.sUnder = cum[iUnder]; t.sCurl = cum[iCurl];
    }
    const wRoot = () => Math.max(W0 * s, 1.6);
    function widthAt(t, u) {
      const w0 = wRoot(), w1 = Math.max(w0 * 0.7, 1.4);
      let w;
      if (u <= t.sExit) w = w0;
      else if (u <= t.sUnder) w = lerp(w0, w1, smooth(t.sExit, t.sUnder, u));
      else if (u <= t.sCurl) w = w1;
      else w = lerp(w1, 0.45, Math.pow((u - t.sCurl) / Math.max(1, t.L - t.sCurl), 0.85));
      if (u > t.sExit) w *= 1 + 0.55 * t.hover * smooth(t.sExit, t.sExit + 28, u);
      return w;
    }

    /* masque : le logo épaissi d'un liseré, sauf autour de la racine de chaque bras prolongé */
    function buildMask() {
      const g = mctx, gap = Math.max(GAPL, 1.1 / s);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, msk.width, msk.height);
      g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      g.fillStyle = g.strokeStyle = '#000'; g.lineWidth = 2 * gap; g.lineJoin = 'round';
      for (const p of paths) { g.fill(p); g.stroke(p); }
      g.globalCompositeOperation = 'destination-out'; g.lineCap = 'butt'; g.lineWidth = W0 + 2 * gap + 3;
      for (const t of T) {
        if (t.A.under) continue;                       // bras rentré : il sort de sous un autre trait, liseré compris
        const pts = t.A.pts, end = Math.min(pts.length - 1, t.A.own + 2);
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j <= end; j++) g.lineTo(pts[j][0], pts[j][1]);
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }

    function layout() {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;           // vue masquée : on attendra son retour
      W = r.width; H = r.height; mobile = W < 760; gut = mobile ? 16 : clamp(W * 0.033, 24, 48);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const c of [cv, lay, msk]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      el.classList.toggle('is-mobile', mobile);
      T.forEach(t => t.label.classList.toggle('right', mobile ? t.side === 'R' : t.side === 'L'));
      const [bx0, by0, bx1, by1] = BOX, bw = bx1 - bx0, bh = by1 - by0, bcx = (bx0 + bx1) / 2;
      const top = copy.offsetTop + copy.offsetHeight;
      if (!mobile) {
        const colW = clamp(W * 0.2, 190, 300), gapX = clamp(W * 0.045, 40, 80);
        s = clamp(Math.min((W - 2 * gut - 2 * colW - 2 * gapX) / bw, (H - top - 260) / bh), 0.28, 0.62);
        ox = W / 2 - bcx * s; oy = top + 14 - by0 * s;
        const xL = W / 2 - bw / 2 * s - gapX, xR = W / 2 + bw / 2 * s + gapX;
        const y1 = oy + 575 * s, y4 = Math.max(y1 + 210, H - 150);
        T.forEach(t => {
          const L_ = t.side === 'L';
          t.target = { x: L_ ? xL : xR, y: lerp(y1, y4, ROWS_D[t.key] / 3) };
          t.tdir = { x: L_ ? -1 : 1, y: 0 }; t.ulead = 0;
          t.maxW = Math.max(150, L_ ? xL - gut : W - gut - xR);
        });
        pmax = clamp(Math.min(W, H) * 0.14, 90, 130);
        order = [...T].sort((a, b) => (a.side === b.side ? 0 : a.side === 'L' ? -1 : 1) || ROWS_D[a.key] - ROWS_D[b.key]);
      } else {
        s = clamp((W - 60) / bw, 0.24, 0.42);
        ox = W / 2 - bcx * s; oy = top + 8 - by0 * s;
        const lanes = [14, 23, 32, 41], rr = 10, textX = 54, y0 = oy + by1 * s + 86, rowH = 64;
        T.forEach(t => {
          const L_ = t.side === 'L', lane = L_ ? lanes[LANE[t.key]] : W - lanes[LANE[t.key]];
          t.lane = lane; t.target = { x: lane + (L_ ? rr : -rr), y: y0 + ROWS_M.indexOf(t.arm) * rowH };
          t.tdir = { x: L_ ? 1 : -1, y: 0 };
          t.ulead = L_ ? textX - t.target.x : t.target.x - (W - textX);
          t.maxW = W - 2 * textX;
        });
        pmax = 80;
        order = [...T].sort((a, b) => ROWS_M.indexOf(a.arm) - ROWS_M.indexOf(b.arm));
      }
      T.forEach(t => { t.label.style.maxWidth = t.maxW + 'px'; });
      T.forEach(t => { t.U = Math.min(t.maxW, t.tt.getBoundingClientRect().width); t.th = t.ttl.offsetHeight; t.lw = t.label.offsetWidth; t.lh = t.label.offsetHeight; });
      if (!mobile) for (const side of ['L', 'R']) {
        // rangées régulières, mais un titre sur deux lignes repousse les suivants : jamais de chevauchement
        let bottom = -Infinity;
        T.filter(t => t.side === side).sort((a, b) => ROWS_D[a.key] - ROWS_D[b.key]).forEach(t => {
          t.target.y = Math.max(t.target.y, bottom + 16 + t.th - 7);
          bottom = t.target.y - t.th + 7 + t.lh;
        });
      }
      T.forEach(buildPath);
      buildMask();
      el.style.setProperty('--gy', (oy + (by0 + by1) / 2 * s).toFixed(0) + 'px');
      render();
    }

    /* ---------- dessin ---------- */
    function drawT(g, t, alpha) {
      const P = t.P, cum = t.cum, n = P.length, sMax = t.sOwn + t.grow * (t.L - t.sOwn);
      if (sMax <= t.sOwn + 0.5 && t.grow <= 0) return;
      const front = t.grow < 1 ? 12 : 0, Lp = [], Rp = [];
      for (let k = 0; k < n; k++) {
        let u = cum[k], x = P[k][0], y = P[k][1];
        if (u > sMax) { const q = (sMax - cum[k - 1]) / Math.max(1e-6, u - cum[k - 1]); x = lerp(P[k - 1][0], x, q); y = lerp(P[k - 1][1], y, q); u = sMax; }
        const a = P[Math.max(0, k - 1)], b = P[Math.min(n - 1, k + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let w = widthAt(t, u) / 2;
        if (front) w *= Math.pow(clamp((sMax - u) / front, 0, 1), 0.6);
        Lp.push([x - ty * w, y + tx * w]); Rp.push([x + ty * w, y - tx * w]);
        if (u >= sMax) break;
      }
      g.beginPath(); g.moveTo(Lp[0][0], Lp[0][1]);
      for (let k = 1; k < Lp.length; k++) g.lineTo(Lp[k][0], Lp[k][1]);
      for (let k = Rp.length - 1; k >= 0; k--) g.lineTo(Rp[k][0], Rp[k][1]);
      g.closePath();
      const c = t.col, h = t.hover;
      g.fillStyle = `rgba(${Math.round(lerp(INK[0], c[0], h))},${Math.round(lerp(INK[1], c[1], h))},${Math.round(lerp(INK[2], c[2], h))},${alpha})`;
      g.fill();
    }
    function activeT() { return grab ? grab.t : T.find(t => t.mode === 'suck' || t.mode === 'auto') || hovered || T.find(t => t.focus) || null; }
    function render() {
      const act = activeT();
      el.classList.toggle('has-active', !!act);
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, lay.width, lay.height);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const t of T) if (t.mode !== 'hidden' && t !== act) drawT(lctx, t, act ? 0.32 : 1);
      if (act && act.mode !== 'hidden') drawT(lctx, act, 1);
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'destination-out'; lctx.drawImage(msk, 0, 0); lctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(lay, 0, 0);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      ctx.globalAlpha = logoAlpha; ctx.fillStyle = 'rgb(247,236,241)';
      for (const p of paths) ctx.fill(p);
      ctx.globalAlpha = 1;
      for (const t of T) placeLabel(t, act);
    }
    function placeLabel(t, act) {
      const al = t.label.classList.contains('right');
      const tx = t.target.x + t.pull.x + t.tdir.x * t.ulead, ty = t.target.y + t.pull.y;
      const lx = clamp(al ? tx - t.lw : tx, 8, Math.max(8, W - t.lw - 8)), ly = clamp(ty - t.th + 7, 8, Math.max(8, H - t.lh - 8));
      t.label.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
      const show = t.mode === 'hidden' || t.mode === 'suck' ? 0 : smooth(0.7, 1, t.grow);
      t.label.style.opacity = show.toFixed(3);
      t.label.classList.toggle('is-active', t === act);
      const lv = t.mode === 'suck' ? t.level : Math.max(t.hover > 0.5 ? 1 : 0, t.tension >= 0.85 ? 3 : t.tension >= 0.4 ? 2 : t.tension >= 0.1 ? 1 : 0);
      if (lv !== t.level) { t.level = lv; for (const k of [1, 2, 3]) t.label.classList.toggle('lv' + k, lv >= k); setTimeout(() => { t.lh = t.label.offsetHeight; }, 330); }
    }

    /* ---------- animation : uniquement quand quelque chose change ---------- */
    function step(t, now) {
      let busy = false;
      const want = (t === hovered || t.focus || (grab && grab.t === t) || t.mode === 'auto' || t.mode === 'suck') ? 1 : 0;
      if (Math.abs(t.hover - want) > 0.004) { t.hover += (want - t.hover) * (motionOK() ? 0.2 : 1); busy = true; } else t.hover = want;
      const curlTo = 1 + 0.14 * t.hover + 0.24 * t.beck;
      if (Math.abs(t.curl - curlTo) > 0.002) { t.curl += (curlTo - t.curl) * 0.22; busy = true; } else t.curl = curlTo;
      if (t === beckonT) {
        const q = (now - t.t0b) / 1700;
        if (q >= 1) { t.beck = 0; beckonT = null; } else { t.beck = Math.sin(Math.PI * q) ** 2; busy = true; }
      }
      const q = clamp((now - t.t0) / (t.mode === 'auto' ? 420 : t.mode === 'spring' ? 560 : t.mode === 'suck' ? 520 : 820), 0, 1);
      if (t.mode === 'auto') {
        const e = easeOut(q); t.pull = { x: t.pull0.x * e, y: t.pull0.y * e }; t.tension = clamp(Math.hypot(t.pull.x, t.pull.y) / pmax, 0, 1);
        if (q >= 1) suck(t, now); busy = true;
      } else if (t.mode === 'spring') {
        const c1 = 1.70158, c3 = c1 + 1, e = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2);
        t.pull = { x: t.pull0.x * (1 - e), y: t.pull0.y * (1 - e) }; t.tension = clamp(Math.hypot(t.pull.x, t.pull.y) / pmax, 0, 1);
        if (q >= 1) { t.mode = 'idle'; t.pull = { x: 0, y: 0 }; t.tension = 0; } busy = true;
      } else if (t.mode === 'suck') {
        t.tension = 1; t.grow = 1 - easeInOut(q);
        if (q >= 0.5 && !t.fired) { t.fired = true; openFromStage(t); }
        if (q >= 1) { t.mode = 'hidden'; t.pull = { x: 0, y: 0 }; } busy = true;
      } else if (t.mode === 'grow') {
        t.grow = easeOut(q); t.tension = 1 - q;
        if (q >= 1) { t.mode = 'idle'; t.grow = 1; t.tension = 0; } busy = true;
      }
      return busy;
    }
    function frame(now) {
      raf = 0;
      if (!visible) return;
      let busy = false;
      if (introOn) {
        const e = now - introT0;
        logoAlpha = smooth(0, 560, e);
        T.forEach(t => { t.grow = easeInOut(clamp((e - 520 - INTRO.indexOf(t.arm) * 85) / 1200, 0, 1)); });
        if (e > 520 + 7 * 85 + 1200) { introOn = false; logoAlpha = 1; T.forEach(t => { t.grow = 1; }); if (store.get('pulled') !== '1') hint.classList.remove('is-hidden'); scheduleBeckon(); }
        busy = true;
      }
      for (const t of T) busy = step(t, now) || busy;
      T.forEach(buildPath);
      render();
      if (busy || grab) raf = requestAnimationFrame(frame);
    }
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
    function scheduleBeckon() {
      clearTimeout(beckonTimer);
      if (!motionOK()) return;
      beckonTimer = setTimeout(() => {
        const idle = T.filter(t => t.mode === 'idle' && t !== hovered && !t.focus && t !== beckonT);
        if (visible && !grab && !hovered && idle.length && performance.now() - lastPointerAct > 3500) {
          beckonT = idle[Math.floor(Math.random() * idle.length)]; beckonT.t0b = performance.now(); wake();
        }
        scheduleBeckon();
      }, 6500 + Math.random() * 3500);
    }

    /* ---------- interaction ---------- */
    function local(e) { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function hit(x, y) {
      let best = null, bd = 18 * 18;
      for (const t of T) {
        if (t.mode !== 'idle') continue;
        for (let k = 0; k < t.P.length; k++) {
          if (t.cum[k] < t.sExit) continue;
          const d = (t.P[k][0] - x) ** 2 + (t.P[k][1] - y) ** 2; if (d < bd) { bd = d; best = t; }
        }
      }
      return best;
    }
    function hideHint() { hint.classList.add('is-hidden'); }
    function startGrab(t, e, target) {
      if (!t || t.mode !== 'idle' || e.button > 0) return;
      e.preventDefault();
      const p = local(e);
      grab = { t, id: e.pointerId, x0: p.x, y0: p.y, moved: 0 };
      try { target.setPointerCapture(e.pointerId); } catch (err) { /* capture indisponible */ }
      el.classList.add('is-grabbing'); hideHint(); lastPointerAct = performance.now(); wake();
    }
    function moveGrab(e) {
      const p = local(e);
      if (grab && e.pointerId === grab.id) {
        const t = grab.t, vx = p.x - grab.x0, vy = p.y - grab.y0, len = Math.hypot(vx, vy);
        grab.moved = Math.max(grab.moved, len);
        const R = pmax * 1.3, lr = R * (1 - Math.exp(-len / R)), f = len ? lr / len : 0;
        t.pull = { x: vx * f, y: vy * f }; t.tension = clamp(lr / pmax, 0, 1);
        wake(); return;
      }
      if (e.pointerType === 'mouse') {
        const h = hit(p.x, p.y);
        if (h !== hovered && !(hovered && hovered.labelHover)) { hovered = h; el.classList.toggle('over-tentacle', !!h); wake(); }
      }
    }
    function endGrab(e) {
      if (!grab || e.pointerId !== grab.id) return;
      const t = grab.t, moved = grab.moved;
      grab = null; el.classList.remove('is-grabbing'); lastPointerAct = performance.now();
      if (moved < 6) activate(t);
      else if (t.tension >= 0.85) suck(t, performance.now());
      else { t.mode = 'spring'; t.t0 = performance.now(); t.pull0 = { ...t.pull }; }
      wake();
    }
    function activate(t) {
      if (!t || t.mode !== 'idle') return;
      hideHint();
      if (!motionOK()) { Panel.open(t.slug, { from: t.label }); return; }
      // traction automatique : on éloigne le titre de la pieuvre, puis elle l'avale
      const cx = ox + (BOX[0] + BOX[2]) / 2 * s, cy = oy + (BOX[1] + BOX[3]) / 2 * s;
      const lx = t.target.x + t.tdir.x * (t.U / 2 + t.ulead), ly = t.target.y;
      const dx = lx - cx, dy = ly - cy, dl = Math.hypot(dx, dy) || 1;
      t.mode = 'auto'; t.t0 = performance.now(); t.pull0 = { x: dx / dl * pmax * 1.05, y: dy / dl * pmax * 1.05 };
      wake();
    }
    function suck(t, now) { t.mode = 'suck'; t.t0 = now; t.fired = false; store.set('pulled', '1'); hideHint(); wake(); }
    function center() { const r = el.getBoundingClientRect(); return { x: r.left + ox + (BOX[0] + BOX[2]) / 2 * s, y: r.top + oy + (BOX[1] + BOX[3]) / 2 * s }; }
    function openFromStage(t) {
      const c = center(), u = t.show.univers.couleurs;
      Ink.cover(c.x, c.y, () => Panel.open(t.slug, { from: t.label, viaInk: true }), [u.accent, u.fond]);
    }
    function returnAll() {
      const now = performance.now();
      T.forEach(t => { if (t.mode === 'hidden' || t.mode === 'suck') { t.mode = 'grow'; t.t0 = now; t.grow = 0; t.fired = false; t.pull = { x: 0, y: 0 }; } });
      wake();
    }

    cv.addEventListener('pointerdown', e => { const p = local(e); startGrab(hit(p.x, p.y), e, cv); });
    el.addEventListener('pointermove', moveGrab);
    el.addEventListener('pointerleave', () => { if (hovered && !hovered.labelHover) { hovered = null; el.classList.remove('over-tentacle'); wake(); } });
    window.addEventListener('pointerup', endGrab);
    window.addEventListener('pointercancel', e => { if (grab && e.pointerId === grab.id) { const t = grab.t; grab = null; el.classList.remove('is-grabbing'); t.mode = 'spring'; t.t0 = performance.now(); t.pull0 = { ...t.pull }; wake(); } });
    T.forEach(t => {
      const b = t.label;
      b.addEventListener('pointerdown', e => startGrab(t, e, b));
      b.addEventListener('click', () => { if (performance.now() - lastPointerAct > 450) activate(t); });
      b.addEventListener('mouseenter', () => { t.labelHover = true; hovered = t; wake(); });
      b.addEventListener('mouseleave', () => { t.labelHover = false; if (hovered === t) hovered = null; wake(); });
      b.addEventListener('focus', () => { t.focus = true; wake(); });
      b.addEventListener('blur', () => { t.focus = false; wake(); });
      b.addEventListener('keydown', e => {
        const k = e.key, dir = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0;
        if (dir) { e.preventDefault(); const j = order.indexOf(t); order[(j + dir + order.length) % order.length].label.focus(); }
      });
    });
    new ResizeObserver(() => layout()).observe(el);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0.01 }).observe(el);
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });
    hint.classList.add('is-hidden');
    el.classList.add('is-live');
    layout();
    if (motionOK() && window.scrollY < 40) { introOn = true; introT0 = performance.now(); logoAlpha = 0; T.forEach(t => { t.grow = 0; }); render(); wake(); }
    else { if (store.get('pulled') !== '1') hint.classList.remove('is-hidden'); scheduleBeckon(); }
    return { wake: () => { scheduleBeckon(); wake(); }, returnAll, center, labelOf: slug => T.find(t => t.slug === slug)?.label };
  })();

  /* ===================== le centre : la page d'un spectacle ===================== */
  /* Chaque spectacle a son univers (couleurs, typographie, motif) et se lit au défilement :
     ouverture épinglée, accroche mot à mot, effet signature, récit, trois portes, dates, générique.
     En « Mode calme » ou avec « réduire les animations », tout s'affiche à plat, sans épinglage. */
  const Panel = (() => {
    const dlg = $('#panel');
    let current = null, from = null, sraf = 0, scrolly = [], pushed = false;
    const DOORS = [['public', 'Je viens voir', 'les dates, les lieux, la réservation'],
                   ['pro', 'Je programme', 'la fiche, l’équipe, les documents'],
                   ['classe', 'Je fais venir dans mon établissement', 'le spectacle ou la compagnie chez vous']];
    const nextDates = (slug, type) => upcoming().filter(r => r.slug === slug && (!type || r.type === type));
    const todo = label => `<li><span>${esc(label)}</span><span class="example">à fournir</span></li>`;
    const words = txt => txt.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' ');
    // lettre à lettre pour l'animation, mais groupées par mot : un titre ne se coupe jamais au milieu d'un mot
    const letters = txt => { let i = 0; return txt.split(' ').map(w => `<span class="wd">${Array.from(w).map(c => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join('')}</span>`).join(' '); };

    /* ---------- les effets signature ---------- */
    const SIG = {
      jumeaux(s, g) {
        return `<div class="sig sig-jumeaux"><div class="twin l"><img src="${DATA.photos[s.slug]}" alt=""></div><div class="twin r"><img src="${DATA.photos[s.slug]}" alt=""></div>
          <svg class="crown" viewBox="0 0 120 70" aria-hidden="true"><path pathLength="1" d="M8 62 L14 18 L38 42 L60 8 L82 42 L106 18 L112 62 Z M8 62 H112"/></svg>
          <p class="sig-q">${esc(g.question)}</p>
          <blockquote class="sig-vers"><p>« ${esc(g.vers)} »</p><cite>${esc(g.source)}</cite></blockquote></div>`;
      },
      nez(s, g) {
        return `<div class="sig sig-nez"><svg class="moon" viewBox="0 0 100 100" aria-hidden="true"><path d="M62 8a42 42 0 1 0 30 70A36 36 0 1 1 62 8z"/></svg>
          <blockquote class="nez-lines"><p>${g.vers.map((v, i) => `<span style="--i:${i}">${esc(v)}</span>`).join(' ')}</p><cite>${esc(g.source)}</cite></blockquote></div>`;
      },
      cercle(s, g) {
        return `<div class="sig sig-cercle"><div class="ring-photo"><img src="${DATA.photos[s.slug]}" alt=""></div>
          <svg class="ring" viewBox="0 0 400 400" aria-hidden="true"><defs><path id="ring-a" d="M200 200m-178 0a178 178 0 1 1 356 0a178 178 0 1 1-356 0"/><path id="ring-b" d="M200 200m-146 0a146 146 0 1 1 292 0a146 146 0 1 1-292 0"/></defs>
            <circle class="ring-line" cx="200" cy="200" r="194" pathLength="1"/>
            <g class="ring-rot"><text><textPath href="#ring-a">${esc(g.vers)} · </textPath></text></g>
            <g class="ring-rot2"><text class="latin"><textPath href="#ring-b">${esc(g.latin.toUpperCase())} · ${esc(g.latin.toUpperCase())} · ${esc(g.latin.toUpperCase())} · </textPath></text></g></svg>
          <blockquote class="sig-vers"><p>« ${esc(g.vers)} »</p><cite>${esc(g.source)}</cite><p class="sig-latin"><i lang="la">${esc(g.latin)}</i> : ${esc(g.latin_sens)}</p></blockquote></div>`;
      },
      paperboard(s, g) {
        return `<div class="sig sig-board"><div class="easel" aria-hidden="true"></div><ol class="sheets">${g.feuilles.map((f, i) => `<li class="sheet" style="--i:${i};--z:${g.feuilles.length - i}">
          <span class="l1">${esc(f[0])}</span><span class="l2">${esc(f[1])}</span><span class="src">${esc(f[2])}</span></li>`).join('')}</ol>
          <p class="sig-note">Shakespeare condensé, commenté, et parfois traduit au feutre.</p></div>`;
      },
      annotations(s, g) {
        let n = 0;
        const html = esc(g.texte).replace(/\[([^\]]+)\]/g, (m, w) => { const i = n++; return `<span class="ann" style="--i:${i}">${w}<span class="ann-note" aria-hidden="true">${esc(g.notes[i])}</span></span>`; });
        return `<div class="sig sig-ann"><blockquote class="ann-text"><p>${html}</p><cite>${esc(g.source)}</cite></blockquote>
          <p class="ann-marge">${esc(g.marge)}</p>
          <p class="sr-only">Notes : ${(g.texte.match(/\[([^\]]+)\]/g) || []).map((w, i) => `${esc(w.slice(1, -1))} veut dire ${esc(g.notes[i])}`).join(' ; ')}.</p></div>`;
      },
      horloge(s, g) {
        const ticks = Array.from({ length: 60 }, (_, i) => `<line x1="100" y1="${i % 5 ? 12 : 8}" x2="100" y2="${i % 5 ? 16 : 22}" transform="rotate(${i * 6} 100 100)"/>`).join('');
        const nums = Array.from({ length: 12 }, (_, i) => { const a = (i + 1) * Math.PI / 6; return `<text x="${(100 + Math.sin(a) * 66).toFixed(1)}" y="${(100 - Math.cos(a) * 66 + 7).toFixed(1)}">${i + 1}</text>`; }).join('');
        return `<div class="sig sig-clock"><p class="stamp" aria-hidden="true">Grève</p>
          <svg class="clock" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96"/><g class="ticks">${ticks}</g><g class="nums">${nums}</g>
            <line class="hand-h" x1="100" y1="100" x2="100" y2="54"/><line class="hand-m" x1="100" y1="100" x2="100" y2="30"/><circle class="pin" cx="100" cy="100" r="4"/></svg>
          <ol class="steps">${g.etapes.map((e, i) => `<li style="--i:${i}"><b>${esc(g.heures[i])}</b> ${esc(e)}</li>`).join('')}</ol></div>`;
      },
      fil(s, g) {
        return `<div class="sig sig-fil"><svg class="thread" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M-20 120 C 260 40, 420 260, 300 420 S 120 760, 420 780 S 860 560, 760 340 S 520 120, 700 60 S 1000 200, 1040 520"/></svg>
          <blockquote class="fil-vers"><p lang="en">${esc(g.vers)}</p><cite>${esc(g.source)}</cite></blockquote>
          <dl class="fil-num">${g.chiffres.map(([a, b], i) => `<div style="--i:${i}"><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>`;
      },
      heures(s, g) {
        return `<div class="sig sig-heures"><svg class="gauge" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="g0"/><circle cx="100" cy="100" r="88" class="g1" pathLength="1"/></svg>
          <p class="big"><span class="count" data-n="${g.nombre}">${g.nombre}</span><span class="unit">${esc(g.unite)}</span><span class="per">${esc(g.periode)}</span></p>
          <ul class="mots">${g.mots.map((m, i) => `<li style="--i:${i}">${esc(m)}</li>`).join('')}</ul></div>`;
      }
    };
    /* effets qui demandent un peu de calcul en plus des variables CSS */
    const FX = {
      horloge(sec, p) {
        const h = sec.querySelector('.hand-h'), m = sec.querySelector('.hand-m');
        if (h) { h.setAttribute('transform', `rotate(${240 + p * 300} 100 100)`); m.setAttribute('transform', `rotate(${p * 3600} 100 100)`); }
        const k = Math.min(4, Math.floor(p * 5.2));
        sec.querySelectorAll('.steps li').forEach((li, i) => li.classList.toggle('on', i <= k && p > 0.02));
      },
      heures(sec, p) {
        const c = sec.querySelector('.count'); if (c) c.textContent = Math.round(Number(c.dataset.n) * easeOut(clamp(p * 1.25, 0, 1)));
      }
    };

    /* ---------- les trois portes ---------- */
    function doorPublic(s) {
      const list = nextDates(s.slug);
      return `<div class="door-grid"><div><h4>Prochaines dates</h4>${datesList(list.slice(0, 6))}
        <p class="door-more"><button class="btn-sm" type="button" data-agenda="${esc(s.slug)}">Toutes les dates dans l’agenda</button></p></div>
        <div><h4>En pratique</h4><dl class="facts">${s.duree ? `<dt>Durée</dt><dd>${esc(s.duree)}</dd>` : ''}<dt>À partir de</dt><dd>âge conseillé <span class="example">à fournir</span></dd>
        <dt>Réserver</dt><dd>auprès du lieu de chaque date</dd></dl>
        ${s.video ? `<p><a class="btn" href="${esc(s.video)}" target="_blank" rel="noopener">Voir la vidéo</a></p>` : ''}</div></div>`;
    }
    function doorPro(s) {
      const eq = (s.equipe || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
      return `<div class="door-grid"><div><h4>La fiche</h4><dl class="facts">${s.annee ? `<dt>Création</dt><dd>${s.annee}</dd>` : ''}${s.duree ? `<dt>Durée</dt><dd>${esc(s.duree)}</dd>` : ''}
        ${cast(s) ? `<dt>Au plateau</dt><dd>${cast(s)} comédien${cast(s) > 1 ? 's' : ''}</dd>` : ''}${eq}</dl>
        ${s.copro ? `<h4>Coproduction</h4><p>${esc(s.copro)}</p>` : ''}${s.soutiens ? `<h4>Soutiens</h4><p>${esc(s.soutiens)}</p>` : ''}</div>
        <div><h4>Documents</h4><ul class="doc-list">${todo('Dossier de diffusion (PDF)')}${todo('Fiche technique (PDF)')}${todo('Conditions financières')}${todo('Photos haute définition')}
        ${s.video ? `<li><span>Vidéo intégrale ou teaser</span><a href="${esc(s.video)}" target="_blank" rel="noopener">ouvrir</a></li>` : ''}</ul>
        <h4>Contact diffusion</h4><p>Nom, téléphone et e-mail <span class="example">à fournir</span></p>
        <h4>Calendrier de tournée</h4>${datesList(nextDates(s.slug).slice(0, 4), true)}</div></div>`;
    }
    function doorClasse(s) {
      const e = s.etablissement || { mode: 'a_confirmer', texte: '' };
      const badge = { etablissement: 'Peut venir dans votre établissement', salle: 'Se joue en salle : venez avec vos classes', a_confirmer: 'Accueil dans l’établissement à confirmer' }[e.mode];
      return `<div class="door-grid"><div><p class="door-badge is-${e.mode}">${esc(badge)}</p><p class="door-lead">${esc(e.texte)}</p>
        ${s.scolaire_note ? `<p>${esc(s.scolaire_note)}</p>` : ''}
        <dl class="facts"><dt>Pass Culture</dt><dd>${s.pass_culture ? 'offre collective, réservable sur ADAGE' : 'non référencé'}</dd>
        <dt>Guide du CRED76</dt><dd>${s.cred76 ? `<a href="${esc(s.cred76)}" target="_blank" rel="noopener">fiche du spectacle</a>` : 'non référencé'}</dd>
        <dt>Niveaux conseillés</dt><dd>à préciser <span class="example">à fournir</span></dd></dl>
        <h4>Ressources</h4><ul class="doc-list">${todo('Dossier pédagogique')}${todo('Pistes d’ateliers avant et après')}${todo('Besoins techniques en établissement')}</ul></div>
        <div><h4>Dates scolaires</h4>${datesList(nextDates(s.slug, 'scolaire').slice(0, 5))}
        ${s.slug !== 'actions-culturelles' ? '<p class="door-more"><button class="btn-sm" type="button" data-open="actions-culturelles">Ateliers et actions culturelles</button></p>' : ''}
        <p class="door-more"><a class="btn" href="mailto:contact@crescite.fr?subject=${encodeURIComponent('Faire venir ' + s.titre + ' dans mon établissement')}">Construire un projet avec la compagnie</a></p></div></div>`;
    }
    function datesList(list, pro) {
      if (!list.length) return '<p class="muted">Aucune date annoncée pour l’instant.</p>';
      return `<ul class="mini-dates">${list.map(r => `<li><b>${esc(dateText(r))}</b>${esc(r.venue ? r.venue + ', ' : '')}${esc(r.commune)} (${esc(r.dep)}) · ${r.type === 'scolaire' ? 'scolaire' : 'tout public'}${!pro && (r.links || [])[0] ? ` · <a href="${esc(r.links[0])}" target="_blank" rel="noopener">réserver</a>` : ''}</li>`).join('')}</ul>`;
    }

    /* ---------- la page ---------- */
    function render(s) {
      const u = s.univers, c = u.couleurs, tab = state.profile, idx = SHOWS.indexOf(s), nxt = SHOWS[(idx + 1) % SHOWS.length], nu = nxt.univers.couleurs;
      dlg.dataset.u = u.motif;
      dlg.classList.toggle('u-light', !!u.clair);
      dlg.style.cssText = `--u-bg:${c.fond};--u-bg2:${c.fond2};--u-fg:${c.texte};--u-fg2:${c.texte2};--u-ac:${c.accent};--u-ac2:${c.accent2};--u-font:"${u.police}";--u-style:${u.style};--u-weight:${u.graisse}`;
      const dates = nextDates(s.slug);
      const crew = [...(s.distribution || []).map(n => ['Au plateau', n]), ...(s.equipe || [])];
      dlg.innerHTML = `<div class="panel-bar"><button class="btn-sm" type="button" id="panel-back">← Retour à la pieuvre</button>
          <span class="bar-title" aria-hidden="true">${esc(s.titre)}</span>
          <span class="bar-doors" aria-hidden="true">${DOORS.map(([k, l]) => `<button class="bar-door" type="button" tabindex="-1" data-door="${k}">${esc(l)}</button>`).join('')}</span>
          <span class="bar-progress" aria-hidden="true"></span></div>
        <article class="show" aria-labelledby="panel-title">
          <section class="sx sx-hero" data-scrolly><div class="sx-pin">
            <div class="hero-photo"><img src="${DATA.photos[s.slug]}" alt="Photo de ${esc(s.titre)}, ${esc(s.credit)}" style="object-position:${u.focale ?? 50}% 50%"></div>
            <div class="hero-motif" aria-hidden="true"></div>
            <div class="hero-text"><p class="eyebrow">${esc([s.annee ? 'création ' + s.annee : null, s.duree, u.nom].filter(Boolean).join(' · '))}</p>
              <h2 id="panel-title"><span class="sr-only">${esc(s.titre)}</span><span aria-hidden="true">${letters(s.titre)}</span></h2>
              <p class="hero-sub">${esc(s.sous_titre)}</p></div>
            <p class="scroll-cue" aria-hidden="true"><span></span>Faites défiler</p>
            <span class="hero-credit">${esc(s.credit)}</span></div></section>
          <section class="sx sx-hook" data-scrolly aria-label="L’accroche"><div class="sx-pin"><p class="hook" style="--n:${s.accroche.split(/\s+/).length}">${words(s.accroche)}</p></div></section>
          <section class="sx sx-sig" data-scrolly data-fx="${u.motif}" aria-label="${esc(u.nom)}"><div class="sx-pin">${SIG[u.motif](s, u.signature)}</div></section>
          <section class="sx sx-story" data-scrolly><div class="story-wrap">
            <div class="story-text"><p class="kicker">Le spectacle</p><p class="dropcap">${esc(s.texte)}</p>
              ${s.video ? `<p><a class="btn u-btn" href="${esc(s.video)}" target="_blank" rel="noopener">Voir la vidéo</a></p>` : ''}</div>
            <figure class="story-photo"><img src="${DATA.photos[s.slug]}" alt=""><figcaption>${esc(s.credit)}</figcaption></figure></div></section>
          <section class="sx sx-doors" id="portes-${esc(s.slug)}"><div class="doors-wrap"><h3 class="sx-h">Trois portes pour entrer</h3>
            <div class="doors" role="tablist" aria-label="Je suis…">${DOORS.map(([k, l, d], i) => `<button class="door" role="tab" id="pt-${k}" aria-controls="pp-${k}" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}">
              <span class="door-n" aria-hidden="true">${i + 1}</span><span class="door-l">${esc(l)}</span><span class="door-d">${esc(d)}</span></button>`).join('')}</div>
            <div class="door-panel" role="tabpanel" id="pp-public" aria-labelledby="pt-public" ${tab === 'public' ? '' : 'hidden'}>${doorPublic(s)}</div>
            <div class="door-panel" role="tabpanel" id="pp-pro" aria-labelledby="pt-pro" ${tab === 'pro' ? '' : 'hidden'}>${doorPro(s)}</div>
            <div class="door-panel" role="tabpanel" id="pp-classe" aria-labelledby="pt-classe" ${tab === 'classe' ? '' : 'hidden'}>${doorClasse(s)}</div></div></section>
          ${dates.length ? `<section class="sx sx-dates${dates.length > 3 ? ' is-track' : ''}" data-scrolly aria-labelledby="dates-h"><div class="sx-pin">
            <h3 class="sx-h" id="dates-h">${dates.length} date${dates.length > 1 ? 's' : ''} à venir</h3>
            <ol class="track">${dates.map(r => { const d = parse(r.start); return `<li class="dcard"><span class="dc-day">${r.precision === 'month' ? '·' : d.getDate()}</span>
              <span class="dc-mon">${esc(MOIS[d.getMonth()])} ${d.getFullYear()}</span><span class="dc-where">${esc(r.commune)} <small>(${esc(r.dep)})</small></span>
              <span class="dc-venue">${esc(r.venue || '')}</span><span class="badge ${r.type === 'scolaire' ? 'sco' : 'tp'}">${r.type === 'scolaire' ? 'Scolaire' : 'Tout public'}</span>
              <span class="dc-act">${(r.links || [])[0] ? `<a href="${esc(r.links[0])}" target="_blank" rel="noopener">Infos</a>` : ''}<button type="button" data-ics="${r.id}">Agenda</button></span></li>`; }).join('')}</ol></div></section>` : ''}
          ${crew.length ? `<section class="sx sx-credits" aria-labelledby="cred-h"><h3 class="sx-h" id="cred-h">Le générique</h3>
            <dl class="credits">${crew.map(([k, v]) => `<div class="cr"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
            ${s.copro || s.soutiens ? `<p class="partners">${esc([s.copro, s.soutiens].filter(Boolean).join(' · '))}</p>` : ''}</section>` : ''}
          <section class="sx-next" style="--n-bg:${nu.fond};--n-fg:${nu.texte};--n-ac:${nu.accent};--n-font:'${nxt.univers.police}';--n-style:${nxt.univers.style}">
            <button type="button" class="next-btn" data-next="${esc(nxt.slug)}"><span class="next-k">La tentacule suivante</span><span class="next-t">${esc(nxt.titre)}</span><span class="next-s">${esc(nxt.sous_titre)}</span></button></section>
        </article>`;
      $('#panel-back', dlg).addEventListener('click', () => close());
      const selectDoor = Tabs.wire($('.doors', dlg), tabEl => {
        const k = tabEl.id.replace('pt-', '');
        $$('.bar-door', dlg).forEach(b => b.classList.toggle('on', b.dataset.door === k));
        setProfile(k, false);
      });
      $$('.bar-door', dlg).forEach(b => { b.classList.toggle('on', b.dataset.door === tab); b.addEventListener('click', () => { const t = $('#pt-' + b.dataset.door, dlg); selectDoor(t); $('.sx-doors', dlg).scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' }); t.focus({ preventScroll: true }); }); });
      $$('[data-agenda]', dlg).forEach(b => b.addEventListener('click', () => { const slug = b.dataset.agenda; close(() => Agenda.focusShow(slug)); }));
      $$('[data-open]', dlg).forEach(b => b.addEventListener('click', () => go(b.dataset.open)));
      $('[data-next]', dlg).addEventListener('click', e => go(e.currentTarget.dataset.next));
      $$('[data-ics]', dlg).forEach(b => b.addEventListener('click', () => {
        const r = seasonRows.find(x => String(x.id) === b.dataset.ics);
        downloadICS(`${s.titre} – Compagnie Crescite`, r.start, r.end, `${r.venue || ''} ${r.commune} (${r.dep})`.trim(), r.details);
      }));
      scrolly = $$('[data-scrolly]', dlg);
      sizeTracks();
      $$('.cr', dlg).forEach(el => io.observe(el));
      update();
    }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: dlg, threshold: 0.2 });

    /* ---------- le moteur du défilement : une variable --p par chapitre ---------- */
    function sizeTracks() {
      const sec = $('.sx-dates.is-track', dlg); if (!sec) return;
      const tr = $('.track', sec), extra = Math.max(0, tr.scrollWidth - dlg.clientWidth + 64);
      sec.style.setProperty('--track', extra + 'px');
      sec.style.height = still() ? '' : `calc(100vh + ${extra}px)`;
    }
    const still = () => !motionOK();
    function update() {
      sraf = 0;
      const vh = dlg.clientHeight;
      for (const sec of scrolly) {
        const r = sec.getBoundingClientRect(), span = r.height - vh;
        const p = still() ? 1 : span > 40 ? clamp(-r.top / span, 0, 1) : clamp((vh - r.top) / (vh + r.height), 0, 1);
        sec.style.setProperty('--p', p.toFixed(4));
        const fx = sec.dataset.fx; if (fx && FX[fx]) FX[fx](sec, p);
      }
      const max = dlg.scrollHeight - vh, pr = max > 0 ? dlg.scrollTop / max : 0;
      dlg.style.setProperty('--read', pr.toFixed(4));
      dlg.classList.toggle('past-hero', dlg.scrollTop > vh * 0.8);
    }
    dlg.addEventListener('scroll', () => { if (!sraf) sraf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', () => { if (dlg.open) { sizeTracks(); update(); } });

    function go(slug) {
      const s = bySlug[slug]; if (!s) return;
      if (!motionOK()) { open(slug, { from }); return; }
      const u = s.univers.couleurs;
      Ink.cover(window.innerWidth / 2, window.innerHeight - 60, () => open(slug, { from, viaInk: true }), [u.accent, u.fond]);
    }
    function open(slug, opts = {}) {
      const s = bySlug[slug]; if (!s) return;
      const was = dlg.open;
      current = slug; from = opts.from || (was ? from : document.activeElement);
      // une adresse par spectacle : #/spectacles/cleophene, avec le bouton retour du navigateur
      if (!opts.fromRoute) {
        if (!was) { history.pushState(null, '', '#/spectacles/' + slug); pushed = true; }
        else history.replaceState(null, '', '#/spectacles/' + slug);
      }
      dlg.classList.toggle('still', !motionOK());
      if (!was) dlg.showModal();
      render(s);
      dlg.scrollTop = 0; update();
      $('#panel-back', dlg).focus({ preventScroll: true });
      if (opts.viaInk) Ink.fadeOut();
    }
    function close(after, opts = {}) {
      if (!dlg.open) return;
      const s = bySlug[current], u = s ? s.univers.couleurs : null;
      const done = () => { if (typeof after === 'function') after(); else if (from && document.contains(from) && from.offsetParent) from.focus({ preventScroll: true }); };
      if (!opts.fromRoute) {
        const here = '#/' + (Router.current() === 'accueil' ? '' : Router.current());
        if (pushed && typeof after !== 'function') history.back(); else history.replaceState(null, '', here);
      }
      pushed = false;
      if (motionOK() && typeof after !== 'function') {
        Ink.fill(u ? u.fond : null); dlg.close();
        let c = Router.current() === 'accueil' ? Stage.center() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        if (from && document.contains(from) && from.offsetParent && !from.classList.contains('t-label')) { const r = from.getBoundingClientRect(); c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        Stage.returnAll();
        Ink.uncover(c.x, clamp(c.y, 60, window.innerHeight - 60), done, u ? [u.accent, u.fond] : null);
      } else { dlg.close(); Stage.returnAll(); done(); }
    }
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    return { open, close, isOpen: () => dlg.open, current: () => current };
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

  /* ===================== petites aides de rendu ===================== */
  const uvars = s => { const c = s.univers.couleurs; return `--u-bg:${c.fond};--u-fg:${c.texte};--u-ac:${c.accent};--u-font:'${s.univers.police}';--u-style:${s.univers.style}`; };
  const ETAB = { etablissement: 'Peut venir dans votre établissement', salle: 'En salle, avec vos classes', a_confirmer: 'Accueil en établissement à confirmer' };
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  function locate(ok) {
    if (!navigator.geolocation) { toast('La localisation n’est pas disponible sur cet appareil : indiquez votre ville.'); return; }
    navigator.geolocation.getCurrentPosition(ok, () => toast('Localisation refusée ou indisponible : indiquez plutôt votre ville.'), { timeout: 8000, maximumAge: 600000 });
  }
  const fakeSend = (form, msg) => form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = $$('[required]', form).find(i => !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)));
    if (bad) { bad.focus(); toast('Il manque un champ : ' + ($(`label[for="${bad.id}"]`)?.textContent || 'à compléter') + '.'); return; }
    toast(msg); form.reset();
  });

  /* ===================== spectacles : la grille, lue avec la porte choisie ===================== */
  const Grid = (() => {
    const ul = $('#show-grid'), filt = $('#grid-filters');
    const PATTERN = ['big', '', '', 'wide', 'wide', '', '', ''];
    let f = 'all';
    const match = s => f === 'all' || (f === 'tour' && !!nextOf(s.slug)) || (f === 'etab' && (s.etablissement || {}).mode === 'etablissement') || (f === 'new' && s.annee >= 2018);
    function render() {
      const k = state.profile, list = SHOWS.filter(match);
      $('#grid-door').textContent = DOOR_NAME[k];
      ul.innerHTML = list.map((s, i) => {
        const nx = nextOf(s.slug);
        let line;
        if (k === 'pro') line = [s.annee ? 'création ' + s.annee : 'sur mesure', s.duree, cast(s) ? cast(s) + ' au plateau' : null].filter(Boolean).join(' · ');
        else if (k === 'classe') line = (ETAB[(s.etablissement || {}).mode] || '') + (s.pass_culture ? ' · Pass Culture' : '');
        else line = s.slug === 'actions-culturelles' ? 'Pour les établissements' : nx ? `Prochaine date : ${shortDate(nx.start)} · ${nx.commune}` : 'Pas de date annoncée';
        const tag = s.annee === 2024 ? 'Nouvelle création' : nx ? 'En tournée' : s.annee ? 'Au répertoire' : 'Toute l’année';
        return `<li class="${list.length >= 6 ? PATTERN[i] || '' : ''}"><button class="show-card" type="button" data-open="${s.slug}" style="${uvars(s)}">
          <img src="${DATA.photos[s.slug]}" alt="" loading="lazy"><span class="sc-tag">${esc(tag)}</span>
          <span class="sc-body"><span class="sc-title">${esc(s.titre)}</span><span class="sc-sub">${esc(s.sous_titre)}${s.annee ? ' · ' + s.annee : ''}</span><span class="sc-next">${esc(line)}</span></span></button></li>`;
      }).join('') || '<li style="grid-column:1/-1"><p>Aucun spectacle ne correspond à ce filtre.</p></li>';
    }
    filt.addEventListener('click', e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      f = b.dataset.f; $$('[data-f]', filt).forEach(x => x.setAttribute('aria-pressed', String(x === b))); render();
    });
    return { render };
  })();

  /* ===================== accueil : prochainement, chiffres ===================== */
  const Home = (() => {
    function next() {
      $('#next-strip').innerHTML = upcoming().slice(0, 10).map(r => {
        const s = bySlug[r.slug], d = parse(r.start);
        return `<li class="next-card"><button type="button" data-open="${r.slug}" style="${uvars(s)}" aria-label="${esc(s.titre)}, ${esc(dateText(r))}, ${esc(r.commune)}">
          <span class="nc-day">${r.precision === 'month' ? '·' : d.getDate()}</span><span class="nc-mon">${MOIS[d.getMonth()]} ${d.getFullYear()}</span>
          <span class="nc-t">${esc(s.titre)}</span><span class="nc-w">${esc(r.commune)} (${esc(r.dep)}) · ${r.type === 'scolaire' ? 'scolaire' : 'tout public'}</span></button></li>`;
      }).join('');
    }
    function numbers() {
      const st = DATA.stats, dl = $('#numbers');
      const items = [[st.dates, 'dates publiées depuis 2016'], [st.communes, 'communes où la compagnie a joué'], [st.deps, 'départements'], [SHOWS.filter(s => s.annee).length, 'spectacles au répertoire'], [260, 'heures d’éducation artistique en 2023-2024']];
      dl.innerHTML = items.map(([n, l]) => `<div><dt data-n="${n}">${motionOK() ? 0 : n}</dt><dd>${esc(l)}</dd></div>`).join('');
      if (!motionOK()) return;
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now(), els = $$('dt', dl);
        const tick = now => { const e = easeOut(clamp((now - t0) / 1400, 0, 1)); els.forEach(el => { el.textContent = Math.round(Number(el.dataset.n) * e); }); if (e < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }, { threshold: 0.4 });
      io.observe(dl);
    }
    return { init() { next(); numbers(); } };
  })();

  /* ===================== agenda : liste, calendrier, carte ===================== */
  const Agenda = (() => {
    const box = $('#agenda-list'), count = $('#ag-count'), sel = $('#ag-show'), city = $('#ag-city'), form = $('#agenda-filters'), dl = $('#city-list');
    const cityIndex = new Map();
    DATA.cities.forEach(([n, la, lo]) => cityIndex.set(norm(n), [n, la, lo]));
    DATA.places.forEach(p => { if (!cityIndex.has(norm(p.c))) cityIndex.set(norm(p.c), [p.c, p.lat, p.lon]); });
    dl.innerHTML = Array.from(cityIndex.values()).sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(c => `<option value="${esc(c[0])}"></option>`).join('');
    SHOWS.filter(s => s.slug !== 'actions-culturelles').forEach(s => sel.insertAdjacentHTML('beforeend', `<option value="${s.slug}">${esc(s.titre)}</option>`));
    const f = { type: 'all', show: '', origin: null, originName: '' };
    let mode = 'list', calMonth = null, calDay = null;
    const filtered = () => upcoming().filter(r => (f.type === 'all' || r.type === f.type) && (!f.show || r.slug === f.show));
    function item(r, dist) {
      const s = bySlug[r.slug] || { titre: r.slug }, d = parse(r.start);
      const multi = r.precision === 'range' || (r.days && r.days.length > 1);
      const pro = state.profile === 'pro' ? `<p class="date-pro">${[s.duree ? 'durée ' + s.duree : null, cast(s) ? cast(s) + ' comédiens au plateau' : null, r.n ? plural(r.n, 'représentation') : null].filter(Boolean).join(' · ')}</p>` : '';
      const classe = state.profile === 'classe' ? `<p class="date-pro">${[ETAB[(s.etablissement || {}).mode], s.cred76 ? 'guide CRED76' : null, s.pass_culture ? 'Pass Culture, offre collective' : null].filter(Boolean).join(' · ')}</p>` : '';
      const link = (r.links || [])[0];
      return `<li class="date${r.isNew ? ' is-new' : ''}" style="--sc:${s.univers ? s.univers.couleurs.scene : 'var(--line)'}">
        <div class="date-cal" aria-hidden="true"><span class="dow">${r.precision === 'month' ? 'mois' : JOURSC[d.getDay()]}</span><span class="day">${r.precision === 'month' ? '·' : d.getDate()}</span><span class="mon">${MOISC[d.getMonth()]}</span></div>
        <div class="date-main"><p class="date-show"><button class="linklike" type="button" data-open="${esc(r.slug)}">${esc(s.titre)}</button>
          <span class="badge ${r.type === 'scolaire' ? 'sco' : 'tp'}">${r.type === 'scolaire' ? 'Scolaire' : 'Tout public'}</span>${r.isNew ? '<span class="badge new">Nouvelle date</span>' : ''}</p>
          <p class="date-where">${esc(multi || r.precision === 'month' ? dateText(r) + ' · ' : longDate(r.start) + ' · ')}${esc(r.commune)} (${esc(r.dep)})${dist != null ? `<span class="km"> · à ${Math.round(dist)} km</span>` : ''}</p>
          ${r.details ? `<p class="date-detail">${esc(r.details)}</p>` : ''}${pro}${classe}</div>
        <div class="date-actions">${link ? `<a class="btn-sm primary" href="${esc(link)}" target="_blank" rel="noopener">Infos et réservation</a>` : ''}
          <button class="btn-sm" type="button" data-ics="${r.id}">Ajouter à mon agenda</button>
          ${r.lat != null ? `<a class="btn-sm" href="${osm(r.lat, r.lon)}" target="_blank" rel="noopener">Itinéraire</a>` : ''}</div></li>`;
    }
    function wireICS(el) {
      $$('[data-ics]', el).forEach(b => b.addEventListener('click', () => {
        const r = seasonRows.find(x => String(x.id) === b.dataset.ics); const s = bySlug[r.slug];
        downloadICS(`${s.titre} – Compagnie Crescite`, r.start, r.end, `${r.venue || ''} ${r.commune} (${r.dep})`.trim(), r.details);
      }));
    }
    function renderList() {
      let list = filtered(), html = '';
      if (f.origin) {
        list = list.map(r => ({ r, d: r.lat != null ? km(f.origin[0], f.origin[1], r.lat, r.lon) : 1e9 })).sort((a, b) => a.d - b.d);
        html = `<ul class="dates">${list.map(x => item(x.r, x.d < 1e9 ? x.d : null)).join('')}</ul>`;
        count.textContent = `${plural(list.length, 'date')}, de la plus proche à la plus lointaine de ${f.originName}.`;
      } else {
        let month = '';
        list.forEach(r => {
          const d = parse(r.start), m = `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
          if (m !== month) { html += `${month ? '</ul>' : ''}<h3 class="month">${m.charAt(0).toUpperCase() + m.slice(1)}</h3><ul class="dates">`; month = m; }
          html += item(r, null);
        });
        if (month) html += '</ul>';
        count.textContent = `${plural(list.length, 'date')} à venir${f.show ? ' pour ' + bySlug[f.show].titre : ''}${f.type !== 'all' ? (f.type === 'scolaire' ? ', scolaires' : ', tout public') : ''}.`;
      }
      box.innerHTML = html || '<p>Aucune date ne correspond à ces filtres.</p>';
      wireICS(box);
      const past = seasonRows.filter(r => r.end < todayISO);
      $('#past-note').textContent = past.length ? `Archivées automatiquement depuis le début de la saison : ${past.map(r => `${r.commune} (${dateText(r)})`).join(', ')}.` : '';
    }
    function renderCal() {
      const all = filtered(), list = all.filter(r => r.precision !== 'month'), fuzzy = all.length - list.length;
      if (!calMonth) { calMonth = list[0] ? parse(list[0].start) : new Date(TODAY); calMonth.setDate(1); }
      const y = calMonth.getFullYear(), m = calMonth.getMonth(), start = new Date(y, m, 1 - (new Date(y, m, 1).getDay() + 6) % 7);
      const byDay = new Map();
      list.forEach(r => (r.days && r.days.length ? r.days : [r.start]).forEach(d => { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(r); }));
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        if (i === 35 && d.getMonth() !== m) break;
        const iso = isoOf(d), evs = byDay.get(iso) || [], out = d.getMonth() !== m;
        cells += `<button type="button" class="cal-day${out ? ' out' : ''}${iso === todayISO ? ' today' : ''}${evs.length ? ' has' : ''}" data-day="${iso}" ${evs.length ? `aria-pressed="${iso === calDay}"` : 'disabled'} aria-label="${esc(longDate(iso))}${evs.length ? ', ' + plural(evs.length, 'date') : ''}">
          <span class="cal-n">${d.getDate()}</span>${evs.slice(0, 2).map(r => { const s = bySlug[r.slug]; return `<span class="cal-ev" style="${uvars(s)}">${esc(s.titre)} · ${esc(r.commune)}</span>`; }).join('')}${evs.length > 2 ? `<span class="cal-more">+${evs.length - 2}</span>` : ''}</button>`;
      }
      const day = calDay && byDay.get(calDay);
      $('#ag-cal').innerHTML = `<div class="cal-head"><button class="btn-sm" type="button" data-cal="-1" aria-label="Mois précédent">←</button><h2 aria-live="polite">${MOIS[m]} ${y}</h2><button class="btn-sm" type="button" data-cal="1" aria-label="Mois suivant">→</button></div>
        <div class="cal-grid">${['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(x => `<span class="cal-dow" aria-hidden="true">${x}</span>`).join('')}${cells}</div>
        <div class="cal-detail" aria-live="polite">${day ? `<h3 class="month">${esc(longDate(calDay))}</h3><ul class="dates">${day.map(r => item(r, null)).join('')}</ul>` : '<p class="muted">Choisissez un jour marqué pour voir ses dates.</p>'}
        ${fuzzy ? `<p class="muted">${plural(fuzzy, 'date')} au mois, sans jour précis : voir la liste.</p>` : ''}</div>`;
      $$('[data-cal]', $('#ag-cal')).forEach(b => b.addEventListener('click', () => { calMonth = new Date(y, m + Number(b.dataset.cal), 1); calDay = null; renderCal(); }));
      $$('[data-day]:not([disabled])', $('#ag-cal')).forEach(b => b.addEventListener('click', () => { calDay = b.dataset.day; renderCal(); $('#ag-cal .cal-detail').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'nearest' }); }));
      wireICS($('#ag-cal'));
    }
    function renderMap() {
      const M = DATA.map, list = filtered().filter(r => r.xy), groups = new Map();
      list.forEach(r => { const k = r.xy.join(','); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
      const pins = [...groups.entries()].map(([k, rs]) => {
        const r = rs[0], col = bySlug[r.slug].univers.couleurs.scene;
        return `<g class="ag-pin" tabindex="0" role="button" data-k="${k}" aria-label="${esc(r.commune)} : ${plural(rs.length, 'date')}"><circle cx="${r.xy[0]}" cy="${r.xy[1]}" r="${(6 + Math.min(8, rs.length * 1.4)).toFixed(1)}" fill="${col}"/></g>`;
      }).join('');
      $('#ag-map').innerHTML = `<svg viewBox="0 0 800 780" role="group" aria-label="Carte des prochaines dates"><path class="map-foreign" d="${M.belgium}"/><g>${M.depts.map(d => `<path class="map-land" d="${d.d}"/>`).join('')}</g><path class="map-outline" d="${M.outline}"/>${pins}</svg><div class="map-tip" id="ag-tip" hidden></div>`;
      const shows = [...new Set(list.map(r => r.slug))];
      $('#ag-legend').innerHTML = shows.map(sl => `<span><i style="--c:${bySlug[sl].univers.couleurs.scene}"></i>${esc(bySlug[sl].titre)}</span>`).join('') || '<span>Aucune date ne correspond.</span>';
      const tip = $('#ag-tip');
      const show = g => {
        const rs = groups.get(g.dataset.k), [x, y] = rs[0].xy;
        tip.innerHTML = `<strong>${esc(rs[0].commune)} (${esc(rs[0].dep)})</strong><ul>${rs.map(r => `<li>${esc(bySlug[r.slug].titre)} · ${esc(dateText(r))}</li>`).join('')}</ul>`;
        tip.style.left = (x / 800 * 100) + '%'; tip.style.top = (y / 780 * 100) + '%'; tip.hidden = false;
      };
      $$('.ag-pin', $('#ag-map')).forEach(g => {
        g.addEventListener('mouseenter', () => show(g)); g.addEventListener('focus', () => show(g));
        g.addEventListener('mouseleave', () => { tip.hidden = true; }); g.addEventListener('blur', () => { tip.hidden = true; });
        g.addEventListener('click', () => { const rs = groups.get(g.dataset.k); if (rs.length === 1) openShow(rs[0].slug, g); else show(g); });
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const rs = groups.get(g.dataset.k); openShow(rs[0].slug, g); } });
      });
    }
    function render() { renderList(); if (mode === 'cal') renderCal(); if (mode === 'map') renderMap(); }
    form.addEventListener('change', e => {
      if (e.target.name === 'ag-type') f.type = e.target.value;
      if (e.target === sel) f.show = sel.value;
      render();
    });
    city.addEventListener('change', () => {
      const c = cityIndex.get(norm(city.value));
      if (city.value && !c) { f.origin = null; count.textContent = 'Ville inconnue : essayez une grande ville voisine.'; return; }
      f.origin = c ? [c[1], c[2]] : null; f.originName = c ? c[0] : ''; render();
    });
    $('#ag-geo').addEventListener('click', () => locate(p => { f.origin = [p.coords.latitude, p.coords.longitude]; f.originName = 'votre position'; city.value = ''; render(); }));
    $('#ag-sub').addEventListener('click', () => toast('Dans la version réelle : un lien iCal à ajouter une fois pour toutes à Google Agenda, Apple Calendrier ou Outlook.'));
    form.addEventListener('reset', () => { setTimeout(() => { f.type = 'all'; f.show = ''; f.origin = null; calDay = null; render(); }, 0); });
    form.addEventListener('submit', e => e.preventDefault());
    Tabs.wire($('[data-view="agenda"] .view-tabs'), tab => { mode = { 'agt-list': 'list', 'agt-cal': 'cal', 'agt-map': 'map' }[tab.id]; render(); });
    function focusShow(slug) { sel.value = slug; f.show = slug; render(); location.hash = '#/agenda'; }
    function add(r) { seasonRows.push(r); render(); TourMap.refresh(); }
    return { render, focusShow, add, lookup: name => cityIndex.get(norm(name)) || null };
  })();

  /* ===================== la compagnie : créations, troupe ===================== */
  const Compagnie = (() => {
    function timeline() {
      const items = SHOWS.filter(s => s.annee).map(s => ({ y: s.annee, s }));
      items.push({ y: 2016, fact: ['Le relevé commence', 'Première saison des dates publiées sur le site.'] });
      items.push({ y: 2023, fact: ['260 heures', 'd’éducation artistique sur la saison 2023-2024.'] });
      items.push({ y: 2026, fact: [plural(DATA.season.length, 'date'), 'annoncées pour la saison 2026-2027.'] });
      items.sort((a, b) => a.y - b.y || (a.fact ? 1 : -1));
      $('#timeline').innerHTML = items.map(it => it.s
        ? `<li class="tl-item" style="${uvars(it.s)}"><span class="tl-year">${it.y}</span><span class="tl-dot"></span><button type="button" data-open="${it.s.slug}"><span class="t">${esc(it.s.titre)}</span><span class="s">${esc(it.s.sous_titre)}</span></button></li>`
        : `<li class="tl-item fact"><span class="tl-year">${it.y}</span><span class="tl-dot" style="background:var(--fg-2)"></span><button type="button" tabindex="-1" aria-hidden="true" style="cursor:default"><span class="t">${esc(it.fact[0])}</span><span class="s">${esc(it.fact[1])}</span></button></li>`).join('');
    }
    function people() {
      const actors = new Map(), crew = new Map();
      SHOWS.forEach(s => {
        (s.distribution || []).forEach(n => n.split(/\s+ou\s+/).forEach(x => { const k = x.trim(); if (!actors.has(k)) actors.set(k, new Set()); actors.get(k).add(s.slug); }));
        (s.equipe || []).forEach(([role, v]) => v.split(/\s+et\s+/).forEach(x => { const k = x.trim(); if (!crew.has(k)) crew.set(k, { roles: new Set(), shows: new Set() }); crew.get(k).roles.add(role.toLowerCase()); crew.get(k).shows.add(s.slug); }));
      });
      const dots = set => `<span class="dots" aria-hidden="true">${[...set].map(sl => `<i style="--c:${bySlug[sl].univers.couleurs.scene}"></i>`).join('')}</span>`;
      $('#people').innerHTML = [...actors.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'fr'))
        .map(([n, set]) => `<li class="person"><b>${esc(n)}</b><span>${esc([...set].map(sl => bySlug[sl].titre).join(', '))}</span>${dots(set)}</li>`).join('');
      $('#crew').innerHTML = [...crew.entries()].sort((a, b) => b[1].shows.size - a[1].shows.size || a[0].localeCompare(b[0], 'fr'))
        .map(([n, o]) => `<li class="person"><b>${esc(n)}</b><span>${esc([...o.roles].join(', '))}</span>${dots(o.shows)}</li>`).join('');
    }
    return { init() { timeline(); people(); } };
  })();

  /* ===================== porte 1 : je viens voir ===================== */
  const Voir = (() => {
    let origin = null, originName = '';
    function render() {
      let list = upcoming().filter(r => r.type === 'tout_public');
      if (origin) list = list.map(r => ({ ...r, d: r.lat != null ? km(origin[0], origin[1], r.lat, r.lon) : 1e9 })).sort((a, b) => a.d - b.d);
      list = list.slice(0, 6);
      $('#near-sub').textContent = origin ? `Les prochaines dates tout public, de la plus proche à la plus lointaine de ${originName}.` : 'Les prochaines dates tout public. Indiquez votre ville pour les classer par distance.';
      $('#near-list').innerHTML = list.map(r => { const s = bySlug[r.slug]; return `<li><button type="button" data-open="${r.slug}" style="${uvars(s)}">
        <span class="km">${origin && r.d < 1e9 ? `à ${Math.round(r.d)} km · ` : ''}${esc(dateText(r))}</span><span class="t">${esc(s.titre)}</span><span>${esc(r.venue ? r.venue + ', ' : '')}${esc(r.commune)} (${esc(r.dep)})</span></button></li>`; }).join('') || '<li>Aucune date tout public annoncée pour l’instant.</li>';
    }
    $('#near-form').addEventListener('submit', e => {
      e.preventDefault();
      const c = Agenda.lookup($('#near-city').value);
      if (!c) { toast('Ville inconnue : essayez une grande ville voisine.'); return; }
      origin = [c[1], c[2]]; originName = c[0]; render();
    });
    $('#near-geo').addEventListener('click', () => locate(p => { origin = [p.coords.latitude, p.coords.longitude]; originName = 'votre position'; render(); }));
    fakeSend($('#news-form'), 'Inscription notée : dans la version réelle, vous recevrez les dates près de chez vous.');
    return { init: render };
  })();

  /* ===================== porte 2 : je programme ===================== */
  const Programmer = (() => {
    function table() {
      const yes = v => v ? '<span class="yes">oui</span>' : '<span class="no">non</span>';
      $('#rep-table').insertAdjacentHTML('beforeend', `<thead><tr><th scope="col">Spectacle</th><th scope="col">Création</th><th scope="col">Durée</th><th scope="col">Au plateau</th><th scope="col">Dans l’établissement</th><th scope="col">Pass Culture</th><th scope="col">CRED76</th><th scope="col">Dates 2026-2027</th></tr></thead>
        <tbody>${SHOWS.map(s => `<tr><td><button class="linklike" type="button" data-open="${s.slug}">${esc(s.titre)}</button></td><td>${s.annee || '—'}</td><td>${esc(s.duree || 'à préciser')}</td>
          <td>${cast(s) ? plural(cast(s), 'comédien') : '—'}</td><td>${esc({ etablissement: 'oui', salle: 'en salle', a_confirmer: 'à confirmer' }[(s.etablissement || {}).mode] || '—')}</td>
          <td>${yes(s.pass_culture)}</td><td>${yes(s.cred76)}</td><td class="num">${DATA.season.filter(r => r.slug === s.slug).length}</td></tr>`).join('')}</tbody>`);
    }
    function gantt() {
      const months = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7].map((m, i) => ({ m, y: i < 4 ? 2026 : 2027 }));
      const rows = SHOWS.filter(s => s.slug !== 'actions-culturelles').map(s => {
        const on = months.map(({ m, y }) => seasonRows.some(r => r.slug === s.slug && (() => { const a = parse(r.start), b = parse(r.end); return a <= new Date(y, m + 1, 0) && b >= new Date(y, m, 1); })()));
        const bars = []; on.forEach((v, i) => { if (v) { if (bars.length && bars[bars.length - 1][1] === i) bars[bars.length - 1][1] = i + 1; else bars.push([i, i + 1]); } });
        const label = on.some(Boolean) ? months.filter((_, i) => on[i]).map(({ m }) => MOIS[m]).join(', ') : 'aucune date publiée';
        return `<span class="gantt-name">${esc(s.titre)}</span><div class="gantt-row" role="img" aria-label="${esc(s.titre)} : ${esc(label)}" style="--c:${s.univers.couleurs.scene}">${bars.map(([a, b]) => `<i style="left:${(a / 12 * 100).toFixed(2)}%;width:${((b - a) / 12 * 100).toFixed(2)}%"></i>`).join('')}</div>`;
      }).join('');
      $('#gantt').innerHTML = `<span></span><div class="gantt-months" aria-hidden="true">${months.map(({ m }) => `<span><span class="m-l">${MOISC[m]}</span><span class="m-s">${MOIS[m][0].toUpperCase()}</span></span>`).join('')}</div>${rows}`;
    }
    function venues() {
      $('#venues-pro').innerHTML = DATA.venuesPro.map(([l, c, d, n]) => `<li>${esc(l)}, ${esc(c)} <span>${plural(n, 'date')}</span></li>`).join('');
    }
    function form() {
      $('#pf-shows').innerHTML = SHOWS.filter(s => s.annee).map(s => `<button class="chip" type="button" aria-pressed="false" data-s="${s.slug}">${esc(s.titre)}</button>`).join('');
      $('#pf-shows').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
      fakeSend($('#pro-form'), 'Demande prête : dans la version réelle, elle part à la chargée de diffusion avec les dossiers demandés.');
    }
    return { init() { table(); gantt(); venues(); form(); } };
  })();

  /* ===================== porte 3 : je fais venir dans mon établissement ===================== */
  const Etablissements = (() => {
    function groups() {
      const G = [['etablissement', 'Peuvent venir dans votre établissement', 'var(--d-classe)'], ['salle', 'En salle, avec vos classes', 'var(--d-pro)'], ['a_confirmer', 'Accueil dans l’établissement à confirmer', 'var(--fg-2)']];
      $('#etab-groups').innerHTML = G.map(([k, title, c]) => {
        const list = SHOWS.filter(s => (s.etablissement || {}).mode === k);
        if (!list.length) return '';
        return `<div class="etab-group"><h3><i style="--c:${c}"></i>${esc(title)}</h3><ul class="mini-cards">${list.map(s => `<li><button type="button" data-open="${s.slug}" style="${uvars(s)};--img:url('${DATA.photos[s.slug]}')">
          <span class="t">${esc(s.titre)}</span><span class="s">${esc(s.etablissement.texte)}</span></button></li>`).join('')}</ul></div>`;
      }).join('');
    }
    function schools() { $('#venues-schools').innerHTML = DATA.venuesSchools.map(([l, c, d, n]) => `<li>${esc(l)}, ${esc(c)} <span>${plural(n, 'date')}</span></li>`).join(''); }
    fakeSend($('#etab-form'), 'Projet noté : dans la version réelle, la compagnie vous recontacte avec une proposition et un devis.');
    return { init() { groups(); schools(); } };
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
    // chaque comédien choisit son nom (en vrai : sa connexion) et ne voit que ses dates
    const names = [...new Set(SHOWS.flatMap(s => (s.distribution || []).flatMap(n => n.split(/\s+ou\s+/).map(x => x.trim()))))].sort((a, b) => a.localeCompare(b, 'fr'));
    let who = store.get('who') || 'Adrien Vada', mine = [], days = [], chosen = null;
    if (!names.includes(who)) who = names[0];
    function compute() {
      mine = SHOWS.filter(s => (s.distribution || []).some(n => n.split(/\s+ou\s+/).map(x => x.trim()).includes(who))).map(s => s.slug);
      const rows = DATA.troupe.filter(r => mine.includes(r.slug) && r.jour >= todayISO).sort((a, b) => a.jour.localeCompare(b.jour) || (a.heure || '').localeCompare(b.heure || ''));
      days = [];
      rows.forEach(r => { const k = r.jour + '|' + r.slug + '|' + r.lieu; let d = days.find(x => x.k === k); if (!d) { d = { k, jour: r.jour, slug: r.slug, lieu: r.lieu, ville: r.ville, items: [] }; days.push(d); } d.items.push(r); });
      chosen = days[0] || null;
      $('#who-av').textContent = who.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
    const whoSel = $('#who-sel');
    whoSel.innerHTML = names.map(n => `<option${n === who ? ' selected' : ''}>${esc(n)}</option>`).join('');
    whoSel.addEventListener('change', () => { who = whoSel.value; store.set('who', who); compute(); renderDates(); renderRoute(); });
    compute();
    const pDates = $('#tp-dates'), pRoute = $('#tp-route'), pAdmin = $('#tp-admin');
    const selectTab = Tabs.wire($('.app-frame .tabs'));
    const coordsOf = ville => { const p = DATA.places.find(x => norm(x.c) === norm(ville)); return p ? [p.lat, p.lon] : null; };
    const hours = d => d.items.map(i => (i.heure || 'horaire à préciser') + (i.scolaire ? ' (scolaire)' : ' (tout public)')).join(' · ');
    function renderDates() {
      const n = days.length, first = days[0];
      const inDays = first ? Math.round((parse(first.jour) - TODAY) / 864e5) : 0;
      const when = d => d.items[0].precision === 'month' ? `${MOIS[parse(d.jour).getMonth()]} ${parse(d.jour).getFullYear()}, dates à confirmer` : longDate(d.jour);
      pDates.innerHTML = `<div class="rm-head"><h3>Mes dates</h3><span class="date-pro">${n ? `${n} jours de jeu à venir${first ? ` · prochain dans ${inDays} jours` : ''}` : 'aucune date publiée à venir'} · ${esc(mine.map(s => bySlug[s].titre).join(', ') || 'pas de distribution publiée')}</span></div>
        <ul class="my-dates">${days.map((d, i) => `<li class="my-date" style="--sc:${bySlug[d.slug].univers.couleurs.scene}"><div><h4>${esc(when(d))} · ${esc(bySlug[d.slug].titre)}</h4><p>${esc(d.lieu)}</p><p>${esc(hours(d))}</p></div>
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

  /* ===================== navigation : des onglets, une page à la fois ===================== */
  const Router = (() => {
    const views = Object.fromEntries($$('.view').map(v => [v.dataset.view, v]));
    const done = new Set();
    const enter = { accueil: () => Home.init(), compagnie: () => Compagnie.init(), voir: () => Voir.init(), programmer: () => Programmer.init(), etablissements: () => Etablissements.init() };
    let current = null;
    const parseHash = () => { const [v, a] = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/'); return { v: v || 'accueil', a: a || null }; };
    function moveInk() {
      const ink = $('.tab-ink'), cur = $('.tab-link[aria-current="page"]'), nav = $('.tabs-nav');
      if (!cur || !nav.offsetParent) { ink.style.opacity = '0'; return; }
      const n = nav.getBoundingClientRect(), r = cur.getBoundingClientRect();
      ink.style.opacity = '1'; ink.style.width = Math.max(20, r.width - 24) + 'px'; ink.style.transform = `translateX(${(r.left - n.left + 12).toFixed(1)}px)`;
    }
    function mark(v) {
      $$('.tab-link, .door-link, .troupe-link, .tabbar a, .sheet-menu a').forEach(a => {
        const t = (a.getAttribute('href') || '').replace(/^#\/?/, '').split('/')[0] || 'accueil';
        if (t === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      moveInk();
    }
    function show(v) {
      if (!views[v]) v = 'accueil';
      if (v === current) return;
      const first = current === null, el = views[v];
      Object.entries(views).forEach(([k, x]) => { x.hidden = k !== v; });
      if (!done.has(v)) { done.add(v); if (enter[v]) enter[v](); }
      if (v === 'spectacles') Grid.render();
      if (!first && motionOK()) { el.classList.remove('is-entering'); void el.offsetWidth; el.classList.add('is-entering'); }
      current = v; mark(v);
      document.title = v === 'accueil' ? 'Crescite 2.0' : `${el.querySelector('h1')?.textContent || ''} · Crescite`;
      if (!first) { window.scrollTo(0, 0); const h = el.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    }
    function route() {
      const { v, a } = parseHash();
      if (v === 'spectacles' && a && bySlug[a]) {
        if (!current) show(DATA.armOf[a] ? 'accueil' : 'spectacles');
        if (!Panel.isOpen() || Panel.current() !== a) Panel.open(a, { fromRoute: true });
        return;
      }
      if (Panel.isOpen()) Panel.close(null, { fromRoute: true });
      show(v);
      if (DOORS_OF[v] && DOORS_OF[v] !== state.profile) setProfile(DOORS_OF[v], false);
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', moveInk);
    if (document.fonts) document.fonts.ready.then(moveInk);
    return { route, moveInk, current: () => current };
  })();

  /* ===================== démarrage ===================== */
  initMenu();
  initControls();
  $$('.home-door').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.door === state.profile)));
  Agenda.render();
  Router.route();
})();
