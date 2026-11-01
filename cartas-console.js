const $=id=>document.getElementById(id);
const initial={url:'',show:false,library:[],transition:'fade',duration:800,size:85,position:'center'};
let state={...initial},queue=Promise.resolve();
const status=message=>{$('cartasStatus').textContent=message;};
const validURL=value=>{try{return new URL(value).protocol==='https:';}catch{return false;}};
function settings(){return {transition:$('cartasTransition').value,duration:Number($('cartasDuration').value),
 size:Number($('cartasSize').value),position:$('cartasPosition').value};}
function display(s){
 state={...initial,...s,library:Array.isArray(s.library)?s.library:[]};
 $('cartasCount').textContent=state.library.length;
 $('cartasActive').textContent=state.show?(state.library.find(i=>i.url===state.url)?.name||'Imagem selecionada'):'Nenhuma imagem no ar';
 $('cartasTransition').value=state.transition;
 $('cartasDuration').value=state.duration;
 $('cartasDurationLabel').textContent=(state.duration/1000).toFixed(2).replace('.',',')+' s';
 $('cartasSize').value=state.size;
 $('cartasSizeLabel').textContent=state.size+'%';
 $('cartasPosition').value=state.position;
 const list=$('cartasLibrary');list.replaceChildren();
 if(!state.library.length){const p=document.createElement('p');p.className='hint';p.textContent='Sua biblioteca está vazia. Envie uma imagem ou salve uma URL HTTPS.';list.append(p);return;}
 state.library.forEach((item,index)=>{
  const row=document.createElement('div');row.className='extra-library-item'+(state.show&&state.url===item.url?' active':'');
  const thumb=document.createElement('img');thumb.src=item.url;thumb.alt='';thumb.loading='lazy';
  const info=document.createElement('div');info.className='extra-library-info';
  const title=document.createElement('strong');title.textContent=(index+1)+'. '+item.name;
  const url=document.createElement('small');url.textContent=item.url;info.append(title,url);
  const show=document.createElement('button');show.type='button';show.textContent=state.show&&state.url===item.url?'✓ No ar':'▶ Exibir';
  show.onclick=()=>change(s=>({...s,...settings(),url:item.url,show:true}),'Imagem enviada ao OBS.');
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='✕';remove.title='Retirar da biblioteca (não apaga o arquivo da nuvem)';
  remove.setAttribute('aria-label','Remover '+item.name);
  remove.onclick=()=>change(s=>({...s,library:s.library.filter(i=>i.url!==item.url)}),'Imagem removida do histórico.');
  row.append(thumb,info,show,remove);list.append(row);
 });
}
function change(modify,message){
 queue=queue.catch(()=>{}).then(async()=>{
  const r=await fetch('/api/cartas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(modify(state))});
  const json=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(json.erro||'HTTP '+r.status);
  display(json);if(message)status(message);
  return true;
 }).catch(error=>{status('Falha: '+error.message);return false;});
 return queue;
}
function add(url,name){
 url=url.trim();if(!validURL(url)){status('Informe uma URL HTTPS válida para uma imagem.');return Promise.resolve();}
 return change(s=>{
  if(s.library.some(i=>i.url===url))return s;
  if(s.library.length>=60)throw Error('Limite de 60 imagens na biblioteca.');
  let fallback='Imagem';try{fallback=decodeURIComponent(new URL(url).pathname.split('/').pop()||'Imagem');}catch{}
  return {...s,library:[...s.library,{url,name:(name.trim()||fallback).slice(0,90)}]};
 },'Imagem salva no histórico. Clique em Exibir para colocá-la na LIVE.');
}
$('cartasAdd').onclick=()=>add($('cartasUrl').value,$('cartasName').value).then(ok=>{if(ok)$('cartasName').value='';});
$('cartasHide').onclick=()=>change(s=>({...s,show:false}),'Imagem retirada da tela, mantendo o histórico.');
function jump(amount){
 if(!state.library.length){status('Adicione imagens antes de navegar.');return;}
 const index=state.library.findIndex(i=>i.url===state.url);
 const next=state.library[(index<0?0:(index+amount+state.library.length)%state.library.length)];
 change(s=>({...s,...settings(),url:next.url,show:true}),'Mostrando '+next.name);
}
$('cartasPrev').onclick=()=>jump(-1);
$('cartasNext').onclick=()=>jump(1);
for(const id of ['cartasTransition','cartasPosition'])$(id).onchange=()=>change(s=>({...s,...settings()}));
for(const id of ['cartasSize','cartasDuration']){
 $(id).oninput=()=>{
  $('cartasSizeLabel').textContent=$('cartasSize').value+'%';
  $('cartasDurationLabel').textContent=(Number($('cartasDuration').value)/1000).toFixed(2).replace('.',',')+' s';
 };
 $(id).onchange=()=>change(s=>({...s,...settings()}));
}
$('cartasUpload').onclick=async()=>{
 const file=$('cartasFile').files?.[0];
 if(!file){status('Escolha uma imagem primeiro.');return;}
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){status('Use PNG, JPG, WebP ou GIF.');return;}
 if(file.size>15*1024*1024){status('A imagem deve ter até 15 MB.');return;}
 const button=$('cartasUpload');button.disabled=true;$('cartasProgress').value=0;
 status('Enviando a imagem para a nuvem…');
 try{
  const {uploadPresigned}=await import('https://esm.sh/@vercel/blob@2.5.0/client');
  const fileName=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_.() -]/g,'_').slice(-140);
  const blob=await uploadPresigned('cartas/'+fileName,file,{
   access:'public',handleUploadUrl:'/api/upload-carta',
   onUploadProgress({percentage}){$('cartasProgress').value=percentage;}
  });
  $('cartasUrl').value=blob.url;
  const saved=await add(blob.url,file.name.replace(/\.(png|jpe?g|webp|gif)$/i,''));
  if(!saved)throw Error('Imagem enviada, mas não foi possível adicioná-la ao histórico. A URL ficou no campo acima.');
  status('Upload concluído! Imagem no histórico; escolha Exibir para ir ao OBS.');
 }catch(error){status('Falha no envio: '+error.message+' Você também pode colar uma URL HTTPS da imagem.');}
 finally{button.disabled=false;}
};
fetch('/api/cartas',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);display(await r.json());})
 .catch(error=>status('Falha ao carregar biblioteca: '+error.message));
