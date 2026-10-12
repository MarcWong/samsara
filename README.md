# Samsara

[![Samsara Installation](Samsara-Yuwei-Jiang-CN-photo-Florian-Voggeneder2.webp)](https://www.youtube.com/watch?v=SZAssoQM8Og)

♀Samsara (2022) challenges the socioeconomic frameworks woven within our optimism about gender equality. By allowing each audience to become digitally reborn as a female in the program based on their life choices, it draws attention to the parallels between the myth of meritocracy and the myth of progress, asking us to reconsider the power dynamics in the future tense. The work ushers in a sense of a future techno-dystopia where our desires are serviced by AI and human rights are sacrificed in the name of the new techno-religion.

Read more at [Planet B Exhibition at Ars Eletronica](https://ars.electronica.art/planetb/en/samsara/).


## Installation

<details>
<summary><strong>Web Version</strong></summary>
<br />

1. Installation dependence.

```bash
yarn install
```

Or

```bash
npm install
```

2. Start local server.

```bash
yarn dev
```

Or

```bash
npm run dev
```

3. After the startup is complete, will automatically open a browser and visit.
</details>

<details>
<summary><strong>Command Line Version</strong></summary>
<br />

```bash
node repl
```

</details>


## Languages

The game ships in English and Chinese (简体中文). The player picks the language with the **中文 | EN** switch in the top-right corner of the start screen; a fresh page load always starts in Chinese (`DEFAULT_LANG` in `src/lib/i18n.js`).

- `static/data/en-us/` is the original English data. It is the structure the engine runs on and is never edited for translation.
- `static/data/zh-cn/` holds text-only overlays (`events.json`: event id → line, `talents.json`: id → name/description) applied on top of it, so a translation can't change conditions, effects or branches.
- Interface strings (buttons, labels, credits, the printed receipt) live in `src/lib/i18n.js`.

To add another language: add a `DICT` entry in `i18n.js`, a data folder under `static/data/`, and register it in `OVERLAY_DIRS` in `src/lib/game/core.js`. `npm test` checks that every event id and interface key is covered.

## Credits

- Lead Direction Narrative Design: <a href='https://www.imdb.com/name/nm14776446/'>Yuwei Jiang</a>

- Developer & Co-Design: Yao Wang

- Audio design: Guanyu Xie

- Built upon the open-source codebase of LifeRestart by VickScarlet https://liferestart.syaro.io/

- Contact: sabinajiang0505@outlook.com

![by me a coffee](static/images/qr-code_coffee.png)

![follow Ins](static/images/qr-code_ins.png)