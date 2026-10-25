// Tiny DOM helpers shared by the views.

export const SVG_NS = 'http://www.w3.org/2000/svg';

// h('div', {class: 'x', onclick: fn}, child, 'text', [more children])
export function h(tag, attrs = {}, ...children) {
    const el = tag.startsWith('svg:') ? document.createElementNS(SVG_NS, tag.slice(4)) : document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === null || value === undefined || value === false) continue;
        if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else el.setAttribute(key, value === true ? '' : String(value));
    }
    append(el, children);
    return el;
}

function append(el, children) {
    for (const child of children) {
        if (child === null || child === undefined || child === false) continue;
        if (Array.isArray(child)) append(el, child);
        else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
}

export function icon(name) {
    const paths = {
        pin: 'M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z',
        filter: 'M1.5 3h13l-5 6v4.5l-3 1.5V9z',
        globe: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm4.9 6h-2.1a11 11 0 0 0-.9-4 5.5 5.5 0 0 1 3 4zM8 2.6c.6.8 1.2 2.3 1.4 4.4H6.6C6.8 4.9 7.4 3.4 8 2.6zM6.1 3a11 11 0 0 0-.9 4H3.1a5.5 5.5 0 0 1 3-4zM3.1 9h2.1c.1 1.5.4 2.9.9 4a5.5 5.5 0 0 1-3-4zM8 13.4c-.6-.8-1.2-2.3-1.4-4.4h2.8c-.2 2.1-.8 3.6-1.4 4.4zm1.9-.4c.5-1.1.8-2.5.9-4h2.1a5.5 5.5 0 0 1-3 4z',
        list: 'M2 3.5h12v1.5H2zm0 3.75h12v1.5H2zM2 11h12v1.5H2z',
        prev: 'M10.5 2.5 5 8l5.5 5.5 1-1L7 8l4.5-4.5z',
        next: 'M5.5 2.5 11 8l-5.5 5.5-1-1L9 8 4.5 3.5z',
        play: 'M4.5 2.5v11l9-5.5z',
        pause: 'M4 2.5h3v11H4zm5 0h3v11H9z',
        close: 'M3.5 2.5 8 7l4.5-4.5 1 1L9 8l4.5 4.5-1 1L8 9l-4.5 4.5-1-1L7 8 2.5 3.5z',
        chart: 'M2 13.5h12V15H2zM3 8h2v4.5H3zm4-4h2v8.5H7zm4 2h2v6.5h-2z',
        thread: 'M3 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM3 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM4.3 4.7l7.5 2.7-.4 1.2-7.5-2.7zm7.1 4.5.5 1.1-7.5 3-.5-1.1z',
    };
    const svg = h('svg:svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', class: `icon icon-${name}` });
    svg.append(h('svg:path', { d: paths[name], fill: 'currentColor' }));
    return svg;
}

export function prefersReducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
