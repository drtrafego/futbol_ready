import { CFG } from './config.js';
import { FACILITIES, facilityStage } from './facilities.js';
import { worldToArt, artToWorld } from './scene.js';
import { walkable } from './navigation.js';

/** Physical parcels share one coordinate system. Buying removes a boundary,
 * not a screen. Art coordinates are pixels at a nominal zoom of 1. */
export const WORLD_PLOTS = Object.freeze([
  { id:'home', name:'Arena da Vila', x:0, y:0, w:1536, h:960, cost:0 },
  { id:'academy', name:'Terreno da formação', x:1536, y:0, w:960, h:960, cost:500 },
  { id:'stadium', name:'Terreno do estádio', x:0, y:-896, w:1536, h:896, cost:1200 },
  { id:'business', name:'Terreno da sede', x:-960, y:0, w:960, h:960, cost:1800 },
]);
export const WORLD_STRUCTURES = Object.freeze({
  pitch1:{x:608,y:310,w:340,h:210, fixed:true},
  pitch2:{x:1056,y:310,w:348,h:210, fixed:true},
  stands:{x:608,y:450,w:350,h:48, fixed:true},
  gate:{x:704,y:660,w:148,h:80, fixed:true},
  canteen:{x:328,y:794,w:148,h:90, fixed:true},
  youth:{x:1968,y:248,w:448,h:224},
  training:{x:1968,y:652,w:288,h:192},
  stadium:{x:768,y:-440,w:768,h:352},
  board:{x:-472,y:252,w:256,h:160},
  marketing:{x:-696,y:672,w:224,h:144},
  coaching:{x:-272,y:672,w:224,h:144},
});
export const WORLD_LIMITS=Object.freeze({left:-960,top:-896,right:2496,bottom:960,step:32});
export const TRAINING_KIT_LIMIT=48;
export const worldPlotAt=(x,y)=>WORLD_PLOTS.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h);
export const structureRect=(id,pos)=>({x:pos.x-WORLD_STRUCTURES[id].w/2,y:pos.y-WORLD_STRUCTURES[id].h/2,w:WORLD_STRUCTURES[id].w,h:WORLD_STRUCTURES[id].h});
export const structureEntry=(id,pos)=>({x:pos.x,y:pos.y+WORLD_STRUCTURES[id].h/2+42});
export const insideRect=(x,y,r,padding=0)=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding;
export function blankWorld(s){
  const pos=worldToArt(s.player.x,s.player.z), placements={};
  for(const id of Object.keys(WORLD_STRUCTURES))if((s.facilities[id]||0)>0)placements[id]={x:WORLD_STRUCTURES[id].x,y:WORLD_STRUCTURES[id].y};
  return {version:1,actor:{...pos,route:[],walk:0},placements,construction:[],training:null,ctKits:0,courierHired:false,
    courier:{...worldToArt(CFG.supply.x,CFG.supply.z),route:[],walk:0,carry:0,target:'supply'},completedJobs:0,delivered:0};
}
export function ensureWorld(s){if(!s.map)s.map=blankWorld(s);return s.map;}
export function mapPlacementCheck(s,id,pos,ignoreSelf=false){
  const spec=WORLD_STRUCTURES[id],fac=FACILITIES[id];
  if(!spec||!fac||!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return{ok:false,reason:'Local inválido.'};
  const plot=WORLD_PLOTS.find(p=>p.id===fac.plot),r=structureRect(id,pos);
  if(!s.land[plot.id])return{ok:false,reason:'Compre o terreno antes de construir.'};
  if(spec.fixed)return{ok:true};
  if(r.x<plot.x+48||r.y<plot.y+96||r.x+r.w>plot.x+plot.w-48||r.y+r.h>plot.y+plot.h-92)return{ok:false,reason:'Deixe espaço para os acessos dentro do lote.'};
  for(const [other,p] of Object.entries(s.map?.placements||{})){
    if(ignoreSelf&&other===id)continue;
    const b=structureRect(other,p);
    if(r.x<b.x+b.w+55&&r.x+r.w>b.x-55&&r.y<b.y+b.h+55&&r.y+r.h>b.y-55)return{ok:false,reason:'Muito perto de outra construção. Reserve espaço para circulação.'};
  }
  return{ok:true};
}
export function mapWalkable(s,x,y){
  const plot=worldPlotAt(x,y);
  if(!plot||!s.land[plot.id])return false;
  if(plot.id==='home'){
    const p=artToWorld(x,y);
    // Public perimeter and central access lane connect the inherited arena to
    // the new parcels without changing the arena's resource/queue coordinates.
    return walkable(p.x,p.z,.33)||y>=856||x<150||x>1354||(x>824&&x<880&&y<215);
  }
  for(const [id,pos] of Object.entries(s.map?.placements||{})){
    if(FACILITIES[id].plot==='home')continue;
    if(insideRect(x,y,structureRect(id,pos),12))return false;
  }
  return true;
}
class MapHeap{
 constructor(){this.a=[];}
 push(id,score){let i=this.a.length;this.a.push({id,score});while(i){const p=(i-1)>>1;if(this.a[p].score<=score)break;this.a[i]=this.a[p];i=p;}this.a[i]={id,score};}
 pop(){const top=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(true){let k=i*2+1;if(k>=this.a.length)break;if(k+1<this.a.length&&this.a[k+1].score<this.a[k].score)k++;if(last.score<=this.a[k].score)break;this.a[i]=this.a[k];i=k;}this.a[i]=last;}return top;}
}
/** Eight-way A*, no diagonal corner cutting. Bounded work for mobile devices. */
export function worldPath(s,start,end){
 if(!end||!Number.isFinite(end.x)||!Number.isFinite(end.y)||!worldPlotAt(end.x,end.y)||!s.land[worldPlotAt(end.x,end.y).id])return[];
 const b=WORLD_LIMITS,step=b.step,cols=(b.right-b.left)/step,rows=(b.bottom-b.top)/step,n=cols*rows;
 const point=i=>({x:b.left+(i%cols)*step+step/2,y:b.top+Math.floor(i/cols)*step+step/2});
 const available=new Uint8Array(n);let first=-1,last=-1,ds=Infinity,de=Infinity;
 for(let i=0;i<n;i++){const p=point(i);if(!mapWalkable(s,p.x,p.y))continue;available[i]=1;const a=Math.hypot(p.x-start.x,p.y-start.y),z=Math.hypot(p.x-end.x,p.y-end.y);if(a<ds){ds=a;first=i;}if(z<de){de=z;last=i;}}
 if(first<0||last<0||de>100||ds>120)return[];
 const g=new Float64Array(n).fill(Infinity),from=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=new MapHeap();g[first]=0;heap.push(first,0);
 const target=point(last),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 while(heap.a.length){const current=heap.pop().id;if(closed[current])continue;if(current===last)break;closed[current]=1;const xx=current%cols,yy=Math.floor(current/cols);
  for(const [dx,dy]of dirs){const x=xx+dx,y=yy+dy,j=y*cols+x;if(x<0||x>=cols||y<0||y>=rows||!available[j]||closed[j])continue;if(dx&&dy&&(!available[yy*cols+x]||!available[y*cols+xx]))continue;const cost=g[current]+(dx&&dy?1.41421356:1);if(cost>=g[j])continue;g[j]=cost;from[j]=current;const p=point(j);heap.push(j,cost+Math.hypot(p.x-target.x,p.y-target.y)/step);}}
 if(last!==first&&from[last]<0)return[];const result=[];let i=last;while(i!==first&&i>=0){result.push(point(i));i=from[i];}result.reverse();
 // Exact final point is useful for resource interaction circles.
 if(mapWalkable(s,end.x,end.y))result.push({...end});
 return result;
}
export function advanceMapActor(actor,dt,speed){
 let remaining=dt*speed,moved=0;
 while(remaining>0&&actor.route.length){const p=actor.route[0],d=Math.hypot(p.x-actor.x,p.y-actor.y);if(d<.05){actor.route.shift();continue;}const step=Math.min(remaining,d);actor.x+=(p.x-actor.x)*step/d;actor.y+=(p.y-actor.y)*step/d;remaining-=step;moved+=step;if(d<=step+.01)actor.route.shift();}
 actor.walk=dt?moved/dt:0;return actor.route.length===0;
}
/** Versioned map extension. Old saves migrate without resetting balances,
 * clubs, profiles or existing construction levels. */
