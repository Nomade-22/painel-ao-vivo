const $=id=>document.getElementById(id);
let version=-1;
function messageNode(m){
 const node=document.createElement('div');node.className='message';
 const heading=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small'),body=document.createElement('p');
 name.textContent=m.autor||'Espectador';time.textContent=m.hora||'';body.textContent=m.texto;
 heading.append(name,time);node.append(heading,body);return node;
}
function show(data){
 if(data.versao===version)return;version=data.versao;
 const list=$('messages');list.replaceChildren();
 const messages=Array.isArray(data.chat)?data.chat:[];
 if(!messages.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Aguardando mensagens enviadas pelo console…';list.append(empty);}
 else for(const m of messages)list.append(messageNode(m));
 list.scrollTop=list.scrollHeight;
 $('chatCount').textContent=messages.length+' MENSAGENS · MANUAL';
 const selected=(data.catalogo||[]).find(item=>item.numero===data.itemAtivo);
 const sameProduct=selected&&data.produto?.link&&selected.link&&data.produto.link.match(/\/view\/product\/(\d+)/)?.[1]===selected.link.match(/\/view\/product\/(\d+)/)?.[1];
 const p=selected?{nome:'#'+selected.numero+' · '+selected.nome,preco:selected.preco,descricao:selected.descricao||(sameProduct?data.produto.descricao:''),loja:selected.loja,categoria:selected.categoria,comissao:selected.comissao,taxaComissao:selected.taxaComissao,link:selected.link,imagens:selected.imagens?.length?selected.imagens:(sameProduct&&data.produto?.imagens?.length?data.produto.imagens:(selected.imagem?[selected.imagem]:[])),estoque:selected.estoque,precoOferta:selected.precoOferta,precoOriginal:selected.precoOriginal,ofertaInicio:selected.ofertaInicio,ofertaFim:selected.ofertaFim,atualizadoEm:selected.atualizadoEm}:data.produto||{};
 $('name').textContent=p.nome||'Nenhum produto selecionado';
 const now=Date.now(), rawBegin=Number(p.ofertaInicio)||0,rawEnd=Number(p.ofertaFim)||0;
 const begin=rawBegin&&rawBegin<1e12?rawBegin*1000:rawBegin,end=rawEnd&&rawEnd<1e12?rawEnd*1000:rawEnd;
 const activeOffer=!!p.precoOferta&&(!begin||now>=begin)&&(!end||now<=end);
 $('price').textContent=activeOffer?p.precoOferta+' · Oferta'+(p.precoOriginal?' (antes '+p.precoOriginal+')':''):p.preco||'';
 const meta=$('productMeta');meta.replaceChildren();
 const add=(label,low=false)=>{const el=document.createElement('span');el.textContent=label;if(low)el.className='low';meta.append(el);};
 if(p.estoque!=null)add('📦 Estoque: '+Number(p.estoque).toLocaleString('pt-BR')+' un.',p.estoque<=10);
 if(p.categoria)add('🏷️ '+p.categoria);
 if(p.loja)add('🏪 '+p.loja);
 if(p.comissao)add('💰 Comissão est.: '+p.comissao+(p.taxaComissao?' ('+p.taxaComissao+'%)':''));
 if(p.atualizadoEm)add('Atualizado: '+new Date(p.atualizadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
 const link=$('productLink');const valid=typeof p.link==='string'&&/^https:\/\/shop\.tiktok\.com\/view\/product\/\d+/i.test(p.link);
 link.hidden=!valid;if(valid)link.href=p.link;else link.removeAttribute('href');
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
