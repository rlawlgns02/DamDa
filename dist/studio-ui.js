'use strict';

// Shared, keyboard-accessible choices replace native dropdowns in every view.
function choiceControl(values,current,{id='',name='',move=''}={}){
  return '<span class="studio-choices"'+(id?' id="'+esc(id)+'"':'')+'>'+values.map(([value,label])=>'<label class="studio-choice"><input type="radio" name="'+esc(name||id||('move-'+move))+'" value="'+esc(value)+'" '+(value===current?'checked ':'')+(id?'data-setting="'+esc(id)+'" ':'')+(move?'data-move-card="'+esc(move)+'" ':'')+'><span>'+label+'</span></label>').join('')+'</span>';
}
function modernChoices(html){
  html=html.replace(/<label[^>]*>([^<]*)(<select\b[\s\S]*?<\/select>)<\/label>/g,'<fieldset class="studio-setting"><legend>$1</legend>$2</fieldset>');
  return html.replace(/<select\b([^>]*)>([\s\S]*?)<\/select>/g,(_,attrs,content)=>{
    const attr=key=>(attrs.match(new RegExp('(?:^|\\s)'+key+'="([^"]*)"'))||[])[1]||'';
    const values=[...content.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m=>({value:(m[1].match(/value="([^"]*)"/)||[])[1]||'',label:m[2],selected:/\bselected\b/.test(m[1])}));
    // Values in generated HTML are already escaped; decode them once for serialization.
    const decode=s=>s.replace(/&(amp|quot|#39|lt|gt);/g,(_,v)=>({amp:'&',quot:'"','#39':"'",lt:'<',gt:'>'}[v]));
    return choiceControl(values.map(v=>[decode(v.value),v.label]),decode((values.find(v=>v.selected)||values[0]||{}).value||''),{id:attr('id'),name:attr('name'),move:decode(attr('data-move-card'))});
  });
}
function settingsButton(){return '<button type="button" class="secondary studio-settings-button" data-studio="settings" aria-haspopup="dialog">⚙ '+tr('설정','Settings')+'</button>';}
function settingsContent(){return '<div class="studio-dialog-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>'+tr('설정','Settings')+'</h2></div><button type="button" class="secondary" data-studio="close-settings">'+tr('닫기','Close')+'</button></div><p class="hint">'+tr('편안하게 사용할 수 있도록 화면을 맞춰보세요.','Make yourself comfortable.')+'</p>'+[
  [tr('화면 모드','Appearance'),choiceControl([['system',tr('시스템 설정','System')],['light',tr('라이트','Light')],['dark',tr('다크','Dark')]],appearance,{id:'appearance'})],
  [tr('언어','Language'),choiceControl([['ko','한국어'],['en','English']],language,{id:'language'})],
  [tr('애니메이션','Animation'),choiceControl([['system',tr('시스템 설정','System')],['reduced',tr('애니메이션 줄이기','Reduce motion')]],motionPreference,{id:'motion-preference'})]
].map(([label,control])=>'<fieldset class="studio-setting"><legend>'+label+'</legend>'+control+'</fieldset>').join('');}
let studioSettingsOpen=false;
function openStudioSettings(){
  let dialog=document.getElementById('studio-settings');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='studio-settings';dialog.className='studio-dialog';dialog.setAttribute('aria-label',tr('설정','Settings'));app.append(dialog);}
  dialog.innerHTML=settingsContent();
  if(!dialog.open)dialog.showModal();
  studioSettingsOpen=true;
  dialog.onclose=()=>{studioSettingsOpen=false;app.querySelector('[data-studio="settings"]')?.focus();};
}
const studioShell=workspaceShell;
workspaceShell=function(page,content){return modernChoices(studioShell(page,content).replace(/<div class="damda-settings">[\s\S]*?<\/div><\/header>/,'<div class="damda-settings">'+settingsButton()+'</div></header>'));};
nav=function(){return '<nav class="organizer-nav"><div>'+(signedIn?'<a href="#home">'+tr('내 명함','My card')+'</a><a href="#book">'+tr('명함함','Collection')+'</a>':'')+'</div><div>'+settingsButton()+'</div></nav>';};
// The motion preference now lives in the settings dialog.
decorate=function(){decorateBeforeMotion();if(studioSettingsOpen)openStudioSettings();};
const studioPresetEditor=presetEditor;
presetEditor=function(){return modernChoices(studioPresetEditor());};

function backDesign(data=profile){
  const raw=data.back||{};
  return {title:String(raw.title??'Nice to meet you.').slice(0,60),message:String(raw.message??'').slice(0,240),color:['blue','dark','mint','light'].includes(raw.color)?raw.color:'blue',pattern:['plain','orbits','grid'].includes(raw.pattern)?raw.pattern:'orbits'};
}
function backFace(data){const b=backDesign(data);return '<div class="business-card identity-card studio-back '+b.color+' pattern-'+b.pattern+'"><div class="identity-brand"><b>DamDa</b><span>THE OTHER SIDE</span></div><div class="studio-back-copy" data-user-content><h3>'+esc(b.title)+'</h3><p>'+esc(b.message)+'</p></div><small>MADE TO CONNECT</small></div>';}
let studioX=0,studioY=0;
const studioFrontCard=card;
card=function(data=profile){return '<div class="studio-card-view"><div class="studio-stage" tabindex="0" role="group" aria-label="'+tr('3D 명함. 드래그하거나 방향키로 회전하세요.','3D card. Drag or use arrow keys to rotate.')+'"><div class="studio-rotator" style="transform:rotateX('+(data===profile?studioX:0)+'deg) rotateY('+(data===profile?studioY:0)+'deg)"><div class="studio-face studio-front">'+studioFrontCard(data)+'</div><div class="studio-face studio-reverse">'+backFace(data)+'</div></div></div><div class="studio-card-tools"><button type="button" data-studio="front">'+tr('앞면','Front')+'</button><button type="button" data-studio="back">'+tr('뒷면','Back')+'</button><button type="button" data-studio="reset">'+tr('회전 초기화','Reset rotation')+'</button></div><p class="studio-drag-hint">'+tr('드래그 · 터치로 돌려보세요','Drag or swipe to explore')+'</p></div>';};
function backEditor(){const b=backDesign();return '<section class="studio-back-editor"><div class="damda-section-title"><h2>'+tr('뒷면 꾸미기','Design the back')+'</h2><span>02 / REVERSE</span></div><p class="hint">'+tr('짧은 인사와 나만의 문구를 담아보세요. 뒷면 내용도 함께 공유됩니다.','Add a greeting or a personal note. The back is shared with your card.')+'</p><label>'+tr('제목','Title')+'<input id="back-title" maxlength="60" value="'+esc(b.title)+'"></label><label>'+tr('소개 문구','Message')+'<textarea id="back-message" rows="3" maxlength="240">'+esc(b.message)+'</textarea></label><fieldset><legend>'+tr('배경색','Background')+'</legend>'+choiceControl([['blue',tr('담다 블루','DamDa blue')],['dark',tr('미드나이트','Midnight')],['mint',tr('민트','Mint')],['light',tr('화이트','White')]],b.color,{id:'back-color'})+'</fieldset><fieldset><legend>'+tr('패턴','Pattern')+'</legend>'+choiceControl([['plain',tr('심플','Plain')],['orbits',tr('서클','Orbits')],['grid',tr('그리드','Grid')]],b.pattern,{id:'back-pattern'})+'</fieldset><button type="button" class="secondary" data-studio="preview-back">'+tr('뒷면 미리보기','Preview back')+'</button></section>';}
const studioDashboard=dashboard;
dashboard=function(){return studioDashboard().replace('</form></section>','</form>'+backEditor()+'</section>');};
const studioSnapshot=selectedSnapshot;
selectedSnapshot=function(){return {...studioSnapshot(),back:backDesign()};};

app.addEventListener('change',e=>{
  const target=e.target,settingId=target.dataset.setting;
  if(!settingId)return;
  if(settingId.startsWith('back-')){profile.back={...backDesign(),[settingId.slice(5)]:target.value};updateCard();return;}
  if(settingId==='share-network'){activeShare.origin=target.value;showShare();return;}
  // Existing change handlers remain the single owners of profile and preferences.
  const proxy=document.createElement('input');proxy.type='hidden';proxy.id=settingId;proxy.value=target.value;app.append(proxy);proxy.dispatchEvent(new Event('change',{bubbles:true}));proxy.remove();
});
app.addEventListener('input',e=>{if(['back-title','back-message'].includes(e.target.id)){profile.back={...backDesign(),[e.target.id.slice(5)]:e.target.value};updateCard();}});
function rotateStudio(view,x,y){const stage=view.querySelector('.studio-stage');stage.dataset.x=x;stage.dataset.y=y;view.querySelector('.studio-rotator').style.transform='rotateX('+x+'deg) rotateY('+y+'deg)';if(view.closest('#live-card')){studioX=x;studioY=y;}}
app.addEventListener('click',e=>{
  const b=e.target.closest('[data-studio]');if(!b)return;
  const action=b.dataset.studio;
  if(action==='settings'){openStudioSettings();return;}
  if(action==='close-settings'){document.getElementById('studio-settings').close();return;}
  const view=action==='preview-back'?app.querySelector('#live-card .studio-card-view'):b.closest('.studio-card-view');if(!view)return;
  rotateStudio(view,0,['back','preview-back'].includes(action)?180:0);
  if(action==='preview-back')view.scrollIntoView({behavior:document.documentElement.dataset.motion==='reduced'?'auto':'smooth',block:'center'});
});
let studioDrag=null;
app.addEventListener('pointerdown',e=>{const stage=e.target.closest('.studio-stage');if(!stage||(e.pointerType==='mouse'&&e.button!==0)||studioDrag)return;const view=stage.closest('.studio-card-view'),live=!!view.closest('#live-card');studioDrag={stage,view,id:e.pointerId,px:e.clientX,py:e.clientY,x:Number(stage.dataset.x||(live?studioX:0)),y:Number(stage.dataset.y||(live?studioY:0))};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
app.addEventListener('pointermove',e=>{const d=studioDrag;if(!d||d.id!==e.pointerId)return;rotateStudio(d.view,Math.max(-75,Math.min(75,d.x-(e.clientY-d.py)*.4)),d.y+(e.clientX-d.px)*.65);});
function endStudioDrag(e){if(studioDrag?.id===e.pointerId){studioDrag.stage.classList.remove('dragging');studioDrag=null;}}
for(const event of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(event,endStudioDrag);
app.addEventListener('keydown',e=>{const stage=e.target.closest('.studio-stage');if(!stage||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();const view=stage.closest('.studio-card-view'),live=!!view.closest('#live-card');let x=Number(stage.dataset.x||(live?studioX:0)),y=Number(stage.dataset.y||(live?studioY:0));if(e.key==='Home'){x=0;y=0;}else if(e.key==='ArrowLeft')y-=15;else if(e.key==='ArrowRight')y+=15;else x=Math.max(-75,Math.min(75,x+(e.key==='ArrowUp'?15:-15)));rotateStudio(view,x,y);});
const studioShowShare=showShare;
showShare=function(){studioShowShare();const select=document.getElementById('share-network');if(select)select.outerHTML=modernChoices(select.outerHTML);};
render();
