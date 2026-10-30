import { getCache } from '@vercel/functions';

const defaultPanel = {
 texto:'', fonte:'Arial, sans-serif',tamanho:64,cor:'#ffffff',fundo:'#0e1628',
 alinhamento:'center',peso:'700',imagem:'',imagemLargura:300,imagemPosicao:'acima',
 italico:false,sublinhado:false,maiusculas:false,
 contorno:0,contornoCor:'#000000',sombra:0,sombraCor:'#000000',
 brilho:0,brilhoCor:'#00eaff',gradiente:false,cor2:'#ff4ead',
 espacamento:0,entrelinhas:1.25,rotacao:0,animacao:'none',vertical:'center'
};
const stringFields=['texto','fonte','cor','fundo','alinhamento','peso','imagem','imagemPosicao','contornoCor','sombraCor','brilhoCor','cor2','animacao','vertical'];
const numberRanges={
 tamanho:[16,180],imagemLargura:[50,1000],contorno:[0,8],sombra:[0,20],
 brilho:[0,30],espacamento:[-2,18],entrelinhas:[0.85,2.2],rotacao:[-15,15]
};
const booleanFields=['italico','sublinhado','maiusculas','gradiente'];
const hex=x=>/^#[0-9a-f]{6}$/i.test(x||'');
const fontList=new Set([
 'Arial, sans-serif','Georgia, serif','Verdana, sans-serif',"'Courier New', monospace",
 'system-ui, sans-serif',"Impact, 'Arial Black', sans-serif","'Arial Black', Arial, sans-serif",
 "'Trebuchet MS', sans-serif",'Tahoma, sans-serif',"'Segoe UI', sans-serif",
 "'Times New Roman', serif","'Comic Sans MS', cursive","'Brush Script MT', cursive",
 "'Bebas Neue', Impact, sans-serif","'Oswald', Impact, sans-serif",
 "'Montserrat', Arial, sans-serif","'Poppins', Arial, sans-serif",
 "'Anton', Impact, sans-serif","'Orbitron', Arial, sans-serif",
 "'Dancing Script', cursive","'Pacifico', cursive",
 "'Bangers', Impact, sans-serif","'Lobster', cursive","'Permanent Marker', cursive"
]);
function clean(input){
 const result={...defaultPanel};
 for(const key of stringFields){if(typeof input[key]==='string')result[key]=input[key].slice(0,key==='texto'?10000:key==='imagem'?2000:128);}
 for(const [key,[min,max]] of Object.entries(numberRanges)){
  const n=Number(input[key]);
  if(Number.isFinite(n))result[key]=Math.max(min,Math.min(max,n));
 }
 for(const key of booleanFields)result[key]=input[key]===true;
 for(const key of ['cor','fundo','contornoCor','sombraCor','brilhoCor','cor2']){
  if(!hex(result[key]))result[key]=defaultPanel[key];
 }
 if(!fontList.has(result.fonte))result.fonte=defaultPanel.fonte;
 if(!['left','center','right'].includes(result.alinhamento))result.alinhamento='center';
 if(!['400','700'].includes(result.peso))result.peso='700';
 if(!['acima','abaixo'].includes(result.imagemPosicao))result.imagemPosicao='acima';
 if(!['none','pulse','float','rainbow'].includes(result.animacao))result.animacao='none';
 if(!['top','center','bottom'].includes(result.vertical))result.vertical='center';
 if(result.imagem && !/^https:\/\//i.test(result.imagem))throw Error('URL de imagem inválida');
 return result;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const cache=getCache({namespace:'painel-ao-vivo'});
 if(req.method==='GET'){
  try{const data=await cache.get('atual');return res.status(200).json(data||{painel:defaultPanel,versao:0});}
  catch(e){console.error('cache read',e);return res.status(503).json({erro:'Leitura indisponível'});}
 }
 if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');return res.status(405).json({erro:'Método inválido'});}
 try{
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!data||typeof data.texto!=='string'||data.texto.length>10000||typeof data.tamanho!=='number'||data.tamanho<16||data.tamanho>180) return res.status(400).json({erro:'Dados inválidos'});
  const painel=clean(data);
  const estado={painel,versao:Date.now()};
  await cache.set('atual',estado,{ttl:86400,name:'Painel exibido'});
  return res.status(200).json({ok:true,versao:estado.versao});
 }catch(e){
  if(e.message==='URL de imagem inválida')return res.status(400).json({erro:e.message});
  console.error('cache write',e);return res.status(503).json({erro:'Gravação indisponível'});
 }
}
