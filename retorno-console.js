// Controle independente: não modifica o texto, os vídeos nem a câmera.
const retornoStatus=document.getElementById('retornoStatus');
const botaoTexto=document.getElementById('retornoTexto');
const botaoTela=document.getElementById('retornoTelaBtn');
const botaoCentral=document.getElementById('retornoCentralBtn');
const botaoVideo=document.getElementById('retornoVideoBtn');
let envioRetorno=false,leituraRetorno=false,versaoRetorno=-1;
function mostrarModo(modo){
 const options=[['texto',botaoTexto],['tela',botaoTela],['central',botaoCentral],['video',botaoVideo]];
 for(const [value,button] of options){
  const active=value===modo;
  button.style.background=active?'#23a578':'#334765';
  button.style.color='#fff';
  button.setAttribute('aria-pressed',String(active));
 }
 retornoStatus.textContent=modo==='central'?'🟢 No retorno: Central de apoio (chat, produto e recados)':modo==='tela'?'🟢 No retorno: Tela do OBS (câmera virtual)':modo==='video'?'🟢 No retorno: Vídeos da biblioteca (reprodução direta)':'🟢 No retorno: Mensagens de texto';
}
async function carregarRetorno(){
 if(envioRetorno||leituraRetorno)return;
 leituraRetorno=true;
 try{
  const r=await fetch('/api/retorno',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!envioRetorno&&Number(data.versao)>=versaoRetorno){versaoRetorno=Number(data.versao);mostrarModo(data.modo);}
 }catch(e){if(!envioRetorno)retornoStatus.textContent='Não foi possível consultar o modo: '+e.message;}
 finally{leituraRetorno=false;}
}
async function definirRetorno(modo){
 if(envioRetorno)return;
 envioRetorno=true;botaoTexto.disabled=botaoTela.disabled=botaoCentral.disabled=botaoVideo.disabled=true;
 retornoStatus.textContent='Atualizando retorno…';
 try{
  const r=await fetch('/api/retorno',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modo})});
  const d=await r.json();
  if(!r.ok)throw Error(d.erro||'HTTP '+r.status);
  versaoRetorno=Math.max(versaoRetorno,Number(d.versao)||0);mostrarModo(d.modo);
 }catch(e){retornoStatus.textContent='Falha ao alterar o retorno: '+e.message;}
 finally{envioRetorno=false;botaoTexto.disabled=botaoTela.disabled=botaoCentral.disabled=botaoVideo.disabled=false;}
}
botaoTexto.addEventListener('click',()=>definirRetorno('texto'));
botaoTela.addEventListener('click',()=>definirRetorno('tela'));
botaoCentral.addEventListener('click',()=>definirRetorno('central'));
botaoVideo.addEventListener('click',()=>definirRetorno('video'));
carregarRetorno();setInterval(()=>{if(!document.hidden)carregarRetorno();},6000);
