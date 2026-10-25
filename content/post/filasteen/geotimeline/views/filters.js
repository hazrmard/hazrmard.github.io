// Toolbar (search, filter toggle, result count) and the filter panel (facet
// chips with counts, display options).

import { h, icon } from './dom.js';
import { facetCounts, parseQuery } from '../model/query.js';

export function toggleFilter(store, group, value) {
    const filters = { ...store.get().filters };
    const set = new Set(filters[group] || []);
    if (set.has(value)) set.delete(value); else set.add(value);
    if (set.size) filters[group] = set; else delete filters[group];
    store.set({ filters }, 'filters');
}

function segmented(label, name, options, current, onChange) {
    return h('fieldset', { class: 'segmented' },
        h('legend', {}, label),
        options.map(([value, text]) => h('label', {},
            h('input', { type: 'radio', name, value, checked: value === current, onchange: () => onChange(value) }),
            h('span', {}, text))));
}

export function createFilters(ctx) {
    const { model, store } = ctx;
    const groups = [...model.facets.values()].filter(g => g.filter && g.values.size);
    const name = `${ctx.idPrefix}opt`;

    const search = h('input', {
        type: 'search', class: 'search', placeholder: 'Search events', 'aria-label': 'Search events',
        value: store.get().query,
    });
    let searchTimer = null;
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => store.set({ query: search.value }, 'filters'), 150);
    });

    const filterCount = h('span', { class: 'count-badge' });
    const panelId = `${ctx.idPrefix}filters`;
    const toggle = h('button', { type: 'button', class: 'tool', 'aria-expanded': 'false', 'aria-controls': panelId },
        icon('filter'), h('span', { class: 'tool-label' }, 'Filter'), filterCount);
    const results = h('span', { class: 'results', role: 'status' });

    const chipGroups = h('div', { class: 'facet-groups' });
    const options = h('div', { class: 'display-options' });
    const clear = h('button', { type: 'button', class: 'link-button' }, 'Clear all');
    const extra = h('div', { class: 'panel-extra' });
    const panel = h('div', { class: 'panel', id: panelId, hidden: true },
        chipGroups, extra, options, h('div', { class: 'panel-footer' }, clear));

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    function setOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    }
    panel.addEventListener('keydown', e => {
        if (e.key === 'Escape') { setOpen(false); toggle.focus(); }
    });
    clear.addEventListener('click', () => {
        search.value = '';
        store.set({ filters: {}, query: '', thread: null }, 'filters');
    });

    function renderChips() {
        const state = store.get();
        const events = model.events.filter(e => !e.draft || ctx.showDrafts);
        const counts = facetCounts(events, state.filters, model.facets, parseQuery(state.query));
        chipGroups.replaceChildren(...groups.map(g => {
            const selected = state.filters[g.key] || new Set();
            // Parents first, each followed by its children.
            const ordered = [];
            const children = new Map();
            for (const v of g.values.values()) {
                if (v.parent) {
                    if (!children.has(v.parent)) children.set(v.parent, []);
                    children.get(v.parent).push(v);
                }
            }
            for (const v of g.values.values()) {
                if (v.parent) continue;
                ordered.push([v, 0]);
                for (const c of children.get(v.key) || []) ordered.push([c, 1]);
            }
            return h('div', { class: 'facet-group', role: 'group', 'aria-label': g.label },
                h('div', { class: 'facet-label' }, g.label),
                h('div', { class: 'chips' }, ordered.map(([v, depth]) => {
                    const n = counts[g.key].get(v.key) || 0;
                    const on = selected.has(v.key);
                    return h('button', {
                        type: 'button',
                        class: depth ? 'chip child' : 'chip',
                        'aria-pressed': String(on),
                        disabled: !on && n === 0,
                        onclick: () => toggleFilter(store, g.key, v.key),
                    }, v.icon && !/[/.]/.test(v.icon) ? h('span', { 'aria-hidden': 'true' }, `${v.icon} `) : null,
                    v.label, h('span', { class: 'chip-count' }, String(n)));
                })));
        }));
    }

    function renderOptions() {
        const state = store.get();
        options.replaceChildren(
            segmented('Non-matching events', `${name}-mode`, [['dim', 'Dim'], ['hide', 'Hide']], state.mode,
                mode => store.set({ mode }, 'filters')),
            segmented('Spacing', `${name}-spacing`, [['compressed', 'Even'], ['scaled', 'By time']], state.spacing,
                spacing => store.set({ spacing }, 'filters')));
    }

    function renderStatus() {
        const state = store.get();
        const active = Object.values(state.filters).reduce((n, s) => n + s.size, 0) + (state.thread ? 1 : 0);
        filterCount.textContent = active ? String(active) : '';
        filterCount.hidden = !active;
        const total = model.events.filter(e => !e.draft || ctx.showDrafts).length;
        const shown = ctx.matched().size;
        results.textContent = shown === total ? `${total} events` : `${shown} of ${total} events`;
        if (search.value !== state.query && ctx.root.activeElement !== search) search.value = state.query;
    }

    store.subscribe((state, prev) => {
        if (state.filters !== prev.filters || state.query !== prev.query || state.thread !== prev.thread) {
            renderChips();
            renderStatus();
        }
        if (state.mode !== prev.mode || state.spacing !== prev.spacing) renderOptions();
    });
    renderChips();
    renderOptions();
    renderStatus();

    return {
        toolbarItems: [h('div', { class: 'search-wrap' }, search), toggle, results],
        panel,
        extra,
        setOpen,
    };
}
