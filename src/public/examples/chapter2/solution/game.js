class Hero {
  constructor(name) { this.name = name; this.hp = 40; this.sprite = "🧑‍🦱"; this.team = "friend"; }
  attack(target) {
    const damage = 8;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の攻撃！ ${target.name}に${damage}ダメージ！`;
  }
}
class Wizard {
  constructor(name) { this.name = name; this.hp = 25; this.sprite = "🧙"; this.team = "friend"; }
  attack(target) {
    const damage = 6;
    target.hp = Math.max(0, target.hp - damage);
    return `${this.name}の魔法！ ${target.name}に${damage}ダメージ！`;
  }
}
class Slime {
  constructor(name, team, sprite) {
    this.name = name;
    this.hp = 30; this.sprite = sprite;
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
let turnNumber=0;
let currentTurnLog=null;

const $=id=>document.querySelector("#"+id);
function log(message){
 const p=document.createElement("p");p.textContent=message;
 (currentTurnLog||$("log")).appendChild(p);
}
function beginTurnLog(){
 const section=document.createElement("section");
 const heading=document.createElement("h3");
 heading.textContent="ターン"+(++turnNumber);
 section.appendChild(heading);
 $("log").prepend(section);
 currentTurnLog=section;
}
function living(team){return characters.filter(c=>c.team===team&&c.hp>0);}
function enemies(){return living("enemy");}
function allies(){return living("friend");}
function render(){
 const host=$("actors")||document.querySelector(".battle");
 host.replaceChildren();
 for(const character of characters){
  const card=document.createElement("article");
  card.className="character";
  const sprite=document.createElement("div");
  sprite.className="sprite";
  sprite.textContent=character.sprite;
  const name=document.createElement("h2");
  name.textContent=character.name;
  const hp=document.createElement("p");
  hp.textContent="HP: "+character.hp;
  card.append(sprite,name,hp);
  host.appendChild(card);
 }
 $("next-turn").disabled=finished;
}

function nextTurn(){
 if(finished)return;
 beginTurnLog();
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
 currentTurnLog=null;
 render();
}
function resetGame(){
 characters=[
  new Hero("勇者"),
  new Slime("敵スライム","enemy","🟦"),
  new Slime("仲間スライム","friend","🟩"),
  new Wizard("魔法使い")
 ];
 finished=false;turnNumber=0;currentTurnLog=null;$("log").replaceChildren();
 
 log(`${enemies().length}体の敵スライムが現れた！`);render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);

resetGame();
