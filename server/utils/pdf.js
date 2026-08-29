const puppeteer = require('puppeteer');
const fs = require('fs');

// Shared browser instance to avoid re-launching Chrome on every request
let browserPromise = null;
let browser = null;

function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  if (process.platform === 'win32') {
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  const linuxPaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  if (process.platform === 'linux') {
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined; // Let puppeteer use its bundled/cached chromium
}

function launchOptions() {
  const opts = {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-first-run',
      '--disable-extensions'
    ]
  };
  const execPath = getExecutablePath();
  if (execPath) {
    opts.executablePath = execPath;
  }
  return opts;
}

async function getBrowser() {
  if (browser && browser.connected) return browser;

  if (!browserPromise) {
    browserPromise = puppeteer.launch(launchOptions()).then((b) => {
      browser = b;
      browserPromise = null;
      browser.on('disconnected', () => {
        browser = null;
      });
      return browser;
    });
  }

  try {
    browser = await browserPromise;
  } catch (err) {
    browserPromise = null;
    console.error('[PDF/Puppeteer] Failed to launch browser:', err);
    throw err;
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    try { await browser.close(); } catch { /* ignore */ }
    browser = null;
    browserPromise = null;
  }
}

process.on('exit', () => {
  if (browser) {
    browser.close().catch(() => {});
  }
});

module.exports = { getBrowser, closeBrowser };
