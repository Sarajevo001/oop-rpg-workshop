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
 const host=$("actors");
 host.replaceChildren();
 for(const character of characters){
  const card=document.createElement("article");
  
  card.textContent=character.name+" HP:"+character.hp;
  host.appendChild(card);
 }
 $("next-turn").disabled=finished;
 updateTargetOptions();
 $("friend-target").disabled=false || $("friend-target").options.length===0;
}
function updateTargetOptions(){
 const select=$("friend-target");
 const previous=select.value;
 select.replaceChildren();
 characters.forEach((character,index)=>{
  if(character.team!=="enemy"||character.hp<=0)return;
  const option=document.createElement("option");
  option.value=String(index);option.textContent=character.name;
  select.appendChild(option);
 });
 const preserved=Array.from(select.options).some(option=>option.value===previous);
 if(preserved)select.value=previous;
 else if(select.options.length)select.selectedIndex=0;
 select.disabled=select.options.length===0;
}
function playerControl(actor,targets){
 const value=$("friend-target").value;
 const selected=value===""?null:characters[Number(value)];
 return selected&&targets.includes(selected)&&actor.team!==selected.team?selected:null;
}
function cpuControl(actor,targets){
 return targets.filter(c=>c.hp>0&&actor.canAttack(c)).sort((a,b)=>a.hp-b.hp)[0]||null;
}

function nextTurn(){
 if(finished)return;
 updateTargetOptions();
 beginTurnLog();
 const hero=characters.find(c=>c.name==="勇者");
 const wizard=characters.find(c=>c.name==="魔法使い");
 const friend=characters.find(c=>c.name==="仲間スライム");
 let target=playerControl(hero,enemies());
 if(hero.hp>0&&target)log(hero.attack(target));
 updateTargetOptions();
 if(friend.hp>0&&enemies().length){
  target=$("auto-friend").checked?cpuControl(friend,enemies()):playerControl(friend,enemies());
  if(target)log(friend.attack(target));else log("仲間スライムは攻撃を見送った");
 }
 updateTargetOptions();
 target=playerControl(wizard,enemies());
 if(wizard.hp>0&&target)log(wizard.attack(target));
 if(!enemies().length){finished=true;log("敵スライムをすべて倒した！");}
 else{
  for(const enemy of enemies()){
   const target=cpuControl(enemy,allies());
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
  new Wizard("魔法使い"),
  new Slime("仲間スライム","friend"),
  new Slime("敵スライムA","enemy"),
  new Slime("敵スライムB","enemy")
 ];
 finished=false;turnNumber=0;currentTurnLog=null;$("log").replaceChildren();
 $("auto-friend").checked=false;updateTargetOptions();
 
 
 log(`${enemies().length}体の敵スライムが現れた！`);render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);
$("auto-friend").addEventListener("change",()=>{
 
 render();
});
resetGame();
