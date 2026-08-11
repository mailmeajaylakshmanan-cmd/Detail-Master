const puppeteer = require('puppeteer');

// Shared browser instance. Launching Chrome is the single most expensive step
// in PDF generation (2-5s+ per request), so reuse one browser across requests.
let browserPromise = null;
let browser = null;

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
    ],
  };
}

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

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
