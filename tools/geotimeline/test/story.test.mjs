import { test } from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { marked } from 'marked';

const M = '../../../content/post/filasteen/geotimeline/model/';
const { normalize } = await import(M + 'normalize.js');
const { validate } = await import(M + 'validate.js');
const { selectCutback, cutbackSpec, pickSpread, sceneOf, nowOf } = await import(M + 'story.js');

const yamlLoad = text => yaml.load(text, { schema: yaml.CORE_SCHEMA });

function model(stream, extra = '') {
    const loaded = {
        base: 'https://example.org/t/',
        manifest: { schema: 1, basemap: { regions: { levant: { center: [35, 31.8], span: 4 } } } },
        sections: {
            facets: { actors: { values: { a: 'A', b: 'B' } } },
            places: { haifa: { name: 'Haifa', lat: 32.8, lon: 35, region: 'levant' } },
            periods: null, sources: null, series: null,
            threads: [{ id: 'th', title: 'T', events: ['e3', 'e1'] }],
        },
        sectionFiles: {},
        streams: [{ file: 'h.timeline', text: stream }, { file: '/story/s.timeline', text: extra, base: 'https://example.org/story/' }],
        diagnostics: [],
    };
    return validate(normalize(loaded, { markdown: marked, yamlLoad }));
}

const HISTORY = [1900, 1910, 1920, 1930, 1940].map((y, i) =>
    `---\nid: e${i + 1}\nwhen: ${y}\nactors: ${i % 2 ? 'b' : 'a'}\n${i === 3 ? 'importance: 3\n' : ''}---\n## Event ${i + 1}\n`).join('');
const STORY = `---\nid: s1\nwhen: 2023-10-09\nregister: story\nimages: [img/a.jpg]\n---\n## Story moment\n`;

test('story events resolve paths against their own file', () => {
    const m = model(HISTORY, STORY);
    const s1 = m.events.find(e => e.id === 's1');
    assert.equal(s1.register, 'story');
    assert.equal(s1.images[0].src, 'https://example.org/story/img/a.jpg');
    assert.equal(m.events.find(e => e.id === 'e1').register, 'history');
    assert.ok(!m.diagnostics.some(d => d.message.includes('register')), 'register is a known key');
});

test('cut-backs select by window, facet, thread order and list', () => {
    const m = model(HISTORY, STORY);
    const now = nowOf(m, '2023-10-07');
    const pick = attrs => selectCutback(m, cutbackSpec(attrs, m), { now }).all.map(e => e.id);
    assert.deepEqual(pick({ from: '1905', to: '1930' }), ['e2', 'e3', 'e4'], 'to is inclusive of its year');
    assert.deepEqual(pick({ from: '1900', to: '1940', actors: 'b' }), ['e2', 'e4']);
    assert.deepEqual(pick({ thread: 'th' }), ['e3', 'e1'], 'thread order');
    assert.deepEqual(pick({ events: 'e5, e2' }), ['e5', 'e2']);
    assert.deepEqual(pick({ from: '1935', to: 'now' }), ['e5'], 'story events need converge');
    assert.deepEqual(pick({ from: '1935', to: 'now', converge: '' }), ['e5', 's1']);
    const off = selectCutback(m, cutbackSpec({ from: '1935', to: 'now', converge: '' }, m), { now, storyConverge: false });
    assert.deepEqual(off.all.map(e => e.id), ['e5'], 'page-level converge off wins');
    const bad = selectCutback(m, cutbackSpec({ thread: 'nope' }, m), { now });
    assert.deepEqual(bad.problems, ['unknown thread `nope`', 'selects no events']);
});

test('max keeps important events and an even spread, in order', () => {
    const events = Array.from({ length: 10 }, (_, i) => ({ id: i, importance: i === 7 ? 3 : 2 }));
    assert.deepEqual(pickSpread(events, 4).map(e => e.id), [0, 4, 7, 9]);
    assert.equal(pickSpread(events, 20).length, 10);
    const m = model(HISTORY);
    const r = selectCutback(m, cutbackSpec({ max: '2' }, m), { now: 2000 });
    assert.equal(r.all.length, 5);
    assert.deepEqual(r.shown.map(e => e.id), ['e1', 'e4']);
});

test('scenes from heading attributes', () => {
    const m = model(HISTORY);
    assert.deepEqual(sceneOf({ where: 'haifa', when: '2023-10' }, m).points, [{ lat: 32.8, lon: 35, name: 'Haifa', region: 'levant' }]);
    const raw = sceneOf({ where: '31.29, 34.25', name: 'Rafah', region: 'levant' }, m);
    assert.deepEqual(raw.points, [{ lat: 31.29, lon: 34.25, name: 'Rafah', region: 'levant' }]);
    assert.deepEqual(sceneOf({ where: 'nowhere', when: 'soon' }, m).problems, ['unknown place `nowhere`', 'cannot parse `data-when="soon"`']);
});
