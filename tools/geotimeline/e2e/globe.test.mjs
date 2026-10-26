// Phase 3 behaviour: the backdrop globe follows the focused event.
//   HUGO=/path/to/hugo node --test e2e/globe.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build, serve, chromium, open } from './harness.mjs';

const PATH = '/post/zz-geotimeline-e2e/';  // test page with the plain <geo-timeline> (site/)
const BASEL = '1897-08-29-first-zionist-congress-held-in';
const HAIFA = '1948-04-22-haifa-cleansed-of-palestinians-in';
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

const waitGlobe = page => page.waitForFunction(() => document.querySelector('geo-timeline').globe, null, { timeout: 15000 });
const globeInfo = page => page.evaluate(() => {
    const host = document.querySelector('geo-timeline');
    const globe = host.globe;
    const p = globe.projection();
    const focus = host.store.get().focus;
    const e = host.model.events.find(x => x.id === focus);
    const w = e?.where.find(w => w.lat !== null);
    const xy = w ? p([w.lon, w.lat]) : null;
    const column = host.shadowRoot.querySelector('.timeline').getBoundingClientRect();
    return { zoom: globe.getView().zoom, xy, column: { left: column.left, right: column.right },
        active: globe.el.classList.contains('active'), layout: globe.el.dataset.layout, animating: globe.isAnimating() };
});

test('zooms to a region for regional places, stays global otherwise, and keeps the place beside the column', async () => {
    const { page, context, errors } = await open(browser, origin, `${PATH}#e=${BASEL}`, { reducedMotion: 'reduce' });
    await waitGlobe(page);
    await page.waitForTimeout(400);
    let g = await globeInfo(page);
    assert.equal(g.layout, 'side');
    assert.ok(g.active, 'visible while the list fills the viewport');
    assert.ok(Math.abs(g.zoom - 1) < 1e-6, `Basel is shown at globe scale (zoom ${g.zoom})`);
    assert.ok(g.xy[0] > g.column.right, `Basel drawn right of the column (${g.xy[0]} > ${g.column.right})`);

    await page.evaluate(id => document.querySelector('geo-timeline').store.set({ focus: id }), HAIFA);
    await page.waitForTimeout(400);
    g = await globeInfo(page);
    assert.ok(g.zoom > 3, `Haifa zooms into the region (zoom ${g.zoom})`);
    assert.ok(g.xy[0] > g.column.right && g.xy[1] < 900, `Haifa on screen beside the column (${g.xy})`);
    assert.deepEqual(errors, []);
    await context.close();
});

test('animates between places unless reduced motion is requested', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${BASEL}`);
    await waitGlobe(page);
    await page.waitForTimeout(1500);
    await page.evaluate(id => document.querySelector('geo-timeline').store.set({ focus: id }), HAIFA);
    await page.waitForTimeout(200);
    assert.ok((await globeInfo(page)).animating, 'in flight');
    await page.waitForTimeout(1300);
    assert.ok(!(await globeInfo(page)).animating, 'arrived');
    await context.close();
});

test('hidden once the timeline has scrolled past; a bottom strip on phones', async () => {
    const { page, context } = await open(browser, origin, PATH, { width: 375, height: 740 });
    await waitGlobe(page);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    let g = await globeInfo(page);
    assert.equal(g.layout, 'strip');
    assert.ok(!g.active, 'not shown over the page footer');
    await page.evaluate(id => document.querySelector('geo-timeline').store.set({ focus: id }), HAIFA);
    await page.waitForTimeout(1800);
    g = await globeInfo(page);
    assert.ok(g.active);
    const strip = await page.evaluate(() => document.querySelector('geo-timeline').globe.el.getBoundingClientRect().top / innerHeight);
    assert.ok(strip > 0.7, `strip sits at the bottom (${strip})`);
    assert.ok(g.xy[1] > 0 && g.xy[1] < 740 * 0.26 && g.xy[0] > 0 && g.xy[0] < 375, `place inside the strip (${g.xy})`);
    await context.close();
});

test('a redraw is cheap enough for smooth rotation, zoomed in and at globe scale', async () => {
    for (const id of [HAIFA, BASEL]) {
        const { page, context } = await open(browser, origin, `${PATH}#e=${id}`, { reducedMotion: 'reduce' });
        await waitGlobe(page);
        await page.waitForTimeout(300);
        const ms = await page.evaluate(() => {
            const globe = document.querySelector('geo-timeline').globe;
            const t0 = performance.now();
            for (let i = 0; i < 30; i++) globe.redraw();
            return (performance.now() - t0) / 30;
        });
        console.log(`draw ${id}: ${ms.toFixed(2)} ms`);
        // Headless Chromium renders in software, and timings vary with the
        // machine (4.5–7 ms on one container, 7–10 ms on another for the same
        // code). The limit guards against regressions within a 16 ms frame.
        assert.ok(ms < 12, `draw at ${id} takes ${ms.toFixed(2)} ms`);
        await context.close();
    }
});
