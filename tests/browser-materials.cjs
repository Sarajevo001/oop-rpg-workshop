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

async function chapterStickers(browser, origin, viewport, chapter) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    // External history images are not part of this local presentation test.
    await page.route('**/*', route => {
      if (route.request().url().startsWith(origin + '/') === true) {
        return route.continue();
      }
      return route.abort();
    });
    await page.goto(origin + '/presentations/chapter' + chapter.number + '/index.html', { waitUntil: 'load' });
    const slides = page.locator('.slide');
    assert.equal(await slides.count(), chapter.slideCount);
    assert.equal(await page.locator('.try-sticker').count(), 2);
    assert.equal(await page.locator('.role-sticker').count(), 2);
    const expected = new Map([
      [chapter.tryPages[0], "LET'S TRY!!"],
      [chapter.tryPages[1], "LET'S TRY!!"],
      [chapter.rolePages[0], 'イラッとポイント'],
      [chapter.rolePages[1], '注目ポイント']
    ]);
    for (let index = 1; index <= chapter.slideCount; index++) {
      const current = page.locator('.slide:visible');
      assert.equal(await current.count(), 1);
      assert.equal(await page.locator('#count').innerText(), index + ' / ' + chapter.slideCount);
      const stickers = current.locator('.try-sticker, .role-sticker');
      if (expected.has(index) === true) {
        assert.equal(await stickers.count(), 1);
        assert.equal(await stickers.innerText(), expected.get(index));
        const style = await stickers.evaluate(element => ({
          background: getComputedStyle(element).backgroundColor,
          border: getComputedStyle(element).borderTopWidth,
          transform: getComputedStyle(element).transform,
          followsHeading: element.previousElementSibling?.tagName === 'H1'
        }));
        const expectedColor = chapter.rolePages[0] === index ? 'rgb(255, 128, 100)' :
          chapter.rolePages[1] === index ? 'rgb(130, 227, 232)' : 'rgb(255, 203, 86)';
        assert.equal(style.background, expectedColor);
        assert.equal(style.border, '3px');
        assert.notEqual(style.transform, 'none');
        assert.equal(style.followsHeading, true);
        const bounds = await stickers.boundingBox();
        const slideBounds = await current.boundingBox();
        assert.notEqual(bounds, null);
        assert.notEqual(slideBounds, null);
        assert.ok(bounds.x >= slideBounds.x && bounds.x + bounds.width <= slideBounds.x + slideBounds.width, 'sticker horizontal bounds');
        assert.ok(bounds.y >= slideBounds.y && bounds.y + bounds.height <= slideBounds.y + slideBounds.height, 'sticker vertical bounds');
        if (chapter.rolePages.includes(index) === true) {
          const heading = chapter.headings[chapter.rolePages.indexOf(index)];
          assert.equal(await current.locator('h1').innerText(), heading);
          const links = current.locator('.source-links a');
          assert.equal(await links.count(), 5);
          for (const link of await links.all()) {
            await link.scrollIntoViewIfNeeded();
            await link.click({ trial: true });
          }
          await page.locator('#notes').click();
          assert.equal(await current.locator('.speaker').isVisible(), true);
          await page.locator('#notes').click();
          assert.equal(await current.locator('.speaker').isVisible(), false);
          await stickers.scrollIntoViewIfNeeded();
          const dimensions = await current.evaluate(element => ({
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            height: element.clientHeight,
            scrollHeight: element.scrollHeight
          }));
          assert.ok(dimensions.scrollWidth <= dimensions.width + 1, 'slide horizontal overflow');
          console.log('LAYOUT chapter' + chapter.number, viewport.width, viewport.height, index, JSON.stringify(dimensions));
        }
      } else {
        assert.equal(await stickers.count(), 0);
      }
      if (index < chapter.slideCount) {
        await page.locator('#next').click();
      }
    }
    assert.equal(await page.locator('#next').isDisabled(), true);
    await page.locator('#prev').click();
    assert.equal(await page.locator('#count').innerText(), (chapter.slideCount - 1) + ' / ' + chapter.slideCount);
    assert.deepEqual(errors, [], 'uncaught presentation JavaScript errors');
  } finally {
    await page.close();
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
    const chapters = [
      { number: 1, slideCount: 12, tryPages: [3, 5], rolePages: [6, 7], headings: ['どこを修正しましたか？', '改善例：共通化する'] },
      { number: 2, slideCount: 12, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：条件が増えていく', '改善例：所属を持たせる'] },
      { number: 3, slideCount: 13, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：分岐が増える', '改善例：関数を渡す'] },
      { number: 4, slideCount: 12, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：記憶の持ち主は？', '改善例：状態を持つ部品へ'] }
    ];
    for (const chapter of chapters) {
      for (const viewport of [{ width: 1280, height: 720 }, { width: 393, height: 780 }]) {
        await run('chapter' + chapter.number + ' role stickers ' + viewport.width + 'x' + viewport.height, () => chapterStickers(browser, origin, viewport, chapter));
      }
    }
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
