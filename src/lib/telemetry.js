// Fire-and-forget run telemetry -> Supabase (PostgREST), no SDK dependency.
//
// GitHub Pages is static hosting, so the "database" is a Supabase project
// the page writes to directly with its anon key. The key is safe to ship in
// the bundle ONLY because the `runs` table's row-level security grants anon
// INSERT and nothing else (see supabase/runs.sql) -- readers need the
// service key or the dashboard.
//
// Config comes from Vite env vars baked in at build time:
//   VITE_SUPABASE_URL      e.g. https://abcd1234.supabase.co
//   VITE_SUPABASE_ANON_KEY the project's anon/public key
// Both unset (the default) disables telemetry entirely -- local dev and
// forks record nothing. Never throw and never await from callers: a downed
// network at the installation must not be observable in the game.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const telemetryEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// The kiosk build is the same deployment as the public one -- the exhibition
// machine just loads the page with ?kiosk appended, so rows from the floor
// installation and from visitors' own phones stay distinguishable.
const SOURCE =
	typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('kiosk')
		? 'kiosk'
		: 'web';

// Which deployment wrote the row: the two GitHub Pages sites build with
// different base paths (/samsara/ vs /samsara_test/), so the vite BASE_URL
// baked into each bundle already fingerprints prod vs test -- no extra
// secret or workflow wiring needed. Local dev ('/') records as 'dev'.
const DEPLOYMENT =
	import.meta.env.BASE_URL === '/samsara/' ? 'prod'
	: import.meta.env.BASE_URL === '/samsara_test/' ? 'test'
	: 'dev';

export function recordRun(run) {
	if (!telemetryEnabled) return;
	try {
		fetch(`${SUPABASE_URL}/rest/v1/runs`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
				// No representation back -- we don't read, so don't ask.
				Prefer: 'return=minimal'
			},
			body: JSON.stringify({ ...run, source: SOURCE, deployment: DEPLOYMENT }),
			// Survives the page being torn down mid-request (idle restarts).
			keepalive: true
		}).catch(() => {});
	} catch {
		// Telemetry must never break the game.
	}
}
