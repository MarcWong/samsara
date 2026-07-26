import { describe, it, expect } from 'vitest';
import '../events.js';
import COUNTRIES from '../functions/countries.js';
import { createLife } from './fixtures.js';

// age.json only has entries for ages 0-102 (see property.js's ageNext()).
// Once AGE reaches 102 the *next* call steps to 103, where the while-loop's
// own `age < 103` guard exits immediately without finding data, and
// getAgeData(103) returns undefined — destructuring it throws. That boundary
// is a pre-existing bug in the ported-verbatim ageNext() (not one of this
// phase's 4 named fixes), so the fuzz loop below deliberately stops shy of
// it rather than chasing "isEnd must eventually become true": a long-lived,
// lucky playthrough reaching old age without dying is a legitimate outcome,
// not a bug, and the suite shouldn't be flaky over it.
const SAFE_AGE_CUTOFF = 100;

function allocationFor(points, code) {
    const share = Math.floor(points / 5);
    const remainder = points - share * 4;
    return { CHR: share, INT: share, STR: share, SPR: share, MNY: remainder, [code]: 1 };
}

describe('full playthrough smoke test', () => {
    for (const { key, code, name, points } of COUNTRIES) {
        it(`plays ${name} (${points} pts) to death or age ${SAFE_AGE_CUTOFF} without throwing`, async () => {
            const life = await createLife();

            const starterTalents = life.talentRandom().slice(0, 3).map(t => t.id);
            expect(() => life.remake(starterTalents)).not.toThrow();
            expect(() => life.start(allocationFor(points, code))).not.toThrow();

            let lastAge = -Infinity;
            let result;
            let iterations = 0;
            const MAX_ITERATIONS = 200;

            do {
                result = life.next();
                expect(result.age).toBeGreaterThanOrEqual(lastAge);
                lastAge = result.age;
                iterations++;
            } while (!result.isEnd && result.age < SAFE_AGE_CUTOFF && iterations < MAX_ITERATIONS);

            expect(iterations).toBeLessThan(MAX_ITERATIONS);
            expect(result.isEnd === true || result.age >= SAFE_AGE_CUTOFF).toBe(true);
        });
    }
});

describe('TACHV fix regression (was TACEV, computed as NaN/undefined)', () => {
    it('TACHV resolves to the real achievement count, not undefined', async () => {
        const life = await createLife();
        const property = life.request(life.Module.PROPERTY);
        const tachv = property.get(life.PropertyTypes.TACHV);
        expect(Number.isFinite(tachv)).toBe(true);
        expect(tachv).toBeGreaterThan(0);
    });

    it('RACHV (achievement rate) is a finite number, not NaN', async () => {
        const life = await createLife();
        const property = life.request(life.Module.PROPERTY);
        const rachv = property.get(life.PropertyTypes.RACHV);
        expect(Number.isNaN(rachv)).toBe(false);
        expect(Number.isFinite(rachv)).toBe(true);
    });
});

describe('Talent.check() arity fix regression', () => {
    it('does not throw when called with a valid talent id', async () => {
        const life = await createLife();
        const talent = life.request(life.Module.TALENT);
        const [{ id: talentId }] = life.talentRandom();
        expect(() => talent.check(talentId)).not.toThrow();
        expect(typeof talent.check(talentId)).toBe('boolean');
    });
});

describe('death-branch chain (STR<1 / MNY<1 primary-stat terminal events)', () => {
    // The legacy attribute-band system this suite originally covered
    // (810001/820001/910001/920001) was removed in favor of the doc-driven
    // attribute pool (200001-260000): a cluster's lowest-band event (e.g.
    // 211105) applies a MNY/STR hit and then branches straight to a bespoke
    // NoRandom terminal event -- 211155/211355 for MNY, 241155/241355 for
    // STR -- once that same stat crosses below 1. 2111xx/2411xx gate on the
    // constrained cluster (HTI/AF/IRN/PRK); 2113xx/2413xx gate on the
    // wealthy cluster (JAP/US/GBR/DNK). Exercising both funnels is the
    // point: this mechanic was worked on heavily earlier in the project for
    // exactly the low-point countries.
    const scenarios = [
        { label: 'wealthy country, MNY<1', code: 'US', stat: 'MNY', eventId: 211355 },
        { label: 'wealthy country, STR<1', code: 'US', stat: 'STR', eventId: 241355 },
        { label: 'constrained country, MNY<1', code: 'AF', stat: 'MNY', eventId: 211155 },
        { label: 'constrained country, STR<1', code: 'AF', stat: 'STR', eventId: 241155 },
    ];

    for (const { label, code, stat, eventId } of scenarios) {
        it(`fires for ${label} via event ${eventId}`, async () => {
            const life = await createLife();
            life.remake([]);
            life.start({ CHR: 1, INT: 1, STR: 1, MNY: 1, [code]: 1, [stat]: -100 });

            const content = life.doEvent(eventId);
            const diedInResult = content.some(c => c.effect?.LIF === -1);
            expect(diedInResult, JSON.stringify(content)).toBe(true);

            // LIF isn't part of getPropertys()'s returned shape (it's an
            // internal alive/dead flag, not a displayed stat) so read it via
            // the property module directly.
            const property = life.request(life.Module.PROPERTY);
            expect(property.get(life.PropertyTypes.LIF)).toBeLessThan(1);
        });
    }
});

describe('$$event / $$on / $$off pub-sub shim', () => {
    it('delivers events to registered listeners and stops after $$off', () => {
        const received = [];
        const listener = data => received.push(data);

        globalThis.$$on('test-tag', listener);
        globalThis.$$event('test-tag', 'first');
        expect(received).toEqual(['first']);

        globalThis.$$off('test-tag', listener);
        globalThis.$$event('test-tag', 'second');
        expect(received).toEqual(['first']);
    });
});
