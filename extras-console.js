// Expansão isolada: nenhuma das abas existentes precisa ser substituída.
const stylesheet=document.createElement('link');
stylesheet.rel='stylesheet';stylesheet.href='extras-console.css';document.head.append(stylesheet);

const nav=document.querySelector('nav.tabs');
const tabs=[
 {id:'cartas',label:'🃏 Cartas e imagens'},
 {id:'animacoes',label:'✨ Animações'}
];
for(const tab of tabs){
 const button=document.createElement('button');button.type='button';button.className='tab';
 button.dataset.tab=tab.id;button.textContent=tab.label;button.setAttribute('aria-selected','false');
 nav.append(button);
}

const cards=document.createElement('main');cards.id='painel-cartas';cards.className='tiktok-layout';cards.hidden=true;
cards.innerHTML=`
 <section class="card">
  <h1>🃏 Cartas e imagens na LIVE</h1>
  <p>Envie artes, cartazes, cards de produtos, PNGs transparentes ou GIFs. Use uma fonte separada no OBS para colocar imagens sobre a câmera e o vídeo.</p>
  <label>Arquivo de imagem (PNG, JPG, WebP ou GIF, até 15 MB)<input id="cartasFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
  <button id="cartasUpload" type="button">☁️ Enviar imagem</button>
  <progress id="cartasProgress" value="0" max="100" class="extra-progress"></progress>
  <p class="hint">O arquivo enviado fica na nuvem. A biblioteca é compartilhada entre seus dispositivos; mantenha cópias dos originais.</p>
  <div class="extra-panel">
   <h2>📚 Histórico de imagens <span class="video-count" id="cartasCount">0</span></h2>
   <div class="video-library-add">
    <label>Endereço HTTPS da imagem<input id="cartasUrl" type="url" placeholder="https://.../imagem.png"></label>
    <label>Nome (opcional)<input id="cartasName" maxlength="90" placeholder="Ex.: Carta de boas-vindas"></label>
    <button id="cartasAdd" type="button">＋ Salvar no histórico</button>
   </div>
   <div class="video-live-info"><strong>Na tela: <span id="cartasActive">Nenhuma imagem no ar</span></strong></div>
   <div id="cartasLibrary" class="extra-library" aria-live="polite"></div>
   <div class="video-actions"><button id="cartasPrev" class="secondary" type="button">◀ Anterior</button><button id="cartasNext" class="secondary" type="button">Próxima ▶</button><button id="cartasHide" class="secondary" type="button">■ Ocultar da LIVE</button></div>
  </div>
  <div class="extra-panel">
   <h2>✨ Transição e posição</h2>
   <div class="controls">
    <label>Transição<select id="cartasTransition"><option value="fade">Dissolver suavemente</option><option value="slide">Deslizar</option><option value="zoom">Aproximar (zoom)</option><option value="cut">Troca instantânea</option></select></label>
    <label>Posição<select id="cartasPosition"><option value="top">Topo</option><option value="center">Centro</option><option value="bottom">Parte inferior</option></select></label>
    <label>Tamanho na tela <output id="cartasSizeLabel">85%</output><input id="cartasSize" type="range" min="20" max="100" value="85" step="5"></label>
    <label>Duração da transição <output id="cartasDurationLabel">0,80 s</output><input id="cartasDuration" type="range" min="150" max="2500" step="50" value="800"></label>
   </div>
  </div>
  <p id="cartasStatus" role="status" class="extra-status"></p>
 </section>
 <section class="card">
  <h2>🖥️ Reprodutor separado para o OBS</h2>
  <p>Adicione esta página como uma <strong>nova fonte Navegador</strong> no OBS. Ela tem fundo transparente, mostrando somente a imagem escolhida e a transição.</p>
  <label>Link exclusivo da fonte OBS<input id="cartasObsUrl" readonly value="${location.origin}/cartas-obs.html"></label>
  <div class="video-actions"><button id="cartasCopy" type="button">📋 Copiar link do OBS</button><a class="extra-link" href="cartas-obs.html" target="_blank" rel="noopener">Abrir fonte transparente ↗</a><a class="extra-link" href="cartas.html" target="_blank" rel="noopener">Abrir reprodutor de teste ↗</a></div>
  <div class="extra-instructions"><strong>Ordem recomendada das fontes no OBS:</strong><ol><li>Cartas e imagens (esta fonte)</li><li>Animações (ou acima das cartas, se preferir efeitos na frente)</li><li>Câmera e vídeos</li></ol></div>
  <p class="hint">Largura e altura recomendadas da fonte: 720 × 1280 para sua LIVE vertical. Mantenha a fonte aberta no OBS.</p>
 </section>`;

