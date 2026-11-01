import test from 'node:test';
import assert from 'node:assert/strict';
import cartas from '../api/cartas.js';
import animacoes from '../api/animacoes.js';

async function request(handler,method,body){
 let statusCode=200,response;
 const res={
  setHeader(){},
  status(code){statusCode=code;return this;},
  json(data){response=data;return this;}
 };
 await handler({method,body},res);
 return {statusCode,body:response};
}

test('biblioteca de imagens permite salvar, exibir e configurar transições',async()=>{
 const initial=await request(cartas,'GET');
 assert.equal(initial.statusCode,200);
 assert.ok(Array.isArray(initial.body.library));

 const image={url:'https://example.com/carta.png',name:'Carta de oferta'};
 const saved=await request(cartas,'PUT',{library:[image,image],url:image.url,show:true,transition:'slide',duration:950,size:65,position:'bottom'});
 assert.equal(saved.statusCode,200);
 assert.deepEqual(saved.body.library,[image]);
 assert.equal(saved.body.url,image.url);
 assert.equal(saved.body.show,true);
 assert.equal(saved.body.transition,'slide');
 assert.equal(saved.body.duration,950);
 assert.equal(saved.body.position,'bottom');
 assert.equal(saved.body.size,65);

 const reread=await request(cartas,'GET');
 assert.equal(reread.body.command,saved.body.command);
 const hidden=await request(cartas,'PUT',{show:false});
 assert.equal(hidden.body.show,false);
 assert.deepEqual(hidden.body.library,[image]);
 assert.ok(hidden.body.command>saved.body.command);
});

test('imagens rejeitam URLs inseguras e biblioteca inválida',async()=>{
 assert.equal((await request(cartas,'PUT',{url:'javascript:alert(1)'})).statusCode,400);
 assert.equal((await request(cartas,'PUT',{library:'não é uma lista'})).statusCode,400);
 const saved=await request(cartas,'PUT',{library:[{url:'http://site.com/a.png',name:'Insegura'},{url:'https://example.com/boa.png',name:'Boa'}]});
 assert.deepEqual(saved.body.library,[{url:'https://example.com/boa.png',name:'Boa'}]);
});

test('ações personalizadas são salvas, disparadas e interrompidas',async()=>{
 const initial=await request(animacoes,'GET');
 assert.equal(initial.statusCode,200);
 assert.ok(initial.body.actions.length>=6);

 const action={id:'minha-acao',name:'Celebrar pedido',effect:'hearts',emoji:'❤️',message:'Obrigado!',color:'#ff4455',duration:4000};
 const saved=await request(animacoes,'PUT',{actions:[action]});
 assert.deepEqual(saved.body.actions,[action]);
 const activated=await request(animacoes,'PUT',{triggerId:action.id});
 assert.equal(activated.body.lastEvent.id,action.id);
 assert.ok(activated.body.command>saved.body.command);
 const stopped=await request(animacoes,'PUT',{stop:true});
 assert.equal(stopped.body.lastEvent,null);
 assert.ok(stopped.body.command>activated.body.command);
 assert.deepEqual((await request(animacoes,'GET')).body.actions,[action]);
});

test('ações inexistentes não podem ser disparadas',async()=>{
 const result=await request(animacoes,'PUT',{triggerId:'nao-existe'});
 assert.equal(result.statusCode,400);
 assert.match(result.body.erro,/não encontrada/i);
});
