(function(scope){
'use strict';
const defaults=()=>[{id:'work',name:'비즈니스',labels:['직업','회사','이메일']},{id:'friends',name:'친구',labels:['Instagram','취미']},{id:'school',name:'학교',labels:['이메일','전화번호']},{id:'games',name:'게임',labels:['Discord']}];
function create(storage,key='damda-organizer-v1'){
function read(){const raw=storage.getItem(key);if(!raw)return {tabs:['미분류'],cards:[],presets:defaults()};const s=JSON.parse(raw);if(!Array.isArray(s.tabs)||!Array.isArray(s.cards)||!Array.isArray(s.presets))throw Error('저장된 명함함을 읽을 수 없어요.');return s;}
function change(fn){const s=read();const result=fn(s);storage.setItem(key,JSON.stringify(s));return result;}
const clean=v=>String(v||'').trim().slice(0,30);
return {read,
add(data,id,tab='미분류'){return change(s=>{if(!s.tabs.includes(tab))throw Error('분류를 먼저 만들어 주세요.');if(s.cards.some(c=>c.id===id))return false;s.cards.unshift({id,tab,data:JSON.parse(JSON.stringify(data)),savedAt:new Date().toISOString()});return true;});},
move(id,tab){change(s=>{if(!s.tabs.includes(tab))throw Error('분류를 확인해 주세요.');const c=s.cards.find(c=>c.id===id);if(c)c.tab=tab;});},
remove(id){change(s=>{s.cards=s.cards.filter(c=>c.id!==id);});},
addTab(name){name=clean(name);if(!name||name==='전체')throw Error('분류 이름을 입력해 주세요.');change(s=>{if(s.tabs.includes(name))throw Error('이미 있는 분류예요.');s.tabs.push(name);});},
renameTab(old,name){name=clean(name);if(!name||name==='전체')throw Error('분류 이름을 입력해 주세요.');change(s=>{if(old==='미분류'||!s.tabs.includes(old)||s.tabs.includes(name))throw Error('다른 분류 이름을 입력해 주세요.');s.tabs=s.tabs.map(t=>t===old?name:t);s.cards.forEach(c=>{if(c.tab===old)c.tab=name;});});},
removeTab(name){change(s=>{if(name==='미분류')return;s.tabs=s.tabs.filter(t=>t!==name);s.cards.forEach(c=>{if(c.tab===name)c.tab='미분류';});});},
preset(id,name,labels,identity){name=clean(name);if(!name)throw Error('프리셋 이름을 입력해 주세요.');change(s=>{if(s.presets.some(p=>p.name===name&&p.id!==id))throw Error('이미 있는 프리셋 이름이에요.');const p={id,name,labels:[...labels],...identity};const i=s.presets.findIndex(p=>p.id===id);if(i<0)s.presets.push(p);else s.presets[i]=p;});},
deletePreset(id){change(s=>{s.presets=s.presets.filter(p=>p.id!==id);});}
};}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.DamDaOrganizer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