const animations=document.createElement('main');animations.id='painel-animacoes';animations.className='tiktok-layout';animations.hidden=true;
animations.innerHTML=`
 <section class="card">
  <h1>✨ Animações e ações da LIVE</h1>
  <p>Crie efeitos semelhantes às ações do TikFinity, com seus nomes, textos e emojis. Use os botões <strong>Acionar</strong> para dispará-los no OBS quando desejar.</p>
  <div class="extra-warning">⚠️ Ações manuais: ainda não há leitura automática de curtidas, comentários, presentes ou compras da Shopee ou do TikTok.</div>
  <div class="extra-panel">
   <h2>🎛️ Minhas ações <span class="video-count" id="animacoesCount">0</span></h2>
   <div id="animacoesLibrary" class="extra-library" aria-live="polite"></div>
   <div class="video-actions"><button id="animacoesStop" type="button" class="secondary">■ Parar animação no OBS</button></div>
  </div>
  <div class="extra-panel">
   <h2>➕ Criar ou editar ação</h2>
   <div class="controls">
    <label>Nome da ação<input id="animacoesName" maxlength="55" placeholder="Ex.: Agradecer curtidas"></label>
    <label>Tipo de animação<select id="animacoesEffect"><option value="banner">Faixa animada</option><option value="hearts">Chuva de corações</option><option value="confetti">Confetes</option><option value="stars">Estrelas</option><option value="burst">Destaque com impacto</option><option value="rain">Chuva de emojis</option><option value="fireworks">Fogos de celebração</option></select></label>
    <label>Emoji<input id="animacoesEmoji" maxlength="16" value="✨" placeholder="❤️"></label>
    <label>Cor do efeito<input id="animacoesColor" type="color" value="#647cff"></label>
    <label>Mensagem (opcional)<input id="animacoesMessage" maxlength="160" placeholder="Obrigado por participar!"></label>
    <label>Duração (segundos)<input id="animacoesDuration" type="number" min="1.5" max="12" step="0.5" value="5"></label>
   </div>
   <div class="video-actions"><button id="animacoesSave" type="button">＋ Salvar ação</button><button id="animacoesReset" type="button" class="secondary">Limpar editor</button></div>
  </div>
  <p id="animacoesStatus" role="status" class="extra-status"></p>
 </section>
 <section class="card">
  <h2>🎇 Reprodutor de animações separado</h2>
  <p>Adicione a URL abaixo como outra <strong>fonte Navegador</strong> no OBS. O fundo é transparente; os efeitos aparecem apenas quando você aciona um botão.</p>
  <label>Link da fonte OBS<input id="animacoesObsUrl" readonly value="${location.origin}/animacoes-obs.html"></label>
  <div class="video-actions"><button id="animacoesCopy" type="button">📋 Copiar link do OBS</button><a class="extra-link" href="animacoes-obs.html" target="_blank" rel="noopener">Abrir fonte transparente ↗</a><a class="extra-link" href="animacoes.html" target="_blank" rel="noopener">Abrir reprodutor de teste ↗</a></div>
  <div class="extra-instructions"><strong>Como testar:</strong><ol><li>Abra o reprodutor ou adicione a fonte no OBS.</li><li>Volte à aba Animações.</li><li>Clique em <strong>Acionar</strong> em uma ação salva.</li><li>A animação aparecerá na outra tela e sumirá automaticamente.</li></ol></div>
  <p class="hint">Efeitos gerados com CSS, sem música ou vídeo pesado. São independentes dos vídeos, textos e câmera do nosso console.</p>
 </section>`;

document.getElementById('painel-microfone').after(cards,animations);
const oldPanels=['editor','perfis','tiktok','videos','camera','microfone'];
function selectExtra(id){
 for(const name of [...oldPanels,'cartas','animacoes'])document.getElementById('painel-'+name).hidden=name!==id;
 document.querySelectorAll('.tabs .tab').forEach(btn=>{const active=btn.dataset.tab===id;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
}
nav.querySelectorAll('[data-tab="cartas"],[data-tab="animacoes"]').forEach(button=>button.onclick=()=>selectExtra(button.dataset.tab));
nav.querySelectorAll('.tab').forEach(button=>{
 if(!tabs.some(tab=>tab.id===button.dataset.tab))button.addEventListener('click',()=>{
  cards.hidden=true;animations.hidden=true;
 });
});
for(const [button,url,statusId] of [
 ['cartasCopy','cartasObsUrl','cartasStatus'],['animacoesCopy','animacoesObsUrl','animacoesStatus']
]){
 document.getElementById(button).onclick=async()=>{
  try{await navigator.clipboard.writeText(document.getElementById(url).value);document.getElementById(statusId).textContent='Link copiado! Adicione como fonte Navegador no OBS.';}
  catch{document.getElementById(statusId).textContent='Selecione e copie manualmente o endereço exibido.';}
 };
}
Promise.all([import('./cartas-console.js'),import('./animacoes-console.js')]).catch(error=>console.error('Falha ao abrir abas de mídia:',error));
