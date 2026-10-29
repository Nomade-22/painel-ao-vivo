const headers={'Access-Control-Allow-Origin':'https://nomade-22.github.io','Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Content-Type':'application/json','Cache-Control':'no-store'};
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers});
export default {async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(new URL(request.url).pathname!=='/api/painel')return respond({erro:'Rota não encontrada'},404);
  try{
    if(request.method==='GET'){const row=await env.DB.prepare('SELECT json, versao FROM painel WHERE id = 1').first();return respond({painel:row?JSON.parse(row.json):{},versao:row?.versao||0});}
    if(request.method==='PUT'){
      if(!env.ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return respond({erro:'Não autorizado'},401);
      const length=Number(request.headers.get('content-length')||0);if(length>15000)return respond({erro:'Texto grande demais'},413);
      const d=await request.json();if(typeof d.texto!=='string'||d.texto.length>10000||!Number.isFinite(d.tamanho)||d.tamanho<16||d.tamanho>180)return respond({erro:'Dados inválidos'},400);
      const keys=['texto','fonte','tamanho','cor','fundo','alinhamento','peso'];const saved=Object.fromEntries(keys.map(k=>[k,d[k]]));const version=Date.now();
      await env.DB.prepare('INSERT INTO painel (id,json,versao) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,versao=excluded.versao').bind(JSON.stringify(saved),version).run();
      return respond({ok:true,versao:version});
    }
    return respond({erro:'Método inválido'},405);
  }catch(e){return respond({erro:'Falha no servidor'},500);}
}};
