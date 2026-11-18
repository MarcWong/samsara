// The life-summary receipt, drawn onto a canvas.
//
// One renderer for every way the receipt leaves the screen:
//   - the exhibition printer (a PNG at the thermal head's own 8 dots/mm,
//     printed silently by the local exhibit server -- no browser dialog),
//   - "save as image" on phones (a sharper PNG the visitor long-presses),
//   - plain browser printing on the website (the PNG inside a print frame).
// Drawing it ourselves rather than printing HTML is what makes the layout
// identical everywhere, and lets the portrait be placed by measuring the
// header text (Chinese and English stat lines end at different widths).
//
// All layout is in millimetres; `pxPerMm` only decides the output pixels.

const PAPER_MM = 72; // printable band of the 80mm roll
const PAD_MM = 2;
// Same stack as the old HTML receipt: Latin in a monospace face, Chinese in
// the bundled Noto Sans SC subset.
const MONO = "'Cascadia Code', Consolas, 'Samsara SC', monospace";

const PX = 25.4 / 96; // one CSS px in mm -- sizes below match the old HTML receipt
const SIZE = { body: 10 * PX, masthead: 12 * PX, caption: 10 * PX, credits: 10 * PX };
const LINE = 1.4;
const GAP = { para: 3 * PX, rule: 8 * PX };
const QR = { cell: 30, img: 26, rowGap: 3 };

// Max canvas area browsers will reliably allocate (iOS Safari: ~16.7M px).
const MAX_CANVAS_AREA = 16_000_000;

