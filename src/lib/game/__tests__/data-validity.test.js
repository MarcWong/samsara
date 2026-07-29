import { describe, it, expect } from 'vitest';
import { checkCondition } from '../functions/condition.js';
import { createLife, loadJSON } from './fixtures.js';

// Any prop the DSL asks for resolves to a harmless default — this suite only
// cares that every condition string shipped in the real data *parses and
// evaluates* without throwing (unbalanced parens, malformed `[...]` lists,
// etc.), not what it evaluates to for any particular character.
const fakeProperty = { get: () => 0 };

describe('events.json condition strings', () => {
    const events = loadJSON('events');

    it('every include/exclude condition parses and evaluates without throwing', () => {
        let checked = 0;
        for (const id in events) {
            const { include, exclude } = events[id];
            if (include) {
                expect(() => checkCondition(fakeProperty, include), `event ${id} include`).not.toThrow();
                checked++;
            }
            if (exclude) {
                expect(() => checkCondition(fakeProperty, exclude), `event ${id} exclude`).not.toThrow();
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(0);
    });

    it('every branch condition parses and evaluates without throwing', () => {
        let checked = 0;
        for (const id in events) {
            const { branch } = events[id];
            if (!branch) continue;
            for (const b of branch) {
                const [cond] = b.split(':');
                expect(() => checkCondition(fakeProperty, cond), `event ${id} branch`).not.toThrow();
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(0);
    });
});

describe('talents.json condition strings', () => {
    const talents = loadJSON('talents');

    it('every talent condition parses and evaluates without throwing', () => {
        let checked = 0;
        for (const id in talents) {
            const { condition } = talents[id];
            if (!condition) continue;
            expect(() => checkCondition(fakeProperty, condition), `talent ${id}`).not.toThrow();
            checked++;
        }
        expect(checked).toBeGreaterThan(0);
    });
});

describe('age.json rows', () => {
    const age = loadJSON('age');

    // Property.initial() rebuilds every row to normalize `event`/`talent` into
    // arrays. It used to write `age[a] = {event, talent}`, which silently threw
    // away the row's own `age` field -- the number the player is meant to see
    // for that internal index. getAgeData(x).age then read undefined and
    // Trajectory's displayAge() fell through to its `?? internal` fallback, so
    // the log showed the raw 0-102 index instead. The index is not contiguous
    // (age.json omits 23, 26-30, 42, 73-77, 81-88, 90-96, 98-101), so the
    // rendered ages visibly jumped 22->24->25->31 and 80->89->97.
    it('every row carries an `age` field for display', () => {
        for (const key in age) {
            expect(age[key].age, `age.json row ${key}`).toBeDefined();
        }
    });

    it('the `age` field survives Property.initial()', async () => {
        const life = await createLife();
        const property = life.request(life.Module.PROPERTY);
        for (const key in age) {
            const row = property.getAgeData(Number(key));
            expect(row, `getAgeData(${key})`).toBeTruthy();
            expect(Number(row.age), `getAgeData(${key}).age`).toBe(Number(age[key].age));
        }
    });
});

describe('events.json referential integrity', () => {
    const events = loadJSON('events');

    // Deleting an event without also deleting the branches that point at it
    // leaves a dangling target that only throws when a live run happens to
    // take that branch -- Event.get() raises "[ERROR] No Event[id]" and the
    // Trajectory screen dies mid-run. This caught the 2111xx/2211xx receipts
    // after the wealth/appearance instant-death paths were removed.
    it('every branch target refers to an event that exists', () => {
        const missing = [];
        for (const id in events) {
            for (const b of events[id].branch ?? []) {
                const target = `${b}`.split(':').pop().trim();
                if (!(target in events)) missing.push(`${id} -> ${target}`);
            }
        }
        expect(missing, missing.join(', ')).toEqual([]);
    });
});
