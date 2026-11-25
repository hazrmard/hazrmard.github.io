// Shared e2e helpers: build the site with Hugo, serve it, and open pages in
// Chromium with CDN requests answered from node_modules (same files).
//
// Env: HUGO=path/to/hugo (default "hugo"), OUT=screenshot directory.

import { createServer } from 'node:http';
import { readFile, stat, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
export const repo = join(here, '../../..');
const modules = join(here, '../node_modules');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.yaml': 'text/yaml', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv' };

export async function build() {
    const out = await mkdtemp(join(tmpdir(), 'gt-site-'));
    // The overlay config mounts a test page with the plain <geo-timeline>.
    const config = 'hugo.toml,tools/geotimeline/e2e/site/hugo.test.toml';
    execFileSync(process.env.HUGO || 'hugo', ['-D', '--quiet', '--config', config, '-d', out, '--baseURL', 'http://localhost/'], { cwd: repo, stdio: 'inherit' });
    return out;
}

export function serve(root) {
    const server = createServer(async (req, res) => {
        let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let file = join(root, path);
        try {
            if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
            const body = await readFile(file);
            res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
            res.end(body);
        } catch {
            res.writeHead(404);
            res.end('not found');
        }
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

// Answers https://cdn.jsdelivr.net/npm/<pkg>@<ver>/<path> from node_modules,
// and blocks every other external request (fonts etc.) so tests are offline.
export async function routeCdn(context) {
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, async route => {
        const url = new URL(route.request().url());
        if (url.host === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/')) {
            const m = /^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/.exec(url.pathname);
            if (m) {
                try {
                    const body = await readFile(join(modules, m[1], m[2]));
                    return route.fulfill({ status: 200, body, contentType: TYPES[extname(m[2])] || 'text/plain', headers: { 'access-control-allow-origin': '*' } });
                } catch { /* fall through */ }
            }
        }
        return route.fulfill({ status: 404, body: '' });
    });
}

export async function open(browser, origin, path, { width = 1280, height = 900, colorScheme = 'light', reducedMotion = 'no-preference' } = {}) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion });
    await routeCdn(context);
    const page = await context.newPage();
    const errors = [];
    const external = [];
    page.on('request', r => { const host = new URL(r.url()).host; if (host === 'cdn.jsdelivr.net') external.push(r.url()); });
    page.on('pageerror', e => errors.push(String(e)));
    // External hosts other than the CDN are blocked on purpose; only report
    // failures of the site's own files and of the CDN.
    page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
    page.on('response', r => {
        const host = new URL(r.url()).host;
        if (r.status() >= 400 && (host.startsWith('127.0.0.1') || host === 'cdn.jsdelivr.net')) errors.push(`HTTP ${r.status()} ${r.url()}`);
    });
    await page.goto(origin + path);
    await page.waitForFunction(() => document.querySelector('geo-timeline')?.store, null, { timeout: 15000 });
    return { page, context, errors, external };
}