function loadImage(src) {
	return new Promise(resolve => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

// Break text into lines that fit `maxMm`: Chinese breaks between any two
// characters, Latin between words, and closing punctuation never starts a line.
const NO_LINE_START = /^[，。、；：！？）」』》〉】,.;:!?)\]}%”’]/;
function tokenize(text) {
	return text.match(/[A-Za-z0-9@._\-'’#%+/]+\s*|\s+|./gsu) ?? [];
}
function wrap(measure, text, maxMm) {
	const out = [];
	for (const para of text.split('\n')) {
		let line = '';
		for (const tok of tokenize(para)) {
			const next = line + tok;
			if (line && measure(next.trimEnd()) > maxMm && !NO_LINE_START.test(tok)) {
				out.push(line.trimEnd());
				line = tok.trimStart();
			} else {
				line = next;
			}
		}
		out.push(line.trimEnd());
	}
	return out;
}

/**
 * @param {object} r
 * @param {string} r.masthead
 * @param {string[]} r.header       country / orientation / stat lines
 * @param {string[]} r.story        lines; '' draws a dashed rule
 * @param {{src: string, caption: string}[]} r.qrs
 * @param {string[]} r.credits
 * @param {string} [r.portrait]     image placed beside the header block
 * @param {number} r.pxPerMm
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderReceipt({ masthead, header, story, qrs, credits, portrait, pxPerMm }) {
	await Promise.all(
		[SIZE.body, SIZE.masthead].map(mm =>
			document.fonts?.load?.(`${(mm * 10).toFixed(2)}px ${MONO}`, '人生 Life').catch(() => {})
		)
	);
	const [portraitImg, ...qrImgs] = await Promise.all([
		portrait ? loadImage(portrait) : null,
		...qrs.map(q => loadImage(q.src)),
	]);

	// Measure at a fixed reference scale, in mm.
	const REF = 10;
	const probe = document.createElement('canvas').getContext('2d');
	const measurer = sizeMm => {
		probe.font = `${sizeMm * REF}px ${MONO}`;
		return text => probe.measureText(text).width / REF;
	};

	const contentW = PAPER_MM - 2 * PAD_MM;
	const ops = [];
	let y = PAD_MM;

	const text = (str, sizeMm, x, align = 'left') => {
		ops.push({ kind: 'text', str, sizeMm, x, y: y + sizeMm * 0.8 + (sizeMm * (LINE - 1)) / 2, align });
		y += sizeMm * LINE;
	};
	const rule = () => {
		y += GAP.rule / 2;
		ops.push({ kind: 'rule', y });
		y += GAP.rule / 2;
	};

	// Header block: masthead + stat lines, portrait to their right.
	const blockTop = y;
	const mBody = measurer(SIZE.body);
	const mHead = measurer(SIZE.masthead);
	let textRight = PAD_MM + mHead(masthead);
	text(masthead, SIZE.masthead, PAD_MM);
	y += 2 * PX;
	for (const line of header) {
		textRight = Math.max(textRight, PAD_MM + mBody(line));
		text(line, SIZE.body, PAD_MM);
		y += GAP.para - SIZE.body * (LINE - 1) * 0.5;
	}
	const blockBottom = y;
	rule();
	if (portraitImg) {
		// Centred in the blank space between the widest header line and the
		// paper's right edge; top no higher than the masthead, bottom no
		// lower than the rule under the stats.
		const gap = 1.5;
		const boxW = PAPER_MM - textRight - 2 * gap;
		const boxH = blockBottom - blockTop;
		const aspect = portraitImg.width / portraitImg.height;
		let h = boxH;
		let w = h * aspect;
		if (w > boxW) {
			w = Math.max(0, boxW);
			h = w / aspect;
		}
		if (w > 4) {
			const cx = (textRight + PAPER_MM) / 2;
			ops.push({ kind: 'img', img: portraitImg, x: cx - w / 2, y: blockTop + (boxH - h) / 2, w, h });
		}
	}

	// The story text ends with a newline; drop trailing blanks so they don't
	// add a second rule above the QR codes.
	while (story.length && story.at(-1) === '') story = story.slice(0, -1);
	for (const line of story) {
		if (line === '') {
			rule();
			continue;
		}
		for (const l of wrap(mBody, line, contentW)) text(l, SIZE.body, PAD_MM);
		y += GAP.para - SIZE.body * (LINE - 1) * 0.5;
	}
	rule();

	// QR codes, two per row, spaced evenly across the band.
	const mCap = measurer(SIZE.caption);
	const colGap = (contentW - 2 * QR.cell) / 3;
	const colX = [PAD_MM + colGap + QR.cell / 2, PAD_MM + 2 * colGap + 1.5 * QR.cell];
	for (let i = 0; i < qrs.length; i += 2) {
		const rowTop = y;
		let rowBottom = rowTop;
		for (let j = 0; j < 2 && i + j < qrs.length; j++) {
			const cx = colX[j];
			const img = qrImgs[i + j];
			if (img) ops.push({ kind: 'img', img, x: cx - QR.img / 2, y: rowTop, w: QR.img, h: QR.img });
			y = rowTop + QR.img + 1;
			for (const l of wrap(mCap, qrs[i + j].caption, QR.cell)) text(l, SIZE.caption, cx, 'center');
			rowBottom = Math.max(rowBottom, y);
		}
		y = rowBottom + QR.rowGap;
	}

	y += 2 * PX;
	const mCred = measurer(SIZE.credits);
	for (const line of credits) {
		for (const l of wrap(mCred, line, contentW)) text(l, SIZE.credits, PAPER_MM / 2, 'center');
	}
	y += 8 * PX;

	// Paint.
	const heightMm = y;
	const scale = Math.min(pxPerMm, Math.sqrt(MAX_CANVAS_AREA / (PAPER_MM * heightMm)));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(PAPER_MM * scale);
	canvas.height = Math.round(heightMm * scale);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#000';
	ctx.textBaseline = 'alphabetic';
	for (const op of ops) {
		if (op.kind === 'text') {
			ctx.font = `${op.sizeMm * scale}px ${MONO}`;
			ctx.textAlign = op.align;
			ctx.fillText(op.str, op.x * scale, op.y * scale);
		} else if (op.kind === 'rule') {
			ctx.save();
			ctx.strokeStyle = '#777';
			ctx.lineWidth = Math.max(1, 0.25 * scale);
			ctx.setLineDash([1 * scale, 0.8 * scale]);
			ctx.beginPath();
			ctx.moveTo(PAD_MM * scale, op.y * scale);
			ctx.lineTo((PAPER_MM - PAD_MM) * scale, op.y * scale);
			ctx.stroke();
			ctx.restore();
		} else if (op.kind === 'img') {
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(op.img, op.x * scale, op.y * scale, op.w * scale, op.h * scale);
		}
	}
	return canvas;
}

export function canvasToBlob(canvas) {
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export const RECEIPT_PAPER_MM = PAPER_MM;
