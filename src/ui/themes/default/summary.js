export default class Summary extends ui.view.DefaultTheme.SummaryUI {
    constructor() {
        super();
        this.listSummary.renderHandler = Laya.Handler.create(this, this.renderSummary, null, false);
        this.listSelectedTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
        this.btnAgain.on(Laya.Event.CLICK, this, this.onAgain);
        this.btnPrint.on(Laya.Event.CLICK, this, this.onPrintTxt);
    }

    #printText;

    onAgain() {
        window.location.reload()
    }

    onPrintTxt() {
        const win = window.open()
        const txts = this.#printText.split('\n')
        win.document.write("<pstyle='margin: 6px 0; width: 280px; font-size: 14px; font-family:Casadia Code, Consolas, monospace'>Life Summary @Samsara</p>")
        for (let id = 0; id < txts.length; id++) {
            win.document.write("<p style='margin:3px 0; width: 280px; font-size: 12px; font-family:Casadia Code, Consolas, monospace'>"
                + txts[id]
                + "</p>")
        }
        win.document.write("<div style='margin: 8px 0 0; width: 280px; text-align: center;'><img src='images/qrcode.png' style='width: 150px;height:150px;'></div>")
        win.document.write("<p style='margin: 8px 0 0; width: 280px; font-size: 12px; font-family:Casadia Code, Consolas, monospace'>Visit https://marcwong.github.io/samsara/ to play it at home.<br> © 2022 Yuwei Jiang</p>")
        win.document.write("<p style='margin: 8px 0 0; width: 280px; font-size: 12px; font-family:Casadia Code, Consolas, monospace'>Contact: sabinajiang0505@outlook.com</p>")
        win.focus()
        win.document.close()
        win.print()
    }

    init({ talents, printText, enableExtend}) {
        const {summary, lastExtendTalent} = core;
        this.#printText = printText;

        this.listSummary.array = [
            [core.PropertyTypes.HMNY, $lang.UI_Property_Money],
            [core.PropertyTypes.HCHR, $lang.UI_Property_Charm],
            [core.PropertyTypes.HINT, $lang.UI_Property_Intelligence],
            [core.PropertyTypes.HSTR, $lang.UI_Property_Strength],
            [core.PropertyTypes.HSPR, $lang.UI_Property_Spirit],
        ].map(([type, key]) => {
            const data = summary[type];
            return {
                label: `${key}${$lang.UI_Colon} ${data.value > 13 ? 13 : data.value}`,
                grade: data.grade,
            }
        });

        this.listSelectedTalents.array = talents;
    }
    renderSummary(box) {
        const {label, grade} = box.dataSource;
        box.label = label;
        $_.deepMapSet(box, $ui.common.summary[grade]);
    }
    renderTalent(box) {
        const dataSource = box.dataSource;
        box.label = $_.format($lang.F_TalentSelection, dataSource);
        const style = $ui.common.card[dataSource.grade];
        $_.deepMapSet(box, dataSource.id = style.normal);
    }

}