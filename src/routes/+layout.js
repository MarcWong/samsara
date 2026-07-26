// This is a stateful client app with no SEO-relevant content — the whole
// game lives behind one route with client-side view-state (see the
// migration plan), so SSR has nothing to gain and disabling it outright
// avoids needing browser-guards through the ported game-logic layer.
export const ssr = false;
export const prerender = true;
