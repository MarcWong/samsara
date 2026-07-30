import { describe, it, expect } from 'vitest';
import '../events.js';
import COUNTRIES from '../functions/countries.js';
import Life from '../life.js';
import REAL_CONFIG from '../config.js';
import { createLife, i18nLoad } from './fixtures.js';

// age.json only has entries for ages 0-102 (see property.js's ageNext()).
// Once AGE reaches 102 the *next* call steps to 103, where the while-loop's
// own `age < 103` guard exits immediately without finding data. getAgeData
// then returns undefined; ageNext() used to destructure that and throw, which
// froze the Trajectory screen mid-run. It now returns null and Life.next()
// ends the life — so the fuzz loop can run all the way to the boundary, and
// the exhaustion path has its own regression test below.
const SAFE_AGE_CUTOFF = 103;

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

// Regression: a life still alive when age.json runs out used to throw
// "Cannot destructure property 'event' of this.getAgeData(...)" straight out
// of next(). Nothing above catches it, so Trajectory's auto-advance chain
// died and the screen froze with no way forward. The trigger was data (the
// terminal-age hospital-bill events branch to a NON-fatal "give up on
// treatment" first), but the freeze was the engine's, so the guard is tested
// here independently of whether any current data can still reach it.
describe('age-table exhaustion does not throw', () => {
    // Truncating the table is the reliable way to reach the boundary: with
    // the shipped data every path to 103 is now closed, so a normal
    // playthrough can no longer get there to exercise this.
    async function lifeWithShortTable(lastAge) {
        const life = new Life();
        life.config(REAL_CONFIG);
        await life.initial(dataSet => {
            const data = i18nLoad(dataSet);
            if (dataSet !== 'age') return data;
            for (const age of Object.keys(data)) if (Number(age) > lastAge) delete data[age];
            return data;
        });
        return life;
    }

    it('ends the life instead of throwing when the table runs out', async () => {
        const life = await lifeWithShortTable(12);
        life.remake([]);
        life.start(allocationFor(20, 'DNK'));

        let result;
        let iterations = 0;
        do {
            expect(() => (result = life.next())).not.toThrow();
            iterations++;
        } while (!result.isEnd && iterations < 60);

        expect(result.isEnd).toBe(true);
        expect(iterations).toBeLessThan(60);
    });

    it('stays ended once the table has run out', async () => {
        const life = await lifeWithShortTable(12);
        life.remake([]);
        life.start(allocationFor(20, 'DNK'));
        for (let i = 0; i < 40 && !life.next().isEnd; i++) { /* run to the end */ }
        // A caller that keeps going (Trajectory reads isEnd from the result,
        // not from the property) must not be able to revive it or throw.
        for (let i = 0; i < 5; i++) expect(life.next().isEnd).toBe(true);
    });
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

describe('death-branch chain (STR<1 primary-stat terminal events)', () => {
    // The legacy attribute-band system this suite originally covered
    // (810001/820001/910001/920001) was removed in favor of the doc-driven
    // attribute pool (200001-260000): a cluster's lowest-band event (e.g.
    // 241105) applies a STR hit and then branches straight to a bespoke
    // NoRandom terminal event -- 241155/241355 -- once STR crosses below 1.
    // 2411xx gates on the constrained cluster (HTI/AF/IRN/PRK); 2413xx on
    // the wealthy cluster (JAP/US/GBR/DNK). Exercising both funnels is the
    // point: this mechanic was worked on heavily earlier in the project for
    // exactly the low-point countries.
    //
    // Health is the only stat left with instant-death receipts. The wealth
    // and appearance equivalents (2111xx/2113xx, 2211xx/2213xx) were deleted
    // along with every branch pointing at them, so W=0 and A=0 can only run
    // through the three-step 20{1..4}{cc}{s} cascade, which ends by branching
    // into 10000 rather than by carrying LIF itself.
    const scenarios = [
        { label: 'wealthy country, STR<1', code: 'US', stat: 'STR', eventId: 241355 },
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

describe('LBTQ condition alias regression', () => {
    // Conditions in events.json spell orientation "LBTQ" while the storage
    // key (and the key the allocation screen writes) is TYPES.LBTQ ===
    // "LGBTQ". property.get() used to miss every case for the bare "LBTQ"
    // string and fall through to `return 0`, which made LBTQ>0 false and
    // LBTQ=0 true for every life -- the queer storyline was unreachable.
    it('LBTQ>0 / LBTQ=0 track the orientation the UI actually sets', async () => {
        const life = await createLife();
        const check = life.function(life.Function.CONDITION).checkCondition;
        const property = life.request(life.Module.PROPERTY);

        life.remake([]);
        life.start({ US: 1, [life.PropertyTypes.LBTQ]: 1, CHR: 1, INT: 1, STR: 1, MNY: 1, SPR: 1 });
        expect(check(property, 'LBTQ>0')).toBe(true);
        expect(check(property, 'LBTQ=0')).toBe(false);

        life.remake([]);
        life.start({ US: 1, [life.PropertyTypes.LBTQ]: 0, CHR: 1, INT: 1, STR: 1, MNY: 1, SPR: 1 });
        expect(check(property, 'LBTQ>0')).toBe(false);
        expect(check(property, 'LBTQ=0')).toBe(true);
    });
});
