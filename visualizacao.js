import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
const visor=document.getElementById('conteudo'),estado=document.getElementById('estado');
if(Object.values(firebaseConfig).some(v=>!v||v.startsWith('COLE_'))){estado.textContent='Configuração pendente';}
else{
const app=initializeApp(firebaseConfig),db=getDatabase(app);
onValue(ref(db,'painel/atual'),s=>{const v=s.val()||{};visor.textContent=v.texto||'Aguardando texto…';visor.style.fontFamily=['Arial, sans-serif','Georgia, serif','Verdana, sans-serif',"'Courier New', monospace",'system-ui, sans-serif'].includes(v.fonte)?v.fonte:'Arial, sans-serif';visor.style.fontSize=Math.min(180,Math.max(16,Number(v.tamanho)||64))+'px';visor.style.fontWeight=['400','700'].includes(v.peso)?v.peso:'700';visor.style.color=/^#[0-9a-f]{6}$/i.test(v.cor)?v.cor:'#ffffff';document.body.style.background=/^#[0-9a-f]{6}$/i.test(v.fundo)?v.fundo:'#0e1628';visor.style.textAlign=['left','center','right'].includes(v.alinhamento)?v.alinhamento:'center';estado.textContent='Ao vivo';},()=>{estado.textContent='Falha de conexão';});
}
