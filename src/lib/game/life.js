import * as util from './functions/util.js';
import * as fCondition from './functions/condition.js';

import './events.js';

import Property from './property.js';
import Event from './event.js';
import Talent from './talent.js';
import Achievement from './achievement.js';
import Character from './character.js';

const CHINA_BIRTH_BLESSING = 'Your mother consulted an AI fortune teller to chart your destiny, then obtained a "No-Trouble" pendant for you, hoping it will keep your whole life safe and sound.';

class Life {
    constructor() {
        this.#property = new Property(this);
        this.#event = new Event(this);
        this.#talent = new Talent(this);
        this.#achievement = new Achievement(this);
        this.#character = new Character(this);
    }

    Module = {
        PROPERTY: 'PROPERTY',
        TALENT: 'TALENT',
        EVENT: 'EVENT',
        ACHIEVEMENT: 'ACHIEVEMENT',
        CHARACTER: 'CHARACTER',
    }

    Function = {
        CONDITION: 'CONDITION',
        UTIL: 'UTIL',
    }

    #property;
    #event;
    #talent;
    #achievement;
    #character;
    #triggerTalents;
    #defaultPropertyPoints;
    #talentSelectLimit;
    #propertyAllocateLimit;
    #defaultPropertys;
    #specialThanks;
    #initialData;

    async initial(i18nLoad) {
        const [age, talents, events, achievements, characters] = await Promise.all([
            i18nLoad('age'),
            i18nLoad('talents'),
            i18nLoad('events'),
            i18nLoad('achievement'),
            i18nLoad('character'),
        ]);
        this.#specialThanks = [];

        const total = {
            [this.PropertyTypes.TACHV]: this.#achievement.initial({achievements}),
            [this.PropertyTypes.TEVT]: this.#event.initial({events, age}),
            [this.PropertyTypes.TTLT]: this.#talent.initial({talents}),
        };
        this.#property.initial({age, total});
        this.#character.initial({characters});
    }

    config({
        defaultPropertyPoints = 20, // default number of points for a property
        talentSelectLimit = 3, // max number of talents that can be selected
        propertyAllocateLimit = [0, 10], // scoop of properties that can be allocated
        defaultPropertys = {}, // default propertys
        talentConfig, // config for talent
        propertyConfig, // config for property
        characterConfig, // config for character
    } = {}) {
        this.#defaultPropertyPoints = defaultPropertyPoints;
        this.#talentSelectLimit = talentSelectLimit;
        this.#propertyAllocateLimit = propertyAllocateLimit;
        this.#defaultPropertys = defaultPropertys;
        this.#talent.config(talentConfig);
        this.#property.config(propertyConfig);
        this.#character.config(characterConfig);
    }

    request(module) {
        switch (module) {
            case this.Module.ACHIEVEMENT: return this.#achievement;
            case this.Module.CHARACTER: return this.#character;
            case this.Module.EVENT: return this.#event;
            case this.Module.PROPERTY: return this.#property;
            case this.Module.TALENT: return this.#talent;
            default: return null;
        }
    }

    function(type) {
        switch (type) {
            case this.Function.CONDITION: return fCondition;
            case this.Function.UTIL: return util;
        }
    }

