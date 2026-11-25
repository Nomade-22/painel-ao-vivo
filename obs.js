import {aplicarEstiloTexto} from '/texto-estilo.js';
const visor=document.getElementById('conteudo');
const texto=document.getElementById('texto');
const imagem=document.getElementById('imagem');
let versao=-1,reading=false;
async function atualizar(){
 if(reading)return;reading=true;
 try{
  const r=await fetch('/api/painel',{cache:'no-store'});
  if(!r.ok)throw Error('Falha '+r.status);
  const d=await r.json();
  if(!Number.isFinite(d.versao)||d.versao<=versao)return;
  versao=d.versao;
  const v=d.painel||{};
  texto.textContent=v.texto||'';
  const u=typeof v.imagem==='string'?v.imagem:'';
  if(/^https:\/\//i.test(u)){
   if(imagem.getAttribute('src')!==u)imagem.src=u;
   imagem.style.display='block';
   imagem.style.width=Math.max(50,Math.min(1000,Number(v.imagemLargura)||300))+'px';
  }else{
   imagem.removeAttribute('src');
   imagem.style.display='none';
  }
  visor.style.flexDirection=v.imagemPosicao==='abaixo'?'column-reverse':'column';
  const posicao={top:'start',center:'center',bottom:'end'};
  document.body.style.alignItems=posicao[v.vertical]||'center';
  aplicarEstiloTexto(texto,v,1);
 }catch(e){console.warn('Painel de texto indisponível',e);}
 finally{reading=false;}
}
atualizar();setInterval(atualizar,1200);
