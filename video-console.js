// Controle do TikTok e YouTube com biblioteca compartilhada e filas independentes.
// O reprodutor original /video-obs.html continua sendo o TikTok.
const $=id=>document.getElementById(id);
const initial={url:'',playing:false,loop:true,muted:true,library:[],transition:'fade',duration:850,mode:'single',playlistLoop:true};
const channels=['tiktok','youtube'];
const names={tiktok:'TikTok',youtube:'YouTube'};
const states={tiktok:{...initial},youtube:{...initial}};
const requests={tiktok:Promise.resolve(),youtube:Promise.resolve()};
let library=[],selected=localStorage.getItem('painel-video-canal-v1')==='youtube'?'youtube':'tiktok',loading=false;
const endpoint=channel=>'/api/video'+(channel==='youtube'?'?channel=youtube':'');
const status=msg=>{$('videoStatus').textContent=msg;};
const group=item=>item.channel==='youtube'?'youtube':'tiktok';
const playlist=channel=>library.filter(item=>group(item)===channel);
function validURL(url){
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:')return false;
  if(/(^|\.)(youtube\.com|youtu\.be)$/.test(parsed.hostname))return false;
  return true;
 }catch{return false;}
}
function titleFromUrl(url){
 try{return decodeURIComponent(new URL(url).pathname.split('/').pop()||'Vídeo').replace(/\.(mp4|webm)$/i,'').slice(0,90)||'Vídeo';}
 catch{return 'Vídeo';}
}
const defaultState=data=>({...initial,...data,mode:data?.mode==='playlist'?'playlist':'single'});
function displaySelected(changeUrl=false){
 const s=states[selected];
 $('videoTarget').value=selected;
 if(changeUrl || (!$('videoUrl').value.trim()&&s.url))$('videoUrl').value=s.url||'';
 $('videoLoop').checked=s.loop!==false;
 $('videoMuted').checked=s.muted!==false;
 $('videoTransition').value=s.transition||'fade';
 $('videoDuration').value=String(s.duration||850);
 $('videoDurationValue').textContent=(Number(s.duration||850)/1000).toFixed(2).replace('.',',')+' s';
 $('videoActiveName').textContent=s.url?(library.find(item=>item.url===s.url)?.name||titleFromUrl(s.url)):'Nenhum';
 $('videoActiveState').textContent=s.playing?(s.mode==='playlist'?'Lista em reprodução':'Vídeo único no ar'):
  s.url?'Pausado':'Parado';
}
function renderRow(item,index,channel){
 const state=states[channel];
 const row=document.createElement('div');
 row.className='video-library-item'+(state.url===item.url&&state.playing?' is-active':'');
 const detail=document.createElement('div');detail.className='video-library-info';
 const title=document.createElement('strong');title.textContent=(index+1)+'. '+item.name;title.title=item.name;
 const url=document.createElement('small');url.textContent=item.url;url.title=item.url;
 detail.append(title,url);
 const actions=document.createElement('div');actions.className='video-row-actions';
 const addButton=(text,label,onClick,css='secondary')=>{
  const b=document.createElement('button');b.type='button';b.textContent=text;b.className=css;
  b.setAttribute('aria-label',label);b.title=label;b.addEventListener('click',()=>{try{onClick();}catch(e){status(e.message);}});
  actions.append(b);return b;
 };
 addButton(state.url===item.url&&state.mode==='single'&&state.playing?'▶ No ar':'▶ Só este',
  'Reproduzir somente '+item.name+' no '+names[channel],()=>{
   selectChannel(channel);$('videoUrl').value=item.url;
   update(channel,old=>({...old,mode:'single',url:item.url,playing:true,...settings(channel)}),
    'Trocando para o vídeo individual: '+item.name).catch(()=>{});
  },'video-library-play');
 addButton('↑','Subir '+item.name+' na lista '+names[channel],()=>reorder(item.url,channel,-1)).disabled=index===0;
 addButton('↓','Descer '+item.name+' na lista '+names[channel],()=>reorder(item.url,channel,1)).disabled=index===playlist(channel).length-1;
 const other=channel==='tiktok'?'youtube':'tiktok';
 addButton(channel==='tiktok'?'→ YouTube':'← TikTok','Mover '+item.name+' para '+names[other],()=>move(item.url,other),'video-row-move');
 addButton('✕','Remover '+item.name+' da biblioteca',()=>remove(item.url),'video-library-remove secondary');
 row.append(detail,actions);
 return row;
}
function render(){
 $('videoCount').textContent=String(library.length);
 for(const channel of channels){
  const name=channel==='tiktok'?'TikTok':'YouTube';
  const list=$('videoLibrary'+name);
  list.replaceChildren();
  const items=playlist(channel),s=states[channel];
  $('videoCount'+name).textContent=String(items.length);
  $('videoActive'+name).textContent=s.url?
   (library.find(item=>item.url===s.url)?.name||titleFromUrl(s.url)):'Nenhum';
  $('videoMode'+name).textContent=s.playing?(s.mode==='playlist'?'▶ Lista tocando':'▶ Vídeo individual'):
   s.url?'Pausado':'Parado';
  $('playlist'+name+'Loop').checked=s.playlistLoop!==false;
  if(!items.length){
   const empty=document.createElement('p');empty.className='hint';
   empty.textContent='Nenhum vídeo nesta lista. Mova um vídeo usando as setas ou envie um arquivo.';
   list.append(empty);
  }else items.forEach((item,index)=>list.append(renderRow(item,index,channel)));
  $('playlist'+name+'Play').disabled=!items.length;
  $('playlist'+name+'Pause').disabled=!s.playing;
  $('playlist'+name+'Stop').disabled=!s.url;
 }
 displaySelected(false);
}
function sync(channel,data,changeUrl=false){
 states[channel]=defaultState(data);
 if(channel==='tiktok')library=Array.isArray(data.library)?data.library:[];
 if(channel===selected)displaySelected(changeUrl);
 render();
}
function selectChannel(channel){
 if(!channels.includes(channel))return;
 selected=channel;
 try{localStorage.setItem('painel-video-canal-v1',channel);}catch{}
 $('videoAddTarget').value=channel;
 displaySelected(true);
 render();
}
function update(channel,modify,message){
 requests[channel]=requests[channel].catch(()=>{}).then(async()=>{
  const proposed=modify(states[channel]);
  const r=await fetch(endpoint(channel),{
   method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(proposed)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'HTTP '+r.status);
  sync(channel,data,false);
  if(message)status(message);
  return data;
 });
 return requests[channel].catch(e=>{status('Falha: '+e.message);throw e;});
}
function updateLibrary(modify,message){
 return update('tiktok',old=>({...old,library:modify(library)}),message);
}
function move(url,destination){
 updateLibrary(old=>old.map(item=>item.url===url?{...item,channel:destination}:item),
  'Vídeo movido para '+names[destination]+'.').catch(()=>{});
}
function reorder(url,channel,delta){
 const items=playlist(channel);
 const position=items.findIndex(item=>item.url===url),next=position+delta;
 if(position<0||next<0||next>=items.length)return;
 updateLibrary(old=>{
  const result=[...old],a=result.findIndex(item=>item.url===items[position].url);
  const b=result.findIndex(item=>item.url===items[next].url);
  [result[a],result[b]]=[result[b],result[a]];
  return result;
 },'Ordem da lista '+names[channel]+' atualizada.').catch(()=>{});
}
function remove(url){
 updateLibrary(old=>old.filter(item=>item.url!==url),'Vídeo removido da biblioteca.').catch(()=>{});
}
function addVideo(url,name,channel){
 url=url.trim();
 if(!validURL(url)){status('Informe link HTTPS direto de MP4/WebM. Links normais do YouTube não são arquivos de vídeo.');return Promise.resolve();}
 return updateLibrary(old=>{
  const exists=old.find(item=>item.url===url);
  if(exists)return old.map(item=>item.url===url?{...item,channel,name:(name||item.name).trim().slice(0,90)}:item);
  if(old.length>=40)throw Error('Limite de 40 vídeos carregados.');
  return [...old,{url,name:(name||titleFromUrl(url)).trim().slice(0,90),channel}];
 },'Vídeo salvo na lista '+names[channel]+'. Use Só este ou Reproduzir lista.');
}
function settings(channel){
 if(channel!==selected)return {};
 return {loop:$('videoLoop').checked,muted:$('videoMuted').checked,
  transition:$('videoTransition').value,duration:Number($('videoDuration').value)};
}
async function playSingle(mode){
 const channel=selected;
 const url=mode==='stop'?'':mode==='play'?$('videoUrl').value.trim():states[channel].url;
 if(mode==='play'&&!validURL(url)){status('Escolha um vídeo salvo ou informe URL HTTPS de MP4/WebM.');return;}
 try{
  await update(channel,old=>({...old,...settings(channel),mode:'single',url,playing:mode==='play'}),
   mode==='play'?'Vídeo individual no '+names[channel]+'.':
    mode==='pause'?'Vídeo pausado.':'Reprodução interrompida; listas preservadas.');
 }catch{}
}
async function playList(channel,action){
 const entries=playlist(channel);
 if(action==='play'&&!entries.length){status('Adicione vídeos à lista '+names[channel]+' primeiro.');return;}
 try{
  await update(channel,old=>{
   if(action==='play')return {...old,mode:'playlist',url:entries[0].url,playing:true,
    playlistLoop:$('playlist'+names[channel]+'Loop').checked,...settings(channel)};
   if(action==='pause')return {...old,playing:false};
   return {...old,mode:'single',url:'',playing:false};
  },action==='play'?'Lista '+names[channel]+' iniciada em sequência.':
   action==='pause'?'Lista '+names[channel]+' pausada.':'Lista '+names[channel]+' interrompida.');
 }catch{}
}
function jump(step){
 const items=playlist(selected);
 if(!items.length){status('A lista '+names[selected]+' está vazia.');return;}
 const pos=items.findIndex(item=>item.url===states[selected].url);
 const next=items[pos<0?0:(pos+step+items.length)%items.length];
 $('videoUrl').value=next.url;
 update(selected,old=>({...old,mode:'single',url:next.url,playing:true,...settings(selected)}),
  'Trocando para '+next.name).catch(()=>{});
}
$('videoTarget').addEventListener('change',()=>selectChannel($('videoTarget').value));
$('videoPlay').onclick=()=>playSingle('play');
$('videoPause').onclick=()=>playSingle('pause');
$('videoStop').onclick=()=>playSingle('stop');
$('videoPrevious').onclick=()=>jump(-1);
$('videoNext').onclick=()=>jump(1);
$('videoAdd').onclick=()=>{
 addVideo($('videoUrl').value,$('videoName').value,$('videoAddTarget').value)
  .then(()=>{$('videoName').value='';}).catch(()=>{});
};
for(const channel of channels){
 const name=names[channel];
 $('playlist'+name+'Play').onclick=()=>playList(channel,'play');
 $('playlist'+name+'Pause').onclick=()=>playList(channel,'pause');
 $('playlist'+name+'Stop').onclick=()=>playList(channel,'stop');
 $('playlist'+name+'Loop').addEventListener('change',()=>{
  update(channel,old=>({...old,playlistLoop:$('playlist'+name+'Loop').checked}),
   'Repetição da lista '+name+' atualizada.').catch(()=>{});
 });
}
for(const id of ['videoLoop','videoMuted','videoTransition']){
 $(id).addEventListener('change',()=>{
  const channel=selected;
  update(channel,old=>({...old,...settings(channel)})).catch(()=>{});
 });
}
$('videoDuration').addEventListener('input',()=>{
 $('videoDurationValue').textContent=(Number($('videoDuration').value)/1000).toFixed(2).replace('.',',')+' s';
});
$('videoDuration').addEventListener('change',()=>{
 const channel=selected;update(channel,old=>({...old,...settings(channel)})).catch(()=>{});
});
async function loadAll(){
 if(loading)return;loading=true;
 try{
  const results=await Promise.all(channels.map(async channel=>{
   const r=await fetch(endpoint(channel),{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status+' ('+names[channel]+')');
   return r.json();
  }));
  // Não substituir a URL que o usuário está digitando ao sincronizar.
  sync('tiktok',results[0]);
  sync('youtube',results[1]);
 }catch(e){status('Não foi possível atualizar a biblioteca: '+e.message);}
 finally{loading=false;}
}
$('videoTarget').value=selected;
$('videoAddTarget').value=selected;
render();
loadAll();
setInterval(()=>{if(!document.hidden)loadAll();},3500);

// Upload original preservado: apenas escolhemos a lista de destino ao salvar.
$('videoUpload').addEventListener('click',async()=>{
 const f=$('videoFile').files?.[0];
 if(!f){status('Escolha um arquivo MP4 ou WebM.');return;}
 if(!['video/mp4','video/webm'].includes(f.type)){status('Formato não suportado. Use MP4 ou WebM.');return;}
 if(f.size>250*1024*1024){status('O limite é 250 MB por vídeo.');return;}
 $('videoUpload').disabled=true;$('uploadProgress').value=0;
 status('Enviando vídeo para a nuvem…');
 try{
  const {uploadPresigned}=await import('https://esm.sh/@vercel/blob@2.5.0/client');
  const name=f.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_.() -]/g,'_').slice(-160);
  const blob=await uploadPresigned('videos/'+name,f,{
   access:'public',multipart:f.size>100*1024*1024,handleUploadUrl:'/api/upload-video',
   onUploadProgress({percentage}){$('uploadProgress').value=percentage;}
  });
  const channel=$('videoAddTarget').value;
  $('videoUrl').value=blob.url;
  await addVideo(blob.url,f.name.replace(/\.(mp4|webm)$/i,''),channel);
  status('Upload concluído na lista '+names[channel]+'.');
 }catch(e){status('Falha no upload ou salvamento: '+e.message);}
 finally{$('videoUpload').disabled=false;}
});
