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
    if (this.team !== target.team) {
      return true;
    }
    return false;
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
function playerControl(actor, targets) {
  const value = document.getElementById('friend-target').value;
  if (value === '') {
    return null;
  }
  const selected = characters[Number(value)];
  if (selected === null || selected === undefined) {
    return null;
  }
  if (targets.includes(selected) === true && actor.team !== selected.team) {
    return selected;
  }
  return null;
}
function cpuControl(actor, targets) {
  const selected = targets.filter(c => c.hp > 0 && actor.canAttack(c) === true).sort((a, b) => a.hp - b.hp)[0];
  if (selected === null || selected === undefined) {
    return null;
  }
  return selected;
}

function nextTurn() {
  if (finished === true) {
    return;
  }
  beginTurnLog();
  // 課題1：味方は画面で選んだ敵を攻撃するように変更しよう。
  // ヒント：playerControl(actor, enemies()) が攻撃対象を返す。
  for (const actor of allies()) {
    const target = enemies()[0]; // TODO: プレイヤー操作に変更
    if (target === undefined || target === null) {
      break;
    }
    log(actor.attack(target));
    // 倒された敵を選択肢から除外し、次の味方の攻撃先を有効に保つ。
    updateTargetOptions();
  }
  if (enemies().length === 0) {
    finished = true;
    log('敵スライムをすべて倒した！');
  } else {
    for (const enemy of enemies()) {
      // 敵のCPU操作は準備済み。ここは変更不要。
      const target = cpuControl(enemy, allies());
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
  characters = [
    new Hero('勇者'),
    new Wizard('魔法使い'),
    new Slime('仲間スライム', 'friend', '🟩'),
    new Slime('敵スライムA', 'enemy', '🟦'),
    new Slime('敵スライムB', 'enemy', '🟦')
  ];
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
