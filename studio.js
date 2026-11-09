const $=id=>document.getElementById(id);
const endpoint='/api/video?studio=1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let state={activeScene:'cena-1',playing:true,scenes:[{id:'cena-1',name:'Cena principal',sources:[]}]};
let busy=false;
const status=value=>$('status').textContent=value;
const scene=()=>state.scenes.find(s=>s.id===state.activeScene)||state.scenes[0];
const escapeText=s=>String(s||'');
async function load(){
 try{const r=await fetch(endpoint,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);state=await r.json();render();status('Conectado ao Studio V2J.');}
 catch(e){status('Sem sincronização: '+e.message);}
}
async function save(){
 if(busy)return;
 busy=true;status('Salvando configurações…');
 try{const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});const result=await r.json();if(!r.ok)throw Error(result.erro||'Erro '+r.status);state=result;render();status('Cena sincronizada com a saída OBS.');}
 catch(e){status('Não foi possível salvar: '+e.message);}
 finally{busy=false;}
}
function button(label,callback,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.type='button';b.onclick=callback;return b;}
function render(){
 const active=scene();if(!active)return;
 const scenes=$('sceneButtons');scenes.replaceChildren();
 state.scenes.forEach(s=>scenes.append(button(s.name,()=>{state.activeScene=s.id;save();},s.id===state.activeScene?'active':'')));
 const list=$('sources');list.replaceChildren();
 active.sources.forEach((source,index)=>{
  const row=document.createElement('div');row.className='source';
  const info=document.createElement('div');const title=document.createElement('strong');title.textContent=source.name;
  const detail=document.createElement('small');detail.textContent=source.type+' · '+source.url;info.append(title,detail);
  const options=document.createElement('div');options.style.display='flex';options.style.flexWrap='wrap';options.style.gap='4px';
  options.append(button(source.visible?'👁':'🚫',()=>{source.visible=!source.visible;save();}),
   button('↑',()=>moveSource(index,-1)),button('↓',()=>moveSource(index,1)),
   button('✕',()=>{if(confirm('Remover '+source.name+' desta cena?')){active.sources.splice(index,1);save();}},'danger'));
  row.append(info,options);list.append(row);
  if(source.type==='video'){
   const opts=document.createElement('div');opts.className='line';
   const label=document.createElement('label');label.textContent='Volume '+(source.volume??100)+'%';
   const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=source.volume??100;range.style.width='115px';
   range.oninput=()=>label.textContent='Volume '+range.value+'%';range.onchange=()=>{source.volume=Number(range.value);save();};
   const mute=button(source.muted?'🔇 Sem áudio':'🔊 Com áudio',()=>{source.muted=!source.muted;save();});
   const fit=button(source.fit==='cover'?'Preencher':'Conter',()=>{source.fit=source.fit==='cover'?'contain':'cover';save();});
   opts.append(label,range,mute,fit);list.append(opts);
  }
 });
 if(!active.sources.length){const empty=document.createElement('p');empty.textContent='Nenhuma fonte nesta cena.';list.append(empty);}
 $('play').classList.toggle('active',state.playing);$('pause').classList.toggle('active',!state.playing);
}
function moveSource(index,offset){const sources=scene().sources;const target=index+offset;if(target<0||target>=sources.length)return;[sources[index],sources[target]]=[sources[target],sources[index]];save();}
function validUrl(raw){try{const url=new URL(raw);return url.protocol==='https:'?url.href:null;}catch{return null;}}
function addSource(url,name,type='video'){
 const valid=validUrl(url);if(!valid){status('Informe URL HTTPS válida.');return;}
 if(scene().sources.length>=12){status('Limite de 12 fontes por cena.');return;}
 scene().sources.push({id:uid(),name:(name||'Nova fonte').slice(0,90),type,url:valid,visible:true,muted:false,volume:100,loop:true,fit:'contain'});save();
}
$('addSource').onclick=()=>addSource($('url').value.trim(),$('name').value.trim()||'Fonte '+(scene().sources.length+1),$('type').value);
$('addScene').onclick=()=>{if(state.scenes.length>=8){status('Limite de 8 cenas.');return;}const name=prompt('Nome da nova cena:','Nova cena');if(!name)return;const id='cena-'+uid();state.scenes.push({id,name:name.trim().slice(0,70),sources:[]});state.activeScene=id;save();};
$('removeScene').onclick=()=>{if(state.scenes.length<=1){status('Mantenha ao menos uma cena.');return;}if(!confirm('Excluir esta cena e suas fontes?'))return;state.scenes=state.scenes.filter(s=>s.id!==state.activeScene);state.activeScene=state.scenes[0].id;save();};
$('play').onclick=()=>{state.playing=true;save();};$('pause').onclick=()=>{state.playing=false;save();};$('refresh').onclick=load;
const url=new URL('/studio-output.html',location.href).href;$('obsUrl').textContent=url;
$('copyUrl').onclick=()=>navigator.clipboard.writeText(url).then(()=>status('URL da saída copiada.')).catch(()=>status('Selecione a URL acima e copie.'));
// Reaproveita a rota de upload já utilizada pelo console principal, sem conversão de vídeo.
$('upload').onclick=async()=>{
 const file=$('file').files?.[0];if(!file){status('Selecione um MP4/WebM.');return;}
 if(!['video/mp4','video/webm'].includes(file.type)||file.size>250*1024*1024){status('Arquivo inválido ou maior que 250 MB.');return;}
 $('upload').disabled=true;status('Enviando vídeo…');$('uploadProgress').value=0;
 try{
  const {uploadPresigned}=await import('https://esm.sh/@vercel/blob@2.5.0/client');
  const safe=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_.() -]/g,'_').slice(-160);
  const blob=await uploadPresigned('videos/'+safe,file,{access:'public',multipart:file.size>100*1024*1024,handleUploadUrl:'/api/upload-video',onUploadProgress({percentage}){$('uploadProgress').value=percentage;}});
  $('url').value=blob.url;addSource(blob.url,file.name.replace(/\.(mp4|webm)$/i,''),'video');
 }catch(e){status('Erro no upload: '+e.message);}finally{$('upload').disabled=false;}
};
const preview=document.createElement('iframe');preview.title='Prévia V2J Studio';preview.src=url;preview.style.cssText='width:100%;height:100%;border:0';$('preview').append(preview);
load();
