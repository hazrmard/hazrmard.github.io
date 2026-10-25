// Filtering, search and facet counts.
//
// `filters` is {groupKey: Set<valueKey>}. Selections combine with OR inside a
// group and AND across groups. Selecting a value also matches its
// descendants (facet values may have a `parent`).

import { fold } from './normalize.js';

function ancestors(group, key) {
    const out = [];
    let v = group?.values.get(key);
    const seen = new Set();
    while (v && !seen.has(v.key)) {
        seen.add(v.key);
        out.push(v.key);
        v = v.parent ? group.values.get(v.parent) : null;
    }
    return out.length ? out : [key];
}

function groupMatches(event, groupKey, selected, facets) {
    const group = facets.get(groupKey);
    return (event.facets[groupKey] || []).some(v => ancestors(group, v).some(a => selected.has(a)));
}

export function matchesFilters(event, filters, facets, except = null) {
    for (const [groupKey, selected] of Object.entries(filters)) {
        if (groupKey === except || !selected || selected.size === 0) continue;
        if (!groupMatches(event, groupKey, selected, facets)) return false;
    }
    return true;
}

export function parseQuery(text) {
    return fold(text || '').split(/\s+/).filter(Boolean);
}

export function matchesQuery(event, terms) {
    return terms.every(t => event.searchText.includes(t));
}

// {groupKey: Map<valueKey, count>}: for each value, how many events would
// match if it were the only selection in its group (other groups' filters and
// the search still apply). Counts roll up to parents.
export function facetCounts(events, filters, facets, terms) {
    const counts = {};
    for (const [groupKey, group] of facets) {
        const c = new Map([...group.values.keys()].map(k => [k, 0]));
        for (const e of events) {
            if (!matchesQuery(e, terms) || !matchesFilters(e, filters, facets, groupKey)) continue;
            const hit = new Set((e.facets[groupKey] || []).flatMap(v => ancestors(group, v)));
            for (const k of hit) c.set(k, (c.get(k) || 0) + 1);
        }
        counts[groupKey] = c;
    }
    return counts;
}

// Returns a Set of matching event ids for a state.
export function selectEvents(model, state) {
    const terms = parseQuery(state.query);
    const thread = state.thread ? model.threads.find(t => t.id === state.thread) : null;
    const inThread = thread ? new Set(thread.events) : null;
    const showDrafts = state.drafts === true;
    const out = new Set();
    for (const e of model.events) {
        if (e.draft && !showDrafts) continue;
        if (inThread && !inThread.has(e.id)) continue;
        if (!matchesQuery(e, terms)) continue;
        if (!matchesFilters(e, state.filters, model.facets)) continue;
        out.add(e.id);
    }
    return out;
}
