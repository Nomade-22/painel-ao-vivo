// Biblioteca compartilhada de vídeos no mesmo console (e reprodutores originais).
const $=id=>document.getElementById(id);
const initial={url:'',playing:false,loop:true,muted:true,library:[],transition:'fade',duration:850};
let state={...initial},requests=Promise.resolve();
const status=msg=>{$('videoStatus').textContent=msg;};
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
function settings(){
 return {loop:$('videoLoop').checked,muted:$('videoMuted').checked,transition:$('videoTransition').value,duration:Number($('videoDuration').value)};
}
function render(){
 const list=$('videoLibrary');
 list.replaceChildren();
 $('videoCount').textContent=String(state.library.length);
 const currentIndex=state.library.findIndex(entry=>entry.url===state.url);
 $('videoActiveName').textContent=state.url?(state.library[currentIndex]?.name||titleFromUrl(state.url)):'Nenhum';
 $('videoActiveState').textContent=state.playing?'No ar':state.url?'Pausado':'Parado';
 if(!state.library.length){
  const empty=document.createElement('p');empty.className='hint';empty.textContent='Nenhum vídeo salvo. Envie um arquivo ou adicione uma URL HTTPS.';list.append(empty);return;
 }
 state.library.forEach((entry,index)=>{
  const row=document.createElement('div');
  row.className='video-library-item'+(entry.url===state.url?' is-active':'');
  const text=document.createElement('div');text.className='video-library-info';
  const name=document.createElement('strong');name.textContent=(index+1)+'. '+entry.name;
  const url=document.createElement('small');url.textContent=entry.url;
  text.append(name,url);
  const show=document.createElement('button');show.type='button';show.textContent=entry.url===state.url&&state.playing?'▶ No ar':'▶ Exibir';
  show.className='video-library-play';
  show.setAttribute('aria-label','Exibir '+entry.name);
  show.onclick=()=>{
   $('videoUrl').value=entry.url;
   update(old=>({...old,...settings(),url:entry.url,playing:true}),'Trocando para: '+entry.name);
  };
  const remove=document.createElement('button');remove.type='button';remove.className='secondary video-library-remove';
  remove.textContent='✕';remove.title='Remover da lista (não apaga o arquivo da nuvem)';
  remove.setAttribute('aria-label','Remover '+entry.name);
  remove.onclick=()=>update(old=>({...old,library:old.library.filter(item=>item.url!==entry.url)}),'Vídeo removido da lista.');
  row.append(text,show,remove);list.append(row);
 });
}
function showState(s){
 state={...initial,...s,library:Array.isArray(s.library)?s.library:[]};
 $('videoUrl').value=state.url||$('videoUrl').value;
 $('videoLoop').checked=state.loop!==false;
 $('videoMuted').checked=state.muted!==false;
 $('videoTransition').value=state.transition||'fade';
 $('videoDuration').value=String(state.duration||850);
 $('videoDurationValue').textContent=(Number(state.duration||850)/1000).toFixed(2).replace('.',',')+' s';
 render();
}
function update(modify,message){
 requests=requests.catch(()=>{}).then(async()=>{
  const next=modify(state);
  const r=await fetch('/api/video',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'HTTP '+r.status);
  showState(data);
  if(message)status(message);
  return data;
 }).catch(e=>{status('Falha: '+e.message);throw e;});
 return requests;
}
function addVideo(url,name){
 url=url.trim();
 if(!validURL(url)){status('Informe uma URL HTTPS direta de MP4/WebM. Links comuns do YouTube não funcionam neste reprodutor.');return Promise.resolve();}
 return update(old=>{
  if(old.library.some(v=>v.url===url))return old;
  if(old.library.length>=40)throw Error('Limite de 40 vídeos na lista.');
  return {...old,library:[...old.library,{url,name:(name||titleFromUrl(url)).trim().slice(0,90)}]};
 },'Vídeo adicionado à lista. Clique em Exibir para trocar na transmissão.');
}
async function command(mode){
 const url=mode==='stop'?'':$('videoUrl').value.trim();
 if(mode==='play'&&!validURL(url)){status('Informe um link HTTPS direto de MP4/WebM ou selecione um vídeo salvo.');return;}
 try{await update(old=>({...old,...settings(),url,playing:mode==='play'}),mode==='play'?'Comando enviado ao reprodutor.':mode==='pause'?'Vídeo pausado.':'Reprodução interrompida. Lista preservada.');}catch{}
}
$('videoPlay').onclick=()=>command('play');
$('videoPause').onclick=()=>command('pause');
$('videoStop').onclick=()=>command('stop');
$('videoAdd').onclick=()=>{addVideo($('videoUrl').value,$('videoName').value).then(()=>$('videoName').value='').catch(()=>{});};
$('videoPrevious').onclick=()=>jump(-1);
$('videoNext').onclick=()=>jump(1);
function jump(step){
 if(!state.library.length){status('Adicione vídeos à biblioteca primeiro.');return;}
 const pos=state.library.findIndex(x=>x.url===state.url);
 const next=state.library[(pos<0?0:(pos+step+state.library.length)%state.library.length)];
 $('videoUrl').value=next.url;
 update(old=>({...old,...settings(),url:next.url,playing:true}),'Trocando para: '+next.name).catch(()=>{});
}
for(const id of ['videoLoop','videoMuted','videoTransition']){
 $(id).addEventListener('change',()=>{update(old=>({...old,...settings()})).catch(()=>{});});
}
$('videoDuration').addEventListener('input',()=>{
 $('videoDurationValue').textContent=(Number($('videoDuration').value)/1000).toFixed(2).replace('.',',')+' s';
});
$('videoDuration').addEventListener('change',()=>update(old=>({...old,...settings()})).catch(()=>{}));
(async()=>{
 try{
  const r=await fetch('/api/video',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  showState(await r.json());
 }catch(e){status('Não foi possível carregar a lista: '+e.message);}
})();
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
  $('videoUrl').value=blob.url;
  await addVideo(blob.url,f.name.replace(/\.(mp4|webm)$/i,''));
  status('Upload concluído e salvo na lista. Clique em Exibir para trocar com transição.');
 }catch(e){status('Falha no upload ou salvamento: '+e.message);}
 finally{$('videoUpload').disabled=false;}
});
