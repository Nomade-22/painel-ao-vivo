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
 const p=data.produto||{};
 $('name').textContent=p.nome||'Nenhum produto selecionado';
 $('price').textContent=p.preco||'';
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
 try{const response=await fetch('/api/central',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);show(await response.json());$('status').textContent='● Conectado';}
 catch(e){$('status').textContent='⚠ Sem conexão';console.warn(e);}
}
poll();setInterval(poll,1500);
