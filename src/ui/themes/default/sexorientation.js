import COUNTRIES from '../../../functions/countries.js';

export default class Mode extends ui.view.DefaultTheme.SexOrientationUI {
    constructor() {
        super();
        this.#types = core.PropertyTypes;
        this.btnStraight.on(Laya.Event.CLICK, this, this.onClickStraight);
        this.btnLBTQ.on(Laya.Event.CLICK, this, this.onClickLBTQ);
    }
    init({ nationality }) {
        this.#sexAllocate = Object.fromEntries(
            COUNTRIES.map(({ key }) => [this.#types[key], nationality[this.#types[key]]])
        );
        this.#sexAllocate[this.#types.LBTQ] = 0;
    }
    #types;
    #sexAllocate;
    onClickStraight() {
        this.onClickNext(0)
    }
    onClickLBTQ() {
        this.onClickNext(1)
    }
    onClickNext (SEX) {
        this.#sexAllocate[this.#types.LBTQ] = SEX
        const property = this.#sexAllocate
        $ui.switchView(UI.pages.TALENT, { property, enableExtend: true });
    }
}
