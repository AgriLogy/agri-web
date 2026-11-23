#!/usr/bin/env node
/**
 * Screenshot-tour report: tour-output/<run>/manifest.json → report.html +
 * report.pdf (A4, French), through Playwright's Chromium.
 *
 *   npm run tour:report -w apps/web -- tour-output/<run>            # recette
 *   npm run tour:report -w apps/web -- tour-output/<run> --founder  # parcours
 *
 * --founder leaves out every technical check: cover, contents, then for each
 * step the screenshot, what it shows and how to test it by hand. Output files
 * are then report-fondateur.{html,pdf}.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const founder = args.includes('--founder');
const runArg = args.find((a) => !a.startsWith('--'));
if (!runArg) {
  console.error('Usage: tour-report.mjs <run-dir> [--founder]');
  process.exit(1);
}
// npm -w runs this from apps/web; accept a path relative to either apps/web
// or the directory the command was typed in.
const runDir =
  [process.cwd(), process.env.INIT_CWD]
    .filter(Boolean)
    .map((d) => path.resolve(d, runArg))
    .find((d) => existsSync(path.join(d, 'manifest.json'))) ??
  path.resolve(runArg);
const manifestPath = path.join(runDir, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`manifest.json introuvable dans ${runDir}`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const steps = manifest.steps;
const base = founder ? 'report-fondateur' : 'report';

const STATUS = {
  pass: { icon: '✓', label: 'Conforme', cls: 'pass' },
  warn: { icon: '!', label: 'À vérifier', cls: 'warn' },
  fail: { icon: '✗', label: 'Anomalie', cls: 'fail' },
};
const ROLE = {
  farmer: 'Agriculteur',
  technician: 'Technicien',
  guest: 'Non connecté',
};
const VIEWPORT = {
  desktop: 'Ordinateur',
  tall: 'Ordinateur (grand écran)',
  mobile: 'Téléphone',
};
const LOCALE = { fr: 'Français', ar: 'Arabe' };

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const when = new Date(manifest.run.startedAt);
const dateFr = when.toLocaleDateString('fr-FR', {
  timeZone: 'Africa/Casablanca',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFr = when.toLocaleTimeString('fr-FR', {
  timeZone: 'Africa/Casablanca',
  hour: '2-digit',
  minute: '2-digit',
});
const web = manifest.run.web ?? {};
const version = web.describe ?? (web.sha ? web.sha.slice(0, 7) : 'inconnue');

const badge = (status) =>
  `<span class="badge ${STATUS[status].cls}">${STATUS[status].icon}</span>`;

/** Downscale screenshots to JPEG so the PDF stays light. */
async function prepareImages(browser) {
  const outDir = path.join(runDir, 'report-assets');
  mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage();
  const out = {};
  for (const s of steps) {
    if (!s.screenshot) continue;
    const src = path.join(runDir, s.screenshot);
    if (!existsSync(src)) continue;
    const dataUrl = `data:image/png;base64,${readFileSync(src).toString('base64')}`;
    const jpeg = await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      return {
        data: c.toDataURL('image/jpeg', 0.82).split(',')[1],
        w: c.width,
        h: c.height,
      };
    }, dataUrl);
    const name = `${path.basename(s.screenshot, '.png')}.jpg`;
    writeFileSync(path.join(outDir, name), Buffer.from(jpeg.data, 'base64'));
    out[s.id] = { src: `report-assets/${name}`, w: jpeg.w, h: jpeg.h };
  }
  await page.close();
  return out;
}

function sectionsSummary() {
  const map = new Map();
  for (const s of steps) {
    const row = map.get(s.section) ?? {
      section: s.section,
      first: s.n,
      n: 0,
      pass: 0,
      warn: 0,
      fail: 0,
    };
    row.n += 1;
    row[s.status] += 1;
    map.set(s.section, row);
  }
  return [...map.values()];
}

