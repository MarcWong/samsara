// Vite plugin: the exhibition's silent printer.
//
// Active only under `npm run exhibit` (SAMSARA_EXHIBIT=1). The summary page
// renders the receipt to a PNG and POSTs it to <base>/__exhibit/print; this
// prints it on the machine's DEFAULT printer with no dialog at all -- the
// browser's own print path always shows at least a flash of Chrome's print
// window, and with --disable-print-preview a dialog that needs a click.
//
//   Windows: scripts/print-receipt.ps1 (built-in .NET printing, no extra
//            software) -- fits the image to the printer's printable width.
//   macOS / Linux: `lp -o fit-to-page`.
//   SAMSARA_PRINT_DRYRUN=1: save to print-dryrun.png instead of printing.
import { spawn } from 'node:child_process';
import { writeFile, unlink, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BYTES = 30 * 1024 * 1024;

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { windowsHide: true });
		let err = '';
		p.stderr.on('data', d => (err += d));
		p.stdout.on('data', d => (err += d));
		p.on('error', reject);
		p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.trim()}`))));
	});
}

async function printPng(file) {
	if (process.env.SAMSARA_PRINT_DRYRUN === '1') {
		await copyFile(file, join(ROOT, 'print-dryrun.png'));
		return;
	}
	if (process.platform === 'win32') {
		await run('powershell.exe', [
			'-NoProfile',
			'-NonInteractive',
			'-ExecutionPolicy',
			'Bypass',
			'-File',
			join(ROOT, 'scripts', 'print-receipt.ps1'),
			'-Path',
			file,
		]);
	} else {
		await run('lp', ['-o', 'fit-to-page', file]);
	}
}

// One job at a time, in order.
let queue = Promise.resolve();

export function exhibitPrinter() {
	return {
		name: 'samsara-exhibit-printer',
		configurePreviewServer(server) {
			if (process.env.SAMSARA_EXHIBIT !== '1') return;
			server.middlewares.use((req, res, next) => {
				const path = (req.url ?? '').split('?')[0];
				// Never let the kiosk browser keep an old page: hashed assets are
				// fine to cache, the HTML that points at them is not.
				if (!path.includes('/_app/immutable/')) res.setHeader('Cache-Control', 'no-store');
				if (path.endsWith('/__exhibit/ping')) {
					res.setHeader('Content-Type', 'text/plain');
					res.end('samsara-exhibit');
					return;
				}
				if (!path.endsWith('/__exhibit/print') || req.method !== 'POST') return next();
				const chunks = [];
				let size = 0;
				req.on('data', c => {
					size += c.length;
					if (size > MAX_BYTES) req.destroy();
					else chunks.push(c);
				});
				req.on('end', () => {
					const file = join(tmpdir(), `samsara-receipt-${Date.now()}.png`);
					const png = Buffer.concat(chunks);
					const version = req.headers['x-samsara-receipt'];
					const size = png.length > 24 ? `${png.readUInt32BE(16)}×${png.readUInt32BE(20)}` : '?';
					if (!version) {
						console.warn(
							'[!] 这张小票来自旧版页面（字会发虚、边距不对）。请按 Alt+F4 关掉游戏窗口，关掉这个黑色窗口，再重新双击启动文件。'
						);
					}
					const job = queue.then(async () => {
						await writeFile(file, png);
						try {
							await printPng(file);
						} finally {
							unlink(file).catch(() => {});
						}
					});
					queue = job.catch(() => {});
					job.then(
						() => {
							console.log(`[打印] 已发送到默认打印机 ${new Date().toLocaleTimeString()}（小票版本 ${version ?? '旧版'}，${size} 像素）`);
							res.end('ok');
						},
						err => {
							console.error('[!] 打印失败：', err.message);
							res.statusCode = 500;
							res.end(err.message);
						}
					);
				});
			});
		},
	};
}
