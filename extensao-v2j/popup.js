const $=id=>document.getElementById(id);
let tabId=null,auto=false;
function show(result){if(!result)return;$('count').textContent=result.found??0;$('message').textContent=result.message||'Pronto';if(typeof result.auto==='boolean'){auto=result.auto;$('auto').textContent=auto?'Pausar leitura automática':'Ativar leitura automática';}}
async function command(type,extra={}) {
 if(!tabId){$('message').textContent='Abra a aba do Gerenciador de LIVE do TikTok Shop.';return;}
 $('message').textContent='Verificando…';
 try{show(await chrome.tabs.sendMessage(tabId,{type,...extra}));}
 catch(e){$('message').textContent='Não foi possível conectar. Atualize a página do TikTok (Ctrl+R), deixe a sacolinha aberta e tente novamente.';}
}
chrome.tabs.query({active:true,currentWindow:true},tabs=>{
 const tab=tabs[0];
 if(!tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/')){
   $('message').textContent='Abra esta extensão com o Gerenciador de LIVE do TikTok na aba ativa.';
   return;
 }
 tabId=tab.id;command('V2J_STATUS');
});
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
