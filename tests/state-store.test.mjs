import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeStore,usesDatabase} from '../lib/state-store.js';
function fake(){
 let row=null;
 const query=async(q,p)=>{
  if(q.startsWith('SELECT'))return row?[{...row}]:[];
  if(q.startsWith('INSERT')){if(row)return [];row={value:JSON.parse(p[2]),revision:'1',expired:false};return [{revision:'1'}]}
  if(q.startsWith('UPDATE')){if(!row||row.revision!==p[4])return [];row={value:JSON.parse(p[2]),revision:String(Number(row.revision)+1),expired:false};return [{revision:row.revision}]}
  throw Error('unexpected SQL');
 };
 return {query};
}
test('migration preserves data, and stale writer cannot overwrite newer state',async()=>{
 const {query}=fake();const legacy=()=>({get:async()=>({video:'old'})});
 const a=makeStore('test',query,legacy),b=makeStore('test',query,legacy);
 assert.deepEqual(await a.get('x'),{video:'old'});
 assert.deepEqual(await b.get('x'),{video:'old'});
 await a.set('x',{video:'new'});
 await assert.rejects(b.set('x',{video:'stale'}),e=>e.code==='V2J_CONFLICT');
 assert.deepEqual(await b.get('x'),{video:'new'});
});
test('database errors are not disguised as empty cache',async()=>{
 let legacyReads=0;
 const store=makeStore('test',async()=>{throw Error('unavailable')},()=>({get:async()=>{legacyReads++;return {}}}));
 await assert.rejects(store.get('x'),/unavailable/);assert.equal(legacyReads,0);
});
test('returns rollout is independent and microphone stays ephemeral',()=>{
 const env={V2J_DATABASE_URL:'configured'};
 assert.equal(usesDatabase('painel-video-v1',env),true);
 assert.equal(usesDatabase('central-retorno-v1',env),false);
 assert.equal(usesDatabase('central-retorno-v1',{...env,V2J_PERSIST_RETURNS:'1'}),true);
 assert.equal(usesDatabase('painel-ao-vivo-microfone',{...env,V2J_PERSIST_RETURNS:'1'}),false);
});
