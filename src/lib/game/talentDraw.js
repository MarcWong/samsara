// Weighted-without-replacement talent draw, shared between Plaza.svelte's
// normal lucky-charm draw and Trajectory.svelte's good-only re-draw once
// the free-allocation bonus triggers. `listTalents` is core.talentRandom()'s
// array (index i <-> talents.json id 9000(i+1)), each entry carrying its own
// `exclude` (a list of talents.json ids it can't be drawn alongside -- e.g.
// "Helen of Troy" and "You are beautiful" are both pure CHR boosts, so each
// lists the other). `pool` restricts which indices are eligible (defaults to
// all 10); `weights` biases individual indices (default weight 1).
//
// Checked by id via each talent's own `exclude` field (data-driven, from
// talents.json) rather than hardcoded indices -- a positional index shifts
// silently if talents.json's entry order or exclusive-count ever changes,
// which previously would have broken this without any error.
function excludes(a, b) {
    return !!(a.exclude?.includes(b.id) || b.exclude?.includes(a.id));
}

// HOW MANY charms a life gets is itself random now -- Poisson(lambda = 1),
// with the whole k>=3 tail folded onto k=3 so the count never exceeds three:
//
//   P(0) = e^-1        ~ 36.8%
//   P(1) = e^-1        ~ 36.8%
//   P(2) = e^-1 / 2    ~ 18.4%
//   P(3) = 1 - 2.5e^-1 ~  8.0%   (all remaining mass)
//
// Mean ~0.98 charms per life, where it used to be a flat 3 every time. That
// flat 3 was what made any individual charm feel guaranteed: the bonus
// re-draw picks from a 4-charm good pool, so taking 3 of them handed each
// one a 3/4 chance every single run (Helen of Troy included). Drawing a
// Poisson count instead makes a charm an event rather than a fixture, and
// most lives now run with none at all.
const E_INV = Math.exp(-1);
// Cumulative thresholds for k = 0, 1, 2; anything above the last is k = 3,
// which is exactly the folded tail (1 - 2.5e^-1).
const COUNT_CDF = [E_INV, 2 * E_INV, 2.5 * E_INV];

function drawCount() {
    const r = Math.random();
    for (let k = 0; k < COUNT_CDF.length; k++) {
        if (r < COUNT_CDF[k]) return k;
    }
    return 3;
}

export function drawTalents(listTalents, { pool = null, weights = {} } = {}) {
    const selected = [];
    const available = new Set(pool ?? listTalents.map((_, i) => i));
    // Can't draw more than the pool holds -- and the exclusion filter below
    // can empty the candidate list before `want` is reached, so that's
    // checked per iteration too rather than assumed.
    const want = Math.min(drawCount(), available.size);

    while (selected.length < want) {
        const candidates = [...available].filter(index =>
            !selected.some(sIndex => excludes(listTalents[sIndex], listTalents[index]))
        );
        if (!candidates.length) break;
        const totalWeight = candidates.reduce((sum, id) => sum + (weights[id] ?? 1), 0);
        let r = Math.random() * totalWeight;
        let pick = candidates[candidates.length - 1];
        for (const id of candidates) {
            const w = weights[id] ?? 1;
            if (r < w) {
                pick = id;
                break;
            }
            r -= w;
        }
        selected.push(pick);
        available.delete(pick);
    }
    return selected.map(index => listTalents[index]);
}
