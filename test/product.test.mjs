import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {demo,validateBundle,lexical,cosines,semantic,DIGEST} from '../engine.mjs';
import {openStore} from '../store.mjs';
import {createApp} from '../server.mjs';
const temp=()=>fs.mkdtemp(path.join(os.tmpdir(),'issue-desk-test-'));
test('I02 rejects invalid ticket bundles',()=>{
 for(const modify of [b=>b.tickets.push(b.tickets[0]),b=>b.tickets[0].id='../path',b=>b.tickets[0].title='',b=>b.tickets[0].body='x'.repeat(4001),b=>b.tickets[0].status='closed',b=>b.tickets[0].resolution='premature',b=>b.tickets[3].resolution='',b=>b.tickets=[],b=>b.schemaVersion=2]){const b=structuredClone(demo);modify(b);assert.throws(()=>validateBundle(b));}
 assert.equal(validateBundle(demo).tickets.length,8);
});
test('I03 lexical expected ranking, no match and stable tie',()=>{
 const cases=demo.tickets.filter(t=>t.status==='resolved');assert.equal(lexical(demo.tickets[0].title+' '+demo.tickets[0].body,cases)[0].id,'R-201');assert.deepEqual(lexical('zqxv',cases),[]);assert.deepEqual(lexical('apple',[{id:'b',title:'apple',body:''},{id:'a',title:'apple',body:''}]).map(x=>x.id),['a','b']);
});
test('I04 malformed embedding vectors cannot become confidence',()=>{
 assert.deepEqual(cosines([[1,0],[0,1],[1,0]],3),[0,1]);
 for(const v of [[],[[1],[1,2]],[[0],[1]],[[Infinity],[1]],[[NaN],[1]],[[1],'a']])assert.throws(()=>cosines(v,2));
});
test('I04 optional model identity, failures and valid wire contract',async()=>{
 await assert.rejects(semantic('q',[demo.tickets[3]],{url:'https://example.com'}));
 let requests=[];const fetcher=async(u,o)=>{requests.push({u,o});return {ok:true,json:async()=>u.endsWith('/api/tags')?{models:[{name:'bge-m3:latest',digest:DIGEST}]}:{embeddings:[[1,0],[1,0]]}};};
 assert.equal((await semantic('q',[demo.tickets[3]],{fetcher}))[0].score,1);assert.equal(JSON.parse(requests[1].o.body).options.num_gpu,0);assert.equal(JSON.parse(requests[1].o.body).truncate,false);
 await assert.rejects(semantic('q',[demo.tickets[3]],{fetcher:async()=>({ok:true,json:async()=>({models:[]})})}),/identity mismatch/);
 await assert.rejects(semantic('q',[demo.tickets[3]],{fetcher:async()=>({ok:false})}),/identity unavailable/);
});
test('I06/07/08 durable review, exact revision conflict, amend, reopen and atomic import',async()=>{
 const dir=await temp();try{const s=await openStore(dir);const input={revision:0,ticketId:'T-101',disposition:'linked',linkedCaseId:'R-201',note:'Verified encoding, not row duplication.'};
 const settled=await Promise.allSettled([s.mutate(input,'review'),s.mutate(input,'review')]);assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);assert.equal(settled.find(r=>r.status==='rejected').reason.status,409);
 assert.deepEqual((await openStore(dir)).get(),s.get());const before=s.get();
 for(const bad of [{ticketId:'R-201'},{disposition:'send'},{note:''},{linkedCaseId:'T-102'}])await assert.rejects(s.mutate({...input,revision:1,...bad},'review'));
 assert.deepEqual(s.get(),before);await s.mutate({...input,revision:1,disposition:'reopen',note:'Need file confirmation.'},'review');assert.equal(s.get().history.length,2);
 await assert.rejects(s.mutate({revision:2,bundle:{schemaVersion:1,tickets:[]}},'import'));assert.equal(s.get().revision,2);
 await s.mutate({revision:2,bundle:demo},'import');assert.equal(s.get().revision,3);assert.equal(s.get().history.length,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('I08 corrupt saved state fails without overwrite',async()=>{const dir=await temp();try{await fs.writeFile(path.join(dir,'state.json'),'invalid');await assert.rejects(openStore(dir),/Saved state invalid/);assert.equal(await fs.readFile(path.join(dir,'state.json'),'utf8'),'invalid');}finally{await fs.rm(dir,{recursive:true,force:true});}});
test('I02/05/09/10 HTTP boundaries, export and changed in-flight search',async()=>{
 const dir=await temp();let release;const app=await createApp({dir,semanticSearch:()=>new Promise(r=>{release=r;})});await new Promise(r=>app.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.address().port}`;
 const post=(p,b,headers={})=>fetch(url+p,{method:'POST',headers:{origin:url,'content-type':'application/json',...headers},body:typeof b==='string'?b:JSON.stringify(b)});
 try{
 const wrongHost=await new Promise((resolve,reject)=>{http.get(url+'/api/state',{headers:{host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(wrongHost,403);
 assert.equal((await post('/api/import',{}, {origin:'https://evil.example'})).status,403);
 assert.equal((await post('/api/import',{}, {'content-type':'text/plain'})).status,415);
 assert.equal((await post('/api/import','{')).status,400);
 assert.equal((await post('/api/import',' '.repeat(1048577))).status,413);
 const req=post('/api/search',{ticketId:'T-101',revision:0,method:'semantic'});while(!release)await new Promise(r=>setTimeout(r,5));assert.equal((await post('/api/import',{revision:0,bundle:demo})).status,200);release([{id:'R-201',score:0.9}]);assert.equal((await req).status,409);
 const state=await (await fetch(url+'/api/state')).json(),exported=await (await fetch(url+'/api/export')).json();assert.deepEqual(exported,state);assert.equal(state.revision,1);
 assert.equal((await post('/api/review',{revision:0})).status,409);
 const match=await (await post('/api/search',{ticketId:'T-101',revision:1,method:'lexical'})).json();assert.equal(match.results[0].id,'R-201');assert.equal(match.method,'lexical');
 }finally{await new Promise(r=>app.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
