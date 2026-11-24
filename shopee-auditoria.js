/* V2J 0.8.27 — conciliação local, sem envio do arquivo ou dados do Excel. */
(()=>{
 const by=id=>document.getElementById(id), KEY='v2jShopeeHistorico027';
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:2}):'—';
 const money=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
 const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const number=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;const s=String(v??'').replace(/R\$\s*|\s/g,'');if(!s)return null;const t=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;return /^-?\d+(?:\.\d+)?$/.test(t)?Number(t):null;};
 const integer=v=>typeof v==='string'&&/^\d{1,3}(?:\.\d{3})+$/.test(v)?Number(v.replace(/\./g,'')):number(v);
 const duration=v=>{if(typeof v==='number')return Math.round(v*86400);const m=String(v??'').match(/^(\d+):(\d{2}):(\d{2})$/);return m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):null;};
 const date=v=>{if(typeof v==='number')return Date.UTC(1899,11,30)+v*86400000+10800000;const m=String(v||'').match(/^(\d{2})[-/](\d{2})[-/](\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/);return m?Date.parse(m[3]+'-'+m[2]+'-'+m[1]+'T'+m[4]+':'+m[5]+':'+(m[6]||'00')+'-03:00'):NaN;};
 const time=v=>Number.isFinite(v)&&v>0?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
 let rows=[],lastSaved=0;
 const decoder=new TextDecoder();
 async function readZip(file){
  if(file.size>20*1024*1024)throw Error('O arquivo excede 20 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()), view=new DataView(bytes.buffer);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}
  if(end<0)throw Error('O arquivo não é um Excel XLSX válido.');
  const total=view.getUint16(end+10,true);let p=view.getUint32(end+16,true);const out=new Map();
  if(total>2000)throw Error('Arquivo com entradas demais.');
  for(let i=0;i<total;i++){
   if(p+46>bytes.length||view.getUint32(p,true)!==0x02014b50)throw Error('Diretório XLSX inválido.');
   const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true),size=view.getUint32(p+20,true),raw=view.getUint32(p+24,true),nl=view.getUint16(p+28,true),xl=view.getUint16(p+30,true),cl=view.getUint16(p+32,true),off=view.getUint32(p+42,true);
   const name=decoder.decode(bytes.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
   if(!/^xl\/(?:sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(name))continue;
   if(flags&1||raw>10*1024*1024||off+30>bytes.length||view.getUint32(off,true)!==0x04034b50)throw Error('Planilha protegida ou grande demais.');
   const start=off+30+view.getUint16(off+26,true)+view.getUint16(off+28,true);
   if(start+size>bytes.length)throw Error('Dados XLSX incompletos.');
   const blob=new Blob([bytes.subarray(start,start+size)]);
   let result;
   if(method===0)result=await blob.arrayBuffer();
   else if(method===8){
    const reader=blob.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const chunks=[];let count=0;
    while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>10*1024*1024){await reader.cancel();throw Error('Planilha descompactada muito grande.');}chunks.push(value);}
    result=await new Blob(chunks).arrayBuffer();
   }else throw Error('Compressão XLSX não suportada.');
   if(result.byteLength!==raw)throw Error('Tamanho XLSX inconsistente.');
   out.set(name,decoder.decode(result));
  }
  return out;
 }
 function xml(s){const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('XML inválido no Excel.');return d;}
 function cells(doc,shared){
  return [...doc.getElementsByTagNameNS('*','row')].slice(0,10001).map(row=>{
   const a=[];for(const c of row.getElementsByTagNameNS('*','c')){
    const col=String(c.getAttribute('r')||'').match(/^[A-Z]+/)?.[0];if(!col)continue;
    let index=0;for(const ch of col)index=index*26+ch.charCodeAt(0)-64;index--;if(index>250)continue;
    const t=c.getAttribute('t'),v=c.getElementsByTagNameNS('*','v')[0]?.textContent??'';
    a[index]=t==='inlineStr'?[...c.getElementsByTagNameNS('*','t')].map(x=>x.textContent).join(''):t==='s'?(shared[Number(v)]??''):!t&&v!==''&&Number.isFinite(Number(v))?Number(v):v;
   }return a;
  });
 }
 async function load(file){
  const parts=await readZip(file);const shared=parts.has('xl/sharedStrings.xml')?[...xml(parts.get('xl/sharedStrings.xml')).getElementsByTagNameNS('*','si')].map(x=>[...x.getElementsByTagNameNS('*','t')].map(y=>y.textContent).join('')):[];
  const keys=['nomedalive','horadeinicio','duracao','totaldecomentarios','atc','duracaomediadavisualizacao','totaldevisualizacoes','pedidospedidofeito','pedidospedidoconfirmado','vendaspedidofeito','vendaspedidoconfirmado'];
  for(const [name,data] of parts){
   if(!/worksheets/.test(name))continue;
   const table=cells(xml(data),shared);const h=table.findIndex(r=>keys.every(k=>r.map(normalize).includes(k)));
   if(h<0)continue;
   const header=table[h].map(normalize);
   return table.slice(h+1).filter(r=>r[header.indexOf('horadeinicio')]!=null&&r[header.indexOf('horadeinicio')]!=='').map(r=>Object.fromEntries(keys.map(k=>[k,r[header.indexOf(k)]]))).slice(0,1000);
  }
  throw Error('Não encontrei as colunas do relatório oficial de LIVE da Shopee.');
 }
 function readHistory(){try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x&&x.ref);}catch{return [];}}
 function store(manual=false){
  if(typeof snapshot==='undefined'||!snapshot?.sessao?.referencia)return false;
  const s=snapshot,ref=s.sessao.referencia;
  const old=readHistory(),entry={ref,inicio:s.sessao.inicioOficial||s.sessao.iniciadaEm,fim:s.sessao.fimOficial||null,oficial:!!s.sessao.inicioOficial,salvo:Date.now(),metricas:s.metricas||{},produtos:(s.produtosCreator||[]).map(p=>({nome:p.nome,cliques:p.cliques,atc:p.atc,pedidos:p.pedidos,vendasBrutoApi:p.vendasBrutoApi})),seguranca:(s.alertaCreator?.records||[]).map(x=>({titulo:x.titulo,gravidade:x.gravidade,horario:x.horario}))};
  try{localStorage.setItem(KEY,JSON.stringify([entry,...old.filter(x=>x.ref!==ref)].slice(0,40)));lastSaved=Date.now();drawHistory();return true;}catch{if(manual)by('reconcile').textContent='Não foi possível gravar o histórico no navegador.';return false;}
 }
 function drawHistory(){
  const h=readHistory();by('localHistory').innerHTML=h.length?'<table><thead><tr><th>LIVE</th><th>Início</th><th>GMV realizado</th><th>Pedidos</th><th>Segurança</th></tr></thead><tbody>'+h.map(x=>'<tr><td>'+esc(x.ref)+'</td><td>'+esc(time(x.inicio))+(x.oficial?'':' (registro)')+'</td><td>'+esc(x.metricas.vendas??'—')+'</td><td>'+esc(x.metricas.pedidos??'—')+'</td><td>'+esc(x.seguranca.length)+' registros</td></tr>').join('')+'</tbody></table>':'Nenhum relatório salvo neste navegador.';
 }
 function compare(){
  const row=rows[Number(by('officialRow').value)];if(!row)return;
  const current=typeof snapshot==='undefined'?null:snapshot;
  if(!current){by('reconcile').textContent='Aguardando os dados do V2J.';return;}
  const started=date(row.horadeinicio),official=current.sessao?.inicioOficial;
  const history=readHistory().filter(x=>x.oficial&&Number.isFinite(started)&&Math.abs(x.inicio-started)<=120000);
  const match=official&&Number.isFinite(started)&&Math.abs(official-started)<=120000;
  const candidate=match?{metricas:current.metricas}:history.length===1?history[0]:null;
  const m=candidate?.metricas||{};
  const fields=[
   ['Vendas realizadas',number(row.vendaspedidofeito),number(m.gmvBrutoApi),money],
   ['Vendas confirmadas',number(row.vendaspedidoconfirmado),number(m.gmvConfirmadoBrutoApi),money],
   ['Pedidos feitos',integer(row.pedidospedidofeito),integer(m.pedidos),fmt],
   ['Pedidos confirmados',integer(row.pedidospedidoconfirmado),integer(m.pedidosConfirmados),fmt],
   ['Carrinhos',integer(row.atc),integer(m.atc),fmt],
   ['Comentários',integer(row.totaldecomentarios),integer(m.comentarios),fmt],
   ['Tempo médio (s)',duration(row.duracaomediadavisualizacao),typeof m.tempoMedioBrutoApi==='number'?Math.round(m.tempoMedioBrutoApi/1000):duration(m.tempoMedio),fmt],
   ['Visualizações (Excel) × views (API)',integer(row.totaldevisualizacoes),integer(m.visualizacoes),fmt],
   ['Visualizações (Excel) × viewers (API)',integer(row.totaldevisualizacoes),integer(m.totalEspectadores),fmt]
  ];
  by('reconcile').innerHTML='<p class="muted">'+(candidate?'LIVE associada pelo horário oficial (tolerância de 2 minutos). Diferenças de views/viewers podem refletir conceitos distintos.':'Sem correspondência segura com a sessão atual ou histórico. Valores oficiais exibidos sem comparação.')+'</p><table><thead><tr><th>Indicador</th><th>Excel</th><th>V2J</th><th>Diferença V2J − Excel</th></tr></thead><tbody>'+fields.map(([label,a,b,f])=>'<tr><td>'+esc(label)+'</td><td>'+esc(f(a))+'</td><td>'+esc(f(b))+'</td><td>'+esc(a!==null&&b!==null?f(Math.round((b-a)*100)/100):'—')+'</td></tr>').join('')+'</tbody></table>';
 }
 by('officialExcel').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;by('reconcile').textContent='Lendo arquivo local…';rows=[];by('officialRow').disabled=true;try{rows=await load(f);const select=by('officialRow');select.replaceChildren(...rows.map((r,i)=>new Option(String(r.nomedalive||'LIVE')+' · '+time(date(r.horadeinicio)),String(i))));select.disabled=!rows.length;if(!rows.length)by('reconcile').textContent='Não há transmissões no arquivo.';else compare();}catch(err){by('reconcile').textContent=err.message||'Não foi possível interpretar o arquivo.';}};
 by('officialRow').onchange=compare;
 by('saveHistory').onclick=()=>{if(store(true)){by('saveHistory').textContent='Relatório guardado';setTimeout(()=>by('saveHistory').textContent='Guardar relatório atual',2500);compare();}};
 by('downloadHistory').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(readHistory(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='v2j-historico-shopee.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 drawHistory();setInterval(()=>{if(typeof snapshot!=='undefined'&&snapshot?.sessao?.referencia&&Date.now()-lastSaved>30000){store();if(rows.length)compare();}},5000);
})();