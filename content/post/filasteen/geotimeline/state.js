// A small store shared by every view, kept in sync with the URL hash so that
// any state (focused event, view, filters, thread) can be linked to.
//
// Hash format: #e=<event id>&v=geo&q=<search>&m=hide&s=scaled&t=<thread>&f.<group>=a,b

export function createStore(initial) {
    let state = initial;
    const listeners = new Set();
    return {
        get: () => state,
        // `patch` is merged into the state. `source` tells listeners who made
        // the change, so a view can ignore its own updates.
        set(patch, source = null) {
            const prev = state;
            state = { ...state, ...patch };
            for (const fn of listeners) fn(state, prev, source);
        },
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
}

export function readHash(hash, prefix, defaults) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const get = key => params.get(prefix + key);
    const filters = {};
    for (const [key, value] of params) {
        if (key.startsWith(prefix + 'f.') && value) {
            filters[key.slice(prefix.length + 2)] = new Set(value.split(','));
        }
    }
    return {
        focus: get('e') || null,
        view: get('v') === 'geo' ? 'geo' : get('v') === 'scroll' ? 'scroll' : defaults.view,
        query: get('q') || '',
        mode: get('m') === 'hide' ? 'hide' : get('m') === 'dim' ? 'dim' : defaults.mode,
        spacing: get('s') === 'scaled' ? 'scaled' : get('s') === 'compressed' ? 'compressed' : defaults.spacing,
        thread: get('t') || null,
        filters,
    };
}

export function writeHash(state, prefix, defaults, currentHash) {
    const params = new URLSearchParams(currentHash.replace(/^#/, ''));
    for (const key of [...params.keys()]) {
        if (key.startsWith(prefix)) params.delete(key);
    }
    const put = (key, value) => { if (value) params.set(prefix + key, value); };
    put('e', state.focus);
    if (state.view !== defaults.view) put('v', state.view);
    put('q', state.query);
    if (state.mode !== defaults.mode) put('m', state.mode);
    if (state.spacing !== defaults.spacing) put('s', state.spacing);
    put('t', state.thread);
    for (const [group, set] of Object.entries(state.filters)) {
        if (set.size) put(`f.${group}`, [...set].join(','));
    }
    const text = params.toString().replace(/%2C/g, ',');
    return text ? `#${text}` : '';
}

// Keeps the hash updated without adding history entries or scrolling, and
// applies hashes the reader edits or pastes.
export function syncHash(store, prefix, defaults) {
    let writing = false;
    let timer = null;
    store.subscribe(state => {
        if (writing) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            const next = writeHash(state, prefix, defaults, location.hash);
            if (next !== location.hash) {
                history.replaceState(history.state, '', `${location.pathname}${location.search}${next}`);
            }
        }, 150);
    });
    addEventListener('hashchange', () => {
        writing = true;
        store.set(readHash(location.hash, prefix, defaults), 'hash');
        writing = false;
    });
}
