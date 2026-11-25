// Parsing and labelling of `when` values.
//
// Accepted forms (each side of a range may be prefixed with `~` for "circa"):
//   1948            year precision
//   1948-04         month precision
//   1948-04-21      day precision
//   -0500           year 501 BCE (astronomical numbering: 0 = 1 BCE)
//   1947-11/1948-05 range
//   1920/..         open-ended range;  ../1917  open start
//
// JavaScript Date parsing is never used: ISO date-only strings are parsed as
// UTC by Date and then shifted by the local timezone when displayed.

const POINT_RE = /^(~)?(-?\d{1,6})(?:-(\d{2}))?(?:-(\d{2}))?$/;

function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function dayOfYear(y, m, d) {
    let n = d - 1;
    for (let i = 1; i < m; i++) n += daysInMonth(y, i);
    return n;
}

// Decimal year at the start of a calendar day.
function decimal(y, m, d) {
    return y + dayOfYear(y, m, d) / (isLeap(y) ? 366 : 365);
}

export function parsePoint(text) {
    const match = POINT_RE.exec(text.trim());
    if (!match) return null;
    const [, approx, ys, ms, ds] = match;
    const y = Number(ys);
    const m = ms === undefined ? null : Number(ms);
    const d = ds === undefined ? null : Number(ds);
    if (m !== null && (m < 1 || m > 12)) return null;
    if (d !== null && (d < 1 || d > daysInMonth(y, m))) return null;
    const precision = d !== null ? 'day' : m !== null ? 'month' : 'year';
    // [t0, t1): the span of time this point covers.
    let t0, t1;
    if (precision === 'year') {
        t0 = y;
        t1 = y + 1;
    } else if (precision === 'month') {
        t0 = decimal(y, m, 1);
        t1 = m === 12 ? y + 1 : decimal(y, m + 1, 1);
    } else {
        t0 = decimal(y, m, d);
        t1 = t0 + 1 / (isLeap(y) ? 366 : 365);
    }
    return { y, m, d, precision, approx: Boolean(approx), t0, t1 };
}

// Returns {start, end, open} or throws an Error with a readable message.
// `end` is null for a single point. `open` is 'start' | 'end' | null.
export function parseWhen(value) {
    if (value === null || value === undefined || value === '') {
        throw new Error('missing `when`');
    }
    const text = String(value).trim();
    const parts = text.split('/');
    if (parts.length > 2) throw new Error(`\`when: ${text}\` has more than one "/"`);
    if (parts.length === 1) {
        const start = parsePoint(parts[0]);
        if (!start) throw new Error(`cannot parse \`when: ${text}\``);
        return { start, end: null, open: null };
    }
    const [a, b] = parts.map(p => p.trim());
    if (a === '..' && b === '..') throw new Error(`\`when: ${text}\` has no dates`);
    const start = a === '..' ? null : parsePoint(a);
    const end = b === '..' ? null : parsePoint(b);
    if ((a !== '..' && !start) || (b !== '..' && !end)) {
        throw new Error(`cannot parse \`when: ${text}\``);
    }
    if (start && end && end.t1 <= start.t0) {
        throw new Error(`\`when: ${text}\` ends before it starts`);
    }
    return { start: start || end, end: end || start, open: a === '..' ? 'start' : b === '..' ? 'end' : null };
}

// Sort key and extent of a parsed `when`.
export function extent(when) {
    return [when.start.t0, (when.end || when.start).t1];
}

function utcDate(p) {
    const date = new Date(Date.UTC(2000, (p.m || 1) - 1, p.d || 1));
    date.setUTCFullYear(p.y);
    return date;
}

const FORMAT_OPTIONS = {
    year: { year: 'numeric', timeZone: 'UTC' },
    month: { year: 'numeric', month: 'long', timeZone: 'UTC' },
    day: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' },
};

function yearLabel(y) {
    return y > 0 ? String(y) : `${1 - y} BCE`;
}

export function formatPoint(p, locale) {
    const prefix = p.approx ? 'c. ' : '';
    if (p.y <= 0 || p.precision === 'year') return prefix + yearLabel(p.y);
    return prefix + new Intl.DateTimeFormat(locale, FORMAT_OPTIONS[p.precision]).format(utcDate(p));
}

export function formatWhen(when, locale) {
    const { start, end, open } = when;
    if (open === 'start') return `until ${formatPoint(end, locale)}`;
    if (open === 'end') return `${formatPoint(start, locale)} onward`;
    if (!end || end === start) return formatPoint(start, locale);
    const samePrecision = start.precision === end.precision && start.y > 0 && end.y > 0;
    if (samePrecision && start.precision !== 'year' && !start.approx && !end.approx) {
        const fmt = new Intl.DateTimeFormat(locale, FORMAT_OPTIONS[start.precision]);
        if (typeof fmt.formatRange === 'function') return fmt.formatRange(utcDate(start), utcDate(end));
    }
    return `${formatPoint(start, locale)} – ${formatPoint(end, locale)}`;
}

// Duration strings used in options, e.g. "2y", "6m", "10d".
export function parseDuration(text) {
    const match = /^(\d+(?:\.\d+)?)\s*([ymd])$/.exec(String(text).trim());
    if (!match) return null;
    const n = Number(match[1]);
    return match[2] === 'y' ? n : match[2] === 'm' ? n / 12 : n / 365.25;
}
