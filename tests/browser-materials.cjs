'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../src/public');
const stages = ['chapter0/demo', ...[1, 2, 3, 4].flatMap(chapter =>
  (chapter === 3 ? ['starter', 'task1-starter', 'task1', 'task2', 'solution'] :
    ['starter', 'task1', 'task2', 'solution']).map(stage => 'chapter' + chapter + '/' + stage))];
const files = ['demo.html', 'demo.css', 'demo.js', 'demo.details'];
const representative = ['chapter0/demo', 'chapter3/task1-starter', 'chapter4/solution'];
const failures = [];

function material(stage, file) {
  return path.join(root, 'examples', stage, file);
}

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const fiddle = pathname.match(/^\/fiddle\/(chapter\d\/[\w-]+)\/$/);
      if (fiddle) {
        assert.ok(stages.includes(fiddle[1]));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="demo.css"></head><body>' +
          fs.readFileSync(material(fiddle[1], 'demo.html'), 'utf8') +
          '<script src="demo.js"></script></body></html>');
        return;
      }
      pathname = pathname.replace(/^\/fiddle\//, '/examples/');
      let filename = path.resolve(root, '.' + pathname);
      assert.ok(filename.startsWith(root + path.sep));
      if (fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.details': 'text/plain; charset=utf-8' };
      res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
      res.end(fs.readFileSync(filename));
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function run(label, fn) {
  try {
    await fn();
    console.log('PASS', label);
  } catch (error) {
    failures.push(label + ': ' + error.message);
    console.error('FAIL', label, error.message);
  }
}

async function game(browser, stage, url, checkRequests = true) {
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  try {
    await page.goto(url, { waitUntil: 'load' });
    const heading = fs.readFileSync(material(stage, 'demo.html'), 'utf8').match(/<h1>([^<]+)<\/h1>/)[1];
    assert.equal(await page.locator('h1').innerText(), heading, 'Japanese heading');
    assert.equal(await page.evaluate(() => document.characterSet), 'UTF-8', 'document encoding');
    assert.equal(await page.evaluate(() => document.compatMode), 'CSS1Compat', 'document rendering mode');
    assert.equal(await page.locator('link[rel="stylesheet"][href="demo.css"]').count(), 1, 'stylesheet element count');
    assert.equal(await page.locator('script[src="demo.js"]').count(), 1, 'script element count');
    if (checkRequests) {
      for (const file of ['demo.css', 'demo.js']) {
        assert.equal(requests.filter(item => item.endsWith('/' + file)).length, 1, file + ' request count');
      }
    }
    if (stage === 'chapter0/demo') {
      assert.match(await page.locator('#before').innerText(), /HP:30/);
      assert.match(await page.locator('#after').innerText(), /HP:22/);
    } else {
      const actors = page.locator('.character');
      assert.ok(await actors.count() >= 2, 'characters rendered');
      const initial = await actors.allTextContents();
      assert.ok(initial.some(text => text.includes('勇者')), 'hero rendered');
      if (await page.locator('#friend-target').count()) {
        assert.ok(await page.locator('#friend-target option').count() > 0, 'target options');
      }
      await page.locator('#next-turn').click();
      assert.equal(await page.evaluate(() => turnNumber), 1, 'turn advances');
      assert.match(await page.locator('#log').innerText(), /ターン1/);
      await page.locator('#reset').click();
      assert.equal(await page.evaluate(() => turnNumber), 0, 'turn reset');
      assert.deepEqual(await actors.allTextContents(), initial, 'initial character state restored');
    }
    assert.deepEqual(errors, [], 'uncaught JavaScript errors');
  } finally {
    await page.close();
  }
}

async function downloads(browser, origin) {
  const context = await browser.newContext({ acceptDownloads: true });
  // Use a real origin-private file system instead of a native folder dialog.
  await context.addInitScript(() => {
    window.showDirectoryPicker = async () => navigator.storage.getDirectory();
  });
  const page = await context.newPage();
  const link = stage => origin + '/examples/download.html?stage=' + stage;
  const reset = () => page.evaluate(async () => {
    const directory = await navigator.storage.getDirectory();
    for await (const [name] of directory.entries()) await directory.removeEntry(name, { recursive: true });
  });
  const read = file => page.evaluate(async name => {
    const directory = await navigator.storage.getDirectory();
    return Array.from(new Uint8Array(await (await (await directory.getFileHandle(name)).getFile()).arrayBuffer()));
  }, file);
  const saved = async () => {
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('4ファイルの保存が完了しました。'));
  };
  try {
    for (const stage of stages) {
      await run('download bytes ' + stage, async () => {
        await page.goto(link(stage));
        await reset();
        assert.equal(await page.locator('#individual a').count(), 4);
        await page.locator('#download-all').click();
        await saved();
        for (const file of files) assert.deepEqual(Buffer.from(await read(file)), fs.readFileSync(material(stage, file)));
      });
    }
    const stage = 'chapter4/solution';
    await run('overwrite rejection preserves bytes', async () => {
      await page.goto(link(stage));
      await reset();
      await page.evaluate(async () => {
        const d = await navigator.storage.getDirectory();
        const w = await (await d.getFileHandle('demo.js', { create: true })).createWritable();
        await w.write('keep'); await w.close();
      });
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('#download-all').click();
      await page.waitForFunction(() => document.querySelector('#status').textContent === '保存を中止しました。');
      assert.equal(Buffer.from(await read('demo.js')).toString(), 'keep');
    });
    await run('overwrite acceptance saves exact bytes', async () => {
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#download-all').click();
      await saved();
      for (const file of files) assert.deepEqual(Buffer.from(await read(file)), fs.readFileSync(material(stage, file)));
    });
    await run('picker cancellation', async () => {
      await page.goto(link(stage));
      await page.evaluate(() => { window.showDirectoryPicker = async () => { throw new DOMException('Cancelled', 'AbortError'); }; });
      await page.locator('#download-all').click();
      await page.waitForFunction(() => document.querySelector('#status').textContent === '処理を中止しました。');
      assert.equal(await page.locator('#download-all').isEnabled(), true);
    });
    await run('fetch failure leaves zero new files', async () => {
      await page.goto(link(stage));
      await reset();
      await page.route('**/examples/chapter4/solution/demo.css', route => route.fulfill({ status: 404, body: 'missing' }));
      try {
        await page.locator('#download-all').click();
        await page.waitForFunction(() => document.querySelector('#status').textContent.includes('保存完了: 0件'));
        const names = await page.evaluate(async () => {
          const d = await navigator.storage.getDirectory();
          const result = []; for await (const [name] of d.entries()) result.push(name); return result;
        });
        assert.deepEqual(names, []);
      } finally {
        await page.unroute('**/examples/chapter4/solution/demo.css');
      }
    });
    await run('invalid stage rejected', async () => {
      await page.goto(link('../archive'));
      assert.equal(await page.locator('#download-all').isDisabled(), true);
      assert.equal(await page.locator('#individual a').count(), 0);
    });
  } finally {
    await context.close();
  }
  const fallback = await browser.newContext({ acceptDownloads: true });
  await fallback.addInitScript(() => { window.showDirectoryPicker = undefined; });
  const individual = await fallback.newPage();
  try {
    await run('fallback individual downloads exact bytes', async () => {
      const stage = 'chapter3/task1-starter';
      await individual.goto(link(stage));
      for (const file of files) {
        const [download] = await Promise.all([individual.waitForEvent('download'), individual.getByRole('link', { name: file, exact: true }).click()]);
        assert.equal(download.suggestedFilename(), file);
        assert.deepEqual(fs.readFileSync(await download.path()), fs.readFileSync(material(stage, file)));
      }
    });
  } finally {
    await fallback.close();
  }
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const origin = 'http://localhost:' + port;
  let browser;
  try {
    browser = await chromium.launch({ args: ['--no-proxy-server', '--host-resolver-rules=MAP fiddle.test 127.0.0.1, MAP demo.sarajevo.jp 127.0.0.1'] });
    for (const stage of stages) {
      await run('localhost ' + stage, () => game(browser, stage, origin + '/examples/' + stage + '/demo.html'));
    }
    for (const stage of representative) {
      await run('file ' + stage, () => game(browser, stage, pathToFileURL(material(stage, 'demo.html')).href, false));
      await run('JSFiddle-style wrapper ' + stage, () => game(browser, stage, 'http://fiddle.test:' + port + '/fiddle/' + stage + '/'));
    }
    await run('127.0.0.1 host', () => game(browser, 'chapter3/task1-starter', 'http://127.0.0.1:' + port + '/examples/chapter3/task1-starter/demo.html'));
    await run('production hostname simulated locally', () => game(browser, 'chapter4/solution', 'http://demo.sarajevo.jp:' + port + '/examples/chapter4/solution/demo.html'));
    await downloads(browser, origin);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('PASS: browser regression; native folder picker and actual JSFiddle service are outside this test');
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
