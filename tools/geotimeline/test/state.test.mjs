import { test } from 'node:test';
import assert from 'node:assert/strict';

const { readHash, writeHash, isStateHash } = await import('../../../content/post/filasteen/geotimeline/state.js');
const defaults = { view: 'scroll', mode: 'dim', spacing: 'compressed', reading: 'woven', readings: ['woven', 'story', 'timeline'] };

test('ordinary anchors are not state', () => {
    assert.equal(isStateHash('#fn:1', ''), false);
    assert.equal(isStateHash('#top', ''), false);
    assert.equal(isStateHash('', ''), false);
    assert.equal(isStateHash('#e=x', ''), true);
    assert.equal(isStateHash('#f.actors=uk', ''), true);
    assert.equal(isStateHash('#e=x', 'tl.'), false);
});

test('writing state replaces a plain anchor and keeps foreign keys', () => {
    const state = { ...readHash('', '', defaults), focus: 'a', reading: 'story', filters: { actors: new Set(['uk', 'un']) } };
    assert.equal(writeHash(state, '', defaults, '#fn:1'), '#e=a&r=story&f.actors=uk,un');
    assert.equal(writeHash(state, '', defaults, '#other=1&e=old'), '#other=1&e=a&r=story&f.actors=uk,un');
    const back = readHash('#e=a&r=story&f.actors=uk,un', '', defaults);
    assert.deepEqual([back.focus, back.reading, [...back.filters.actors]], ['a', 'story', ['uk', 'un']]);
});
