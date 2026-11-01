import {getCache} from '@vercel/functions';

const effects=new Set(['hearts','confetti','stars','banner','burst','rain','fireworks']);
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
 const duration=Math.max(1500,Math.min(12000,Number(a.duration)||5000));
 return {id,name,effect,emoji,message,color,duration};
}
function cleanActions(items){
 if(!Array.isArray(items))return presets;
 const seen=new Set(),result=[];
 for(const [i,item] of items.entries()){
  const action=cleanAction(item,i);
  if(!action||seen.has(action.id))continue;
  seen.add(action.id);result.push(action);
  if(result.length>=30)break;
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
 if(req.method==='GET')return res.status(200).json(current);
 if(req.method!=='PUT')return res.status(405).json({erro:'Método não permitido'});
 let body;
 try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}
 catch{return res.status(400).json({erro:'Dados inválidos'});}
 if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({erro:'Dados inválidos'});
 if(body.actions!==undefined&&!Array.isArray(body.actions))return res.status(400).json({erro:'Lista de ações inválida'});
 const actions=body.actions===undefined?current.actions:cleanActions(body.actions);
 let lastEvent=current.lastEvent,command=current.command;
 if(body.triggerId!==undefined){
  const action=actions.find(a=>a.id===body.triggerId);
  if(!action)return res.status(400).json({erro:'Ação não encontrada'});
  lastEvent=action;command=Math.max(Date.now(),command+1);
 }
 if(body.stop===true){lastEvent=null;command=Math.max(Date.now(),command+1);}
 const next={actions,lastEvent,command};
 try{
  await cache.set('animacoes',next,{ttl:2592000,name:'Ações e animações da live'});
  return res.status(200).json(next);
 }catch{return res.status(503).json({erro:'Não foi possível sincronizar as animações'});}
}
