'use strict';
if(!profile.photoShape)profile.photoShape='rounded';
if(!profile.photoSize)profile.photoSize='medium';

// Production views based on the approved DamDa mockup.
// The existing event handlers own profile, preset, sharing and collection actions.
function profileAvatar(data=profile,extra=''){
  const d=displayProfile(data),size={small:40,medium:56,large:80}[data.photoSize]||56;
  const radius={circle:'50%',rounded:'20%',square:'0'}[data.photoShape]||'20%';
  const style='width:'+size+'px;height:'+size+'px;border-radius:'+radius;
  return data.photo
    ? '<img class="profile-photo damda-avatar '+extra+'" src="'+esc(data.photo)+'" alt="'+tr('프로필 사진')+'" style="'+style+'">'
    : '<span class="damda-avatar '+extra+'" style="'+style+'" aria-hidden="true">'+esc(data.showName===false?'D':(d.name||'D').slice(0,2))+'</span>';
}

card=function(data=profile){
  const d=displayProfile(data),theme=['blue','dark','mint'].includes(data.theme)?data.theme:'light';
  const fields=data.fields.filter(f=>f.selected!==false&&f.value.trim());
  const summary=fields.filter(f=>['직업','회사'].includes(f.label));
  const details=fields.filter(f=>!['직업','회사'].includes(f.label));
  return '<div class="business-card identity-card '+theme+'"><div class="identity-brand"><b>DamDa</b><span>MY DIGITAL CARD</span></div>'
    +profileAvatar(data,'identity-avatar')
    +(data.showName===false?'':'<h3>'+esc(d.name)+'</h3>')
    +summary.map(f=>'<p class="identity-summary"><span class="sr-only">'+esc(f.label)+': </span>'+esc(f.value)+'</p>').join('')
    +'<div class="card-info">'+(details.length?details.map(f=>'<span><small>'+esc(f.label)+'</small><span>'+esc(f.value)+'</span></span>').join(''):!fields.length?'<span>'+tr('공개할 정보를 선택해 주세요.')+'</span>':'')+'</div></div>';
};

function workspaceShell(page,content){
  const current=page==='book'?'명함함':'내 명함';
  return '<div class="damda-shell"><aside class="damda-sidebar"><a class="damda-logo" href="#home" aria-label="DamDa '+tr('내 명함')+'"><img src="damda-logo.png" alt=""><span>DamDa<small>'+tr('나를 담다. 연결을 담다.','Keep your identity. Keep your connections.')+'</small></span></a>'
    +'<nav class="damda-pages" aria-label="'+tr('나의 워크스페이스')+'"><a href="#home" '+(page==='home'?'class="active" aria-current="page"':'')+'><span>'+tr('내 명함')+'</span><small>01</small></a><a href="#book" '+(page==='book'?'class="active" aria-current="page"':'')+'><span>'+tr('명함함')+'</span><small>02</small></a></nav>'
    +'<div class="damda-account"><div id="sidebar-avatar">'+profileAvatar(profile)+'</div><div><b id="sidebar-name" data-user-content>'+esc(displayProfile(profile).name||'DamDa')+'</b><small>'+tr('나의 워크스페이스')+'</small></div><button class="text-button" data-action="logout">'+tr('로그아웃')+'</button></div></aside>'
    +'<div class="damda-content"><header class="damda-topbar"><div class="damda-breadcrumb"><span>WORKSPACE</span><span aria-hidden="true">/</span><b>'+tr(current)+'</b></div><div class="damda-settings"><label>'+tr('화면 모드')+'<select id="appearance">'+options([['system','시스템 설정'],['light','라이트'],['dark','다크']],appearance)+'</select></label><label>'+tr('언어')+'<select id="language">'+options([['ko','한국어'],['en','English']],language)+'</select></label></div></header>'
    +'<main class="damda-main">'+content+'</main><footer class="damda-footer"><span>'+tr('담고 싶은 나, 이어지는 우리.','Your identity. Our connection.')+'</span><b>DamDa</b></footer></div></div>';
}

function presetControls(){return window.DamDaPresetControls?window.DamDaPresetControls():'';}

