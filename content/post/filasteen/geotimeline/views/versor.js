// Unit quaternions for globe rotations, after Mike Bostock's `versor`
// (ISC licence). Rotations are d3-geo [λ, φ, γ] angles in degrees.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function fromAngles([l, p, g]) {
    l *= RAD / 2; p *= RAD / 2; g *= RAD / 2;
    const sl = Math.sin(l), cl = Math.cos(l);
    const sp = Math.sin(p), cp = Math.cos(p);
    const sg = Math.sin(g), cg = Math.cos(g);
    return [
        cl * cp * cg + sl * sp * sg,
        sl * cp * cg - cl * sp * sg,
        cl * sp * cg + sl * cp * sg,
        cl * cp * sg - sl * sp * cg,
    ];
}

export function toAngles([a, b, c, d]) {
    return [
        Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * DEG,
        Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * DEG,
        Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * DEG,
    ];
}

export function multiply([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    return [
        a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2,
        a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2,
        a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2,
        a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2,
    ];
}

export const inverse = ([a, b, c, d]) => [a, -b, -c, -d];

// Spherical interpolation along the shorter arc.
export function slerp(q0, q1) {
    let [a0, b0, c0, d0] = q0;
    let [a1, b1, c1, d1] = q1;
    let dot = a0 * a1 + b0 * b1 + c0 * c1 + d0 * d1;
    if (dot < 0) { a1 = -a1; b1 = -b1; c1 = -c1; d1 = -d1; dot = -dot; }
    if (dot > 0.9995) {
        return t => normalize([a0 + t * (a1 - a0), b0 + t * (b1 - b0), c0 + t * (c1 - c0), d0 + t * (d1 - d0)]);
    }
    const theta = Math.acos(dot);
    const s = Math.sin(theta);
    return t => {
        const k0 = Math.sin((1 - t) * theta) / s;
        const k1 = Math.sin(t * theta) / s;
        return [a0 * k0 + a1 * k1, b0 * k0 + b1 * k1, c0 * k0 + c1 * k1, d0 * k0 + d1 * k1];
    };
}

function normalize(q) {
    const n = Math.hypot(...q);
    return q.map(x => x / n);
}

// The rotation that places geographic point `at` where, with no rotation,
// geographic point `target` would be drawn. Both are [lon, lat].
export function rotationTo(at, target) {
    const bringAt = fromAngles([-at[0], -at[1], 0]);
    const bringTarget = fromAngles([-target[0], -target[1], 0]);
    return toAngles(multiply(inverse(bringTarget), bringAt));
}