function cover() {
  const c = manifest.counts;
  return `
<section class="cover">
  <div class="brand">Agrogo</div>
  <h1>${esc(manifest.title ?? 'Agrogo — Recette fonctionnelle')}</h1>
  <p class="subtitle">${
    founder
      ? 'Parcours guidé : chaque écran, ce qu’il montre et comment le tester'
      : 'Visite guidée de l’application avec contrôles automatiques'
  }</p>
  <table class="meta">
    <tr><th>Date</th><td>${esc(dateFr)} à ${esc(timeFr)} (heure du Maroc)</td></tr>
    <tr><th>Version</th><td>${esc(version)}${web.branch ? ` · branche ${esc(web.branch)}` : ''}</td></tr>
    <tr><th>Étapes</th><td>${steps.length}</td></tr>
    ${
      founder
        ? ''
        : `<tr><th>Application</th><td>${esc(manifest.run.baseUrl)} · API ${esc(manifest.run.apiUrl)}</td></tr>
    <tr><th>Résultat</th><td>${badge('pass')} ${c.pass} conformes · ${badge('warn')} ${c.warn} à vérifier · ${badge('fail')} ${c.fail} anomalies</td></tr>`
    }
  </table>
  <p class="note">${
    founder
      ? 'Données de démonstration : ferme près de Berrechid avec « Parcelle Nord » (deux zones de capteurs, table Kc, historique satellite) et « Parcelle Sud » (sans zone), un bassin « Bassin principal », un compte agriculteur et un compte technicien.'
      : 'Chaque étape est ouverte automatiquement dans Chrome, capturée puis contrôlée : erreurs JavaScript et console, réponses API, textes suspects (NaN, undefined, clés de traduction), débordements, images, contenu, temps de chargement, éléments attendus et sens de lecture en arabe.'
  }</p>
</section>`;
}

