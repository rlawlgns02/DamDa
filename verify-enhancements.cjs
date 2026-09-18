const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {create}=require('./dist/organizer.js');const {normalizeCard}=require('./card-store.cjs');
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const local=storage(),session=storage(),book=create(local);
const data={name:'테스트',showName:true,theme:'light',photo:'',fields:[{label:'이메일',value:'test@example.com',selected:true}]};
assert.equal(book.add(data,'first'),true);assert.equal(book.add(data,'first'),false);assert.equal(create(local).read().cards.length,1);
book.addTab('동료');book.move('first','동료');book.renameTab('동료','친구들');assert.equal(book.read().cards[0].tab,'친구들');book.removeTab('친구들');assert.equal(book.read().cards[0].tab,'미분류');
assert.throws(()=>book.addTab('전체'));assert.throws(()=>book.addTab('미분류'));
book.preset('custom','선택',['이메일'],{nameMode:'nickname',showName:false});book.preset('custom','새 이름',['회사'],{nameMode:'name',showName:true});assert.equal(book.read().presets.filter(p=>p.id==='custom').length,1);book.deletePreset('custom');assert(!book.read().presets.some(p=>p.id==='custom'));
assert.equal(normalizeCard({...data,theme:'blue'}).theme,'blue');
const full=normalizeCard({...data,photoShape:'square',photoSize:'large'});assert.equal(full.photoShape,'square');assert.equal(full.photoSize,'large');
assert.equal(normalizeCard({...data,photoShape:'evil',photoSize:100}).photoShape,'circle');
const blocked=create({getItem:()=>null,setItem(){throw Error('storage blocked');}});assert.throws(()=>blocked.add(data,'first'),/storage blocked/);
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{innerHTML:'',value:'',checked:false,dataset:{},classList:{add(){},remove(){}},listeners:{},addEventListener(t,f){(this.listeners[t]??=[]).push(f);},querySelector(){return null;},querySelectorAll(){return [];},focus(){}});return elements.get(id);}
const context=vm.createContext({document:{getElementById:el,querySelector(){return null;},querySelectorAll(){return [];},documentElement:{dataset:{}},createTreeWalker(){return {nextNode(){return false;}}}},location:{hash:'#login',href:'http://localhost/#login'},sessionStorage:session,localStorage:local,window:{addEventListener(){},scrollTo(){}},NodeFilter:{SHOW_TEXT:4},matchMedia:()=>({matches:false,addEventListener(){}}),TextEncoder,TextDecoder,Uint8Array,URLSearchParams,setTimeout:()=>0,clearTimeout(){},navigator:{},confirm:()=>true,FormData:class{constructor(form){this.entries=form.entries||[];}get(k){return this.entries.find(([key])=>key===k)?.[1]??null;}getAll(k){return this.entries.filter(([key])=>key===k).map(([,v])=>v);}has(k){return this.entries.some(([key])=>key===k);}},crypto:require('node:crypto').webcrypto,console});
for(const p of ['dist/organizer.js','dist/i18n.js']){let s=fs.readFileSync(p,'utf8');if(p.includes('organizer'))s=s.replace('scope.DamDaOrganizer=api','scope.DamDaOrganizer=api');vm.runInContext(s,context);}
for(const p of ['dist/sharing-ui.js','dist/app.js','dist/enhancements.js','dist/workspace-view.js','dist/presets-ui.js','dist/motion.js','dist/studio-ui.js'])vm.runInContext(fs.readFileSync(p,'utf8'),context);
vm.runInContext("signedIn=true;profile.name='PRIVATE';profile.nickname='public-nick';profile.nameMode='nickname';profile.photoShape='square';profile.photoSize='large';",context);
let snapshot=JSON.parse(vm.runInContext('JSON.stringify(selectedSnapshot())',context));assert.equal(snapshot.name,'public-nick');assert(!JSON.stringify(snapshot).includes('PRIVATE'));assert.equal(snapshot.photoShape,'square');
vm.runInContext("profile.showName=false",context);assert.equal(vm.runInContext('selectedSnapshot().name',context),'');
context.location.hash='#home';vm.runInContext('render()',context);assert.match(el('app').innerHTML,/damda-shell/);assert.match(el('app').innerHTML,/data-ui="choose-photo"/);assert.match(el('app').innerHTML,/data-action="share"/);assert.match(el('app').innerHTML,/id="share-result"/);assert.equal((el('app').innerHTML.match(/id="profile-name"/g)||[]).length,1);assert.match(el('app').innerHTML,/data-custom-preset/);assert.match(el('app').innerHTML,/profile-nickname/);assert(!el('app').innerHTML.includes('data-preset='));
session.setItem('damda-pending-card',JSON.stringify({id:'pending',data}));context.location.hash='#home';vm.runInContext('render()',context);assert.equal(context.location.hash,'book');assert.equal(session.getItem('damda-pending-card'),null);assert(book.read().cards.some(c=>c.id==='pending'));
context.location.hash='#book';vm.runInContext('render()',context);assert.match(el('app').innerHTML,/damda-shell/);assert.match(el('app').innerHTML,/data-move-card/);assert(!el('app').innerHTML.includes('seoyeon@example.com'));assert.match(el('app').innerHTML,/test@example.com/);assert(!el('app').innerHTML.includes('ocr'));
vm.runInContext("language='en';render()",context);assert.match(el('app').innerHTML,/Card collection/);
vm.runInContext("appearance='dark';applyAppearance()",context);assert.equal(context.document.documentElement.dataset.appearance,'dark');
vm.runInContext("signedIn=false;completed=true",context);session.setItem('damda-pending-card',JSON.stringify({id:'signup-pending',data}));
for(const handler of el('app').listeners.submit.slice(1))handler({target:{id:'signup-form'}});assert.equal(vm.runInContext('signedIn',context),true);assert(book.read().cards.some(c=>c.id==='signup-pending'));
assert(!fs.readFileSync('package.json','utf8').includes('tesseract'));
for(const p of ['dist/app.js','dist/sharing-ui.js','dist/enhancements.js','dist/organizer.js'])assert(!/\beval\s*\(|new\s+Function\s*\(/.test(fs.readFileSync(p,'utf8')));
const html=fs.readFileSync('dist/mockup.html','utf8');for(const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:css|js|png))"/g))assert(fs.existsSync('dist/'+m[1]),m[1]);
console.log('PASS: durable collection, deduplication, category CRUD, preset CRUD, storage failure, nickname privacy, photo settings, pending-card resume, signup auto-save, English, dark mode, OCR deferred, mockup assets, no eval.');


(async()=>{

// Test preset buttons through the same delegated click handlers used by the app.
async function clickButton(dataset){
  const button={dataset,disabled:false};
  const target={closest(selector){
    if(selector==='button')return button;
    if(selector==='button[data-preset-action]'&&dataset.presetAction)return button;
    return null;
  }};
  for(const handler of el('app').listeners.click)await handler({target});
}
context.location.hash='#home';
vm.runInContext("signedIn=true;language='ko';profile.nameMode='nickname';profile.showName=false;",context);
await clickButton({customPreset:'work'});
assert.equal(vm.runInContext('selectedPreset',context),'work');
assert.equal(vm.runInContext('profile.nameMode',context),'name');
assert.equal(vm.runInContext('profile.showName',context),true);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(profile.fields.filter(f=>f.selected).map(f=>f.label))',context)),['직업','회사','이메일']);
assert.match(el('app').innerHTML,/data-preset-action="add"/);
for(const id of ['work','friends','school','games']){
 assert.match(el('app').innerHTML,new RegExp('data-preset-action="edit" data-preset-id="'+id+'"'));
 assert.match(el('app').innerHTML,new RegExp('data-preset-action="delete" data-preset-id="'+id+'"'));
}
await clickButton({presetAction:'edit',presetId:'work'});
assert.match(el('app').innerHTML,/id="preset-form"/);
const saveForm=async entries=>{
 const event={preventDefault(){},target:{id:'preset-form',entries}};
 for(const handler of el('app').listeners.submit)await handler(event);
};
await saveForm([['presetName','고객 미팅'],['presetField','이메일'],['presetField','전화번호'],['presetIdentity','nickname'],['presetShowName','on']]);
assert.equal(book.read().presets.find(p=>p.id==='work').name,'고객 미팅');
assert.deepEqual(book.read().presets.find(p=>p.id==='work').labels,['이메일','전화번호']);
assert.equal(vm.runInContext('profile.nameMode',context),'nickname');
assert.equal(vm.runInContext('profile.presetId',context),'work');
vm.runInContext("selectedPreset='';restorePresetSelection()",context);
assert.equal(vm.runInContext('selectedPreset',context),'work');
await clickButton({presetAction:'add'});
await saveForm([['presetName','새 모임'],['presetField','취미'],['presetIdentity','name']]);
const newPreset=book.read().presets.find(p=>p.name==='새 모임');
assert(newPreset);assert.equal(vm.runInContext('profile.showName',context),false);
await clickButton({presetAction:'delete',presetId:newPreset.id});
assert(!book.read().presets.some(p=>p.id===newPreset.id));
assert.equal(vm.runInContext('selectedPreset',context),'');
await clickButton({customPreset:'friends'});
await clickButton({presetAction:'edit',presetId:'friends'});
await clickButton({presetAction:'cancel'});
assert.equal(vm.runInContext('presetDraft',context),null);
assert.equal(book.read().presets.find(p=>p.id==='friends').name,'친구');
// Reduced motion responds to both the explicit control and OS preference.
for(const handler of el('app').listeners.change)handler({target:{id:'motion-preference',value:'reduced',dataset:{}}});
assert.equal(local.getItem('damda-motion'),'reduced');
assert.equal(context.document.documentElement.dataset.motion,'reduced');
vm.runInContext("motionPreference='system';motionQuery.matches=true;applyMotion()",context);
assert.equal(context.document.documentElement.dataset.motion,'reduced');
vm.runInContext("motionQuery.matches=false;applyMotion()",context);
assert.equal(context.document.documentElement.dataset.motion,'full');
console.log('PASS: visible preset add/edit/delete controls, real click and form events, rename/field edits, selection restore, cancel, deletion, OS and saved reduced motion.');

// Exercise the actual share handler through the new workspace wrapper.
context.document.querySelector=()=>el('share-button');
context.location.hash='#home';context.location.hostname='localhost';context.location.origin='http://localhost:5173';
vm.runInContext("signedIn=true;profile.showName=true;profile.nameMode='nickname';profile.nickname='share-name';sharePending=false;activeShare=null;api=async path=>path==='/api/network'?{networks:[]}:{id:'new-share'};",context);
await vm.runInContext('share()',context);
assert(book.read().cards.some(c=>c.id==='new-share'&&c.data.name==='share-name'));
assert.match(el('share-result').innerHTML,/share-qr/);
const {createServer}=require('./server.cjs');const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const base='http://127.0.0.1:'+server.address().port;
 for(const route of ['/','/mockup.html','/damda-logo.png','/enhancements.js','/i18n.js','/workspace-view.js','/workspace.css','/presets-ui.js','/motion.js','/motion.css']){
  const r=await fetch(base+route);assert.equal(r.status,200);
  assert(r.headers.get('content-security-policy').includes("script-src 'self'"));
  assert(!r.headers.get('content-security-policy').includes('unsafe-eval'));
  if(route.endsWith('.png'))assert.equal(r.headers.get('content-type'),'image/png');
  await r.arrayBuffer();
 }
 console.log('PASS: app, mockup, logo, scripts and CSP HTTP responses.');
}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

