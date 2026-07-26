import { writable } from 'svelte/store';
import COUNTRIES from './game/functions/countries.js';

// The old app threaded this same data screen-to-screen as switchView(PAGE,
// {...}) arguments that accumulated one field at a time (nationality flags
// -> +LBTQ -> +talents -> +propertyAllocate). One shared store replaces that
// re-spreading — each screen patches the fields it owns and moves on.
function emptyDraft() {
    return {
        ...Object.fromEntries(COUNTRIES.map(({ code }) => [code, 0])),
        LBTQ: 0,
        CHR: 0,
        INT: 0,
        STR: 0,
        MNY: 0,
        SPR: 0,
        talents: [],
    };
}

const screen = writable('CITYINTRO');
const draft = writable(emptyDraft());

// 0 (normal) -> 1 (fully dispersed), driven by Summary's Restart Life
// transition. A shared store rather than local Summary state because
// Background.svelte -- a sibling under +page.svelte, not a child Summary
// can pass props to -- needs the same per-frame value to fade its own
// shader canvas in lockstep with Summary's own foreground/reveal video.
const restartProgress = writable(0);

function goToScreen(key, patch) {
    if (patch) draft.update(d => ({ ...d, ...patch }));
    screen.set(key);
}

export { screen, draft, goToScreen, emptyDraft, restartProgress };
