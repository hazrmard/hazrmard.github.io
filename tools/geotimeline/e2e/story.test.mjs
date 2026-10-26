// Story pages: woven / story / timeline readings, cut-backs, scenes, the
// shared globe, prose links, place-keeping across mode switches.
//   HUGO=/path/to/hugo node --test e2e/story.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build, serve, chromium, routeCdn } from './harness.mjs';

const require = createRequire(import.meta.url);
const PATH = '/post/filasteen-story-demo/';
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

async function openStory(hash = '', opts = {}) {
    const context = await browser.newContext({ viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 }, reducedMotion: 'reduce', colorScheme: opts.colorScheme ?? 'light' });
    await routeCdn(context);
    if (opts.stored) await context.addInitScript(v => localStorage.setItem(`geo-story:/post/filasteen-story-demo/:reading`, v), opts.stored);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
    await page.goto(origin + PATH + hash);
    await page.waitForFunction(() => document.querySelector('geo-story')?.store, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    return { page, context, errors };
}

const state = page => page.evaluate(() => {
    const s = document.querySelector('geo-story').store.get();
    return { focus: s.focus, reading: s.reading, scene: s.scene?.points?.[0]?.name ?? null };
});
const cutbacks = page => page.evaluate(() => [...document.querySelectorAll('geo-cutback')].map(cb => ({
    shown: cb.shadowRoot.querySelectorAll('.card').length,
    total: cb.selection.all.length,
    more: Boolean(cb.shadowRoot.querySelector('.cutback-more')),
    story: cb.selection.all.filter(e => e.register === 'story').length,
    body: !cb.shadowRoot.querySelector('.cutback')?.hidden,
    stub: !cb.shadowRoot.querySelector('.cutback-stub')?.hidden,
})));
// Puts an element's top at the focus line (40% of the viewport).
const scrollToLine = (page, js) => page.evaluate(js => {
    const el = new Function(`return (${js})`)();
    scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.4 + 6);
}, js);
const settle = page => page.waitForTimeout(250);

test('woven: prose with cut-backs, each a capped slice of the timeline', async () => {
    const { page, context, errors } = await openStory();
    const cbs = await cutbacks(page);
    assert.equal(cbs.length, 4);
    assert.deepEqual(cbs.map(c => c.shown), [8, 3, 8, 7]);
    assert.equal(cbs[0].total, 22);
    assert.ok(cbs[0].more && !cbs[1].more);
    assert.deepEqual(cbs.map(c => c.story), [0, 0, 0, 2], 'only the converging cut-back has story events');
    assert.ok(cbs.every(c => c.body && !c.stub));
    assert.ok(await page.locator('geo-woven').first().isVisible());
    assert.equal(await page.evaluate(() => document.querySelector('geo-cutback .geo-timeline-fallback')?.checkVisibility()), false, 'fallback lists replaced');
    assert.deepEqual(errors, []);
    await context.close();
});

test('the focus follows the reader: story sections hold a scene, cut-backs focus events', async () => {
    const { page, context } = await openStory();
    await page.waitForFunction(() => document.querySelector('geo-story').globe, null, { timeout: 15000 });
    await scrollToLine(page, `document.querySelector('h2[data-when]')`);
    await settle(page);
    let s = await state(page);
    assert.equal(s.focus, null);
    assert.equal(s.scene, 'Rafah');
    assert.ok(await page.evaluate(() => document.querySelector('geo-story').globe.el.classList.contains('quiet')), 'globe quiet in prose');

    await scrollToLine(page, `document.querySelectorAll('geo-cutback')[0].shadowRoot.querySelectorAll('.card')[2]`);
    await settle(page);
    s = await state(page);
    const third = await page.evaluate(() => document.querySelectorAll('geo-cutback')[0].shadowRoot.querySelectorAll('.card')[2].dataset.id);
    assert.equal(s.focus, third);
    assert.ok(!(await page.evaluate(() => document.querySelector('geo-story').globe.el.classList.contains('quiet'))), 'globe active in a cut-back');

    // Straight into the next cut-back's header: no focus carried over.
    await scrollToLine(page, `document.querySelectorAll('geo-cutback')[1]`);
    await settle(page);
    assert.equal((await state(page)).focus, null);

    await scrollToLine(page, `[...document.querySelectorAll('h2[data-when]')][2]`);
    await settle(page);
    s = await state(page);
    assert.deepEqual([s.focus, s.scene], [null, 'Khan Yunis']);
    const visited = await page.evaluate(() => [...document.querySelectorAll('geo-cutback')].map(c => c.visited));
    assert.deepEqual(visited, [true, true, false, false]);
    assert.equal(await page.evaluate(() => document.querySelector('geo-story').shadowRoot.querySelectorAll('.ribbon-span.visited').length), 2);
    await context.close();
});

