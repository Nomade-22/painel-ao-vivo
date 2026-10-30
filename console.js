const API_URL = '';
const $=id=>document.getElementById(id);
const campos=['texto','fonte','tamanho','cor','fundo','alinhamento','peso','imagem','imagemLargura','imagemPosicao'];
const padrao={texto:'',fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',alinhamento:'center',peso:'700',imagem:'',imagemLargura:300,imagemPosicao:'acima'};
let alterado=false,timer,versao=0;

function valores(){return{texto:$('texto').value.slice(0,10000),fonte:$('fonte').value,tamanho:Math.min(180,Math.max(16,Number($('tamanho').value)||64)),cor:$('cor').value,fundo:$('fundo').value,alinhamento:$('alinhamento').value,peso:$('peso').value,imagem:$('imagem').value.trim().slice(0,2000),imagemLargura:Math.max(50,Math.min(1000,Number($('imagemLargura').value)||300)),imagemPosicao:$('imagemPosicao').value};}
function pintar(v){const p=$('preview');p.replaceChildren();const t=document.createElement('div');t.textContent=v.texto||'Seu texto aparecerá aqui';const img=document.createElement('img');if(/^https:\/\//i.test(v.imagem||'')){img.src=v.imagem;img.style.maxWidth='100%';img.style.width=Math.min(v.imagemLargura||300,500)+'px';img.style.height='auto';img.style.display='block';img.style.margin='10px auto';}const nodes=v.imagemPosicao==='abaixo'?[t,img]:[img,t];nodes.forEach(n=>{if(n!==img||img.src)p.appendChild(n)});p.style.fontFamily=v.fonte;p.style.fontSize=Math.min(v.tamanho*.65,80)+'px';p.style.fontWeight=v.peso;p.style.color=v.cor;p.style.background=v.fundo;p.style.textAlign=v.alinhamento;}
function preencher(v){campos.forEach(k=>{$(k).value=v[k]??padrao[k]});pintar({...padrao,...v});}
async function enviar(){try{const r=await fetch(API_URL+'/api/painel',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valores())});if(!r.ok)throw new Error('Falha '+r.status);$('status').textContent='Sincronizado ✓';$('erro').textContent='';alterado=false;}catch(e){$('status').textContent='Erro de envio';$('erro').textContent=e.message;}}
async function carregar(){try{const r=await fetch(API_URL+'/api/painel',{cache:'no-store'});if(!r.ok)throw Error();const dados=await r.json();if(!alterado&&dados.versao!==versao){versao=dados.versao;preencher({...padrao,...dados.painel});}}catch(e){$('status').textContent='Sem conexão';}}
$('publicar').onclick=enviar;
campos.forEach(k=>$(k).addEventListener('input',()=>{alterado=true;pintar(valores());if($('automatico').checked){clearTimeout(timer);timer=setTimeout(enviar,550);}}));
preencher(padrao);$('status').textContent='Console público';
carregar();setInterval(carregar,2000);


// Preferência local do perfil da LIVE (não inicia conexão com TikTok).
const perfisPermitidos=['v2jdigital','khouse.of'];
const perfilSalvo=localStorage.getItem('painel-perfil-tiktok');
$('perfilTikTok').value=perfisPermitidos.includes(perfilSalvo)?perfilSalvo:'v2jdigital';
function atualizarPerfil(){ $('perfilAtivo').textContent='@'+$('perfilTikTok').value; }
atualizarPerfil();
$('perfilTikTok').addEventListener('change',()=>{$('perfilMensagem').textContent='Escolha alterada. Clique em Salvar preferência.';atualizarPerfil();});
$('salvarPerfil').addEventListener('click',()=>{localStorage.setItem('painel-perfil-tiktok',$('perfilTikTok').value);$('perfilMensagem').textContent='Preferência salva neste navegador. A conexão com o TikTok ainda não está ativa.';});
document.querySelectorAll('.tab').forEach(botao=>botao.addEventListener('click',()=>{
 for(const aba of ['editor','perfis','tiktok','videos'])$('painel-'+aba).hidden=botao.dataset.tab!==aba;
 document.querySelectorAll('.tab').forEach(t=>{const ativo=t===botao;t.classList.toggle('active',ativo);t.setAttribute('aria-selected',String(ativo));});
}));

// Controle remoto de vídeo, independente do texto.
let videoPlaying=false;
async function videoCommand(mode){
 const url=mode==='stop'?'':$('videoUrl').value.trim();
 if(mode==='play'&&!/^https:\/\//i.test(url)){$('videoStatus').textContent='Informe um URL HTTPS direto de vídeo MP4/WebM.';return;}
 try{
  const body={url,playing:mode==='play',loop:$('videoLoop').checked,muted:$('videoMuted').checked};
  const r=await fetch('/api/video',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw Error('Erro '+r.status);
  videoPlaying=mode==='play';
  $('videoStatus').textContent=mode==='play'?'Comando de reprodução enviado.':mode==='pause'?'Vídeo pausado.':'Vídeo removido da tela.';
 }catch(e){$('videoStatus').textContent='Falha ao enviar comando: '+e.message;}
}
$('videoPlay').addEventListener('click',()=>videoCommand('play'));
$('videoPause').addEventListener('click',()=>videoCommand('pause'));
$('videoStop').addEventListener('click',()=>videoCommand('stop'));
(async()=>{try{const r=await fetch('/api/video',{cache:'no-store'});if(!r.ok)return;const v=await r.json();$('videoUrl').value=v.url||'';$('videoLoop').checked=!!v.loop;$('videoMuted').checked=v.muted!==false;}catch(e){}})();
