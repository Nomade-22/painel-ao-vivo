import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import handler from '../api/shopee-afiliados.js';

function res() { return { headers:{}, statusCode:200, setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n;return this;}, json(v){this.body=v;return this;} }; }
const key='V2J_TEST_ONLY_ACCESS_KEY_CHANGE_BEFORE_DEPLOY_32';
const app='APPTEST123',secret='THIS_SECRET_IS_TEST_ONLY';
function settings(){process.env.V2J_AFFILIATE_DASHBOARD_KEY=key;process.env.SHOPEE_AFFILIATE_APP_ID=app;process.env.SHOPEE_AFFILIATE_APP_SECRET=secret;}

test('GET status does not expose credentials', async()=>{settings();const output=res();await handler({method:'GET',headers:{}},output);assert.equal(output.statusCode,200);assert.equal(output.body.configured,true);assert.ok(!JSON.stringify(output.body).includes(secret));});
test('require admin key for affiliate queries',async()=>{settings();const output=res();await handler({method:'POST',headers:{authorization:'Bearer wrong'},body:{action:'products',keyword:'sapatilha'}},output);assert.equal(output.statusCode,401);});
test('Shopee signature is SHA256(AppID+timestamp+exact JSON+secret)',async()=>{settings();const original=global.fetch;let inspected=false;
 global.fetch=async(url,options)=>{
  assert.equal(url,'https://open-api.affiliate.shopee.com.br/graphql');
  assert.equal(options.method,'POST');
  const auth=options.headers.Authorization;
  const match=/^SHA256 Credential=([^,]+), Timestamp=(\d+), Signature=([a-f0-9]{64})$/.exec(auth);
  assert.ok(match); assert.equal(match[1],app);
  const expected=createHash('sha256').update(app+match[2]+options.body+secret).digest('hex');assert.equal(expected,match[3]);
  assert.ok(JSON.parse(options.body).query.includes('productOfferV2'));
  inspected=true;
  return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({data:{productOfferV2:{nodes:[{itemId:'10',productName:'Sapatilha',offerLink:'https://s.shopee.com.br/test',imageUrl:'https://down-br.img.susercontent.com/file/x',priceMin:'29.90',commissionRate:'0.1'}],pageInfo:{page:1,hasNextPage:false}}}})};
 };
 try{const output=res();await handler({method:'POST',headers:{authorization:'Bearer '+key},body:{action:'products',keyword:'sapatilha'}},output);assert.equal(output.statusCode,200);assert.equal(output.body.products[0].name,'Sapatilha');assert.ok(inspected);}finally{global.fetch=original;}
});
test('reject unsafe shortlink domain before network',async()=>{settings();const output=res();await handler({method:'POST',headers:{authorization:'Bearer '+key},body:{action:'shortlink',url:'https://evil.example.com/'}},output);assert.equal(output.statusCode,400);});
test('never accept arbitrary GraphQL queries',async()=>{settings();const output=res();await handler({method:'POST',headers:{authorization:'Bearer '+key},body:{action:'executeGraphQL',query:'{__schema{types{name}}}'}},output);assert.equal(output.statusCode,400);});
