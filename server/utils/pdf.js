const puppeteer = require('puppeteer');

// Shared browser instance. Launching Chrome is the single most expensive step
// in PDF generation (2-5s+ per request), so reuse one browser across requests.
let browserPromise = null;
let browser = null;

const fs = require('fs');

function getExecutablePath() {
  const winPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const winPathx86 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'win32') {
    if (fs.existsSync(winPath)) return winPath;
    if (fs.existsSync(winPathx86)) return winPathx86;
  }
  return undefined; // Let puppeteer use its bundled chromium
}

function launchOptions() {
  return {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--disable-gpu',
      '--pipe',
    ],
  };
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
    require('fs').writeFileSync('C:/Users/ajay2/.gemini/antigravity-ide/brain/16e8cef9-ae0d-4e43-9a46-2cd6a34d58a8/scratch/puppeteer_error.txt', String(err.stack));
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
