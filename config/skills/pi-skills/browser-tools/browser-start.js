#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const useProfile = process.argv[2] === "--profile";

if (process.argv[2] && process.argv[2] !== "--profile") {
	console.log("Usage: browser-start.js [--profile]");
	console.log("\nOptions:");
	console.log("  --profile  Copy your default Chrome profile (cookies, logins)");
	process.exit(1);
}

const isWindows = process.platform === "win32";
const homeDir = os.homedir();
const SCRAPING_DIR = isWindows
	? path.join(homeDir, ".cache", "browser-tools")
	: `${process.env.HOME}/.cache/browser-tools`;

function findChromePath() {
	if (isWindows) {
		const candidates = [
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
			path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
		].filter(Boolean);

		for (const p of candidates) {
			if (fs.existsSync(p)) return p;
		}
		return null;
	}

	// macOS/Linux fallback
	const unixCandidates = [
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium-browser",
		"/usr/bin/chromium",
	];
	for (const p of unixCandidates) {
		if (fs.existsSync(p)) return p;
	}
	return null;
}

const chromePath = findChromePath();
if (!chromePath) {
	console.error("✗ Could not find Chrome executable.");
	if (isWindows) {
		console.error("  Install Google Chrome or update browser-start.js with your chrome.exe path.");
	}
	process.exit(1);
}

// Check if already running on :9222
try {
	const browser = await puppeteer.connect({
		browserURL: "http://localhost:9222",
		defaultViewport: null,
	});
	await browser.disconnect();
	console.log("✓ Chrome already running on :9222");
	process.exit(0);
} catch {}

// Setup profile directory
if (isWindows) {
	execSync(`if not exist "${SCRAPING_DIR}" mkdir "${SCRAPING_DIR}"`, { stdio: "ignore" });
} else {
	execSync(`mkdir -p "${SCRAPING_DIR}"`, { stdio: "ignore" });
}

// Remove Singleton lock files
try {
	if (isWindows) {
		execSync(
			`del /f /q "${path.join(SCRAPING_DIR, "SingletonLock")}" "${path.join(SCRAPING_DIR, "SingletonSocket")}" "${path.join(SCRAPING_DIR, "SingletonCookie")}" 2>nul`,
			{ stdio: "ignore", shell: "cmd.exe" },
		);
	} else {
		execSync(`rm -f "${SCRAPING_DIR}/SingletonLock" "${SCRAPING_DIR}/SingletonSocket" "${SCRAPING_DIR}/SingletonCookie"`, { stdio: "ignore" });
	}
} catch {}

if (useProfile) {
	console.log("Syncing profile...");
	if (isWindows) {
		const defaultProfile = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
		if (!fs.existsSync(defaultProfile)) {
			console.error("✗ Could not find default Chrome profile to copy.");
			process.exit(1);
		}
		// Robocopy mirrors directories; ignore return codes >=8 as failure only
		try {
			execSync(`robocopy "${defaultProfile}" "${SCRAPING_DIR}" /MIR /XD "Crashpad" "ShaderCache" /XF "LOCK" /R:1 /W:1`, {
				stdio: "ignore",
				shell: "cmd.exe",
			});
		} catch {
			// robocopy often exits with non-zero for normal copy states; ignore
		}
	} else {
		execSync(
			`rsync -a --delete \
				--exclude='SingletonLock' \
				--exclude='SingletonSocket' \
				--exclude='SingletonCookie' \
				--exclude='*/Sessions/*' \
				--exclude='*/Current Session' \
				--exclude='*/Current Tabs' \
				--exclude='*/Last Session' \
				--exclude='*/Last Tabs' \
				"${process.env.HOME}/Library/Application Support/Google/Chrome/" "${SCRAPING_DIR}/"`,
			{ stdio: "pipe" },
		);
	}
}

// Start Chrome with flags to force new instance
spawn(
	chromePath,
	[
		"--remote-debugging-port=9222",
		`--user-data-dir=${SCRAPING_DIR}`,
		"--no-first-run",
		"--no-default-browser-check",
	],
	{ detached: true, stdio: "ignore" },
).unref();

// Wait for Chrome to be ready
let connected = false;
for (let i = 0; i < 30; i++) {
	try {
		const browser = await puppeteer.connect({
			browserURL: "http://localhost:9222",
			defaultViewport: null,
		});
		await browser.disconnect();
		connected = true;
		break;
	} catch {
		await new Promise((r) => setTimeout(r, 500));
	}
}

if (!connected) {
	console.error("✗ Failed to connect to Chrome");
	process.exit(1);
}

console.log(`✓ Chrome started on :9222${useProfile ? " with your profile" : ""}`);
