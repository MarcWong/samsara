// Single source of truth for playable countries.
// `code` is the property/condition-string value (e.g. events.json `include: "AF>0"`);
// `key` is the JS-side name (core.PropertyTypes.AFG). They differ for the original six
// countries because that's the value already baked into every existing event's
// condition string — new countries don't have that constraint, so key === code.
const COUNTRIES = [
    { key: 'AFG', code: 'AF', name: 'Afghanistan' },
    { key: 'CHN', code: 'CH', name: 'China' },
    { key: 'EGP', code: 'EGY', name: 'Egypt' },
    { key: 'IND', code: 'IND', name: 'India' },
    { key: 'JPN', code: 'JAP', name: 'Japan' },
    { key: 'USA', code: 'US', name: 'United States' },
    { key: 'IRN', code: 'IRN', name: 'Iran' },
    { key: 'UKR', code: 'UKR', name: 'Ukraine' },
    { key: 'PRK', code: 'PRK', name: 'North Korea' },
    { key: 'GBR', code: 'GBR', name: 'United Kingdom' },
    { key: 'CUB', code: 'CUB', name: 'Cuba' },
    { key: 'DNK', code: 'DNK', name: 'Denmark' },
];

export default COUNTRIES;
