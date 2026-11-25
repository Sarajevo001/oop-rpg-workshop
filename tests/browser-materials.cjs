'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');

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
      if (index <= (chapter.number === 1 ? 2 : 1)) {
        assert.equal(await current.locator('.source-links a, .exercise-start a').count(), 0);
        if (chapter.number === 3) {
          assert.ok((await current.innerText()).includes('課題1に向けた準備済みの改修'));
        }
      }
      if (chapter.tryPages.includes(index)) {
        const stage = index === chapter.tryPages[0] ? (chapter.number === 3 ? 'task1-starter' : 'starter') : 'task1';
        const start = current.locator('.exercise-start a').first();
        assert.equal(await start.innerText(), '改修スタート用コードを開く ↗');
        assert.equal(await start.getAttribute('href'), '../../examples/chapter' + chapter.number + '/' + stage + '/demo.html');
      }
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
        if (chapter.number === 3 && index === 2) {
          const primary = current.locator('.exercise-start a');
          const reference = current.locator('.source-links a');
          const stage = 'chapter3/task1-starter';
          const github = 'https://github.com/Sarajevo001/oop-rpg-workshop/blob/main/src/public/examples/';
          const expectedLinks = [
            '../../examples/' + stage + '/demo.html',
            'https://jsfiddle.net/gh/get/library/pure/Sarajevo001/oop-rpg-workshop/tree/main/src/public/examples/' + stage + '/',
            '../../examples/download.html?stage=' + stage,
            github + stage + '/demo.html',
            github + stage + '/demo.js'
          ];
          assert.equal(await primary.count(), 3);
          assert.equal(await reference.count(), 2);
          assert.deepEqual(await current.locator('.exercise-start a, .source-links a').evaluateAll(links =>
            links.map(link => link.getAttribute('href'))), expectedLinks);
          assert.equal(await current.locator('.source-links-label').innerText(), 'コードを読む（参照用）');
          assert.deepEqual(await primary.allTextContents(), ['改修スタート用コードを開く ↗', 'JSFiddleで編集 ↗', '4ファイルをダウンロード ↗']);
          for (const link of await current.locator('.exercise-start a, .source-links a').all()) {
            await link.scrollIntoViewIfNeeded();
            await link.click({ trial: true });
          }
          const size = await current.evaluate(element => ({
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            height: element.clientHeight,
            scrollHeight: element.scrollHeight
          }));
          assert.ok(size.scrollWidth <= size.width + 1, 'exercise link horizontal overflow');
          console.log('PASS chapter3 exercise links', viewport.width, viewport.height, JSON.stringify(size));
        }
        if (chapter.rolePages.includes(index) === true) {
          const heading = chapter.headings[chapter.rolePages.indexOf(index)];
          assert.equal(await current.locator('h1').innerText(), heading);
          if (index === chapter.rolePages[1]) {
            const panel = current.locator('.improvement-panel');
            assert.equal(await panel.count(), 1);
            assert.equal(await panel.getAttribute('data-chapter'), String(chapter.number));
            const expected = [
              ['2か所', '1か所', '5 → 7 の変更は、もう1か所でいい！'],
              ['種類を個別に判定', '所属だけで判定', 'キャラクターが増えても、判定処理はそのまま！'],
              ['戦闘中に条件分岐', '操作関数を差し替え', '操作方法が変わっても、戦闘処理はそのまま！'],
              ['スライム同士を参照', '記憶を持つ部品を参照', '同じ部品を渡せば連携。別の部品を渡せば独立！']
            ][chapter.number - 1];
            assert.deepEqual(await panel.locator('.improvement-compare strong').allTextContents(), expected.slice(0, 2));
            assert.equal(await panel.locator('.improvement-message').innerText(), expected[2]);
            const svg = panel.locator('svg[role="img"]');
            assert.equal(await svg.count(), 1);
            await svg.scrollIntoViewIfNeeded();
            const figure = await svg.evaluate(element => {
              const view = element.viewBox.baseVal;
              const bounds = element.getBBox();
              const rect = element.getBoundingClientRect();
              const slide = element.closest('.slide').getBoundingClientRect();
              return { contentFits: bounds.x >= -1 && bounds.y >= -1 &&
                bounds.x + bounds.width <= view.width + 1 && bounds.y + bounds.height <= view.height + 1,
                visible: rect.width > 0 && rect.height > 0,
                widthFits: rect.left >= slide.left && rect.right <= slide.right };
            });
            assert.deepEqual(figure, { contentFits: true, visible: true, widthFits: true });
            const codes = panel.locator('[data-code-source]');
            assert.equal(await codes.count(), chapter.number === 1 || chapter.number === 3 ? 2 : 1);
            for (const code of await codes.all()) {
              await code.scrollIntoViewIfNeeded();
              assert.equal(await code.isVisible(), true);
              assert.equal(await code.evaluate(element => {
                element.scrollLeft = element.scrollWidth;
                const reached = element.scrollLeft >= element.scrollWidth - element.clientWidth - 1;
                element.scrollLeft = 0;
                return reached;
              }), true);
            }
            await panel.locator('.improvement-message').scrollIntoViewIfNeeded();
            assert.equal(await panel.locator('.improvement-message').isVisible(), true);
            console.log('PASS improvement visual chapter' + chapter.number, viewport.width, viewport.height);
          }
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

async function snapshotGame(page) {
  return page.evaluate(() => ({
    text: document.body.innerText,
    controls: Array.from(document.querySelectorAll('input, select, button')).map(element => ({
      id: element.id,
      value: element.value,
      checked: element.checked,
      disabled: element.disabled,
      options: Array.from(element.options || []).map(option => ({
        value: option.value,
        text: option.textContent
      }))
    }))
  }));
}

async function compareGameBehavior(browser, origin, stage, baseline) {
  const original = execFileSync('git', ['show', baseline + ':src/public/examples/' + stage + '/demo.js'], {
    cwd: path.resolve(root, '../..'),
    encoding: 'utf8'
  });
  const pages = [await browser.newPage(), await browser.newPage()];
  const errors = [];
  try {
    for (const page of pages) {
      page.on('pageerror', error => errors.push(error.message));
    }
    await pages[0].route('**/demo.js', route => route.fulfill({
      contentType: 'text/javascript; charset=utf-8',
      body: original
    }));
    const url = origin + '/examples/' + stage + '/demo.html';
    for (const page of pages) {
      await page.goto(url, { waitUntil: 'load' });
    }
    const compare = async label => {
      assert.deepEqual(await snapshotGame(pages[1]), await snapshotGame(pages[0]), stage + ' ' + label);
    };
    await compare('initial');
    if (stage !== 'chapter0/demo') {
      for (let turn = 1; turn <= 15; turn++) {
        if (await pages[0].locator('#next-turn').isDisabled()) {
          break;
        }
        for (const page of pages) {
          const select = page.locator('#friend-target');
          if (await select.count() && await select.isEnabled()) {
            const values = await select.locator('option').evaluateAll(options => options.map(option => option.value));
            if (values.length > 0) {
              await select.selectOption(values[values.length - 1]);
            }
          }
          const auto = page.locator('#auto-friend');
          if (await auto.count() && await auto.isVisible() && await auto.isEnabled()) {
            await auto.setChecked(turn % 2 === 0);
          }
        }
        await compare('input ' + turn);
        for (const page of pages) {
          await page.locator('#next-turn').click();
        }
        await compare('turn ' + turn);
      }
      assert.equal(await pages[0].locator('#next-turn').isDisabled(), true, stage + ' baseline did not finish in 15 turns');
      for (const page of pages) {
        await page.locator('#reset').click();
      }
      await compare('reset');
    }
    assert.deepEqual(errors, [], 'baseline/current uncaught JavaScript errors');
  } finally {
    for (const page of pages) {
      await page.close();
    }
  }
}

async function checkControlBranches(browser, origin, stage) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const automatic of [false, true]) {
      await page.goto(origin + '/examples/' + stage + '/demo.html');
      await page.evaluate(() => {
        characters.find(character => character.name === '敵スライムA').hp = 1;
      });
      await page.locator('#friend-target').selectOption({ label: '敵スライムB' });
      await page.locator('#auto-friend').setChecked(automatic);
      await page.locator('#next-turn').click();
      const target = automatic === true ? '敵スライムA' : '敵スライムB';
      assert.ok((await page.locator('#log').innerText()).includes('仲間スライムの攻撃！ ' + target + 'に7ダメージ！'), stage + ' control branch ' + automatic);
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function checkStarterSelection(browser, origin) {
  const page = await browser.newPage();
  try {
    await page.goto(origin + '/examples/chapter3/task1-starter/demo.html');
    const result = await page.evaluate(() => {
      const actor = allies()[0];
      const targets = enemies();
      const select = document.getElementById('friend-target');
      select.value = String(characters.indexOf(targets[0]));
      const valid = playerControl(actor, targets) === targets[0];
      select.value = '';
      const empty = playerControl(actor, targets) === null;
      const option = document.createElement('option');
      option.value = '9999';
      select.appendChild(option);
      select.value = '9999';
      const invalid = playerControl(actor, targets) === null;
      select.value = String(characters.indexOf(targets[0]));
      return [valid, empty, invalid, playerControl(actor, []) === null, cpuControl(actor, []) === null];
    });
    assert.deepEqual(result, [true, true, true, true, true]);
  } finally {
    await page.close();
  }
}

async function checkExcerptLayout(browser, origin, deck, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('**/*', route => {
      if (route.request().url().startsWith(origin + '/') === true) {
        return route.continue();
      }
      return route.abort();
    });
    await page.goto(origin + '/presentations/' + deck + '/index.html');
    const count = await page.locator('.slide').count();
    let checkedAppendices = 0;
    let scrollableAppendices = 0;
    for (let index = 1; index <= count; index++) {
      const current = page.locator('.slide:visible');
      assert.equal(await current.count(), 1);
      assert.equal(await page.locator('#count').innerText(), index + ' / ' + count);
      const linkOrder = await current.evaluate(slide => {
        const groups = Array.from(slide.querySelectorAll('.exercise-start, .source-links'));
        if (groups.length === 0) {
          return { valid: true, ranks: [] };
        }
        const content = Array.from(slide.children).filter(element =>
          element.matches('.feature, .description, .detail, .talk-prompt, .improvement-panel, .reference-code'));
        const valid = content.every(element => groups.every(group =>
          (element.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0));
        const ranks = groups.flatMap(group => Array.from(group.querySelectorAll('a'), link => {
          const href = link.getAttribute('href');
          if (href.startsWith('https://jsfiddle.net/')) {
            return 2;
          }
          if (href.includes('download.html?stage=')) {
            return 3;
          }
          if (href.startsWith('https://github.com/')) {
            if (href.endsWith('/demo.html')) {
              return 4;
            }
            if (href.endsWith('/demo.js')) {
              return 5;
            }
          }
          if (href.endsWith('/demo.html')) {
            return 1;
          }
          return 0;
        }));
        return { valid, ranks };
      });
      assert.equal(linkOrder.valid, true, deck + ' slide ' + index + ' links before content');
      if (linkOrder.ranks.length > 0) {
        assert.deepEqual(linkOrder.ranks, Array.from({ length: linkOrder.ranks.length }, (_, i) => i + 1), deck + ' slide ' + index + ' link priority');
      }
      const blocks = current.locator('.feature.code, .reference-code pre code');
      for (const block of await blocks.all()) {
        assert.ok(await block.locator('.code-line').count() > 0);
        assert.equal(await block.evaluate(element => element.textContent === Array.from(element.querySelectorAll('.code-line'), row => row.textContent).join('\n')), true);
        const layout = await block.evaluate(element => {
          const container = element.closest('pre') || element;
          const style = getComputedStyle(container);
          container.scrollLeft = container.scrollWidth;
          const reached = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
          container.scrollLeft = 0;
          return { preserved: style.whiteSpace === 'pre', reached };
        });
        assert.deepEqual(layout, { preserved: true, reached: true });
      }
      for (const [role, highlight] of [['irritation', 'problem'], ['attention', 'solution']]) {
        if (await current.locator('.' + role + '-sticker').count() > 0 && await blocks.count() > 0) {
          const marked = current.locator('.code-' + highlight);
          assert.ok(await marked.count() > 0, deck + ' missing ' + highlight);
          assert.ok(await marked.first().isVisible());
        }
      }
      for (const code of await current.locator('[data-code-source], .reference-code pre').all()) {
        assert.ok(await code.isVisible());
        await code.scrollIntoViewIfNeeded();
        const box = await code.boundingBox();
        assert.notEqual(box, null);
        assert.ok(box.width > 0 && box.height > 0);
      }
      for (const pre of await current.locator('.reference-code pre').all()) {
        const scroll = await pre.evaluate(element => {
          const width = element.clientWidth;
          const content = element.scrollWidth;
          const overflow = getComputedStyle(element).overflowX;
          const slide = element.closest('.slide');
          const before = slide.scrollLeft;
          element.scrollLeft = content;
          const reached = element.scrollLeft;
          const after = slide.scrollLeft;
          element.scrollLeft = 0;
          return { width, content, overflow, before, reached, after };
        });
        assert.ok(scroll.width > 0 && scroll.content >= scroll.width);
        assert.equal(scroll.overflow, 'auto');
        assert.ok(scroll.reached >= scroll.content - scroll.width - 1, deck + ' slide ' + index + ' cannot reach code end');
        assert.equal(scroll.after, scroll.before, 'code scroll must not move slide');
        assert.equal(await pre.getAttribute('tabindex'), '0');
        assert.ok((await pre.locator('code').innerText()).trim().length > 0);
        checkedAppendices++;
        if (scroll.content > scroll.width + 1) {
          scrollableAppendices++;
        }
        assert.equal(await current.locator('.source-links a').count(), 5);
        console.log('APPENDIX_SCROLL', deck, viewport.width, viewport.height, index, JSON.stringify(scroll));
      }
      if (await current.locator('[data-code-source], .reference-code pre').count() > 0) {
        const size = await current.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
        assert.ok(size.scroll <= size.client + 1, deck + ' slide ' + index + ' horizontal overflow');
        for (const link of await current.locator('.source-links a').all()) {
          await link.scrollIntoViewIfNeeded();
          await link.click({ trial: true });
        }
      }
      if (index < count) {
        await page.locator('#next').click();
      }
    }
    assert.equal(await page.locator('#next').isDisabled(), true);
    const expectedAppendices = { chapter0: 0, chapter1: 3, chapter2: 3, chapter3: 4, chapter4: 3, summary: 0 };
    assert.equal(checkedAppendices, expectedAppendices[deck]);
    if (viewport.width === 393 && checkedAppendices > 0) {
      assert.ok(scrollableAppendices > 0, deck + ' expected real horizontal scrolling on narrow screen');
    }
    await page.locator('#prev').click();
    assert.equal(await page.locator('#count').innerText(), (count - 1) + ' / ' + count);
    assert.deepEqual(errors, []);
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
    const baseline = process.env.RPG_BEHAVIOR_BASELINE;
    if (baseline !== undefined && baseline !== '') {
      assert.match(baseline, /^[0-9a-f]{40}$/);
      for (const stage of stages) {
        await run('behavior unchanged ' + stage, () => compareGameBehavior(browser, origin, stage, baseline));
      }
    }
    for (const stage of ['chapter3/task2', 'chapter3/solution', 'chapter4/starter', 'chapter4/task1', 'chapter4/task2', 'chapter4/solution']) {
      await run('explicit control branches ' + stage, () => checkControlBranches(browser, origin, stage));
    }
    await run('chapter3 task1 starter selection contracts', () => checkStarterSelection(browser, origin));
    const chapters = [
      { number: 1, slideCount: 12, tryPages: [3, 5], rolePages: [6, 7], headings: ['どこを修正しましたか？', '改善例：共通化する'] },
      { number: 2, slideCount: 12, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：条件が増えていく', '改善例：所属を持たせる'] },
      { number: 3, slideCount: 13, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：分岐が増える', '改善例：関数を渡す'] },
      { number: 4, slideCount: 12, tryPages: [2, 4], rolePages: [5, 6], headings: ['課題2：記憶の持ち主は？', '改善例：状態を持つ部品へ'] }
    ];
    for (const deck of ['chapter0', 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'summary']) {
      for (const viewport of [{ width: 1280, height: 720 }, { width: 393, height: 780 }]) {
        await run('code excerpt layout ' + deck + ' ' + viewport.width + 'x' + viewport.height,
          () => checkExcerptLayout(browser, origin, deck, viewport));
      }
    }
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
