const $=id=>document.getElementById(id);
let tabId=null,auto=false;
const setConnection=(ok,label)=>{const el=$('connection');el.classList.toggle('ok',!!ok);el.textContent='● '+label;};
document.querySelectorAll('.tabButton').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('.tabButton').forEach(item=>item.setAttribute('aria-selected',String(item===button)));
 document.querySelectorAll('.tabPanel').forEach(panel=>{panel.hidden=panel.dataset.panel!==button.dataset.tab;});
}));
function show(result){if(!result)return;setConnection(true,'Extensão conectada');$('count').textContent=result.found??0;$('message').textContent=result.message||'Pronto';if(typeof result.auto==='boolean'){auto=result.auto;$('auto').textContent=auto?'Pausar leitura automática':'Ativar leitura automática';}}
async function command(type,extra={}) {
 if(!tabId){$('message').textContent='Abra a aba do Gerenciador de LIVE do TikTok Shop.';return;}
 $('message').textContent='Verificando…';
 try{show(await chrome.tabs.sendMessage(tabId,{type,...extra}));}
 catch(e){setConnection(false,'Sem conexão');$('message').textContent='Não foi possível conectar. Atualize a página do TikTok (Ctrl+R), deixe a sacolinha aberta e tente novamente.';}
}
chrome.tabs.query({active:true,currentWindow:true},tabs=>{
 const tab=tabs[0];
 if(!tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/')){
   $('message').textContent='Abra esta extensão com o Gerenciador de LIVE do TikTok na aba ativa.';
   setConnection(false,'TikTok não detectado');
   return;
 }
 tabId=tab.id;setConnection(false,'Verificando');command('V2J_STATUS');
});
async function action(type,extra={}){
 if(!tabId){$('message').textContent='Abra o Gerenciador de LIVE na aba ativa.';return;}
 try{const result=await chrome.tabs.sendMessage(tabId,{type,...extra});$('message').textContent=result?.message||'Comando enviado.';return result;}
 catch(e){setConnection(false,'Reconectar');$('message').textContent='Atualize a aba do TikTok (Ctrl+R) e tente novamente.';}
}
$('startLive').onclick=async()=>{
 if(!confirm('Acionar “Iniciar LIVE” no TikTok? A transmissão pode começar imediatamente.'))return;
 const result=await chrome.runtime.sendMessage({type:'V2J_START_LIVE_REQUEST',fromPopup:true});
 $('message').textContent=result?.message||'Comando não concluído.';
};
$('repin').onclick=async()=>{
 const numero=Number($('pinNumber').value);
 if(!Number.isInteger(numero)||numero<1||numero>200){$('message').textContent='Informe um número válido da sacolinha.';return;}
 await action('V2J_REFIX_PRODUCT',{numero});
};
chrome.storage.local.get('v2jCommentFilter').then(data=>{$('commentFilter').value=data.v2jCommentFilter||'todos';});
$('commentFilter').onchange=()=>chrome.storage.local.set({v2jCommentFilter:$('commentFilter').value});
$('scan').onclick=()=>command('V2J_SCAN',{send:false});
$('send').onclick=()=>command('V2J_SCAN',{send:true});
$('auto').onclick=async()=>{if(!tabId)return;try{const r=await chrome.tabs.sendMessage(tabId,{type:'V2J_AUTO',enabled:!auto});auto=r.auto;$('auto').textContent=auto?'Pausar leitura automática':'Ativar leitura automática';$('message').textContent=auto?'Leitura automática ativada enquanto esta aba estiver aberta.':'Leitura automática pausada.';}catch(e){$('message').textContent='Atualize a página do TikTok e tente novamente.';}};

async function batchStatus(){
 try{
  const data=await chrome.runtime.sendMessage({type:'V2J_BATCH_STATUS'});
  $('batchStatus').textContent=(data.done||0)+' / '+(data.total||0)+' itens · '+(data.message||'Aguardando');
  $('batchStart').disabled=!!data.running;
 $('refreshDescriptions').disabled=!!data.running;
  $('batchStop').style.display=data.running?'block':'none';
 }catch(e){$('batchStatus').textContent='Não foi possível consultar o andamento.';}
}
$('batchStart').onclick=async()=>{
 $('batchStatus').textContent='Preparando importação…';
 const result=await chrome.runtime.sendMessage({type:'V2J_BATCH_START',refreshExisting:$('refreshDescriptions').checked});
 if(!result?.ok)$('batchStatus').textContent=result?.message||'Não foi possível iniciar.';
 await batchStatus();
};
$('batchStop').onclick=async()=>{await chrome.runtime.sendMessage({type:'V2J_BATCH_STOP'});await batchStatus();};
batchStatus();setInterval(batchStatus,2000);
