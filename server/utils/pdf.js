const puppeteer = require('puppeteer');
const fs = require('fs');

// Shared browser instance to avoid re-launching Chrome on every request
let browserPromise = null;
let browser = null;

async function getLaunchOptions() {
  let execPath = null;
  let customArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-certificate-errors',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio'
  ];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  } else if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) {
        execPath = p;
        break;
      }
    }
  } else {
    // Linux / Railway / Container production environment
    const linuxSystemPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    for (const p of linuxSystemPaths) {
      if (fs.existsSync(p)) {
        execPath = p;
        break;
      }
    }

    if (!execPath) {
      try {
        const chromiumPkg = require('@sparticuz/chromium');
        const chromium = chromiumPkg.default || chromiumPkg;
        execPath = await chromium.executablePath();
        if (Array.isArray(chromium.args)) {
          customArgs = Array.from(new Set([...customArgs, ...chromium.args]));
        }
      } catch (err) {
        console.warn('[PDF] @sparticuz/chromium path lookup error:', err.message);
      }
    }
  }

  const opts = {
    headless: true,
    ignoreHTTPSErrors: true,
    args: customArgs
  };

  if (execPath) {
    console.log(`[PDF] Using executable: ${execPath}`);
    opts.executablePath = execPath;
  } else {
    console.log('[PDF] Using default bundled puppeteer chromium');
  }

  return opts;
}

async function getBrowser() {
  if (browser && browser.connected) return browser;

  if (!browserPromise) {
    browserPromise = (async () => {
      const opts = await getLaunchOptions();
      const b = await puppeteer.launch(opts);
      browser = b;
      browserPromise = null;
      browser.on('disconnected', () => {
        browser = null;
      });
      return browser;
    })();
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
