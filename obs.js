const visor=document.getElementById('conteudo'),texto=document.getElementById('texto'),imagem=document.getElementById('imagem');
let versao=-1;
async function atualizar(){
 try{
  const r=await fetch('/api/painel',{cache:'no-store'});
  if(!r.ok)throw Error('Falha '+r.status);
  const d=await r.json();
  if(d.versao===versao)return;
  versao=d.versao;
  const v=d.painel||{};
  texto.textContent=v.texto||'';const u=v.imagem||'';if(/^https:\/\//i.test(u)){if(imagem.src!==u)imagem.src=u;imagem.style.display='block';imagem.style.width=Math.max(50,Math.min(1000,Number(v.imagemLargura)||300))+'px';visor.style.display='flex';visor.style.flexDirection=v.imagemPosicao==='abaixo'?'column-reverse':'column';visor.style.alignItems='center';}else{imagem.removeAttribute('src');imagem.style.display='none';}
  visor.style.fontFamily=['Arial, sans-serif','Georgia, serif','Verdana, sans-serif',"'Courier New', monospace",'system-ui, sans-serif'].includes(v.fonte)?v.fonte:'Arial, sans-serif';
  visor.style.fontSize=Math.min(180,Math.max(16,Number(v.tamanho)||64))+'px';
  visor.style.fontWeight=['400','700'].includes(v.peso)?v.peso:'700';
  visor.style.color=/^#[0-9a-f]{6}$/i.test(v.cor)?v.cor:'#ffffff';
  visor.style.textAlign=['left','center','right'].includes(v.alinhamento)?v.alinhamento:'center';
 }catch(e){console.warn('Painel indisponível',e)}
}
atualizar();setInterval(atualizar,1200);
