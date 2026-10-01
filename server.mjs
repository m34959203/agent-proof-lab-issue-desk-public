import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';
import {lexical,semantic,fail,demo} from './engine.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export async function createApp({dir=path.join(root,'.state'),semanticSearch=semantic}={}){
 const store=await openStore(dir);
 const app=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   const origin=`http://127.0.0.1:${app.address().port}`;if(req.headers.host!==`127.0.0.1:${app.address().port}`)fail('Unexpected Host.',403);
   if(req.headers.origin&&req.headers.origin!==origin)fail('Cross-origin request rejected.',403);
   if(req.headers['sec-fetch-site']==='cross-site')fail('Cross-site request rejected.',403);
   const url=new URL(req.url,origin);
   if(req.method==='GET'){
    if(url.pathname==='/api/state')return send(200,store.get());
    if(url.pathname==='/api/demo')return send(200,demo);
    if(url.pathname==='/api/export'){res.setHeader('content-disposition','attachment; filename="issue-desk-review.json"');return send(200,store.get());}
    const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};const item=files[url.pathname];if(!item)fail('Not found.',404);
    res.writeHead(200,{'content-type':item[1],'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(await fs.readFile(path.join(root,'public',item[0])));return;
   }
   if(req.method!=='POST')fail('Method not allowed.',405);
   if(req.headers.origin!==origin)fail('Same-origin header required.',403);
   if(req.headers['content-type']!=='application/json')fail('Use application/json.',415);
   let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>1048576)fail('JSON exceeds 1 MiB.',413);chunks.push(c);}let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{fail('Malformed JSON.');}if(!input||typeof input!=='object'||Array.isArray(input))fail('Expected JSON object.');
   if(url.pathname==='/api/import'||url.pathname==='/api/review')return send(200,await store.mutate(input,url.pathname.endsWith('import')?'import':'review'));
   if(url.pathname==='/api/search'){
    const state=store.get();if(input.revision!==state.revision)fail('Queue changed. Reload before searching.',409);
    const t=state.bundle.tickets.find(t=>t.id===input.ticketId&&t.status==='open');if(!t)fail('Select an open ticket.');
    if(!['lexical','semantic'].includes(input.method))fail('Choose lexical or semantic search.');
    const cases=state.bundle.tickets.filter(x=>x.status==='resolved'),query=t.title+'\n'+t.body;
    let results=[];if(cases.length){try{results=input.method==='lexical'?lexical(query,cases):await semanticSearch(query,cases,{url:process.env.OLLAMA_URL??'http://127.0.0.1:11434'});}catch(e){fail(e.status?e.message:'Local AI unavailable or timed out; use lexical search.',503);}}
    if(store.get().revision!==state.revision)fail('Queue changed while searching. Retry.',409);
    return send(200,{revision:state.revision,ticketId:t.id,method:input.method,results});
   }fail('Not found.',404);
  }catch(e){if(!res.headersSent)send(e.status??500,{error:e.status?e.message:'Local storage/request failure. No success was recorded.'});else res.end();}
 });return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await createApp({dir:process.env.ISSUE_DESK_STATE_DIR||path.join(root,'.state')});const port=Number(process.env.PORT||4317);app.listen(port,'127.0.0.1',()=>console.log(`Issue Desk: http://127.0.0.1:${app.address().port}`));
}
