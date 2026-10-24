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


let hero, wizard, friendlySlime, enemySlimes, finished;
let friendlyController, enemyController;
let enemyModes;

const $ = id => document.querySelector("#"+id);
function log(message){const p=document.createElement("p");p.textContent=message;$("log").appendChild(p);}
function enemies(){return enemySlimes.filter(x=>x.hp>0);}
function allies(){return [hero,wizard,friendlySlime].filter(x=>x.hp>0);}
function playerControl(actor,targets){
 const selected=enemySlimes[Number($("friend-target").value)];
 return selected&&targets.includes(selected)&&actor.canAttack(selected)?selected:null;
}
function cpuControl(actor,targets){
 return targets.filter(x=>x.hp>0&&actor.canAttack(x)).sort((a,b)=>a.hp-b.hp)[0]||null;
}
function updateTargetOptions(){
 const select=$("friend-target");select.replaceChildren();
 enemySlimes.forEach((enemy,index)=>{
  const option=document.createElement("option");
  option.value=String(index);option.textContent=enemy.name;select.appendChild(option);
 });
}
function render(){
 for(const [id,actor] of [["hero",hero],["wizard",wizard],["friend",friendlySlime]])
  $(id).textContent=actor.name+" HP:"+actor.hp;
 const list=$("enemy-list");list.replaceChildren();
 for(const enemy of enemySlimes){
  const article=document.createElement("article");
  article.textContent=enemy.name+" HP:"+enemy.hp;list.appendChild(article);
 }
 $("next-turn").disabled=finished;
 $("friend-target").disabled=$("auto-friend").checked;
}
// 課題段階の実装例：各個体の選択方針をゲーム側のMapで管理する
function centrallyControlledTarget(actor,targets){
 const available=targets.filter(t=>t.hp>0&&actor.canAttack(t));
 const preferLowest=enemyModes.get(actor);
 available.sort((a,b)=>preferLowest?a.hp-b.hp:b.hp-a.hp);
 if(available.length)enemyModes.set(actor,!preferLowest);
 return available[0]||null;
}

function nextTurn(){
 if(finished)return;
 let target=enemies()[0];if(hero.hp>0&&target)log(hero.attack(target));
 if(friendlySlime.hp>0&&enemies().length){
  target=friendlyController(friendlySlime,enemies());
  if(target)log(friendlySlime.attack(target));else log("仲間スライムは攻撃を見送った");
 }
 target=enemies()[0];if(wizard.hp>0&&target)log(wizard.attack(target));
 if(!enemies().length){finished=true;log("敵スライムをすべて倒した！");}
 else{
  for(const enemy of enemies()){
   target=centrallyControlledTarget(enemy,allies());
   if(target)log(enemy.attack(target));
  }
  if(!allies().length){finished=true;log("味方が全員倒れた");}
 }
 render();
}
function resetGame(){
 hero=new Hero("勇者");wizard=new Wizard("魔法使い");
 friendlySlime=new Slime("仲間スライム","friend");
 enemySlimes=[
  new Slime("敵スライムA","enemy"),
  new Slime("敵スライムB","enemy")
 ];
 finished=false;$("log").replaceChildren();
 $("auto-friend").checked=false;updateTargetOptions();
 friendlyController=playerControl;enemyController=cpuControl;
 enemyModes=new Map(enemySlimes.map(enemy=>[enemy,true]));
 log(`${enemySlimes.length}体の敵スライムが現れた！`);render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);
$("auto-friend").addEventListener("change",()=>{
 friendlyController=$("auto-friend").checked?cpuControl:playerControl;
 render();
});
resetGame();
