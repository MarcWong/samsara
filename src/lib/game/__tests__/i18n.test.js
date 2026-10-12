import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createLife, loadJSON } from './fixtures.js';
import { DICT, translate } from '../../i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadZh(name) {
    return JSON.parse(readFileSync(join(__dirname, '../../../../static/data/zh-cn', `${name}.json`), 'utf-8'));
}

const CJK = /[一-鿿]/;
const placeholders = text => (typeof text === 'string' ? text.match(/%\w+%|\{[\w.]+\}/g) ?? [] : []).sort();

describe('zh-cn game text overlay', () => {
    const enEvents = loadJSON('events');
    const zhEvents = loadZh('events');
    const enTalents = loadJSON('talents');
    const zhTalents = loadZh('talents');

    it('covers every English event id, and nothing else', () => {
        expect(Object.keys(zhEvents).sort()).toEqual(Object.keys(enEvents).sort());
    });

    it('translates every event line into non-empty Chinese', () => {
        for (const id in zhEvents) {
            expect(typeof zhEvents[id], `event ${id}`).toBe('string');
            expect(CJK.test(zhEvents[id]), `event ${id} has no Chinese: ${zhEvents[id]}`).toBe(true);
        }
    });

    it('covers every lucky charm with a Chinese name and description', () => {
        expect(Object.keys(zhTalents).sort()).toEqual(Object.keys(enTalents).sort());
        for (const id in zhTalents) {
            expect(CJK.test(zhTalents[id].name), `talent ${id} name`).toBe(true);
            expect(CJK.test(zhTalents[id].description), `talent ${id} description`).toBe(true);
        }
    });

    it('keeps the death declaration (event 10000) distinct from every other line', () => {
        // Trajectory finds the closing death line by event id and expects it
        // to be the only event with this exact text.
        const declaration = zhEvents[10000];
        expect(Object.keys(zhEvents).filter(id => zhEvents[id] === declaration)).toEqual(['10000']);
    });
});

describe('Life.localize', () => {
    it('swaps event and talent text without touching the mechanics, and restores English', async () => {
        const life = await createLife();
        const events = life.request(life.Module.EVENT);
        const talents = life.request(life.Module.TALENT);

        const before = { event: events.get(10001), talent: talents.get(90001) };

        life.localize({ events: loadZh('events'), talents: loadZh('talents') });
        const zhEvent = events.get(10001);
        const zhTalent = talents.get(90001);
        expect(zhEvent.event).toBe(loadZh('events')['10001']);
        expect(zhTalent.name).toBe(loadZh('talents')['90001'].name);
        expect({ ...zhEvent, event: null }).toEqual({ ...before.event, event: null });
        expect({ ...zhTalent, name: null, description: null }).toEqual({ ...before.talent, name: null, description: null });

        life.localize();
        expect(events.get(10001)).toEqual(before.event);
        expect(talents.get(90001)).toEqual(before.talent);
    });

    it('falls back to English for an id the overlay does not cover', async () => {
        const life = await createLife();
        const events = life.request(life.Module.EVENT);
        const english = events.get(10002).event;
        life.localize({ events: { 10001: '只翻译了这一条' } });
        expect(events.get(10001).event).toBe('只翻译了这一条');
        expect(events.get(10002).event).toBe(english);
    });
});

describe('interface dictionary', () => {
    const en = Object.keys(DICT.en);
    const zh = Object.keys(DICT.zh).filter(key => !key.startsWith('engine.'));

    it('has the same keys in both languages', () => {
        expect(zh.sort()).toEqual(en.sort());
    });

    it('uses the same placeholders in both languages', () => {
        for (const key of en) {
            expect(placeholders(DICT.zh[key]), key).toEqual(placeholders(DICT.en[key]));
        }
    });

    it('substitutes %name% placeholders and falls back to English, then to the key', () => {
        expect(translate('zh', 'alloc.tokens', { n: 13 })).toBe('点数：13');
        expect(translate('en', 'alloc.tokens', { n: 13 })).toBe('Tokens: 13');
        expect(translate('zh', 'engine.chinaBirthBlessing')).toMatch(CJK);
        expect(translate('en', 'no.such.key')).toBe('no.such.key');
    });

    it('keeps the credits the same length in both languages', () => {
        expect(DICT.zh.credits.length).toBe(DICT.en.credits.length);
    });
});
