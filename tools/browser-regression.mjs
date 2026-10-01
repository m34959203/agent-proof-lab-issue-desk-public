// Successor portable adaptation of the frozen recorded regression. Same assertions.
// No video; screenshots/results stay in the caller-selected local directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.PLAYWRIGHT_MODULE;
if(!modulePath||!process.env.BROWSER_EXECUTABLE)throw Error('Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE to existing absolute paths; see CORRECTION-WORKFLOW.md');
const {chromium}=await import(pathToFileURL(path.resolve(modulePath)));
const source=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
await fs.mkdir(out,{recursive:true});
await fs.access(path.join(out,'results.json')).then(()=>{throw Error('Refusing to overwrite results');},()=>{});
const {createApp}=await import(pathToFileURL(path.join(source,'server.mjs')));
const {demo}=await import(pathToFileURL(path.join(source,'engine.mjs')));
const results=[];
for(const mode of ['import','demo']){
 const app=await createApp({dir:await fs.mkdtemp(path.join(out,'state-'))});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${app.address().port}`;
 let browser,context,release=()=>{},video;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
  context=await browser.newContext({viewport:{width:2560,height:1440}});
  const p=await context.newPage();p.setDefaultTimeout(10000);
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(url);await p.getByText('Local queue ready.',{exact:false}).waitFor();
  let started,delivered;
  const gate=new Promise(r=>{release=r;}),ready=new Promise(r=>{started=r;}),delivery=new Promise(r=>{delivered=r;});
  await p.route('**/api/import',async route=>{const response=await route.fetch();started();await gate;await route.fulfill({response});delivered();});
  if(mode==='import')await p.locator('#file').setInputFiles({name:'synthetic-demo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(demo))});
  await p.locator('#'+mode).click();
  await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Import never committed')),10000).unref())]);
  await p.locator('#reload').click();await p.getByText('queue revision 1',{exact:false}).waitFor();
  const note='Saved after replacement committed, before its delayed response arrived.';
  await p.locator('#note').fill(note);await p.getByRole('button',{name:'Save review decision'}).click();await p.getByText('queue revision 2',{exact:false}).waitFor();
  const read=async()=>({count:await p.locator('#count').textContent(),history:await p.locator('#history').textContent()});
  const before=await read();assert.match(before.history,/Saved after/);
  await p.locator('#history').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`${mode}-before.png`)});await p.waitForTimeout(1200);
  release();await delivery;
  // Wait for browser fetch completion/render, independent of success-message wording.
  await p.waitForTimeout(700);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const after=await read();const server=await(await fetch(url+'/api/state')).json();
  await p.screenshot({path:path.join(out,`${mode}-after.png`)});await p.waitForTimeout(1200);
  const assertions={latestUiRevision:after.count.includes('revision 2'),savedNoteVisible:after.history.includes(note),serverRevision:server.revision===2,serverNote:server.history.some(h=>h.note===note),noBrowserErrors:errors.length===0};
  results.push({mode,status:Object.values(assertions).every(Boolean)?'PASS':'FAIL',assertions,before,after,serverRevision:server.revision,serverHistory:server.history,errors});
 }catch(e){results.push({mode,status:'HARNESS_ERROR',error:e.message});}
 finally{release();if(context)await context.close();if(browser)await browser.close();await new Promise(r=>app.close(r));if(video)results.at(-1).video=path.relative(process.cwd(),await video.path());}
}
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),source:'viewer-supplied source directory',scope:'Actual HTTP app and Chromium; deliberate response-delivery delay; no seeded product fault',results},null,2)+'\n',{flag:'wx'});
for(const r of results)console.log(`${r.mode}: ${r.status} — ${JSON.stringify(r.assertions??r.error)}`);
process.exitCode=results.some(r=>r.status==='HARNESS_ERROR')?2:results.every(r=>r.status==='PASS')?0:1;
