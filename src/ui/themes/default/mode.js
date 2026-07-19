import COUNTRIES from '../../../functions/countries.js';

// The compiled ModeUI only ever had 6 hardcoded named buttons, which meant every
// new country needed a LayaAir IDE edit + recompile. This screen now builds the
// country list itself from functions/countries.js: one template button is pulled
// out of the compiled layout and cloned into a grid at runtime, so adding a 13th
// country is a one-line change to that shared list, nothing here.
//
// The template button (btnAfg) carries its own baked-in x/y/centerX/centerY from
// its original single-column position in the compiled layout. Laya resolves
// centerX/centerY ahead of x/y when both are present, so every clone must have
// centerX/centerY explicitly cleared (NaN, Laya's "unset" sentinel) before x/y
// are applied — otherwise every clone collapses back onto that one baked-in spot.
//
// Button size is computed from Laya.stage.width/height, not the 1125x2436 design
// constants: app.js's #fitScreen grows the stage wider than 1125 on landscape-ish
// viewports, and a grid sized for the fixed design width was left stranded in the
// top-left corner with the rest of the (wider) stage empty.
const COLUMNS = 2;
const MARGIN_X = 120;
const PANEL_TOP = 450;
const PANEL_BOTTOM = 40;
const GAP_X = 24;
const GAP_Y = 32;
// btnAfg already extends runtime.ColorfulBox (src/ui/runtime.js), same as every
// other button in the game (Start, Continue, ...) — it has a working `radius`
// and a hover-color tween built in, just never turned on anywhere, which is why
// every button in the game is a flat sharp-cornered rect. Setting them here is
// the same style every other button already has the machinery for.
const BUTTON_RADIUS = 28;
const HOVER_COLOR = '#e8ded2';

export default class Mode extends ui.view.DefaultTheme.ModeUI {
    static #createComponent = Laya.plugin.extractComponents(Mode.uiView, [
        'btnAfg', 'btnEgp', 'btnInd', 'btnJpn', 'btnUsa', 'btnChn',
    ]);

    constructor() {
        super();
        this.#types = core.PropertyTypes;
        this.#buildCountryList();
    }

    #types;
    #panel;

    #buildCountryList() {
        const panel = this.#panel = new Laya.Panel();
        panel.top = PANEL_TOP;
        panel.bottom = PANEL_BOTTOM;
        panel.left = MARGIN_X;
        panel.right = MARGIN_X;

        const rows = Math.ceil(COUNTRIES.length / COLUMNS);
        const availableWidth = Laya.stage.width - MARGIN_X * 2;
        const availableHeight = Laya.stage.height - PANEL_TOP - PANEL_BOTTOM;
        const buttonWidth = (availableWidth - (COLUMNS - 1) * GAP_X) / COLUMNS;
        const buttonHeight = (availableHeight - (rows - 1) * GAP_Y) / rows;

        const grid = new Laya.Box();
        grid.width = COLUMNS * buttonWidth + (COLUMNS - 1) * GAP_X;
        grid.height = rows * buttonHeight + (rows - 1) * GAP_Y;
        // the panel is anchored with equal left/right margins so it's already
        // centered on the (possibly wider-than-design) stage; centering the grid
        // within it too guards against the grid's computed size ever falling
        // short of the panel's actual resolved width/height.
        grid.centerX = 0;
        grid.centerY = 0;
        panel.addChild(grid);

        COUNTRIES.forEach(({ key, name }, i) => {
            const btn = Mode.#createComponent('btnAfg');
            btn.centerX = NaN;
            btn.centerY = NaN;
            const col = i % COLUMNS;
            const row = Math.floor(i / COLUMNS);
            btn.x = col * (buttonWidth + GAP_X);
            btn.y = row * (buttonHeight + GAP_Y);
            btn.width = buttonWidth;
            btn.height = buttonHeight;
            btn.radius = BUTTON_RADIUS;
            btn.hoverColor = HOVER_COLOR;
            btn.label = name;
            // the label child's own width/centerX/fontSize were tuned in the
            // compiled layout for the original 750-wide single-column button;
            // re-fit it for the grid cell so longer names ("United Kingdom")
            // don't run past the button's edge.
            const labelNode = btn.getChildByName('label');
            if (labelNode) {
                labelNode.fontSize = 56;
                labelNode.width = buttonWidth - 40;
                labelNode.align = 'center';
                labelNode.centerX = 0;
                labelNode.centerY = 0;
            }
            btn.on(Laya.Event.CLICK, this, this.onClickNext, [key]);
            grid.addChild(btn);
        });

        this.addChild(panel);
    }

    onClickNext(key) {
        const nationality = Object.fromEntries(
            COUNTRIES.map(({ key: k }) => [this.#types[k], k === key ? 1 : 0])
        );
        console.log(nationality)
        $ui.switchView(UI.pages.SEXORIENTATION, { nationality, enableExtend: true });
    }
}
