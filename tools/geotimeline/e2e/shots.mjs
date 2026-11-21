// Screenshots for manual review: light/dark × desktop/mobile.
//   node e2e/shots.mjs [hash]   (writes to $OUT)
import { build, serve, chromium, open } from './harness.mjs';
const out = process.env.OUT || '.';
const hash = process.argv[2] || '#e=1948-04-22-haifa-cleansed-of-palestinians-in';
const site = await build();
const { server, origin } = await serve(site);
const browser = await chromium.launch();
try {
    for (const [name, opts] of [['desktop-light', {}], ['desktop-dark', { colorScheme: 'dark' }],
        ['mobile-light', { width: 375, height: 740 }], ['mobile-dark', { width: 375, height: 740, colorScheme: 'dark' }]]) {
        const { page, errors, context } = await open(browser, origin, '/post/zz-geotimeline-e2e/' + hash, opts);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${out}/${name}.png` });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        console.log(name, 'errors', errors, 'h-overflow', overflow);
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
