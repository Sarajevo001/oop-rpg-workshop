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
resetGame();let characters, finished;
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
   const target=cpuControl(enemy,allies());
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
  new Slime("敵スライムA","enemy"),
  new Slime("敵スライムB","enemy")
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
