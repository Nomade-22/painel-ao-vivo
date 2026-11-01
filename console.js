import {aplicarEstiloTexto,ESTILO_PADRAO} from '/texto-estilo.js';

const API_URL='';
const $=id=>document.getElementById(id);
const camposBase=['texto','fonte','tamanho','cor','fundo','alinhamento','peso','imagem','imagemLargura','imagemPosicao'];
const camposEfeito=['italico','sublinhado','maiusculas','contorno','contornoCor','sombra','sombraCor','brilho','brilhoCor','gradiente','cor2','espacamento','entrelinhas','rotacao','animacao','vertical'];
const campos=[...camposBase,...camposEfeito];
const padrao={
 texto:'',fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',
 alinhamento:'center',peso:'700',imagem:'',imagemLargura:300,imagemPosicao:'acima',
 ...ESTILO_PADRAO
};
const numericos=['tamanho','imagemLargura','contorno','sombra','brilho','espacamento','entrelinhas','rotacao'];
const booleanos=['italico','sublinhado','maiusculas','gradiente'];
let alterado=false,timer,versao=-1;

function valores(){
 const v={...padrao};
 for(const k of campos){
  const el=$(k);
  if(!el)continue;
  if(booleanos.includes(k))v[k]=el.checked;
  else if(numericos.includes(k))v[k]=Number(el.value);
  else v[k]=el.value;
 }
 v.texto=v.texto.slice(0,10000);
 v.imagem=v.imagem.trim().slice(0,2000);
 v.tamanho=Math.max(16,Math.min(180,v.tamanho||64));
 v.imagemLargura=Math.max(50,Math.min(1000,v.imagemLargura||300));
 return v;
}
function atualizarValoresControles(){
 for(const k of ['contorno','sombra','brilho','espacamento','entrelinhas','rotacao']){
  const display=document.querySelector('[data-for="'+k+'"]');
  if(!display)continue;
  const value=$(k).value;
  display.textContent=k==='entrelinhas'?value+'×':k==='rotacao'?value+'°':value+' px';
 }
}
function pintar(v){
 const p=$('preview');
 p.replaceChildren();
 const t=document.createElement('div');
 t.id='previewTexto';
 t.textContent=v.texto||'Seu texto aparecerá aqui';
 const img=document.createElement('img');
 if(/^https:\/\//i.test(v.imagem||'')){
  img.src=v.imagem;
  img.alt='';
  img.style.maxWidth='100%';
  img.style.width=Math.min(v.imagemLargura||300,500)+'px';
  img.style.height='auto';
  img.style.objectFit='contain';
  img.style.alignSelf='center';
  img.style.margin='7px auto';
 }
 const nodes=v.imagemPosicao==='abaixo'?[t,img]:[img,t];
 for(const node of nodes)if(node!==img||img.src)p.appendChild(node);
 p.style.display='flex';
 p.style.flexDirection='column';
 p.style.alignItems='stretch';
 p.style.justifyContent=({top:'flex-start',center:'center',bottom:'flex-end'})[v.vertical]||'center';
 p.style.background=v.fundo;
 p.style.overflow='hidden';
 aplicarEstiloTexto(t,v,.62);
}
function preencher(v){
 for(const k of campos){
  const el=$(k);
  if(!el)continue;
  const valor=v[k]??padrao[k];
  if(booleanos.includes(k))el.checked=Boolean(valor);
  else el.value=String(valor);
 }
 atualizarValoresControles();
 pintar({...padrao,...v});
}
async function enviar(){
 try{
  const r=await fetch(API_URL+'/api/painel',{
   method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valores())
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.erro||'Falha '+r.status);
  $('status').textContent='Sincronizado ✓';
  $('erro').textContent='';
  versao=data.versao||versao;
  alterado=false;
 }catch(e){
  $('status').textContent='Erro de envio';
  $('erro').textContent=e.message;
 }
}
async function carregar(){
 try{
  const r=await fetch(API_URL+'/api/painel',{cache:'no-store'});
  if(!r.ok)throw Error('Falha de conexão');
  const dados=await r.json();
  if(!alterado&&dados.versao!==versao){
   versao=dados.versao;
   preencher({...padrao,...dados.painel});
  }
 }catch(e){$('status').textContent='Sem conexão';}
}
function mudou(){
 alterado=true;
 atualizarValoresControles();
 pintar(valores());
 $('status').textContent='Editando…';
 if($('automatico').checked){
  clearTimeout(timer);
  timer=setTimeout(enviar,600);
 }
}
$('publicar').onclick=()=>{clearTimeout(timer);enviar()};
campos.forEach(k=>$(k).addEventListener('input',mudou));
$('automatico').addEventListener('change',()=>{
 if($('automatico').checked&&alterado)mudou();
});

