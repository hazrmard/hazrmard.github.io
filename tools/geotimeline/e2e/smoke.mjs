import { build, serve, chromium, open } from './harness.mjs';
const out = process.env.OUT || '.';
const site = await build();
const { server, origin } = await serve(site);
const browser = await chromium.launch();
try {
    const { page, errors } = await open(browser, origin, '/post/filasteen/' + (process.argv[2] || ''));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/smoke-top.png` });
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/smoke-scrolled.png` });
    console.log('focus', await page.evaluate(() => document.querySelector('geo-timeline').store.get().focus), 'hash', await page.evaluate(() => location.hash));
    console.log('errors', errors);
} finally {
    await browser.close();
    server.close();
}
