class Hero {
  constructor(name) {
    this.name = name;
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
  constructor(name) {
    this.name = name;
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
  constructor(name, team, sprite) {
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
  if (currentTurnLog === null || currentTurnLog === undefined) {
    document.getElementById('log').appendChild(p);
  } else {
    currentTurnLog.appendChild(p);
  }
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
  let host = document.getElementById('actors');
  if (host === null || host === undefined) {
    host = document.querySelector('.battle');
  }
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
function validateTarget(actor, targets, target) {
  if (
    target === null ||
    target === undefined ||
    targets.includes(target) === false ||
    actor.team === target.team ||
    target.hp <= 0
  ) {
    throw new Error('コントローラーが不正な攻撃対象を返しました');
  }
  return target;
}
function playerControl(actor, targets) {
  const value = document.getElementById('friend-target').value;
  if (value === '') {
    throw new Error('攻撃対象が選択されていません');
  }
  const selected = characters[Number(value)];
  return validateTarget(actor, targets, selected);
}
function cpuControl(actor, targets) {
  const selected = targets.filter(c => c.hp > 0 && actor.canAttack(c) === true).sort((a, b) => a.hp - b.hp)[0];
  return validateTarget(actor, targets, selected);
}
function nextTurn() {
  if (finished === true) {
    return;
  }
  updateTargetOptions();
  beginTurnLog();
  const hero = characters.find(c => c.name === '勇者');
  const wizard = characters.find(c => c.name === '魔法使い');
  const friend = characters.find(c => c.name === '仲間スライム');
  if (hero.hp > 0 && enemies().length > 0) {
    const target = playerControl(hero, enemies());
    log(hero.attack(target));
  }
  updateTargetOptions();
  if (friend.hp > 0 && enemies().length > 0) {
    let target;
    if (friend.team === 'friend') {
      target = playerControl(friend, enemies());
    } else {
      target = cpuControl(friend, enemies());
    }
    log(friend.attack(target));
  }
  updateTargetOptions();
  if (wizard.hp > 0 && enemies().length > 0) {
    const target = playerControl(wizard, enemies());
    log(wizard.attack(target));
  }
  if (enemies().length === 0) {
    finished = true;
    log('敵スライムをすべて倒した！');
  } else {
    for (const enemy of enemies()) {
      const targets = allies();
      if (targets.length === 0) {
        break;
      }
      const target = cpuControl(enemy, targets);
      log(enemy.attack(target));
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
  characters = [new Hero('勇者'), new Wizard('魔法使い'), new Slime('仲間スライム', 'friend', '🟩'), new Slime('敵スライムA', 'enemy', '🟦'), new Slime('敵スライムB', 'enemy', '🟦')];
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
  render();
});
resetGame();
