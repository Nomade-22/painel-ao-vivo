import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getDatabase,ref,onValue,set} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
const $=id=>document.getElementById(id);
const campos=['texto','fonte','tamanho','cor','fundo','alinhamento','peso'];
const padrao={texto:'',fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',alinhamento:'center',peso:'700'};
let ultimo=padrao,alterado=false,timer;
function valores(){return{texto:$('texto').value.slice(0,10000),fonte:$('fonte').value,tamanho:Math.min(180,Math.max(16,Number($('tamanho').value)||64)),cor:$('cor').value,fundo:$('fundo').value,alinhamento:$('alinhamento').value,peso:$('peso').value};}
function pintar(v){const p=$('preview');p.textContent=v.texto||'Seu texto aparecerá aqui';p.style.fontFamily=v.fonte;p.style.fontSize=Math.min(v.tamanho*.65,80)+'px';p.style.fontWeight=v.peso;p.style.color=v.cor;p.style.background=v.fundo;p.style.textAlign=v.alinhamento;}
function preencher(v){campos.forEach(k=>{$(k).value=v[k]??padrao[k]});pintar({...padrao,...v});}
const configurado=!Object.values(firebaseConfig).some(v=>!v||v.startsWith('COLE_'));
if(!configurado){$('status').textContent='Firebase não configurado';$('erro').textContent='Preencha firebase-config.js antes de publicar.';preencher(padrao);}
else{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app),destino=ref(db,'painel/atual');
 async function enviar(){try{await set(destino,valores());$('status').textContent='Sincronizado ✓';$('erro').textContent='';alterado=false;}catch(e){$('status').textContent='Erro de envio';$('erro').textContent='Não foi possível salvar. Verifique o login e as regras do banco.';}}
 onAuthStateChanged(auth,u=>{$('login').hidden=!!u;$('editor').hidden=!u;$('status').textContent=u?'Conectado':'Aguardando login';});
 $('entrar').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('email').value,$('senha').value);$('erro').textContent='';}catch(e){$('erro').textContent='Login não autorizado. Confira e-mail e senha.';}};
 $('sair').onclick=()=>signOut(auth);
 $('publicar').onclick=enviar;
 campos.forEach(k=>$(k).addEventListener('input',()=>{alterado=true;pintar(valores());if($('automatico').checked){clearTimeout(timer);timer=setTimeout(enviar,450);}}));
 onValue(destino,s=>{if(!alterado){ultimo={...padrao,...s.val()};preencher(ultimo);}},()=>{$('erro').textContent='Não foi possível ler o painel.'});
}
