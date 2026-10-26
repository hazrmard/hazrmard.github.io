// Phase 2 behaviour: scroll view, filters, hash state, fallback, theming.
//   HUGO=/path/to/hugo node --test e2e/scroll.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build, serve, chromium, open, routeCdn } from './harness.mjs';

const PATH = '/post/zz-geotimeline-e2e/';  // test page with the plain <geo-timeline> (site/)
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
    return { ...s, filters: Object.fromEntries(Object.entries(s.filters).map(([k, v]) => [k, [...v]])) };
});
const shadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('geo-timeline').shadowRoot, a), [fn.toString(), arg]);

test('renders all events without errors', async () => {
    const { page, errors, external, context } = await open(browser, origin, PATH);
    const n = await shadow(page, root => root.querySelectorAll('.card').length);
    assert.equal(n, 110);
    assert.deepEqual(errors, []);
    await page.waitForFunction(() => document.querySelector('geo-timeline').globe);
    assert.deepEqual(external, [], 'dependencies are self-hosted');
    await context.close();
});

test('focus follows the scroll position', async () => {
    const { page, context } = await open(browser, origin, PATH);
    assert.equal((await state(page)).focus, null, 'nothing focused above the list');
    for (const target of [20, 60, 95]) {
        const id = await shadow(page, (root, i) => {
            const li = root.querySelectorAll('.card')[i];
            scrollTo(0, li.getBoundingClientRect().top + scrollY - innerHeight * 0.4 + 5);
            return li.dataset.id;
        }, target);
        await page.waitForTimeout(150);
        assert.equal((await state(page)).focus, id);
    }
    await page.waitForTimeout(300);
    assert.match(await page.evaluate(() => location.hash), /^#e=/);
    await context.close();
});

test('gutter stays aligned when details open', async () => {
    const { page, context } = await open(browser, origin, PATH);
    const misalignment = () => shadow(page, root => {
        let worst = 0;
        for (const dot of root.querySelectorAll('.gutter .dot')) {
            const li = root.querySelector(`.card[data-id="${CSS.escape(dot.dataset.id)}"]`);
            const title = li.querySelector('.title').getBoundingClientRect();
            const cy = dot.getBoundingClientRect().top + dot.getBoundingClientRect().height / 2;
            worst = Math.max(worst, Math.abs(cy - (title.top + Math.min(12, title.height / 2))));
        }
        return worst;
    });
    await page.waitForTimeout(300);
    assert.ok(await misalignment() < 2, 'aligned initially');
    await shadow(page, root => { for (const d of [...root.querySelectorAll('details.more, details.detail')].slice(0, 8)) d.open = true; });
    await page.waitForTimeout(600);
    assert.ok(await misalignment() < 2, 'aligned after opening details and loading detail files');
    const loaded = await shadow(page, root => [...root.querySelectorAll('details.detail[open] .body')].every(b => !b.querySelector('.loading')));
    assert.ok(loaded, 'detail files loaded on open');
    await context.close();
});

test('filters, search and hash survive a reload', async () => {
    const { page, context } = await open(browser, origin, PATH);
    await shadow(page, root => root.querySelector('.tool[aria-controls]').click());
    await shadow(page, root => [...root.querySelectorAll('.chip')].find(c => c.textContent.startsWith('Lehi')).click());
    await page.waitForTimeout(300);
    let s = await state(page);
    assert.deepEqual(s.filters, { actors: ['lehi'] });
    const matched = await shadow(page, root => root.querySelectorAll('.card:not(.dim)').length);
    assert.ok(matched > 3 && matched < 30, `dim mode keeps context (${matched} matched)`);
    assert.equal(await shadow(page, root => root.querySelectorAll('.card').length), 110);

    await shadow(page, root => [...root.querySelectorAll('.segmented input')].find(i => i.value === 'hide').click());
    await page.waitForTimeout(300);
    assert.equal(await shadow(page, root => root.querySelectorAll('.card').length), matched, 'hide mode removes the rest');

    await page.waitForTimeout(300);
    const hash = await page.evaluate(() => location.hash);
    assert.match(hash, /f\.actors=lehi/);
    assert.match(hash, /m=hide/);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('geo-timeline')?.store);
    s = await state(page);
    assert.deepEqual(s.filters, { actors: ['lehi'] });
    assert.equal(s.mode, 'hide');

    await page.evaluate(() => { location.hash = '#q=haifa'; });
    await page.waitForTimeout(300);
    s = await state(page);
    assert.equal(s.query, 'haifa');
    assert.deepEqual(s.filters, {});
    const results = await shadow(page, root => root.querySelector('.results').textContent);
    assert.match(results, /^\d+ of 110 events$/);
    await context.close();
});

test('badges in cards toggle filters', async () => {
    const { page, context } = await open(browser, origin, PATH);
    await shadow(page, root => root.querySelector('.badge[data-value="haganah"]').click());
    await page.waitForTimeout(100);
    assert.deepEqual((await state(page)).filters, { actors: ['haganah'] });
    const pressed = await shadow(page, root => [...root.querySelectorAll('.badge[data-value="haganah"]')].every(b => b.getAttribute('aria-pressed') === 'true'));
    assert.ok(pressed);
    await context.close();
});

test('deep link focuses and scrolls to an event', async () => {
    const id = '1948-04-22-haifa-cleansed-of-palestinians-in';
    const { page, context } = await open(browser, origin, `${PATH}#e=${id}`);
    await page.waitForTimeout(500);
    const top = await shadow(page, (root, i) => root.querySelector(`.card[data-id="${i}"]`).getBoundingClientRect().top / innerHeight, id);
    assert.ok(top > 0.2 && top < 0.5, `card near the focus line (${top})`);
    assert.equal((await state(page)).focus, id);
    await context.close();
});

test('follows the page theme and fits a phone screen', async () => {
    for (const colorScheme of ['light', 'dark']) {
        const { page, context } = await open(browser, origin, PATH, { width: 375, height: 740, colorScheme });
        const bg = await shadow(page, root => getComputedStyle(root.querySelector('.card article')).backgroundColor);
        const dark = /rgb\((\d+), (\d+), (\d+)/.exec(bg).slice(1).map(Number).reduce((a, b) => a + b) < 300;
        assert.equal(dark, colorScheme === 'dark', `card surface follows ${colorScheme} theme (${bg})`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'no horizontal scroll');
        await context.close();
    }
});

test('without JavaScript the static list is shown', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await routeCdn(context);
    const page = await context.newPage();
    await page.goto(origin + PATH);
    const items = await page.locator('geo-timeline .geo-timeline-fallback > li').count();
    assert.equal(items, 110);
    assert.ok(await page.locator('text=Haifa cleansed of Palestinians').first().isVisible());
    await context.close();
});
