const $=id=>document.getElementById(id);
let state={actions:[],command:0},pending=Promise.resolve(),editingId=null;
const status=message=>{$('animacoesStatus').textContent=message;};
const effectNames={hearts:'Corações',confetti:'Confetes',stars:'Estrelas',banner:'Faixa animada',burst:'Destaque',rain:'Chuva de emojis',fireworks:'Fogos'};
function render(){
 const area=$('animacoesLibrary');area.replaceChildren();
 $('animacoesCount').textContent=state.actions.length;
 if(!state.actions.length){const p=document.createElement('p');p.className='hint';p.textContent='Crie sua primeira ação para usar na LIVE.';area.append(p);}
 for(const action of state.actions){
  const item=document.createElement('div');item.className='extra-action-item';
  const emoji=document.createElement('span');emoji.className='extra-action-emoji';emoji.textContent=action.emoji;
  const info=document.createElement('div');info.className='extra-library-info';
  const title=document.createElement('strong');title.textContent=action.name;
  const subtitle=document.createElement('small');subtitle.textContent=effectNames[action.effect]+' · '+(action.duration/1000).toFixed(1)+'s'+(action.message?' · '+action.message:'');
  info.append(title,subtitle);
  const fire=document.createElement('button');fire.type='button';fire.textContent='▶ Acionar';
  fire.onclick=()=>send({triggerId:action.id},'Ação enviada: '+action.name);
  const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='Editar';
  edit.onclick=()=>{
   editingId=action.id;
   $('animacoesName').value=action.name;$('animacoesEffect').value=action.effect;
   $('animacoesEmoji').value=action.emoji;$('animacoesMessage').value=action.message;
   $('animacoesColor').value=action.color;$('animacoesDuration').value=action.duration/1000;
   $('animacoesSave').textContent='Salvar alterações';
   $('animacoesName').focus();
  };
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='✕';
  remove.title='Excluir ação';remove.setAttribute('aria-label','Excluir '+action.name);
  remove.onclick=()=>{
   if(editingId===action.id)resetForm();
   send({actions:state.actions.filter(a=>a.id!==action.id)},'Ação removida.');
  };
  item.append(emoji,info,fire,edit,remove);area.append(item);
 }
}
function send(payload,message){
 pending=pending.catch(()=>{}).then(async()=>{
  const r=await fetch('/api/animacoes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const json=await r.json().catch(()=>({}));if(!r.ok)throw Error(json.erro||'HTTP '+r.status);
  state=json;render();status(message||'Sincronizado com o OBS.');
  return true;
 }).catch(error=>{status('Falha: '+error.message);return false;});
 return pending;
}
function resetForm(){
 editingId=null;$('animacoesName').value='';$('animacoesEffect').value='banner';
 $('animacoesEmoji').value='✨';$('animacoesMessage').value='';$('animacoesColor').value='#647cff';
 $('animacoesDuration').value='5';$('animacoesSave').textContent='＋ Salvar ação';
}
$('animacoesReset').onclick=resetForm;
$('animacoesStop').onclick=()=>send({stop:true},'Animações interrompidas no OBS.');
$('animacoesSave').onclick=()=>{
 const name=$('animacoesName').value.trim();
 if(!name){status('Dê um nome para a ação.');return;}
 if(!editingId&&state.actions.length>=30){status('Limite de 30 ações.');return;}
 const action={
  id:editingId||'acao-'+Date.now().toString(36),name:name.slice(0,55),
  effect:$('animacoesEffect').value,emoji:$('animacoesEmoji').value.trim()||'✨',
  message:$('animacoesMessage').value.trim(),color:$('animacoesColor').value,
  duration:Math.round(Number($('animacoesDuration').value)*1000)
 };
 const exists=state.actions.some(a=>a.id===action.id);
 const actions=exists?state.actions.map(a=>a.id===action.id?action:a):[...state.actions,action];
 send({actions},'Ação salva no histórico. Clique em Acionar para testá-la.').then(ok=>{if(ok)resetForm();});
};
fetch('/api/animacoes',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);state=await r.json();render();})
 .catch(error=>status('Não foi possível carregar as ações: '+error.message));