test('story mode: no cut-backs or bridging text, one-line stubs that open in place', async () => {
    const { page, context } = await openStory('#r=story');
    let cbs = await cutbacks(page);
    assert.ok(cbs.every(c => !c.body && c.stub));
    assert.equal(await page.locator('geo-woven').first().isVisible(), false);
    await page.evaluate(() => document.querySelectorAll('geo-cutback')[1].shadowRoot.querySelector('.cutback-stub').click());
    cbs = await cutbacks(page);
    assert.ok(cbs[1].body && !cbs[0].body);
    await context.close();
});

test('switching modes keeps the reader’s place', async () => {
    const { page, context } = await openStory();
    // In the second story section, woven → story: the same section stays at the line.
    await scrollToLine(page, `[...document.querySelectorAll('h2[data-when]')][1]`);
    await settle(page);
    await page.evaluate(() => document.querySelector('geo-story').shadowRoot.querySelector('[data-mode="story"]').click());
    await settle(page);
    const top = await page.evaluate(() => [...document.querySelectorAll('h2[data-when]')][1].getBoundingClientRect().top / innerHeight);
    assert.ok(Math.abs(top - 0.4) < 0.05, `section kept at the line (${top})`);

    // Back to woven, into a cut-back's card, then timeline: the same event.
    await page.evaluate(() => document.querySelector('geo-story').shadowRoot.querySelector('[data-mode="woven"]').click());
    await settle(page);
    await scrollToLine(page, `document.querySelectorAll('geo-cutback')[2].shadowRoot.querySelectorAll('.card')[3]`);
    await settle(page);
    const id = (await state(page)).focus;
    assert.ok(id);
    await page.evaluate(() => document.querySelector('geo-story').shadowRoot.querySelector('[data-mode="timeline"]').click());
    await page.waitForTimeout(500);
    let s = await state(page);
    assert.equal(s.reading, 'timeline');
    assert.equal(s.focus, id);
    const inExplorer = await page.evaluate(id => {
        const card = document.querySelector('geo-story').shadowRoot.querySelector(`.story-explorer .card[data-id="${id}"]`);
        return card.getBoundingClientRect().top / innerHeight;
    }, id);
    assert.ok(inExplorer > 0.2 && inExplorer < 0.55, `event at the line in the timeline (${inExplorer})`);
    assert.equal(await page.evaluate(() => document.querySelector('h2[data-when]').checkVisibility()), false, 'prose hidden');

    // A story marker in the timeline returns to that section.
    await page.evaluate(() => [...document.querySelector('geo-story').shadowRoot.querySelectorAll('.story-marker button')].find(b => b.textContent.includes('South')).click());
    await page.waitForTimeout(400);
    s = await state(page);
    assert.equal(s.reading, 'woven');
    const south = await page.evaluate(() => [...document.querySelectorAll('h2[data-when]')].find(h => h.textContent === 'South').getBoundingClientRect().top / innerHeight);
    assert.ok(Math.abs(south - 0.4) < 0.05, `back at “South” (${south})`);
    await context.close();
});

