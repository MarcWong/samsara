// Weighted-without-replacement talent draw, shared between Plaza.svelte's
// normal 3-lucky-charm draw and Trajectory.svelte's good-only re-draw once
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

export function drawTalents(listTalents, { pool = null, weights = {} } = {}) {
    const selected = [];
    const available = new Set(pool ?? listTalents.map((_, i) => i));
    while (selected.length < 3) {
        const candidates = [...available].filter(index =>
            !selected.some(sIndex => excludes(listTalents[sIndex], listTalents[index]))
        );
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
