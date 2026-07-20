// Ported from the original src/index.js global pub-sub. achievement.js calls
// $$event('achievement', ...) directly (not via import) so this is kept as a
// globalThis shim rather than an ES export, matching the original wiring —
// import this module once (e.g. from core.js) before any achievement checks
// run, purely for its side effect of installing the globals.

globalThis.$$eventMap = new Map();
globalThis.$$event = (tag, data) => {
    const listener = $$eventMap.get(tag);
    if(listener) listener.forEach(fn=>fn(data));
}
globalThis.$$on = (tag, fn) => {
    let listener = $$eventMap.get(tag);
    if(!listener) {
        listener = new Set();
        $$eventMap.set(tag, listener);
    }
    listener.add(fn);
}
globalThis.$$off = (tag, fn) => {
    const listener = $$eventMap.get(tag);
    if(listener) listener.delete(fn);
}
