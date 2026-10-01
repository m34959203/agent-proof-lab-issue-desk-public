import {createHash} from 'node:crypto';
export const DIGEST='7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab';
export const MODEL='bge-m3:latest';
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const str=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
export function validateBundle(b){
 if(!object(b)||b.schemaVersion!==1||!Array.isArray(b.tickets)||b.tickets.length<1||b.tickets.length>200)fail('Expected schemaVersion 1 and 1–200 tickets.');
 const seen=new Set();
 const tickets=b.tickets.map(t=>{
  if(!object(t)||!str(t.id,1,40)||!/^[A-Za-z0-9_-]+$/.test(t.id)||seen.has(t.id))fail('Ticket IDs must be unique safe identifiers.');
  seen.add(t.id);
  if(!str(t.title,1,160)||!str(t.body,1,4000)||!['open','resolved'].includes(t.status)||!str(t.resolution,0,4000))fail('Each ticket needs title, body, status and resolution text within limits.');
  if(t.status==='resolved'&&!t.resolution.trim()||t.status==='open'&&t.resolution!=='')fail('Only resolved tickets must have a resolution.');
  return {id:t.id,title:t.title,body:t.body,status:t.status,resolution:t.resolution};
 });return {schemaVersion:1,tickets};
}
export const fingerprint=b=>createHash('sha256').update(JSON.stringify(b)).digest('hex');
const stop=new Set('a an the i my we our is are was were to in on for and or it this that of with not'.split(' '));
export const tokens=s=>new Set(s.toLowerCase().match(/[a-z0-9]+/g)?.filter(x=>x.length>1&&!stop.has(x))??[]);
export function lexical(query,cases){
 const a=tokens(query);return cases.map(t=>{const b=tokens(t.title+' '+t.body);const matched=[...a].filter(x=>b.has(x));return {id:t.id,score:matched.length/(new Set([...a,...b]).size||1),matched};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,5);
}
export function cosines(vectors,count){
 if(!Array.isArray(vectors)||vectors.length!==count)fail('Local model returned the wrong vector count.',503);
 const d=vectors[0]?.length;if(!Number.isInteger(d)||d<1||d>8192)fail('Invalid embedding dimensions.',503);
 const norms=vectors.map(v=>{if(!Array.isArray(v)||v.length!==d||!v.every(Number.isFinite))fail('Invalid embedding values.',503);const n=Math.hypot(...v);if(!Number.isFinite(n)||n===0)fail('Invalid embedding norm.',503);return n;});
 return vectors.slice(1).map((v,i)=>Math.max(-1,Math.min(1,v.reduce((sum,x,j)=>sum+(x/norms[i+1])*(vectors[0][j]/norms[0]),0))));
}
export async function semantic(query,cases,{url='http://127.0.0.1:11434',fetcher=fetch,timeout=30000}={}){
 if(url!=='http://127.0.0.1:11434')fail('Only the configured local Ollama endpoint is allowed.',503);
 const signal=AbortSignal.timeout(timeout);const tags=await fetcher(url+'/api/tags',{signal});if(!tags.ok)fail('Local model identity unavailable.',503);
 const body=await tags.json();if(body.models?.find(m=>m.name===MODEL)?.digest!==DIGEST)fail('Local model identity mismatch; use lexical search.',503);
 const r=await fetcher(url+'/api/embed',{method:'POST',headers:{'content-type':'application/json'},signal,body:JSON.stringify({model:MODEL,input:[query,...cases.map(t=>t.title+'\n'+t.body)],options:{num_gpu:0},truncate:false})});
 if(!r.ok)fail('Local embedding request failed; use lexical search.',503);
 const scores=cosines((await r.json()).embeddings,cases.length+1);
 return cases.map((t,i)=>({id:t.id,score:scores[i]})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,5);
}
export const demo=validateBundle({schemaVersion:1,tickets:[
 {id:'T-101',title:'CSV export loses accented names',body:'The downloaded CSV displays JosÃ© instead of José in my spreadsheet. The in-app name looks correct.',status:'open',resolution:''},
 {id:'T-102',title:'Export button does nothing on Safari',body:'Clicking Export does not start a download in Safari. Chrome works.',status:'open',resolution:''},
 {id:'T-103',title:'Invite link has expired',body:'A teammate opened an invitation after a week and cannot join the demo workspace.',status:'open',resolution:''},
 {id:'R-201',title:'Accented CSV names garbled in spreadsheet',body:'CSV download opens with incorrect accented characters in a spreadsheet but looks fine in a text editor.',status:'resolved',resolution:'In this fictional prior case, exporting UTF-8 with a BOM corrected spreadsheet encoding detection. Check the actual file encoding before applying.'},
 {id:'R-202',title:'CSV export contains duplicate rows',body:'The exported CSV repeats every customer twice after combining pages.',status:'resolved',resolution:'Removed duplicate pagination concatenation. Encoding was unrelated in this case.'},
 {id:'R-203',title:'Safari blocks delayed download',body:'An export download initiated after an asynchronous request was blocked in Safari.',status:'resolved',resolution:'Added an explicit download link after preparation so a new user click starts the file download.'},
 {id:'R-204',title:'Invitation expires after seven days',body:'An invitation link expired before the new teammate opened it.',status:'resolved',resolution:'The operator generated a fresh invitation through the account UI. No automatic invitation was sent.'},
 {id:'R-205',title:'Dark theme resets after refresh',body:'After reloading, the chosen dark theme returns to light.',status:'resolved',resolution:'Persisted the preference locally and loaded it before rendering.'}
]});
