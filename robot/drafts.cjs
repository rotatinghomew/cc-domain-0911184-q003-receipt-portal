const { chromium } = require('playwright');
const { formValues, verifySaved } = require('./authorization.cjs');

async function fillDraft(page, baseUrl, item) {
  item = formValues(item);
  await page.goto(`${baseUrl}/?${new URLSearchParams({ account: item.account, business: item.business })}`);
  await page.locator('[name=title]').fill(item.title);
  await page.locator('[name=scope]').fill(item.scope);
  await page.locator('[name=version]').fill(String(item.version));
  await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('"state":"draft"'));
  const result = JSON.parse(await page.locator('#status').innerText());
  verifySaved(item, result.draft);
  return result;
}

async function savePending(baseUrl, worklist) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    for (const item of worklist.pending()) {
      await fillDraft(page, baseUrl, item);
      worklist.saved(item.account, item.business);
    }
  } finally { await browser.close(); }
}

module.exports = { fillDraft, savePending };
