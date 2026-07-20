import { describe, it, expect } from 'vitest';
import COUNTRIES from '../functions/countries.js';
import { createLife } from './fixtures.js';

describe('countries data', () => {
    it('has exactly 12 playable countries', () => {
        expect(COUNTRIES.length).toBe(12);
    });

    it('every country has a starting point total in the documented 6-17 range', () => {
        for (const { name, points } of COUNTRIES) {
            expect(points, name).toBeGreaterThanOrEqual(6);
            expect(points, name).toBeLessThanOrEqual(17);
        }
    });

    it('every country key/code pair is unique', () => {
        const keys = COUNTRIES.map(c => c.key);
        const codes = COUNTRIES.map(c => c.code);
        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(codes).size).toBe(codes.length);
    });
});

describe('country property wiring', () => {
    it('Property.TYPES exposes every country key mapped to its condition code', async () => {
        const life = await createLife();
        const property = life.request(life.Module.PROPERTY);
        for (const { key, code } of COUNTRIES) {
            expect(property.TYPES[key], key).toBe(code);
        }
    });

    it('allocating a country code via start() is reflected in propertys for every country', async () => {
        for (const { code, name } of COUNTRIES) {
            const life = await createLife();
            life.remake([]);
            life.start({ CHR: 1, INT: 1, STR: 1, MNY: 1, [code]: 1 });
            expect(life.propertys[code], name).toBe(1);
        }
    });
});
