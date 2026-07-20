export default class Talent extends ui.view.DefaultTheme.TalentUI {
    constructor() {
        super();
        this.btnDrawCard.on(Laya.Event.CLICK, this, this.onClickDrawCard);
        this.#introText = this.boxText.label;
        this.#drawLabel = this.btnDrawCard.label;
    }

    #introText;
    #drawLabel;
    #drawnTalents;

    init({ property }) {
        this.property = property;
        this.pageDrawCard.visible = true;
        this.#drawnTalents = null;
        this.boxText.label = this.#introText;
        this.btnDrawCard.label = this.#drawLabel;
    }

    close() {}

    onClickDrawCard() {
        if (this.#drawnTalents) {
            $ui.switchView(UI.pages.PROPERTYTEXT, { talents: this.#drawnTalents, property: this.property, enableExtend: true });
            return;
        }

        const listTalents = core.talentRandom();
        var selected = new Set();
        while (selected.size < 3) {
            var id = Math.floor(Math.random() * 10);
            // some talents cannot be drawn at the same time
            if (selected.has(5) && id == 7)
                continue
            if (selected.has(7) && id == 5)
                continue
            if (!selected.has(id))
                selected.add(id)
        }
        const talents = [...selected].map(index => listTalents[index]);
        this.#drawnTalents = talents;

        this.boxText.label = talents
            .map(({ name }) => name)
            .join('\n');
        this.btnDrawCard.label = 'Continue';
    }
}