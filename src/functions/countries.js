// Single source of truth for playable countries.
// `code` is the property/condition-string value (e.g. events.json `include: "AF>0"`);
// `key` is the JS-side name (core.PropertyTypes.AFG). They differ for the original six
// countries because that's the value already baked into every existing event's
// condition string — new countries don't have that constraint, so key === code.
//
// `points` is the property-allocation pool a character starts with (see
// property.js's init()), scaled from each country's real HDI/GDI standing and
// the lived conditions already reflected in its event content (war, political
// repression, etc.) rather than a flat number — starting position, not merit,
// is the whole thesis of this piece.
const COUNTRIES = [
    { key: 'AFG', code: 'AF', name: 'Afghanistan', points: 6 },
    { key: 'CHN', code: 'CH', name: 'China', points: 12 },
    { key: 'EGP', code: 'EGY', name: 'Egypt', points: 11 },
    { key: 'IND', code: 'IND', name: 'India', points: 9 },
    { key: 'JPN', code: 'JAP', name: 'Japan', points: 14 },
    { key: 'USA', code: 'US', name: 'United States', points: 15 },
    { key: 'IRN', code: 'IRN', name: 'Iran', points: 7 },
    { key: 'UKR', code: 'UKR', name: 'Ukraine', points: 10 },
    { key: 'PRK', code: 'PRK', name: 'North Korea', points: 8 },
    { key: 'GBR', code: 'GBR', name: 'United Kingdom', points: 15 },
    { key: 'HTI', code: 'HTI', name: 'Haiti', points: 6 },
    { key: 'DNK', code: 'DNK', name: 'Denmark', points: 17 },
];

export default COUNTRIES;
