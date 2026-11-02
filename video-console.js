// Duas listas para organizar vídeos; UMA ÚNICA saída compartilhada em /video-obs.html.
const $=id=>document.getElementById(id);
const initial={url:'',playing:false,loop:true,muted:true,library:[],transition:'fade',
 duration:850,mode:'single',playlistChannel:'tiktok',playlistLoop:true,
 playlistLoops:{tiktok:true,youtube:true},playlistMinutes:{tiktok:0,youtube:0},
 playlistStartedAt:0,command:0};
const channels=['tiktok','youtube'];
const names={tiktok:'TikTok',youtube:'YouTube'};
let state={...initial},library=[],selected='tiktok',loading=false,requests=Promise.resolve();
try{selected=localStorage.getItem('painel-video-canal-v1')==='youtube'?'youtube':'tiktok';}catch{}
const endpoint='/api/video';
const status=message=>{$('videoStatus').textContent=message;};
const group=item=>item.channel==='youtube'?'youtube':'tiktok';
const playlist=channel=>library.filter(item=>group(item)===channel);
const loopFor=channel=>state.playlistLoops?.[channel]!==false;
function validURL(url){
 try{
  const u=new URL(url);
  return u.protocol==='https:'&&!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname);
 }catch{return false;}
}
function titleFromUrl(url){
 try{return decodeURIComponent(new URL(url).pathname.split('/').pop()||'Vídeo').replace(/\.(mp4|webm)$/i,'').slice(0,90)||'Vídeo';}
 catch{return 'Vídeo';}
}
function readSettings(){
 return {loop:$('videoLoop').checked,muted:$('videoMuted').checked,
  transition:$('videoTransition').value,duration:Number($('videoDuration').value)};
}
function renderControls(){
 $('videoTarget').value=selected;
 $('videoLoop').checked=state.loop!==false;
 $('videoMuted').checked=state.muted!==false;
 $('videoTransition').value=state.transition||'fade';
 $('videoDuration').value=String(state.duration||850);
 $('videoDurationValue').textContent=(Number(state.duration||850)/1000).toFixed(2).replace('.',',')+' s';
 $('videoActiveName').textContent=state.url?(library.find(item=>item.url===state.url)?.name||titleFromUrl(state.url)):'Nenhum';
 $('videoActiveState').textContent=state.playing?
  (state.mode==='playlist'?'Lista '+names[state.playlistChannel]+' no ar':'Vídeo individual no ar'):
  state.url?'Pausado':'Parado';
}
function renderRow(item,index,channel){
 const isActive=state.url===item.url && state.playing;
 const row=document.createElement('div');
 row.className='video-library-item'+(isActive?' is-active':'');
 const detail=document.createElement('div');detail.className='video-library-info';
 const title=document.createElement('strong');title.textContent=(index+1)+'. '+item.name;title.title=item.name;
 const url=document.createElement('small');url.textContent=item.url;url.title=item.url;
 detail.append(title,url);
 const actions=document.createElement('div');actions.className='video-row-actions';
 const button=(caption,label,fn,css='secondary')=>{
  const b=document.createElement('button');b.type='button';b.textContent=caption;b.className=css;
  b.title=label;b.setAttribute('aria-label',label);
  b.onclick=()=>{try{fn();}catch(e){status('Falha: '+e.message);}};
  actions.append(b);
  return b;
 };
 button(isActive&&state.mode==='single'?'▶ No ar':'▶ Só este','Tocar só '+item.name,()=>{
  choose(channel);
  $('videoUrl').value=item.url;
  update(old=>({...old,mode:'single',playlistChannel:channel,url:item.url,playing:true,...readSettings()}),
   'Reproduzindo '+item.name+' no mesmo visor OBS.').catch(()=>{});
 },'video-library-play');
 button('↑','Subir '+item.name,()=>reorder(item.url,channel,-1)).disabled=index===0;
 button('↓','Descer '+item.name,()=>reorder(item.url,channel,1)).disabled=index===playlist(channel).length-1;
 const other=channel==='tiktok'?'youtube':'tiktok';
 button(channel==='tiktok'?'→ YouTube':'← TikTok','Mover para '+names[other],()=>move(item.url,other),'video-row-move');
 button('✕','Remover da biblioteca',()=>remove(item.url),'video-library-remove secondary');
 row.append(detail,actions);
 return row;
}
function render(){
 $('videoCount').textContent=String(library.length);
 for(const channel of channels){
  const n=names[channel],list=$('videoLibrary'+n),items=playlist(channel);
  const active=state.playlistChannel===channel;
  list.replaceChildren();
  $('videoCount'+n).textContent=String(items.length);
  $('videoActive'+n).textContent=active&&state.url?
   (library.find(item=>item.url===state.url)?.name||titleFromUrl(state.url)):'Nenhum em reprodução';
  $('videoMode'+n).textContent=active&&state.playing?
   (state.mode==='playlist'?'▶ Lista no ar':'▶ Vídeo único no ar'):
   active&&state.url?'Pausado':'Aguardando';
  $('playlist'+n+'Loop').checked=loopFor(channel);
  $('playlist'+n+'Minutes').value=String(state.playlistMinutes?.[channel]||0);
  const card=list.closest('.video-platform-list');
  card?.classList.toggle('playlist-on-air',active&&state.playing);
  if(!items.length){
   const empty=document.createElement('p');empty.className='hint';
   empty.textContent='Nenhum vídeo nesta lista. Mova vídeos ou envie um arquivo.';
   list.append(empty);
  }else items.forEach((item,i)=>list.append(renderRow(item,i,channel)));
  $('playlist'+n+'Play').disabled=!items.length;
  $('playlist'+n+'Pause').disabled=!(active&&state.playing);
  $('playlist'+n+'Stop').disabled=!(active&&state.url);
 }
 renderControls();
}
function sync(data){
 state={...initial,...data,
  playlistLoops:{...initial.playlistLoops,...data.playlistLoops},
  playlistMinutes:{...initial.playlistMinutes,...data.playlistMinutes}};
 library=Array.isArray(data.library)?data.library:[];
 render();
}
function choose(channel){
 if(!channels.includes(channel))return;
 selected=channel;
 try{localStorage.setItem('painel-video-canal-v1',channel);}catch{}
 $('videoAddTarget').value=channel;
 renderControls();
}
function update(modify,message){
 requests=requests.catch(()=>{}).then(async()=>{
  const next=modify(state);
  const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'HTTP '+r.status);
  sync(data);
  if(message)status(message);
  return data;
 });
 return requests.catch(e=>{status('Falha: '+e.message);throw e;});
}
function updateLibrary(modify,message){
 return update(old=>({...old,library:modify(old.library||[])}),message);
}
function move(url,destination){
 updateLibrary(old=>old.map(item=>item.url===url?{...item,channel:destination}:item),
  'Vídeo movido para a lista '+names[destination]+'.').catch(()=>{});
}
function reorder(url,channel,delta){
 const items=playlist(channel);
 const a=items.findIndex(item=>item.url===url),b=a+delta;
 if(a<0||b<0||b>=items.length)return;
 updateLibrary(old=>{
  const updated=[...old],ia=updated.findIndex(v=>v.url===items[a].url),ib=updated.findIndex(v=>v.url===items[b].url);
  if(ia<0||ib<0)return old;
  [updated[ia],updated[ib]]=[updated[ib],updated[ia]];
  return updated;
 },'Ordem dos vídeos atualizada.').catch(()=>{});
}
function remove(url){
 updateLibrary(old=>old.filter(item=>item.url!==url),'Vídeo removido da biblioteca.').catch(()=>{});
}
function addVideo(url,name,channel){
 url=url.trim();
 if(!validURL(url)){status('Informe URL HTTPS direta de MP4/WebM. Links de páginas do YouTube não funcionam aqui.');return Promise.resolve();}
 return updateLibrary(old=>{
  const exists=old.find(item=>item.url===url);
  if(exists)return old.map(item=>item.url===url?{...item,channel,name:(name||item.name).trim().slice(0,90)}:item);
  if(old.length>=40)throw Error('Limite de 40 vídeos carregados.');
  return [...old,{url,name:(name||titleFromUrl(url)).trim().slice(0,90),channel}];
 },'Vídeo salvo na pasta '+names[channel]+'.');
}
async function playSingle(mode){
 const url=mode==='stop'?'':mode==='play'?$('videoUrl').value.trim():state.url;
 if(mode==='play'&&!validURL(url)){status('Escolha um vídeo salvo ou informe a URL de MP4/WebM.');return;}
 try{
  await update(old=>({...old,...readSettings(),
   playlistChannel:mode==='play'?selected:old.playlistChannel,
   mode:mode==='play'?'single':mode==='stop'?'single':old.mode,
   url,playing:mode==='play'}),
   mode==='play'?'Vídeo individual enviado para o OBS.':
   mode==='pause'?'Reprodução pausada.':'Reprodução parada. Playlists preservadas.');
 }catch{}
}
async function playList(channel,action){
 const items=playlist(channel);
 if(action==='play'&&!items.length){status('A lista '+names[channel]+' está vazia.');return;}
 if(action!=='play' && state.playlistChannel!==channel){
  status('A saída está com a lista '+names[state.playlistChannel]+'.');return;
 }
 try{
  await update(old=>{
   if(action==='play'){
    const loops={...old.playlistLoops,[channel]:$('playlist'+names[channel]+'Loop').checked};
    const minutes={...old.playlistMinutes,
     [channel]:Number($('playlist'+names[channel]+'Minutes').value)||0};
    return {...old,playlistLoops:loops,playlistLoop:loops[channel],
     playlistMinutes:minutes,playlistStartedAt:Date.now(),
     playlistChannel:channel,mode:'playlist',url:items[0].url,playing:true};
   }
   if(action==='pause')return {...old,playing:false};
   return {...old,url:'',playing:false,mode:'single'};
  },
  action==='play'?'Lista '+names[channel]+' tocando no reprodutor único do OBS.':
  action==='pause'?'Lista pausada.':'Lista parada.').catch(()=>{});
 }catch{}
}
function jump(delta){
 const items=playlist(selected);
 if(!items.length){status('Lista vazia.');return;}
 const idx=items.findIndex(item=>item.url===state.url);
 const next=items[idx<0?0:(idx+delta+items.length)%items.length];
 $('videoUrl').value=next.url;
 update(old=>({...old,...readSettings(),mode:'single',playlistChannel:selected,url:next.url,playing:true}),
  'Reproduzindo '+next.name).catch(()=>{});
}
$('videoTarget').onchange=()=>choose($('videoTarget').value);
$('videoPlay').onclick=()=>playSingle('play');
$('videoPause').onclick=()=>playSingle('pause');
$('videoStop').onclick=()=>playSingle('stop');
$('videoPrevious').onclick=()=>jump(-1);
$('videoNext').onclick=()=>jump(1);
$('videoAdd').onclick=()=>addVideo($('videoUrl').value,$('videoName').value,
 $('videoAddTarget').value).then(()=>{$('videoName').value='';}).catch(()=>{});
