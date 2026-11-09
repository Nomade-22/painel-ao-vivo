const $=id=>document.getElementById(id);
let version=-1;
function messageNode(m){
 const node=document.createElement('div');node.className='message'+(m.tipo==='pedido'?' order':m.tipo==='seguidor'?' follow':'');
 const heading=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small'),body=document.createElement('p');
 name.textContent=m.autor||'Espectador';time.textContent=m.hora||'';body.textContent=m.texto;
 heading.append(name,time);node.append(heading,body);return node;
}
function show(data){
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
 $('liveClicks').textContent=metrics.cliques==null?'—':Number(metrics.cliques).toLocaleString('pt-BR');
 $('liveSales').textContent=metrics.vendas==null?'—':Number(metrics.vendas).toLocaleString('pt-BR');
 $('liveGMV').textContent=metrics.gmv||'—';
 $('liveViews').textContent=metrics.visualizacoes==null?'—':Number(metrics.visualizacoes).toLocaleString('pt-BR');
 for(const [id,field] of [['liveCartAdds','carrinhos'],['liveLikes','curtidas'],['liveShares','compartilhamentos']])$(''+id).textContent=metrics[field]==null?'—':Number(metrics[field]).toLocaleString('pt-BR');
 const comments=live.filter(e=>e.tipo==='comentario').length;
 const followers=live.filter(e=>e.tipo==='seguidor').length;
 const orders=live.filter(e=>e.tipo==='pedido').length;
 $('liveComments').textContent=live.length?String(comments):'—';
 $('liveEvents').textContent=live.length?(followers+' / '+orders):'—';
 const lastUpdate=Number(metrics.atualizadoEm)||0;
 $('metricsFreshness').textContent=(lastUpdate?'Métricas atualizadas às '+new Date(lastUpdate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'. ':'Métricas automáticas ainda não recebidas. ')+
 '* Comentários, seguidores e pedidos exibem somente eventos recentes capturados, não totais da LIVE.';
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
 try{const response=await fetch('/api/retorno?central=1',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);show(await response.json());$('status').textContent='● Conectado';}
 catch(e){$('status').textContent='⚠ Sem conexão';console.warn(e);}
}
poll();setInterval(poll,1500);
