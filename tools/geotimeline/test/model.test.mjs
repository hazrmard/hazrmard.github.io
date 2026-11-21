import { test } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { marked } from 'marked';

const M = '../../../content/post/filasteen/geotimeline/model/';
const { parseWhen, formatWhen, parsePoint, parseDuration } = await import(M + 'dates.js');
const { splitStream } = await import(M + 'stream.js');
const { normalize, slugify } = await import(M + 'normalize.js');
const { validate } = await import(M + 'validate.js');
const { selectEvents, facetCounts, parseQuery } = await import(M + 'query.js');

const yamlLoad = text => yaml.load(text, { schema: yaml.CORE_SCHEMA });
const deps = { markdown: marked, yamlLoad };

test('dates: precision and extents', () => {
    const y = parsePoint('1948');
    assert.equal(y.precision, 'year');
    assert.equal(y.t0, 1948);
    assert.equal(y.t1, 1949);
    const m = parsePoint('1948-12');
    assert.equal(m.precision, 'month');
    assert.equal(m.t1, 1949);
    const d = parsePoint('1948-04-21');
    assert.equal(d.precision, 'day');
    assert.ok(d.t0 > 1948.29 && d.t0 < 1948.31);
    assert.equal(parsePoint('1948-02-30'), null);
    assert.equal(parsePoint('1948-13'), null);
    assert.equal(parsePoint('~1882').approx, true);
    assert.equal(parsePoint('-0500').y, -500);
});

test('dates: ranges', () => {
    const r = parseWhen('1947-11/1948-05');
    assert.equal(r.start.m, 11);
    assert.equal(r.end.m, 5);
    assert.equal(parseWhen('1920/..').open, 'end');
    assert.equal(parseWhen('../1917').open, 'start');
    assert.equal(parseWhen(1948).start.y, 1948);
    assert.throws(() => parseWhen('1949/1948'), /ends before/);
    assert.throws(() => parseWhen(' '), /missing|cannot/);
    assert.throws(() => parseWhen('April 1948'), /cannot parse/);
    assert.throws(() => parseWhen(undefined), /missing/);
});

test('dates: labels follow precision and ignore timezone', () => {
    assert.equal(formatWhen(parseWhen('1878'), 'en-GB'), '1878');
    assert.equal(formatWhen(parseWhen('1878-01-01'), 'en-GB'), '1 January 1878');
    assert.equal(formatWhen(parseWhen('1948-04'), 'en-GB'), 'April 1948');
    assert.equal(formatWhen(parseWhen('~1882'), 'en-GB'), 'c. 1882');
    assert.equal(formatWhen(parseWhen('1948-04-21/1948-04-22'), 'en-GB'), '21–22 April 1948');
    assert.equal(formatWhen(parseWhen('1894/1906'), 'en-GB'), '1894 – 1906');
    assert.equal(formatWhen(parseWhen('-0500'), 'en-GB'), '501 BCE');
    assert.equal(formatWhen(parseWhen('1920/..'), 'en-GB'), '1920 onward');
});

test('durations', () => {
    assert.equal(parseDuration('2y'), 2);
    assert.equal(parseDuration('6m'), 0.5);
    assert.equal(parseDuration('x'), null);
});

test('stream: records, empty bodies, unclosed header', () => {
    const text = '# comment\n---\nwhen: 1948\n---\n## A\nbody\n---\nwhen: 1949\ntitle: B\n---\n---\nwhen: 1950\n';
    const { records, diagnostics } = splitStream(text, 'x.timeline');
    assert.equal(records.length, 2);
    assert.equal(records[0].body, '## A\nbody');
    assert.equal(records[1].body, '');
    assert.equal(records[1].line, 7);
    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0].message, /never closed/);
});

test('stream: CRLF line endings', () => {
    const { records } = splitStream('---\r\nwhen: 1948\r\n---\r\n## A\r\n', 'x');
    assert.equal(records.length, 1);
    assert.equal(records[0].header, 'when: 1948');
});

test('slugify', () => {
    assert.equal(slugify('[Nahman Syrkin](https://x) calls for évacuation of Palestine now'), 'nahman-syrkin-calls-for-evacuation-of');
});

function build(stream, sections = {}, options = {}) {
    const loaded = {
        base: 'https://example.org/post/',
        manifest: { schema: 1, options, basemap: { regions: { levant: { center: [35, 31.8], span: 4 } } } },
        sections: { facets: null, places: null, periods: null, sources: null, series: null, threads: null, ...sections },
        sectionFiles: { facets: 'facets.yaml', places: 'places.yaml', periods: 'periods.yaml', sources: 'sources.yaml', series: 'series.yaml', threads: 'threads.yaml' },
        streams: [{ file: 'events.timeline', text: stream }],
        diagnostics: [],
    };
    return validate(normalize(loaded, deps));
}

const FACETS = {
    actors: { label: 'Actors', values: { uk: 'United Kingdom', militias: { label: 'Militias' }, haganah: { label: 'Haganah', parent: 'militias' } } },
    themes: { label: 'Themes', values: { war: 'War' } },
};
const PLACES = {
    palestine: { name: 'Palestine', lat: 31.9, lon: 35.0, region: 'levant' },
    haifa: { name: 'Haifa', lat: 32.79, lon: 34.99, parent: 'palestine' },
    lifta: { name: 'Lifta', parent: 'palestine' },
};

