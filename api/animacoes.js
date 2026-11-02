import {getCache} from '@vercel/functions';

const catalogue=[{"id":"confetti","effect":"confetti","name":"Confetes premium","emoji":"🎉","category":"Festa","color":"#f59e0b","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"fireworks","effect":"fireworks","name":"Fogos de artifício","emoji":"🎆","category":"Festa","color":"#fa4ed5","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"shootingStars","effect":"shootingStars","name":"Estrelas cadentes","emoji":"🌠","category":"Festa","color":"#8cbdff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"sparkles","effect":"sparkles","name":"Faíscas brilhantes","emoji":"✨","category":"Festa","color":"#f6dd76","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"neonExplosion","effect":"neonExplosion","name":"Explosão de brilho neon","emoji":"💥","category":"Festa","color":"#fa35ee","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"hearts","effect":"hearts","name":"Corações subindo","emoji":"❤️","category":"Carinho","color":"#ff4b87","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"heartExplosion","effect":"heartExplosion","name":"Corações explodindo","emoji":"💖","category":"Carinho","color":"#ff418f","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"heartRain","effect":"heartRain","name":"Chuva de corações","emoji":"💕","category":"Carinho","color":"#ff68aa","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"kisses","effect":"kisses","name":"Beijos flutuando","emoji":"💋","category":"Carinho","color":"#ef5d99","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"petals","effect":"petals","name":"Pétalas de rosas","emoji":"🌹","category":"Carinho","color":"#fe6d9c","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"money","effect":"money","name":"Chuva de dinheiro","emoji":"💸","category":"Luxo e vendas","color":"#54e7a4","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"coins","effect":"coins","name":"Moedas douradas","emoji":"🪙","category":"Luxo e vendas","color":"#ffc34e","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"diamonds","effect":"diamonds","name":"Diamantes e cristais","emoji":"💎","category":"Luxo e vendas","color":"#72e7ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"crown","effect":"crown","name":"Coroa premium","emoji":"👑","category":"Luxo e vendas","color":"#ffd45c","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"goldenBurst","effect":"goldenBurst","name":"Explosão dourada","emoji":"🌟","category":"Luxo e vendas","color":"#fbbf24","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"rain","effect":"rain","name":"Chuva de emojis","emoji":"😍","category":"Diversão","color":"#b98aff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"balloons","effect":"balloons","name":"Balões subindo","emoji":"🎈","category":"Diversão","color":"#f784da","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"bubbles","effect":"bubbles","name":"Bolhas neon","emoji":"🫧","category":"Diversão","color":"#41dbff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"lightning","effect":"lightning","name":"Raios elétricos","emoji":"⚡","category":"Diversão","color":"#60c8ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"particles","effect":"particles","name":"Partículas coloridas","emoji":"🌈","category":"Diversão","color":"#9c6cff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"neonHearts","effect":"neonHearts","name":"Corações neon","emoji":"💜","category":"Psicodélico","color":"#ed42ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"psychedelic","effect":"psychedelic","name":"Partículas psicodélicas","emoji":"🌀","category":"Psicodélico","color":"#9c54ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"pulse","effect":"pulse","name":"Pulse glow","emoji":"💫","category":"Psicodélico","color":"#22d1ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"lightWaves","effect":"lightWaves","name":"Ondas de luz","emoji":"〰️","category":"Psicodélico","color":"#71a0ff","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false},{"id":"colorBurst","effect":"colorBurst","name":"Explosão de cores","emoji":"🎨","category":"Psicodélico","color":"#fa479b","duration":6000,"intensity":65,"speed":1,"position":"full","loop":false}];
const presetById=new Map(catalogue.map(p=>[p.id,p]));
const effects=new Set(["confetti","fireworks","shootingStars","sparkles","neonExplosion","hearts","heartExplosion","heartRain","kisses","petals","money","coins","diamonds","crown","goldenBurst","rain","balloons","bubbles","lightning","particles","neonHearts","psychedelic","pulse","lightWaves","colorBurst","stars","banner","burst"]);
const presets=[
 {id:'coracoes',name:'Chuva de corações',effect:'hearts',emoji:'❤️',message:'Obrigado pelo carinho!',color:'#ff4b87',duration:5000},
 {id:'boasvindas',name:'Boas-vindas',effect:'banner',emoji:'👋',message:'Bem-vindo(a) à nossa LIVE!',color:'#5b8dff',duration:5000},
 {id:'confetes',name:'Confetes de festa',effect:'confetti',emoji:'🎉',message:'Vamos comemorar!',color:'#f59e0b',duration:5000},
 {id:'estrelas',name:'Estrelas brilhantes',effect:'stars',emoji:'⭐',message:'Você é especial!',color:'#facc15',duration:4500},
 {id:'destaque',name:'Produto em destaque',effect:'burst',emoji:'🛍️',message:'Confira a sacola da LIVE!',color:'#ff7c45',duration:5500},
 {id:'chuva',name:'Chuva de emojis',effect:'rain',emoji:'😍',message:'',color:'#9d7aff',duration:4500},
 {id:'fogos',name:'Fogos de celebração',effect:'fireworks',emoji:'✨',message:'Muito obrigado!',color:'#2ed4db',duration:5000}
];
const initial={actions:presets,lastEvent:null,command:0};
const hex=x=>typeof x==='string'&&/^#[\da-f]{6}$/i.test(x);
function cleanAction(a,index){
 if(!a||typeof a!=='object')return null;
 const id=String(a.id||'acao-'+index).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,50);
 if(!id)return null;
 const name=String(a.name||'Ação').trim().slice(0,55)||'Ação';
 const effect=effects.has(a.effect)?a.effect:'banner';
 const emoji=String(a.emoji||'✨').trim().slice(0,16)||'✨';
 const message=String(a.message||'').trim().slice(0,160);
 const color=hex(a.color)?a.color:'#647cff';
 const duration=Math.max(1500,Math.min(30000,Number(a.duration)||5000));
 const intensity=Math.max(20,Math.min(100,Number(a.intensity)||65));
 const speed=Math.max(.4,Math.min(2.5,Number(a.speed)||1));
 const position=['full','center','edges'].includes(a.position)?a.position:'full';
 const loop=a.loop===true;
 return {id,name,effect,emoji,message,color,duration,intensity,speed,position,loop};
}
function cleanActions(items){
 if(!Array.isArray(items))return presets;
 const seen=new Set(),result=[];
 for(const [i,item] of items.entries()){
  const action=cleanAction(item,i);
  if(!action||seen.has(action.id))continue;
  seen.add(action.id);result.push(action);
  if(result.length>=80)break;
 }
 return result;
}
function normalize(data){
 const v=data&&typeof data==='object'?data:{};
 return {actions:cleanActions(v.actions),lastEvent:v.lastEvent?cleanAction(v.lastEvent,0):null,
  command:Number(v.command)||0};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const cache=getCache({namespace:'painel-animacoes-v1'});
 let current;
 try{current=normalize((await cache.get('animacoes'))||initial);}
 catch{return res.status(503).json({erro:'As animações estão indisponíveis'});}
 if(req.method==='GET')return res.status(200).json({...current,catalogue});
 if(req.method!=='PUT')return res.status(405).json({erro:'Método não permitido'});
 let body;
 try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}
 catch{return res.status(400).json({erro:'Dados inválidos'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
 if(body.actions!==undefined&&!Array.isArray(body.actions))return res.status(400).json({erro:'Lista de ações inválida'});
 const actions=body.actions===undefined?current.actions:cleanActions(body.actions);
 let lastEvent=current.lastEvent,command=current.command;
 if(body.triggerId!==undefined||body.presetId!==undefined){
  const template=body.presetId!==undefined?presetById.get(body.presetId):actions.find(a=>a.id===body.triggerId);
  if(!template)return res.status(400).json({erro:'Animação não encontrada'});
  const overrides=body.options&&typeof body.options==='object'&&!Array.isArray(body.options)?body.options:{};
  // Somente configurações visuais permitidas, não altera ações guardadas.
  const allowed=['duration','intensity','speed','position','color','loop','message'];
  const settings={};for(const k of allowed){if(overrides[k]!==undefined)settings[k]=overrides[k]}
  lastEvent=cleanAction({...template,...settings},0);
  command=Math.max(Date.now(),command+1);
 }
 if(body.stop===true){lastEvent=null;command=Math.max(Date.now(),command+1);}
 const next={actions,lastEvent,command};
 try{
  await cache.set('animacoes',next,{ttl:2592000,name:'Ações e animações da live'});
  return res.status(200).json({...next,catalogue});
 }catch{return res.status(503).json({erro:'Não foi possível sincronizar as animações'});}
}