dashboard=function(){
  const content='<div class="damda-heading"><div><p class="eyebrow">YOUR IDENTITY, YOUR WAY</p><h1>'+tr('오늘의 나를 담아보세요.','Share who you are today.')+'</h1><p>'+tr('만나는 사람에 맞춰, 전하고 싶은 만큼.','Share the details that matter for each introduction.')+'</p></div><button class="primary" data-action="share" '+(sharePending?'disabled':'')+'>'+tr('명함 저장하고 공유','Save and share card')+'</button></div>'
    +'<div class="damda-editor"><section class="damda-profile" aria-labelledby="profile-heading"><div class="damda-section-title"><h2 id="profile-heading">'+tr('나의 프로필','My profile')+'</h2><span>01 / PROFILE</span></div>'
    +'<div class="damda-photo-editor"><div id="profile-avatar">'+profileAvatar(profile)+'</div><div><b>'+tr('나를 보여주는 한 장','A photo that represents you')+'</b><p>'+tr('프로필 사진을 자유롭게 꾸며보세요.','Make your profile photo your own.')+'</p><div class="photo-actions"><button class="secondary" data-ui="choose-photo">'+tr('사진 변경','Change photo')+'</button><button class="text-button" data-action="remove-photo">'+tr('사진 없이')+'</button></div><input type="file" id="photo" accept="image/png,image/jpeg,image/webp" hidden></div></div>'
    +'<div class="damda-form-grid"><label>'+tr('사진 모양')+'<select id="photo-shape">'+options([['rounded','둥근 사각형'],['circle','원형'],['square','사각형']],profile.photoShape||'rounded')+'</select></label><label>'+tr('사진 크기')+'<select id="photo-size">'+options([['small','작게'],['medium','보통'],['large','크게']],profile.photoSize||'medium')+'</select></label></div>'
    +'<div class="damda-section-divider"></div><div class="damda-section-title"><h2>'+tr('공개할 정보','Details to share')+'</h2><span>'+tr('선택한 정보만 공유해요','Only selected details are shared')+'</span></div>'
    +'<div class="damda-form-grid identity-inputs"><label>'+tr('이름')+'<input type="text" id="profile-name" maxlength="30" value="'+esc(profile.name)+'"></label><label>'+tr('닉네임')+'<input type="text" id="profile-nickname" maxlength="30" value="'+esc(profile.nickname||'')+'"></label></div>'
    +'<div class="damda-name-choice"><label>'+tr('공개 이름')+'<select id="name-mode">'+options([['name','이름'],['nickname','닉네임']],profile.nameMode||'name')+'</select></label><label class="check-label"><input type="checkbox" id="show-name" '+(profile.showName===false?'':'checked')+'>'+tr('이름 공개')+'</label></div>'
    +'<div class="damda-detail-fields">'+profile.fields.map((f,i)=>'<div class="info-row"><input type="checkbox" data-select="'+i+'" aria-label="'+esc(tr(f.label))+' '+tr('공개','visibility')+'" '+(f.selected?'checked':'')+'><label for="info-'+i+'">'+esc(tr(f.label))+'</label><input type="text" id="info-'+i+'" data-field="'+i+'" maxlength="120" value="'+esc(f.value)+'"></div>').join('')+'</div>'
    +'<form id="custom-form" class="custom-add"><input aria-label="'+tr('추가할 항목 이름','New field label')+'" name="label" placeholder="'+tr('항목 이름 (예: GitHub)')+'" maxlength="20" required><button type="submit" class="secondary">'+tr('+ 항목 추가')+'</button></form></section>'
    +'<section class="damda-preview" aria-labelledby="preview-heading"><div class="damda-section-title"><h2 id="preview-heading">'+tr('명함 미리보기')+'</h2><span>LIVE PREVIEW</span></div>'+presetControls()
    +'<div class="template-options" aria-label="'+tr('명함 디자인','Card design')+'">'+[['blue','#243c84','담다 블루'],['light','#ffffff','화이트'],['dark','#192b50','미드나이트'],['mint','#e7f6f1','민트']].map(([v,c,label])=>'<button class="swatch" aria-label="'+tr(label)+'" aria-pressed="'+(profile.theme===v)+'" data-theme="'+v+'" style="background:'+c+'"></button>').join('')+'</div>'
    +'<div id="live-card">'+card()+'</div><div class="damda-preview-caption"><span>MY DIGITAL CARD</span><span>DamDa / 2026</span></div>'
    +'<div class="damda-privacy"><b>'+tr('공유할 정보는 내가 선택해요.','You decide what to share.')+'</b><p>'+tr('저장하면 지금 모습 그대로 명함이 만들어집니다.','Saving creates a snapshot of your current card.')+'<br>'+tr('공유 링크와 QR로 간편하게 전하세요.','Share it with a link or QR code.')+'</p></div>'
    +'<a class="damda-collection-link" href="#book">'+tr('받은 명함은 명함함에 차곡차곡','Keep the cards you receive in your collection')+'</a><div id="share-result" aria-live="polite"></div></section></div>';
  return workspaceShell('home',content);
};

