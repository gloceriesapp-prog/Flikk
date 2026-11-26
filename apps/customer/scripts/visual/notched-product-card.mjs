// Deterministic browser visual fixture. Uses the production SVG geometry;
// it is not a native-device screenshot or a substitute for device gesture QA.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../../../..');
const source = fs.readFileSync(path.join(root, 'apps/customer/src/screens/home/products/image-area/notchedCardGeometry.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('exports', 'module', compiled)(module.exports, module);
const { notchedCardMetrics, notchedCardPath } = module.exports;
const out = path.join(root, 'output/playwright');
fs.mkdirSync(out, { recursive: true });
const cases = [{ label: 'Default · veg', quantity: 0, veg: true }, { label: 'Added · 1', quantity: 1, veg: true },
  { label: 'Added · 5', quantity: 5 }, { label: 'Out of stock', out: true },
  { label: 'Non-veg', quantity: 0, veg: false }, { label: 'No veg mark', quantity: 0 }];
function card(width, state, id) {
  const m = notchedCardMetrics(width), d = m.diameter, b = d / 2, cx = width - b + 4, cy = m.height - b + 4;
  const extension = state.quantity ? m.pillWidth - d : 0;
  const shape = notchedCardPath(width, m.height, d, extension, !state.out);
  const veggies = `<rect width="${width}" height="${m.height}" fill="#F9FAFB"/><g transform="translate(${width / 2 - 34},${m.height / 2 - 25})"><ellipse cx="34" cy="53" rx="34" ry="9" fill="#D6DCD3"/><path d="M0 25h68l-9 28H9Z" fill="#F0EDE2"/><g fill="#A5BC3E" stroke="#879E31"><circle cx="18" cy="23" r="13"/><circle cx="39" cy="16" r="14"/><circle cx="54" cy="27" r="12"/><circle cx="31" cy="34" r="13"/></g></g>`;
  const mark = state.veg === undefined ? '' : `<rect x="${width - 20}" y="8" width="12" height="12" rx="2" stroke="${state.veg ? '#00A650' : '#E23744'}" fill="white"/><circle cx="${width - 14}" cy="14" r="3" fill="${state.veg ? '#00A650' : '#E23744'}"/>`;
  const pad = Math.max(0, 44 - d), pill = d + extension, rootWidth = pill + pad;
  const rootLeft = cx - b - extension - pad / 2, contentPadding = pad / 2 + 3;
  const cell = (rootWidth - 2 * contentPadding - 16) / 2;
  const minusX = rootLeft + contentPadding + cell / 2, plusX = state.quantity ? rootLeft + rootWidth - contentPadding - cell / 2 : cx;
  const button = state.out ? '' : `<rect x="${cx - b - extension}" y="${cy - b}" width="${d + extension}" height="${d}" rx="${b}" fill="#155DFC"/>${state.quantity ? `<text x="${cx - extension / 2}" y="${cy + 5}" text-anchor="middle" fill="white" font-size="13">${state.quantity}</text><path d="M${minusX - 5} ${cy}h10" stroke="white" stroke-width="2"/>` : ''}<path d="M${plusX - 7} ${cy}h14m-7-7v14" stroke="white" stroke-width="2"/>`;
  return `<article style="width:${width}px"><svg width="${width + 8}" height="${m.height + 8}" viewBox="0 0 ${width + 8} ${m.height + 8}"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#${id})">${veggies}</g><path d="${shape}" fill="none" stroke="#E3E6EE"/>${mark}${[0,1,2].map(i => `<circle cx="${11 + i * 8}" cy="${m.height - 11}" r="3" fill="${i ? '#FFFFFF' : '#738078'}" stroke="#738078"/>`).join('')}${button}</svg><div class="pack">1 kg</div><b>₹30</b><div>Onion</div>${state.out ? '<small class="stock">Out of stock</small>' : ''}<small>${state.label}</small></article>`;
}
for (const viewport of [360, 430]) {
  const width = (viewport - 64) / 3;
  const rail = Math.min(120, Math.max(96, Math.floor((viewport - 48) / 3.2)));
  fs.writeFileSync(path.join(out, `notched-card-${viewport}.html`), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:20px;font:14px Arial;background:white;width:${viewport}px}h1{font-size:18px}h2{font-size:15px}.grid{display:grid;grid-template-columns:repeat(3,${width}px);gap:22px 12px}article{position:relative;flex-shrink:0}svg{display:block;overflow:visible}.pack{display:table;height:18px;padding:1px 5px;border:1px solid #155DFC;border-radius:5px;line-height:14px;font-size:12px;color:#155DFC;font-weight:bold}b{font-size:17px}small{display:block;color:#737B84;font-size:10px;line-height:16px}.stock{color:#D92D20;font-size:11px;font-weight:bold}.rail{display:flex;gap:12px;overflow:hidden;padding-bottom:12px}</style><h1>Product cards · ${viewport}px</h1><h2>Three-column grid</h2><div class="grid">${cases.map((s,i)=>card(width,s,`g${i}`)).join('')}</div><h2>Horizontal rail</h2><div class="rail">${cases.map((s,i)=>card(rail,s,`r${i}`)).join('')}</div><small>Production SVG geometry · browser visual fixture</small>`);
}
console.log(out);
