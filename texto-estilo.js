// Estilos compartilhados entre o editor e a fonte transparente do OBS.
export const FONTES = [
  "Arial, sans-serif",
  "Georgia, serif",
  "Verdana, sans-serif",
  "'Courier New', monospace",
  "system-ui, sans-serif",
  "Impact, 'Arial Black', sans-serif",
  "'Arial Black', Arial, sans-serif",
  "'Trebuchet MS', sans-serif",
  "Tahoma, sans-serif",
  "'Segoe UI', sans-serif",
  "'Times New Roman', serif",
  "'Comic Sans MS', cursive",
  "'Brush Script MT', cursive",
  "'Bebas Neue', Impact, sans-serif",
  "'Oswald', Impact, sans-serif",
  "'Montserrat', Arial, sans-serif",
  "'Poppins', Arial, sans-serif",
  "'Anton', Impact, sans-serif",
  "'Orbitron', Arial, sans-serif",
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Bangers', Impact, sans-serif",
  "'Lobster', cursive",
  "'Permanent Marker', cursive"
];
const GOOGLE_FONTS = {
  "'Bebas Neue', Impact, sans-serif": "Bebas+Neue",
  "'Oswald', Impact, sans-serif": "Oswald:wght@400;700",
  "'Montserrat', Arial, sans-serif": "Montserrat:wght@400;700",
  "'Poppins', Arial, sans-serif": "Poppins:wght@400;700",
  "'Anton', Impact, sans-serif": "Anton",
  "'Orbitron', Arial, sans-serif": "Orbitron:wght@400;700",
  "'Dancing Script', cursive": "Dancing+Script:wght@400;700",
  "'Pacifico', cursive": "Pacifico",
  "'Bangers', Impact, sans-serif": "Bangers",
  "'Lobster', cursive": "Lobster",
  "'Permanent Marker', cursive": "Permanent+Marker"
};
const fontesCarregadas = new Set();
export const ESTILO_PADRAO = Object.freeze({
  italico:false,sublinhado:false,maiusculas:false,
  contorno:0,contornoCor:'#000000',
  sombra:0,sombraCor:'#000000',
  brilho:0,brilhoCor:'#00eaff',
  gradiente:false,cor2:'#ff4ead',
  espacamento:0,entrelinhas:1.25,rotacao:0,
  animacao:'none',vertical:'center'
});
export function carregarFonte(fonte){
  if(!GOOGLE_FONTS[fonte] || fontesCarregadas.has(fonte))return;
  fontesCarregadas.add(fonte);
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family='+GOOGLE_FONTS[fonte]+'&display=swap';
  link.onerror=()=>fontesCarregadas.delete(fonte);
  document.head.appendChild(link);
}
function num(value,lo,hi,def){
 const parsed=Number(value);
 return Number.isFinite(parsed)?Math.min(hi,Math.max(lo,parsed)):def;
}
function cor(value,def){return /^#[0-9a-f]{6}$/i.test(value||'')?value:def;}
export function aplicarEstiloTexto(el, dados, escala=1){
  const v={...ESTILO_PADRAO,...dados};
  const fonte=FONTES.includes(v.fonte)?v.fonte:FONTES[0];
  carregarFonte(fonte);
  const principal=cor(v.cor,'#ffffff');
  const contorno=num(v.contorno,0,8,0)*escala;
  const sombra=num(v.sombra,0,20,0)*escala;
  const brilho=num(v.brilho,0,30,0)*escala;
  const sombras=[];
  if(sombra>0)sombras.push(`${sombra}px ${sombra}px ${Math.max(1,sombra*.75)}px ${cor(v.sombraCor,'#000000')}`);
  if(brilho>0){
    const corLuz=cor(v.brilhoCor,'#00eaff');
    sombras.push(`0 0 ${Math.max(2,brilho*.65)}px ${corLuz}`);
    sombras.push(`0 0 ${Math.max(3,brilho*1.9)}px ${corLuz}`);
  }
  el.style.fontFamily=fonte;
  el.style.fontSize=num(v.tamanho,16,180,64)*escala+'px';
  el.style.fontWeight=['400','700'].includes(String(v.peso))?String(v.peso):'700';
  el.style.fontStyle=v.italico?'italic':'normal';
  el.style.textDecoration=v.sublinhado?'underline':'none';
  el.style.textTransform=v.maiusculas?'uppercase':'none';
  el.style.letterSpacing=num(v.espacamento,-2,18,0)*escala+'px';
  el.style.lineHeight=String(num(v.entrelinhas,.85,2.2,1.25));
  el.style.color=principal;
  el.style.textAlign=['left','center','right'].includes(v.alinhamento)?v.alinhamento:'center';
  el.style.webkitTextStroke=contorno>0?`${contorno}px ${cor(v.contornoCor,'#000000')}`:'0px transparent';
  el.style.textShadow=sombras.join(', ')||'none';
  const gradient=Boolean(v.gradiente);
  el.style.backgroundImage=gradient?`linear-gradient(105deg,${principal},${cor(v.cor2,'#ff4ead')})`:'none';
  el.style.backgroundClip=gradient?'text':'border-box';
  el.style.webkitBackgroundClip=gradient?'text':'border-box';
  el.style.webkitTextFillColor=gradient?'transparent':principal;
  el.style.transform=`rotate(${num(v.rotacao,-15,15,0)}deg)`;
  const anim=['pulse','float','rainbow'].includes(v.animacao)?v.animacao:'none';
  el.className='texto-dinamico' + (anim==='none'?'':' texto-anim-'+anim);
}
