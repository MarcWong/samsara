import COUNTRIES from '../../../functions/countries.js';

// labContent is a plain Laya.Label — one uniform color per label, no inline
// rich text/HTML spans — so a mixed green/red stat readout can't be part of
// that same text block. Instead each triggered stat change gets its own small
// Label, colored individually and laid out in a row under the description,
// mirroring how the top-bar +X badges already work per stat.
const STAT_LABELS = {
    MNY: 'Wealth',
    CHR: 'Appearance',
    INT: 'IQ',
    STR: 'Health',
    SPR: 'EQ',
};
const POSITIVE_COLOR = '#4caf50';
const NEGATIVE_COLOR = '#f44336';
const STAT_ROW_FONT_SIZE = 40;
const STAT_ROW_GAP_X = 30;
const STAT_ROW_MARGIN_TOP = 10;

export default class Trajectory extends ui.view.DefaultTheme.TrajectoryUI {
    constructor() {
        super();
        let pos1 = [0, 0];
        this.panelTrajectory.on(Laya.Event.MOUSE_DOWN, this, e => pos1 = [e.stageX, e.stageY]);
        this.panelTrajectory.on(Laya.Event.MOUSE_UP, this, e => {
            const distanceX = e.stageX - pos1[0];
            const distanceY = e.stageY - pos1[1];
            if(Math.sqrt(Math.abs(distanceX) + Math.abs(distanceY)) > 10) {
                return;
            }
            this.onNext();
        });
        this.btnSummary.on(Laya.Event.CLICK, this, this.onSummary);

        this.panelTrajectory.vScrollBar.elasticDistance = 150;
        this.scbSpeed.on(Laya.Event.CHANGE, this, () => this.speed = this.scbSpeed.value);
        this.scbSpeed.on(Laya.Event.MOUSE_UP, this, () => this.onNext());

        this.#reorderPropertyBar();
    }

