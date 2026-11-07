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
