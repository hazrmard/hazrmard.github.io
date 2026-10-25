// Diagnostics: always summarised in the console; listed on the page with
// `?debug` in the URL.

import { h } from './dom.js';
import { summarize } from '../model/validate.js';

const where = d => `${d.file ?? ''}${d.line ? `:${d.line}` : ''}`;

export function logDiagnostics(diagnostics, title) {
    const c = summarize(diagnostics);
    if (!c.error && !c.warning) return;
    const log = c.error ? console.error : console.warn;
    console.groupCollapsed?.(`geo-timeline "${title}": ${c.error} errors, ${c.warning} warnings (add ?debug to the URL to list them on the page)`);
    for (const d of diagnostics) {
        if (d.level === 'info') continue;
        (d.level === 'error' ? log : console.warn)(`${d.level}: ${where(d)} ${d.message}`);
    }
    console.groupEnd?.();
}

export function createDebugPanel(diagnostics) {
    const c = summarize(diagnostics);
    const rows = diagnostics.map(d => h('li', { class: `diag ${d.level}` },
        h('span', { class: 'diag-level' }, d.level), h('code', {}, where(d)), ' ', d.message));
    return h('details', { class: 'debug', open: c.error > 0 },
        h('summary', {}, `Diagnostics: ${c.error} errors, ${c.warning} warnings, ${c.info} info`),
        h('ol', {}, rows));
}
