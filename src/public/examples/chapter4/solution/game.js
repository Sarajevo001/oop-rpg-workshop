class Hero {
  constructor(name, controller) {
    this.name = name;
    this.controller = controller;
    this.hp = 40;
    this.sprite = '🧑‍🦱';
    this.team = 'friend';
  }
  attack(target) {
    const damage = 8;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
class Wizard {
  constructor(name, controller) {
    this.name = name;
    this.controller = controller;
    this.hp = 25;
    this.sprite = '🧙';
    this.team = 'friend';
  }
  attack(target) {
    const damage = 6;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の魔法！ ${target.name}に${damage}ダメージ！`;
  }
}
class Slime {
  constructor(name, team, sprite, controller) {
    this.controller = controller;
    this.name = name;
    this.hp = 30;
    this.sprite = sprite;
    this.team = team;
  }
  canAttack(target) {
    return this.team !== target.team;
  }
  attack(target) {
    if (this.canAttack(target) === false) {
      return `${this.name}は${target.name}を攻撃できない！`;
    }
    const damage = 7;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
let characters;
let finished;
let turnNumber = 0;
let currentTurnLog = null;
function log(message) {
  const p = document.createElement('p');
  p.textContent = message;
  (currentTurnLog ?? document.getElementById('log')).appendChild(p);
}
function beginTurnLog() {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = 'ターン' + (++turnNumber);
  section.appendChild(heading);
  document.getElementById('log').prepend(section);
  currentTurnLog = section;
}
function living(team) {
  return characters.filter(c => c.team === team && c.hp > 0);
}
function enemies() {
  return living('enemy');
}
function allies() {
  return living('friend');
}
function render() {
  const host = document.getElementById('actors') ?? document.querySelector('.battle');
  host.replaceChildren();
  for (const character of characters) {
    const card = document.createElement('article');
    card.className = 'character';
    const sprite = document.createElement('div');
    sprite.className = 'sprite';
    sprite.textContent = character.sprite;
    const name = document.createElement('h2');
    name.textContent = character.name;
    const hp = document.createElement('p');
    hp.textContent = 'HP: ' + character.hp;
    card.append(sprite, name, hp);
    host.appendChild(card);
  }
  document.getElementById('next-turn').disabled = finished;
  updateTargetOptions();
  document.getElementById('friend-target').disabled = document.getElementById('friend-target').options.length === 0;
}
function updateTargetOptions() {
  const select = document.getElementById('friend-target');
  const previous = select.value;
  select.replaceChildren();
  characters.forEach((character, index) => {
    if (character.team !== 'enemy' || character.hp <= 0) {
      return;
    }
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = character.name;
    select.appendChild(option);
  });
  const preserved = Array.from(select.options).some(option => option.value === previous);
  if (preserved === true) {
    select.value = previous;
  } else if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
  select.disabled = select.options.length === 0;
}
function playerControl(actor, targets) {
  const value = document.getElementById('friend-target').value;
  const selected = value === '' ? null : characters[Number(value)];
  return selected !== null && selected !== undefined && targets.includes(selected) && actor.team !== selected.team ? selected : null;
}
function cpuControl(actor, targets) {
  return targets.filter(c => c.hp > 0 && actor.canAttack(c)).sort((a, b) => a.hp - b.hp)[0] ?? null;
}
class TrackingController {
  constructor() {
    this.lockedTarget = null;
  }
  choose(actor, targets) {
    if (this.lockedTarget === null || this.lockedTarget.hp <= 0 || targets.includes(this.lockedTarget) === false) {
      this.lockedTarget = cpuControl(actor, targets);
    }
    return this.lockedTarget;
  }
}
function nextTurn() {
  if (finished === true) {
    return;
  }
  updateTargetOptions();
  beginTurnLog();
  for (const actor of allies()) {
    updateTargetOptions();
    const targets = enemies();
    if (targets.length === 0) {
      break;
    }
    const target = actor.controller(actor, targets);
    if (target !== null && target !== undefined) {
      log(actor.attack(target));
    } else {
      log(actor.name + 'は攻撃を見送った');
    }
  }
  if (enemies().length === 0) {
    finished = true;
    log('敵スライムをすべて倒した！');
  } else {
    for (const enemy of enemies()) {
      const target = enemy.controller.choose(enemy, allies());
      if (target !== null && target !== undefined) {
        log(enemy.attack(target));
      }
    }
    if (allies().length === 0) {
      finished = true;
      log('味方が全員倒れた');
    }
  }
  currentTurnLog = null;
  render();
}
function resetGame() {
  const sharedController = new TrackingController();
  characters = [new Hero('勇者', playerControl), new Wizard('魔法使い', playerControl), new Slime('仲間スライム', 'friend', '🟩', playerControl), new Slime('敵スライムA', 'enemy', '🟦', sharedController), new Slime('敵スライムB', 'enemy', '🟦', sharedController), new Slime('敵スライムC', 'enemy', '🟦', new TrackingController())];
  finished = false;
  turnNumber = 0;
  currentTurnLog = null;
  document.getElementById('log').replaceChildren();
  document.getElementById('auto-friend').checked = false;
  updateTargetOptions();
  log(`${enemies().length}体の敵スライムが現れた！`);
  render();
}
document.getElementById('next-turn').addEventListener('click', nextTurn);
document.getElementById('reset').addEventListener('click', resetGame);
document.getElementById('auto-friend').addEventListener('change', () => {
  characters.find(c => c.name === '仲間スライム').controller = document.getElementById('auto-friend').checked === true ? cpuControl : playerControl;
  render();
});
resetGame();
