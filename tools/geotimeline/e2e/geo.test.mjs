// Phase 5 behaviour: the geo-first view.
//   HUGO=/path/to/hugo node --test e2e/geo.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build, serve, chromium, open } from './harness.mjs';

const PATH = '/post/zz-geotimeline-e2e/';  // test page with the plain <geo-timeline> (site/)
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

const state = page => page.evaluate(() => {
    const s = document.querySelector('geo-timeline').store.get();
    return { focus: s.focus, view: s.view };
});
const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('geo-timeline').shadowRoot, a), [fn.toString(), arg]);
const ready = page => page.waitForFunction(() => document.querySelector('geo-timeline').globe, null, { timeout: 15000 });

test('switching views keeps the focus and returns to the same card', async () => {
    const { page, context, errors } = await open(browser, origin, `${PATH}#e=${HAIFA}`, { reducedMotion: 'reduce' });
    await ready(page);
    await page.waitForTimeout(300);
    await inShadow(page, root => [...root.querySelectorAll('.view-switch .tool')][1].click());
    await page.waitForTimeout(400);
    assert.deepEqual(await state(page), { focus: HAIFA, view: 'geo' });
    const geo = await inShadow(page, root => ({
        stage: !root.querySelector('.stage').hidden,
        sheet: root.querySelector('.sheet .title')?.textContent,
        layout: root.querySelector('.globe').dataset.layout,
        locked: document.documentElement.style.overflow,
    }));
    assert.ok(geo.stage);
    assert.match(geo.sheet, /^Haifa cleansed/);
    assert.equal(geo.layout, 'stage');
    assert.equal(geo.locked, 'hidden');
    await page.waitForTimeout(300);
    assert.match(await page.evaluate(() => location.hash), /v=geo/);

    // The focused place is at the centre of the map.
    const xy = await page.evaluate(() => {
        const g = document.querySelector('geo-timeline').globe;
        const r = g.canvas.getBoundingClientRect();
        const [x, y] = g.projection()([34.9896, 32.794]);
        return [x / r.width, y / r.height];
    });
    assert.ok(Math.abs(xy[0] - 0.5) < 0.02 && Math.abs(xy[1] - 0.5) < 0.02, `centred (${xy})`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    assert.deepEqual(await state(page), { focus: HAIFA, view: 'scroll' });
    const back = await inShadow(page, (root, id) => ({
        top: root.querySelector(`.card[data-id="${id}"]`).getBoundingClientRect().top / innerHeight,
        locked: document.documentElement.style.overflow,
        layout: root.querySelector('.globe').dataset.layout,
    }), HAIFA);
    assert.ok(back.top > 0.2 && back.top < 0.5, `card back at the focus line (${back.top})`);
    assert.equal(back.locked, '');
    assert.equal(back.layout, 'side');
    assert.deepEqual(errors, []);
    await context.close();
});

test('keyboard, scrubber and buttons step through events', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${HAIFA}&v=geo`, { reducedMotion: 'reduce' });
    await ready(page);
    await page.waitForTimeout(400);
    const ids = await page.evaluate(() => document.querySelector('geo-timeline').model.events.map(e => e.id));
    const i = ids.indexOf(HAIFA);
    await page.keyboard.press('ArrowRight');
    assert.equal((await state(page)).focus, ids[i + 1]);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal((await state(page)).focus, ids[i - 1]);
    await inShadow(page, root => root.querySelector('[aria-label="Next event"]').click());
    assert.equal((await state(page)).focus, HAIFA);

    const box = await inShadow(page, root => { const r = root.querySelector('.scrub-track').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.mouse.click(box.x + 3, box.y + box.h / 2);
    assert.equal((await state(page)).focus, ids[0], 'scrubber start selects the first event');
    const valuetext = await inShadow(page, root => root.querySelector('.scrub-track').getAttribute('aria-valuetext'));
    assert.match(valuetext, /1878/);
    await context.close();
});

test('clicking a place focuses its event; dragging rotates without selecting', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${HAIFA}&v=geo`, { reducedMotion: 'reduce' });
    await ready(page);
    await page.waitForTimeout(500);
    // Jaffa's point, in page coordinates.
    const jaffa = await page.evaluate(() => {
        const g = document.querySelector('geo-timeline').globe;
        const r = g.canvas.getBoundingClientRect();
        const [x, y] = g.projection()([34.7522, 32.0504]);
        return { x: r.left + x, y: r.top + y };
    });
    await page.mouse.click(jaffa.x, jaffa.y);
    await page.waitForTimeout(200);
    const focus = (await state(page)).focus;
    const where = await page.evaluate(id => document.querySelector('geo-timeline').model.events.find(e => e.id === id).where.map(w => w.place), focus);
    assert.ok(where.includes('jaffa'), `focused a Jaffa event (${focus})`);

    const before = await page.evaluate(() => document.querySelector('geo-timeline').globe.projection().rotate());
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(380, 420, { steps: 5 });
    await page.mouse.up();
    const afterRot = await page.evaluate(() => document.querySelector('geo-timeline').globe.projection().rotate());
    assert.notDeepEqual(before, afterRot, 'rotated');
    assert.equal((await state(page)).focus, focus, 'drag did not change the focus');
    await context.close();
});

test('on phones, tapping the map strip opens the map view', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#e=${HAIFA}`, { width: 375, height: 740, reducedMotion: 'reduce' });
    await ready(page);
    await page.waitForTimeout(400);
    await page.mouse.click(187, 700);
    await page.waitForTimeout(300);
    assert.equal((await state(page)).view, 'geo');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await context.close();
});
