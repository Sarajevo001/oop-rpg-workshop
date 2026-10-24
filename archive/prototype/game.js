"use strict";

// 検証用の「改善後」実装。教材の開始コードではありません。
// 第1章: ダメージ計算の共通化
function calculateDamage(attack, defense) {
  return Math.max(1, attack - defense);
}

// 第2章: キャラクターの状態と共通の振る舞い
class Character {
  constructor(name, hp, attack, defense) {
    this.name = name;
    this.maxHp = hp;
    this.hp = hp;
    this.attack = attack;
    this.defense = defense;
  }
  get alive() { return this.hp > 0; }
  takeDamage(amount) {
    const actual = Math.min(this.hp, Math.max(0, amount));
    this.hp -= actual;
    return actual;
  }
  heal(amount) {
    const actual = Math.min(this.maxHp - this.hp, Math.max(0, amount));
    this.hp += actual;
    return actual;
  }
}

// 第4章: 武器が固有の状態と処理を持つ
class Sword {
  constructor() { this.name = "剣"; this.durability = 3; }
  use(actor, target) {
    if (this.durability <= 0) return "剣は壊れている";
    this.durability--;
    const damage = target.takeDamage(calculateDamage(actor.attack + 3, target.defense));
    return `${actor.name}の剣！ ${target.name}に${damage}ダメージ（耐久${this.durability}）`;
  }
}
class Bow {
  constructor() { this.name = "弓"; this.arrows = 3; }
  use(actor, target) {
    if (this.arrows <= 0) return "矢が残っていない";
    this.arrows--;
    const damage = target.takeDamage(calculateDamage(actor.attack + 2, target.defense));
    return `${actor.name}の矢！ ${target.name}に${damage}ダメージ（残弾${this.arrows}）`;
  }
}
class Staff {
  constructor() { this.name = "杖"; this.mp = 6; }
  use(actor, target) {
    if (this.mp < 2) return "魔力が足りない";
    this.mp -= 2;
    const damage = target.takeDamage(calculateDamage(actor.attack + 5, target.defense));
    return `${actor.name}の魔法弾！ ${target.name}に${damage}ダメージ（MP${this.mp}）`;
  }
}
class Hero extends Character {
  constructor(name, hp, attack, defense, weapon) {
    super(name, hp, attack, defense);
    this.weapon = weapon;
  }
  equip(weapon) { this.weapon = weapon; }
  strike(target) { return this.weapon.use(this, target); }
}

const state = {};
const statusElement = document.querySelector("#status");
const actionsElement = document.querySelector("#actions");
const logElement = document.querySelector("#log");

function log(message) {
  const item = document.createElement("li");
  item.textContent = message;
  logElement.prepend(item);
}
function button(label, callback, disabled = false) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.disabled = disabled;
  element.addEventListener("click", callback);
  actionsElement.append(element);
}
function livingEnemies() { return state.enemies.filter(enemy => enemy.alive); }
function livingAllies() { return state.allies.filter(ally => ally.alive); }
function gameOver() { return !state.hero.alive || livingEnemies().length === 0; }

// 第3章: 実行側は、渡された行動関数を呼ぶだけ
function performAction(action) {
  if (gameOver()) return;
  const message = action();
  log(message);
  if (livingEnemies().length > 0) {
    const target = [state.hero, ...livingAllies()][0];
    const enemy = livingEnemies()[0];
    const damage = target.takeDamage(calculateDamage(enemy.attack, target.defense));
    log(`${enemy.name}の反撃！ ${target.name}に${damage}ダメージ`);
  }
  render();
}
function render() {
  statusElement.replaceChildren();
  for (const character of [state.hero, ...state.allies, ...state.enemies]) {
    const item = document.createElement("div");
    item.className = `unit${character.alive ? "" : " defeated"}`;
    const weaponText = character === state.hero ? ` / 装備: ${state.hero.weapon.name}` : "";
    item.textContent = `${character.name} HP ${character.hp}/${character.maxHp}${weaponText}`;
    statusElement.append(item);
  }
  actionsElement.replaceChildren();
  if (gameOver()) {
    logElement.dataset.ended = "true";
    const result = livingEnemies().length === 0 ? "勝利！" : "敗北…";
    button(result, () => {}, true);
    return;
  }
  const target = livingEnemies()[0];
  button("装備武器で攻撃", () => performAction(() => state.hero.strike(target)));
  button("炎", () => performAction(() => {
    const damage = target.takeDamage(calculateDamage(state.hero.attack + 4, target.defense));
    return `炎！ ${target.name}に${damage}ダメージ`;
  }));
  button("氷", () => performAction(() => {
    const damage = target.takeDamage(calculateDamage(state.hero.attack + 2, target.defense));
    return `氷！ ${target.name}に${damage}ダメージ`;
  }));
  button("回復", () => performAction(() => {
    const healed = state.hero.heal(5);
    return `${state.hero.name}のHPが${healed}回復`;
  }));
  for (const [label, Weapon] of [["剣", Sword], ["弓", Bow], ["杖", Staff]]) {
    button(`${label}を装備`, () => {
      state.hero.equip(state.weapons[label]);
      log(`${label}を装備した`);
      render();
    });
  }
}
function reset() {
  state.weapons = { "剣": new Sword(), "弓": new Bow(), "杖": new Staff() };
  state.hero = new Hero("勇者", 30, 7, 2, state.weapons["剣"]);
  state.allies = [new Character("仲間A", 18, 4, 1), new Character("仲間B", 16, 5, 1)];
  state.enemies = [new Character("スライム", 12, 4, 1), new Character("ゴブリン", 18, 5, 2)];
  logElement.replaceChildren();
  log("戦闘開始！");
  render();
}
document.querySelector("#reset").addEventListener("click", reset);
reset();
