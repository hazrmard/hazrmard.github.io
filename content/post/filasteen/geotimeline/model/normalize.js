// Turns loaded files into the in-memory model used by every view.
//
// The model is plain data (no DOM). Problems are reported as diagnostics
// {level: 'error'|'warning'|'info', file, line, message}; an event with an
// error is dropped, everything else is kept.

import { splitStream } from './stream.js';
import { parseWhen, extent, formatWhen, parseDuration } from './dates.js';

// Keys with a fixed meaning in an event header. Every other key must name a
// facet group.
export const EVENT_KEYS = new Set([
    'id', 'when', 'title', 'where', 'threads', 'sources', 'data', 'images',
    'details', 'importance', 'draft',
]);

export const DEFAULT_OPTIONS = {
    view: 'scroll',
    spacing: 'compressed',
    gap_marker: '2y',
    filter_mode: 'dim',
    date_locale: undefined,
};

const PATH_LIKE = /^[^\s]+\.[A-Za-z0-9]+$/;

export function fold(text) {
    // Strips diacritics and transliteration marks (ʿ ʾ ' ’) so "sasa" finds "Ṣaʿsaʿ".
    return String(text).normalize('NFD').replace(/[\p{M}\u02B0-\u02FF'’`]/gu, '').toLowerCase();
}

export function slugify(text, maxWords = 6) {
    return fold(text)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, maxWords)
        .join('-');
}

function asList(value) {
    if (value === null || value === undefined || value === '') return [];
    return Array.isArray(value) ? value : [value];
}

function isMapping(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
}

// ---------------------------------------------------------------------------
// Sections

function normalizeFacets(raw, file, report) {
    const groups = new Map();
    if (raw === null) return groups;
    if (!isMapping(raw)) {
        report('error', file, '`facets` must be a mapping of group keys');
        return groups;
    }
    for (const [key, group] of Object.entries(raw)) {
        if (EVENT_KEYS.has(key)) {
            report('error', file, `facet group \`${key}\` clashes with a reserved event key`);
            continue;
        }
        const g = isMapping(group) ? group : {};
        const values = new Map();
        for (const [vkey, v] of Object.entries(g.values || {})) {
            const def = typeof v === 'string' ? { label: v } : isMapping(v) ? v : {};
            values.set(String(vkey), {
                key: String(vkey),
                label: def.label ?? String(vkey),
                icon: def.icon ?? null,
                color: def.color ?? null,
                parent: def.parent ?? null,
                description: def.description ?? null,
            });
        }
        for (const v of values.values()) {
            if (v.parent && !values.has(v.parent)) {
                report('warning', file, `facet value \`${key}.${v.key}\` has unknown parent \`${v.parent}\``);
                v.parent = null;
            }
        }
        groups.set(key, {
            key,
            label: g.label ?? key,
            filter: g.filter !== false,
            badge: g.badge !== false,
            values,
        });
    }
    return groups;
}

function normalizePlaces(raw, file, report, resolve) {
    const places = new Map();
    if (raw === null) return places;
    if (!isMapping(raw)) {
        report('error', file, '`places` must be a mapping of place keys');
        return places;
    }
    for (const [key, p] of Object.entries(raw)) {
        const def = typeof p === 'string' ? { name: p } : isMapping(p) ? p : {};
        const lat = def.lat === undefined ? null : Number(def.lat);
        const lon = def.lon === undefined ? null : Number(def.lon);
        if ((lat !== null && !(lat >= -90 && lat <= 90)) || (lon !== null && !(lon >= -180 && lon <= 180))) {
            report('warning', file, `place \`${key}\` has invalid coordinates`);
        }
        places.set(key, {
            key,
            name: def.name ?? key,
            lat: Number.isFinite(lat) ? lat : null,
            lon: Number.isFinite(lon) ? lon : null,
            geo: def.geo ? resolve(def.geo) : null,
            parent: def.parent ?? null,
            kind: def.kind ?? null,
            region: def.region ?? null,
            names: asList(def.names),
            note: def.note ?? null,
        });
    }
    // Inherit region and, failing a point of its own, the parent's coordinates.
    const resolvePlace = (place, seen = new Set()) => {
        if (!place.parent || seen.has(place.key)) return place;
        seen.add(place.key);
        const parent = places.get(place.parent);
        if (!parent) {
            report('warning', file, `place \`${place.key}\` has unknown parent \`${place.parent}\``);
            place.parent = null;
            return place;
        }
        resolvePlace(parent, seen);
        if (!place.region) place.region = parent.region;
        if (place.lat === null && parent.lat !== null && !place.geo) {
            place.lat = parent.lat;
            place.lon = parent.lon;
            place.approximate = true;
        }
        return place;
    };
    for (const place of places.values()) resolvePlace(place);
    return places;
}

function normalizePeriods(raw, file, report, resolve) {
    if (raw === null) return [];
    if (!Array.isArray(raw)) {
        report('error', file, '`periods` must be a list');
        return [];
    }
    const periods = [];
    raw.forEach((p, i) => {
        if (!isMapping(p)) return report('error', file, `period #${i + 1} is not a mapping`);
        let when;
        try {
            when = parseWhen(p.when);
        } catch (e) {
            return report('error', file, `period \`${p.id ?? i + 1}\`: ${e.message}`);
        }
        const [t0, t1] = extent(when);
        periods.push({
            id: p.id ?? slugify(p.label ?? `period-${i + 1}`),
            label: p.label ?? p.id ?? `Period ${i + 1}`,
            when,
            t0: when.open === 'start' ? -Infinity : t0,
            t1: when.open === 'end' ? Infinity : t1,
            color: p.color ?? null,
            boundaries: asList(p.boundaries).map(resolve),
            description: p.description ?? null,
        });
    });
    return periods.sort((a, b) => a.t0 - b.t0);
}

function sourceLabel(s, key) {
    const author = s.author ? String(s.author).split(/[,;&]| and /)[0].trim().split(/\s+/).pop() : null;
    if (author && s.year) return `${author} ${s.year}`;
    if (s.title && s.year) return `${s.title} (${s.year})`;
    return s.title ?? author ?? key;
}

function normalizeSources(raw, file, report) {
    const sources = new Map();
    if (raw === null) return sources;
    if (!isMapping(raw)) {
        report('error', file, '`sources` must be a mapping of source keys');
        return sources;
    }
    for (const [key, s] of Object.entries(raw)) {
        const def = typeof s === 'string' ? { title: s } : isMapping(s) ? s : {};
        sources.set(key, { key, ...def, label: def.label ?? sourceLabel(def, key) });
    }
    return sources;
}

function normalizeChart(spec, where, report, resolve) {
    if (!isMapping(spec)) {
        report('warning', where, 'a chart spec must be a mapping');
        return null;
    }
    const chart = {
        mark: spec.mark ?? (spec.series ? null : 'bar'),
        title: spec.title ?? null,
        series: spec.series ?? null,
        table: typeof spec.table === 'string' ? spec.table : null,
        file: spec.file ? resolve(spec.file) : null,
        x: spec.x ?? null,
        y: spec.y === undefined ? null : asList(spec.y).map(String),
        unit: spec.unit ?? null,
        label: spec.label ?? null,
        sources: asList(spec.sources),
        note: spec.note ?? null,
    };
    if (chart.mark && !['line', 'bar', 'area', 'dot', 'stat'].includes(chart.mark)) {
        report('warning', where, `unknown chart mark \`${chart.mark}\` (use line, bar, area, dot or stat)`);
        chart.mark = 'bar';
    }
    if (!chart.series && !chart.table && !chart.file) {
        report('warning', where, 'a chart needs `table`, `file` or `series`');
        return null;
    }
    return chart;
}

function normalizeSeries(raw, file, report, resolve) {
    const series = new Map();
    if (raw === null) return series;
    if (!isMapping(raw)) {
        report('error', file, '`series` must be a mapping of series keys');
        return series;
    }
    for (const [key, s] of Object.entries(raw)) {
        const chart = normalizeChart({ mark: 'line', ...s, series: null }, file, report, resolve);
        if (chart) series.set(key, { key, ...chart, label: chart.label ?? chart.title ?? key, track: s.track !== false });
    }
    return series;
}

function normalizeThreads(raw, file, report, resolve, markdown) {
    if (raw === null) return [];
    if (!Array.isArray(raw)) {
        report('error', file, '`threads` must be a list');
        return [];
    }
    return raw.filter(isMapping).map((t, i) => {
        const intro = t.intro ?? '';
        const isPath = typeof intro === 'string' && PATH_LIKE.test(intro.trim()) && !intro.includes('\n');
        return {
            id: String(t.id ?? slugify(t.title ?? `thread-${i + 1}`)),
            title: t.title ?? t.id ?? `Thread ${i + 1}`,
            introSrc: isPath ? resolve(intro.trim()) : null,
            introHtml: !isPath && intro ? markdown.parse(String(intro)) : null,
            listed: asList(t.events).map(String),
            match: isMapping(t.match) ? t.match : null,
            events: [],
        };
    });
}

// ---------------------------------------------------------------------------
// Event bodies

// Splits a markdown body into title / summary / more / sections.
function splitBody(body, markdown) {
    const tokens = markdown.lexer(body);
    const render = list => {
        const copy = [...list];
        copy.links = tokens.links;
        return markdown.parser(copy);
    };
    let title = null;
    const intro = [];
    const sections = [];
    let current = null;
    for (const token of tokens) {
        if (token.type === 'space') continue;
        if (title === null && intro.length === 0 && !current && token.type === 'heading' && token.depth <= 2) {
            title = token.text;
            continue;
        }
        if (token.type === 'heading' && token.depth === 3) {
            current = { title: token.text, tokens: [] };
            sections.push(current);
            continue;
        }
        (current ? current.tokens : intro).push(token);
    }
    return {
        title,
        summaryHtml: intro.length ? render(intro.slice(0, 1)) : '',
        moreHtml: intro.length > 1 ? render(intro.slice(1)) : '',
        sections: sections.map(s => ({ titleHtml: markdown.parseInline(s.title), html: render(s.tokens) })),
    };
}

// ---------------------------------------------------------------------------

export function normalize(loaded, deps) {
    const { markdown, yamlLoad } = deps;
    const diagnostics = [...loaded.diagnostics];
    const report = (level, file, message, line = null) => diagnostics.push({ level, file, line, message });
    const resolve = path => new URL(String(path), loaded.base).href;
    const { manifest, sections, sectionFiles } = loaded;

    const options = { ...DEFAULT_OPTIONS, ...(isMapping(manifest.options) ? manifest.options : {}) };
    options.gapYears = parseDuration(options.gap_marker) ?? 2;
    if (!['dim', 'hide'].includes(options.filter_mode)) options.filter_mode = 'dim';
    if (!['compressed', 'scaled'].includes(options.spacing)) options.spacing = 'compressed';
    if (!['scroll', 'geo'].includes(options.view)) options.view = 'scroll';

    const facets = normalizeFacets(sections.facets, sectionFiles.facets, report);
    const places = normalizePlaces(sections.places, sectionFiles.places, report, resolve);
    const periods = normalizePeriods(sections.periods, sectionFiles.periods, report, resolve);
    const sources = normalizeSources(sections.sources, sectionFiles.sources, report);
    const series = normalizeSeries(sections.series, sectionFiles.series, report, resolve);
    const threads = normalizeThreads(sections.threads, sectionFiles.threads, report, resolve, markdown);

    const basemap = isMapping(manifest.basemap) ? manifest.basemap : {};
    const regions = new Map();
    for (const [key, r] of Object.entries(isMapping(basemap.regions) ? basemap.regions : {})) {
        if (!isMapping(r) || !Array.isArray(r.center)) {
            report('warning', 'timeline manifest', `region \`${key}\` needs \`center: [lon, lat]\``);
            continue;
        }
        regions.set(key, {
            key,
            name: r.name ?? key,
            center: r.center.map(Number),
            span: Number(r.span ?? 5),
            land: r.land ? resolve(r.land) : null,
        });
    }
    for (const place of places.values()) {
        if (place.region && !regions.has(place.region)) {
            report('warning', sectionFiles.places, `place \`${place.key}\` names unknown region \`${place.region}\``);
            place.region = null;
        }
    }

    const events = [];
    const ids = new Set();
    let order = 0;
    for (const { file, text } of loaded.streams) {
        const { records, diagnostics: d } = splitStream(text, file);
        diagnostics.push(...d);
        for (const rec of records) {
            const at = (message, level = 'warning') => report(level, file, message, rec.line);
            let header;
            try {
                header = yamlLoad(rec.header);
            } catch (e) {
                at(`header is not valid YAML: ${e.reason ?? e.message}`, 'error');
                continue;
            }
            if (!isMapping(header)) {
                at('header is not a key/value mapping (a `---` horizontal rule in a body must be written `***`)', 'error');
                continue;
            }
            let when;
            try {
                when = parseWhen(header.when);
            } catch (e) {
                at(e.message, 'error');
                continue;
            }
            const body = splitBody(rec.body, markdown);
            const titleSource = header.title !== undefined ? String(header.title) : body.title;
            if (!titleSource) {
                at('event has no title (add `title:` or a `## heading`)', 'error');
                continue;
            }
            const titleHtml = markdown.parseInline(titleSource);
            const [t0, t1] = extent(when);

            let id = header.id !== undefined ? String(header.id) : `${String(header.when).split('/')[0].replace(/[^0-9-]/g, '') || 'event'}-${slugify(titleSource, 5)}`;
            if (ids.has(id)) {
                at(`duplicate id \`${id}\``);
                let n = 2;
                while (ids.has(`${id}-${n}`)) n++;
                id = `${id}-${n}`;
            }
            ids.add(id);

            const where = [];
            for (const w of asList(header.where)) {
                if (typeof w === 'string') {
                    const place = places.get(w);
                    if (!place) at(`unknown place \`${w}\``);
                    where.push(place ? { place: w, name: place.name, lat: place.lat, lon: place.lon, geo: place.geo, region: place.region, approximate: Boolean(place.approximate) }
                        : { place: w, name: w, lat: null, lon: null, geo: null, region: null });
                } else if (isMapping(w)) {
                    const lat = w.lat === undefined ? null : Number(w.lat);
                    const lon = w.lon === undefined ? null : Number(w.lon);
                    where.push({
                        place: null,
                        name: w.name ?? null,
                        lat: Number.isFinite(lat) ? lat : null,
                        lon: Number.isFinite(lon) ? lon : null,
                        geo: w.geo ? resolve(w.geo) : null,
                        region: w.region && regions.has(w.region) ? w.region : null,
                    });
                }
            }

            const facetValues = {};
            for (const [key, value] of Object.entries(header)) {
                if (EVENT_KEYS.has(key)) continue;
                const group = facets.get(key);
                if (!group) {
                    at(`unknown key \`${key}\` (not an event field or facet group)`);
                    continue;
                }
                facetValues[key] = asList(value).map(String);
                for (const v of facetValues[key]) {
                    if (!group.values.has(v)) {
                        at(`unknown ${key} value \`${v}\``);
                        group.values.set(v, { key: v, label: v, icon: null, color: null, parent: null, description: null, adhoc: true });
                    }
                }
            }

            const eventSources = asList(header.sources).map(s => {
                if (typeof s === 'string') return { ref: s, at: null, quote: null };
                if (isMapping(s) && s.ref) return { ref: String(s.ref), at: s.at ?? null, quote: s.quote ?? null };
                if (isMapping(s) && Object.keys(s).length === 1) {
                    const [ref, value] = Object.entries(s)[0];
                    return { ref, at: value === null ? null : String(value), quote: null };
                }
                return null;
            }).filter(Boolean);

            const data = asList(header.data)
                .map(spec => normalizeChart(spec, file, (level, f, m) => at(m, level), resolve))
                .filter(Boolean);

            const images = asList(header.images).map(img =>
                typeof img === 'string' ? { src: resolve(img), caption: null, credit: null }
                    : isMapping(img) && img.src ? { src: resolve(img.src), caption: img.caption ?? null, credit: img.credit ?? null } : null,
            ).filter(Boolean);

            const details = asList(header.details).map(d =>
                typeof d === 'string' ? { src: resolve(d), title: null }
                    : isMapping(d) && d.src ? { src: resolve(d.src), title: d.title ?? null } : null,
            ).filter(Boolean);

            const facetText = Object.entries(facetValues)
                .flatMap(([g, vs]) => vs.map(v => facets.get(g).values.get(v).label));
            const searchText = fold([
                stripHtml(titleHtml), stripHtml(body.summaryHtml), stripHtml(body.moreHtml),
                ...body.sections.map(s => stripHtml(s.titleHtml + ' ' + s.html)),
                ...facetText, ...where.map(w => w.name ?? ''),
            ].join(' ')).replace(/\s+/g, ' ');

            events.push({
                id,
                when,
                whenLabel: formatWhen(when, options.date_locale),
                t0,
                t1,
                titleHtml,
                titleText: stripHtml(titleHtml).replace(/\s+/g, ' ').trim(),
                summaryHtml: body.summaryHtml,
                moreHtml: body.moreHtml,
                sections: body.sections,
                details,
                images,
                where,
                facets: facetValues,
                threads: asList(header.threads).map(String),
                sources: eventSources,
                data,
                importance: [1, 2, 3].includes(header.importance) ? header.importance : 2,
                draft: header.draft === true,
                file,
                line: rec.line,
                order: order++,
                searchText,
            });
        }
    }
    events.sort((a, b) => a.t0 - b.t0 || a.order - b.order);
    events.forEach((e, i) => { e.index = i; });

    return {
        title: manifest.title ?? '',
        base: loaded.base,
        options,
        basemap: {
            world: basemap.world ? resolve(basemap.world) : null,
            regions,
        },
        facets,
        places,
        periods,
        sources,
        series,
        threads,
        events,
        diagnostics,
    };
}
