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
  constructor(name, team, controller = null) {
    this.controller = controller;
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
let friendlyController, enemyController;

const $=id=>document.querySelector("#"+id);
function log(message){const p=document.createElement("p");p.textContent=message;$("log").appendChild(p);}
function living(team){return characters.filter(c=>c.team===team&&c.hp>0);}
function enemies(){return living("enemy");}
function allies(){return living("friend");}
function render(){
 const host=$("actors");
 host.replaceChildren();
 for(const character of characters){
  const card=document.createElement("article");
  
  card.textContent=character.name+" HP:"+character.hp;
  host.appendChild(card);
 }
 $("next-turn").disabled=finished;
 $("friend-target").disabled=$("auto-friend").checked;
}
function updateTargetOptions(){
 const select=$("friend-target");select.replaceChildren();
 characters.forEach((c,index)=>{
  if(c.team!=="enemy")return;
  const option=document.createElement("option");
  option.value=String(index);option.textContent=c.name;select.appendChild(option);
 });
}
function playerControl(actor,targets){
 const selected=characters[Number($("friend-target").value)];
 return selected&&targets.includes(selected)&&actor.canAttack(selected)?selected:null;
}
function cpuControl(actor,targets){
 return targets.filter(c=>c.hp>0&&actor.canAttack(c)).sort((a,b)=>a.hp-b.hp)[0]||null;
}
class AlternatingTargetController {
 constructor(){this.preferLowest=true;}
 choose(actor,targets){
  const candidates=targets.filter(t=>t.hp>0&&actor.canAttack(t));
  candidates.sort((a,b)=>this.preferLowest?a.hp-b.hp:b.hp-a.hp);
  if(candidates.length)this.preferLowest=!this.preferLowest;
  return candidates[0]||null;
 }
}

function nextTurn(){
 if(finished)return;
 const hero=characters.find(c=>c.name==="勇者");
 const wizard=characters.find(c=>c.name==="魔法使い");
 const friend=characters.find(c=>c.name==="仲間スライム");
 let target=enemies()[0];if(hero.hp>0&&target)log(hero.attack(target));
 if(friend.hp>0&&enemies().length){
  target=friendlyController(friend,enemies());
  if(target)log(friend.attack(target));else log("仲間スライムは攻撃を見送った");
 }
 target=enemies()[0];if(wizard.hp>0&&target)log(wizard.attack(target));
 if(!enemies().length){finished=true;log("敵スライムをすべて倒した！");}
 else{
  for(const enemy of enemies()){
   const target=enemy.controller.choose(enemy,allies());
   if(target)log(enemy.attack(target));
  }
  if(!allies().length){finished=true;log("味方が全員倒れた");}
 }
 render();
}
function resetGame(){
 characters=[
  new Hero("勇者"),
  new Wizard("魔法使い"),
  new Slime("仲間スライム","friend"),
  new Slime("敵スライムA","enemy",new AlternatingTargetController()),
  new Slime("敵スライムB","enemy",new AlternatingTargetController()),
  new Slime("敵スライムC","enemy",new AlternatingTargetController())
 ];
 finished=false;$("log").replaceChildren();
 $("auto-friend").checked=false;updateTargetOptions();
 
 friendlyController=playerControl;enemyController=cpuControl;
 log(`${enemies().length}体の敵スライムが現れた！`);render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);
$("auto-friend").addEventListener("change",()=>{
 friendlyController=$("auto-friend").checked?cpuControl:playerControl;
 render();
});
resetGame();
