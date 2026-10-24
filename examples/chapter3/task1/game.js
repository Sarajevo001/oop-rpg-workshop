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

let hero,wizard,friendlySlime,enemySlime,enemySlime2,finished;

const $ = id => document.querySelector("#"+id);
function log(message){const p=document.createElement("p");p.textContent=message;$("log").appendChild(p);}
function enemies(){return [enemySlime,enemySlime2].filter(x=>x.hp>0);}
function allies(){return [hero,wizard,friendlySlime].filter(x=>x.hp>0);}
function playerControl(actor,targets){
 const selected=$("friend-target").value==="a"?enemySlime:enemySlime2;
 return selected.hp>0&&actor.canAttack(selected)?selected:null;
}
function cpuControl(actor,targets){
 return targets.filter(x=>x.hp>0&&actor.canAttack(x)).sort((a,b)=>a.hp-b.hp)[0]||null;
}
function render(){
 for(const [id,actor] of [["hero",hero],["wizard",wizard],["friend",friendlySlime],["enemy",enemySlime],["enemy2",enemySlime2]])
  $(id).textContent=actor.name+" HP:"+actor.hp;
 $("next-turn").disabled=finished;
 $("friend-target").disabled=false;
}
function nextTurn(){
 if(finished)return;
 let target=enemies()[0];if(target)log(hero.attack(target));
 if(enemies().length){
 // 味方ならプレイヤー操作、という決め打ち
 target=friendlySlime.team==="friend"?playerControl(friendlySlime,enemies()):cpuControl(friendlySlime,enemies());
 if(target)log(friendlySlime.attack(target));else log("仲間スライムは攻撃を見送った");
 }
 target=enemies()[0];if(target)log(wizard.attack(target));
 if(!enemies().length){finished=true;log("敵スライムをすべて倒した！");}
 else{
  for(const enemy of enemies()){
   target=enemy.team==="enemy"?cpuControl(enemy,allies()):null;
   if(target)log(enemy.attack(target));
  }
  if(!allies().length){finished=true;log("味方が全員倒れた");}
 }
 render();
}
function resetGame(){
 hero=new Hero("勇者");wizard=new Wizard("魔法使い");
 friendlySlime=new Slime("仲間スライム","friend");
 enemySlime=new Slime("敵スライムA","enemy");
 enemySlime2=new Slime("敵スライムB","enemy");
 finished=false;$("log").replaceChildren();
 $("auto-friend").checked=false;$("friend-target").value="a";
 
 log("2体の敵スライムが現れた！");render();
}
$("next-turn").addEventListener("click",nextTurn);
$("reset").addEventListener("click",resetGame);
$("auto-friend").addEventListener("change",()=>{
 
 render();
});
resetGame();