export function restoreWorld(s,raw){
 const fresh=blankWorld(s);if(!raw.map){s.map=fresh;return s;}
 const m=raw.map,bad=label=>{throw new Error(`Save inválido: mapa / ${label}.`);};
 const int=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)bad(label);return v;};
 const num=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)bad(label);return v;};
 const pos=p=>{if(!p)bad('posição');return{x:num(p.x,-970,2506,'x'),y:num(p.y,-906,970,'y')};};
 const actor=a=>{if(!Array.isArray(a?.route)||a.route.length>500)bad('caminho');return{...pos(a),walk:0,route:a.route.map(pos)};};
 if(m.version!==1)bad('versão');fresh.actor=actor(m.actor);fresh.placements={};
 if(!m.placements||typeof m.placements!=='object'||Array.isArray(m.placements))bad('instalações');
 for(const[id,p]of Object.entries(m.placements)){if(!WORLD_STRUCTURES[id])bad('tipo de instalação');fresh.placements[id]=pos(p);}
 fresh.ctKits=int(m.ctKits,0,TRAINING_KIT_LIMIT,'kits');fresh.delivered=int(m.delivered??0,0,1e12,'entregas');fresh.completedJobs=int(m.completedJobs??0,0,1e12,'obras');
 if(typeof m.courierHired!=='boolean')bad('auxiliar');fresh.courierHired=m.courierHired;
 fresh.courier={...actor(m.courier),carry:int(m.courier.carry,0,3,'carga'),target:m.courier.target==='training'?'training':'supply'};
 s.map=fresh;
 if(!Array.isArray(m.construction)||m.construction.length>3)bad('obras');
 fresh.construction=m.construction.map(j=>{if(!WORLD_STRUCTURES[j.id]||!fresh.placements[j.id])bad('obra');const from=int(j.from,0,14,'nível'),to=int(j.to,1,15,'nível alvo');if(to!==from+1||s.facilities[j.id]!==from)bad('estado da obra');return{id:j.id,from,to,elapsed:num(j.elapsed,0,300,'tempo'),duration:num(j.duration,1,300,'duração'),worker:actor(j.worker)};});
 if(new Set(fresh.construction.map(j=>j.id)).size!==fresh.construction.length)bad('obra duplicada');
 if(m.training){const j=m.training;if(!['team','player','youth'].includes(j.kind)||!Array.isArray(j.ids)||!j.ids.length||j.ids.length>30)bad('treino');const roster=j.kind==='youth'?s.youthList:s.roster;if(j.ids.some(id=>!roster.some(p=>p.id===id))||new Set(j.ids).size!==j.ids.length)bad('atletas do treino');fresh.training={kind:j.kind,ids:[...j.ids],elapsed:num(j.elapsed,0,300,'tempo de treino'),duration:num(j.duration,1,300,'duração de treino')};}
 for(const id of Object.keys(WORLD_STRUCTURES)){if(s.facilities[id]>0&&!fresh.placements[id])fresh.placements[id]={x:WORLD_STRUCTURES[id].x,y:WORLD_STRUCTURES[id].y};}
 for(const[id,p]of Object.entries(fresh.placements)){if(!s.land[FACILITIES[id].plot])bad('construção em terreno fechado');if(!mapPlacementCheck(s,id,p,true).ok)bad('construções sobrepostas');}
 if(!mapWalkable(s,fresh.actor.x,fresh.actor.y))fresh.actor={...worldToArt(s.player.x,s.player.z),route:[],walk:0};
 return s;
}
