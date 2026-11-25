const $=id=>document.getElementById(id);
let data={produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],versao:0};
let busy=false,reading=false;
function syncInfo(state){const el=$('bagSyncStatus');if(!el)return;const m=state.syncSacola;el.textContent=(state.storage==='neon'?'Banco permanente':'Armazenamento não confirmado')+' · '+(state.catalogo||[]).length+' produtos'+(m?' · Último envio: '+new Date(m.at).toLocaleString('pt-BR')+' · '+m.aceitos+'/'+m.recebidos+' aceitos':' · Aguardando envio da extensão');}
const status=m=>{$('status').textContent=m;};
function renderChat(){
 const box=$('chatList');box.replaceChildren();
 for(const item of [...data.chat].reverse()){
  const row=document.createElement('div');row.className='item';
  const body=document.createElement('div'),strong=document.createElement('strong'),msg=document.createElement('span'),button=document.createElement('button');
  strong.textContent=(item.autor||'Espectador')+' · '+(item.hora||'');
  msg.textContent=' — '+item.texto;
  body.append(strong,msg);button.textContent='Excluir';button.className='danger';
  button.addEventListener('click',()=>save({chat:data.chat.filter(m=>m.id!==item.id)},'Comentário removido'));
  row.append(body,button);box.append(row);
 }
}
function show(state){
 data=state;
 syncInfo(data);
 $('notice').value=data.recado||'';
 $('metricClicks').value=data.liveMetricas?.cliques??'';
 $('metricSales').value=data.liveMetricas?.vendas??'';
 $('metricGMV').value=data.liveMetricas?.gmv||'';
 renderChat();renderBag();
}
async function load(){
 try{const r=await fetch('/api/retorno?central=1',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);show(await r.json());status('✅ Central conectada.');}
 catch(e){status('Falha ao carregar: '+e.message);}
}
async function save(patch,success){
 if(busy)return;busy=true;status('Publicando no retorno…');
 try{
  const r=await fetch('/api/retorno?patch=1',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...patch,...(patch.catalogo!==undefined?{baseVersion:data.versao}:{})})});
  const response=await r.json().catch(()=>({}));
  if(!r.ok||!response.ok)throw Error(response.erro||'HTTP '+r.status);
  show({...response.estado,storage:data.storage});status('✅ '+success);
 }catch(e){status('Erro ao publicar: '+e.message);}
 finally{busy=false;}
}
$('addChat').addEventListener('click',()=>{
 const text=$('chatText').value.trim(),author=$('chatAuthor').value.trim()||'Espectador';
 if(!text){status('Escreva a mensagem antes de enviar.');return;}
 const now=new Date(),msg={id:String(now.getTime())+'-'+Math.random().toString(36).slice(2),autor:author,texto:text.slice(0,400),hora:now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
 save({chat:[...data.chat,msg].slice(-40)},'Comentário enviado.').then(()=>{$('chatText').value='';});
});
$('clearChat').addEventListener('click',()=>{if(confirm('Apagar todo o chat manual do retorno?'))save({chat:[]},'Chat limpo.');});
$('saveNotice').addEventListener('click',()=>save({recado:$('notice').value},'Recado atualizado.'));
$('clearNotice').addEventListener('click',()=>save({recado:''},'Recado removido.'));
load();
// Mantenha visível no painel a mesma seleção que pode ser feita diretamente
// no retorno. Não altere campos que o operador esteja editando.
async function updateSharedSelection(){
 if(busy||reading||document.hidden)return;
 reading=true;
 try{
  const r=await fetch('/api/retorno?central=1',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const fresh=await r.json();
  if(busy||Number(fresh.versao)<Number(data.versao||0))return;
  syncInfo(fresh);
  const oldSignature=(data.catalogo||[]).map(p=>p.numero+'|'+p.nome+'|'+p.atualizadoEm).join(';');
  const newSignature=(fresh.catalogo||[]).map(p=>p.numero+'|'+p.nome+'|'+p.atualizadoEm).join(';');
  if(fresh.itemAtivo===data.itemAtivo&&oldSignature===newSignature){const changed=JSON.stringify(data.sinaisTikTok)!==JSON.stringify(fresh.sinaisTikTok);data={...data,versao:fresh.versao,syncSacola:fresh.syncSacola,storage:fresh.storage,sinaisTikTok:fresh.sinaisTikTok};if(changed)renderAnalytics();return;}
  data={...data,itemAtivo:fresh.itemAtivo,catalogo:fresh.catalogo,versao:fresh.versao,syncSacola:fresh.syncSacola,storage:fresh.storage,sinaisTikTok:fresh.sinaisTikTok};
  if(document.activeElement!==$('bagNumber')&&$('bagEditPanel').hidden){
   $('bagNumber').value=fresh.itemAtivo||'';
   fillBag();
  }
  renderBag();
  status('✅ Sacolinha e item ativo sincronizados com o retorno V2J.');
 }catch(e){status('Falha ao consultar sacolinha: '+e.message);}
 finally{reading=false;}
}
setInterval(updateSharedSelection,4000);
$('bagRefresh')?.addEventListener('click',updateSharedSelection);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateSharedSelection()});

