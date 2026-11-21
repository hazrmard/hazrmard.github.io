// Phase 6 behaviour: threads.
//   HUGO=/path/to/hugo node --test e2e/threads.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build, serve, chromium, open } from './harness.mjs';

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

const inShadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('geo-timeline').shadowRoot, a), [fn.toString(), arg]);

test('a thread narrows the list and steps through its events in order', async () => {
    const { page, context, errors } = await open(browser, origin, PATH, { reducedMotion: 'reduce' });
    const members = await page.evaluate(() => document.querySelector('geo-timeline').model.threads.find(t => t.id === 'empty-land').events);
    assert.ok(members.length >= 3);

    // From a card's thread link.
    await inShadow(page, root => root.querySelector('.thread-link[data-thread="empty-land"]').click());
    await page.waitForTimeout(200);
    const shown = await inShadow(page, root => ({
        banner: !root.querySelector('.thread-banner').hidden,
        title: root.querySelector('.thread-title').textContent,
        matched: [...root.querySelectorAll('.card:not(.dim)')].map(li => li.dataset.id),
    }));
    assert.ok(shown.banner);
    assert.equal(shown.title, 'Empty Land');
    assert.deepEqual([...shown.matched].sort(), [...members].sort());

    await inShadow(page, root => root.querySelector('[aria-label="Next in thread"]').click());
    await page.waitForTimeout(200);
    let s = await page.evaluate(() => document.querySelector('geo-timeline').store.get());
    assert.equal(s.focus, members[0]);
    for (let i = 1; i < members.length; i++) {
        await inShadow(page, root => root.querySelector('[aria-label="Next in thread"]').click());
        await page.waitForTimeout(100);
    }
    s = await page.evaluate(() => document.querySelector('geo-timeline').store.get());
    assert.equal(s.focus, members[members.length - 1]);
    assert.match(await inShadow(page, root => root.querySelector('.thread-position').textContent), new RegExp(`^${members.length} of ${members.length}$`));
    assert.ok(await inShadow(page, root => root.querySelector('[aria-label="Next in thread"]').disabled));
    await page.waitForTimeout(300);
    assert.match(await page.evaluate(() => location.hash), /t=empty-land/);

    await inShadow(page, root => root.querySelector('[aria-label="Leave thread"]').click());
    await page.waitForTimeout(100);
    assert.equal(await inShadow(page, root => root.querySelectorAll('.card:not(.dim)').length), 110);
    assert.deepEqual(errors, []);
    await context.close();
});

test('threads appear in the filter panel with counts and follow into the map view', async () => {
    const { page, context } = await open(browser, origin, `${PATH}#t=ethnic-cleansing&v=geo`, { reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('geo-timeline').globe);
    await page.waitForTimeout(300);
    const chips = await inShadow(page, root => [...root.querySelectorAll('.thread-chip')].map(c => [c.textContent, c.getAttribute('aria-pressed')]));
    assert.equal(chips.length, 3);
    assert.ok(chips.some(([t, p]) => t.startsWith('Ethnic Cleansing') && p === 'true'));
    const members = await page.evaluate(() => document.querySelector('geo-timeline').model.threads.find(t => t.id === 'ethnic-cleansing').events);
    const focus = () => page.evaluate(() => document.querySelector('geo-timeline').store.get().focus);
    assert.equal(await focus(), members[0], 'map view starts at the first thread event');
    await page.keyboard.press('ArrowRight');
    assert.equal(await focus(), members[1]);
    await context.close();
});
