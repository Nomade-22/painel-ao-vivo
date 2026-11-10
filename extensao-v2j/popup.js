const $=id=>document.getElementById(id);
let tabId=null,auto=false;
let platform='tiktok';
const diagKeys=()=>platform==='shopee'?['v2jShopeeDiagEnabled','v2jShopeeDiagnostics']:['v2jDiagEnabled','v2jDiagnostics'];
const setConnection=(ok,label)=>{const el=$('connection');el.classList.toggle('ok',!!ok);el.textContent='● '+label;};
$('fieldAudit').onclick=async()=>{
 const button=$('fieldAudit'),status=$('fieldAuditStatus');button.disabled=true;
 status.textContent='Verificando abas TikTok e Shopee…';
 try{
  const tabs=await chrome.tabs.query({url:[
   'https://shop.tiktok.com/streamer/live/*',
   'https://live.shopee.com.br/*',
   'https://creator.shopee.com.br/dashboard/live/*'
  ]});
  const results=await Promise.all(tabs.map(async tab=>{
   try{
    let response;
    try{response=await chrome.tabs.sendMessage(tab.id,{type:'V2J_FIELD_AUDIT'});}
    catch{
     await chrome.scripting.executeScript({target:{tabId:tab.id},files:['field-audit.js']});
     response=await chrome.tabs.sendMessage(tab.id,{type:'V2J_FIELD_AUDIT'});
    }
    return response?.diagnostico||{pagina:'desconhecida',erro:'Não foi possível mapear esta aba'};
   }catch(e){return {pagina:new URL(tab.url).hostname,erro:'Atualize esta aba e tente novamente.'};}
  }));
  if(!results.length){status.textContent='Abra o TikTok LIVE e as abas Shopee antes de executar.';return;}
  const report={versao:'0.7.1',geradoEm:new Date().toISOString(),diagnosticos:results};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='v2j-mapa-campos-live-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  status.textContent=results.length+' aba(s) verificadas. Envie o JSON para identificar os campos ausentes.';
 }catch(e){status.textContent='Falha ao mapear campos: '+e.message;}
 finally{button.disabled=false;}
};
$('shopeeForce').onclick=async()=>{
 const button=$('shopeeForce'),status=$('shopeeForceStatus');button.disabled=true;
 status.textContent='Procurando as duas abas e solicitando a leitura…';
 try{
  const result=await chrome.runtime.sendMessage({type:'V2J_SHOPEE_FORCE_ALL'});
  status.textContent=result.results?.map(r=>`${r.source}: ${r.ok?'enviado':'não enviado'} · ${r.found} indicadores identificados · ${r.mensagensEnviadas||0} novas mensagens${r.error?' · '+r.error:''}`).join(' | ')||result.message||'Não foi possível enviar.';
 }catch(e){status.textContent='Falha ao comunicar com a extensão: '+e.message;}
 finally{button.disabled=false;}
};
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
 if(tab?.url?.startsWith('https://creator.shopee.com.br/dashboard/live/')){
  platform='shopee';tabId=tab.id;setConnection(true,'Centro de Criação Shopee');
  $('message').textContent='As métricas visíveis são sincronizadas automaticamente com o retorno Shopee.';
  document.querySelector('[data-tab="diag"]').click();
  document.querySelector('[data-panel="diag"] strong').textContent='Métricas do Centro de Criação';
  for(const el of document.querySelectorAll('.tabButton:not([data-tab="diag"])'))el.disabled=true;
  for(const id of ['diagToggle','diagExport','diagClear'])$(id).disabled=true;
  $('diagStatus').textContent='Métricas comerciais: captura automática, sem diagnóstico de chamadas nesta aba.';
  return;
 }
 if(tab?.url?.startsWith('https://live.shopee.com.br/')){
   platform='shopee';tabId=tab.id;
   setConnection(true,'Shopee detectada');
   $('message').textContent='Preparando o diagnóstico Shopee sem recarregar a LIVE…';
   document.querySelector('[data-tab="diag"]').click();
   for(const el of document.querySelectorAll('.tabButton:not([data-tab="diag"])'))el.disabled=true;
   document.querySelector('[data-panel="diag"] strong').textContent='Diagnóstico passivo Shopee Live';
   chrome.scripting.executeScript({target:{tabId:tab.id},files:['diag-observer.js'],world:'MAIN'})
     .then(()=>chrome.scripting.executeScript({target:{tabId:tab.id},files:['diag-bridge.js'],world:'ISOLATED'}))
     .then(()=>{$('message').textContent='Observador pronto. Ative o diagnóstico e acompanhe a LIVE normalmente.';})
     .catch(()=>{$('message').textContent='Não consegui ativar nesta aba; confirme se o endereço começa por live.shopee.com.br.';});
   diagStatus();return;
 }
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
async function diagStatus(){
 const [enabledKey,diagKey]=diagKeys();
 const data=await chrome.storage.local.get([enabledKey,diagKey]);
 const enabled=data[enabledKey]===true, report=data[diagKey]||{};
 $('diagToggle').textContent=enabled?'■ Parar diagnóstico':'▶ Ativar diagnóstico';
 $('diagStatus').textContent=(enabled?'● Gravando':'○ Pausado')+' · '+(report.events?.length||0)+' registros disponíveis · '+(report.total||0)+' observados';
}
$('diagToggle').onclick=async()=>{
 const [enabledKey]=diagKeys();const data=await chrome.storage.local.get(enabledKey);
 await chrome.storage.local.set({[enabledKey]:data[enabledKey]!==true});
 await diagStatus();
};
$('diagClear').onclick=async()=>{
 if(!confirm('Apagar os registros locais de diagnóstico?'))return;
 await chrome.storage.local.remove(diagKeys()[1]);await diagStatus();
};
$('diagExport').onclick=async()=>{
 const diagKey=diagKeys()[1];const data=await chrome.storage.local.get(diagKey);
 const report=data[diagKey];
 if(!report?.events?.length){$('message').textContent='Não há chamadas registradas para exportar.';return;}
 // Sanitiza inclusive registros antigos, anteriores à correção de identificadores.
 const safeEvents=report.events.map(e=>({...e,path:platform==='shopee'?e.path.split('/').map((part,index)=>index>2&&part.length>=16?':id':part).join('/'):e.path}));
 const summary={};
 for(const e of safeEvents){
  const key=e.method+' '+e.path;
  const item=summary[key]||(summary[key]={calls:0,errors:0,averageMs:0,statuses:{}});
  item.calls++;item.averageMs+=e.ms;
  if(e.status>=400||e.status===0)item.errors++;
  item.statuses[e.status]=(item.statuses[e.status]||0)+1;
 }
 for(const item of Object.values(summary))item.averageMs=Math.round(item.averageMs/item.calls);
 const groups={};
 const classify=path=>/\/live\/detail\/core\/stats|\/live\/detail\/trend\/chart/.test(path)?'estatisticas':/governance|violation/.test(path)?'seguranca_e_avisos':/live_product\/list|recommended_product|product\/pin|\/pin\/get/.test(path)?'produtos':/\/live\/detail\/room\/status/.test(path)?'estado_live':/\/shopee\/.*\/chatroom\//.test(path)?'mensagens_shopee':/\/shopee\/.*\/(?:coin|super_rain)/.test(path)?'promocoes_shopee':'outras';
 for(const [endpoint,info] of Object.entries(summary)){
  const category=classify(endpoint);
  const item=groups[category]||(groups[category]={chamadas:0,errosHttp:0,rotas:[]});
  item.chamadas+=info.calls;item.errosHttp+=info.errors;item.rotas.push(endpoint);
 }
 const output={source:platform==='shopee'?'V2J Shopee Live - diagnóstico passivo':'V2J TikTok Shop - diagnóstico passivo',version:'0.6.5',exportedAt:new Date().toISOString(),startedAt:new Date(report.startedAt).toISOString(),updatedAt:new Date(report.updatedAt).toISOString(),totalObserved:report.total,retained:safeEvents.length,privacy:'Sem parâmetros de URL, headers, cookies, corpos, tokens ou IDs pessoais.',interpretacao:'Chamadas a rotas de estatísticas e violações NÃO significam vendas ou infrações confirmadas. Os valores não estão contidos neste diagnóstico.',grupos:groups,summary,events:safeEvents};
 const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='v2j-diagnostico-'+platform+'-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 $('message').textContent='Relatório gerado. Envie o JSON aqui para análise.';
};
diagStatus();setInterval(diagStatus,10000);
