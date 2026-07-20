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

const screen = writable('MAIN');
const draft = writable(emptyDraft());

function goToScreen(key, patch) {
    if (patch) draft.update(d => ({ ...d, ...patch }));
    screen.set(key);
}

export { screen, draft, goToScreen, emptyDraft };