    // labCharm/labIntelligence/labStrength/labMoney/labSpirit each sit inside
    // their own "propertyBox" column (label above the value, two levels up
    // from the value Label itself), all direct children of one HBox that
    // auto-lays them out left to right — reordering is just moving Money's
    // whole column to the front; the HBox handles spacing/width itself.
    #reorderPropertyBar() {
        const hbox = this.labCharm.parent.parent.parent;
        const moneyColumn = this.labMoney.parent.parent;
        moneyColumn.removeSelf();
        hbox.addChildAt(moneyColumn, 0);
    }

    AGE = {
        0: 0,
        1: 1,
        2: 2,
        3: 2,
        4: 3,
        5: 3,
        6: 4,
        7: 5,
        8: 5,
        9: 6,
        10: 6,
        11: 7,
        12: 8,
        13: 9,
        14: 10,
        15: 10,
        16: 11,
        17: 11,
        18: 12,
        19: 12,
        20: 13,
        21: 13,
        22: 14,
        23: 15,
        24: 15,
        25: 16,
        26: 17,
        27: 17,
        28: 18,
        29: 18,
        30: 19,
        31: 19,
        32: 20,
        33: 20,
        34: 21,
        35: 21,
        36: 22,
        37: 23,
        38: 23,
        39: 24,
        40: 25,
        41: 25,
        42: 26,
        43: 26,
        44: 27,
        45: 27,
        46: 28,
        47: 28,
        48: 29,
        49: 29,
        50: 30,
        51: 31,
        52: 31,
        53: 32,
        54: 33,
        55: 34,
        56: 34,
        57: 35,
        58: 36,
        59: 37,
        60: 37,
        61: 38,
        62: 39,
        63: 40,
        64: 41,
        65: 41,
        66: 42,
        67: 42,
        68: 43,
        69: 43,
        70: 44,
        71: 44,
        72: 45,
        73: 46,
        74: 47,
        75: 48,
        76: 48,
        77: 49,
        78: 51,
        79: 53,
        80: 54,
        81: 54,
        82: 55,
        83: 56,
        84: 59,
        85: 60,
        86: 61,
        87: 62,
        88: 63,
        89: 64,
        90: 65,
        91: 66,
        92: 68,
        93: 70,
        94: 77,
        95: 78,
        96: 80,
        97: 89,
        98: 97,
        102: 102,
    }


    #speed;
    #auto;

    static load() {
        return [
            "images/atlas/images/progress.atlas",
            'images/atlas/images/slider.atlas',
        ];
    }

    static #createComponent = Laya.plugin.extractComponents(Trajectory.uiView, ['boxTrajectoryItem']);
    #createTrajectoryItem() {
        const item = Trajectory.#createComponent('boxTrajectoryItem');
        const labContent = item.getChildByName('labContent');
        // Reading labContent's auto-computed .height right after setting .text
        // was not reliable — it produced a large stale gap before the
        // stat-change row on entries whose description was short (confirmed
        // via screenshot, not just theory). Rather than continue guessing at
        // exactly when Laya finalizes a wordWrap label's height, wrap
        // labContent in a real VBox and add the stat-change row as its second
        // child — the same auto-stacking mechanism the property allocation
        // screen already relies on for variable-size rows, so the item's own
        // height (which vboxTrajectory positions subsequent items from) stays
        // correct without any manual height math here at all.
        const contentBox = new Laya.VBox();
        contentBox.y = labContent.y;
        contentBox.left = labContent.left;
        contentBox.right = labContent.right;
        contentBox.space = STAT_ROW_MARGIN_TOP;
        labContent.removeSelf();
        labContent.y = 0;
        labContent.left = 0;
        labContent.right = 0;
        contentBox.addChild(labContent);
        item.addChild(contentBox);

        item.labContent = labContent;
        item.contentBox = contentBox;
        item.labAge = item.getChildByName('hboxAge').getChildByName('labAge');
        const config = $ui.common.trajectoryItem;
        $_.deepMapSet(item, config.box);
        item.grade = grade => {
            $_.deepMapSet(item, config.grade[grade || 0]);
        }
        item.getChildByName('hboxAge')._childs.forEach(child => child.color = config.ageColor);
        item.labContent.color = config.contentColor;
        return item;
    }
    #isEnd;
    #talents;
    #enableExtend;
    #printText;
    #effects;

    init({ propertyAllocate, talents, enableExtend }) {
        const types = core.PropertyTypes;
        this.#printText = "";
        this.#effects = {
            "CHR": 0,
            "INT": 0,
            "STR": 0,
            "MNY": 0,
            "SPR": 0
        }
        const newProperty = this.initProperty(propertyAllocate);
        this.labCountry.text = this.#countryName(newProperty) || "";

        this.labSex.text = newProperty[types.LBTQ] == 1 ? "LBTQ": "Straight"

        this.#enableExtend = enableExtend;

        this.boxSpeed.visible = false;
        this.scbSpeed.value = this.scbSpeed.max * 0.5; // init speed
        this.btnSummary.visible = false;
        this.#isEnd = false;
        this.#talents = talents;
        core.start(newProperty);
        this.updateProperty();
        this.onNext();
    }

    close() {
        this.scbSpeed.value = 0;
        this.speed = 0;
        this.#printText = "";
    }

    initProperty(propertyAllocate) {
        const types = core.PropertyTypes;
        var max = 0;
        var newProperty = propertyAllocate;
        if (propertyAllocate[types.CHR] > max)
            max = propertyAllocate[types.CHR]
        if (propertyAllocate[types.INT] > max)
            max = propertyAllocate[types.INT]
        if (propertyAllocate[types.STR] > max)
            max = propertyAllocate[types.STR]
        if (propertyAllocate[types.MNY] > max)
            max = propertyAllocate[types.MNY]
        if (propertyAllocate[types.SPR] > max)
            max = propertyAllocate[types.SPR]
        const total = propertyAllocate[types.CHR] + propertyAllocate[types.INT]
            + propertyAllocate[types.STR] + propertyAllocate[types.MNY] + propertyAllocate[types.SPR];
        // if total points >= 9 and any property > 7, add 5 to all other properties
        if (total >= 9 && max > 7) {
            if (newProperty[types.CHR] < 8)
                newProperty[types.CHR] = newProperty[types.CHR] < 4 ? newProperty[types.CHR] + 5 : 8;
            if (newProperty[types.INT] < 8)
                newProperty[types.INT] = newProperty[types.INT] < 4 ? newProperty[types.INT] + 5 : 8;
            if (newProperty[types.STR] < 8)
                newProperty[types.STR] = newProperty[types.STR] < 4 ? newProperty[types.STR] + 5 : 8;
            if (newProperty[types.MNY] < 8)
                newProperty[types.MNY] = newProperty[types.MNY] < 4 ? newProperty[types.MNY] + 5 : 8;
            if (newProperty[types.SPR] < 8)
                newProperty[types.SPR] = newProperty[types.SPR] < 4 ? newProperty[types.SPR] + 5 : 8;
        }

        // Printing text
        const countryName = this.#countryName(newProperty);
        if (countryName)
            this.#printText += `Country: ${countryName}\n`
        this.#printText += "Sex orientation: "
        this.#printText += (newProperty[types.LBTQ] == 1 ? "LBTQ" : "Straight") + "\n"
        this.#printText += "Family wealth: " + newProperty[types.MNY] + "\n"
        this.#printText += "Appearance: " + newProperty[types.CHR] + "\n"
        this.#printText += "IQ: " + newProperty[types.INT] + "\n"
        this.#printText += "Healthy: " + newProperty[types.STR] + "\n"
        this.#printText += "EQ: " + newProperty[types.SPR] + "\n"
        return newProperty
    }

    #countryName(newProperty) {
        const types = core.PropertyTypes;
        const country = COUNTRIES.find(({ key }) => newProperty[types[key]] == 1);
        return country?.name;
    }

    updateProperty() {
        const types = core.PropertyTypes;
        const propertys = core.propertys;

        this.labCharm.text = propertys[types.CHR] - this.#effects["CHR"];
        this.labIntelligence.text = propertys[types.INT] - this.#effects["INT"];
        this.labStrength.text = propertys[types.STR] - this.#effects["STR"];
        this.labMoney.text = propertys[types.MNY] - this.#effects["MNY"];
        this.labSpirit.text = propertys[types.SPR] - this.#effects["SPR"];
    }

    onNext() {
        if (this.#isEnd) {
            this.scbSpeed.value = 0;
            this.speed = 0;
            return;
        }
        const { age, content, isEnd } = core.next();
        this.#isEnd = isEnd;

        if(isEnd) {
            this.boxSpeed.visible = false;
            this.btnSummary.visible = true;
            Laya.timer.frameOnce(1,this,()=>{
                this.panelTrajectory.scrollTo(0, this.panelTrajectory.contentHeight);
            });
        }

        // empty events
        if (JSON.stringify(content) == "{}")
            return;

        this.panelTrajectory.scrollTo(0, this.panelTrajectory.contentHeight);
        this.renderTrajectory(age, content);

        this.updateProperty();
        if (this.#isEnd) return;
    }

    renderTrajectory(age, content) {
        const realAge = this.AGE[age];
        this.#effects = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
        this.labCharmAdd.visible = false;
        this.labIntelligenceAdd.visible = false;
        this.labStrengthAdd.visible = false;
        this.labMoneyAdd.visible = false;
        this.labSpiritAdd.visible = false;
        const item = this.#createTrajectoryItem();
        item.labAge.text = (2022 + realAge) + '\n Age: ' + realAge;
        const statChanges = [];
        item.labContent.text = content.map(
            ({ type, description, effect, name, postEvent}) => {
                if (effect) {
                    if (effect.MNY) {
                        this.#effects["MNY"] = effect.MNY;
                        this.labMoneyAdd.visible = true
                        this.labMoneyAdd.text = effect.MNY > 0 ? '+' + effect.MNY : effect.MNY;
                        statChanges.push(['MNY', effect.MNY]);
                    }
                    if (effect.CHR) {
                        this.#effects["CHR"] = effect.CHR;
                        this.labCharmAdd.visible = true;
                        this.labCharmAdd.text = effect.CHR > 0 ? '+' + effect.CHR : effect.CHR;
                        statChanges.push(['CHR', effect.CHR]);
                    }
                    if (effect.INT) {
                        this.#effects["INT"] = effect.INT;
                        this.labIntelligenceAdd.visible = true
                        this.labIntelligenceAdd.text = effect.INT > 0 ? '+' + effect.INT : effect.INT;
                        statChanges.push(['INT', effect.INT]);
                    }
                    if (effect.STR) {
                        this.#effects["STR"] = effect.STR;
                        this.labStrengthAdd.visible = true
                        this.labStrengthAdd.text = effect.STR > 0 ? '+' + effect.STR : effect.STR;
                        statChanges.push(['STR', effect.STR]);
                    }
                    if (effect.SPR) {
                        this.#effects["SPR"] = effect.SPR;
                        this.labSpiritAdd.visible = true
                        this.labSpiritAdd.text = effect.SPR > 0 ? '+' + effect.SPR : effect.SPR;
                        statChanges.push(['SPR', effect.SPR]);
                    }
                }
                switch(type) {
                    case 'EVT':
                        return description + (postEvent ? `\n${postEvent}` : '');
                    case 'TLT':
                        return `Lucky Charm {${name}}: ${description}`;
                }
            }
        ).join('\n');

        this.#addStatChangeRow(item, statChanges);

        const statChangesText = statChanges
            .map(([prop, value]) => `${STAT_LABELS[prop]} ${value > 0 ? '+' : ''}${value}`)
            .join('  ');
        this.#printText += "Year " + (2022 + realAge) + ", age: " + realAge + "\n" + item.labContent.text
            + (statChangesText ? "\n" + statChangesText : "") + "\n";

        item.grade(content[content.length - 1].grade);

        this.vboxTrajectory.addChild(item);
        item.y = this.vboxTrajectory.height;
    }

    #addStatChangeRow(item, statChanges) {
        if (!statChanges.length) return;
        const row = new Laya.Box();
        let x = 0;
        let rowHeight = 0;
        for (const [prop, value] of statChanges) {
            const label = new Laya.Label();
            label.text = `${STAT_LABELS[prop]} ${value > 0 ? '+' : ''}${value}`;
            label.fontSize = STAT_ROW_FONT_SIZE;
            label.font = item.labContent.font;
            label.color = value > 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
            label.x = x;
            row.addChild(label);
            x += label.width + STAT_ROW_GAP_X;
            rowHeight = Math.max(rowHeight, label.height);
        }
        row.width = Math.max(0, x - STAT_ROW_GAP_X);
        row.height = rowHeight;
        item.contentBox.addChild(row);
    }

    onSummary() {
        const talents = this.#talents;
        $ui.switchView(UI.pages.SUMMARY, { talents, printText: this.#printText, enableExtend: this.#enableExtend});
    }

    get speed() {
        return this.#speed;
    }

    set speed(speed) {
        this.#speed = speed;
        this.prgSpeed.value = speed / this.scbSpeed.max;
        clearInterval(this.#auto);
        this.#auto = null;
        if(!speed) return;
        this.#auto = setInterval(
            () => this.onNext(),
            3000 * (1 - this.prgSpeed.value) + 300
        );
    }
}