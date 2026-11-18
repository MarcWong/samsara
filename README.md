# ♀Samsara

[![Samsara 装置现场](Samsara-Yuwei-Jiang-CN-photo-Florian-Voggeneder2.webp)](https://www.youtube.com/watch?v=SZAssoQM8Og)

♀Samsara（2022）质疑的是那些交织在我们对性别平等的乐观想象之中的社会经济框架。作品让每一位观众依据自己的人生选择，在程序中以女性身份“数字转生”，由此揭示“精英主义神话”与“进步神话”之间的相似之处，促使我们以将来时重新审视其中的权力关系。它引人进入一种未来的技术反乌托邦：人的欲望由 AI 服侍，人权则以新的“技术宗教”之名被牺牲。

更多介绍见 [林茨电子艺术节 Planet B 展览](https://ars.electronica.art/planetb/en/samsara/)。


## 安装与运行

<details>
<summary><strong>网页版</strong></summary>
<br />

1. 安装依赖（需要 Node.js 20、22 或 24；奇数版本如 23 会报 `EBADENGINE`）：

```bash
npm install --legacy-peer-deps
```

2. 启动本地开发服务器：

```bash
npm run dev
```

3. 启动完成后，在浏览器中打开终端里显示的地址即可。

展场布展请不要用这种方式，见下文《展场布展操作手册》。
</details>

<details>
<summary><strong>命令行版</strong></summary>
<br />

```bash
node repl
```

</details>


## 语言

游戏提供简体中文和英文两个版本。玩家在开始画面标题下方的 **中文｜EN** 开关中选择语言；每次打开页面默认是中文（`src/lib/i18n.js` 中的 `DEFAULT_LANG`）。

- `static/data/en-us/` 是原版英文数据，也是游戏引擎实际运行的数据结构，翻译时从不改动。
- `static/data/zh-cn/` 只存放文字叠加层（`events.json`：事件编号 → 文字；`talents.json`：编号 → 名称和描述），在运行时覆盖到英文数据上，因此翻译不可能改变触发条件、数值效果或分支。
- 界面文字（按钮、标签、致谢、打印小票）都在 `src/lib/i18n.js`。
- 中文使用 `static/fonts/` 中打包的两款字体（正文用思源黑体 Noto Sans SC，开场“你转生为女”手写字幕用悠哉字体 Yozai，均为 SIL OFL 开源许可），并裁剪到游戏实际用到的字。**修改任何中文文字之后**，都要重新裁剪字体：`python3 scripts/subset-fonts.py <NotoSansSC[wght].ttf> <Yozai-Medium.ttf>`。如果有字不在字体里，`npm test` 会报错并列出缺的字。

添加新语言：在 `i18n.js` 中增加一个 `DICT` 条目，在 `static/data/` 下新建数据文件夹，并在 `src/lib/game/core.js` 的 `OVERLAY_DIRS` 中注册。`npm test` 会检查每个事件编号和界面词条是否都已覆盖。

## 展场布展操作手册（本地运行）

游戏在展场电脑上本地运行，**不需要联网**：视频、声音、字体、二维码全部在本机。联网时会把每局结果上报到数据库，断网时只是不上报，游戏照常玩、小票照常打。

### 一、首次准备（技术人员做一次即可）

1. 安装 [Node.js](https://nodejs.org/)（选 **LTS** 版本，即 22 或 24；不要用 23、25 这类奇数版本，安装依赖时会报 `EBADENGINE`）和 [Google Chrome](https://www.google.com/chrome/)。
2. 把整个项目文件夹拷到展场电脑上（例如桌面），在文件夹里打开终端运行一次：
   ```bash
   npm install --legacy-peer-deps
   ```
3. 在项目文件夹里放好 `.env` 文件（数据上报的地址和 key，向开发者要）。没有这个文件也能玩，只是不上报数据。
4. 小票打印机（58mm 热敏）：装好驱动，在系统设置里**设为默认打印机**，纸张选 58mm。
5. 试运行一次（见下文第二部分），完整玩一局并打印一张小票，确认能出纸。
6. 建议在系统里关闭自动休眠和屏保、关闭系统更新提示，避免展出时弹窗。

### 二、每天开馆

1. **双击项目文件夹里的启动文件**：
   - Windows：`start-exhibit.bat`
   - Mac：`start-exhibit.command`（第一次如果提示无法打开：右键 → 打开）
2. 会弹出一个黑色窗口，显示「正在构建游戏」，等 10–30 秒。
3. 之后 Chrome 会自动**全屏**打开游戏。看到 ♀Samsara 标题画面就可以开放了。
4. **那个黑色窗口不要关**，可以最小化。关掉它游戏就停了。

### 三、每天闭馆

1. 退出全屏游戏：Windows 按 `Alt + F4`，Mac 按 `Cmd + Q`。
2. 关闭黑色窗口（或在里面按 `Ctrl + C`）。
3. 正常关机即可。

### 四、常见问题

| 现象 | 处理 |
|---|---|
| 小票不出纸 / 弹出了打印对话框 | 确认打印机已开机、有纸，并且是系统**默认打印机**。全屏模式下打印不会弹对话框，直接出纸。 |
| 打出来的小票很窄或偏到一边 | 打印机纸张设置改成 58mm，边距设为无/最小。 |
| 画面卡住、黑屏或声音没了 | 按 `Alt + F4`（Mac `Cmd + Q`）关掉游戏，再双击启动文件重开。 |
| 黑色窗口里出现 `[!]` 开头的红字 | 截图发给技术人员。 |
| 观众把游戏玩到一半走了 | 不用管。结算页 45 秒没人操作会自动回到开头。 |
| Chrome 没有自动打开 | 手动打开 Chrome，访问黑色窗口里显示的地址（`http://localhost:4173/samsara_cn/?kiosk`）。 |

### 给技术人员的说明

- `npm run exhibit`（即启动文件做的事）＝ 以 `BASE_PATH=/samsara_cn` 构建 → `vite preview` 在 4173 端口提供服务 → 用独立配置目录启动 Chrome，参数为 `--kiosk --kiosk-printing --autoplay-policy=no-user-gesture-required`。加 `--no-browser` 只启动服务、不开 Chrome。
- 打印是浏览器做的事（`window.print()`），和服务器是 `npm run dev` 还是 `preview` 无关；能否“直接出纸”只取决于 Chrome 是否带 `--kiosk-printing`，以及系统默认打印机。
- 展场不建议用 `npm run dev`：开发服务器首次访问要现编译、文件夹里有文件变动就会刷新页面打断观众，并且数据会标成 `deployment = 'dev'`。`exhibit` 构建的数据标为 `deployment = 'cn'`、`source = 'kiosk'`。
- 每次启动都会重新构建，所以拷进新版本文件后，重启一次就生效。
- 小票的二维码、致谢文字和字体都在本机，断网也能完整打印。

## 致谢

- 总设计：<a href='https://www.imdb.com/name/nm14776446/'>江禹葳</a>

- 开发与联合设计：王尧

- 音乐设计：谢冠宇

- 基于 VickScarlet 的开源项目《人生重开模拟器》（LifeRestart）开发：https://liferestart.syaro.io/

- 联系方式：sabinajiang0505@outlook.com

![作品集](static/images/qr-code_portfolio.png)

![添加微信](static/images/qr-code_wechat.png)

- Instagram：@artist_jiangyuwei
