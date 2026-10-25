// Threads: named paths through a subset of events. Choosing one narrows the
// timeline to its events and shows a banner with its introduction and
// step-through controls that follow the thread's own order.

import { h, icon } from './dom.js';

export function threadOrder(ctx) {
    const { model, store } = ctx;
    const id = store.get().thread;
    const thread = id ? model.threads.find(t => t.id === id) : null;
    if (!thread) return null;
    const matched = ctx.matched();
    return thread.events.filter(e => matched.has(e));
}

export function createThreads(ctx) {
    const { model, store } = ctx;
    if (!model.threads.length) return null;

    const pick = id => store.set({ thread: store.get().thread === id ? null : id }, 'threads');

    // Filter panel section.
    const section = h('div', { class: 'facet-group', role: 'group', 'aria-label': 'Threads' },
        h('div', { class: 'facet-label' }, 'Threads'),
        h('div', { class: 'chips' }));
    function renderSection() {
        const current = store.get().thread;
        section.querySelector('.chips').replaceChildren(...model.threads.map(t => h('button', {
            type: 'button', class: 'chip thread-chip', 'aria-pressed': String(t.id === current), onclick: () => pick(t.id),
        }, icon('thread'), t.title, h('span', { class: 'chip-count' }, String(t.events.length)))));
    }

    // Banner above the list.
    const title = h('span', { class: 'thread-title' });
    const intro = h('div', { class: 'thread-intro' });
    const position = h('span', { class: 'thread-position' });
    const prev = h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Previous in thread' }, icon('prev'));
    const next = h('button', { type: 'button', class: 'tool', 'aria-label': 'Next in thread' }, h('span', { class: 'next-label' }, 'Start'), icon('next'));
    const close = h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Leave thread' }, icon('close'));
    // Compact, inside the sticky controls, so the step buttons stay at hand.
    const about = h('details', { class: 'thread-about' }, h('summary', {}, 'About this thread'), intro);
    const banner = h('section', { class: 'thread-banner', hidden: true, 'aria-label': 'Thread' },
        h('div', { class: 'thread-row' },
            h('span', { class: 'thread-kicker' }, icon('thread')),
            title,
            h('div', { class: 'thread-nav' }, prev, position, next, close)),
        about);

    const step = delta => {
        const order = threadOrder(ctx) ?? [];
        if (!order.length) return;
        const i = order.indexOf(store.get().focus);
        const j = i === -1 ? 0 : Math.max(0, Math.min(order.length - 1, i + delta));
        store.set({ focus: order[j] }, 'thread');
    };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    close.addEventListener('click', () => store.set({ thread: null }, 'threads'));

    const intros = new Map();
    async function renderBanner() {
        const id = store.get().thread;
        const thread = id ? model.threads.find(t => t.id === id) : null;
        banner.hidden = !thread;
        if (!thread) return;
        title.textContent = thread.title;
        about.hidden = !thread.introHtml && !thread.introSrc;
        if (thread.introHtml) intro.innerHTML = thread.introHtml;
        else if (thread.introSrc) {
            intro.innerHTML = '';
            if (!intros.has(thread.introSrc)) {
                intros.set(thread.introSrc, ctx.fetchText(thread.introSrc).then(t => ctx.markdown.parse(t)).catch(() => ''));
            }
            const html = await intros.get(thread.introSrc);
            if (store.get().thread === id) intro.innerHTML = html;
        } else intro.innerHTML = '';
        renderPosition();
    }
    function renderPosition() {
        const order = threadOrder(ctx) ?? [];
        const i = order.indexOf(store.get().focus);
        position.textContent = i === -1 ? `${order.length} events` : `${i + 1} of ${order.length}`;
        prev.disabled = i <= 0;
        next.disabled = order.length === 0 || i === order.length - 1;
        next.querySelector('.next-label').textContent = i === -1 ? 'Start' : 'Next';
    }

    // "Part of" chips on cards.
    function renderThreads(event) {
        if (!event.threads.length) return null;
        return h('div', { class: 'card-threads' }, h('span', { class: 'sources-label' }, 'Threads'),
            event.threads.map(id => {
                const t = model.threads.find(x => x.id === id);
                return h('button', { type: 'button', class: 'badge thread-link', dataset: { thread: id }, title: `Follow the thread “${t.title}”` }, icon('thread'), t.title);
            }));
    }

    store.subscribe((state, prevState) => {
        if (state.thread !== prevState.thread) {
            renderSection();
            renderBanner();
        } else if (state.focus !== prevState.focus || state.filters !== prevState.filters || state.query !== prevState.query) {
            if (state.thread) renderPosition();
        }
    });
    renderSection();
    renderBanner();

    return { section, banner, renderThreads, pick };
}
