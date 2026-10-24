// 第1章の初期コード。team・操作関数・DIはまだ登場しません。

class Hero {
  constructor(name) {
    this.name = name;
    this.hp = 40;
  }

  attack(target) {
    const damage = 8;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}

class Slime {
  constructor(name) {
    this.name = name;
    this.hp = 30;
  }

  attack(target) {
    const damage = 5;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}

let hero;
let enemySlime;
let finished;

function showMessage(message) {
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  document.querySelector("#log").appendChild(paragraph);
}

function render() {
  const host = document.querySelector(".battle");
  host.replaceChildren();
  for (const actor of [hero, enemySlime]) {
    const card = document.createElement("section");
    card.className = "character";
    const sprite = document.createElement("div");
    sprite.className = "sprite";
    sprite.textContent = actor instanceof Hero ? "🧑‍🦱"
      : actor.name === "仲間スライム" ? "🟩" : "🟦";
    const name = document.createElement("h2");
    name.textContent = actor.name;
    const hp = document.createElement("p");
    hp.className = "hp";
    hp.textContent = `HP: ${actor.hp}`;
    card.append(sprite, name, hp);
    host.appendChild(card);
  }
  document.querySelector("#next-turn").disabled = finished;
}

function nextTurn() {
  if (finished) return;

  showMessage(hero.attack(enemySlime));
  if (enemySlime.hp === 0) {
    showMessage(`${enemySlime.name}を倒した！ 勇者の勝ち！`);
    finished = true;
    render();
    return;
  }

  showMessage(enemySlime.attack(hero));
  if (hero.hp === 0) {
    showMessage("勇者は倒れてしまった……。");
    finished = true;
  }
  render();
}

function resetGame() {
  hero = new Hero("勇者");
  enemySlime = new Slime("敵スライム");
  finished = false;
  document.querySelector("#log").replaceChildren();
  showMessage("敵スライムが現れた！");
  render();
}

document.querySelector("#next-turn").addEventListener("click", nextTurn);
document.querySelector("#reset").addEventListener("click", resetGame);
resetGame();
