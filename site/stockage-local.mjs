// Les contrôles du site dans Chromium (onglets, passe-site, reactivite, shoot) ne tirent pas sur le stockage de la base.
// Chaque contexte de navigateur repartait avec un cache vide et retéléchargeait les portraits de l'équipe (7 Mo par visite
// complète) chez Supabase, dont le plan gratuit compte cette bande passante : en octobre 2026, les contrôles répétés
// l'avaient épuisée. Ici, un fichier public du stockage est demandé une seule fois par machine, puis servi depuis le disque
// (dossier temporaire crescite-stockage/), à tous les contextes et à tous les contrôles suivants.
//
//   import { garderStockage } from './stockage-local.mjs';
//   const browser = await chromium.launch(…);
//   garderStockage(browser);          // avant le premier newContext / newPage
//
// STOCKAGE=0 : aucun fichier du stockage n'est demandé (le contrôle les voit manquer, sans réseau).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PUBLIC = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//;
const DOSSIER = join(tmpdir(), 'crescite-stockage');
// (ce que le navigateur doit relire de la réponse : son type, et l'accès d'un autre site pour les fetch du dossier PDF)
const GARDES = ['content-type', 'access-control-allow-origin'];

async function servir(route) {
  if (process.env.STOCKAGE === '0') return route.abort();
  const url = route.request().url().split('#')[0];
  const f = join(DOSSIER, createHash('sha1').update(url).digest('hex'));
  if (existsSync(f) && existsSync(f + '.json')) {
    return route.fulfill({ status: 200, headers: JSON.parse(readFileSync(f + '.json', 'utf8')), body: readFileSync(f) });
  }
  let r;
  try { r = await route.fetch(); } catch { return route.abort(); }
  const corps = await r.body();
  if (r.ok()) {
    const h = r.headers(), garde = Object.fromEntries(GARDES.filter(k => h[k]).map(k => [k, h[k]]));
    try { mkdirSync(DOSSIER, { recursive: true }); writeFileSync(f, corps); writeFileSync(f + '.json', JSON.stringify(garde)); } catch {}
  }
  return route.fulfill({ response: r, body: corps });
}

export function garderStockage(browser) {
  const brancher = async ctx => { await ctx.route(PUBLIC, servir); return ctx; };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => brancher(await newContext(...a));
  // (browser.newPage crée son propre contexte : on passe par newContext pour qu'il soit branché aussi)
  browser.newPage = async (...a) => { const ctx = await browser.newContext(...a); const page = await ctx.newPage(); page.close = (c => async (...b) => { await c(...b); await ctx.close(); })(page.close.bind(page)); return page; };
  return browser;
}
