// Console de animações; preserva ações salvas e dispara tudo pela MESMA fonte OBS.
const $=id=>document.getElementById(id);
const effectLegacy={banner:'Faixa animada',burst:'Destaque com impacto',stars:'Estrelas brilhantes'};
let state={actions:[],command:0,catalogue:[]},pending=Promise.resolve();
let editingId=null,selectedEffect='confetti',category='Todas',awaitingPreview=null;
let catalogue=[],loading=false;
const notify=message=>{$('animacoesStatus').textContent=message};
const actionName=id=>catalogue.find(x=>x.id===id)?.name||effectLegacy[id]||id;
const safeColor=color=>/^#[\da-f]{6}$/i.test(color||'')?color:'#647cff';
const categories=['Todas','Festa','Carinho','Luxo e vendas','Diversão','Psicodélico'];
const localFilters=()=>({
 color:$('animacoesQuickColor').value,
 duration:Math.round(Number($('animacoesQuickDuration').value)*1000),
 intensity:Number($('animacoesQuickIntensity').value),
 speed:Number($('animacoesQuickSpeed').value),
 position:$('animacoesQuickPosition').value,
 loop:$('animacoesQuickLoop').checked
});
function findSelected(){return catalogue.find(x=>x.id===selectedEffect)||catalogue[0]}
function sync(data){
 state={...data,actions:Array.isArray(data.actions)?data.actions:[]};
 catalogue=Array.isArray(data.catalogue)?data.catalogue:catalogue;
 $('animacoesCatalogCount').textContent=String(catalogue.length+3);
 const selector=$('animacoesEffect');
 if(catalogue.length && selector.dataset.catalogueVersion!==String(catalogue.length)){
  const extras=['banner','burst','stars'];
  const options=[...extras.map(id=>({id,name:effectLegacy[id]})),...catalogue.map(x=>({id:x.id,name:x.name}))];
  const chosen=selector.value;
  selector.replaceChildren();
  for(const o of options){
   const node=document.createElement('option');node.value=o.id;node.textContent=o.name;
   selector.append(node);
  }
  selector.value=options.some(x=>x.id===chosen)?chosen:'banner';
  selector.dataset.catalogueVersion=String(catalogue.length);
 }
 renderActions();
 renderCategories();
 renderGallery();
 if(!findSelected()&&catalogue.length)selectEffect(catalogue[0].id,true);
}
function send(payload,message){
 pending=pending.catch(()=>false).then(async()=>{
  const res=await fetch('/api/animacoes',{
   method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.erro||'HTTP '+res.status);
  sync(data);
  if(message)notify(message);
  return true;
 }).catch(e=>{notify('Falha: '+e.message);return false});
 return pending;
}
function button(title,onClick,cls='secondary'){
 const b=document.createElement('button');b.type='button';b.textContent=title;b.className=cls;
 b.onclick=onClick;return b;
}
function renderActions(){
 const area=$('animacoesLibrary');area.replaceChildren();
 $('animacoesCount').textContent=state.actions.length;
 if(!state.actions.length){
  const empty=document.createElement('p');empty.className='hint';
  empty.textContent='Nenhuma ação guardada. Escolha uma animação da galeria e clique em Salvar como ação.';
  area.append(empty);return;
 }
 for(const action of state.actions){
  const item=document.createElement('div');item.className='extra-action-item';
  const emoji=document.createElement('span');emoji.className='extra-action-emoji';emoji.textContent=action.emoji;
  const info=document.createElement('div');info.className='extra-library-info';
  const title=document.createElement('strong');title.textContent=action.name;
  const detail=document.createElement('small');
  detail.textContent=actionName(action.effect)+' · '+(action.duration/1000).toFixed(1)+'s'+
    (action.loop?' · ♾ Loop':'')+(action.message?' · '+action.message:'');
  info.append(title,detail);
  const play=button('▶ Acionar',()=>send({triggerId:action.id},'Ação enviada ao OBS: '+action.name),'animation-play-action');
  const preview=button('👁 Prévia',()=>localPreview(action));
  const edit=button('Editar',()=>{
   editingId=action.id;
   $('animacoesName').value=action.name;$('animacoesEffect').value=action.effect;
   $('animacoesEmoji').value=action.emoji;$('animacoesMessage').value=action.message||'';
   $('animacoesColor').value=safeColor(action.color);
   $('animacoesDuration').value=action.duration/1000;
   $('animacoesIntensity').value=action.intensity||65;
   $('animacoesSpeed').value=action.speed||1;
   $('animacoesPosition').value=action.position||'full';
   $('animacoesLoop').checked=action.loop===true;
   $('animacoesSave').textContent='Salvar alterações';
   $('animacoesName').scrollIntoView({behavior:'smooth',block:'center'});
   $('animacoesName').focus();
  });
  const remove=button('✕',()=>{
   if(editingId===action.id)resetForm();
   send({actions:state.actions.filter(x=>x.id!==action.id)},'Ação removida.');
  });
  remove.title='Excluir '+action.name;remove.setAttribute('aria-label','Excluir '+action.name);
  item.append(emoji,info,play,preview,edit,remove);area.append(item);
 }
}
function renderCategories(){
 const area=$('animacoesCategories');area.replaceChildren();
 for(const name of categories){
  const b=button(name,()=>{
   category=name;renderCategories();renderGallery();
  },category===name?'animation-category active':'animation-category');
  b.setAttribute('aria-pressed',String(category===name));
  area.append(b);
 }
}
function selectEffect(id,onlyIfMissing=false){
 const item=catalogue.find(x=>x.id===id);
 if(!item)return;
 if(onlyIfMissing&&catalogue.some(x=>x.id===selectedEffect))return;
 selectedEffect=id;
 $('animacoesSelectedEmoji').textContent=item.emoji;
 $('animacoesSelectedName').textContent=item.name;
 $('animacoesQuickColor').value=safeColor(item.color);
 $('animacoesQuickDuration').value=item.duration/1000;
 $('animacoesQuickIntensity').value=item.intensity;
 $('animacoesQuickSpeed').value=item.speed;
 $('animacoesQuickPosition').value=item.position;
 $('animacoesQuickLoop').checked=item.loop;
 showLabels();renderGallery();
}
function showLabels(){
 $('animacoesIntensityOut').textContent=$('animacoesQuickIntensity').value+'%';
 $('animacoesSpeedOut').textContent=Number($('animacoesQuickSpeed').value).toFixed(1).replace('.',',')+'×';
}
function renderGallery(){
 const area=$('animacoesGallery');area.replaceChildren();
 // Os agradecimentos são cards da coleção, no mesmo formato dos outros efeitos.
 const gratitude=[
  {action:thankYouActions.likes,category:'Carinho'},
  {action:thankYouActions.follow,category:'Festa'},
  {action:thankYouActions.purchase,category:'Luxo e vendas'}
 ];
 for(const entry of gratitude.filter(x=>category==='Todas'||x.category===category)){
  const action=entry.action;
  const tile=document.createElement('div');
  tile.className='animation-effect-tile';
  tile.style.setProperty('--tile-color',action.color);
  const icon=document.createElement('div');icon.className='animation-effect-icon';icon.textContent=action.emoji;
  const title=document.createElement('strong');title.textContent=action.name;
  const cat=document.createElement('small');cat.textContent=entry.category+' · Mensagem central';
  const actions=document.createElement('div');actions.className='animation-tile-actions';
  actions.append(
   button('👁 Prévia',()=>localPreview(buildThankYou(action)),'secondary'),
   button('▶ Acionar',()=>triggerThankYou(action),'animation-play-action'),
   button('✏️ Texto',()=>openThanksEditor(tile,action),'secondary')
  );
  tile.classList.add('animation-thanks-tile');
  tile.append(icon,title,cat,actions);area.append(tile);
 }
 const items=catalogue.filter(x=>category==='Todas'||x.category===category);
 for(const item of items){
  const tile=document.createElement('div');
  tile.className='animation-effect-tile'+(item.id===selectedEffect?' chosen':'');
  tile.style.setProperty('--tile-color',item.color);
  const icon=document.createElement('div');icon.className='animation-effect-icon';
  icon.textContent=item.emoji;
  const title=document.createElement('strong');title.textContent=item.name;
  const cat=document.createElement('small');cat.textContent=item.category;
  const actions=document.createElement('div');actions.className='animation-tile-actions';
  actions.append(
   button('👁 Prévia',()=>{selectEffect(item.id);previewSelected()},'secondary'),
   button('▶ Acionar',()=>{selectEffect(item.id);triggerSelected()},'animation-play-action')
  );
  tile.onclick=e=>{if(e.target.closest('button'))return;selectEffect(item.id)};
  tile.append(icon,title,cat,actions);
  area.append(tile);
 }
}
function selectedAction(){
 const item=findSelected();
 return item?{...item,...localFilters(),name:item.name,message:''}:null;
}
function postPreview(effect){
 const frame=$('animacoesPreviewFrame');
 if(!frame?.contentWindow)return false;
 try{frame.contentWindow.postMessage({
  channel:'painel-animacoes-preview',action:effect?'play':'stop',effect
 },location.origin);return true}catch{return false}
}
function localPreview(action){
 awaitingPreview=action;
 postPreview(action);
 notify('Prévia local: '+action.name+'. Ela não aparece na transmissão.');
}
function previewSelected(){
 const a=selectedAction();
 if(a)localPreview(a);
}
function triggerSelected(){
 const item=findSelected();if(!item){notify('Selecione um efeito.');return}
 send({presetId:item.id,options:localFilters()},'Efeito enviado ao OBS: '+item.name);
}
function copyToEditor(){
 const item=selectedAction();if(!item)return;
 resetForm();
 $('animacoesName').value=item.name;
 $('animacoesEffect').value=item.effect;
 $('animacoesEmoji').value=item.emoji;
 $('animacoesColor').value=item.color;
 $('animacoesMessage').value='';
 $('animacoesDuration').value=item.duration/1000;
 $('animacoesIntensity').value=item.intensity;
 $('animacoesSpeed').value=item.speed;
 $('animacoesPosition').value=item.position;
 $('animacoesLoop').checked=item.loop;
 $('animacoesName').scrollIntoView({behavior:'smooth',block:'center'});
 notify('Configuração pronta para salvar como ação personalizada.');
}
function resetForm(){
 editingId=null;
 $('animacoesName').value='';$('animacoesEffect').value='banner';
 $('animacoesEmoji').value='✨';$('animacoesMessage').value='';
 $('animacoesColor').value='#647cff';
 $('animacoesDuration').value='5';$('animacoesIntensity').value='65';
 $('animacoesSpeed').value='1';$('animacoesPosition').value='full';
 $('animacoesLoop').checked=false;$('animacoesSave').textContent='＋ Salvar ação';
}
$('animacoesReset').onclick=resetForm;
$('animacoesSave').onclick=async()=>{
 const name=$('animacoesName').value.trim();
 if(!name){notify('Dê um nome para a ação.');return}
 if(!editingId&&state.actions.length>=80){notify('Limite de 80 ações personalizadas.');return}
 const action={
  id:editingId||'acao-'+Date.now().toString(36),
  name:name.slice(0,55),effect:$('animacoesEffect').value,
  emoji:$('animacoesEmoji').value.trim()||'✨',
  message:$('animacoesMessage').value.trim(),
  color:$('animacoesColor').value,
  duration:Math.round(Number($('animacoesDuration').value)*1000),
  intensity:Number($('animacoesIntensity').value),
  speed:Number($('animacoesSpeed').value),
  position:$('animacoesPosition').value,
  loop:$('animacoesLoop').checked
 };
 const has=state.actions.some(x=>x.id===action.id);
 const actions=has?state.actions.map(x=>x.id===action.id?action:x):[...state.actions,action];
 const ok=await send({actions},'Ação salva. Você pode acioná-la a qualquer momento.');
 if(ok)resetForm();
};
$('animacoesStop').onclick=()=>send({stop:true},'Animação parada no OBS.');
$('animacoesQuickPlay').onclick=triggerSelected;
$('animacoesQuickPreview').onclick=previewSelected;
$('animacoesQuickSave').onclick=copyToEditor;
$('animacoesPreviewStop').onclick=()=>{
 awaitingPreview=null;postPreview(null);notify('Prévia interrompida.');
};
$('animacoesIntensityOut').textContent='65%';
for(const id of ['animacoesQuickIntensity','animacoesQuickSpeed'])$(id).oninput=showLabels;
$('animacoesPreviewFrame').addEventListener('load',()=>{
 if(awaitingPreview)postPreview(awaitingPreview);
});
async function load(){
 if(loading)return;loading=true;
 try{
  const response=await fetch('/api/animacoes',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!catalogue.length||data.command!==state.command||
    JSON.stringify(data.actions)!==JSON.stringify(state.actions)||
     JSON.stringify(data.thanksTexts)!==JSON.stringify(state.thanksTexts))sync(data);
 }catch(e){notify('Não foi possível sincronizar animações: '+e.message)}
 finally{loading=false}
}
// Atalhos de agradecimento: aproveitam a mesma API e a mesma fonte OBS.
const thankYouActions={
 likes:{id:'v2j-thanks-likes',name:'Obrigado pelas curtidas',effect:'hearts',
  emoji:'💖',message:'OBRIGADO PELAS CURTIDAS! Vocês fazem nossa live brilhar ✨',
  color:'#ff4b87',duration:10000,intensity:75,speed:1,position:'center',loop:false},
 follow:{id:'v2j-thanks-follow',name:'Obrigado por seguir',effect:'confetti',
  emoji:'🎉',message:'OBRIGADO POR SEGUIR! Que alegria ter você com a gente 💚',
  color:'#2dd4bf',duration:10000,intensity:75,speed:1,position:'center',loop:false},
 purchase:{id:'v2j-thanks-purchase',name:'Obrigado pela compra',effect:'confetti',
  emoji:'🛍️',message:'OBRIGADO PELA COMPRA! Sua confiança faz nossa live brilhar ✨',
  color:'#f5b942',duration:10000,intensity:85,speed:1,position:'center',loop:false}
};
function thankYouKey(action){return action.id.replace('v2j-thanks-','');}
function currentThanks(action){
 const key=thankYouKey(action);
 const fallback={likes:{headline:'OBRIGADO PELAS CURTIDAS!',subtitle:'Vocês fazem nossa live brilhar ✨'},
  follow:{headline:'OBRIGADO POR SEGUIR!',subtitle:'Que alegria ter você com a gente 💚'},
  purchase:{headline:'OBRIGADO PELA COMPRA!',subtitle:'Sua confiança faz nossa live brilhar ✨'}};
 return state.thanksTexts?.[key]||fallback[key];
}
function buildThankYou(action){
 const text=currentThanks(action);
 return {...action,thankYouType:thankYouKey(action),headline:text.headline,message:text.subtitle};
}
function openThanksEditor(tile,action){
 const old=tile.querySelector('.thanks-inline-editor');
 if(old){old.remove();return}
 const text=currentThanks(action);
 const form=document.createElement('form');form.className='thanks-inline-editor';
 form.addEventListener('submit',e=>e.preventDefault());
 const heading=document.createElement('label');heading.textContent='Título principal';
 const headingInput=document.createElement('input');headingInput.maxLength=72;headingInput.required=true;headingInput.value=text.headline;
 const subtitle=document.createElement('label');subtitle.textContent='Mensagem complementar';
 const subtitleInput=document.createElement('textarea');subtitleInput.maxLength=160;subtitleInput.rows=3;subtitleInput.value=text.subtitle;
 heading.append(headingInput);subtitle.append(subtitleInput);
 const buttons=document.createElement('div');buttons.className='animation-tile-actions';
 const save=button('💾 Salvar texto',async()=>{
  const headline=headingInput.value.trim().slice(0,72);
  if(!headline){notify('Digite um título para o agradecimento.');headingInput.focus();return}
  save.disabled=true;
  const success=await send({thanksTexts:{[thankYouKey(action)]:{
   headline,subtitle:subtitleInput.value.trim().slice(0,160)
  }}},'Texto do agradecimento salvo para todos os dispositivos.');
  if(!success){save.disabled=false;}
 },'animation-play-action');
 buttons.append(save,button('Cancelar',()=>form.remove(),'secondary'));
 form.append(heading,subtitle,buttons);tile.append(form);
 headingInput.focus();
}
function triggerThankYou(action){
 const prepared=buildThankYou(action);
 return send({presetId:action.effect,options:{
  color:action.color,duration:action.duration,intensity:action.intensity,
  speed:action.speed,position:action.position,loop:false,message:prepared.message,
  thankYouType:prepared.thankYouType,headline:prepared.headline
 }},'Agradecimento enviado ao OBS: '+action.name);
}
showLabels();load();
setInterval(()=>{if(!document.hidden)load()},4500);
