import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import Life from '../life.js';
import REAL_CONFIG from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../../static/data/en-us');

function loadJSON(name) {
    return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf-8'));
}

function i18nLoad(dataSet) {
    return loadJSON(dataSet);
}

async function createLife() {
    const life = new Life();
    life.config(REAL_CONFIG);
    await life.initial(i18nLoad);
    return life;
}

export { createLife, i18nLoad, loadJSON, REAL_CONFIG };
