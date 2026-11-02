// Biblioteca visual da LIVE — a fonte OBS permanece /animacoes-obs.html.
// Preserva os clássicos coração/confetes, acrescenta canvas leve para 25 efeitos.
// A prévia (?preview=1) recebe apenas eventos locais e NUNCA dispara o OBS.
(()=>{
'use strict';
const stage=document.getElementById('animacoesStage');
const notice=document.getElementById('animacoesNotice');
if(!stage)return;
const preview=new URLSearchParams(location.search).get('preview')==='1';
let revision=null,first=true,polling=false,timer=null,frame=0,token=0,active=null;
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const palette=['#ff4fa8','#f59e0b','#54ddff','#ad77ff','#54ffc8','#fffbf5','#f961e6'];
const label=msg=>{if(notice)notice.textContent=msg};
const make=(tag,cls,txt)=>{const node=document.createElement(tag);node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
const rnd=(i,n=1)=>{const x=Math.sin(i*117.71+n*79.19)*43758.5453;return x-Math.floor(x)};
const normalize=a=>({
 ...a,
 duration:clamp(Number(a.duration)||5000,1500,30000),
 intensity:clamp(Number(a.intensity)||65,20,100),
 speed:clamp(Number(a.speed)||1,.4,2.5),
 position:['full','center','edges'].includes(a.position)?a.position:'full',
 loop:a.loop===true,
 color:/^#[\da-f]{6}$/i.test(a.color)?a.color:'#bf61ff',
 emoji:String(a.emoji||'✨').slice(0,16)
});
function stop(){
 token++;
 if(timer)clearTimeout(timer);
 timer=null;
 if(frame)cancelAnimationFrame(frame);
 frame=0;active=null;
 stage.replaceChildren();
 label('Aguardando ação do console…');
}
function pickedX(i,a){
 let x=rnd(i,11);
 if(a.position==='center')x=.22+x*.56;
 if(a.position==='edges')x=x<.5?x*.22:.78+(x-.5)*.44;
 return x;
}
function pickedY(i,a){
 let y=rnd(i,21);
 if(a.position==='center')y=.25+y*.5;
 if(a.position==='edges')y=y<.5?y*.22:.78+(y-.5)*.44;
 return y;
}
function caption(a){
 if(!a.message)return;
 const el=make('div','effect-caption',a.emoji+' '+a.message);
 if(a.loop)el.classList.add('effect-caption-loop');
 stage.append(el);
}
function sprinkle(a,count,kind){
 const colors=palette;
 for(let i=0;i<count;i++){
  const c=kind==='confetti'?'':a.emoji;
  const e=make('span','effect-particle '+kind,c);
  e.style.setProperty('--x',pickedX(i,a)*100+'%');
  e.style.setProperty('--delay',(-rnd(i,2)*a.duration)+'ms');
  e.style.setProperty('--spin',((rnd(i,3)*2-1)*850)+'deg');
  e.style.setProperty('--scale',(.5+rnd(i,4)*1.15).toFixed(2));
  e.style.setProperty('--speed',((2.3+rnd(i,5)*2.1)/a.speed)+'s');
  if(kind==='confetti'){e.style.background=colors[i%colors.length];e.style.borderRadius=i%3===0?'50%':'2px'}
  if(kind==='glowing'){e.style.top=pickedY(i,a)*100+'%';e.style.animationDuration=(1.3/a.speed)+'s'}
  stage.append(e);
 }
}
function popup(a,kind='effect-banner'){
 const banner=make('div',kind);
 banner.style.setProperty('--accent',a.color);
 banner.append(make('span','effect-hero',a.emoji));
 const words=make('div','effect-copy');words.append(make('strong','effect-title',a.name));
 if(a.message)words.append(make('span','effect-subtitle',a.message));
 banner.append(words);stage.append(banner);
}
function particle(i,a){
 const r=rnd(i,1),s=rnd(i,2),q=rnd(i,3),z=rnd(i,4);
 return {x:pickedX(i,a),y:pickedY(i,a),phase:rnd(i,5),radius:8+rnd(i,6)*28,
 hue:rnd(i,7)*360,angle:rnd(i,8)*TAU,length:40+rnd(i,9)*175,
 rotation:rnd(i,10)*TAU,color:i%4?a.color:palette[i%palette.length],speed:.65+q*.65,r,s,z};
}
function heart(ctx,x,y,size,fill){
 ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);
 ctx.beginPath();ctx.moveTo(0,24);
 ctx.bezierCurveTo(-5,20,-27,6,-26,-9);
 ctx.bezierCurveTo(-25,-29,-5,-30,0,-17);
 ctx.bezierCurveTo(5,-30,25,-29,26,-9);
 ctx.bezierCurveTo(27,6,5,20,0,24);
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function polygon(ctx,x,y,r,sides,rot,fill){
 ctx.save();ctx.beginPath();
 for(let j=0;j<sides;j++){
  const ang=rot+TAU*j/sides,xx=x+Math.cos(ang)*r,yy=y+Math.sin(ang)*r;
  if(!j)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
 }
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function star(ctx,x,y,r,color){
 ctx.save();ctx.globalAlpha=.9;ctx.lineWidth=Math.max(1,r*.09);
 ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*.8;
 ctx.beginPath();ctx.moveTo(x-r*1.4,y);ctx.lineTo(x+r*1.4,y);
 ctx.moveTo(x,y-r*1.4);ctx.lineTo(x,y+r*1.4);ctx.stroke();
 ctx.beginPath();ctx.arc(x,y,Math.max(1,r*.22),0,TAU);ctx.fillStyle='#fff';ctx.fill();
 ctx.restore();
}
function circle(ctx,x,y,r,fill,stroke,width=2){
 ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke()}
}
function line(ctx,x,y,xx,yy,color,width=3,glow=0){
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
 if(glow){ctx.shadowBlur=glow;ctx.shadowColor=color}
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();ctx.restore();
}
function timed(i,t,cycle=5){
 return ((t+i*.13)%cycle+cycle)%cycle/cycle;
}
function drawItem(ctx,a,p,i,t,w,h){
 const type=a.effect,base=Math.min(w,h);
 const countFactor=a.intensity/65;
 const col=i%5?a.color:palette[i%palette.length];
 const speed=a.speed*p.speed;
 const phase=(p.phase+t*speed*.20)%1;
 let x=p.x*w,y=p.y*h,alpha=1,size=clamp(base*.037,14,38)*(0.65+p.s);
 const fall=['heartRain','kisses','petals','money','coins','diamonds','rain'];
 const rise=['balloons','bubbles','neonHearts'];
 if(fall.includes(type)){
  y=(((p.phase+t*speed*.16)%1)*1.34-.17)*h;
  x+=(Math.sin(phase*TAU*2+p.angle)*.04+Math.sin(t*.6+i)*.012)*w;
  if(type==='petals'){
   ctx.save();ctx.translate(x,y);ctx.rotate(p.rotation+t*speed);
   ctx.fillStyle=i%3===0?'#ffccd8':col;
   ctx.beginPath();ctx.ellipse(0,0,size*.45,size*.95,Math.PI*.20,0,TAU);ctx.fill();
   ctx.strokeStyle='#ffecf5';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }else if(type==='money'){
   ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.8+p.angle)*.36);
   ctx.fillStyle=i%4===0?'#b5ffb7':'#56e3a3';
   ctx.strokeStyle='#146b4e';ctx.lineWidth=2;
   ctx.fillRect(-size*1.1,-size*.52,size*2.2,size*1.04);
   ctx.strokeRect(-size*1.1,-size*.52,size*2.2,size*1.04);
   ctx.fillStyle='#0b684c';ctx.font='bold '+Math.max(10,size*.65)+'px Arial';
   ctx.textAlign='center';ctx.fillText('R$',0,size*.22);ctx.restore();
  }else if(type==='coins'){
   circle(ctx,x,y,size*.62,'#fbd66a','#fff1bc',3);
   circle(ctx,x,y,size*.43,'#bd7b17','#ffe49e',2);
   ctx.fillStyle='#fff2b7';ctx.font='bold '+Math.max(12,size*.8)+'px Arial';
   ctx.textAlign='center';ctx.fillText('$',x,y+size*.26);
  }else if(type==='diamonds'){
   ctx.save();ctx.translate(x,y);ctx.rotate(p.rotation+t*.2);
   polygon(ctx,0,0,size*.9,4,Math.PI/4,'#41cbed');
   polygon(ctx,-size*.12,-size*.1,size*.5,4,Math.PI/4,'#c2faff');
   ctx.strokeStyle='#e6ffff';ctx.strokeRect(-size*.24,-size*.24,size*.48,size*.48);
   ctx.restore();
  }else if(type==='heartRain')heart(ctx,x,y,size,col);
  else{
   ctx.save();ctx.globalAlpha=.9;ctx.font=Math.round(size*1.7)+'px system-ui';
   ctx.textAlign='center';ctx.fillText(type==='kisses'?'💋':a.emoji,x,y);ctx.restore();
  }
  return;
 }
 if(rise.includes(type)){
  y=(1.16-((p.phase+t*speed*.13)%1)*1.38)*h;
  x+=(Math.sin(t*.7+p.angle)*.045)*w;
  if(type==='balloons'){
   const cl=palette[i%palette.length];
   circle(ctx,x,y,size*.75,cl,'#fff9',1.5);
   line(ctx,x,y+size*.75,x+Math.sin(t)*size*.4,y+size*2.6,'#fff9',1.3);
   circle(ctx,x-size*.23,y-size*.27,size*.14,'#fff9');
  }else if(type==='bubbles'){
   circle(ctx,x,y,size*(.6+p.r),'rgba(100,230,255,.08)',col,2.5);
   circle(ctx,x-size*.2,y-size*.22,size*.13,'#ffffffe0');
  }else{
   ctx.save();ctx.shadowColor=col;ctx.shadowBlur=10;
   heart(ctx,x,y,size,col);ctx.restore();
  }
  return;
 }
 if(type==='shootingStars'){
  const u=(p.phase+t*speed*.15)%1;
  x=(1-u)*w*1.5-.15*w;y=(p.y*.9+.05)*h-u*h*.27;
  const len=size*(2+p.z*2);
  const gradient=ctx.createLinearGradient(x,y,x+len,y+len*.8);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.4,col);gradient.addColorStop(1,'transparent');
  line(ctx,x,y,x+len,y+len*.8,gradient,2.5,8);
  star(ctx,x,y,size*.19,'#fff');
  return;
 }
 if(type==='sparkles'||type==='particles'){
  const wiggle=Math.sin(t*speed+p.angle);
  x+=wiggle*35;y+=Math.cos(t*speed+p.angle)*25;
  if(type==='sparkles')star(ctx,x,y,Math.max(4,size*.3*(1+wiggle*.3)),col);
  else{
   ctx.save();ctx.shadowColor=col;ctx.shadowBlur=12;
   circle(ctx,x,y,size*.22,col);ctx.restore();
  }
  return;
 }
 const cx=w*.5,cy=h*.5;
 if(['heartExplosion','neonExplosion','goldenBurst','colorBurst'].includes(type)){
  const wave=(p.phase+t*speed*.24)%1;
  const ang=p.angle+Math.sin(t*.09+i)*.12;
  const radius=base*(.13+wave*1.25)*countFactor;
  const xx=cx+Math.cos(ang)*radius,yy=cy+Math.sin(ang)*radius*h/w;
  ctx.save();ctx.globalAlpha=clamp((1-wave)*1.5,0,1);
  if(type==='heartExplosion')heart(ctx,xx,yy,size*(1-wave*.45),col);
  else if(type==='goldenBurst')star(ctx,xx,yy,Math.max(3,size*(1-wave)*.5),'#ffda61');
  else if(type==='neonExplosion'){
   line(ctx,xx,yy,xx+Math.cos(ang)*size*2,yy+Math.sin(ang)*size*2,col,2,9);
   circle(ctx,xx,yy,Math.max(2,size*.18),col);
  }else{
   const rainbow=palette[i%palette.length];
   polygon(ctx,xx,yy,size*(1-wave*.4),i%2?4:6,p.rotation+t,rainbow);
  }
  ctx.restore();return;
 }
 if(type==='fireworks'){
  const group=i%5;
  const xx=(.16+group*.17)*w, yy=(.2+((group*7)%4)*.12)*h;
  const launch=((t*speed*.32)+group*.26)%1;
  const wave=Math.max(0,launch-.12),angle=p.angle;
  const radius=wave*base*.7;
  const ax=xx+Math.cos(angle)*radius,ay=yy+Math.sin(angle)*radius;
  ctx.save();ctx.globalAlpha=clamp((.95-wave)*1.5,0,1);
  line(ctx,xx,yy,ax,ay,col,2,5);star(ctx,ax,ay,Math.max(2,size*.16),col);
  ctx.restore();return;
 }
 if(type==='crown'){
  // Coroa central grande + partículas douradas em toda a tela.
  const xx=cx+Math.cos(p.angle)*base*(.15+p.r*.95);
  const yy=cy+Math.sin(p.angle)*h*.55*p.s;
  star(ctx,xx,yy,Math.max(3,size*.35),'#ffe08c');return;
 }
 if(type==='lightning'){
  const refresh=Math.floor(t*speed*4);
  const edge=i%2===0?0:w;
  const tx=edge===0?w*.15:w*.85;
  const amp=base*(.2+p.s*.38);
  ctx.save();ctx.globalAlpha=.3+.55*rnd(i,refresh+2);
  ctx.strokeStyle=i%3?'#55dcff':'#c77aff';ctx.lineWidth=2.3;ctx.shadowBlur=10;ctx.shadowColor=ctx.strokeStyle;
  ctx.beginPath();ctx.moveTo(edge,p.y*h);
  for(let j=1;j<=7;j++){
   ctx.lineTo(edge+(tx-edge)*j/7+(rnd(i*13+j,refresh+3)-.5)*amp,p.y*h+j*h*.064);
  }ctx.stroke();ctx.restore();return;
 }
 if(type==='psychedelic'){
  const phase=t*speed*.7+p.angle;
  const radial=base*(.1+p.r*.6);
  const xx=cx+Math.cos(phase)*radial,yy=cy+Math.sin(phase)*radial*h/w;
  ctx.save();ctx.globalAlpha=.4+.5*Math.sin(phase)*Math.sin(phase);
  circle(ctx,xx,yy,Math.max(3,size*(.25+p.z)),col);ctx.restore();return;
 }
}
function scene(ctx,a,t,w,h){
 const base=Math.min(w,h),type=a.effect;
 if(['pulse','lightWaves','psychedelic','neonExplosion','goldenBurst','colorBurst','heartExplosion'].includes(type)){
  const cx=w/2,cy=h/2;
  if(type==='pulse'||type==='psychedelic'||['neonExplosion','goldenBurst','colorBurst','heartExplosion'].includes(type)){
   const loops=type==='pulse'?6:type==='psychedelic'?5:3;
   for(let j=0;j<loops;j++){
    const progress=(t*a.speed*.16+j/loops)%1;
    const r=base*(.1+progress*.95);
    ctx.save();ctx.globalAlpha=(1-progress)*.55;
    ctx.strokeStyle=type==='goldenBurst'?'#ffe089':j%2?a.color:palette[j%palette.length];
    ctx.lineWidth=type==='pulse'?4:2;
    ctx.shadowBlur=12;ctx.shadowColor=ctx.strokeStyle;
    ctx.beginPath();ctx.ellipse(cx,cy,r,r*.75,0,0,TAU);ctx.stroke();
    ctx.restore();
   }
  }
  if(type==='lightWaves'||type==='psychedelic'){
   for(let j=0;j<7;j++){
    ctx.save();ctx.globalAlpha=.48;ctx.lineWidth=3+j*.4;
    ctx.shadowColor=palette[j%palette.length];ctx.shadowBlur=13;
    ctx.strokeStyle=palette[j%palette.length];ctx.beginPath();
    for(let k=0;k<=45;k++){
     const x=w*k/45, y=h*(.2+j*.1)+Math.sin(k*.29+t*a.speed*1.8+j)*base*.13;
     if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }ctx.stroke();ctx.restore();
   }
  }
 }
 if(type==='lightWaves'){
  for(let j=0;j<9;j++){
   ctx.save();ctx.globalAlpha=.38;ctx.lineWidth=2.7;
   ctx.strokeStyle=palette[j%palette.length];ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=11;
   ctx.beginPath();
   for(let k=0;k<=48;k++){
    const x=w*k/48;
    const y=h*(.14+j*.09)+Math.sin(k*.3+t*a.speed*1.7+j)*base*.12;
    if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }ctx.stroke();ctx.restore();
  }
 }
 if(type==='crown'){
  ctx.save();ctx.translate(w*.5,h*.48+Math.sin(t*a.speed)*9);
  const scale=clamp(base/650,.55,1.5);ctx.scale(scale,scale);
  ctx.shadowColor='#ffe07a';ctx.shadowBlur=28;
  ctx.beginPath();ctx.moveTo(-140,0);ctx.lineTo(-112,-145);ctx.lineTo(-52,-72);
  ctx.lineTo(0,-188);ctx.lineTo(52,-72);ctx.lineTo(112,-145);ctx.lineTo(140,0);ctx.closePath();
  const gold=ctx.createLinearGradient(0,-180,0,40);
  gold.addColorStop(0,'#fff3ab');gold.addColorStop(.45,'#f8ca44');gold.addColorStop(1,'#a96c12');
  ctx.fillStyle=gold;ctx.fill();ctx.shadowBlur=0;
  ctx.lineWidth=9;ctx.strokeStyle='#fff5b1';ctx.stroke();
  ctx.fillStyle='#6d3ec5';ctx.fillRect(-135,-8,270,40);
  ctx.strokeStyle='#ffde7f';ctx.lineWidth=5;ctx.strokeRect(-135,-8,270,40);
  for(let j=-2;j<=2;j++){
   circle(ctx,j*54,8,13,palette[(j+7)%palette.length],'#fff');
  }
  ctx.restore();
 }
}
function canvasPlay(a,run){
 const canvas=make('canvas','effect-canvas');
 stage.append(canvas);
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx){label('Este navegador não suporta a animação.');return}
 const total=clamp(Math.round(a.intensity*1.2),24,120);
 const ps=Array.from({length:total},(_,i)=>particle(i,a));
 const clock=performance.now();
 let last=0;
 function draw(now){
  if(run!==token||!active)return;
  frame=requestAnimationFrame(draw);
  if(now-last<33)return;last=now;
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(10,rect.width||window.innerWidth),h=Math.max(10,rect.height||window.innerHeight);
  const dpr=Math.min(1.5,window.devicePixelRatio||1);
  const px=Math.round(w*dpr),py=Math.round(h*dpr);
  if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const t=(now-clock)/1000;
  if(a.position==='center'||a.position==='edges'){
   // Partículas dispersas respeitam distribuição, mantendo ondas e rajadas visíveis.
  }
  scene(ctx,a,t,w,h);
  if(a.effect==='pulse')return;
  for(let i=0;i<ps.length;i++)drawItem(ctx,a,ps[i],i,t,w,h);
 }
 frame=requestAnimationFrame(draw);
}
function play(item){
 stop();
 if(!item)return;
 const a=normalize(item);active=a;
 const run=token;
 stage.style.setProperty('--time',a.duration+'ms');
 stage.style.setProperty('--accent',a.color);
 stage.dataset.position=a.position;
 const kind=a.effect;
 if(kind==='hearts')sprinkle(a,clamp(Math.round(a.intensity*.85),20,85),'rising');
 else if(kind==='confetti')sprinkle(a,clamp(Math.round(a.intensity*1.25),32,125),'confetti');
 else if(kind==='stars')sprinkle(a,clamp(Math.round(a.intensity*.6),18,70),'glowing');
 else if(kind==='banner'||kind==='burst')popup(a,kind==='banner'?'effect-banner':'effect-banner effect-burst');
 else canvasPlay(a,run);
 if(kind!=='banner'&&kind!=='burst')caption(a);
 if(!a.loop){
  timer=setTimeout(()=>{if(run===token)stop()},a.duration+180);
 }
 label('Em reprodução: '+a.name+(a.loop?' (loop ativado)':''));
}
async function poll(){
 if(polling||preview)return;polling=true;
 try{
  const response=await fetch('/api/animacoes',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(first){
   first=false;revision=data.command;
   // Ao abrir fonte durante animação ativa, restaurar somente se ainda estiver no prazo.
   if(data.lastEvent?.loop || (data.lastEvent?.startedAt &&
      Date.now()-data.lastEvent.startedAt<data.lastEvent.duration))play(data.lastEvent);
  }else if(data.command!==revision){revision=data.command;play(data.lastEvent)}
 }catch(e){label('Falha de sincronização: '+e.message)}
 finally{polling=false}
}
if(preview){
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||!event.data||event.data.channel!=='painel-animacoes-preview')return;
  if(event.data.action==='stop')stop();
  else if(event.data.action==='play'&&event.data.effect)play(event.data.effect);
 });
 label('Selecione uma animação no painel e clique em Prévia.');
}else{poll();setInterval(poll,750)}
})();