test('timeline mode lists history and, with converge, the story’s own events', async () => {
    const { page, context } = await openStory('#r=timeline');
    const info = await page.evaluate(() => {
        const root = document.querySelector('geo-story').shadowRoot;
        return {
            cards: root.querySelectorAll('.story-explorer .card').length,
            story: root.querySelectorAll('.story-explorer .card.story-event').length,
            markers: root.querySelectorAll('.story-explorer .story-marker').length,
        };
    });
    assert.deepEqual(info, { cards: 112, story: 2, markers: 4 });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('geo-story')?.store);
    assert.equal((await state(page)).reading, 'timeline', 'reading mode kept in the URL');
    await context.close();
});

test('the reader’s choice is remembered when the URL does not say', async () => {
    const { page, context } = await openStory('', { stored: 'story' });
    assert.equal((await state(page)).reading, 'story');
    await context.close();
});

test('links in the prose show the event card and open it in the timeline', async () => {
    const { page, context } = await openStory();
    const link = page.locator('a[href*="#e=1948-05-13"]');
    await link.hover();
    await page.waitForTimeout(150);
    const shown = () => page.evaluate(() => {
        const pop = document.querySelector('geo-story').shadowRoot.querySelector('.popover');
        return pop.hidden ? null : pop.querySelector('.title').textContent;
    });
    assert.match(await shown(), /^In Jaffa/);
    await link.click();
    assert.match(await shown(), /^In Jaffa/, 'pinned on click');
    assert.equal(await page.evaluate(() => location.hash.includes('1948-05-13')), false, 'no navigation');
    await page.keyboard.press('Escape');
    assert.equal(await shown(), null);
    await link.click();
    await page.evaluate(() => [...document.querySelector('geo-story').shadowRoot.querySelectorAll('.popover button')].find(b => b.textContent.includes('timeline')).click());
    await page.waitForTimeout(400);
    assert.deepEqual([(await state(page)).reading, (await state(page)).focus], ['timeline', '1948-05-13-in-jaffa-50-000-palestinians']);
    await context.close();
});

test('phones: no horizontal scroll, and the map strip steps aside during prose', async () => {
    const { page, context } = await openStory('', { width: 375, height: 740 });
    await page.waitForFunction(() => document.querySelector('geo-story').globe, null, { timeout: 15000 });
    await scrollToLine(page, `document.querySelector('h2[data-when]')`);
    await settle(page);
    const strip = await page.evaluate(() => {
        const g = document.querySelector('geo-story').globe.el;
        return { layout: g.dataset.layout, opacity: getComputedStyle(g).opacity };
    });
    assert.deepEqual(strip, { layout: 'strip', opacity: '0' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await context.close();
});

test('without JavaScript the story reads woven, with the event lists in place', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await routeCdn(context);
    const page = await context.newPage();
    await page.goto(origin + PATH);
    assert.ok(await page.locator('text=Amal is nine').isVisible());
    assert.ok(await page.locator('geo-cutback').first().locator('li').first().isVisible());
    assert.equal(await page.locator('geo-cutback .geo-timeline-fallback > li').count(), 22 + 3 + 11 + 7);
    await context.close();
});

for (const reading of ['woven', 'story', 'timeline']) {
    test(`no axe violations: ${reading}`, async () => {
        const { page, context } = await openStory(`#r=${reading}`);
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        // The prose is the page's own content, styled by the site theme (whose
        // link colour is 3:1 on white); only the component is audited here.
        const violations = await page.evaluate(async () => (await window.axe.run({ include: [['geo-story']], exclude: [['geo-story > :not(geo-cutback):not(geo-woven) a'], ['geo-woven a']] }, { resultTypes: ['violations'] }))
            .violations.map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`));
        assert.deepEqual(violations, []);
        await context.close();
    });
}
