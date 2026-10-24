class Hero {
  constructor(name) { this.name = name; this.hp = 40; }
  attack(target) {
    const damage = 8;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
class Slime {
  constructor(name) { this.name = name; this.hp = 30; }
  attack(target) {
    const damage = 7;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
class FriendlySlime {
  constructor(name) { this.name = name; this.hp = 30; }
  attack(target) {
    const damage = 7;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
let hero, enemySlime, friendlySlime, finished;
let turnNumber = 0;
let currentTurnLog = null;
function showMessage(message) {
  const p = document.createElement("p"); p.textContent = message;
  (currentTurnLog || document.querySelector("#log")).appendChild(p);
}
function render() {
  const host = document.querySelector(".battle");
  host.replaceChildren();
  for (const actor of [hero, enemySlime, friendlySlime]) {
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
function beginTurnLog() {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "ターン" + (++turnNumber);
  section.appendChild(heading);
  document.querySelector("#log").prepend(section);
  currentTurnLog = section;
}

function nextTurn() {
  if (finished) return;
  beginTurnLog();
  showMessage(hero.attack(enemySlime));
  if (enemySlime.hp > 0) showMessage(friendlySlime.attack(enemySlime));
  if (enemySlime.hp === 0) {
    showMessage("敵スライムを倒した！"); finished = true;
  } else {
    showMessage(enemySlime.attack(hero));
    if (hero.hp === 0) { showMessage("勇者は倒れた……。"); finished = true; }
  }
  render();
}
function resetGame() {
  hero = new Hero("勇者");
  enemySlime = new Slime("敵スライム");
  friendlySlime = new FriendlySlime("仲間スライム");
  finished = false;
  turnNumber = 0;
  currentTurnLog = null;
  document.querySelector("#log").replaceChildren();
  showMessage("仲間スライムが加勢した！");
  render();
}
document.querySelector("#next-turn").addEventListener("click", nextTurn);
document.querySelector("#reset").addEventListener("click", resetGame);
resetGame();
