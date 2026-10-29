const API_URL = '';
const $=id=>document.getElementById(id);
const campos=['texto','fonte','tamanho','cor','fundo','alinhamento','peso'];
const padrao={texto:'',fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',alinhamento:'center',peso:'700'};
let alterado=false,timer,versao=0;

function valores(){return{texto:$('texto').value.slice(0,10000),fonte:$('fonte').value,tamanho:Math.min(180,Math.max(16,Number($('tamanho').value)||64)),cor:$('cor').value,fundo:$('fundo').value,alinhamento:$('alinhamento').value,peso:$('peso').value};}
function pintar(v){const p=$('preview');p.textContent=v.texto||'Seu texto aparecerá aqui';p.style.fontFamily=v.fonte;p.style.fontSize=Math.min(v.tamanho*.65,80)+'px';p.style.fontWeight=v.peso;p.style.color=v.cor;p.style.background=v.fundo;p.style.textAlign=v.alinhamento;}
function preencher(v){campos.forEach(k=>{$(k).value=v[k]??padrao[k]});pintar({...padrao,...v});}
async function enviar(){try{const r=await fetch(API_URL+'/api/painel',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valores())});if(!r.ok)throw new Error('Falha '+r.status);$('status').textContent='Sincronizado ✓';$('erro').textContent='';alterado=false;}catch(e){$('status').textContent='Erro de envio';$('erro').textContent=e.message;}}
async function carregar(){try{const r=await fetch(API_URL+'/api/painel',{cache:'no-store'});if(!r.ok)throw Error();const dados=await r.json();if(!alterado&&dados.versao!==versao){versao=dados.versao;preencher({...padrao,...dados.painel});}}catch(e){$('status').textContent='Sem conexão';}}
$('publicar').onclick=enviar;
campos.forEach(k=>$(k).addEventListener('input',()=>{alterado=true;pintar(valores());if($('automatico').checked){clearTimeout(timer);timer=setTimeout(enviar,550);}}));
preencher(padrao);$('status').textContent='Console público';
carregar();setInterval(carregar,2000);
