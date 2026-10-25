// Every third-party dependency, pinned to an exact version. Files are the
// packages' own published builds, so a local copy (vendor/<same path>) is
// byte-identical; switch BASE to self-host.

const BASE = 'https://cdn.jsdelivr.net/npm/';

export const FILES = {
    yaml: 'js-yaml@4.1.0/dist/js-yaml.mjs',
    marked: 'marked@12.0.2/lib/marked.esm.js',
    d3: 'd3@7.9.0/dist/d3.min.js',
    topojson: 'topojson-client@3.1.0/dist/topojson-client.min.js',
    plot: '@observablehq/plot@0.6.16/dist/plot.umd.min.js',
};

export const url = name => new URL(FILES[name], BASE).href;

const scripts = new Map();

// UMD builds are loaded as classic scripts and read from their global.
function loadScript(name, global) {
    if (!scripts.has(name)) {
        scripts.set(name, new Promise((resolve, reject) => {
            if (globalThis[global]) return resolve(globalThis[global]);
            const el = document.createElement('script');
            el.src = url(name);
            el.async = true;
            el.onload = () => resolve(globalThis[global]);
            el.onerror = () => {
                scripts.delete(name);
                reject(new Error(`could not load ${FILES[name]}`));
            };
            document.head.appendChild(el);
        }));
    }
    return scripts.get(name);
}

export async function loadParsers() {
    const [yamlModule, markedModule] = await Promise.all([import(url('yaml')), import(url('marked'))]);
    const yaml = yamlModule.default ?? yamlModule;
    return {
        yamlLoad: text => yaml.load(text, { schema: yaml.CORE_SCHEMA }),
        markdown: markedModule.marked,
    };
}

export const loadD3 = () => loadScript('d3', 'd3');

export async function loadTopojson() {
    await loadD3();
    return loadScript('topojson', 'topojson');
}

export async function loadPlot() {
    await loadD3();
    return loadScript('plot', 'Plot');
}
