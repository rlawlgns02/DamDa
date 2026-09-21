'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const model=require('./dist/card-model.js');
const source=fs.readFileSync('dist/account-client.js','utf8');
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(){
 const rows=Object.fromEntries(['A','B'].map(id=>[id,{profile:model.toProfile({...model.empty(),name:id}),organizer:{cards:[],tabs:[],presets:[]},revision:0}]));
 const writes=[],shares=[];let listener,signouts=0,update=async()=>({data:{revision:1}});
 const client={auth:{onAuthStateChange(fn){listener=fn;},async getSession(){return {data:{session:{}}};},async getUser(){return {data:{user:{id:'A'}}};},async signOut(){signouts++;return {}; }},from(table){
  let uid,body,operation;const query={select(){return query;},eq(key,value){if(key==='user_id')uid=value;return query;},update(value){operation='update';body=value;return query;},insert(value){body=value;return query;},async maybeSingle(){if(operation==='update'){writes.push({uid,body});return update(body,uid);}return {data:structuredClone(rows[uid])};},async single(){shares.push({table,...body});return {data:{id:'share-id'}};}};return query;
 }};
 const sandbox={supabase:{createClient:()=>client},DamDaCloudConfig:{url:'https://fixture.supabase.co',key:'fixture'},DamDaModel:model,URL,URLSearchParams,structuredClone,setTimeout,clearTimeout,location:{origin:'https://local',pathname:'/',search:''},addEventListener(){}};
 sandbox.window=sandbox;vm.runInNewContext(source,sandbox);
 return {account:sandbox.DamDaAccount,writes,shares,rows,get signouts(){return signouts;},set update(fn){update=fn;},async switchTo(id){listener('SIGNED_IN',{user:{id}});await tick();},async dispose(){await sandbox.DamDaAccount.logout({discardChanges:true});}};
}
(async()=>{
 const f=fixture(),a=f.account;await a.init();
 try{
  const first=defer();f.update=()=>first.promise;a.save({profile:{...a.state.account.profile,name:'Private A'}});
  const publication=assert.rejects(a.publish({name:'Private A',fields:[]}),/계정이 변경/);
  await tick();await f.switchTo('B');first.resolve({data:{revision:1}});await publication;
  assert.equal(f.shares.length,0,'a stale snapshot must never be inserted under the new owner');
  // A new account must not wait for or inherit an old account's in-flight save.
  await f.switchTo('A');const old=defer();f.update=()=>old.promise;a.save({profile:{...a.state.account.profile,name:'old'}});const oldSave=a.flush();
  await f.switchTo('B');f.update=async()=>({data:{revision:1}});a.save({profile:{...a.state.account.profile,name:'new'}});await a.flush();old.resolve({data:{revision:9}});await oldSave;
  assert.equal(a.state.account.revision,1);assert.equal(a.state.account.profile.name,'new');
  assert.equal(a.state.dirty,false);
  // Editing during a request must retain the later edit; unchanged organizer is omitted.
  const delayed=defer();let revision=1,count=0;f.update=async()=>++count===1?delayed.promise:{data:{revision:++revision}};
  a.save({profile:{...a.state.account.profile,name:'one'}});const save=a.flush();a.save({profile:{...a.state.account.profile,name:'two'}});
  delayed.resolve({data:{revision:++revision}});await save;
  assert.equal(a.state.dirty,false);assert.equal(f.writes.at(-1).body.profile.name,'two');
  assert(f.writes.every(w=>!Object.hasOwn(w.body,'organizer')),'profile-only changes must omit organizer');
  a.save({organizer:{cards:[],tabs:['New'],presets:[]}});await a.flush();assert(!Object.hasOwn(f.writes.at(-1).body,'profile'));
  // Logout preserves the recovery choice, while explicit discard terminates the session.
  f.update=async()=>({error:{message:'offline'}});a.save({profile:{...a.state.account.profile,name:'unsaved'}});
  await assert.rejects(a.logout(),e=>e.unsavedChanges===true);assert.equal(f.signouts,0);assert.equal(a.state.dirty,true);
  await a.logout({discardChanges:true});assert.equal(f.signouts,1);assert.equal(a.state.user,null);
  console.log('PASS account: publish ownership, stale saves, concurrent edits, partial updates, logout after failed save.');
 }finally{await f.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