const emojis=['😀','😍','🥰','🤩','😎','😂','🥳','😱','❤️','💕','💖','🔥','✨','⭐','🎉','👑','💎','🎁','🎵','🎶','🎧','🎮','🚀','🤖','🛍️','💰','✅','👉','👇','👀','📢','🌈','🌴','🎀','🙌','♾️','•','★','♥','➜'];
// Atalhos de mensagens para usar durante a LIVE; preservam todos os estilos selecionados.
const frasesProntas=[
 {categoria:'👋 Boas-vindas',itens:[
  ['Receber público','👋 Seja bem-vindo(a) à nossa LIVE!'],
  ['Chegou agora','✨ Chegou agora? Fique à vontade!'],
  ['De onde você é?','🌎 De qual cidade você está assistindo?']
 ]},
 {categoria:'❤️ Interação',itens:[
  ['Pedir curtidas','❤️ Curta a LIVE para fortalecer!'],
  ['Chamar o chat','💬 Mande sua mensagem no chat!'],
  ['Seguir perfil','🔔 Siga o perfil para acompanhar as próximas lives!']
 ]},
 {categoria:'🎁 Agradecimentos',itens:[
  ['Agradecer presente','🎁 Muito obrigado pelo presente! 💖'],
  ['Agradecer apoio','🙌 Obrigado pelo carinho de todos!']
 ]},
 {categoria:'🛍️ Vitrine e produtos',itens:[
  ['Conferir vitrine','🛍️ Confira os produtos da nossa vitrine!'],
  ['Cores disponíveis','🎨 Temos diversas cores disponíveis. Confira!'],
  ['Tirar dúvidas','❓ Ficou com dúvida? Pergunte no chat!']
 ]},
 {categoria:'👋 Encerramento',itens:[
  ['Despedida','👋 Obrigado pela companhia! Até a próxima!']
 ]}
];
const areaFrases=$('frasesProntas');
frasesProntas.forEach(grupo=>{
 const titulo=document.createElement('h3');
 titulo.textContent=grupo.categoria;
 titulo.style.fontSize='14px';
 titulo.style.color='#cad9f5';
 titulo.style.margin='16px 0 9px';
 areaFrases.appendChild(titulo);
 const botoes=document.createElement('div');
 botoes.className='presets';
 grupo.itens.forEach(([nome,mensagem])=>{
  const botao=document.createElement('button');
  botao.type='button';
  botao.className='preset-button';
  botao.textContent=nome;
  botao.title=mensagem;
  botao.setAttribute('aria-label','Exibir: '+mensagem);
  botao.addEventListener('click',()=>{
   $('texto').value=mensagem;
   mudou();
   clearTimeout(timer);
   enviar();
  });
  botoes.appendChild(botao);
 });
 areaFrases.appendChild(botoes);
});

const grid=$('emojiGrid');
emojis.forEach(emoji=>{
 const b=document.createElement('button');
 b.type='button';b.className='emoji-button';b.textContent=emoji;
 b.title='Inserir '+emoji;b.setAttribute('aria-label','Inserir '+emoji);
 b.addEventListener('click',()=>{
  const field=$('texto');
  const a=field.selectionStart??field.value.length;
  const z=field.selectionEnd??a;
  field.value=field.value.slice(0,a)+emoji+field.value.slice(z);
  field.focus();field.setSelectionRange(a+emoji.length,a+emoji.length);
  field.dispatchEvent(new Event('input',{bubbles:true}));
 });
 grid.appendChild(b);
});

