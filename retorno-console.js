// Controle independente: não modifica o texto, os vídeos nem a câmera.
const retornoStatus=document.getElementById('retornoStatus');
const botaoTexto=document.getElementById('retornoTexto');
const botaoTela=document.getElementById('retornoTelaBtn');
let envioRetorno=false;
function mostrarModo(modo){
 const tela=modo==='tela';
 botaoTexto.style.background=tela?'#334765':'#23a578';
 botaoTela.style.background=tela?'#23a578':'#334765';
 botaoTexto.style.color=botaoTela.style.color='#fff';
 botaoTexto.setAttribute('aria-pressed',String(!tela));
 botaoTela.setAttribute('aria-pressed',String(tela));
 retornoStatus.textContent=tela?'🟢 No retorno: Tela do OBS (câmera virtual)':'🟢 No retorno: Mensagens de texto';
}
async function carregarRetorno(){
 if(envioRetorno)return;
 try{
  const r=await fetch('/api/retorno',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  mostrarModo((await r.json()).modo);
 }catch(e){retornoStatus.textContent='Não foi possível consultar o modo: '+e.message;}
}
async function definirRetorno(modo){
 if(envioRetorno)return;
 envioRetorno=true;botaoTexto.disabled=botaoTela.disabled=true;
 retornoStatus.textContent='Atualizando retorno…';
 try{
  const r=await fetch('/api/retorno',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modo})});
  const d=await r.json();
  if(!r.ok)throw Error(d.erro||'HTTP '+r.status);
  mostrarModo(d.modo);
 }catch(e){retornoStatus.textContent='Falha ao alterar o retorno: '+e.message;}
 finally{envioRetorno=false;botaoTexto.disabled=botaoTela.disabled=false;}
}
botaoTexto.addEventListener('click',()=>definirRetorno('texto'));
botaoTela.addEventListener('click',()=>definirRetorno('tela'));
carregarRetorno();setInterval(()=>{if(!document.hidden)carregarRetorno();},6000);
