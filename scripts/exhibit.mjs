#!/usr/bin/env node
// One-command exhibition start: builds the Chinese edition, serves it on
// this machine, and opens Chrome full-screen in kiosk mode with silent
// printing. Run with `npm run exhibit` (or double-click start-exhibit.*).
//
// Why a build + preview rather than `npm run dev`: the dev server compiles
// pages on demand (the first visitor waits), reloads the page if any file in
// the folder changes, and tags telemetry rows as 'dev'. The build served here
// is the same thing the website runs, with rows tagged 'cn' / 'kiosk'.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import os from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VITE = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const PORT = 4173;
const BASE = '/samsara_cn';
const URL_ = `http://localhost:${PORT}${BASE}/?kiosk`;
const env = { ...process.env, NODE_ENV: 'production', BASE_PATH: BASE, SAMSARA_EXHIBIT: '1' };

if (!existsSync(VITE)) {
	console.error('\n[!] 还没有安装依赖。请先在本文件夹运行：npm install --legacy-peer-deps\n');
	process.exit(1);
}

const rev = spawnSync('git', ['log', '-1', '--format=%h %cd', '--date=format:%Y-%m-%d %H:%M'], { cwd: ROOT, encoding: 'utf8' });
if (rev.status === 0) console.log(`\n当前版本：${rev.stdout.trim()}`);
console.log('\n[1/3] 正在构建游戏（约 10–30 秒）…\n');
const build = spawnSync(process.execPath, [VITE, 'build'], { cwd: ROOT, env, stdio: 'inherit' });
if (build.status !== 0) {
	console.error('\n[!] 构建失败，请把上面的报错截图发给技术人员。\n');
	process.exit(1);
}

console.log(`\n[2/3] 启动本机服务：${URL_}\n`);
const server = spawn(process.execPath, [VITE, 'preview', '--port', String(PORT), '--strictPort'], {
	cwd: ROOT,
	env,
	stdio: 'inherit',
});
server.on('exit', code => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));

function waitForServer(tries = 60) {
	return new Promise((resolve, reject) => {
		const attempt = n => {
			http
				.get(URL_, res => {
					res.resume();
					resolve();
				})
				.on('error', () => (n > 0 ? setTimeout(() => attempt(n - 1), 500) : reject()));
		};
		attempt(tries);
	});
}

function findChrome() {
	const candidates = {
		win32: [
			join(process.env['PROGRAMFILES'] ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
			join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
			join(process.env['LOCALAPPDATA'] ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
		],
		darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
		linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
	}[process.platform] ?? [];
	return candidates.find(p => p && existsSync(p));
}

try {
	await waitForServer();
} catch {
	console.error('\n[!] 本机服务没有启动起来，请把上面的报错截图发给技术人员。\n');
	server.kill();
	process.exit(1);
}

const chrome = findChrome();
if (!chrome || process.argv.includes('--no-browser')) {
	console.log(`\n[3/3] 请用 Chrome 打开：${URL_}\n（不要关闭这个窗口，关掉它游戏就停了）\n`);
} else {
	// A separate profile, so the kiosk flags apply even if Chrome is already
	// open, and the exhibition never inherits someone's tabs or extensions.
	const profile = join(os.homedir(), '.samsara-exhibit-chrome');
	mkdirSync(profile, { recursive: true });
	spawn(
		chrome,
		[
			'--kiosk', // full screen, no address bar
			// Receipts are printed by this server itself (exhibit-printer.js), with
			// no browser dialog. --kiosk-printing only covers the fallback path,
			// should that ever fail.
			'--kiosk-printing',
			'--autoplay-policy=no-user-gesture-required', // let the intro music start on its own
			'--no-first-run',
			'--no-default-browser-check',
			'--disable-translate',
			'--disable-pinch',
			'--overscroll-history-navigation=0',
			`--user-data-dir=${profile}`,
			URL_,
		],
		{ detached: true, stdio: 'ignore' }
	).unref();
	console.log('\n[3/3] 已打开全屏游戏。\n（不要关闭这个窗口，关掉它游戏就停了）\n');
}
