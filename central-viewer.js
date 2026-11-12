const $=id=>document.getElementById(id);
let version=-1;
let snapshot=null;
const METRIC_FRESH_MS=120000;
const dataAge=timestamp=>{
 const at=Number(timestamp)||0;
 return at?Math.max(0,Math.floor((Date.now()-at)/1000))+'s':'não recebido';
};
const formatNumber=n=>Number(n).toLocaleString('pt-BR');
function refreshCaptureHealth(data){
 const metrics=data.liveMetricas||{},last=Number(metrics.atualizadoEm)||0;
 const recent=last>0&&Date.now()-last<=METRIC_FRESH_MS;
 const metricValue=(id,key,money=false)=>{
  const value=metrics[key];
  $(id).textContent=!recent||value===null||value===undefined||value===''?'—':
   money?String(value):formatNumber(value);
 };
 for(const [id,key] of [['liveClicks','cliques'],['liveSales','vendas'],['liveViews','visualizacoes'],
  ['liveImpressions','exibicoesRegistradas'],['liveCartAdds','carrinhos'],
  ['liveLikes','curtidas'],['liveShares','compartilhamentos']])metricValue(id,key);
 metricValue('liveGMV','gmv',true);
 const note=last?'Última métrica há '+dataAge(last)+'. ':'Nenhuma métrica capturada. ';
 $('metricsFreshness').textContent=(recent?'● Dados recentes. ':last?'⚠ Métricas antigas não são exibidas como atuais. ':'○ Aguardando dados. ')+note+
  '* Interações exibidas são apenas eventos recentes. client_show_cnt é um campo técnico, não uma contagem de pessoas únicas.';
 const setHealth=(id,kind,message)=>{
  const el=$(id);if(!el)return;
  el.className=kind;el.textContent=message;
 };
 setHealth('healthMetrics',recent?'ok':last?'stale':'off',recent?'● Métricas atualizadas há '+dataAge(last):
   last?'⚠ Última métrica há '+dataAge(last):'○ Métricas: aguardando');
 const catalog=Array.isArray(data.catalogo)?data.catalogo:[];
 const fromTikTok=catalog.filter(p=>p.origem==='tiktok');
 const updatedAt=Math.max(0,...fromTikTok.map(p=>Number(p.atualizadoEm)||0));
 const catalogFresh=updatedAt>0&&Date.now()-updatedAt<=300000;
 setHealth('healthCatalog',fromTikTok.length?(catalogFresh?'ok':'stale'):'off',
  fromTikTok.length?(catalogFresh?'●':'⚠')+' Sacolinha: '+fromTikTok.length+' itens TikTok · última leitura há '+dataAge(updatedAt):
  catalog.length?'○ '+catalog.length+' itens cadastrados manualmente':'○ Sacolinha: aguardando');
 const events=Array.isArray(data.liveEventos)?data.liveEventos:[];
 const lastEvent=Math.max(0,...events.map(e=>Number(e.recebidoEm)||0));
 setHealth('healthEvents',lastEvent&&Date.now()-lastEvent<120000?'ok':lastEvent?'stale':'off',
  lastEvent?'● '+events.length+' eventos retidos · último há '+dataAge(lastEvent):
  '○ Eventos em tempo real: aguardando');
 setHealth('healthSession','off','Fonte: TikTok + leitura V2J; atividade da rede não confirma venda');
}
function messageNode(m){
 const node=document.createElement('div');node.className='message'+(m.tipo==='pedido'?' order':m.tipo==='seguidor'?' follow':'');
 const heading=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small'),body=document.createElement('p');
 name.textContent=m.autor||'Espectador';time.textContent=m.hora||'';body.textContent=m.texto;
 heading.append(name,time);node.append(heading,body);return node;
}
function show(data){
 snapshot=data;
 refreshCaptureHealth(data);
 if(data.versao===version)return;version=data.versao;
 const list=$('messages');list.replaceChildren();
 const manual=Array.isArray(data.chat)?data.chat:[];
 const live=Array.isArray(data.liveEventos)?data.liveEventos:[];
 const messages=[...manual.map(m=>({...m,tipo:'manual'})),...live].sort((a,b)=>(Number(a.recebidoEm)||0)-(Number(b.recebidoEm)||0)).slice(-70);
 if(!messages.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Aguardando comentários e avisos da LIVE…';list.append(empty);}
 else for(const m of messages)list.append(messageNode({...m,autor:m.tipo==='pedido'?'🛒 NOVO PEDIDO':m.tipo==='seguidor'?'👤 NOVO SEGUIDOR':m.autor}));
 list.scrollTop=list.scrollHeight;
 $('chatCount').textContent=live.length?'AUTOMÁTICO · '+live.length+' EVENTOS':'MANUAL · '+manual.length;
 const selected=(data.catalogo||[]).find(item=>item.numero===data.itemAtivo);
 const sameProduct=selected&&data.produto?.link&&selected.link&&data.produto.link.match(/\/view\/product\/(\d+)/)?.[1]===selected.link.match(/\/view\/product\/(\d+)/)?.[1];
 const p=selected?{nome:'#'+selected.numero+' · '+selected.nome,preco:selected.preco,descricao:selected.descricao||(sameProduct?data.produto.descricao:''),cores:selected.cores||[],loja:selected.loja,categoria:selected.categoria,comissao:selected.comissao,taxaComissao:selected.taxaComissao,link:selected.link,imagens:selected.imagens?.length?selected.imagens:(sameProduct&&data.produto?.imagens?.length?data.produto.imagens:(selected.imagem?[selected.imagem]:[])),estoque:selected.estoque,precoOferta:selected.precoOferta,precoOriginal:selected.precoOriginal,ofertaInicio:selected.ofertaInicio,ofertaFim:selected.ofertaFim,atualizadoEm:selected.atualizadoEm}:data.produto||{};
 const metrics=data.liveMetricas||{};
 const comments=live.filter(e=>e.tipo==='comentario').length;
 const followers=live.filter(e=>e.tipo==='seguidor').length;
 const orders=live.filter(e=>e.tipo==='pedido').length;
 $('liveComments').textContent=live.length?String(comments):'—';
 $('liveEvents').textContent=live.length?(followers+' / '+orders):'—';
 // A data de cada indicador é avaliada em refreshCaptureHealth(), inclusive quando o estado não muda.
 const catalog=Array.isArray(data.catalogo)?data.catalogo:[];
 const index=catalog.findIndex(x=>x.numero===data.itemAtivo);
 $('kpiStock').textContent=p.estoque==null?'—':Number(p.estoque).toLocaleString('pt-BR')+' un.';
 $('kpiCommission').textContent=p.comissao||'—';
 $('kpiTotal').textContent=String(catalog.length);
 $('kpiRemaining').textContent=index<0?'—':String(catalog.filter(x=>x.numero>data.itemAtivo).length);
 $('kpiPrice').textContent=p.preco||'—';
 $('kpiOriginal').textContent=p.precoOriginal||'—';
 $('kpiOffer').textContent=p.precoOferta||'—';
 const rate=Number(p.taxaComissao);
 $('kpiRate').textContent=Number.isFinite(rate)&&rate>0?(rate*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%':'—';
 const subtitle=$('productSubtitle');subtitle.replaceChildren();
 const extra=[['🏪 Loja',p.loja],['📂 Categoria',p.categoria],['🧾 Item',selected?'#'+selected.numero:''],['🟢 Origem',selected?.origem==='tiktok'?'TikTok':'Cadastro V2J'],['🔄 Atualizado',p.atualizadoEm?new Date(p.atualizadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'']];
 for(const [label,value] of extra){if(!value)continue;const chip=document.createElement('span');chip.textContent=label+': '+value;subtitle.append(chip);}

 $('name').textContent=p.nome||'Nenhum produto selecionado';
 const colors=$('colorOptions');colors.replaceChildren();
 for(const color of (Array.isArray(p.cores)?p.cores:[])){const chip=document.createElement('span');chip.textContent=color;colors.append(chip);}
 colors.hidden=!colors.children.length;
 $('desc').textContent=p.descricao||'Cadastre as informações no console V2J.';
 $('notice').textContent=data.recado||'Nenhum recado no momento.';
 const urls=Array.isArray(p.imagens)?p.imagens.filter(url=>/^https:\/\//i.test(url)):[];
 $('productImages').hidden=!urls.length;
 $('thumbs').replaceChildren();
 if(urls.length){
  $('mainImage').src=urls[0];
  for(const [i,url] of urls.entries()){
   const image=document.createElement('img');image.src=url;image.alt='Foto '+(i+1);image.loading='lazy';image.className=i?'':'selected';
   image.addEventListener('click',()=>{$('mainImage').src=url;for(const node of $('thumbs').children)node.classList.remove('selected');image.classList.add('selected');});
   $('thumbs').append(image);
  }
 }else $('mainImage').removeAttribute('src');
}
async function poll(){
 try{const response=await fetch('/api/retorno?central=1',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);show(await response.json());$('status').textContent='● Retorno conectado · valores antigos sinalizados';}
 catch(e){$('status').textContent='⚠ Sem conexão';console.warn(e);}
}
poll();setInterval(poll,1500);


// Exportação local: sem enviar registros para serviços terceiros.
const reportDate=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
function exportDownload(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function safeCell(v){
 const text=v==null?'':String(v);
 const safe=/^[=+@\-\t\r]/.test(text)?"'"+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
}
const makeCsv=rows=>'\uFEFF'+rows.map(row=>row.map(safeCell).join(';')).join('\r\n');
function ready(){if(snapshot)return true;alert('Aguarde a conexão com a Central antes de exportar.');return false;}
$('exportSummary').onclick=()=>{
 if(!ready())return;
 const m=snapshot.liveMetricas||{},events=snapshot.liveEventos||[];
 const fields=[
  ['Data da exportação',new Date().toLocaleString('pt-BR')],
  ['Atualização das métricas',m.atualizadoEm?new Date(m.atualizadoEm).toLocaleString('pt-BR'):''],
  ['Valor vendido (GMV)',m.gmv||''],['Vendas / pedidos',m.vendas],
  ['Adições ao carrinho',m.carrinhos],['Curtidas',m.curtidas],
  ['Compartilhamentos',m.compartilhamentos],['Cliques nos produtos',m.cliques],
  ['Visualizações (watch_pv)',m.visualizacoes],
  ['Exibições técnicas (client_show_cnt)',m.exibicoesRegistradas],
  ['Métricas recentes (até 120s)',Number(m.atualizadoEm)>0&&Date.now()-Number(m.atualizadoEm)<=METRIC_FRESH_MS?'sim':'não'],
  ['Comentários capturados (recentes)',events.filter(e=>e.tipo==='comentario').length],
  ['Seguidores capturados (recentes)',events.filter(e=>e.tipo==='seguidor').length],
  ['Pedidos capturados (recentes)',events.filter(e=>e.tipo==='pedido').length],
  ['Itens na sacolinha',(snapshot.catalogo||[]).length],['Item ativo',snapshot.itemAtivo]
 ];
 exportDownload('v2j-resumo-live-'+reportDate()+'.csv',makeCsv([['Indicador','Valor'],...fields]),'text/csv;charset=utf-8');
};
$('exportProducts').onclick=()=>{
 if(!ready())return;
 const header=['Número','Produto','Preço atual','Preço original','Preço de oferta','Estoque','Comissão estimada','Taxa de comissão (%)','Loja','Categoria','Cores','Descrição','Link','Atualizado em'];
 const rows=(snapshot.catalogo||[]).map(p=>[
  p.numero,p.nome,p.preco,p.precoOriginal,p.precoOferta,p.estoque,p.comissao,
  Number(p.taxaComissao)>0?(Number(p.taxaComissao)*100).toFixed(2):'',
  p.loja,p.categoria,(p.cores||[]).join(', '),p.descricao,p.link,
  p.atualizadoEm?new Date(p.atualizadoEm).toLocaleString('pt-BR'):''
 ]);
 exportDownload('v2j-produtos-live-'+reportDate()+'.csv',makeCsv([header,...rows]),'text/csv;charset=utf-8');
};
$('exportFull').onclick=()=>{
 if(!ready())return;
 const data={exportadoEm:new Date().toISOString(),tipo:'Retrato atual da Central V2J — não é histórico de toda a LIVE',
  observacao:'Campos vazios não foram capturados. Exibições técnicas (client_show_cnt) não são visualizações (watch_pv) nem espectadores únicos. Eventos são apenas os recentes retidos pelo V2J.',
  metricas:snapshot.liveMetricas||{},itemAtivo:snapshot.itemAtivo,
  produtos:snapshot.catalogo||[],eventosRecentes:snapshot.liveEventos||[],chatManual:snapshot.chat||[]};
 exportDownload('v2j-relatorio-live-'+reportDate()+'.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');
};
