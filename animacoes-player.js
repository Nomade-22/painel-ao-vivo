const stage=document.getElementById('animacoesStage');
const notice=document.getElementById('animacoesNotice');
let revision=null,first=true,polling=false,cleanupTimer=null;
const info=text=>{if(notice)notice.textContent=text;};
function el(tag,className,text){const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;}
function sprinkle(action,count,kind){
 const colors=['#ffcf45','#ff597c','#6bd9ff','#bb7cff','#48e6b3','#ffffff'];
 for(let i=0;i<count;i++){
  const part=el('span','effect-particle '+kind,kind==='confetti'?'':action.emoji);
  const x=Math.random()*100;
  part.style.setProperty('--x',x+'%');
  part.style.setProperty('--delay',(-Math.random()*action.duration)+'ms');
  part.style.setProperty('--spin',(Math.random()*720-360)+'deg');
  part.style.setProperty('--scale',(.65+Math.random()*.95).toFixed(2));
  part.style.setProperty('--speed',(2.5+Math.random()*3.2)+'s');
  if(kind==='confetti')part.style.background=colors[i%colors.length];
  stage.append(part);
 }
}
function fireworks(action){
 const groups=[[25,33],[73,47],[50,24]];
 groups.forEach(([x,y],g)=>{
  for(let i=0;i<18;i++){
   const p=el('span','effect-spark');const angle=(Math.PI*2*i)/18;
   const distance=75+(i%4)*16;
   p.style.left=x+'%';p.style.top=y+'%';p.style.background=i%3===0?'#fff':action.color;
   p.style.setProperty('--dx',(Math.cos(angle)*distance)+'px');
   p.style.setProperty('--dy',(Math.sin(angle)*distance)+'px');
   p.style.animationDelay=(g*.45)+'s';
   stage.append(p);
  }
 });
}
function message(action,kind='effect-banner'){
 const banner=el('div',kind);
 banner.style.setProperty('--accent',action.color);
 const emoji=el('span','effect-hero',action.emoji);
 const words=el('div','effect-copy');
 const label=el('strong','effect-title',action.name);
 words.append(label);
 if(action.message)words.append(el('span','effect-subtitle',action.message));
 banner.append(emoji,words);stage.append(banner);
}
function play(action){
 clearTimeout(cleanupTimer);stage.replaceChildren();
 if(!action){info('Aguardando ação do console…');return;}
 const duration=Math.max(1500,Math.min(12000,Number(action.duration)||5000));
 stage.style.setProperty('--time',duration+'ms');
 stage.style.setProperty('--accent',action.color||'#647cff');
 switch(action.effect){
  case 'hearts':sprinkle(action,28,'rising');break;
  case 'confetti':sprinkle(action,46,'confetti');break;
  case 'stars':sprinkle(action,25,'glowing');break;
  case 'rain':sprinkle(action,25,'falling');break;
  case 'fireworks':fireworks(action);break;
  case 'burst':message(action,'effect-banner effect-burst');break;
  default:message(action);break;
 }
 if(action.message&&!['banner','burst'].includes(action.effect)){
  stage.append(el('div','effect-caption',action.emoji+' '+action.message));
 }
 info('Executando: '+action.name);
 cleanupTimer=setTimeout(()=>{stage.replaceChildren();info('Aguardando próxima ação…');},duration+250);
}
async function poll(){
 if(polling)return;polling=true;
 try{
  const r=await fetch('/api/animacoes',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(first){first=false;revision=data.command;}
  else if(data.command!==revision){revision=data.command;play(data.lastEvent);}
 }catch(error){info('Falha de sincronização: '+error.message);}
 finally{polling=false;}
}
poll();setInterval(poll,850);
