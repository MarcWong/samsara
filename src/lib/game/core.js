import { base } from '$app/paths';

import Life from './life.js';
import REAL_CONFIG from './config.js';
import './events.js';
import { lang, translate } from '../i18n.js';

// English is the data exactly as shipped in data/en-us -- the structure the
// engine runs on, and never edited for translation. Other languages are
// text-only overlays on top of it (event lines + lucky-charm names/descriptions
// keyed by the same ids), so a translation cannot alter conditions, effects or
// branches, and an edit to the English data flows into every language.
const DATA_DIR = 'en-us';
const OVERLAY_DIRS = { zh: 'zh-cn' };

async function i18nLoad(dataSet) {
    const res = await fetch(`${base}/data/${DATA_DIR}/${dataSet}.json`);
    return res.json();
}

async function fetchOverlay(code) {
    const dir = OVERLAY_DIRS[code];
    const [events, talents] = await Promise.all(
        ['events', 'talents'].map(async name => {
            const res = await fetch(`${base}/data/${dir}/${name}.json`);
            if (!res.ok) throw new Error(`${dir}/${name}.json: ${res.status}`);
            return res.json();
        })
    );
    return { events, talents };
}

const core = new Life();
core.config(REAL_CONFIG);

const overlays = {};

// Swaps the game's text to `code`. Instant -- the overlays are all fetched up
// front by initGame() -- and safe to repeat; the player only ever reaches this
// from the start screen, before any life state exists.
function applyLanguage(code) {
    const overlay = overlays[code];
    if (!overlay) return core.localize();
    core.localize({
        ...overlay,
        engine: {
            chinaBirthBlessing: translate(code, 'engine.chinaBirthBlessing'),
            sprDepressionLine: translate(code, 'engine.sprDepressionLine'),
        },
    });
}

let readyPromise = null;
// core.initial() is called exactly once for the app's lifetime — repeat
// navigations back to Main (there aren't any in the reachable flow, but the
// dev server's HMR can re-mount the root component) must not re-fetch and
// re-process all 5 data files, so the same in-flight/resolved promise is
// handed back to every caller.
function initGame() {
    if (!readyPromise) {
        readyPromise = (async () => {
            await core.initial(i18nLoad);
            await Promise.all(
                Object.keys(OVERLAY_DIRS).map(async code => {
                    // A missing translation must never stop the game: that
                    // language just plays in English.
                    try {
                        overlays[code] = await fetchOverlay(code);
                    } catch (err) {
                        console.warn(`[i18n] no "${code}" game text, falling back to English`, err);
                    }
                })
            );
            // Runs once now for the current language, then on every switch.
            lang.subscribe(applyLanguage);
        })();
    }
    return readyPromise;
}

export { core, initGame };