for(const channel of channels){
 const n=names[channel];
 $('playlist'+n+'Play').onclick=()=>playList(channel,'play');
 $('playlist'+n+'Pause').onclick=()=>playList(channel,'pause');
 $('playlist'+n+'Stop').onclick=()=>playList(channel,'stop');
 $('playlist'+n+'Loop').onchange=()=>{
  const value=$('playlist'+n+'Loop').checked;
  update(old=>({...old,playlistLoops:{...old.playlistLoops,[channel]:value},
   playlistLoop:old.playlistChannel===channel?value:old.playlistLoop}),
   'Repetição da lista '+n+' '+(value?'ativada.':'desativada.')).catch(()=>{});
 };
 $('playlist'+n+'Minutes').onchange=()=>{
  const minutes=Number($('playlist'+n+'Minutes').value)||0;
  update(old=>({...old,playlistMinutes:{...old.playlistMinutes,[channel]:minutes},
   // Reinicia apenas o relógio da lista que já está no ar, sem trocar de vídeo.
   playlistStartedAt:old.mode==='playlist'&&old.playlistChannel===channel&&old.playing?
    Date.now():old.playlistStartedAt}),
   minutes?'O vídeo atual ficará em loop por '+minutes+' minuto(s) antes da troca.':
   'Modo original restaurado: avançar quando o vídeo terminar.').catch(()=>{});
 };
}
for(const id of ['videoLoop','videoMuted','videoTransition']){
 $(id).onchange=()=>update(old=>({...old,...readSettings()})).catch(()=>{});
}
$('videoDuration').oninput=()=>{
 $('videoDurationValue').textContent=(Number($('videoDuration').value)/1000).toFixed(2).replace('.',',')+' s';
};
$('videoDuration').onchange=()=>update(old=>({...old,...readSettings()})).catch(()=>{});
async function poll(){
 if(loading)return;loading=true;
 try{
  // Não substituir os valores que o usuário digitou no campo de nova URL.
  const r=await fetch(endpoint,{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(data.command!==state.command||JSON.stringify(data.library)!==JSON.stringify(library))sync(data);
 }catch(e){status('Não foi possível sincronizar o painel: '+e.message);}
 finally{loading=false;}
}
$('videoTarget').value=selected;
$('videoAddTarget').value=selected;
render();poll();
setInterval(()=>{if(!document.hidden)poll();},3500);
$('videoUpload').addEventListener('click',async()=>{
 const f=$('videoFile').files?.[0];
 if(!f){status('Escolha um arquivo MP4 ou WebM.');return;}
 if(!['video/mp4','video/webm'].includes(f.type)){status('Formato não suportado. Use MP4 ou WebM.');return;}
 if(f.size>250*1024*1024){status('Limite de 250 MB por vídeo.');return;}
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
  status('Upload concluído e salvo na lista '+names[channel]+'.');
 }catch(e){status('Falha no upload ou salvamento: '+e.message);}
 finally{$('videoUpload').disabled=false;}
});
