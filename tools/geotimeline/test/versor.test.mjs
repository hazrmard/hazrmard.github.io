import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as d3 from 'd3';

const { rotationTo, fromAngles, toAngles, slerp } = await import('../../../content/post/filasteen/geotimeline/views/versor.js');

test('angles round-trip through quaternions', () => {
    for (const r of [[10, 20, 0], [-120, 45, 0], [170, -60, 30]]) {
        const back = toAngles(fromAngles(r));
        r.forEach((v, i) => assert.ok(Math.abs(v - back[i]) < 1e-9, `${r} -> ${back}`));
    }
});

test('rotationTo places a location at a chosen screen point', () => {
    const projection = d3.geoOrthographic().scale(1000).translate([500, 1400]);
    for (const at of [[35.0, 31.8], [7.59, 47.56], [-74, 40.7]]) {
        for (const screen of [[500, 700], [900, 750], [200, 1000]]) {
            projection.rotate([0, 0, 0]);
            const target = projection.invert(screen);
            projection.rotate(rotationTo(at, target));
            const [x, y] = projection(at);
            assert.ok(Math.hypot(x - screen[0], y - screen[1]) < 1e-6, `${at} -> ${x},${y} (wanted ${screen})`);
        }
    }
});

test('slerp ends at both rotations', () => {
    const q0 = fromAngles([0, 0, 0]), q1 = fromAngles([-35, -31, 0]);
    const f = slerp(q0, q1);
    assert.deepEqual(f(0).map(x => +x.toFixed(9)), q0.map(x => +x.toFixed(9)));
    assert.deepEqual(f(1).map(x => +x.toFixed(9)), q1.map(x => +x.toFixed(9)));
});
