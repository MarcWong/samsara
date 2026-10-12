import { writable, derived, get } from 'svelte/store';

// Interface text for the two supported languages. The *game* text (events,
// lucky charms) is not here: it lives in static/data/ -- English is the data
// as shipped (static/data/en-us, never edited for translation) and Chinese is
// a text-only overlay (static/data/zh-cn) applied on top by core.js, so the
// two can never drift apart mechanically. This file covers everything else the
// player reads: screens, buttons, notifications, the printed receipt.
//
// Values are plain strings with %name% placeholders, or arrays of lines (the
// credits). A '\n' is a deliberate line break -- the elements that show those
// strings set `white-space: pre-line`. A key missing from `zh` falls back to
// English, then to the key itself, so a half-finished translation degrades
// instead of rendering blanks.

const DEFAULT_LANG = 'zh';

const DICT = {
	en: {
		// Start screen
		'intro.credit': 'by Yuwei Jiang',
		'intro.hint': 'click anywhere to begin',
		'intro.continue': 'continue',
		'intro.pickCountry': 'Which country would you\nchoose to be born in?',

		// Country / orientation selection
		'plaza.selectCountry': '> SELECT COUNTRY OF BIRTH_',
		'plaza.selectOrientation': 'Select your orientation',
		'orient.Straight': 'Straight',
		'orient.LGBTQ': 'LGBTQ',
		'country.AF': 'Afghanistan',
		'country.CH': 'China',
		'country.EGY': 'Egypt',
		'country.IND': 'India',
		'country.JAP': 'Japan',
		'country.US': 'USA',
		'country.IRN': 'Iran',
		'country.UKR': 'Ukraine',
		'country.PRK': 'North Korea',
		'country.GBR': 'UK',
		'country.HTI': 'Haiti',
		'country.DNK': 'Denmark',

		// Attributes
		'stat.MNY': 'Wealth',
		'stat.CHR': 'Appearance',
		'stat.INT': 'IQ',
		'stat.STR': 'Health',
		'stat.SPR': 'Happiness',

		// Attribute allocation
		'alloc.title': 'Allocate your attributes',
		'alloc.tokens': 'Tokens: %n%',
		'alloc.remaining': 'Remaining: %n%',
		'alloc.random': 'Random',
		'alloc.start': 'Start',
		'alloc.caption': 'Your choice matters, think twice.',
		'alloc.hint': 'See what happens if you put all tokens\nin to one attribute.',
		'alloc.decrease': 'Decrease %label%',
		'alloc.increase': 'Increase %label%',

		// Life log
		'log.age': 'Age %age%',
		'log.luckyCharm': 'Lucky Charm {%name%}: %description%',
		'log.coda': 'Relax, even when you are privileged, nothing is in control',
		'log.viewSummary': 'View Summary',

		// Printed receipt / copied story
		'print.age': 'Age: ',
		'print.sep': ': ',
		'print.country': 'Country',
		'print.orientation': 'Sex orientation',
		'print.wealth': 'Family wealth',
		'print.appearance': 'Appearance',
		'print.iq': 'IQ',
		'print.health': 'Healthy',
		'print.happiness': 'Happiness',
		'print.masthead': 'Life Summary @Samsara',

		// Summary
		'sum.country': 'Country',
		'sum.orientation': 'Orientation',
		'sum.livedTo': 'Lived to',
		'sum.age': 'Age %age%',
		'sum.randomEvents': 'Random Events',
		'sum.talentLine': '%name% (%description%)',
		'sum.print': 'Print',
		'sum.restart': 'Restart Life',
		'sum.hint':
			"Throw all your tokens into one attribute,\nget a boost on every stat automatically,\nand boom -- you've just unlocked easy mode for life.",
		'sum.qr.play': 'Play it at home',
		'sum.qr.instagram': 'Follow on Instagram',
		'sum.qr.coffee': 'Buy us a coffee',
		'sum.qr.discord': 'Stay updated on Discord',
		credits: [
			'Lead Direction & Narrative Design:',
			'Yuwei Jiang',
			'Developer & Co-Design: Yao Wang',
			'Music Design: Guanyu Xie',
			'Built upon the open-source codebase of',
			'LifeRestart by VickScarlet',
			'Contact: sabinajiang0505@outlook.com',
			'WeChat: SabinaJiang_Yuwei',
			'© 2022 Yuwei Jiang',
		],

		// Toasts
		'msg.F_PropertyPointLeft': 'You have left {0} property point',
		'msg.F_TalentReplace': 'Talent replace [{source.name}] -> [{target.name}]',
		'msg.achievement': 'Achievement unlocked: %name%',

		// Phone portrait gate
		'rotate.hint': 'turn your phone sideways —\nthis life plays out in landscape',
	},

	zh: {
		'intro.credit': '作者：Yuwei Jiang',
		'intro.hint': '点击任意位置开始',
		'intro.continue': '继续',
		'intro.pickCountry': '你会选择\n出生在哪个国家？',

		'plaza.selectCountry': '> 选择出生国家_',
		'plaza.selectOrientation': '选择你的性取向',
		'orient.Straight': '异性恋',
		'orient.LGBTQ': 'LGBTQ',
		'country.AF': '阿富汗',
		'country.CH': '中国',
		'country.EGY': '埃及',
		'country.IND': '印度',
		'country.JAP': '日本',
		'country.US': '美国',
		'country.IRN': '伊朗',
		'country.UKR': '乌克兰',
		'country.PRK': '朝鲜',
		'country.GBR': '英国',
		'country.HTI': '海地',
		'country.DNK': '丹麦',

		'stat.MNY': '财富',
		'stat.CHR': '外貌',
		'stat.INT': '智商',
		'stat.STR': '健康',
		'stat.SPR': '快乐',

		'alloc.title': '分配你的属性',
		'alloc.tokens': '点数：%n%',
		'alloc.remaining': '剩余：%n%',
		'alloc.random': '随机',
		'alloc.start': '开始',
		'alloc.caption': '你的选择很重要，三思而后行。',
		'alloc.hint': '看看把所有点数都投入\n同一项属性会发生什么。',
		'alloc.decrease': '减少%label%',
		'alloc.increase': '增加%label%',

		'log.age': '%age% 岁',
		'log.luckyCharm': '幸运符「%name%」：%description%',
		'log.coda': '放轻松，即便你享有特权，也没有什么真正在掌控之中。',
		'log.viewSummary': '查看总结',

		'print.age': '年龄：',
		'print.sep': '：',
		'print.country': '国家',
		'print.orientation': '性取向',
		'print.wealth': '家境',
		'print.appearance': '外貌',
		'print.iq': '智商',
		'print.health': '健康',
		'print.happiness': '快乐',
		'print.masthead': '人生总结 @Samsara',

		'sum.country': '国家',
		'sum.orientation': '性取向',
		'sum.livedTo': '享年',
		'sum.age': '%age% 岁',
		'sum.randomEvents': '随机事件',
		'sum.talentLine': '%name%（%description%）',
		'sum.print': '打印',
		'sum.restart': '重启人生',
		'sum.hint': '把所有点数都投入同一项属性，\n每项属性便会自动获得加成，\n然后——你就解锁了终身简单模式。',
		'sum.qr.play': '在家也能玩',
		'sum.qr.instagram': '关注 Instagram',
		'sum.qr.coffee': '请我们喝杯咖啡',
		'sum.qr.discord': '加入 Discord 获取更新',
		credits: [
			'总导演 & 叙事设计：',
			'Yuwei Jiang',
			'开发 & 联合设计：Yao Wang',
			'音乐设计：Guanyu Xie',
			'基于开源项目',
			'VickScarlet 的 LifeRestart',
			'联系方式：sabinajiang0505@outlook.com',
			'微信：SabinaJiang_Yuwei',
			'© 2022 Yuwei Jiang',
		],

		'msg.F_PropertyPointLeft': '你还剩 {0} 点属性点',
		'msg.F_TalentReplace': '天赋替换 [{source.name}] -> [{target.name}]',
		'msg.achievement': '成就达成：%name%',

		'rotate.hint': '请把手机横过来 ——\n这一生要在横屏中展开',

		// The two sentences the engine itself appends to events (see
		// Life.localize) -- English lives in life.js as the default.
		'engine.chinaBirthBlessing':
			'你的母亲请AI算命师推演了你的命运，又为你求来一枚“无事牌”，盼它护你一生平安顺遂。',
		'engine.sprDepressionLine':
			'每一句“我没事”都是一滴铅，每一句“算了”都是一根针。日复一日，你把自己塑造成一个“乖女孩”，直到这场表演硬化成了抑郁。',
	},
};

const lang = writable(DEFAULT_LANG);

function translate(language, key, vars) {
	const entry = DICT[language]?.[key] ?? DICT.en[key];
	if (entry === undefined) return key;
	if (typeof entry !== 'string' || !vars) return entry;
	return entry.replace(/%(\w+)%/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

// For templates: `{$t('alloc.title')}` re-renders when the language flips.
const t = derived(lang, $lang => (key, vars) => translate($lang, key, vars));

// For one-off reads outside a component (toasts, the print window, plain
// module code). Components that mount after the start screen can use it too:
// the language can only change on the start screen, before any of them exist.
function tr(key, vars) {
	return translate(get(lang), key, vars);
}

export { DICT, DEFAULT_LANG, lang, t, tr, translate };
