const $=id=>document.getElementById(id);
let data={produto:{nome:'',descricao:'',preco:'',imagens:[]},recado:'',chat:[],versao:0};
let busy=false;
const status=m=>{$('status').textContent=m;};
function renderChat(){
 const box=$('chatList');box.replaceChildren();
 for(const item of [...data.chat].reverse()){
  const row=document.createElement('div');row.className='item';
  const body=document.createElement('div'),strong=document.createElement('strong'),msg=document.createElement('span'),button=document.createElement('button');
  strong.textContent=(item.autor||'Espectador')+' · '+(item.hora||'');
  msg.textContent=' — '+item.texto;
  body.append(strong,msg);button.textContent='Excluir';button.className='danger';
  button.addEventListener('click',()=>save({chat:data.chat.filter(m=>m.id!==item.id)},'Comentário removido'));
  row.append(body,button);box.append(row);
 }
}
function show(state){
 data=state;$('productName').value=data.produto?.nome||'';
 $('productPrice').value=data.produto?.preco||'';
 $('productDesc').value=data.produto?.descricao||'';
 $('productImages').value=(data.produto?.imagens||[]).join('\n');
 $('notice').value=data.recado||'';renderChat();
}
async function load(){
 try{const r=await fetch('/api/retorno?central=1',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);show(await r.json());status('✅ Central conectada.');}
 catch(e){status('Falha ao carregar: '+e.message);}
}
async function save(patch,success){
 if(busy)return;busy=true;status('Publicando no retorno…');
 try{
  const payload={...data,...patch};
  const r=await fetch('/api/retorno?central=1',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const response=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(response.erro||'HTTP '+r.status);
  show({...payload,versao:response.versao});status('✅ '+success);
 }catch(e){status('Erro ao publicar: '+e.message);}
 finally{busy=false;}
}
$('addChat').addEventListener('click',()=>{
 const text=$('chatText').value.trim(),author=$('chatAuthor').value.trim()||'Espectador';
 if(!text){status('Escreva a mensagem antes de enviar.');return;}
 const now=new Date(),msg={id:String(now.getTime())+'-'+Math.random().toString(36).slice(2),autor:author,texto:text.slice(0,400),hora:now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
 save({chat:[...data.chat,msg].slice(-40)},'Comentário enviado.').then(()=>{$('chatText').value='';});
});
$('clearChat').addEventListener('click',()=>{if(confirm('Apagar todo o chat manual do retorno?'))save({chat:[]},'Chat limpo.');});
$('saveNotice').addEventListener('click',()=>save({recado:$('notice').value},'Recado atualizado.'));
$('clearNotice').addEventListener('click',()=>save({recado:''},'Recado removido.'));
$('saveProduct').addEventListener('click',()=>{
 const images=$('productImages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(images.length>6||images.some(url=>!/^https:\/\//i.test(url))){status('Use até 6 links HTTPS válidos, um por linha.');return;}
 save({produto:{nome:$('productName').value,preco:$('productPrice').value,descricao:$('productDesc').value,imagens:images}},'Produto publicado.');
});
$('clearProduct').addEventListener('click',()=>{if(confirm('Remover o produto do retorno?'))save({produto:{nome:'',preco:'',descricao:'',imagens:[]}},'Produto removido.');});
load();