renderBook=function(){
  const s=guard(()=>organizer.read());
  if(!s){app.innerHTML=workspaceShell('book','<p role="alert">'+tr('브라우저 저장 공간이 부족하거나 차단되어 있어요.')+'</p>');return;}
  if(bookTab!=='전체'&&!s.tabs.includes(bookTab))bookTab='전체';
  const cards=s.cards.filter(c=>bookTab==='전체'||c.tab===bookTab);
  const content='<div class="damda-heading"><div><p class="eyebrow">PEOPLE YOU KEEP</p><h1>'+tr('좋은 만남을 담아두세요.','Keep your meaningful connections.')+'</h1><p>'+tr('새로운 연결도, 다시 만나고 싶은 사람도 한곳에.','New connections and familiar faces, together.')+'</p></div><div class="damda-count">'+String(s.cards.length).padStart(2,'0')+'<small>'+tr('저장한 명함','Saved cards')+'</small></div></div>'
    +'<div class="tool-row category-tabs" aria-label="'+tr('분류')+'">'+['전체',...s.tabs].map(t=>'<button class="secondary '+(bookTab===t?'active':'')+'" data-book-tab="'+esc(t)+'" aria-pressed="'+(bookTab===t)+'">'+esc(tr(t))+' <small>'+(t==='전체'?s.cards.length:s.cards.filter(c=>c.tab===t).length)+'</small></button>').join('')+'</div>'
    +'<form id="tab-form" class="tool-row damda-category-form"><input name="tab" aria-label="'+tr('새 분류')+'" placeholder="'+tr('새 분류')+'" maxlength="30" required><button class="secondary">'+tr('분류 추가')+'</button>'+(!['전체','미분류'].includes(bookTab)?'<button type="button" class="text-button" data-extra="rename-tab">'+tr('분류 이름 변경')+'</button><button type="button" class="text-button" data-extra="delete-tab">'+tr('분류 삭제')+'</button>':'')+'</form>'
    +'<section class="book-grid">'+(cards.length?cards.map(c=>'<article class="surface book-entry">'+card(c.data)+'<label>'+tr('분류')+'<select data-move-card="'+esc(c.id)+'">'+options(s.tabs.map(t=>[t,t]),c.tab)+'</select></label><div class="tool-row"><button class="secondary" data-export-card="'+esc(c.id)+'" data-format="png">'+tr('PNG 저장')+'</button><button class="secondary" data-export-card="'+esc(c.id)+'" data-format="vcf">'+tr('연락처 저장 (VCF)')+'</button><button class="text-button" data-remove-card="'+esc(c.id)+'">'+tr('삭제')+'</button></div></article>').join(''):'<div class="empty-state"><h2>'+tr('아직 저장한 명함이 없어요.')+'</h2><p>'+tr('QR 링크로 받은 명함을 명함함에 저장해 보세요.')+'</p><a class="secondary" href="#home">'+tr('내 명함 만들기')+'</a></div>')+'</section><p class="hint">'+tr('이 브라우저에 저장됩니다. 다른 기기와 동기화되지 않아요.')+'</p>';
  app.innerHTML=workspaceShell('book',content);
};

decorate=function(){
  const route=location.hash.split('?')[0];
  if(!(signedIn&&['#home','#book'].includes(route))){
    const h=app.querySelector('header');if(h&&!app.querySelector('.organizer-nav'))h.insertAdjacentHTML('afterend',nav());
  }
  localize();
};

const updateBeforeDesign=updateCard;
updateCard=function(){
  updateBeforeDesign();
  for(const id of ['profile-avatar','sidebar-avatar']){const node=document.getElementById(id);if(node)node.innerHTML=profileAvatar(profile);}
  const name=document.getElementById('sidebar-name');if(name)name.textContent=displayProfile(profile).name||'DamDa';
};

const shareBeforeDesign=share;
share=async function(){
  if(sharePending)return;
  const revision=shareRevision,data=selectedSnapshot();
  await shareBeforeDesign();
  if(activeShare&&revision===shareRevision&&signedIn){
    guard(()=>organizer.add(data,activeShare.id));
    const panel=document.getElementById('share-result');panel?.scrollIntoView?.({behavior:document.documentElement.dataset.motion==='reduced'?'auto':'smooth',block:'nearest'});
  }
  const button=app.querySelector('[data-action="share"]');if(button&&!sharePending){button.disabled=false;button.textContent=tr('명함 저장하고 공유','Save and share card');}
};

app.addEventListener('click',e=>{const b=e.target.closest('[data-ui="choose-photo"]');if(b)document.getElementById('photo').click();});
render();


