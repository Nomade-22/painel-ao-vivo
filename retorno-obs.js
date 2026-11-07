// Independente do editor de texto e do player de vídeos.
const tela=document.getElementById('retornoTela');
const central=document.getElementById('retornoCentral');
let modoAtual='texto';
async function atualizarModo(){
 try{
  const r=await fetch('/api/retorno',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const {modo}=await r.json();
  const proximo=['texto','tela','central'].includes(modo)?modo:'texto';
  if(proximo===modoAtual)return;
  modoAtual=proximo;
  document.body.classList.toggle('modo-tela',proximo==='tela');
  document.body.classList.toggle('modo-central',proximo==='central');
  if(proximo==='tela')tela.src='/camera.html';
  else tela.removeAttribute('src');
  if(proximo==='central')central.src='/central-retorno.html';
  else central.removeAttribute('src');
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
