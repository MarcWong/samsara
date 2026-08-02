import COUNTRIES from './functions/countries.js';

// Country deaths used to be ordinary age-row events gated behind near-zero
// wealth/health. That made most of them unreachable, while increasing their
// raw weights made vulnerable children die far too early. They now serve two
// distinct purposes:
//   1. a small, separately calibrated ambient hazard for external dangers;
//   2. a country-specific replacement for a death that was already going to
//      happen through an attribute-collapse or old-age terminal event.
// Keeping the registry here lets the existing events.json prose remain the
// single source of truth and leaves all direct branch-to-event behaviour intact.

const AMBIENT_BY_CATEGORY = {
    war: [
        102501, 102502, 102801, 102802,
        103802, 103804,
        104501, 104502, 104504, 104505, 104801, 104802, 104803, 104805,
        107505, 107802,
        108803,
        109803,
        110504, 110803,
        111803, 111804,
        112504, 112803,
    ],
    violence: [
        81902, 82901, 82904,
        102503,
        103503, 103801,
        105502,
        106503,
        107503,
        108503,
        109504,
        111504,
        112502,
    ],
    terrorism: [
        102804, 103805, 104804,
        105801, 105803,
        106801, 106804,
        107801, 107803, 107804,
        109804,
        111801,
    ],
    disaster: [
        81904,
        103502, 103505,
        105504, 105505,
        106504,
        107504,
        108504,
        109501,
        110501, 110801, 110505,
        111505,
        112505,
    ],
    accident: [
        82902,
        102803,
        105804,
        106502, 106803,
        108501, 108502, 108801, 108804,
        109503, 109802,
        111502,
    ],
    infrastructure: [
        // Medical-system failures added to the ambient pool: these three
        // poor-track early deaths had no category, so the under-18 layer
        // could never draw them (replacement almost never fires that young).
        107502, 109502, 110502,
        // One early country-specific vulnerability per group ensures that the
        // under-18 target can be calibrated even where war/disaster is absent.
        81901, 82901,
        102501, 102801,
        103501, 103801,
        104501, 104801,
        105501, 105801,
        106501, 106801,
        107501, 107801,
        108501, 108801,
        109501, 109801,
        110501, 110801,
        111501, 111801,
        112501, 112801,
    ],
};

const CATEGORY_WEIGHT = {
    war: 1.3,
    violence: 1.1,
    terrorism: 0.8,
    disaster: 1.2,
    accident: 0.9,
    infrastructure: 1,
};

const AMBIENT_CATEGORY = new Map();
for(const category in AMBIENT_BY_CATEGORY)
    for(const id of AMBIENT_BY_CATEGORY[category])
        // When an event fits two descriptions, retain the first, more specific
        // category; the duplicated early ID is intentional, not double risk.
        if(!AMBIENT_CATEGORY.has(id)) AMBIENT_CATEGORY.set(id, category);

// Aggregate probability of any ambient country death, split by life stage.
// Infant (<5) and child (5-17) are separate tables so the two bands can be
// calibrated independently; values are stage totals, not per-year chances.
const INFANT_AMBIENT_RATE = {
    poor: {
        HTI: .11, AF: .11, PRK: .02, IRN: .02, UKR: .02, EGY: .11,
        IND: .11, US: .02, CH: .004, JAP: .004, GBR: .004, DNK: .004,
    },
    rich: {
        HTI: .01, AF: .01, PRK: .004, IRN: .004, UKR: .004, EGY: .01,
        IND: .01, US: .004, CH: .001, JAP: .001, GBR: .001, DNK: .001,
    },
};
const EARLY_AMBIENT_RATE = {
    poor: {
        HTI: .03, AF: .03, PRK: .07, IRN: .07, UKR: .07, EGY: .03,
        IND: .03, US: .07, CH: .006, JAP: .006, GBR: .006, DNK: .006,
    },
    rich: {
        HTI: .012, AF: .012, PRK: .02, IRN: .02, UKR: .02, EGY: .012,
        IND: .012, US: .02, CH: .002, JAP: .002, GBR: .002, DNK: .002,
    },
};