function summary() {
  const rows = sectionsSummary()
    .map(
      (r) => `<tr>
      <td>${esc(r.section)}</td>
      <td class="num">${r.first}</td>
      <td class="num">${r.n}</td>
      ${
        founder
          ? ''
          : `<td class="num">${r.pass ? `${badge('pass')} ${r.pass}` : '—'}</td>
      <td class="num">${r.warn ? `${badge('warn')} ${r.warn}` : '—'}</td>
      <td class="num">${r.fail ? `${badge('fail')} ${r.fail}` : '—'}</td>`
      }
    </tr>`
    )
    .join('');
  const c = manifest.counts;
  const list = steps
    .map(
      (s) =>
        `<li><span class="n">${s.n}.</span> ${esc(s.title)}${founder ? '' : ` ${badge(s.status)}`}</li>`
    )
    .join('');
  return `
<section class="summary">
  <h2>${founder ? 'Sommaire' : 'Synthèse'}</h2>
  ${
    founder
      ? ''
      : `<div class="tiles">
    <div class="tile pass"><b>${c.pass}</b><span>conformes</span></div>
    <div class="tile warn"><b>${c.warn}</b><span>à vérifier</span></div>
    <div class="tile fail"><b>${c.fail}</b><span>anomalies</span></div>
  </div>`
  }
  <table class="grid">
    <thead><tr><th>Section</th><th class="num">Dès l’étape</th><th class="num">Étapes</th>${
      founder
        ? ''
        : '<th class="num">Conformes</th><th class="num">À vérifier</th><th class="num">Anomalies</th>'
    }</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <ol class="toc">${list}</ol>
  ${
    !founder && manifest.notes?.length
      ? `<div class="notes"><h4>Notes</h4><ul>${manifest.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`
      : ''
  }
</section>`;
}

function stepBlock(s, img) {
  const checks = founder
    ? ''
    : `<table class="checks">
        ${s.checks
          .map(
            (c) => `<tr class="${c.status}">
          <td class="icon">${badge(c.status)}</td>
          <td class="label">${esc(c.label)}</td>
          <td class="detail">${esc(c.detail)}</td></tr>`
          )
          .join('')}
      </table>`;
  // Very tall captures (long pages) get a narrower box to fit the page.
  const tall = img && img.h / img.w > 1.6;
  return `
<section class="step">
  <div class="step-head">
    <div class="crumbs">${esc(s.section)} · Étape ${s.n} / ${steps.length}</div>
    <h3>${founder ? '' : `${badge(s.status)} `}${esc(s.title)}</h3>
    <div class="tags">
      <span>${esc(ROLE[s.role] ?? s.role)}</span>
      <span>${esc(LOCALE[s.locale] ?? s.locale)}</span>
      <span>${esc(VIEWPORT[s.viewport] ?? s.viewport)}</span>
      <span class="path">${esc(s.path)}</span>
    </div>
  </div>
  ${
    img
      ? `<figure class="${tall ? 'tall' : ''}${s.viewport === 'mobile' ? ' mobile' : ''}"><img src="${esc(img.src)}" alt="${esc(s.title)}"></figure>`
      : '<p class="missing">Capture indisponible.</p>'
  }
  <p class="caption">${esc(s.caption)}</p>
  <div class="howto">
    <h4>Comment tester</h4>
    <ol>${s.howToTest.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
  </div>
  ${checks}
</section>`;
}

function appendix() {
  if (founder) return '';
  const items = steps
    .map((s) => ({ s, bad: s.checks.filter((c) => c.status !== 'pass') }))
    .filter((x) => x.bad.length);
  return `
<section class="appendix">
  <h2>Annexe — points à vérifier et anomalies</h2>
  ${
    items.length
      ? items
          .map(
            ({ s, bad }) => `<div class="app-step">
      <h4>${badge(s.status)} ${s.n}. ${esc(s.title)} <small>(${esc(s.id)})</small></h4>
      <ul>${bad
        .map(
          (c) =>
            `<li>${badge(c.status)} <b>${esc(c.label)}</b> — ${esc(c.detail)}</li>`
        )
        .join('')}</ul>
    </div>`
          )
          .join('')
      : '<p>Aucun point à signaler : toutes les étapes sont conformes.</p>'
  }
</section>`;
}

const CSS = `
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a202c; font-size: 10.5pt; line-height: 1.4; margin: 0; }
h1, h2, h3, h4 { margin: 0; }
.badge { display: inline-flex; align-items: center; justify-content: center; width: 1.25em; height: 1.25em; border-radius: 50%; color: #fff; font-weight: 700; font-size: .85em; line-height: 1; vertical-align: -0.15em; }
.badge.pass { background: #2f855a; } .badge.warn { background: #c05621; } .badge.fail { background: #c53030; }
.cover { height: 255mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; padding: 0 8mm; }
.cover .brand { color: #2f855a; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 13pt; }
.cover h1 { font-size: 30pt; margin: 6mm 0 3mm; }
.cover .subtitle { font-size: 14pt; color: #4a5568; margin: 0 0 12mm; }
.meta { border-collapse: collapse; font-size: 11pt; }
.meta th { text-align: left; color: #718096; font-weight: 600; padding: 2mm 8mm 2mm 0; vertical-align: top; }
.meta td { padding: 2mm 0; }
.cover .note { margin-top: 14mm; color: #4a5568; max-width: 150mm; }
.summary { page-break-after: always; }
.summary h2, .appendix h2 { font-size: 18pt; margin-bottom: 6mm; }
.tiles { display: flex; gap: 5mm; margin-bottom: 7mm; }
.tile { flex: 1; border-radius: 3mm; padding: 4mm 5mm; color: #fff; }
.tile b { display: block; font-size: 22pt; } .tile.pass { background: #2f855a; } .tile.warn { background: #c05621; } .tile.fail { background: #c53030; }
table.grid { width: 100%; border-collapse: collapse; margin-bottom: 7mm; }
table.grid th, table.grid td { border-bottom: 1px solid #e2e8f0; padding: 1.6mm 2mm; text-align: left; }
table.grid th { background: #f7fafc; font-size: 9pt; color: #4a5568; }
.num { text-align: right !important; white-space: nowrap; }
ol.toc { columns: 2; column-gap: 8mm; font-size: 9pt; padding-left: 0; list-style: none; margin: 0; }
ol.toc li { break-inside: avoid; padding: .5mm 0; } ol.toc .n { color: #718096; display: inline-block; min-width: 7mm; }
.step { page-break-before: always; }
.step-head { border-bottom: 2px solid #2f855a; padding-bottom: 2mm; margin-bottom: 3mm; }
.crumbs { color: #2f855a; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.step h3 { font-size: 15pt; margin: 1mm 0; }
.tags span { display: inline-block; background: #edf2f7; color: #4a5568; border-radius: 2mm; padding: .3mm 2mm; font-size: 8pt; margin-right: 1.5mm; }
.tags .path { font-family: Menlo, monospace; }
figure { margin: 0 0 3mm; text-align: center; }
figure img { max-width: 100%; max-height: var(--shot-h); border: 1px solid #cbd5e0; border-radius: 1.5mm; }
.caption { font-size: 11pt; margin: 0 0 3mm; }
.howto { background: #f0fff4; border-left: 3px solid #2f855a; padding: 2mm 4mm; margin-bottom: 3mm; break-inside: avoid; }
.howto h4 { font-size: 10pt; color: #276749; margin-bottom: 1mm; }
.howto ol { margin: 0; padding-left: 5mm; }
table.checks { width: 100%; border-collapse: collapse; font-size: 8pt; break-inside: avoid; }
table.checks td { border-bottom: 1px solid #edf2f7; padding: .5mm 1.5mm; vertical-align: top; line-height: 1.25; }
table.checks .icon { width: 6mm; } table.checks .label { width: 62mm; font-weight: 600; }
table.checks .detail { color: #4a5568; word-break: break-word; }
table.checks tr.fail .detail { color: #9b2c2c; } table.checks tr.warn .detail { color: #9c4221; }
.missing { color: #c53030; }
.notes { margin-top: 6mm; font-size: 9pt; color: #4a5568; } .notes h4 { font-size: 10pt; margin-bottom: 1mm; } .notes ul { margin: 0; padding-left: 5mm; }
.appendix { page-break-before: always; }
.app-step { margin-bottom: 4mm; break-inside: avoid; }
.app-step h4 { font-size: 11pt; margin-bottom: 1mm; } .app-step small { color: #718096; font-weight: normal; }
.app-step ul { margin: 0; padding-left: 5mm; font-size: 9pt; list-style: none; } .app-step li { margin: .6mm 0; word-break: break-word; }
@media screen { body { max-width: 210mm; margin: 0 auto; padding: 10mm; background: #fff; } .cover { height: auto; min-height: 80vh; } }
`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const images = await prepareImages(browser);
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(manifest.title ?? 'Agrogo — Recette fonctionnelle')}${founder ? ' (parcours)' : ''}</title>
<style>:root { --shot-h: ${founder ? '165mm' : '108mm'}; }
${CSS}</style></head>
<body>
${cover()}
${summary()}
${steps.map((s) => stepBlock(s, images[s.id])).join('\n')}
${appendix()}
</body></html>`;
  const htmlPath = path.join(runDir, `${base}.html`);
  writeFileSync(htmlPath, html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  const pdfPath = path.join(runDir, `${base}.pdf`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#718096;padding:0 13mm;display:flex;justify-content:space-between;font-family:Arial,sans-serif">
      <span>Agrogo — Recette fonctionnelle · ${esc(dateFr)}</span>
      <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.warn(`HTML : ${htmlPath}\nPDF  : ${pdfPath}`);
} finally {
  await browser.close();
}
