// Splits an event stream file into {header, body} records.
//
// A stream is a sequence of events, each a YAML header between two lines that
// are exactly `---`, followed by an optional markdown body:
//
//   ---
//   when: 1948
//   ---
//   ## Title
//   Body…
//   ---
//   when: 1949
//   ---
//
// Because `---` delimits records, markdown horizontal rules must be written
// as `***` inside bodies.

const DELIMITER = /^---[ \t]*$/;

// Returns {records: [{header, body, line, bodyLine}], diagnostics}.
// `line` is the 1-based line of the opening delimiter.
export function splitStream(text, file) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const diagnostics = [];
    const delimiters = [];
    lines.forEach((l, i) => { if (DELIMITER.test(l)) delimiters.push(i); });

    if (delimiters.length === 0) {
        if (text.trim()) diagnostics.push({ level: 'error', file, line: 1, message: 'no `---` delimiters found; this file contains no events' });
        return { records: [], diagnostics };
    }
    const preamble = lines.slice(0, delimiters[0]).join('\n').trim();
    if (preamble && !preamble.split('\n').every(l => l.trim().startsWith('#') || !l.trim())) {
        diagnostics.push({ level: 'warning', file, line: 1, message: 'text before the first `---` is ignored' });
    }

    const records = [];
    for (let k = 0; k < delimiters.length; k += 2) {
        const open = delimiters[k];
        const close = delimiters[k + 1];
        if (close === undefined) {
            diagnostics.push({ level: 'error', file, line: open + 1, message: 'header opened with `---` is never closed' });
            break;
        }
        const next = delimiters[k + 2] ?? lines.length;
        records.push({
            header: lines.slice(open + 1, close).join('\n'),
            body: lines.slice(close + 1, next).join('\n').trim(),
            line: open + 1,
            bodyLine: close + 2,
        });
    }
    return { records, diagnostics };
}
