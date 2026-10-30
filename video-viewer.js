const player=document.getElementById('video');
const aviso=document.getElementById('aviso');
const detalhe=document.getElementById('detalhe');
const manual=document.getElementById('reproduzirManual');
let ultimoComando=null;
let deveReproduzir=false;
let ocupada=false;
const mostrar=(msg,erro=false)=>{
  if(aviso){aviso.textContent=msg;aviso.style.color=erro?'#ff9999':'#dfe7fb';}
  else if(erro) console.error('[Vídeo OBS]',msg);
};
const detalhes=(s)=>{if(detalhe)detalhe.textContent=s||''};
const botao=(mostrarBotao)=>{if(manual)manual.hidden=!mostrarBotao};
const youtube=(url)=>{try{return /(^|\\.)(youtube\\.com|youtu\\.be)$/.test(new URL(url).hostname);}catch{return false}};
function explicarErro(){
 const codigo=player.error?.code;
 if(codigo===4)return 'Este endereço não é um vídeo MP4/WebM compatível ou o servidor bloqueou a reprodução.';
 if(codigo===3)return 'O navegador não conseguiu decodificar o vídeo. Tente um MP4 H.264 (720p).';
 if(codigo===2)return 'Erro de rede ao carregar o vídeo. Verifique o link e a conexão.';
 return 'Erro ao carregar o vídeo. Verifique se o arquivo está disponível.';
}
player.addEventListener('error',()=>{mostrar(explicarErro(),true);botao(true);});
player.addEventListener('waiting',()=>{if(deveReproduzir)mostrar('Carregando vídeo pela internet…')});
player.addEventListener('playing',()=>{mostrar('Reproduzindo vídeo');botao(false)});
player.addEventListener('stalled',()=>{if(deveReproduzir)mostrar('Aguardando dados do vídeo (rede lenta)…')});
player.addEventListener('ended',()=>{if(!player.loop)mostrar('Vídeo concluído')});
async function iniciar(){
 if(!player.getAttribute('src'))return;
 try{await player.play();mostrar('Reproduzindo vídeo');botao(false)}
 catch(e){
  mostrar('A reprodução automática foi bloqueada. Clique em "Iniciar vídeo" para liberar.',true);
  botao(true);
 }
}
if(manual)manual.addEventListener('click',()=>{deveReproduzir=true;iniciar()});
async function atualizar(){
 if(ocupada)return;ocupada=true;
 try{
  const r=await fetch('/api/video',{cache:'no-store'});
  if(!r.ok)throw Error('Falha de comunicação: HTTP '+r.status);
  const s=await r.json();
  if(s.command===ultimoComando)return;
  ultimoComando=s.command;
  if(!s.url){
    deveReproduzir=false;player.pause();player.removeAttribute('src');player.load();
    mostrar('Aguardando vídeo do console…');botao(false);detalhes('');return;
  }
  if(youtube(s.url)){
    deveReproduzir=false;player.pause();player.removeAttribute('src');player.load();
    mostrar('O link é do YouTube, não de um arquivo MP4. Envie o vídeo pela aba Vídeos e use a URL do Blob.',true);
    detalhes('Endereço recebido: '+s.url.slice(0,160));botao(false);return;
  }
  if(!/^https:\/\//i.test(s.url))throw Error('Link inválido');
  player.loop=!!s.loop;player.muted=!!s.muted;
  deveReproduzir=!!s.playing;
  detalhes('Arquivo: '+s.url.slice(0,150));
  if(player.getAttribute('src')!==s.url){player.src=s.url;player.load();}
  if(deveReproduzir){mostrar('Carregando vídeo…');await iniciar();}
  else{player.pause();mostrar('Vídeo pausado');botao(false);}
 }catch(e){mostrar('Falha ao sincronizar: '+e.message,true);}
 finally{ocupada=false;}
}
atualizar();
setInterval(atualizar,1300);
