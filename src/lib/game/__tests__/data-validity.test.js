import { describe, it, expect } from 'vitest';
import { checkCondition } from '../functions/condition.js';
import { loadJSON } from './fixtures.js';

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