function bagItem(num){return (data.catalogo||[]).find(p=>p.numero===Number(num));}
function closeBagEdit(){$('bagEditPanel').hidden=true;}
function openBagEdit(){
 const num=Number($('bagNumber').value);
 const item=bagItem(num);
 if(!item){status('Selecione primeiro um item da sacolinha para editar.');return;}
 fillBag();
 $('bagEditTitle').textContent='✏️ Editando item #'+num+' — '+(item.nome||'Produto');
 $('bagEditPanel').hidden=false;
 $('bagEditPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
$('bagEdit').onclick=openBagEdit;
$('bagCancelEdit').onclick=closeBagEdit;
function fillBag(){
 const num=Number($('bagNumber').value),p=bagItem(num)||{};
 $('bagName').value=p.nome||'';$('bagPrice').value=p.preco||'';
 $('bagImage').value=p.imagem||'';$('bagLink').value=p.link||'';$('bagDesc').value=p.descricao||'';$('bagColors').value=(p.cores||[]).join(', ');
 const number=n=>Number(n).toLocaleString('pt-BR');
 const stock=p.estoque==null?'Não informado':number(p.estoque)+' unidades'+(p.estoque<=10?' ⚠ ESTOQUE BAIXO':'');
 const offer=p.precoOferta?(p.precoOferta+(p.precoOriginal?' (anterior: '+p.precoOriginal+')':'')):'Sem oferta informada';
 const time=p.atualizadoEm?new Date(p.atualizadoEm).toLocaleString('pt-BR'):'Não sincronizado';
 $('bagInsights').textContent='📦 Estoque: '+stock+' | 🏷️ Oferta: '+offer+' | 🏪 Loja: '+(p.loja||'—')+' | Categoria: '+(p.categoria||'—')+' | 💰 Comissão estimada: '+(p.comissao||'—')+' | Taxa: '+(p.taxaComissao||0)+'% | Atualizado: '+time;
}
function renderBag(){
 const box=$('bagList');box.replaceChildren();
 renderAnalytics();
 const cat=[...(data.catalogo||[])].sort((a,b)=>a.numero-b.numero);
 $('bagSelected').textContent=data.itemAtivo?'No retorno: item '+data.itemAtivo+(bagItem(data.itemAtivo)?' — '+bagItem(data.itemAtivo).nome:' (sem cadastro)'):'Nenhum item em destaque.';
 for(const p of cat){
  const card=document.createElement('button');card.type='button';card.className='bag-card'+(p.numero===data.itemAtivo?' active':'');
  const img=document.createElement('img');img.loading='lazy';img.alt='';img.src=p.imagem||p.imagens?.[0]||'';
  const num=document.createElement('span');num.className='number';num.textContent='#'+p.numero;
  const name=document.createElement('span');name.className='short';name.textContent=p.nome||'Produto';
  const hint=document.createElement('span');hint.className='hint';hint.textContent='Selecionar e mostrar no retorno';
  card.title='#'+p.numero+' · '+p.nome;
  card.append(img,num,name,hint);
  card.onclick=()=>{$('bagNumber').value=p.numero;closeBagEdit();fillBag();save({itemAtivo:p.numero},'Item '+p.numero+' selecionado no retorno.');};
  box.append(card);
 }
 if(!$('bagNumber').value&&data.itemAtivo){$('bagNumber').value=data.itemAtivo;fillBag();}
}
$('bagNumber').addEventListener('change',()=>{closeBagEdit();fillBag();});
$('bagSelect').onclick=()=>{
 const num=Number($('bagNumber').value);
 if(!Number.isInteger(num)||num<1||num>999){status('Informe um número de item entre 1 e 999.');return;}
 if(!bagItem(num)){status('Item ainda não cadastrado. Preencha os campos e clique em Salvar / corrigir item.');return;}
 save({itemAtivo:num},'Item '+num+' enviado ao retorno.');
};
$('bagSave').onclick=()=>{
 const num=Number($('bagNumber').value),nome=$('bagName').value.trim(),imagem=$('bagImage').value.trim();
 if(!Number.isInteger(num)||num<1||num>999||!nome){status('Informe um número válido e o nome do item.');return;}
 if(imagem&&!/^https:\/\//i.test(imagem)){status('A foto precisa ser um endereço HTTPS.');return;}
 const current=bagItem(num)||{};
 const product={...current,cores:$('bagColors').value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,20),numero:num,nome,preco:$('bagPrice').value,descricao:$('bagDesc').value,imagem,link:$('bagLink').value.trim(),origem:'manual'};
 const catalogo=[...(data.catalogo||[]).filter(p=>p.numero!==num),product].sort((a,b)=>a.numero-b.numero);
 if(catalogo.length>200){status('Limite de 200 itens.');return;}
 save({catalogo,itemAtivo:num},'Item '+num+' salvo e destacado.');
};
$('bagRemove').onclick=()=>{
 const num=Number($('bagNumber').value);if(!bagItem(num))return;
 if(confirm('Remover item '+num+' do catálogo?'))save({catalogo:data.catalogo.filter(p=>p.numero!==num),itemAtivo:data.itemAtivo===num?0:data.itemAtivo},'Item removido.');
};
function moveItem(delta){
 const cat=(data.catalogo||[]).slice().sort((a,b)=>a.numero-b.numero);
 if(!cat.length)return;
 const idx=cat.findIndex(p=>p.numero===Number(data.itemAtivo));
 const next=cat[Math.max(0,Math.min(cat.length-1,(idx<0?0:idx)+delta))];
 $('bagNumber').value=next.numero;closeBagEdit();fillBag();save({itemAtivo:next.numero},'Item '+next.numero+' no retorno.');
}
$('bagPrev').onclick=()=>moveItem(-1);
$('bagNext').onclick=()=>moveItem(1);

$('bagFetchDetails').addEventListener('click',()=>{
 const num=Number($('bagNumber').value),item=bagItem(num);
 if(!item?.link){status('Selecione um produto sincronizado com link do TikTok.');return;}
 const tab=window.open(item.link,'_blank');
 if(!tab){status('Permita a abertura de abas para buscar os detalhes.');return;}
 status('Aguardando a extensão capturar a descrição e as fotos…');
 let count=0;
 const start=Date.now();
 const timer=setInterval(async()=>{
  count++;
  try{
   const response=await fetch('/api/retorno?central=1',{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const fresh=await response.json();
   const capture=fresh.fichaCapturada;
   if(capture?.capturadoEm>=start&&item.link.includes('/view/product/'+capture.id)){
    clearInterval(timer);show(fresh);$('bagNumber').value=num;fillBag();
    status('✅ Página analisada. Confira a descrição e as fotos; quando não estiverem disponíveis, os campos permanecem como estavam.');
   }
  }catch(e){}
  if(count>=20){clearInterval(timer);status('Não recebemos os detalhes. A página pode não disponibilizar a descrição para a extensão.');}
 },1500);
});

$('saveLiveMetrics').onclick=()=>{
 const cliques=$('metricClicks').value,vendas=$('metricSales').value;
 save({liveMetricas:{
  cliques:cliques===''?null:Math.max(0,Math.floor(Number(cliques)||0)),
  vendas:vendas===''?null:Math.max(0,Math.floor(Number(vendas)||0)),
  gmv:$('metricGMV').value.trim(),
  atualizadoEm:Date.now()
 }},'Indicadores da LIVE atualizados.');
};

$('bagClearAll').addEventListener('click',async()=>{
 const total=(data.catalogo||[]).length;
 if(!total){status('A sacolinha já está vazia.');return;}
 if(!confirm('Remover TODOS os '+total+' itens da sacolinha? Esta ação também apaga as correções manuais dos itens e não pode ser desfeita. O chat, os recados e o produto avulso serão preservados.'))return;
 await save({catalogo:[],itemAtivo:0},'Catálogo da sacolinha limpo. Reinicie a sincronização da extensão para importar novamente.');
 $('bagNumber').value='';
 if(typeof closeBagEdit==='function')closeBagEdit();
 if(typeof fillBag==='function')fillBag();
});

function renderAnalytics(){
 const el=$('bagAnalytics');if(!el)return;el.replaceChildren();
 const items=data.catalogo||[],money=v=>{const t=String(v||'').replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.');return t&&Number.isFinite(Number(t))?Number(t):0};
 const discount=p=>{const old=money(p.precoOriginal),offer=money(p.precoOferta);return old>offer&&offer>0?100*(old-offer)/old:0};
 const section=(title,rows,format)=>{const h=document.createElement('h4');h.textContent=title;el.append(h);for(const p of rows){const line=document.createElement('p');line.style.margin='4px 0';line.textContent='#'+p.numero+' '+p.nome.slice(0,95)+' — '+format(p);el.append(line)}};
 const inStock=items.filter(p=>p.estoque!==0);
 section('Maiores comissões por unidade',inStock.slice().sort((a,b)=>money(b.comissao)-money(a.comissao)).filter(p=>money(p.comissao)>0).slice(0,5),p=>p.comissao);
 section('Maiores descontos registrados',inStock.filter(p=>discount(p)>0&&Number(p.ofertaFim)>Date.now()).sort((a,b)=>discount(b)-discount(a)).slice(0,5),p=>discount(p).toFixed(1)+'%');
 section('Estoque baixo ou esgotado',items.filter(p=>p.estoque!=null&&p.estoque<=10).sort((a,b)=>a.estoque-b.estoque),p=>p.estoque===0?'ESGOTADO':p.estoque+' unidades');
 const signals=data.sinaisTikTok||{};const info=document.createElement('p');info.textContent='Rotas observadas: '+['vouchers','diagnosis','activity','suggestion'].map(k=>k+': '+(signals[k]?.linhas??'não confirmado')).join(' · ');el.append(info);
 const detail=(label,value)=>{const p=document.createElement('p');p.textContent=label+': '+value;el.append(p)};
 if(signals.room?.gmvRaw!==undefined)detail('GMV bruto (moeda/escala não confirmadas)',signals.room.gmvRaw);
 if(signals.room?.userCountRaw!==undefined)detail('user_count bruto (significado em validação)',signals.room.userCountRaw);
 if(signals.activity?.typeCounts)detail('Tipos de atividades na resposta (não totais da LIVE)',JSON.stringify(signals.activity.typeCounts));
 for(const [i,v] of (signals.vouchers?.voucherDetails||[]).entries())if(Object.keys(v).length)detail('Cupom '+(i+1),Object.entries(v).map(([k,x])=>k+': '+(/time$/.test(k)?new Date(x).toLocaleString('pt-BR'):x)).join(' · '));
 if(signals.diagnosis?.diagnosisCodes?.some(x=>Object.keys(x).length))detail('Códigos de diagnóstico (interpretação pendente)',JSON.stringify(signals.diagnosis.diagnosisCodes));
 for(const k of ['activity','vouchers','diagnosis','trends'])if(signals[k]?.itemFields?.length)detail('Campos internos '+k,signals[k].itemFields.join(', '));
}
$('bagHistory')?.addEventListener('click',async()=>{const el=$('bagHistoryStatus');try{const r=await fetch('/api/retorno?prioridade=1',{cache:'no-store'});if(!r.ok)throw Error('Histórico ainda indisponível');const d=await r.json();const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='v2j-historico-'+d.sessaoId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);el.textContent=d.points.length+' minutos registrados';}catch(e){el.textContent=e.message}});

$('bagPerformance')?.addEventListener('click',async()=>{const el=$('bagPerformanceData');el.textContent='Consultando histórico…';try{const r=await fetch('/api/retorno?prioridade=1',{cache:'no-store'});if(!r.ok)throw Error('Histórico indisponível');const d=await r.json();el.replaceChildren();const line=(t)=>{const p=document.createElement('p');p.textContent=t;el.append(p)};line('Sessão '+d.sessaoId+' · '+(d.points||[]).length+' minutos com leituras');line('Avisos observados, não indicadores oficiais: '+JSON.stringify(d.noticeCounts||{}));const rows=(d.productMetrics||[]).filter(p=>Number.isFinite(p.cliques)).sort((a,b)=>b.cliques-a.cliques);if(!rows.length)line('Sem cliques individuais confirmados.');for(const p of rows.slice(0,10)){const item=(data.catalogo||[]).find(x=>x.link?.match(/\/view\/product\/(\d+)(?:[/?#]|$)/)?.[1]===p.id);line((item?'#'+item.numero+' '+item.nome:p.id)+' · '+p.cliques+' cliques');}line('Avisos por número da sacolinha (não cliques oficiais):');for(const [n,p] of Object.entries(d.noticeProductCounts||{}).sort((a,b)=>(b[1].produto_visto||0)-(a[1].produto_visto||0)).slice(0,10))line('#'+n+' · '+(p.produto_visto||0)+' avisos de visualização · '+(p.carrinho||0)+' avisos de carrinho');}catch(e){el.textContent=e.message}});
