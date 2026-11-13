// 第0章：クラスの基本を説明するための最小例（演習なし）
class Hero {
  constructor(name) {
    this.name = name; // プロパティ
    this.hp = 40;     // プロパティ
  }
  attack(target) {    // メソッド
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
const hero = new Hero("勇者");
const enemySlime = new Slime("敵スライム");
document.querySelector("#before").textContent = `${hero.name} HP:${hero.hp} / ${enemySlime.name} HP:${enemySlime.hp}`;
document.querySelector("#action").textContent = hero.attack(enemySlime);
document.querySelector("#after").textContent = `${hero.name} HP:${hero.hp} / ${enemySlime.name} HP:${enemySlime.hp}`;
