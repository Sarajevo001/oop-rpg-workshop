'use strict';

// Optional real-service diagnostic; not part of deterministic offline regression.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const branch = process.argv[2];
if (!branch || !/^[A-Za-z0-9_-]+$/.test(branch)) {
  throw new Error('Pass a single slash-free GitHub branch name');
}
const prefix = 'https://jsfiddle.net/gh/get/library/pure/Sarajevo001/oop-rpg-workshop/tree/' + branch + '/src/public/examples/';
const samples = [
  ['chapter0/demo', '第0章：クラスって何？'],
  ['chapter3/task1-starter', '第3章：仲間スライム、誰が操作するねん！'],
  ['chapter4/solution', '第4章：仲間スライム、お前の頭の中まで管理するんか！']
];

async function resultFrame(page, heading) {
  for (const frame of page.frames()) {
    try {
      if (await frame.getByRole('heading', { level: 1, name: heading, exact: true }).count()) return frame;
    } catch {
      // A frame may be replaced while JSFiddle runs.
    }
  }
  return null;
}

async function main() {
  const browser = await chromium.launch();
  let passed = 0;
  let failed = 0;
  let unknown = 0;
  try {
    for (const [stage, heading] of samples) {
      const page = await browser.newPage();
      page.setDefaultTimeout(5000);
      try {
        const response = await page.goto(prefix + stage + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
        const status = response?.status();
        console.log('HTTP', stage, status, page.url(), (await page.title()).slice(0, 120));
        if (!status || status === 401 || status === 403 || status === 429 || status >= 500) {
          console.log('INDETERMINATE', stage, 'external service/network blocked');
          unknown++;
          break;
        }
        if (status >= 400) {
          console.log('FAIL', stage, 'service returned HTTP ' + status);
          failed++;
          continue;
        }
        let frame = await resultFrame(page, heading);
        if (!frame) {
          for (const selector of ['#run', 'button[title="Run"]', 'a[title="Run"]']) {
            const run = page.locator(selector).first();
            if (await run.isVisible()) {
              await run.click();
              break;
            }
          }
          for (let i = 0; i < 12 && !frame; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            frame = await resultFrame(page, heading);
          }
        }
        if (!frame) {
          console.log('INDETERMINATE', stage, 'result frame not found', (await page.title()).slice(0, 120), page.frames().map(f => f.url().slice(0, 150)));
          unknown++;
          continue;
        }
        if (stage === 'chapter0/demo') {
          assert.match(await frame.locator('#after').innerText(), /HP:22/);
        } else {
          assert.ok(await frame.locator('.character').count() >= 2);
          await frame.locator('#next-turn').click();
          assert.match(await frame.locator('#log').innerText(), /ターン1/);
          await frame.locator('#reset').click();
          assert.equal(await frame.locator('#log').innerText(), '');
        }
        console.log('PASS', stage, 'actual JSFiddle result and operation');
        passed++;
      } catch (error) {
        if (error.name === 'AssertionError') {
          console.log('FAIL', stage, error.message.slice(0, 300));
          failed++;
        } else {
          console.log('INDETERMINATE', stage, error.message.slice(0, 300));
          unknown++;
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log('LIVE_JSFIDDLE_RESULT', JSON.stringify({ passed, failed, unknown, notRun: samples.length - passed - failed - unknown }));
  if (failed || unknown || passed !== samples.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
