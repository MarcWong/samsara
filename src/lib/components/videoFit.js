// How the 16:9 footage is fitted to the screen, shared by the video canvas
// and every overlay pinned onto the footage (country doors, orientation
// doors, the allocation panel), so they can never disagree.
//
// Always fit the HEIGHT. On a screen narrower than 16:9 (16:10 laptops,
// tablets) that is the same as object-fit: cover -- the sides are cropped,
// nothing important lives there. On a screen WIDER than 16:9 (phones in
// landscape, more so inside WeChat's browser with its title bar) cover used
// to crop the top and bottom instead, cutting off the top row of doors, the
// allocation panel's title and its Start button. Fitting the height keeps
// the whole frame visible there and leaves dark bars at the sides.
export function fitScale(cw, ch, fw, fh) {
	return ch / fh;
}

// The fitted video rectangle as an absolute-position style string.
export function fitRectStyle(cw, ch, fw, fh) {
	if (!cw || !ch) return 'display: none;';
	const s = fitScale(cw, ch, fw, fh);
	const dw = fw * s;
	const dh = fh * s;
	return `left: ${(cw - dw) / 2}px; top: ${(ch - dh) / 2}px; width: ${dw}px; height: ${dh}px;`;
}

// Background behind the footage (matches .video-stage in VideoStage.svelte).
export const STAGE_BG = '#0d1418';
