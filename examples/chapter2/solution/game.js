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
let characters, finished;

const $=id=>document.querySelector("#"+id);
function log(message){const p=document.createElement("p");p.textContent=message;$("log").appendChild(p);}
function living(team){return characters.filter(c=>c.team===team&&c.hp>0);}
function enemies(){return living("enemy");}
function allies(){return living("friend");}
function render(){
 const host=document.querySelector(".battle");
 host.replaceChildren();
 for(const character of characters){
  const card=document.createElement("section");
  card.className="character";
  card.textContent=character.name+" HP:"+character.hp;
  host.appendChild(card);
 }
 $("next-turn").disabled=finished;
 
}

function nextTurn(){
 if(finished)return;
 for(const actor of allies()){
  const target=enemies()[0];if(!target)break;
  log(actor.attack(target));
 }
 if(!enemies().length){finished=true;log("敵スライムをすべて倒した！");}
 else{
  for(const enemy of enemies()){
   const target=allies()[0];
   if(target)log(enemy.attack(target));
  }
  if(!allies().length){finished=true;log("味方が全員倒れた");}
 }
 render();
}
function resetGame(){
 characters=[
  new Hero("勇者"),
  new Slime("敵スライム","enemy"),
  new Slime("仲間スライム","friend"),
  new Wizard("魔法使い")
 ];
 finished=false;$("log").replaceChildren();
 
 log(`${enemies().length}体の敵スライムが現れた！`);render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);

resetGame();
