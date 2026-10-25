// Phase 7: 1,000 synthetic events, no Hugo, unrelated data.
//   node --test e2e/scale.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chromium, open } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
let browser, server, origin;

before(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gt-synth-'));
    execFileSync('node', [join(here, '../fixtures/synthetic.mjs'), dir, '1000']);
    ({ server, origin } = await serve(dir));
    browser = await chromium.launch();
});
after(async () => {
    await browser?.close();
    server?.close();
});

const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('geo-timeline').shadowRoot, a), [fn.toString(), arg]);

test('1,000 events load, filter and scroll within budget, without Hugo', async () => {
    const t0 = Date.now();
    const { page, context, errors } = await open(browser, origin, '/');
    const loadMs = Date.now() - t0;
    assert.equal(await inShadow(page, root => root.querySelectorAll('.card').length), 1000);
    assert.ok(loadMs < 5000, `ready in ${loadMs} ms`);

    const filterMs = await page.evaluate(async () => {
        const host = document.querySelector('geo-timeline');
        const t = performance.now();
        host.store.set({ filters: { kind: new Set(['storm']) }, mode: 'hide' });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return performance.now() - t;
    });
    const shown = await inShadow(page, root => root.querySelectorAll('.card').length);
    assert.ok(shown > 100 && shown < 300, `${shown} storms`);
    assert.ok(filterMs < 400, `filter + relayout ${filterMs.toFixed(0)} ms`);

    // Scroll handling: time a batch of scroll-driven focus updates.
    const perScroll = await page.evaluate(async () => {
        const host = document.querySelector('geo-timeline');
        host.store.set({ filters: {}, mode: 'dim' });
        await new Promise(r => setTimeout(r, 300));
        const t = performance.now();
        for (let i = 0; i < 40; i++) {
            scrollTo(0, 2000 + i * 900);
            await new Promise(r => requestAnimationFrame(r));
        }
        return (performance.now() - t) / 40;
    });
    assert.ok(perScroll < 40, `${perScroll.toFixed(1)} ms per scrolled frame`);
    assert.ok(await page.evaluate(() => document.querySelector('geo-timeline').store.get().focus), 'focus follows');
    console.log({ loadMs, filterMs: Math.round(filterMs), perScroll: +perScroll.toFixed(1), shown });
    assert.deepEqual(errors, []);
    await context.close();
});

test('the renderer has no knowledge of the filasteen data', async () => {
    const { page, context, errors } = await open(browser, origin, '/#t=storms');
    await page.waitForFunction(() => document.querySelector('geo-timeline').globe, null, { timeout: 15000 });
    const info = await inShadow(page, root => ({
        facets: [...root.querySelectorAll('.facet-label')].map(e => e.textContent),
        thread: root.querySelector('.thread-title').textContent,
        periods: [...root.querySelectorAll('.period-label')].map(e => e.textContent),
    }));
    assert.deepEqual(info.facets, ['Kind', 'Threads']);
    assert.equal(info.thread, 'Storms');
    assert.ok(info.periods.includes('First century'));
    assert.deepEqual(errors, []);
    await context.close();
});
