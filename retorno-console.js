// Controle independente: não modifica o texto, os vídeos nem a câmera.
const retornoStatus=document.getElementById('retornoStatus');
const botaoTexto=document.getElementById('retornoTexto');
const botaoTela=document.getElementById('retornoTelaBtn');
const botaoCentral=document.getElementById('retornoCentralBtn');
let envioRetorno=false;
function mostrarModo(modo){
 const options=[['texto',botaoTexto],['tela',botaoTela],['central',botaoCentral]];
 for(const [value,button] of options){
  const active=value===modo;
  button.style.background=active?'#23a578':'#334765';
  button.style.color='#fff';
  button.setAttribute('aria-pressed',String(active));
 }
 retornoStatus.textContent=modo==='central'?'🟢 No retorno: Central de apoio (chat, produto e recados)':modo==='tela'?'🟢 No retorno: Tela do OBS (câmera virtual)':'🟢 No retorno: Mensagens de texto';
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
 envioRetorno=true;botaoTexto.disabled=botaoTela.disabled=botaoCentral.disabled=true;
 retornoStatus.textContent='Atualizando retorno…';
 try{
  const r=await fetch('/api/retorno',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modo})});
  const d=await r.json();
  if(!r.ok)throw Error(d.erro||'HTTP '+r.status);
  mostrarModo(d.modo);
 }catch(e){retornoStatus.textContent='Falha ao alterar o retorno: '+e.message;}
 finally{envioRetorno=false;botaoTexto.disabled=botaoTela.disabled=botaoCentral.disabled=false;}
}
botaoTexto.addEventListener('click',()=>definirRetorno('texto'));
botaoTela.addEventListener('click',()=>definirRetorno('tela'));
botaoCentral.addEventListener('click',()=>definirRetorno('central'));
carregarRetorno();setInterval(()=>{if(!document.hidden)carregarRetorno();},6000);
