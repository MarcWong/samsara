import { describe, it, expect } from 'vitest';
import { checkCondition, extractMaxTriggers } from '../functions/condition.js';

function fakeProperty(data) {
    return { get: prop => data[prop] };
}

describe('checkCondition operators', () => {
    it('> compares numbers', () => {
        expect(checkCondition(fakeProperty({ MNY: 5 }), 'MNY>4')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 4 }), 'MNY>4')).toBe(false);
    });

    it('< compares numbers', () => {
        expect(checkCondition(fakeProperty({ MNY: 3 }), 'MNY<4')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 4 }), 'MNY<4')).toBe(false);
    });

    it('>= compares numbers inclusively', () => {
        expect(checkCondition(fakeProperty({ MNY: 4 }), 'MNY>=4')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 3 }), 'MNY>=4')).toBe(false);
    });

    it('<= compares numbers inclusively', () => {
        expect(checkCondition(fakeProperty({ MNY: 4 }), 'MNY<=4')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 5 }), 'MNY<=4')).toBe(false);
    });

    it('= matches scalars and membership in arrays', () => {
        expect(checkCondition(fakeProperty({ AGE: 22 }), 'AGE=22')).toBe(true);
        expect(checkCondition(fakeProperty({ AGE: 21 }), 'AGE=22')).toBe(false);
        expect(checkCondition(fakeProperty({ EVT: [1, 2, 3] }), 'EVT=2')).toBe(true);
        expect(checkCondition(fakeProperty({ EVT: [1, 2, 3] }), 'EVT=5')).toBe(false);
    });

    it('!= negates scalars and membership in arrays', () => {
        expect(checkCondition(fakeProperty({ AGE: 22 }), 'AGE!=21')).toBe(true);
        expect(checkCondition(fakeProperty({ AGE: 21 }), 'AGE!=21')).toBe(false);
        expect(checkCondition(fakeProperty({ EVT: [1, 2, 3] }), 'EVT!=5')).toBe(true);
        expect(checkCondition(fakeProperty({ EVT: [1, 2, 3] }), 'EVT!=2')).toBe(false);
    });

    it('? checks whether the prop value is inside the condition list', () => {
        expect(checkCondition(fakeProperty({ AGE: 22 }), 'AGE?[22]')).toBe(true);
        expect(checkCondition(fakeProperty({ AGE: 23 }), 'AGE?[22]')).toBe(false);
    });

    it('! checks whether the prop value is outside the condition list', () => {
        expect(checkCondition(fakeProperty({ AGE: 23 }), 'AGE![22]')).toBe(true);
        expect(checkCondition(fakeProperty({ AGE: 22 }), 'AGE![22]')).toBe(false);
    });

    it('& (AND) requires both sides', () => {
        expect(checkCondition(fakeProperty({ MNY: 5, US: 1 }), 'MNY>4&US>0')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 5, US: 0 }), 'MNY>4&US>0')).toBe(false);
        expect(checkCondition(fakeProperty({ MNY: 0, US: 1 }), 'MNY>4&US>0')).toBe(false);
    });

    it('| (OR) requires either side', () => {
        expect(checkCondition(fakeProperty({ MNY: 5, CH: 0 }), 'MNY>4|CH>0')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 0, CH: 1 }), 'MNY>4|CH>0')).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 0, CH: 0 }), 'MNY>4|CH>0')).toBe(false);
    });

    it('parens group precedence correctly, matching real event-data shapes', () => {
        // Real condition string used in events.json.
        const cond = 'MNY>4&(US>0|CH>0)';
        expect(checkCondition(fakeProperty({ MNY: 5, US: 1, CH: 0 }), cond)).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 5, US: 0, CH: 1 }), cond)).toBe(true);
        expect(checkCondition(fakeProperty({ MNY: 5, US: 0, CH: 0 }), cond)).toBe(false);
        expect(checkCondition(fakeProperty({ MNY: 4, US: 1, CH: 1 }), cond)).toBe(false);
    });

    it('empty condition string is vacuously true', () => {
        expect(checkCondition(fakeProperty({}), '')).toBe(true);
    });
});

describe('extractMaxTriggers', () => {
    it('returns 1 for conditions with no AGE?[...] clause', () => {
        expect(extractMaxTriggers('MNY>4')).toBe(1);
        expect(extractMaxTriggers('MNY>4&(US>0|CH>0)')).toBe(1);
    });

    it('counts entries in an AGE?[...] list', () => {
        expect(extractMaxTriggers('AGE?[22]')).toBe(1);
        expect(extractMaxTriggers('AGE?[10,20,30]')).toBe(3);
    });
});
