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


// Diagnóstico local: controle explícito e relatório sem dados sensíveis.
const DIAG_KEY='v2jDiagnostics';
async function diagStatus(){
 const data=await chrome.storage.local.get(['v2jDiagEnabled',DIAG_KEY]);
 const enabled=data.v2jDiagEnabled===true, report=data[DIAG_KEY]||{};
 $('diagToggle').textContent=enabled?'■ Parar diagnóstico':'▶ Ativar diagnóstico';
 $('diagStatus').textContent=(enabled?'● Gravando':'○ Pausado')+' · '+(report.events?.length||0)+' registros disponíveis · '+(report.total||0)+' observados';
}
$('diagToggle').onclick=async()=>{
 const data=await chrome.storage.local.get('v2jDiagEnabled');
 await chrome.storage.local.set({v2jDiagEnabled:data.v2jDiagEnabled!==true});
 await diagStatus();
};
$('diagClear').onclick=async()=>{
 if(!confirm('Apagar os registros locais de diagnóstico?'))return;
 await chrome.storage.local.remove(DIAG_KEY);await diagStatus();
};
$('diagExport').onclick=async()=>{
 const data=await chrome.storage.local.get(DIAG_KEY);
 const report=data[DIAG_KEY];
 if(!report?.events?.length){$('message').textContent='Não há chamadas registradas para exportar.';return;}
 const summary={};
 for(const e of report.events){
  const key=e.method+' '+e.path;
  const item=summary[key]||(summary[key]={calls:0,errors:0,averageMs:0,statuses:{}});
  item.calls++;item.averageMs+=e.ms;
  if(e.status>=400||e.status===0)item.errors++;
  item.statuses[e.status]=(item.statuses[e.status]||0)+1;
 }
 for(const item of Object.values(summary))item.averageMs=Math.round(item.averageMs/item.calls);
 const groups={};
 const classify=path=>/\/live\/detail\/core\/stats|\/live\/detail\/trend\/chart/.test(path)?'estatisticas':/governance|violation/.test(path)?'seguranca_e_avisos':/live_product\/list|recommended_product|product\/pin|\/pin\/get/.test(path)?'produtos':/\/live\/detail\/room\/status/.test(path)?'estado_live':'outras';
 for(const [endpoint,info] of Object.entries(summary)){
  const category=classify(endpoint);
  const item=groups[category]||(groups[category]={chamadas:0,errosHttp:0,rotas:[]});
  item.chamadas+=info.calls;item.errosHttp+=info.errors;item.rotas.push(endpoint);
 }
 const output={source:'V2J TikTok Shop - diagnóstico passivo',version:'0.6.3',exportedAt:new Date().toISOString(),startedAt:new Date(report.startedAt).toISOString(),updatedAt:new Date(report.updatedAt).toISOString(),totalObserved:report.total,retained:report.events.length,privacy:'Sem parâmetros de URL, headers, cookies, corpos, tokens ou IDs pessoais.',interpretacao:'Chamadas a rotas de estatísticas e violações NÃO significam vendas ou infrações confirmadas. Os valores não estão contidos neste diagnóstico.',grupos:groups,summary,events:report.events};
 const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='v2j-diagnostico-live-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 $('message').textContent='Relatório gerado. Envie o JSON aqui para análise.';
};
diagStatus();setInterval(diagStatus,10000);