const estilos=[
 {nome:'Clássico',emoji:'✏️',v:{fonte:'Arial, sans-serif',peso:'700',cor:'#ffffff',contorno:0,sombra:2,brilho:0,gradiente:false,animacao:'none'}},
 {nome:'TikTok',emoji:'🎬',v:{fonte:"'Montserrat', Arial, sans-serif",peso:'700',cor:'#ffffff',contorno:3,contornoCor:'#000000',sombra:4,sombraCor:'#ff225b',brilho:0,gradiente:false,animacao:'none'}},
 {nome:'Neon',emoji:'💡',v:{fonte:"'Orbitron', Arial, sans-serif",peso:'700',cor:'#47fff5',contorno:1,contornoCor:'#07141b',sombra:0,brilho:15,brilhoCor:'#19dfff',gradiente:false,animacao:'pulse'}},
 {nome:'Dourado',emoji:'👑',v:{fonte:'Georgia, serif',peso:'700',cor:'#fff1a8',cor2:'#d28a09',contorno:1,contornoCor:'#49290b',sombra:5,brilho:5,brilhoCor:'#ffb32f',gradiente:true,animacao:'none'}},
 {nome:'Gaming',emoji:'🎮',v:{fonte:"'Bebas Neue', Impact, sans-serif",peso:'700',cor:'#8f68ff',cor2:'#11dbff',contorno:2,contornoCor:'#140829',sombra:2,brilho:13,brilhoCor:'#8d54ff',gradiente:true,animacao:'none'}},
 {nome:'Divertido',emoji:'🎉',v:{fonte:"'Bangers', Impact, sans-serif",peso:'700',cor:'#ffd530',cor2:'#ff6d35',contorno:3,contornoCor:'#4d1700',sombra:4,brilho:0,gradiente:true,animacao:'float'}},
 {nome:'Romântico',emoji:'💖',v:{fonte:"'Pacifico', cursive",peso:'400',cor:'#ff91cd',cor2:'#ffd8ec',contorno:1,contornoCor:'#7a245c',sombra:1,brilho:11,brilhoCor:'#ff53ae',gradiente:true,animacao:'none'}},
 {nome:'Impacto',emoji:'📢',v:{fonte:"'Anton', Impact, sans-serif",peso:'700',cor:'#ffef16',contorno:3,contornoCor:'#111111',sombra:6,brilho:0,gradiente:false,animacao:'pulse'}}
];
estilos.forEach(estilo=>{
 const b=document.createElement('button');
 b.type='button';b.className='preset-button';
 b.textContent=estilo.emoji+' '+estilo.nome;
 b.title='Aplicar estilo '+estilo.nome;
 b.addEventListener('click',()=>{
  for(const [k,val] of Object.entries(estilo.v)){
   if(!$(k))continue;
   if(booleanos.includes(k))$(k).checked=Boolean(val);
   else $(k).value=String(val);
  }
  mudou();
 });
 $('presets').appendChild(b);
});
$('resetarEstilo').addEventListener('click',()=>{
 for(const [k,val] of Object.entries(ESTILO_PADRAO)){
  if(!$(k))continue;
  if(booleanos.includes(k))$(k).checked=Boolean(val);
  else $(k).value=String(val);
 }
 mudou();
});

preencher(padrao);
$('status').textContent='Console público';
carregar();
setInterval(carregar,2000);


// Preferência local do perfil da LIVE (não inicia conexão com TikTok).
const perfisPermitidos=['v2jdigital','khouse.of'];
const perfilSalvo=localStorage.getItem('painel-perfil-tiktok');
$('perfilTikTok').value=perfisPermitidos.includes(perfilSalvo)?perfilSalvo:'v2jdigital';
function atualizarPerfil(){ $('perfilAtivo').textContent='@'+$('perfilTikTok').value; }
atualizarPerfil();
$('perfilTikTok').addEventListener('change',()=>{$('perfilMensagem').textContent='Escolha alterada. Clique em Salvar preferência.';atualizarPerfil();});
$('salvarPerfil').addEventListener('click',()=>{localStorage.setItem('painel-perfil-tiktok',$('perfilTikTok').value);$('perfilMensagem').textContent='Preferência salva neste navegador. A conexão com o TikTok ainda não está ativa.';});
document.querySelectorAll('.tab').forEach(botao=>botao.addEventListener('click',()=>{
 for(const aba of ['editor','perfis','tiktok','videos','camera','microfone'])$('painel-'+aba).hidden=botao.dataset.tab!==aba;
 document.querySelectorAll('.tab').forEach(t=>{const ativo=t===botao;t.classList.toggle('active',ativo);t.setAttribute('aria-selected',String(ativo));});
}));

// Controle remoto de vídeos e biblioteca: video-console.js
