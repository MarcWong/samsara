// WebCodecs-based canvas video playback.
//
// Why not a plain <video> element: the intro needs (a) a seamless switch
// from a looping ambient clip to a one-shot transition clip with no black
// flash or decoder spin-up visible, and (b) a hard, reliable freeze on the
// transition clip's final frame. <video> gives you neither guarantee --
// its end-of-stream behavior (flicker, last-frame blanking) is up to the
// browser. Decoding manually via VideoDecoder means every frame is drawn
// by us, so "freeze on the last frame" is simply "stop drawing new
// frames": the canvas keeps whatever was painted last.
//
// VideoDecoder consumes raw encoded samples, not an MP4 container, so
// mp4box.js demuxes the fetched file into EncodedVideoChunks first. The
// chunks are tiny (compressed); only a small rolling window of decoded
// VideoFrames (which are huge) is ever alive at once -- see the
// backpressure logic in play().

import { createFile, DataStream, MP4BoxBuffer } from 'mp4box';

export function webCodecsSupported() {
	return typeof VideoDecoder !== 'undefined';
}

// The avcC/hvcC "description" blob VideoDecoder needs for H.264/H.265:
// serialize the sample-entry config box and strip its 8-byte box header
// (size + fourcc) -- the standard mp4box-to-WebCodecs recipe. VP8/VP9/AV1
// need no description, so absence is fine.
function extractDescription(file, trackId) {
	const trak = file.getTrackById(trackId);
	for (const entry of trak.mdia.minf.stbl.stsd.entries) {
		const box = entry.avcC ?? entry.hvcC;
		if (box) {
			const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
			box.write(stream);
			return new Uint8Array(stream.buffer, 8);
		}
	}
	return undefined;
}

// fetch -> ArrayBuffer -> demux. Resolves to a reusable media object
// ({ config, chunks }) that can be handed to CanvasVideoPlayer.play() any
// number of times -- chunks are just compressed samples, cheap to keep.
export async function loadMp4(url) {
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`fetch ${url}: HTTP ${resp.status}`);
	const buffer = await resp.arrayBuffer();

	return new Promise((resolve, reject) => {
		const file = createFile();
		const chunks = [];
		let config = null;
		let nbSamples = 0;

		file.onError = e => reject(new Error(`mp4 demux failed for ${url}: ${e}`));
		file.onReady = info => {
			const track = info.videoTracks[0];
			if (!track) {
				reject(new Error(`${url} has no video track`));
				return;
			}
			nbSamples = track.nb_samples;
			config = {
				codec: track.codec,
				codedWidth: track.video.width,
				codedHeight: track.video.height,
				description: extractDescription(file, track.id),
			};
			file.setExtractionOptions(track.id, null, { nbSamples: Infinity });
			file.start();
		};
		file.onSamples = (id, user, samples) => {
			for (const s of samples) {
				chunks.push(
					new EncodedVideoChunk({
						type: s.is_sync ? 'key' : 'delta',
						timestamp: Math.round((1e6 * s.cts) / s.timescale),
						duration: Math.round((1e6 * s.duration) / s.timescale),
						data: s.data,
					}),
				);
			}
			if (config && chunks.length >= nbSamples) resolve({ config, chunks });
		};

		file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
		file.flush();
		// The whole file was appended in one shot, so all callbacks have
		// fired by the next tick -- this settles the promise if the sample
		// count bookkeeping above never tripped (and rejects cleanly if
		// parsing silently produced nothing).
		setTimeout(() => {
			if (config && chunks.length > 0) resolve({ config, chunks });
			else reject(new Error(`mp4 demux produced no samples for ${url}`));
		}, 0);
	});
}

export class CanvasVideoPlayer {
	#canvas;
	#ctx;
	#session = null;
	// The most recently painted frame, kept open (not closed) so the canvas
	// can be repainted after a resize -- resizing a canvas clears it, and
	// during the "frozen on last frame" phase there is no playback loop
	// left to repaint it for us.
	#lastFrame = null;

	constructor(canvas) {
		this.#canvas = canvas;
		this.#ctx = canvas.getContext('2d');
	}

