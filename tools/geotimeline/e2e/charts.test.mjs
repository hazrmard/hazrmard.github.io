// Phase 4 behaviour: event charts and series tracks.
//   HUGO=/path/to/hugo node --test e2e/charts.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build, serve, chromium, open } from './harness.mjs';

const PATH = '/post/filasteen/';
const CENSUS = '1922-07-24-british-census-of-palestine-78';
let browser, server, origin;

before(async () => {
    const site = await build();
    ({ server, origin } = await serve(site));
    browser = await chromium.launch();
});
after(async () => {
    await browser?.close();
    server?.close();
});

const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('geo-timeline').shadowRoot, a), [fn.toString(), arg]);

test('charts load Plot only when opened and draw with a table view', async () => {
    const { page, context, errors } = await open(browser, origin, `${PATH}#e=${CENSUS}`);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => typeof window.Plot), 'undefined', 'Plot not loaded up front');
    await inShadow(page, (root, id) => root.querySelector(`.card[data-id="${id}"] details.chart`).open = true, CENSUS);
    await page.waitForFunction(() => document.querySelector('geo-timeline').shadowRoot.querySelector('.chart-body svg'), null, { timeout: 10000 });
    const info = await inShadow(page, (root, id) => {
        const body = root.querySelector(`.card[data-id="${id}"] .chart-body`);
        return {
            bars: body.querySelectorAll('svg rect').length,
            rows: body.querySelectorAll('.table-view tbody tr').length,
            label: body.querySelector('svg').getAttribute('aria-label'),
            fills: [...new Set([...body.querySelectorAll('svg g[aria-label="bar"] rect, svg rect[fill]')].map(r => r.getAttribute('fill') || r.parentNode.getAttribute('fill')))],
        };
    }, CENSUS);
    assert.ok(info.bars >= 3, `bars drawn (${info.bars})`);
    assert.equal(info.rows, 3);
    assert.match(info.label, /table follows/);
    assert.deepEqual(errors, []);
    await context.close();
});

test('dark theme uses the dark palette steps and redraws on a theme switch', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${CENSUS}`, { colorScheme: 'dark' });
    await page.waitForTimeout(400);
    await inShadow(page, (root, id) => root.querySelector(`.card[data-id="${id}"] details.chart`).open = true, CENSUS);
    await page.waitForFunction(() => document.querySelector('geo-timeline').shadowRoot.querySelector('.chart-body svg'));
    const fill = () => inShadow(page, (root, id) => {
        const g = root.querySelector(`.card[data-id="${id}"] .chart-body svg g[aria-label="bar"]`);
        return (g.getAttribute('fill') || g.querySelector('rect').getAttribute('fill')).toLowerCase();
    }, CENSUS);
    assert.equal(await fill(), '#3987e5');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(500);
    assert.equal(await fill(), '#2a78d6');
    await context.close();
});

test('tracks show the series value at the focused date', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${CENSUS}`);
    await page.waitForTimeout(400);
    await inShadow(page, root => [...root.querySelectorAll('.tool')].find(b => b.textContent.includes('Data')).click());
    await page.waitForFunction(() => document.querySelector('geo-timeline').shadowRoot.querySelector('.track .track-value'));
    await page.waitForTimeout(200);
    const value = () => inShadow(page, root => root.querySelector('.track-value').textContent);
    assert.equal(await value(), '11% (1922)');
    await page.evaluate(() => document.querySelector('geo-timeline').store.set({ focus: '1890-zionism-is-coined' }));
    await page.waitForTimeout(300);
    assert.equal(await value(), '—', 'no value before the first data point');
    await context.close();
});