// Adult ambient risk, split into three life stages so each death band can
// be calibrated independently. Values are stage totals, not per-year odds.
const ADULT_AMBIENT_RATE = {
    poor: {
        HTI: .12, AF: .12, PRK: .03, IRN: .03, UKR: .03, EGY: .12,
        IND: .12, US: .03, CH: .008, JAP: .008, GBR: .008, DNK: .008,
    },
    rich: {
        HTI: .02, AF: .02, PRK: .012, IRN: .012, UKR: .012, EGY: .02,
        IND: .02, US: .012, CH: .004, JAP: .004, GBR: .004, DNK: .004,
    },
};
const MIDLIFE_AMBIENT_RATE = {
    poor: {
        HTI: .05, AF: .05, PRK: .18, IRN: .18, UKR: .18, EGY: .05,
        IND: .05, US: .18, CH: .02, JAP: .02, GBR: .02, DNK: .02,
    },
    rich: {
        HTI: .04, AF: .04, PRK: .06, IRN: .06, UKR: .06, EGY: .04,
        IND: .04, US: .06, CH: .012, JAP: .012, GBR: .012, DNK: .012,
    },
};
const SENIOR_AMBIENT_RATE = {
    poor: {
        HTI: .04, AF: .04, PRK: .04, IRN: .04, UKR: .04, EGY: .04,
        IND: .04, US: .04, CH: .01, JAP: .01, GBR: .01, DNK: .01,
    },
    rich: {
        HTI: .01, AF: .01, PRK: .01, IRN: .01, UKR: .01, EGY: .01,
        IND: .01, US: .01, CH: .004, JAP: .004, GBR: .004, DNK: .004,
    },
};

const ATTRIBUTE_REPLACEMENT_RATE = .4;
const OLD_AGE_REPLACEMENT_RATE = .6;
const OLD_AGE_EVENT_IDS = new Set([10004, 10007, 10008]);

function deathWindow(targetAge) {
    if(targetAge < 18) return 3;
    if(targetAge < 40) return 5;
    if(targetAge < 60) return 7;
    return 10;
}

function isAttributeTerminal(eventId) {
    const id = `${eventId}`;
    return eventId == 10001 || eventId == 10002 || eventId == 10003 || eventId == 200004
        || /^20[1-4]\d{2}2$/.test(id)
        || /^(241|242|244|246)[123]55$/.test(id);
}

class Event {
    constructor(system) {
        this.#system = system;
    }

    #system;
    #events;
    #countryDeaths = [];
    #countryDeathIds = new Set();
    #ambientActiveAges = new Map();
    #displayAgeByInternal = new Map();
    #scheduledByAge = new Map();
    #firstScheduledAge = new Map();
    #deferredNarratives = new Map();
    #dependencyEvents = new Set();
    #quietYears = 0;

