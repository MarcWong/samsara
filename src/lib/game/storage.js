import { browser } from '$app/environment';

// Thin localStorage wrapper so game-logic modules (property.js, character.js)
// don't touch the browser global directly — SSR is off for this app (see
// +layout.js) but this keeps the modules safe to import/test in Node too.
// Key names are preserved exactly as the original LayaAir app used them
// ('times', 'extendTalent', 'ATLT', 'AEVT', 'ACHV', 'uniqueWaTaShi') since
// saveload.js's save-code export/import does a blanket dump/restore of these.

function get(key) {
    if(!browser) return undefined;
    const data = localStorage.getItem(key);
    if(data === null || data === 'undefined') return undefined;
    return JSON.parse(data);
}

function set(key, value) {
    if(!browser) return;
    localStorage.setItem(key, JSON.stringify(value));
}

function remove(key) {
    if(!browser) return;
    localStorage.removeItem(key);
}

export { get, set, remove };
