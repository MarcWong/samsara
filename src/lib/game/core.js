import { base } from '$app/paths';

import Life from './life.js';
import REAL_CONFIG from './config.js';
import './events.js';

async function i18nLoad(dataSet) {
    const res = await fetch(`${base}/data/en-us/${dataSet}.json`);
    return res.json();
}

const core = new Life();
core.config(REAL_CONFIG);

let readyPromise = null;
// core.initial() is called exactly once for the app's lifetime — repeat
// navigations back to Main (there aren't any in the reachable flow, but the
// dev server's HMR can re-mount the root component) must not re-fetch and
// re-process all 5 data files, so the same in-flight/resolved promise is
// handed back to every caller.
function initGame() {
    if (!readyPromise) readyPromise = core.initial(i18nLoad);
    return readyPromise;
}

export { core, initGame };
