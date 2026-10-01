import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {demo,validateBundle,fingerprint,fail} from './engine.mjs';
export async function openStore(dir){
 await fs.mkdir(dir,{recursive:true});const file=path.join(dir,'state.json');let state;
 try{state=JSON.parse(await fs.readFile(file,'utf8'));validateState(state);}catch(e){if(e.code!=='ENOENT')throw new Error('Saved state invalid; preserve state.json and restore a valid backup.');state={schemaVersion:1,revision:0,bundle:structuredClone(demo),history:[]};await persist(state);}
 async function persist(s){const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(s,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temp,file);}catch(e){await fs.rm(temp,{force:true});throw e;}}
 let chain=Promise.resolve();
 const view=()=>({...structuredClone(state),syntheticDemo:fingerprint(state.bundle)===fingerprint(demo)});
 return {get:view,mutate(input,kind){const next=chain.then(async()=>{
  if(input.revision!==state.revision)fail('This queue changed. Reload before saving.',409);
  const s=structuredClone(state);
  if(kind==='import'){s.bundle=validateBundle(input.bundle);s.history=[];}
  else {const ticket=s.bundle.tickets.find(t=>t.id===input.ticketId);if(!ticket||ticket.status!=='open')fail('Select an open ticket.');
   const allowed=['investigate','linked','unrelated','reopen'];if(!allowed.includes(input.disposition))fail('Choose a valid disposition.');
   if(typeof input.note!=='string'||input.note.trim().length<1||input.note.length>2000)fail('Add a review note (1–2000 characters).');
   let linkedCaseId=null;if(input.disposition==='linked'){if(!s.bundle.tickets.some(t=>t.id===input.linkedCaseId&&t.status==='resolved'))fail('Select a resolved case to link.');linkedCaseId=input.linkedCaseId;}
   if(input.disposition==='reopen'&&!s.history.some(h=>h.ticketId===input.ticketId))fail('This ticket has no review to reopen.');
   s.history.push({ticketId:ticket.id,disposition:input.disposition,note:input.note.trim(),linkedCaseId,revision:s.revision+1,at:new Date().toISOString(),dataset:fingerprint(s.bundle)});
  }
  s.revision++;await persist(s);state=s;return view();
 });chain=next.catch(()=>{});return next;}};
}
export function validateState(s){
 if(!s||s.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.history))fail('Invalid saved state.');
 const bundle=validateBundle(s.bundle);const hash=fingerprint(bundle);let last=0;
 for(const h of s.history){if(!h||!bundle.tickets.some(t=>t.id===h.ticketId&&t.status==='open')||!['investigate','linked','unrelated','reopen'].includes(h.disposition)||typeof h.note!=='string'||!h.note.trim()||h.note.length>2000||!Number.isSafeInteger(h.revision)||h.revision<=last||h.revision>s.revision||h.dataset!==hash||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at)))fail('Invalid saved history.');if(h.disposition==='linked'?!bundle.tickets.some(t=>t.id===h.linkedCaseId&&t.status==='resolved'):h.linkedCaseId!==null)fail('Invalid saved link.');last=h.revision;}
 return s;
}
