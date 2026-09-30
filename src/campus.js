import { FACILITIES, LAND_PLOTS, facilityStage } from './facilities.js';
/** Vistas físicas do clube. As construções representam o MESMO estado da simulação. */
export function drawCampus(r,s,dt){
 const c=r.ctx,w=r.width,h=r.height,compact=w<1000||h<620;
 const top=compact?206:155,bottom=compact?178:190;
 const v={x:14,y:top,w:w-28,h:Math.max(110,h-top-bottom)};
 const area=r.district||'club',overview=area==='club',scale=Math.min(v.w/1200,v.h/640),ox=v.x+(v.w-1200*scale)/2,oy=v.y+(v.h-640*scale)/2;
 r.hitZones=[];r.ox=ox;r.oy=oy;r.scale=scale;r.lastPlayer=s.player;
 c.setTransform(r.dpr,0,0,r.dpr,0,0);c.fillStyle='#113d32';c.fillRect(0,0,w,h);
 c.save();c.translate(ox,oy);c.scale(scale,scale);
 const ground=c.createLinearGradient(0,0,0,640);ground.addColorStop(0,'#476947');ground.addColorStop(.6,'#71914e');ground.addColorStop(1,'#507842');c.fillStyle=ground;c.beginPath();c.roundRect(0,0,1200,640,35);c.fill();
 const polygon=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const text=(x,y,t,size=16,color='#f9f8de')=>{c.fillStyle=color;c.font=`800 ${size}px system-ui`;c.textAlign='center';c.fillText(t,x,y);};
 const road=(a,b,width=24)=>{c.strokeStyle='#425b3744';c.lineWidth=width+10;c.lineCap='round';c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.strokeStyle='#d5c393';c.lineWidth=width;c.stroke();c.strokeStyle='#efe0b855';c.setLineDash([2,18]);c.lineWidth=2;c.stroke();c.setLineDash([]);};
 const tree=(x,y,size=1)=>{r.ellipse(x+15*size,y+3,25*size,9*size,'#1d332c45');c.fillStyle='#805836';c.fillRect(x-3*size,y-23*size,6*size,23*size);r.ellipse(x,y-36*size,23*size,27*size,'#225d3f');r.ellipse(x-6*size,y-42*size,18*size,22*size,'#3e894c');r.ellipse(x-9*size,y-50*size,10*size,13*size,'#86b864');};
 const hot=(id,x,y,ww,hh,type='facility')=>r.hitZones.push({id:'campus',facility:type==='facility'?id:undefined,plot:type==='plot'?id:undefined,x:ox+x*scale,y:oy+y*scale,w:ww*scale,h:hh*scale});
 const sprite=(x,y,color=0,size=30)=>{const img=r.assets[color===10?'atleta-azul.png':color===11?'atleta-laranja.png':['torcedor-verde.png','torcedor-roxo.png','torcedor-dourado.png'][color%3]];if(img)c.drawImage(img,x-size*.32,y-size,size*.64,size);};
 const stagePlate=(id,x,y,width=210)=>{const f=FACILITIES[id],st=facilityStage(s.facilities[id]);r.plate(x-width/2,y,width,31,f.name,'#fbf5d6',13);text(x,y+48,st.built?`FASE ${st.phase} · MELHORIA ${st.step}/3`:'CLIQUE PARA CONSTRUIR',11,'#f0ecc3');};
 const building=(id,x,y,size=1)=>{
  const st=facilityStage(s.facilities[id]),ww=170*size,hh=85*size;
  if(!st.built){polygon([[x-ww/2,y],[x-ww/2+26,y-44],[x+ww/2,y-44],[x+ww/2-26,y]],'#cec68a77');c.strokeStyle='#fceeb2';c.setLineDash([6,5]);c.strokeRect(x-ww/2,y-60,ww,65);c.setLineDash([]);text(x,y-24,'+ CONSTRUIR',14);hot(id,x-ww/2-25,y-110,ww+50,155);stagePlate(id,x,y+10);return;}
  const color={board:'#e6c498',marketing:'#9fc7a4',coaching:'#d8c994',canteen:'#e4b972',training:'#9bbbb3'}[id]||'#e4c394';
  const stories=st.phase>=3?1.4:1,roof=st.phase>=3?'#17534b':'#687b52';
  r.ellipse(x+15,y+10,ww*.64,hh*.25,'#15393055');polygon([[x-ww/2,y],[x+ww/2,y],[x+ww/2,y-hh*stories],[x-ww/2,y-hh*stories]],color);
  polygon([[x+ww/2,y],[x+ww/2+25,y-25],[x+ww/2+25,y-hh*stories-20],[x+ww/2,y-hh*stories]],'#8a9b75');
  polygon([[x-ww/2-12,y-hh*stories],[x-ww/2+18,y-hh*stories-45],[x+ww/2+30,y-hh*stories-45],[x+ww/2+12,y-hh*stories]],roof);
  c.strokeStyle='#d3dfaa33';c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(x-ww/2+i*ww/8,y-hh*stories);c.lineTo(x-ww/2+30+i*ww/8,y-hh*stories-45);c.stroke();}
  c.fillStyle='#18473f';c.fillRect(x-18*size,y-51*size,36*size,51*size);c.fillStyle='#f2cd77';for(const xx of[-55,55]){c.fillRect(x+xx*size-12,y-60*size,24*size,24*size);c.fillStyle='#ffe7a5';c.fillRect(x+xx*size-10,y-58*size,9*size,20*size);c.fillStyle='#f2cd77';}
  if(st.phase>=3){for(let i=0;i<4;i++){c.fillStyle='#85d3bf';c.fillRect(x-62*size+i*36*size,y-100*size,23*size,18*size);}c.fillStyle='#163f33';c.fillRect(x-ww/2-15,y+3,ww+30,9);}
  if(st.phase>=4){tree(x-ww/2-28,y,.75);tree(x+ww/2+45,y,.75);}stagePlate(id,x,y+20);hot(id,x-ww/2-30,y-hh*stories-48,ww+70,hh*stories+120);
 };
 const pitch=(id,x,y,ww=380,hh=195)=>{
  const st=facilityStage(s.facilities[id]);
  c.fillStyle='#203d32';c.beginPath();c.roundRect(x-ww/2-9,y-hh/2-8,ww+18,hh+20,12);c.fill();
  if(!st.built){c.fillStyle='#97a063';c.fillRect(x-ww/2,y-hh/2,ww,hh);text(x,y,'TERRENO DO CAMPO',17);text(x,y+27,'CLIQUE PARA CONSTRUIR',12);stagePlate(id,x,y+hh/2+25,ww*.65);hot(id,x-ww/2-10,y-hh/2-25,ww+20,hh+100);return;}
  for(let i=0;i<10;i++){c.fillStyle=i%2?(st.phase>=3?'#449b47':'#5d9347'):(st.phase>=3?'#58ae51':'#6ca052');c.fillRect(x-ww/2+i*ww/10,y-hh/2,ww/10+1,hh);}
  c.strokeStyle='#f4f8d8';c.lineWidth=2;c.strokeRect(x-ww/2+12,y-hh/2+10,ww-24,hh-20);c.beginPath();c.moveTo(x,y-hh/2+10);c.lineTo(x,y+hh/2-10);c.stroke();c.beginPath();c.ellipse(x,y,hh*.18,hh*.18,0,0,Math.PI*2);c.stroke();
  c.strokeRect(x-ww/2+12,y-hh*.26,ww*.17,hh*.52);c.strokeRect(x+ww/2-12-ww*.17,y-hh*.26,ww*.17,hh*.52);
  for(const side of[-1,1]){const gx=x+side*(ww/2-12);c.fillStyle='#cbd8c966';c.fillRect(gx+(side<0?-15:0),y-24,15,48);c.strokeStyle='#f7fff2';c.strokeRect(gx+(side<0?-15:0),y-24,15,48);}
  const official=id==='stadium'&&s.official;
  for(let i=0;i<10;i++){const ours=i<5,px=x+(ours?-1:1)*(ww*.16+(i%2)*ww*.14)+Math.sin(s.t*.8+i)*8,py=y-hh*.33+(i%5)*hh*.16+Math.cos(s.t*.8+i)*6;sprite(px,py,ours?10:11,hh*.18);}
  const scoring=id==='stadium'&&s.t-s.fields[0].lastGoal<1.8;const bx=scoring?x+(s.fields[0].lastGoalOurs?1:-1)*(ww/2-12):x+Math.sin(s.t*.9)*ww*.28,by=scoring?y:y+Math.cos(s.t*1.2)*hh*.25;r.ellipse(bx,by,5,5,'#fffde9');r.ellipse(bx,by,2,2,'#193d31');
  if(id==='stadium'){
   const rows=st.phase>=3?3:st.phase>=2?2:1,chairs=st.phase>=3?28:st.phase>=2?18:8;
   for(const side of[-1,1])for(let row=0;row<rows;row++){const by=y+side*(hh/2+18+row*16);c.fillStyle='#b8b38c';c.fillRect(x-ww/2,by-7,ww,13);for(let n=0;n<chairs;n++){const px=x-ww/2+10+n*(ww-20)/Math.max(1,chairs-1);c.fillStyle=n%3===0?'#dbeaae':'#206451';c.fillRect(px-4,by-7,9,8);if(official||s.fans.length>n)sprite(px,by+1,0,14+(s.fields[0].lastGoalOurs&&s.t-s.fields[0].lastGoal<2?3*Math.sin(s.t*12):0));}}
   if(st.phase>=3){for(const dx of[-ww/2-25,ww/2+25])for(const dy of[-hh/2-30,hh/2+35]){c.fillStyle='#465c4c';c.fillRect(x+dx-3,y+dy-65,6,65);c.fillStyle='#ffedaf';c.fillRect(x+dx-15,y+dy-72,30,10);}polygon([[x-ww/2-10,y-hh/2-85],[x+ww/2+10,y-hh/2-85],[x+ww/2+28,y-hh/2-55],[x-ww/2-28,y-hh/2-55]],'#315c51');}
   text(x-ww*.25,y+hh/2+63,'SEU TIME · AZUL',12,'#d9f1ff');text(x+ww*.25,y+hh/2+63,'ADVERSÁRIO · LARANJA',12,'#ffe3bf');
   const f=s.fields[0];r.plate(x-ww*.38,y-hh/2-130,ww*.76,34,`${s.club.sigla} (SEU TIME)  ${f.score[0]} × ${f.score[1]}  ADVERSÁRIO`,'#f9edb0',13);
  }
  stagePlate(id,x,y+hh/2+(id==='stadium'?80:22),ww*.65);hot(id,x-ww/2-15,y-hh/2-55,ww+30,hh+125);
 };
 if(overview){
  road([90,542],[1120,542],36);road([565,545],[565,100],34);road([140,315],[1060,315],25);road([245,535],[245,190],18);road([920,525],[920,190],18);
  for(let i=0;i<18;i++){tree(30+i*66,620,.65);tree(30+i*66,60,.65);}for(const x of[35,1165])for(const y of[170,260,410,520])tree(x,y,.75);
  const groups=[{id:'academy',x:65,y:80,w:420,h:220},{id:'stadium',x:630,y:80,w:470,h:245},{id:'business',x:600,y:355,w:500,h:190}];
  for(const g of groups)if(!s.land[g.id]){c.fillStyle='#435842bb';c.fillRect(g.x,g.y,g.w,g.h);c.strokeStyle='#ead5a2';c.setLineDash([10,7]);c.strokeRect(g.x+6,g.y+6,g.w-12,g.h-12);c.setLineDash([]);const p=LAND_PLOTS.find(p=>p.id===g.id);text(g.x+g.w/2,g.y+g.h/2-12,p.name.toUpperCase(),17);text(g.x+g.w/2,g.y+g.h/2+20,`${p.cost} MOEDAS · COMPRAR`,13);hot(p.id,g.x,g.y,g.w,g.h,'plot');}
  if(s.land.academy){pitch('youth',260,166,320,130);building('training',235,488,1.1);}
  else{c.fillStyle='#d5c08f';c.fillRect(135,370,275,122);text(270,435,'VIA DE ACESSO À FORMAÇÃO',12,'#586b48');}
  if(s.land.stadium)pitch('stadium',865,190,380,140);
  if(s.land.business){building('board',700,478,.8);building('marketing',920,480,.8);building('coaching',1085,467,.65);}
  text(380,588,'← ARENA ORIGINAL',13);hot('arena',260,560,240,45);
 }else{
  const id=FACILITIES[area]?area:'stadium';const f=FACILITIES[id];road([600,625],[600,360],65);road([170,555],[1030,555],40);
  for(let i=0;i<12;i++){if(i<4||i>8)tree(70+i*97,615,.95);tree(80+i*92,80,.9);}for(const x of[45,1155])for(const y of[170,310,430,535])tree(x,y,1.1);
  if(!s.land[f.plot]){text(600,265,'TERRENO AINDA NÃO ADQUIRIDO',28);text(600,309,'Compre este espaço no mapa do clube para construir.',19);hot(f.plot,340,210,520,180,'plot');}
  else if(['youth','stadium','pitch1','pitch2'].includes(id))pitch(id,600,300,740,275);
  else{building(id,600,390,2.6);if(s.facilities[id])for(let i=0;i<6;i++)sprite(300+i*95+Math.sin(s.t*.5+i)*18,535+Math.sin(s.t*.8+i)*10,i,44);}
  if(id!=='stadium')text(600,570,f.desc,17);text(600,599,'Clique na instalação para administrar e evoluir.',13,'#ecedc9');
 }
 c.restore();
}
