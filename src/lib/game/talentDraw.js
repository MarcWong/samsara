// Weighted-without-replacement talent draw, shared between Plaza.svelte's
// normal 3-lucky-charm draw and Trajectory.svelte's good-only re-draw once
// the free-allocation bonus triggers. `listTalents` is core.talentRandom()'s
// array (index i <-> talents.json id 9000(i+1)). `pool` restricts which
// indices are eligible (defaults to all 10); `weights` biases individual
// indices (default weight 1).
//
// Indices 5 ("Helen of Troy") and 7 ("You are beautiful") are both pure
// CHR boosts -- mutually exclusive so a draw never doubles up on the same
// beat twice.
export function drawTalents(listTalents, { pool = null, weights = {} } = {}) {
    const selected = [];
    const available = new Set(pool ?? listTalents.map((_, i) => i));
    while (selected.length < 3) {
        const candidates = [...available].filter(id => {
            if (selected.includes(5) && id === 7) return false;
            if (selected.includes(7) && id === 5) return false;
            return true;
        });
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
