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
// Side margins. The exhibit server places the image at the printer's own
// printable edge and scales it to the printable width. On the exhibition
// printer that band sits right of the paper's centre: with equal 1.5mm
// margins the text needed to move about one character (~2.6mm) LEFT, and
// moving it right ran the text off the paper. The image cannot start left
// of the printable edge, so the shift comes out of the right margin and the
// band loses about one character per line. To move it again, change the
// difference between the two (right - left = 2 x the leftward shift).
// Then the right side printed about two characters short of the left, so
// the band was widened by two characters (2 x ~2.65mm) into the right margin.
const PAD_LEFT_MM = 0.3;
const PAD_RIGHT_MM = 0.3;
const TOP_MM = 2;
const RIGHT_EDGE_MM = PAPER_MM - PAD_RIGHT_MM;
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
 * @param {boolean} [r.mono]      pure black/white for a thermal printer
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderReceipt({ masthead, header, story, qrs, credits, portrait, pxPerMm, mono = false }) {
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
	// The font is set on every call: the measurers share one context, and
	// setting it once at creation left the body text measured at the
	// masthead's larger size, so every line wrapped ~20% early.
	const measurer = sizeMm => {
		const font = `${sizeMm * REF}px ${MONO}`;
		return text => {
			probe.font = font;
			return probe.measureText(text).width / REF;
		};
	};

	const contentW = RIGHT_EDGE_MM - PAD_LEFT_MM;
	const ops = [];
	let y = TOP_MM;

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
	let textRight = PAD_LEFT_MM + mHead(masthead);
	text(masthead, SIZE.masthead, PAD_LEFT_MM);
	y += 2 * PX;
	for (const line of header) {
		textRight = Math.max(textRight, PAD_LEFT_MM + mBody(line));
		text(line, SIZE.body, PAD_LEFT_MM);
		y += GAP.para - SIZE.body * (LINE - 1) * 0.5;
	}
	const blockBottom = y;
	rule();
	if (portraitImg) {
		// Centred in the blank space between the widest header line and the
		// right edge of the printed band; top no higher than the masthead, bottom no
		// lower than the rule under the stats.
		const gap = 1.5;
		const boxW = RIGHT_EDGE_MM - textRight - 2 * gap;
		const boxH = blockBottom - blockTop;
		const aspect = portraitImg.width / portraitImg.height;
		let h = boxH;
		let w = h * aspect;
		if (w > boxW) {
			w = Math.max(0, boxW);
			h = w / aspect;
		}
		if (w > 4) {
			const cx = (textRight + RIGHT_EDGE_MM) / 2;
			ops.push({ kind: 'img', img: portraitImg, x: cx - w / 2, y: blockTop + (boxH - h) / 2, w, h, photo: true });
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
		for (const l of wrap(mBody, line, contentW)) text(l, SIZE.body, PAD_LEFT_MM);
		y += GAP.para - SIZE.body * (LINE - 1) * 0.5;
	}
	rule();

	// QR codes, two per row, spaced evenly across the band.
	const mCap = measurer(SIZE.caption);
	const colGap = (contentW - 2 * QR.cell) / 3;
	const colX = [PAD_LEFT_MM + colGap + QR.cell / 2, PAD_LEFT_MM + 2 * colGap + 1.5 * QR.cell];
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
		for (const l of wrap(mCred, line, contentW)) text(l, SIZE.credits, PAD_LEFT_MM + contentW / 2, 'center');
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
			ctx.moveTo(PAD_LEFT_MM * scale, op.y * scale);
			ctx.lineTo(RIGHT_EDGE_MM * scale, op.y * scale);
			ctx.stroke();
			ctx.restore();
		} else if (op.kind === 'img') {
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(op.img, op.x * scale, op.y * scale, op.w * scale, op.h * scale);
		}
	}
	if (mono) toThermal(ctx, canvas.width, canvas.height, ops.filter(op => op.photo), scale);
	return canvas;
}

// A thermal head only prints black dots. Handed a grey anti-aliased image,
// the printer driver turns every soft text edge into a halftone fringe, which
// read as blurry type. So for printing: text, rules and QR codes are cut to
// pure black/white at a fixed threshold, and the portrait -- the one real
// greyscale picture -- is error-diffused (Floyd-Steinberg) here, at the
// printer's own resolution, so the driver has nothing left to resample.
function toThermal(ctx, w, h, photos, scale) {
	const image = ctx.getImageData(0, 0, w, h);
	const d = image.data;
	const inPhoto = new Uint8Array(w * h);
	for (const p of photos) {
		const x0 = Math.max(0, Math.floor(p.x * scale));
		const y0 = Math.max(0, Math.floor(p.y * scale));
		const x1 = Math.min(w, Math.ceil((p.x + p.w) * scale));
		const y1 = Math.min(h, Math.ceil((p.y + p.h) * scale));
		const lum = new Float32Array((x1 - x0) * (y1 - y0));
		const pw = x1 - x0;
		for (let y = y0; y < y1; y++)
			for (let x = x0; x < x1; x++) {
				const i = (y * w + x) * 4;
				lum[(y - y0) * pw + (x - x0)] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
				inPhoto[y * w + x] = 1;
			}
		const ph = y1 - y0;
		for (let y = 0; y < ph; y++)
			for (let x = 0; x < pw; x++) {
				const k = y * pw + x;
				const old = lum[k];
				const v = old < 128 ? 0 : 255;
				const err = old - v;
				lum[k] = v;
				if (x + 1 < pw) lum[k + 1] += (err * 7) / 16;
				if (y + 1 < ph) {
					if (x > 0) lum[k + pw - 1] += (err * 3) / 16;
					lum[k + pw] += (err * 5) / 16;
					if (x + 1 < pw) lum[k + pw + 1] += err / 16;
				}
				const i = ((y + y0) * w + (x + x0)) * 4;
				d[i] = d[i + 1] = d[i + 2] = v;
				d[i + 3] = 255;
			}
	}
	for (let k = 0, i = 0; k < w * h; k++, i += 4) {
		if (inPhoto[k]) continue;
		const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 150 ? 0 : 255;
		d[i] = d[i + 1] = d[i + 2] = v;
		d[i + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
}

export function canvasToBlob(canvas) {
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export const RECEIPT_PAPER_MM = PAPER_MM;
// Bump when the printed layout changes; the exhibit server logs it per print.
export const RECEIPT_VERSION = 'bw-wide-2ch';
