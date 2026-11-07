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
 $('productLink').value=data.produto?.link||'';
 $('productPrice').value=data.produto?.preco||'';
 $('productDesc').value=data.produto?.descricao||'';
 $('productImages').value=(data.produto?.imagens||[]).join('\n');
 $('notice').value=data.recado||'';renderChat();renderBag();
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
 save({produto:{nome:$('productName').value,preco:$('productPrice').value,descricao:$('productDesc').value,imagens:images,link:$('productLink').value.trim()}},'Produto publicado.');
});
$('clearProduct').addEventListener('click',()=>{if(confirm('Remover o produto do retorno?'))save({produto:{nome:'',preco:'',descricao:'',imagens:[],link:''}},'Produto removido.');});
load();

function bagItem(num){return (data.catalogo||[]).find(p=>p.numero===Number(num));}
function fillBag(){
 const num=Number($('bagNumber').value),p=bagItem(num)||{};
 $('bagName').value=p.nome||'';$('bagPrice').value=p.preco||'';
 $('bagImage').value=p.imagem||'';$('bagLink').value=p.link||'';$('bagDesc').value=p.descricao||'';
}
function renderBag(){
 const box=$('bagList');box.replaceChildren();
 const cat=[...(data.catalogo||[])].sort((a,b)=>a.numero-b.numero);
 $('bagSelected').textContent=data.itemAtivo?'No retorno: item '+data.itemAtivo+(bagItem(data.itemAtivo)?' — '+bagItem(data.itemAtivo).nome:' (sem cadastro)'):'Nenhum item em destaque.';
 for(const p of cat){
  const row=document.createElement('div');row.className='item';
  const name=document.createElement('div');name.textContent='#'+p.numero+' · '+p.nome+(p.origem==='tiktok'?' · TikTok':'');
  const btn=document.createElement('button');btn.className='secondary';btn.textContent='Editar';
  btn.onclick=()=>{$('bagNumber').value=p.numero;fillBag();$('bagNumber').scrollIntoView({behavior:'smooth',block:'center'});};
  row.append(name,btn);box.append(row);
 }
 if(!$('bagNumber').value&&data.itemAtivo){$('bagNumber').value=data.itemAtivo;fillBag();}
}
$('bagNumber').addEventListener('change',fillBag);
$('bagSelect').onclick=()=>{
 const num=Number($('bagNumber').value);
 if(!Number.isInteger(num)||num<1||num>999){status('Informe um número de item entre 1 e 999.');return;}
 if(!bagItem(num)){status('Item ainda não cadastrado. Preencha os campos e clique em Salvar / corrigir item.');return;}
 save({itemAtivo:num},'Item '+num+' enviado ao retorno.');
};
$('bagSave').onclick=()=>{
 const num=Number($('bagNumber').value),nome=$('bagName').value.trim(),imagem=$('bagImage').value.trim();
 if(!Number.isInteger(num)||num<1||num>999||!nome){status('Informe um número válido e o nome do item.');return;}
 if(imagem&&!/^https:\/\//i.test(imagem)){status('A foto precisa ser um endereço HTTPS.');return;}
 const product={numero:num,nome,preco:$('bagPrice').value,descricao:$('bagDesc').value,imagem,link:$('bagLink').value.trim(),origem:'manual'};
 const catalogo=[...(data.catalogo||[]).filter(p=>p.numero!==num),product].sort((a,b)=>a.numero-b.numero);
 if(catalogo.length>200){status('Limite de 200 itens.');return;}
 save({catalogo,itemAtivo:num},'Item '+num+' salvo e destacado.');
};
$('bagRemove').onclick=()=>{
 const num=Number($('bagNumber').value);if(!bagItem(num))return;
 if(confirm('Remover item '+num+' do catálogo?'))save({catalogo:data.catalogo.filter(p=>p.numero!==num),itemAtivo:data.itemAtivo===num?0:data.itemAtivo},'Item removido.');
};
function moveItem(delta){
 const cat=(data.catalogo||[]).slice().sort((a,b)=>a.numero-b.numero);
 if(!cat.length)return;
 const idx=cat.findIndex(p=>p.numero===Number(data.itemAtivo));
 const next=cat[Math.max(0,Math.min(cat.length-1,(idx<0?0:idx)+delta))];
 $('bagNumber').value=next.numero;fillBag();save({itemAtivo:next.numero},'Item '+next.numero+' no retorno.');
}
$('bagPrev').onclick=()=>moveItem(-1);
$('bagNext').onclick=()=>moveItem(1);
