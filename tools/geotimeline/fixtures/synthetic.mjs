// Writes a synthetic timeline (unrelated to any post) into a directory with
// a plain HTML page that uses the renderer directly, without Hugo.
//   node fixtures/synthetic.mjs OUT_DIR [N]
// Used by the e2e tests for scale and for checking the renderer makes no
// assumptions about the data.

import { mkdir, writeFile, cp, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2]);
const n = Number(process.argv[3] || 1000);
const renderer = resolve(new URL('../../../content/post/filasteen/geotimeline', import.meta.url).pathname);
const geo = resolve(new URL('../../../content/post/filasteen/geo', import.meta.url).pathname);

let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = list => list[Math.floor(rand() * list.length)];

const cities = {
    lagos: [6.52, 3.38], lima: [-12.05, -77.04], oslo: [59.91, 10.75], hanoi: [21.03, 105.85],
    perth: [-31.95, 115.86], quito: [-0.18, -78.47], tunis: [36.81, 10.18], dhaka: [23.81, 90.41],
};
const kinds = ['storm', 'harvest', 'treaty', 'census', 'flood', 'festival'];

await mkdir(join(out, 'events'), { recursive: true });
await mkdir(join(out, 'data'), { recursive: true });
const chunks = [];
for (let i = 0; i < n; i++) {
    const year = 1800 + Math.floor((i / n) * 200);
    const month = 1 + Math.floor(rand() * 12);
    const precise = rand() < 0.5;
    const when = precise ? `${year}-${String(month).padStart(2, '0')}` : (rand() < 0.1 ? `~${year}` : `${year}`);
    const range = rand() < 0.08 ? `/${year + 1 + Math.floor(rand() * 6)}` : '';
    const city = pick(Object.keys(cities));
    const kind = pick(kinds);
    chunks.push(`---
id: e${i}
when: ${when}${range}
where: ${city}
kind: ${kind}
${i % 97 === 0 ? 'data:\n  - {series: rainfall}\n' : ''}---
## Synthetic ${kind} ${i} in ${city[0].toUpperCase() + city.slice(1)}

Event number ${i}. ${'Filler text. '.repeat(1 + Math.floor(rand() * 8))}
${i % 50 === 0 ? '\n### More\nA section.\n' : ''}`);
}
await writeFile(join(out, 'events/all.timeline'), chunks.join('\n'));
await writeFile(join(out, 'data/rain.csv'), 'year,rain\n' + Array.from({ length: 21 }, (_, k) => `${1800 + k * 10},${Math.round(50 + rand() * 50)}`).join('\n'));
await writeFile(join(out, 'timeline.yaml'), `schema: 1
title: Synthetic
events: [events/all.timeline]
facets:
  kind:
    label: Kind
    values: {${kinds.map(k => `${k}: ${k[0].toUpperCase() + k.slice(1)}`).join(', ')}}
places:
${Object.entries(cities).map(([k, [lat, lon]]) => `  ${k}: {name: ${k}, lat: ${lat}, lon: ${lon}}`).join('\n')}
periods:
  - {id: a, label: First century, when: 1800/1899, color: "#7a9"}
  - {id: b, label: Second century, when: 1900/..}
series:
  rainfall: {label: Rainfall, file: data/rain.csv, x: year, y: rain, unit: mm}
threads:
  - {id: storms, title: Storms, match: {kind: storm}}
basemap:
  world: geo/land-110m.json
options:
  gap_marker: 5y
`);
await writeFile(join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Synthetic timeline</title>
<style>body { margin: 0; font-family: system-ui, sans-serif; } main { max-width: 720px; margin: 0 auto; padding: 1rem; }</style>
</head><body><main><h1>Synthetic timeline</h1>
<geo-timeline src="timeline.yaml"><p>Fallback content.</p></geo-timeline>
<p>After the timeline.</p></main>
<script type="module" src="geotimeline/geo-timeline.js"></script>
</body></html>
`);
await symlink(renderer, join(out, 'geotimeline')).catch(() => cp(renderer, join(out, 'geotimeline'), { recursive: true }));
await mkdir(join(out, 'geo'), { recursive: true });
await cp(join(geo, 'land-110m.json'), join(out, 'geo/land-110m.json'));
console.log(`wrote ${n} events to ${out}`);
