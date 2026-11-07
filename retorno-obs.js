// Independente do editor de texto e do player de vídeos.
const tela=document.getElementById('retornoTela');
let modoAtual='texto';
async function atualizarModo(){
 try{
  const r=await fetch('/api/retorno',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const {modo}=await r.json();
  const proximo=modo==='tela'?'tela':'texto';
  if(proximo===modoAtual)return;
  modoAtual=proximo;
  if(proximo==='tela'){
   // O fluxo existente da câmera virtual é reutilizado sem copiar vídeo.
   tela.src='/camera.html';
   document.body.classList.add('modo-tela');
  }else{
   document.body.classList.remove('modo-tela');
   tela.removeAttribute('src');
  }
 }catch(e){console.warn('Modo do retorno indisponível',e);}
}
atualizarModo();setInterval(atualizarModo,1500);

const ajustes=new URLSearchParams(location.search);
const ajusteHabilitado=ajustes.get('ajuste')==='1';
if(ajusteHabilitado)document.body.classList.add('mostrar-ajuste');
const zoomLabel=document.getElementById('zoomValor');
let zoomRetorno=Number(localStorage.getItem('retornoZoomV2')||1);
const zoomNaUrl=Number(ajustes.get('zoom'));
if(ajustes.has('zoom')&&Number.isFinite(zoomNaUrl))zoomRetorno=zoomNaUrl;
function aplicarZoom(valor){
 zoomRetorno=Math.max(1,Math.min(2.8,Math.round(valor*10)/10));
 document.documentElement.style.setProperty('--zoom-retorno',String(zoomRetorno));
 zoomLabel.textContent=Math.round(zoomRetorno*100)+'%';
 try{localStorage.setItem('retornoZoomV2',String(zoomRetorno));}catch{}
}
document.getElementById('menosZoom').addEventListener('click',()=>aplicarZoom(zoomRetorno-0.1));
document.getElementById('maisZoom').addEventListener('click',()=>aplicarZoom(zoomRetorno+0.1));
aplicarZoom(zoomRetorno);
