import COUNTRIES from '../../../functions/countries.js';

export default class Mode extends ui.view.DefaultTheme.PropertyTextUI {
    constructor() {
        super();
        this.btnContinue.on(Laya.Event.CLICK, this, this.onClickContinue);
    }
    init({ talents, property }) {
        this.talents = talents
        this.property = property
        // this compiled screen's text was static ("You have 13 tokens..."),
        // baked in before country-dependent point pools existed — same shortcut
        // pattern as summary.js/talent.js (ColorfulBox.label finds the child
        // named "label" and sets its text). Uses the country's base points
        // directly rather than core.getPropertyPoints(), since talent state
        // (core.remake()) isn't set up until the Property screen right after
        // this one — the exact final total (including any talent bonus) is
        // shown correctly there regardless.
        const types = core.PropertyTypes;
        const country = COUNTRIES.find(({ key }) => property[types[key]] == 1);
        const points = country?.points ?? 13;
        this.boxProperty.label = `You have ${points} tokens to allocate into the following 5 categories to restart your life as you desire:  Wealth, Appearance, IQ, Health, and EQ.Choose carefully!`;
    }
    onClickContinue () {
        $ui.switchView(UI.pages.PROPERTY, { talents: this.talents, property: this.property, enableExtend: true })
    }
}
