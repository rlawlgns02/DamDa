'use strict';
const organizer=DamDaOrganizer.create({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)});
let bookTab='전체',selectedPreset='';
const baseToast=toast,baseError=error;
const baseRender=render,baseDashboard=dashboard,baseCard=card,baseSnapshot=selectedSnapshot,baseReceived=renderReceived,baseSharePanel=showShare;
function setting(k,d){try{return localStorage.getItem(k)||d;}catch{return d;}}
let language=setting('damda-language','ko'),appearance=setting('damda-appearance','system');
function tr(ko,en){return language==='en'?(en||window.DamDaEnglish?.[ko]||ko):ko;}
function notify(ko,en){toast(tr(ko,en));}
function guard(fn){try{return fn();}catch(e){notify(e.name==='QuotaExceededError'||e.name==='SecurityError'?'브라우저 저장 공간이 부족하거나 차단되어 있어요.':e.message);return false;}}
toast=function(message){baseToast(tr(message));};
error=function(message){baseError(tr(message));};
function localize(){document.documentElement.lang=language;if(language!=='en')return;const walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{if(n.parentElement.closest('.business-card,[data-user-content]'))return;const s=n.textContent.trim(),v=window.DamDaEnglish?.[s];if(v)n.textContent=n.textContent.replace(s,v);});app.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{for(const k of ['placeholder','aria-label']){const v=window.DamDaEnglish?.[el.getAttribute(k)];if(v)el.setAttribute(k,v);}});}
function applyAppearance(){document.documentElement.dataset.appearance=appearance==='dark'||(appearance==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}
applyAppearance();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyAppearance);
function displayProfile(d){return {...d,name:d.nameMode==='nickname'?(d.nickname||''):d.name};}
card=function(data=profile){const d=displayProfile(data),size={small:40,medium:56,large:80}[data.photoSize]||48,radius={circle:'50%',rounded:'16px',square:'0'}[data.photoShape]||'50%';return baseCard(d).replace('class="profile-photo"','class="profile-photo" style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+'"');};
selectedSnapshot=function(){return {...baseSnapshot(),name:profile.showName===false?'':displayProfile(profile).name,photoShape:profile.photoShape||'circle',photoSize:profile.photoSize||'medium'};};
function options(values,current){return values.map(([v,label])=>'<option value="'+esc(v)+'" '+(v===current?'selected':'')+'>'+esc(tr(label))+'</option>').join('');}
dashboard=function(){
let html=baseDashboard(),presets=guard(()=>organizer.read().presets)||[];
html=html.replace(/<div class="segmented presets"[\s\S]*?<\/div>/,'<div class="segmented presets">'+presets.map(p=>'<button data-custom-preset="'+esc(p.id)+'" class="'+(p.id===selectedPreset?'active':'')+'">'+esc(tr(p.name))+'</button>').join('')+'</div><details class="preset-editor"><summary>'+tr('프리셋 관리')+'</summary><p class="hint">'+tr('현재 선택한 공개 항목과 이름 설정을 저장해요.')+'</p><label>'+tr('프리셋 이름')+'<input id="preset-name" maxlength="30" value="'+esc(presets.find(p=>p.id===selectedPreset)?.name||'')+'"></label><div class="tool-row"><button class="secondary" data-extra="preset-new">'+tr('새 프리셋 저장')+'</button><button class="secondary" data-extra="preset-update" '+(selectedPreset?'':'disabled')+'>'+tr('선택한 프리셋 덮어쓰기')+'</button><button class="text-button" data-extra="preset-delete" '+(selectedPreset?'':'disabled')+'>'+tr('프리셋 삭제')+'</button></div></details>');
html=html.replace('<div class="info-row">','<div class="profile-settings"><label>'+tr('닉네임')+'<input id="profile-nickname" maxlength="30" value="'+esc(profile.nickname||'')+'"></label><label>'+tr('공개 이름')+'<select id="name-mode">'+options([['name','이름'],['nickname','닉네임']],profile.nameMode||'name')+'</select></label><label>'+tr('사진 모양')+'<select id="photo-shape">'+options([['circle','원형'],['rounded','둥근 사각형'],['square','사각형']],profile.photoShape||'circle')+'</select></label><label>'+tr('사진 크기')+'<select id="photo-size">'+options([['small','작게'],['medium','보통'],['large','크게']],profile.photoSize||'medium')+'</select></label></div><div class="info-row">');
return html;
};
function nav(){return '<nav class="organizer-nav" aria-label="DamDa"><div>'+(signedIn?'<a href="#home">'+tr('내 명함')+'</a><a href="#book">'+tr('명함함')+'</a>':'')+'</div><div><label>'+tr('화면 모드')+' <select id="appearance">'+options([['system','시스템 설정'],['light','라이트'],['dark','다크']],appearance)+'</select></label><label>'+tr('언어')+' <select id="language">'+options([['ko','한국어'],['en','English']],language)+'</select></label></div></nav>';}
function decorate(){const h=app.querySelector('header');if(h&&!app.querySelector('.organizer-nav'))h.insertAdjacentHTML('afterend',nav());localize();}
function resumeSave(){const pending=read('damda-pending-card',null);if(!signedIn||!pending)return;if(guard(()=>{organizer.add(pending.data,pending.id);sessionStorage.removeItem('damda-pending-card');return true;})){location.hash='book';notify('받은 명함을 명함함에 저장했어요.','Card saved to your collection.');}}
render=function(){if(signedIn)resumeSave();if(location.hash.split('?')[0]==='#book'){if(!signedIn){location.hash='login';return;}renderBook();}else baseRender();decorate();};
renderReceived=async function(){await baseReceived();if(receivedCard&&location.hash.startsWith('#card'))app.querySelector('.download-actions')?.insertAdjacentHTML('beforeend','<button class="secondary" data-extra="save-received">'+tr('명함함에 저장')+'</button>');decorate();};
showShare=function(){baseSharePanel();app.querySelector('.share-actions')?.insertAdjacentHTML('beforeend','<button class="secondary" data-extra="save-own">'+tr('저장 후 공유')+'</button>');localize();};
function newId(){if(crypto.randomUUID)return 'local-'+crypto.randomUUID();return 'local-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');}
function renderBook(){
const s=guard(()=>organizer.read());if(!s){app.innerHTML=header(true)+'<main class="workspace"><p role="alert">'+tr('브라우저 저장 공간이 부족하거나 차단되어 있어요.')+'</p></main>';return;}
if(bookTab!=='전체'&&!s.tabs.includes(bookTab))bookTab='전체';
const cards=s.cards.filter(c=>bookTab==='전체'||c.tab===bookTab);
app.innerHTML=header(true)+'<main class="workspace"><div class="workspace-title"><span class="eyebrow">COLLECTION</span><h1>'+tr('명함함')+'</h1><p>'+tr('이 브라우저에 저장됩니다. 다른 기기와 동기화되지 않아요.')+'</p></div><div class="tool-row category-tabs">'+['전체',...s.tabs].map(t=>'<button class="secondary '+(bookTab===t?'active':'')+'" data-book-tab="'+esc(t)+'" aria-pressed="'+(bookTab===t)+'">'+esc(tr(t))+' <small>'+(t==='전체'?s.cards.length:s.cards.filter(c=>c.tab===t).length)+'</small></button>').join('')+'</div><form id="tab-form" class="tool-row"><input name="tab" aria-label="'+tr('새 분류')+'" placeholder="'+tr('새 분류')+'" maxlength="30" required><button class="secondary">'+tr('분류 추가')+'</button>'+(!['전체','미분류'].includes(bookTab)?'<button type="button" class="text-button" data-extra="rename-tab">'+tr('분류 이름 변경')+'</button><button type="button" class="text-button" data-extra="delete-tab">'+tr('분류 삭제')+'</button>':'')+'</form><section class="book-grid">'+(cards.length?cards.map(c=>'<article class="surface book-entry">'+card(c.data)+'<label>'+tr('분류')+'<select data-move-card="'+esc(c.id)+'">'+options(s.tabs.map(t=>[t,t]),c.tab)+'</select></label><div class="tool-row"><button class="secondary" data-export-card="'+esc(c.id)+'" data-format="png">'+tr('PNG 저장')+'</button><button class="secondary" data-export-card="'+esc(c.id)+'" data-format="vcf">'+tr('연락처 저장 (VCF)')+'</button><button class="text-button" data-remove-card="'+esc(c.id)+'">'+tr('삭제')+'</button></div></article>').join(''):'<div class="empty-state"><h2>'+tr('아직 저장한 명함이 없어요.')+'</h2><p>'+tr('QR 링크로 받은 명함을 명함함에 저장해 보세요.')+'</p></div>')+'</section></main>'+footer;
}
app.addEventListener('input',e=>{if(e.target.id==='profile-nickname'){profile.nickname=e.target.value;updateCard();}});
app.addEventListener('change',e=>{const t=e.target;if(t.id==='appearance'){appearance=t.value;guard(()=>localStorage.setItem('damda-appearance',appearance));applyAppearance();}if(t.id==='language'){language=t.value;guard(()=>localStorage.setItem('damda-language',language));render();}const keys={'name-mode':'nameMode','photo-shape':'photoShape','photo-size':'photoSize'};if(keys[t.id]){profile[keys[t.id]]=t.value;updateCard();}if(t.dataset.moveCard){guard(()=>organizer.move(t.dataset.moveCard,t.value));render();}});
app.addEventListener('click',async e=>{
const t=e.target.closest('button');if(!t)return;
if(t.dataset.customPreset){applyPreset(t.dataset.customPreset);return;}
if(t.dataset.bookTab){bookTab=t.dataset.bookTab;render();return;}
if(t.dataset.removeCard){if(confirm(tr('저장한 명함을 삭제할까요?','Delete this saved card?'))){guard(()=>organizer.remove(t.dataset.removeCard));render();}return;}
if(t.dataset.exportCard){const c=guard(()=>organizer.read().cards.find(c=>c.id===t.dataset.exportCard));if(c){t.disabled=true;try{const f=t.dataset.format,blob=f==='png'?await DamDaExport.png(c.data):new Blob([DamDaExport.vcard(c.data)],{type:'text/vcard;charset=utf-8'});DamDaExport.download(blob,DamDaExport.filename(c.data,f));}catch(e){notify(e.message);}finally{t.disabled=false;}}return;}
switch(t.dataset.extra){
case 'preset-new':case 'preset-update':{const id=t.dataset.extra==='preset-new'?newId():selectedPreset,name=document.getElementById('preset-name').value;if(guard(()=>{organizer.preset(id,name,profile.fields.filter(f=>f.selected).map(f=>f.label),{nameMode:profile.nameMode||'name',showName:profile.showName!==false});return true;})){selectedPreset=id;render();}break;}
case 'preset-delete':if(confirm(tr('이 프리셋을 삭제할까요?','Delete this preset?'))){guard(()=>organizer.deletePreset(selectedPreset));selectedPreset='';render();}break;
case 'save-received':{if(!receivedCard)break;const id=receivedCardId();if(!signedIn){if(guard(()=>{sessionStorage.setItem('damda-pending-card',JSON.stringify({data:receivedCard,id}));return true;}))location.hash='signup';}else if(guard(()=>{organizer.add(receivedCard,id);return true;}))location.hash='book';break;}
case 'save-own':{if(!activeShare)break;const state={...activeShare};try{const data=await api('/api/cards/'+state.id);if(!signedIn)return;organizer.add(data,state.id);const url=state.origin+'/#card?id='+state.id;if(navigator.share)await navigator.share({title:'DamDa',url});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notify('저장하고 링크를 복사했어요.','Saved. Link copied.');}else{document.getElementById('share-url')?.select();notify('저장했어요. 선택한 링크를 복사해 주세요.','Saved. Copy the selected link.');}}catch(e){if(e.name!=='AbortError')notify(e.message);}break;}
case 'rename-tab':{const name=prompt(tr('분류 이름 변경'),bookTab);if(name!==null&&guard(()=>{organizer.renameTab(bookTab,name);return true;})){bookTab=name.trim().slice(0,30);render();}break;}
case 'delete-tab':if(confirm(tr('분류를 삭제하면 명함은 미분류로 이동합니다.'))){guard(()=>organizer.removeTab(bookTab));bookTab='전체';render();}break;


}});
function receivedCardId(){const id=new URLSearchParams(location.hash.split('?')[1]).get('id');return /^[a-f0-9]{36}$/.test(id)?id:'legacy-'+location.hash.slice(6);}
app.addEventListener('submit',e=>{
if(e.target.id==='signup-form'&&completed&&read('damda-pending-card',null)){signedIn=true;save('fold-session',true);render();}
if(e.target.id==='tab-form'){e.preventDefault();if(guard(()=>{organizer.addTab(new FormData(e.target).get('tab'));return true;}))render();}

});
render();