    initial({events, age}) {
        this.#events = events;

        const ageByEvent = new Map();
        for(const [internalAge, row] of Object.entries(age)) {
            const displayAge = Number(row.age);
            this.#displayAgeByInternal.set(Number(internalAge), displayAge);
            const scheduled = [];
            for(const raw of row.event || []) {
                const [rawId, rawWeight = 1] = `${raw}`.split('*');
                const id = Number(rawId);
                scheduled.push([id, Number(rawWeight)]);
                if(!ageByEvent.has(id)) ageByEvent.set(id, Number(row.age));
                if(!this.#firstScheduledAge.has(id)) this.#firstScheduledAge.set(id, displayAge);
            }
            this.#scheduledByAge.set(displayAge, scheduled);
        }

        // An event explicitly required by a later event is part of a real
        // narrative spine. Missing it must not silently erase everything that
        // follows, so it receives the same short carry-forward protection as
        // country and LGBTQ story events.
        for(const event of Object.values(events)) {
            const include = event.include || '';
            for(const match of include.matchAll(/EVT\?\[([0-9,]+)\]/g))
                for(const rawId of match[1].split(',')) {
                    const id = Number(rawId);
                    if(id !== Number(event.id)) this.#dependencyEvents.add(id);
                }
        }

        for(const id in events) {
            const event = events[id];
            const rawBranches = event.branch || [];
            const terminal = rawBranches.some(b => Number(`${b}`.split(':')[1]) === 10000);
            const include = event.include || '';
            const country = COUNTRIES.find(({code}) => new RegExp(`(^|[^A-Z])${code}>0`).test(include));
            const socialClass = include.includes('TLR=0') ? 'poor' : include.includes('TLR>0') ? 'rich' : null;
            // 61001-61012: one class-agnostic late-life death per country,
            // available to poor and privileged alike through the old-age
            // replacement route ('any' matches both classes below).
            const anyClassElder = Number(id) >= 61001 && Number(id) <= 61012;

            // 109730 is a US political coda, not one of the five-by-twenty-four
            // national death pool. It remains an ordinary event after its
            // automatic death branch is removed in events.json.
            if(Number(id) !== 109730 && terminal && country && (socialClass || anyClassElder) && ageByEvent.has(Number(id))) {
                const record = {
                    id: Number(id),
                    age: ageByEvent.get(Number(id)),
                    country: country.code,
                    socialClass: socialClass || 'any',
                    category: AMBIENT_CATEGORY.get(Number(id)) || null,
                };
                this.#countryDeaths.push(record);
                this.#countryDeathIds.add(record.id);
            }

            if(!event.branch) continue;
            event.branch = event.branch.map(b=>{
                b = b.split(':');
                b[1] = Number(b[1]);
                return b;
            });
        }

        // Pre-compute how many ages in each life stage actually have an
        // ambient candidate. Converting an aggregate target to an annual
        // hazard over active ages makes the configured percentages real rather
        // than treating JSON weights as if they were percentages.
        for(const {code} of COUNTRIES)
            for(const socialClass of ['poor', 'rich']) {
                const key = `${code}:${socialClass}`;
                const early = new Set();
                const adult = new Set();
                const infant = new Set();
                const midlife = new Set();
                const senior = new Set();
                for(let currentAge = 1; currentAge < 80; currentAge++) {
                    if(this.#ambientCandidates(code, socialClass, currentAge).length == 0) continue;
                    (currentAge < 5 ? infant
                        : currentAge < 18 ? early
                        : currentAge < 40 ? adult
                        : currentAge < 60 ? midlife
                        : senior).add(currentAge);
                }
                this.#ambientActiveAges.set(`${key}:infant`, infant.size);
                this.#ambientActiveAges.set(`${key}:early`, early.size);
                this.#ambientActiveAges.set(`${key}:adult`, adult.size);
                this.#ambientActiveAges.set(`${key}:midlife`, midlife.size);
                this.#ambientActiveAges.set(`${key}:senior`, senior.size);
            }

        if(this.#countryDeaths.length !== 132)
            console.warn('[event] expected 132 country deaths, found', this.#countryDeaths.length);

        return this.count;
    }

    restart() {
        this.#deferredNarratives.clear();
        this.#quietYears = 0;
    }

    get count() {
        return Object.keys(this.#events).length;
    }

    check(eventId) {
        // The old one-age/near-zero-stat lottery is disabled. Country deaths
        // now enter only through calibrated ambient risk or death replacement.
        if(this.#countryDeathIds.has(Number(eventId))) return false;
        const { include, exclude, NoRandom } = this.get(eventId);
        if(NoRandom) return false;
        if(exclude && this.#system.check(exclude)) return false;
        if(include) return this.#system.check(include);
        return true;
    }

    get(eventId) {
        const event = this.#events[eventId];
        if(!event) throw new Error(`[ERROR] No Event[${eventId}]`);
        return this.#system.clone(event);
    }

    information(eventId) {
        const { event: description } = this.get(eventId)
        return { description };
    }

    #property() {
        return this.#system.request(this.#system.Module.PROPERTY);
    }

    #identity() {
        const property = this.#property();
        const country = COUNTRIES.find(({code}) => property.get(code) > 0)?.code;
        return {
            country,
            socialClass: property.get('TLR') > 0 ? 'rich' : 'poor',
        };
    }

    #orientationCompatible(record) {
        const event = this.#events[record.id];
        const include = event.include || '';
        const property = this.#property();
        if(include.includes('&LBTQ=0') && property.get('LBTQ') > 0) return false;

        const disguisedMarriage = include.match(/\(LBTQ=0\|EVT\?\[([0-9]+)\]\)/);
        if(disguisedMarriage && property.get('LBTQ') > 0)
            return property.get('EVT').includes(Number(disguisedMarriage[1]));
        return true;
    }

    #nearAge(record, currentAge) {
        return Math.abs(currentAge - record.age) <= deathWindow(record.age);
    }

    #displayAge(internalAge) {
        return this.#displayAgeByInternal.get(Number(internalAge)) ?? Number(internalAge);
    }

    #isZeroState(eventId) {
        const id = `${eventId}`;
        return isAttributeTerminal(Number(eventId))
            || /^20[1-4]\d{3}$/.test(id)
            || [10001, 10003, 200004].includes(Number(eventId));
    }

    #isLGBTQ(eventId) {
        return (this.#events[eventId]?.include || '').includes('LBTQ>0');
    }

    #isCountryNarrative(eventId) {
        if(Number(eventId) >= 200000) return false;
        const include = this.#events[eventId]?.include || '';
        return COUNTRIES.some(({code}) => new RegExp(`(^|[^A-Z])${code}>0`).test(include));
    }

