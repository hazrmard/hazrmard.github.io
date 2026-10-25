// Fetches a manifest and everything it includes.
//
// Paths in the manifest, and paths inside events (details, images, data,
// geo), are resolved relative to the manifest's URL.

export const SECTIONS = ['facets', 'places', 'periods', 'sources', 'series', 'threads'];

const DATA_EXT = /\.(ya?ml|json)$/i;

// `io` = {fetchText(url) -> Promise<string>, yamlLoad(text) -> any}
export async function load(manifestUrl, io) {
    const base = new URL(manifestUrl, globalThis.location?.href);
    const diagnostics = [];
    const manifestText = await io.fetchText(base.href);
    let manifest;
    try {
        manifest = io.yamlLoad(manifestText) || {};
    } catch (e) {
        throw new Error(`${base.pathname}: ${e.message}`);
    }
    if (typeof manifest !== 'object' || Array.isArray(manifest)) {
        throw new Error(`${base.pathname}: the manifest must be a key/value mapping`);
    }
    if (manifest.schema !== 1) {
        throw new Error(`${base.pathname}: unsupported \`schema: ${manifest.schema}\` (this renderer reads schema 1)`);
    }

    const resolve = path => new URL(path, base).href;

    const sectionJobs = SECTIONS.map(async name => {
        const value = manifest[name];
        if (typeof value === 'string' && DATA_EXT.test(value)) {
            try {
                return [name, io.yamlLoad(await io.fetchText(resolve(value))), value];
            } catch (e) {
                diagnostics.push({ level: 'error', file: value, line: null, message: `could not load ${name}: ${e.message}` });
                return [name, null, value];
            }
        }
        return [name, value ?? null, 'timeline manifest'];
    });

    const eventFiles = [].concat(manifest.events || []);
    if (eventFiles.length === 0) {
        diagnostics.push({ level: 'error', file: base.pathname, line: null, message: '`events` lists no files' });
    }
    const streamJobs = eventFiles.map(async file => {
        try {
            return { file, text: await io.fetchText(resolve(file)) };
        } catch (e) {
            diagnostics.push({ level: 'error', file, line: null, message: `could not load events: ${e.message}` });
            return { file, text: '' };
        }
    });

    const sections = {};
    const sectionFiles = {};
    for (const [name, value, file] of await Promise.all(sectionJobs)) {
        sections[name] = value;
        sectionFiles[name] = file;
    }
    const streams = await Promise.all(streamJobs);
    return { base: base.href, manifest, sections, sectionFiles, streams, diagnostics };
}

export async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
}
