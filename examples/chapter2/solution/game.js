class Hero {
  constructor(name) { this.name = name; this.hp = 40; this.team = "friend"; }
  attack(target) {
    const damage = 8;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
class Wizard {
  constructor(name) { this.name = name; this.hp = 25; this.team = "friend"; }
  attack(target) {
    const damage = 6;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の魔法！ ${target.name}に${damage}ダメージ！`;
  }
}
class Slime {
  constructor(name, team) {
    this.name = name;
    this.hp = 30;
    this.team = team;
  }
  canAttack(target) {
    return this.team !== target.team;
  }
  attack(target) {
    if (!this.canAttack(target)) return `${this.name}は${target.name}を攻撃できない！`;
    const damage = 7;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
let hero, enemySlime, friendlySlime, wizard, finished;
function showMessage(message) {
  const p = document.createElement("p");
  p.textContent = message;
  document.querySelector("#log").appendChild(p);
}
function render() {
  const actors = [["hero", hero], ["enemy", enemySlime], ["friend", friendlySlime], ["wizard", wizard]];
  for (const [id, actor] of actors) {
    document.querySelector(`#${id}-name`).textContent = actor.name;
    document.querySelector(`#${id}-hp`).textContent = `HP: ${actor.hp}`;
  }
  document.querySelector("#next-turn").disabled = finished;
}
function nextTurn() {
  if (finished) return;
  showMessage(hero.attack(enemySlime));
  if (enemySlime.hp > 0) {
    showMessage(friendlySlime.attack(enemySlime));
  }
  if (enemySlime.hp > 0) showMessage(wizard.attack(enemySlime));
  if (enemySlime.hp === 0) {
    showMessage("敵スライムを倒した！");
    finished = true;
  } else {
    showMessage(enemySlime.attack(hero));
    if (hero.hp === 0) {
      showMessage("勇者は倒れた……。");
      finished = true;
    }
  }
  render();
}
function resetGame() {
  hero = new Hero("勇者");
  enemySlime = new Slime("敵スライム", "enemy");
  friendlySlime = new Slime("仲間スライム", "friend");
  wizard = new Wizard("魔法使い");
  finished = false;
  document.querySelector("#log").replaceChildren();
  showMessage("スライムの攻撃可否ルールを検証中");
  render();
}
document.querySelector("#next-turn").addEventListener("click", nextTurn);
document.querySelector("#reset").addEventListener("click", resetGame);
resetGame();
