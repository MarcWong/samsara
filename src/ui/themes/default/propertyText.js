export default class Mode extends ui.view.DefaultTheme.PropertyTextUI {
    constructor() {
        super();
        this.btnContinue.on(Laya.Event.CLICK, this, this.onClickContinue);
    }
    init({ talents, property }) {
        this.talents = talents
        this.property = property
    }
    onClickContinue () {
        $ui.switchView(UI.pages.PROPERTY, { talents: this.talents, property: this.property, enableExtend: true })
    }
}
