// Validates a timeline from the command line, using the renderer's own model
// code. Run `npm install` in this directory once.
//
//   node tools/geotimeline/check.mjs content/post/filasteen/timeline.yaml [--info]

import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { marked } from 'marked';

const M = '../../content/post/filasteen/geotimeline/model/';
const { load } = await import(M + 'load.js');
const { normalize } = await import(M + 'normalize.js');
const { validate, summarize } = await import(M + 'validate.js');

const [manifestPath, ...flags] = process.argv.slice(2);
if (!manifestPath) {
    console.error('usage: node check.mjs path/to/timeline.yaml [--info]');
    process.exit(2);
}
const yamlLoad = text => yaml.load(text, { schema: yaml.CORE_SCHEMA });
const io = { fetchText: url => readFile(fileURLToPath(url), 'utf-8'), yamlLoad };

const loaded = await load(pathToFileURL(manifestPath).href, io);
const model = validate(normalize(loaded, { markdown: marked, yamlLoad }));
const showInfo = flags.includes('--info');

for (const d of model.diagnostics) {
    if (d.level === 'info' && !showInfo) continue;
    console.log(`${d.level.padEnd(7)} ${d.file}${d.line ? ':' + d.line : ''}  ${d.message}`);
}
const c = summarize(model.diagnostics);
console.log(`\n${model.events.length} events, ${model.places.size} places, ${model.facets.size} facet groups, ` +
    `${model.threads.length} threads, ${model.periods.length} periods`);
console.log(`${c.error} errors, ${c.warning} warnings, ${c.info} info${showInfo ? '' : ' (show with --info)'}`);
process.exit(c.error ? 1 : 0);
