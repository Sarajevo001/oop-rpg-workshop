'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element(tag = 'div') {
  const el = {
    tag, children: [], disabled: false, checked: false, textContent: '', className: '',
    _value: '', _index: -1, listeners: {},
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    prepend(child) { this.children.unshift(child); },
    replaceChildren(...children) { this.children = [...children]; this._index = children.length ? 0 : -1; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    get options() { return this.tag === 'select' ? this.children : []; },
    get selectedIndex() { return this._index; },
    set selectedIndex(i) { this._index = i; },
    get value() { return this.tag === 'select' ? (this.options[this._index]?.value ?? '') : this._value; },
    set value(v) { if (this.tag === 'select') this._index = this.options.findIndex(x => x.value === v); else this._value = v; }
  };
  return el;
}
function load(file) {
  const elements = new Map();
  for (const id of ['friend-target', 'log', 'actors', 'next-turn', 'reset', 'auto-friend']) {
    elements.set(id, element(id === 'friend-target' ? 'select' : 'div'));
  }
  const document = {
    getElementById(id) { return elements.get(id) ?? null; },
    querySelector() { return elements.get('actors'); },
    createElement(tag) { return element(tag); }
  };
  const context = vm.createContext({ document, console });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { context, elements };
}
let cases = 0;
for (const chapter of ['chapter3', 'chapter4']) {
  for (const stage of (chapter === 'chapter3' ? ['task1', 'task2', 'solution'] : ['starter', 'task1', 'task2', 'solution'])) {
    const file = path.join('src/public/examples', chapter, stage, 'demo.js');
    const { context, elements } = load(file);
    const run = source => vm.runInContext(source, context);
    assert.equal(run('enemies().length > 0'), true, file);
    assert.equal(run('validateTarget(allies()[0], enemies(), enemies()[0]) === enemies()[0]'), true, file);
    assert.throws(() => run('validateTarget(allies()[0], enemies(), null)'), /不正/, file);
    assert.throws(() => run('validateTarget(allies()[0], enemies(), allies()[1])'), /不正/, file);
    assert.throws(() => run('validateTarget(allies()[0], enemies(), {team: "enemy", hp: 20})'), /不正/, file);
    assert.equal(run('cpuControl(enemies()[0], allies()) === allies()[1] || cpuControl(enemies()[0], allies()) === allies()[0] || cpuControl(enemies()[0], allies()) === allies()[2]'), true, file);
    assert.throws(() => run('cpuControl(enemies()[0], [])'), /不正/, file);
    const select = elements.get('friend-target');
    select.appendChild({ value: '9999' });
    select.value = '9999';
    assert.throws(() => run('playerControl(allies()[0], enemies())'), /不正/, file);
    select.value = '';
    assert.throws(() => run('playerControl(allies()[0], enemies())'), /選択/, file);
    run('updateTargetOptions()');
    assert.equal(run('playerControl(allies()[0], enemies()) === enemies()[0]'), true, file);
    run('nextTurn()');
    assert.equal(run('turnNumber'), 1, file);
    run('resetGame()');
    assert.equal(run('turnNumber'), 0, file);
    cases += 12;
    console.log('PASS', file);
  }
}
console.log('PASS', cases, 'assertions');