	// Repaint the current frame (after e.g. a canvas resize).
	redraw() {
		if (this.#lastFrame) this.#paint(this.#lastFrame);
	}

	// object-fit: cover -- fill the canvas, center, crop the overflow.
	#paint(frame) {
		const cw = this.#canvas.width;
		const ch = this.#canvas.height;
		if (!cw || !ch) return;
		const fw = frame.displayWidth;
		const fh = frame.displayHeight;
		const s = Math.max(cw / fw, ch / fh);
		const dw = fw * s;
		const dh = fh * s;
		this.#ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
	}

	#present(frame) {
		this.#paint(frame);
		this.#lastFrame?.close();
		this.#lastFrame = frame;
	}

	// Plays a demuxed media object. loop:true restarts seamlessly (the
	// canvas keeps the last frame across the restart, so even the brief
	// re-decode of the first GOP shows no gap). Without loop, the final
	// frame stays frozen on the canvas and onEnded fires. rate scales the
	// presentation clock (0.5 = half speed) -- decode order and frame
	// selection are untouched, frames simply become due later.
	play(media, { loop = false, onEnded = null, rate = 1 } = {}) {
		this.stop(false); // keep #lastFrame: bridges the switch between clips
		const { config, chunks } = media;

		const session = { aborted: false, raf: 0, timer: 0, flushing: false };
		this.#session = session;

		// Rolling window: decoded frames waiting to be presented. VideoFrames
		// are uncompressed (megabytes each), so feeding is throttled below to
		// keep at most a handful alive instead of decoding the whole clip.
		const frames = [];
		let feedIndex = 0;
		let flushDone = false;

		const decoder = new VideoDecoder({
			output: frame => {
				if (session.aborted) frame.close();
				else frames.push(frame);
			},
			error: err => console.error('[videoPlayer] decode error', err),
		});
		decoder.configure(config);

		const pump = () => {
			while (feedIndex < chunks.length && decoder.decodeQueueSize < 6 && frames.length < 6) {
				decoder.decode(chunks[feedIndex++]);
			}
			if (feedIndex >= chunks.length && !session.flushing) {
				session.flushing = true;
				decoder
					.flush()
					.then(() => {
						flushDone = true;
					})
					.catch(() => {});
			}
		};

		let baseTime = null;
		let ended = false;
		const tick = now => {
			if (session.aborted || ended) return;
			pump();
			if (frames.length) {
				// Decoder outputs arrive in presentation order; anchor the
				// clock to the first presented frame's own timestamp.
				if (baseTime === null) baseTime = now - frames[0].timestamp / (1000 * rate);
				const mediaTimeUs = (now - baseTime) * 1000 * rate;
				while (frames.length && frames[0].timestamp <= mediaTimeUs) {
					const frame = frames.shift();
					const lastEligible = !frames.length || frames[0].timestamp > mediaTimeUs;
					if (lastEligible) this.#present(frame);
					else frame.close(); // running late: drop, don't draw stale frames
				}
			}
			if (flushDone && frames.length === 0) {
				ended = true;
				cancelAnimationFrame(session.raf);
				clearInterval(session.timer);
				try {
					decoder.close();
				} catch {
					/* already closed */
				}
				if (loop) this.play(media, { loop, onEnded, rate });
				else {
					this.#session = null;
					onEnded?.();
				}
			}
		};
		// Two drivers for the same tick: rAF for frame-accurate pacing while
		// the page is visible, plus a coarse interval heartbeat so decode and
		// playback keep making real-time progress even when the browser
		// throttles rAF (occluded window, background tab) -- with rAF alone,
		// decoding stalls to a few frames per second and the clip crawls in
		// slow motion (observed live in an occluded window).
		const rafLoop = now => {
			if (session.aborted || ended) return;
			tick(now);
			session.raf = requestAnimationFrame(rafLoop);
		};
		session.raf = requestAnimationFrame(rafLoop);
		session.timer = setInterval(() => tick(performance.now()), 200);

		session.abort = () => {
			session.aborted = true;
			cancelAnimationFrame(session.raf);
			clearInterval(session.timer);
			for (const f of frames) f.close();
			frames.length = 0;
			try {
				decoder.close();
			} catch {
				/* already closed */
			}
		};
	}

	stop(clearLastFrame = true) {
		this.#session?.abort?.();
		this.#session = null;
		if (clearLastFrame) {
			this.#lastFrame?.close();
			this.#lastFrame = null;
		}
	}
}
