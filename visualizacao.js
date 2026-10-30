const visor=document.getElementById('conteudo');
let versao=-1;
async function atualizar(){
 try{
  const r=await fetch('/api/painel',{cache:'no-store'});
  if(!r.ok)throw Error('Painel indisponível: HTTP '+r.status);
  const d=await r.json();
  if(d.versao===versao)return;
  versao=d.versao;
  const v=d.painel||{};
  // A página usada pelo OBS não recebe cor de fundo nem mensagens de status.
  visor.textContent=v.texto||'';
  visor.style.fontFamily=['Arial, sans-serif','Georgia, serif','Verdana, sans-serif',"'Courier New', monospace",'system-ui, sans-serif'].includes(v.fonte)?v.fonte:'Arial, sans-serif';
  visor.style.fontSize=Math.min(180,Math.max(16,Number(v.tamanho)||64))+'px';
  visor.style.fontWeight=['400','700'].includes(v.peso)?v.peso:'700';
  visor.style.color=/^#[0-9a-f]{6}$/i.test(v.cor)?v.cor:'#ffffff';
  visor.style.textAlign=['left','center','right'].includes(v.alinhamento)?v.alinhamento:'center';
 }catch(e){console.warn('Falha ao atualizar o texto no OBS:',e);}
}
atualizar();
setInterval(atualizar,1200);