    check(condition) {
        return fCondition.checkCondition(this.#property,condition);
    }

    clone(...args) {
        return util.clone(...args);
    }

    remake(talents) {
        this.#initialData = util.clone(this.#defaultPropertys);
        this.#initialData.TLT = util.clone(talents);
        this.#triggerTalents = {};
        return this.talentReplace(this.#initialData.TLT);
    }

    start(allocation) {
        for(const key in allocation) {
            this.#initialData[key] = util.clone(allocation[key]);
        }
        this.#property.restart(this.#initialData);
        this.#event.restart();
        this.doTalent()
        this.#property.restartLastStep();
        this.#achievement.achieve(this.AchievementOpportunity.START);
    }

    getPropertyPoints(basePoints = this.#defaultPropertyPoints) {
        return basePoints + this.#talent.allocationAddition(this.#initialData.TLT);
    }

    getTalentCurrentTriggerCount(talentId) {
        return this.#triggerTalents[talentId] || 0;
    }

    next() {
        if (this.#property.isEnd())
            return { age: this.#property.AGE, content: {}, isEnd: this.#property.isEnd()};

        const step = this.#property.ageNext();
        // age.json's last row is 102, and every path that should end a life
        // before then is data (a fatal event, or a branch into 10000). When
        // that data lets someone through -- as the terminal-age hospital-bill
        // events did, whose first branch is the non-fatal "give up on
        // treatment" -- ageNext() runs off the end of the table. It used to
        // throw from here, and nothing above catches it: Trajectory's
        // onNext() died mid-run, taking the auto-advance chain with it, and
        // the screen simply froze with no way forward. Ending the life is the
        // only recoverable answer, and it keeps a data gap from ever being
        // able to lock the UI again.
        if (!step) {
            console.warn(
                '[life] age table exhausted at',
                this.#property.get(this.PropertyTypes.AGE),
                '-- ending life (an event that should have been fatal was not)',
            );
            this.#property.set(this.PropertyTypes.LIF, 0);
            return { age: this.#property.get(this.PropertyTypes.AGE), content: [], isEnd: true };
        }
        const {age, event, talent} = step;

        const talentContent = this.doTalent(talent);
        // Ambient country deaths have a calibrated absolute hazard rather than
        // pretending an age-row weight is a percentage. They replace this
        // year's ordinary draw when they occur, preserving the one-event-per-
        // age rhythm of the game.
        // Attribute collapse is already a terminal state and has the highest
        // narrative priority. Do not let the tiny ambient-hazard roll replace
        // its cause of death; the zero-state branch itself still performs the
        // established 40% national / 60% universal death replacement.
        const ambientEvent = this.#event.hasEligibleZeroState(event)
            ? null
            : this.#event.randomAmbient(age);
        if(ambientEvent) this.#event.noteExternalEvent();
        const selectedEvent = ambientEvent ?? this.#event.select(age, event);
        // A year can have a talent fire with no event to show alongside it:
        // several lucky charms trigger at ages age.json schedules nothing for
        // (Queen's gambit at 8, Rape at 27, Job opportunity at 33, Airplane
        // Crash at 35), and any year's events can also all fail their own
        // include checks. This used to return early with content:{}, which
        // threw the talent's content away after doTalent() had already
        // applied its effect and counted the trigger -- so the charm silently
        // changed a stat and appeared on the Summary while the log never
        // mentioned it. Worst case it killed without a word: Airplane Crash
        // is LIF -1 at exactly such an age, ending the run with no text at
        // all. Falling through with an empty event list keeps the talent's
        // own line; a year where nothing at all happened still yields [],
        // which callers already read as "no content this tick".
        const eventContent = selectedEvent ? this.doEvent(selectedEvent) : [];

        const content = [talentContent, eventContent].flat();
        // a fatal talent (e.g. the "Airplane Crash" lucky charm) is otherwise
        // just whatever happened to be first in the array — talents are always
        // built before the year's event. Death should read as the last word for
        // that year, not get buried ahead of an unrelated event landing the same
        // age, so any content whose effect ends life is sorted to the end.
        const isFatal = c => (c.effect?.LIF ?? 0) < 0;
        content.sort((a, b) => isFatal(a) - isFatal(b));
        // isEnd is read fresh here (not cached before doEvent()) — doEvent()
        // is what actually applies this turn's effect, so a stat that drops
        // fatal only on this turn's own event must still be reflected in the
        // isEnd this call returns. A caller trusting a stale isEnd (as the
        // original LayaAir Trajectory screen's onNext() does) would otherwise
        // call next() one extra time after death and hit the isEnd() early
        // return above, whose `this.#property.AGE` has never been a real
        // field (only get(TYPES.AGE) is) — producing an undefined age.
        return { age, content, isEnd: this.#property.isEnd() };
    }

    talentReplace(talents) {
        const result = this.#talent.replace(talents);
        const contents = [];
        for(const id in result) {
            talents.push(result[id]);
            const source = this.#talent.get(id);
            const target = this.#talent.get(result[id]);
            contents.push({
                type: 'talentReplace',
                source, target
            });
        }
        return contents;
    }

    doTalent(talents) {
        if(talents) this.#property.change(this.PropertyTypes.TLT, talents);
        talents = this.#property.get(this.PropertyTypes.TLT)
            .filter(talentId => this.getTalentCurrentTriggerCount(talentId) < this.#talent.get(talentId).max_triggers);

        const contents = [];
        for(const talentId of talents) {
            const result = this.#talent.do(talentId);
            if(!result) continue;
            this.#triggerTalents[talentId] = this.getTalentCurrentTriggerCount(talentId) + 1;
            const { effect, name, description, grade } = result;
            contents.push({
                type: this.PropertyTypes.TLT,
                name,
                grade,
                description,
                effect
            })
            if(!effect) continue;
            this.#property.effect(effect);
        }
        return contents;
    }

    doEvent(eventId, isRootEvent = true) {
        let { effect, next, description, postEvent, grade, suppressDescription } = this.#event.do(eventId);

        // Age zero draws from shared wealth-tier events rather than a separate
        // China row. Append the blessing at render time so every Chinese life
        // receives it without leaking the sentence into India, Ukraine or
        // Egypt, which share the same underlying birth-event IDs. Three older
        // descriptions contain a similar sentence, but the requested exact
        // wording is still appended because those originals must remain intact.
        const alreadyHasExactBlessing = description?.includes(CHINA_BIRTH_BLESSING);
        if(
            isRootEvent
            && this.#property.get(this.PropertyTypes.AGE) === 0
            && this.#property.get(this.PropertyTypes.CHN) > 0
            && !alreadyHasExactBlessing
        ) description = `${description} ${CHINA_BIRTH_BLESSING}`;

        this.#property.change(this.PropertyTypes.EVT, eventId);
        this.#property.effect(effect);
        const content = {
            type: this.PropertyTypes.EVT,
            description,
            postEvent,
            grade,
            effect
        }
        const current = suppressDescription ? [] : [content];
        if(next) return [current, this.doEvent(next, false)].flat();
        return current;
    }

    random(events) {
        const eligible = events.filter(
            ([eventId])=>this.#event.check(eventId, this.#property)
        );
        // A pool whose weights sum below 1 fires with that probability and
        // is otherwise a quiet year. Without this, a lone fractional-weight
        // event (e.g. a purge at *0.01) becomes a certainty whenever nothing
        // else in the row is eligible, since weightRandom only compares
        // weights relatively.
        let total = 0;
        for(const [, weight] of eligible) total += weight;
        if(total < 1 && Math.random() >= total) return undefined;
        return util.weightRandom(eligible);
    }

    talentRandom() {
        return this.#talent.talentRandom(
            this.lastExtendTalent,
            this.#getPropertys(
                this.PropertyTypes.TMS,
                this.PropertyTypes.CACHV,
            )
        );
    }

    characterRandom() {
        const characters = this.#character.random();
        const replaceTalent = v=>v.talent=v.talent.map(
            id=>this.#talent.get(id)
        );
        characters.normal.forEach(replaceTalent);
        if(characters.unique && characters.unique.talent)
            replaceTalent(characters.unique);
        return characters;
    }

    talentExtend(talentId) {
        this.#property.set(this.PropertyTypes.EXT, talentId);
    }

    exclude(talents, exclusive) {
        return this.#talent.exclude(talents, exclusive);
    }

    generateUnique() {
        this.#character.generateUnique();
    }

    #getJudges(...types) {
        return util.getListValuesMap(types.flat(), key => this.#property.judge(key));
    }

    #getPropertys(...types) {
        return util.getListValuesMap(types.flat(), key => this.#property.get(key));
    }

    get lastExtendTalent() {
        return this.#property.get(this.PropertyTypes.EXT);
    }

    get summary() {
        this.#achievement.achieve(this.AchievementOpportunity.SUMMARY);

        const pt = this.PropertyTypes;

        return this.#getJudges(pt.SUM,
            pt.HAGE, pt.HCHR, pt.HINT,
            pt.HSTR, pt.HMNY, pt.HSPR,
        );
    }

    get statistics() {
        const pt = this.PropertyTypes;

        return this.#getJudges( pt.TMS,
            pt.CACHV, pt.RTLT, pt.REVT,
        );
    }
    get achievements() {
        const ticks = {};
        this.#property
            .get(this.PropertyTypes.ACHV)
            .forEach(([id, tick]) => ticks[id] = tick);
        return this
            .#achievement
            .list(this.#property)
            .sort((
                {id: a, grade: ag, hide: ah},
                {id: b, grade: bg, hide: bh}
            )=>{
                a = ticks[a];
                b = ticks[b];
                if(a&&b) return b - a;
                if(!a&&!b) {
                    if(ah&&bh) return bg - ag;
                    if(ah) return 1;
                    if(bh) return -1;
                    return bg - ag;
                }
                if(!a) return 1;
                if(!b) return -1;
            });
    }

    get PropertyTypes() { return this.#property.TYPES; }
    get AchievementOpportunity() { return this.#achievement.Opportunity; }
    get talentSelectLimit() { return this.#talentSelectLimit; }
    get propertyAllocateLimit() { return util.clone(this.#propertyAllocateLimit); }

    get propertys() { return this.#property.getPropertys(); }
    get times() { return this.#property.get(this.PropertyTypes.TMS) || 0; }
    set times(v) {
        this.#property.set(this.PropertyTypes.TMS, v);
        this.#achievement.achieve(this.AchievementOpportunity.END);
    }
    get specialThanks() { return this.#specialThanks; }

    addNationality(NAT) {
        this.#property.set(NAT, 1);
    }
}

export default Life;
