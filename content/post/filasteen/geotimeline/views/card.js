// Renders one event as an <article>. Used by the scroll list and by the
// geo view's sheet.

import { h, icon } from './dom.js';

const detailCache = new Map();

// Loads a `.details` markdown file. Its first heading is the fallback title
// and is not repeated in the body.
export function loadDetail(src, ctx) {
    if (!detailCache.has(src)) {
        detailCache.set(src, ctx.fetchText(src).then(text => {
            const match = text.match(/^#+\s+(.*)$/m);
            const body = match && text.slice(0, match.index).trim() === '' ? text.slice(match.index + match[0].length) : text;
            return { title: match ? match[1].trim() : null, html: ctx.markdown.parse(body.trim()), text };
        }).catch(e => {
            detailCache.delete(src);
            throw e;
        }));
    }
    return detailCache.get(src);
}

function badges(event, ctx) {
    const out = [];
    for (const [groupKey, values] of Object.entries(event.facets)) {
        const group = ctx.model.facets.get(groupKey);
        if (!group?.badge) continue;
        for (const key of values) {
            const v = group.values.get(key);
            const active = ctx.store.get().filters[groupKey]?.has(key);
            out.push(h('button', {
                type: 'button',
                class: 'badge',
                'aria-pressed': active ? 'true' : 'false',
                title: `${active ? 'Remove' : 'Show only'} ${group.label}: ${v.label}`,
                dataset: { group: groupKey, value: key },
                style: v.color ? `--badge-color: ${v.color}` : null,
            }, v.icon && !/[/.]/.test(v.icon) ? h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, v.icon) : null,
            v.icon && /[/.]/.test(v.icon) ? h('img', { class: 'badge-icon', src: new URL(v.icon, ctx.model.base).href, alt: '' }) : null,
            v.label));
        }
    }
    return out;
}

function sourcesList(event, ctx) {
    if (!event.sources.length) return null;
    return h('footer', { class: 'sources' },
        h('span', { class: 'sources-label' }, 'Sources'),
        h('ol', {}, event.sources.map(s => {
            const src = ctx.model.sources.get(s.ref);
            const label = src ? src.label : s.ref;
            const title = src ? [src.author, src.title, src.publisher, src.year].filter(Boolean).join(', ') : 'unknown source';
            return h('li', {},
                src?.url ? h('a', { href: src.url, title, rel: 'noopener' }, label) : h('span', { title }, label),
                s.at ? `, ${s.at}` : null,
                s.quote ? h('q', {}, s.quote) : null);
        })));
}

function disclosure(cls, summaryContent, body, onOpen) {
    const el = h('details', { class: cls }, h('summary', {}, summaryContent), body);
    if (onOpen) {
        el.addEventListener('toggle', () => { if (el.open) onOpen(el); });
    }
    return el;
}

export function renderCard(event, ctx, { headingLevel = 3 } = {}) {
    const titleId = `${ctx.idPrefix}t-${event.id}`;
    const where = event.where.filter(w => w.name);
    const header = h('header', {},
        h('time', { datetime: event.when.start ? isoOf(event.when.start) : null }, event.whenLabel),
        h(`h${headingLevel}`, { id: titleId, class: 'title', html: event.titleHtml }),
        (where.length || Object.keys(event.facets).length) ? h('div', { class: 'meta' },
            where.length ? h('span', { class: 'where' }, icon('pin'), where.map(w => w.name).join(', ')) : null,
            badges(event, ctx)) : null);

    const parts = [header];
    if (event.summaryHtml) parts.push(h('div', { class: 'summary', html: event.summaryHtml }));

    const images = event.images.map(img => h('figure', {},
        h('img', { src: img.src, alt: img.caption || event.titleText, loading: 'lazy' }),
        img.caption || img.credit ? h('figcaption', {}, img.caption, img.credit ? h('span', { class: 'credit' }, ` ${img.credit}`) : null) : null));
    if (event.moreHtml || images.length) {
        parts.push(disclosure('more', 'Read more', h('div', { class: 'body' }, h('div', { html: event.moreHtml }), images)));
    }
    for (const s of event.sections) {
        parts.push(disclosure('section', h('span', { html: s.titleHtml }), h('div', { class: 'body', html: s.html })));
    }
    for (const d of event.details) {
        const body = h('div', { class: 'body' }, h('p', { class: 'loading' }, 'Loading…'));
        parts.push(disclosure('detail', d.title || 'Details', body, async () => {
            if (body.dataset.loaded) return;
            body.dataset.loaded = '1';
            try {
                const detail = await loadDetail(d.src, ctx);
                body.innerHTML = detail.html;
                ctx.onDetailLoaded?.(event, detail);
            } catch (e) {
                delete body.dataset.loaded;
                body.innerHTML = '';
                body.append(h('p', { class: 'error' }, `Could not load this section (${e.message}).`));
            }
        }));
    }
    if (ctx.renderCharts) parts.push(...ctx.renderCharts(event));
    const sources = sourcesList(event, ctx);
    if (sources) parts.push(sources);
    if (ctx.renderThreads) parts.push(ctx.renderThreads(event));

    return h('article', { tabindex: '-1', 'aria-labelledby': titleId }, parts);
}

function isoOf(p) {
    const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');
    const y = p.y < 0 ? `-${pad(p.y, 4)}` : pad(p.y, 4);
    return p.precision === 'year' ? y : p.precision === 'month' ? `${y}-${pad(p.m)}` : `${y}-${pad(p.m)}-${pad(p.d)}`;
}
