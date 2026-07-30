// Mix levels for the two audio layers that can be audible at the same time:
//
//   1. The bed -- static/audios/bg.opus, started as early as the browser
//      allows and looped for the whole session (see BackgroundMusic.svelte).
//   2. A clip's own soundtrack -- the intro clips' AAC tracks, played through
//      plain <audio> elements because the WebCodecs path decodes video only
//      (see videoPlayer.js), plus the <video> fallback for browsers without
//      WebCodecs.
//
// Both are set explicitly rather than left at the element default of 1, so the
// balance between them is one edit in one place instead of a property nobody
// set. The clip sits ~6 dB above the bed: it should be the thing you are
// listening to while a video runs, while the bed stays audible underneath
// rather than being replaced by it.
export const BG_VOLUME = 0.38;
export const CLIP_VOLUME = 0.78;

// The bed is ducked to a quarter level for the run itself -- from the "click
// anywhere to begin" click on the title screen until the Summary screen is
// reached. Everything in that stretch has something of its own to be heard
// over the music (the intro clips' soundtracks, then the stair log the player
// reads at their own pace), so the bed steps back for all of it and returns
// to full once the run is over. Applied as a multiplier on BG_VOLUME via the
// bgMusicScale store, so BG_VOLUME stays the single definition of "full".
export const BG_DUCKED_SCALE = 0.25;

// Ducking ramps rather than jumps. A step change in level reads as a glitch --
// a click or a sudden drop-out -- where a short ramp reads as the mix moving.
// Short enough to be finished well before the first event line lands.
export const BG_RAMP_MS = 600;

// The return to full level on the Summary screen gets its own, much slower
// ramp. Going DOWN has a deadline (the clip soundtrack it makes room for is
// already starting), but coming back UP has none -- the run is over and the
// bed swelling back is the closing gesture, so at 600ms it read as the music
// suddenly getting loud. BackgroundMusic picks between the two by direction:
// any decrease uses BG_RAMP_MS, any increase uses this.
export const BG_RESTORE_RAMP_MS = 3000;