    #isGlobal(eventId) {
        return /^600\d{2}$/.test(`${eventId}`);
    }

    #isNarrative(eventId) {
        return this.#isLGBTQ(eventId)
            || this.#isCountryNarrative(eventId)
            || this.#dependencyEvents.has(Number(eventId));
    }

    #priority(eventId) {
        if(this.#isZeroState(eventId)) return 500;
        // A country event which unlocks later events (China's compulsory
        // marriage and North Korea's escape spine are the important cases)
        // must survive even when an LGBTQ event shares its year.
        if(this.#dependencyEvents.has(Number(eventId)) && this.#isCountryNarrative(eventId)) return 430;
        if(this.#isLGBTQ(eventId)) return 400;
        if(this.#isCountryNarrative(eventId)) return 350;
        if(Number(eventId) >= 200000) return 250;
        if(this.#isGlobal(eventId)) return 100;
        return 200;
    }

    #eligibleWeighted(rawEvents) {
        return (rawEvents || [])
            .map(raw => Array.isArray(raw)
                ? [Number(raw[0]), Number(raw[1] ?? 1)]
                : `${raw}`.split('*').map(Number))
            .map(([id, weight = 1]) => ({id, weight}))
            .filter(({id}) => this.check(id));
    }

    hasEligibleZeroState(rawEvents) {
        return this.#eligibleWeighted(rawEvents).some(({id}) => this.#isZeroState(id));
    }

    #rememberMissedNarratives(candidates, selectedId, currentAge) {
        for(const {id} of candidates) {
            if(id === selectedId || !this.#isNarrative(id)) continue;
            if(this.#deferredNarratives.has(id)) continue;
            this.#deferredNarratives.set(id, {
                id,
                firstMissedAge: currentAge,
                expires: currentAge + 3,
            });
        }
    }

    #pendingCandidates(currentAge) {
        const candidates = [];
        for(const [id, pending] of this.#deferredNarratives) {
            if(currentAge > pending.expires || !this.check(id)) {
                this.#deferredNarratives.delete(id);
                continue;
            }
            if(currentAge <= pending.firstMissedAge) continue;
            candidates.push({
                id,
                weight: 1000000,
                pending: true,
                firstMissedAge: pending.firstMissedAge,
            });
        }
        return candidates;
    }

    #rescueCandidates(currentAge) {
        // Rescue only events whose authored year has already passed. Nothing
        // is pulled forward merely to fill a quiet year. Three years is the
        // normal narrative tolerance; speculative global events may drift by
        // five years, as their dates are intentionally approximate.
        const candidates = [];
        const occurred = new Set(this.#property().get('EVT'));
        for(let distance = 1; distance <= 5; distance++) {
            for(const candidate of this.#eligibleWeighted(this.#scheduledByAge.get(currentAge - distance))) {
                if(distance > 3 && !this.#isGlobal(candidate.id)) continue;
                if(this.#countryDeathIds.has(candidate.id)) continue;
                if(occurred.has(candidate.id)) continue;
                candidates.push({...candidate, rescue: true, distance});
            }
        }
        // The explicitly speculative world events are the sole exception to
        // the no-look-ahead rule: their authored dates are approximate by
        // design, and the installation uses them as global breathing points.
        // They may arrive up to five years early, but country, LGBTQ and
        // attribute narratives never do.
        for(let distance = 1; distance <= 5; distance++)
            for(const candidate of this.#eligibleWeighted(this.#scheduledByAge.get(currentAge + distance)))
                if(this.#isGlobal(candidate.id) && !occurred.has(candidate.id))
                    candidates.push({...candidate, rescue: true, distance, earlyGlobal: true});
        return candidates;
    }

    select(currentAge, scheduledEvents) {
        currentAge = this.#displayAge(currentAge);
        const occurred = new Set(this.#property().get('EVT'));
        let current = this.#eligibleWeighted(scheduledEvents)
            .filter(({id}) => !this.#isNarrative(id) || !occurred.has(id));
        // Death-tier shaping: in the mid tier (PRK/UKR/IRN/US) attribute
        // band events lose half their draws, in the small tier
        // (CH/GBR/DNK/JAP) three quarters -- the year falls through to
        // country/global events or stays quiet, so stats bleed slower and
        // those lives drift toward their intended later death bands. One
        // roll per year, all-or-nothing, so the band pool is never half
        // present. Zero-state (priority 500) is untouched: once a stat is
        // below zero the cascade proceeds regardless of tier.
        const tierSkip = { PRK: .5, UKR: .5, IRN: .65, US: .5, CH: .75, GBR: .75, DNK: .75, JAP: .75 };
        // Age 0 is exempt: the birth events (211101-216301) share the
        // attribute-band id range but are structural -- every life must open
        // on the one matching its wealth tier, and China's birth blessing in
        // life.js appends to it. Skipping them left the log starting at 2.
        const skip = currentAge === 0 ? 0 : (tierSkip[this.#identity().country] ?? 0);
        if(skip && Math.random() < skip)
            current = current.filter(({id}) =>
                this.#isZeroState(id) || !(Number(id) >= 200000 && Number(id) < 600000)
            );
        const pending = this.#pendingCandidates(currentAge);
        let candidates = [...pending, ...current];

        // Two genuinely quiet years are allowed. On the third, retry only a
        // compatible event from the recent past; this fills holes without
        // reversing causality or manufacturing generic filler prose.
        if(candidates.length === 0 && this.#quietYears >= 2)
            candidates = this.#rescueCandidates(currentAge);

        if(candidates.length === 0) {
            this.#rememberMissedNarratives(current, null, currentAge);
            this.#quietYears++;
            return null;
        }

        let highest = Math.max(...candidates.map(candidate =>
            this.#priority(candidate.id) + (candidate.pending ? 10 : 0)
        ));
        candidates = candidates.filter(candidate =>
            this.#priority(candidate.id) + (candidate.pending ? 10 : 0) === highest
        );

        // When two same-tier story events first overlap, keep the one authored
        // for the earlier life stage in front. This prevents a later chapter
        // from winning merely because both happen to carry the same weight.
        if(candidates.some(({id}) => this.#isNarrative(id))) {
            const earliest = Math.min(...candidates.map(({id}) =>
                this.#firstScheduledAge.get(id) ?? currentAge
            ));
            candidates = candidates.filter(({id}) =>
                (this.#firstScheduledAge.get(id) ?? currentAge) === earliest
            );
        }

        // Pending narrative events are deliberately almost certain. If two
        // have queued, resolve the oldest first so their own chronology stays
        // intact. Other same-tier events retain their authored weights.
        const pendingAtTop = candidates.filter(candidate => candidate.pending);
        let selectedId;
        if(pendingAtTop.length) {
            pendingAtTop.sort((a, b) => a.firstMissedAge - b.firstMissedAge);
            selectedId = pendingAtTop[0].id;
        } else {
            const total = candidates.reduce((sum, {weight}) => sum + weight, 0);
            if(total < 1 && Math.random() >= total) {
                this.#rememberMissedNarratives(current, null, currentAge);
                this.#quietYears++;
                return null;
            }
            // Use the authored weights inside the winning priority tier.
            let random = Math.random() * total;
            for(const {id, weight} of candidates)
                if((random -= weight) < 0) {
                    selectedId = id;
                    break;
                }
        }

        this.#rememberMissedNarratives(current, selectedId, currentAge);
        this.#deferredNarratives.delete(selectedId);
        this.#quietYears = 0;
        return selectedId;
    }

    noteExternalEvent() {
        this.#quietYears = 0;
    }

    #ambientCandidates(country, socialClass, currentAge) {
        return this.#countryDeaths.filter(record =>
            record.country === country
            && (record.socialClass === socialClass || record.socialClass === 'any')
            && record.category
            && this.#nearAge(record, currentAge)
            && this.#orientationCompatible(record)
        );
    }

    #weightedCandidate(candidates) {
        if(candidates.length == 0) return null;
        let total = 0;
        for(const candidate of candidates) total += CATEGORY_WEIGHT[candidate.category] || 1;
        let random = Math.random() * total;
        for(const candidate of candidates)
            if((random -= CATEGORY_WEIGHT[candidate.category] || 1) < 0)
                return candidate.id;
        return candidates[candidates.length - 1].id;
    }

    randomAmbient(currentAge) {
        currentAge = this.#displayAge(currentAge);
        if(currentAge < 1 || currentAge >= 80) return null;
        const {country, socialClass} = this.#identity();
        if(!country) return null;
        const candidates = this.#ambientCandidates(country, socialClass, currentAge);
        if(candidates.length == 0) return null;

        const stage = currentAge < 5 ? 'infant'
            : currentAge < 18 ? 'early'
            : currentAge < 40 ? 'adult'
            : currentAge < 60 ? 'midlife'
            : 'senior';
        const rates = {
            infant: INFANT_AMBIENT_RATE,
            early: EARLY_AMBIENT_RATE,
            adult: ADULT_AMBIENT_RATE,
            midlife: MIDLIFE_AMBIENT_RATE,
            senior: SENIOR_AMBIENT_RATE,
        }[stage];
        const aggregateRate = rates[socialClass]?.[country] || 0;
        const activeAges = this.#ambientActiveAges.get(`${country}:${socialClass}:${stage}`) || 1;
        const annualHazard = 1 - Math.pow(1 - aggregateRate, 1 / activeAges);
        if(Math.random() >= annualHazard) return null;
        return this.#weightedCandidate(candidates);
    }

    #replacementCandidate(eventId) {
        const property = this.#property();
        const currentAge = this.#displayAge(property.get('AGE'));
        const {country, socialClass} = this.#identity();
        if(!country) return null;

        let replacementRate = 0;
        let allowAmbient = false;
        if(isAttributeTerminal(eventId)) {
            replacementRate = ATTRIBUTE_REPLACEMENT_RATE;
        } else if(OLD_AGE_EVENT_IDS.has(Number(eventId)) && currentAge < 102) {
            replacementRate = OLD_AGE_REPLACEMENT_RATE;
            allowAmbient = true;
        }
        if(replacementRate == 0 || Math.random() >= replacementRate) return null;

        // From 78 on, the national share of the 60/40 old-age split comes
        // straight from the per-country late-life set (61001-61012, the
        // class-agnostic 'any' records) with no age-window check: several
        // countries' classed elder causes anchor before 78, which used to
        // leave late deaths with no national candidate at all. Below 78 the
        // window-based selection continues unchanged, and 102 stays the
        // forced universal death upstream.
        if(allowAmbient && currentAge >= 78) {
            const lateSet = this.#countryDeaths.filter(record =>
                record.country === country
                && record.socialClass === 'any'
                && this.#orientationCompatible(record)
            );
            if(lateSet.length)
                return lateSet[Math.floor(Math.random() * lateSet.length)].id;
        }

        let candidates = this.#countryDeaths.filter(record =>
            record.country === country
            && (record.socialClass === socialClass || record.socialClass === 'any')
            && (allowAmbient || !record.category)
            && this.#nearAge(record, currentAge)
            && this.#orientationCompatible(record)
        );

        // Some country/class sets consist almost entirely of external hazards
        // (Ukraine's privileged pool is the clearest case). Prefer a medical
        // or social consequence for attribute collapse, but do not leave that
        // group with no national replacement at all when only an external
        // cause exists near the same life stage.
        if(candidates.length == 0 && isAttributeTerminal(eventId))
            candidates = this.#countryDeaths.filter(record =>
                record.country === country
                && (record.socialClass === socialClass || record.socialClass === 'any')
                && this.#nearAge(record, currentAge)
                && this.#orientationCompatible(record)
            );

        // A woman who outlives her country's authored life expectancy should
        // not lose nationality at the moment of death. If no event lies within
        // the normal age window, reuse only that group's latest cause — the
        // fifth entries were written as stroke, cancer, heat, war recurrence
        // or longevity failure and remain coherent at an exceptional old age.
        if(candidates.length == 0 && OLD_AGE_EVENT_IDS.has(Number(eventId))) {
            const group = this.#countryDeaths
                .filter(record =>
                    record.country === country
                    && (record.socialClass === socialClass || record.socialClass === 'any')
                    && this.#orientationCompatible(record)
                )
                .sort((a, b) => b.age - a.age);
            if(group.length) candidates = group.filter(record => record.age === group[0].age);
        }
        if(candidates.length == 0) return null;

        // Replacement events are already inside a fixed 40/60 route, so each
        // matching national cause is equally likely rather than being charged
        // a second ambient-risk multiplier.
        return candidates[Math.floor(Math.random() * candidates.length)].id;
    }

    do(eventId) {
        const { effect, branch, event: description, postEvent, grade } = this.get(eventId);
        if(branch)
            for(const [cond, next] of branch)
                if(this.#system.check(cond)) {
                    const replacement = next === 10000 ? this.#replacementCandidate(eventId) : null;
                    return {
                        effect,
                        next: replacement || next,
                        description,
                        grade,
                        suppressDescription: Boolean(replacement),
                    };
                }
        return { effect, postEvent, description, grade };
    }

}

export default Event;
