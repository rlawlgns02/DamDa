const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = new Map();
function element(id) { if(!elements.has(id)) elements.set(id,{innerHTML:'',value:'',checked:false,classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;},focus(){}}); return elements.get(id); }
const session = new Map();
const context = vm.createContext({document:{getElementById:element,querySelector(){return element('query');}},location:{hash:'#login',href:'http://localhost:5173/#home'},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},window:{addEventListener(){},scrollTo(){}},TextEncoder,TextDecoder,Uint8Array,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout,clearTimeout,console});
vm.runInContext(fs.readFileSync('dist/sharing-ui.js','utf8'),context);
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
assert.match(element('app').innerHTML,/FOLD/);
const submit = () => element('app').submit({preventDefault(){},target:{id:'login-form'}});
element('login-id').value='admin';element('login-password').value='wrong';submit();assert.match(element('form-error').innerHTML,/확인/);assert.equal(context.location.hash,'#login');
element('login-password').value='1234';submit();assert.equal(context.location.hash,'home');assert.equal(session.get('fold-session'),'true');
vm.runInContext("profile.fields[0].value='<script>alert(1)</script>';profile.fields[0].selected=true;profile.fields[1].value='PRIVATE-COMPANY';profile.fields[1].selected=false;profile.showName=false",context);
const payload=JSON.parse(vm.runInContext('JSON.stringify(selectedSnapshot())',context));assert.equal(payload.name,'');assert(!JSON.stringify(payload).includes('PRIVATE-COMPANY'));
context.location.hash='#card?'+Buffer.from(JSON.stringify(payload)).toString('base64');vm.runInContext('render()',context);assert(!element('app').innerHTML.includes('<script>alert'));assert.match(element('app').innerHTML,/&lt;script&gt;/);assert.match(element('app').innerHTML,/download-png/);assert.match(element('app').innerHTML,/download-vcf/);
context.location.hash='#card?invalid';vm.runInContext('render()',context);assert.match(element('app').innerHTML,/명함을 열 수 없어요/);
context.location.hash='#signup';vm.runInContext('step=1;render()',context);element('signup-id').value='newuser';element('signup-password').value='password123';element('confirm-password').value='different';element('app').submit({preventDefault(){},target:{id:'signup-form'}});assert.match(element('form-error').innerHTML,/일치하지/);assert.equal(vm.runInContext('step',context),1);
console.log('PASS: login success/failure, signup password mismatch, selected-field sharing, hidden name, recipient downloads, HTML escaping, invalid shared link.');