const STREAM = `---
when: 1948-04-21/1948-04-22
where: haifa
actors: [haganah, uk]
sources: [{ref: p2006, at: "p. 95"}, {m2004: p. 186}]
details: [{src: details/haifa.details, title: The fall of Haifa}]
data:
  - mark: bar
    table: |
      a,b
      x,1
---
## The fall of *Haifa*
Summary paragraph.

More text.

### Section one
Section body.
---
when: 1917-11-02
title: Balfour
actors: uk
where: lifta
mystery: 1
---
---
when: nonsense
title: Bad
---
---
when: 1948
---
No heading here, so this event has no title.
---
when: 1948-04-21/1948-04-22
id: 1948-04-21-the-fall-of-haifa
title: duplicate id
---
`;

test('normalize: events, bodies, refs and diagnostics', () => {
    const model = build(STREAM, { facets: FACETS, places: PLACES, sources: { p2006: { author: 'Ilan Pappé', year: 2006, title: 'X' } } });
    assert.deepEqual(model.events.map(e => e.titleText), ['Balfour', 'The fall of Haifa', 'duplicate id']);
    const haifa = model.events[1];
    assert.equal(haifa.id, '1948-04-21-the-fall-of-haifa');
    assert.equal(haifa.titleHtml, 'The fall of <em>Haifa</em>');
    assert.equal(haifa.summaryHtml.trim(), '<p>Summary paragraph.</p>');
    assert.equal(haifa.moreHtml.trim(), '<p>More text.</p>');
    assert.equal(haifa.sections.length, 1);
    assert.equal(haifa.sections[0].titleHtml, 'Section one');
    assert.equal(haifa.where[0].region, 'levant');
    assert.deepEqual(haifa.sources, [{ ref: 'p2006', at: 'p. 95', quote: null }, { ref: 'm2004', at: 'p. 186', quote: null }]);
    assert.equal(haifa.details[0].src, 'https://example.org/post/details/haifa.details');
    assert.equal(haifa.data[0].mark, 'bar');
    assert.ok(haifa.searchText.includes('section body'));
    assert.ok(haifa.searchText.includes('haganah'));
    assert.equal(model.events[2].id, '1948-04-21-the-fall-of-haifa-2');

    const lifta = model.events[0].where[0];
    assert.equal(lifta.approximate, true, 'falls back to parent coordinates');

    const msgs = model.diagnostics.map(d => `${d.level}:${d.message}`);
    assert.ok(msgs.some(m => m.startsWith('error:cannot parse')));
    assert.ok(msgs.some(m => m.startsWith('error:event has no title')));
    assert.ok(msgs.some(m => m.includes('unknown key `mystery`')));
    assert.ok(msgs.some(m => m.includes('unknown source `m2004`')));
    assert.ok(msgs.some(m => m.startsWith('warning:duplicate id')));
    assert.ok(model.sources.get('p2006').label === 'Pappé 2006');
});

test('normalize: horizontal rule in body is reported', () => {
    const model = build('---\nwhen: 1948\n---\n## A\ntext\n---\nmore\n---\n## B\n');
    assert.equal(model.events.length, 1);
    assert.ok(model.diagnostics.some(d => d.level === 'error' && d.message.includes('***')));
});

test('query: AND across groups, OR within, parents, counts, search', () => {
    const stream = `---
when: 1947
actors: [haganah]
themes: war
---
## One
Village of Ṣaʿsaʿ
---
when: 1948
actors: uk
---
## Two
---
when: 1949
actors: [uk, haganah]
draft: true
---
## Three
`;
    const model = build(stream, { facets: FACETS });
    const ids = state => [...selectEvents(model, { query: '', filters: {}, ...state })].map(id => model.events.find(e => e.id === id).titleText);
    assert.deepEqual(ids({}), ['One', 'Two']);
    assert.deepEqual(ids({ drafts: true }), ['One', 'Two', 'Three']);
    assert.deepEqual(ids({ filters: { actors: new Set(['militias']) } }), ['One']);
    assert.deepEqual(ids({ filters: { actors: new Set(['militias', 'uk']) } }), ['One', 'Two']);
    assert.deepEqual(ids({ filters: { actors: new Set(['uk']), themes: new Set(['war']) } }), []);
    assert.deepEqual(ids({ query: 'sasa' }), ['One']);
    const counts = facetCounts(model.events.filter(e => !e.draft), { themes: new Set(['war']) }, model.facets, parseQuery(''));
    assert.equal(counts.actors.get('militias'), 1);
    assert.equal(counts.actors.get('uk'), 0);
    assert.equal(counts.themes.get('war'), 1);
});

test('threads: listed order, then members by tag and match', () => {
    const stream = `---
when: 1900
id: a
---
## A
---
when: 1910
id: b
threads: t1
---
## B
---
when: 1920
id: c
themes: war
---
## C
`;
    const model = build(stream, { facets: FACETS, threads: [{ id: 't1', title: 'T', events: ['c', 'missing'], match: { themes: 'war' } }] });
    assert.deepEqual(model.threads[0].events, ['c', 'b']);
    assert.deepEqual(model.events.find(e => e.id === 'b').threads, ['t1']);
    assert.ok(model.diagnostics.some(d => d.message.includes('unknown event `missing`')));
});
