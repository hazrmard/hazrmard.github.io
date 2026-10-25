// Phase 7: automated accessibility checks (axe-core) on the component, in
// both themes and both views. Only the component is audited, not the site.
//   HUGO=/path/to/hugo node --test e2e/a11y.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build, serve, chromium, open } from './harness.mjs';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const PATH = '/post/filasteen/';
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

async function audit(page) {
    await page.addScriptTag({ path: AXE });
    return page.evaluate(async () => {
        const result = await window.axe.run({ include: [['geo-timeline']] }, { resultTypes: ['violations'] });
        return result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')), count: v.nodes.length }));
    });
}

for (const colorScheme of ['light', 'dark']) {
    for (const view of ['scroll', 'geo']) {
        test(`no axe violations: ${view} view, ${colorScheme} theme`, async () => {
            const hash = `#e=1948-04-22-haifa-cleansed-of-palestinians-in${view === 'geo' ? '&v=geo' : ''}`;
            const { page, context } = await open(browser, origin, PATH + hash, { colorScheme, reducedMotion: 'reduce' });
            await page.waitForFunction(() => document.querySelector('geo-timeline').globe, null, { timeout: 15000 });
            // Open the filter panel so its controls are audited too.
            await page.evaluate(() => document.querySelector('geo-timeline').shadowRoot.querySelector('.tool[aria-controls]').click());
            await page.waitForTimeout(300);
            const violations = await audit(page);
            if (violations.length) console.log(JSON.stringify(violations, null, 1));
            assert.deepEqual(violations.map(v => v.id), []);
            await context.close();
        });
    }
}
