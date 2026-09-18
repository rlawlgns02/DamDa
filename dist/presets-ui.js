'use strict';
let presetDraft=null;

function presetIdentity(p){
  return {nameMode:p.nameMode==='nickname'?'nickname':'name',showName:p.showName!==false};
}
function presetMatches(p){
  if(!p)return false;
  const labels=profile.fields.filter(f=>f.selected).map(f=>f.label).sort();
  const expected=p.labels.filter(label=>profile.fields.some(f=>f.label===label)).sort();
  const identity=presetIdentity(p);
  return JSON.stringify(labels)===JSON.stringify(expected)
    &&(profile.nameMode||'name')===identity.nameMode
    &&(profile.showName!==false)===identity.showName;
}
function restorePresetSelection(){
  const presets=guard(()=>organizer.read().presets)||[];
  const saved=presets.find(p=>p.id===profile.presetId);
  selectedPreset=saved?.id||presets.find(presetMatches)?.id||'';
}
function applyPreset(id){
  const p=guard(()=>organizer.read().presets.find(p=>p.id===id));if(!p)return;
  profile.fields.forEach(f=>f.selected=p.labels.includes(f.label));
  Object.assign(profile,presetIdentity(p));
  selectedPreset=id;profile.presetId=id;
  updateCard();render();
}
function editPreset(id){
  const presets=guard(()=>organizer.read().presets);if(!presets)return;
  const p=id?presets.find(p=>p.id===id):null;if(id&&!p)return;
  presetDraft=p?{...p,labels:[...p.labels],...presetIdentity(p)}:{
    id:'',name:'',labels:profile.fields.filter(f=>f.selected).map(f=>f.label),
    nameMode:profile.nameMode||'name',showName:profile.showName!==false
  };
  render();document.getElementById('preset-name')?.focus();
}
function removePreset(id){
  const p=guard(()=>organizer.read().presets.find(p=>p.id===id));if(!p)return;
  if(!confirm(tr('이 프리셋을 삭제할까요?','Delete this preset?')+'\n'+p.name))return;
  if(!guard(()=>{organizer.deletePreset(id);return true;}))return;
  if(selectedPreset===id){selectedPreset='';delete profile.presetId;save('fold-profile',profile);}
  if(presetDraft?.id===id)presetDraft=null;
  render();notify('프리셋을 삭제했어요. 명함 정보는 그대로 유지됩니다.','Preset deleted. Your card details are unchanged.');
}
function savePresetForm(form){
  const values=new FormData(form),name=String(values.get('presetName')||'').trim();
  if(!name){notify('프리셋 이름을 입력해 주세요.');return;}
  const id=presetDraft?.id||newId();
  const labels=values.getAll('presetField').map(String);
  const identity={nameMode:values.get('presetIdentity')==='nickname'?'nickname':'name',showName:values.has('presetShowName')};
  if(!guard(()=>{organizer.preset(id,name,labels,identity);return true;}))return;
  presetDraft=null;applyPreset(id);
  notify('프리셋을 저장하고 적용했어요.','Preset saved and applied.');
}
function currentPresetStatus(){
  const p=guard(()=>organizer.read().presets.find(p=>p.id===selectedPreset));
  if(!p)return tr('공개할 항목을 직접 선택 중이에요.','Choosing details manually.');
  return esc(p.name)+' · '+(presetMatches(p)?tr('적용 중','Applied'):tr('변경됨 · 편집에서 저장할 수 있어요.','Modified · edit to save your changes.'));
}
function presetControls(){
  const presets=guard(()=>organizer.read().presets)||[];
  return '<section class="preset-manager" aria-labelledby="preset-heading"><div class="preset-manager-heading"><h3 id="preset-heading">'+tr('공개 정보 프리셋','Sharing presets')+'</h3><button type="button" class="secondary" data-preset-action="add">'+tr('+ 프리셋 추가','+ Add preset')+'</button></div>'
    +'<p class="hint">'+tr('이름을 누르면 적용됩니다. 편집에서 이름과 공개 항목을 바꿀 수 있어요.','Choose a preset to apply it. Edit its name and shared details.')+'</p>'
    +'<div class="preset-list">'+presets.map(p=>'<div class="preset-item '+(p.id===selectedPreset?'active':'')+'"><button type="button" class="preset-select" data-custom-preset="'+esc(p.id)+'" aria-pressed="'+(p.id===selectedPreset)+'" data-user-content>'+esc(p.name)+'</button><div class="preset-item-actions"><button type="button" data-preset-action="edit" data-preset-id="'+esc(p.id)+'" aria-label="'+esc(p.name)+' '+tr('편집','Edit')+'">'+tr('편집','Edit')+'</button><button type="button" data-preset-action="delete" data-preset-id="'+esc(p.id)+'" aria-label="'+esc(p.name)+' '+tr('삭제')+'">'+tr('삭제')+'</button></div></div>').join('')+'</div>'
    +(presets.length?'':'<p class="hint">'+tr('등록된 프리셋이 없어요. 새 프리셋을 추가해 주세요.','No presets yet. Add your first preset.')+'</p>')
    +'<p class="preset-status" id="preset-status" role="status" data-user-content>'+currentPresetStatus()+'</p>'
    +(presetDraft?presetEditor():'')+'</section>';
}
function presetEditor(){
  const p=presetDraft,editing=Boolean(p.id);
  // Include saved labels which are absent from this profile, so renaming never drops them.
  const labels=[...new Set([...profile.fields.map(f=>f.label),...p.labels])];
  return '<form id="preset-form" class="preset-edit-form"><h4>'+tr(editing?'프리셋 편집':'프리셋 추가',editing?'Edit preset':'Add preset')+'</h4>'
    +'<label class="preset-input-label">'+tr('프리셋 이름')+'<input id="preset-name" name="presetName" maxlength="30" required value="'+esc(p.name)+'" placeholder="'+tr('예: 고객 미팅','e.g. Client meeting')+'"></label>'
    +'<fieldset><legend>'+tr('공개할 정보','Details to share')+'</legend><div class="preset-field-list">'+labels.map(label=>'<label><input type="checkbox" name="presetField" value="'+esc(label)+'" '+(p.labels.includes(label)?'checked':'')+'><span data-user-content>'+esc(tr(label))+'</span></label>').join('')+'</div></fieldset>'
    +'<div class="preset-identity"><label>'+tr('공개 이름')+'<select name="presetIdentity">'+options([['name','이름'],['nickname','닉네임']],p.nameMode)+'</select></label><label class="check-label"><input type="checkbox" name="presetShowName" '+(p.showName?'checked':'')+'>'+tr('이름 공개')+'</label></div>'
    +'<div class="tool-row"><button type="submit" class="primary">'+tr('저장하고 적용','Save and apply')+'</button><button type="button" class="secondary" data-preset-action="cancel">'+tr('취소')+'</button>'
    +(editing?'<button type="button" class="secondary" data-preset-action="use-current">'+tr('현재 공개 설정 가져오기','Use current selection')+'</button>':'')+'</div></form>';
}
app.addEventListener('click',e=>{
  const b=e.target.closest('button[data-preset-action]');if(!b)return;
  switch(b.dataset.presetAction){
    case 'add':editPreset('');break;
    case 'edit':editPreset(b.dataset.presetId);break;
    case 'delete':removePreset(b.dataset.presetId);break;
    case 'cancel':presetDraft=null;render();break;
    case 'use-current':if(presetDraft){presetDraft.labels=profile.fields.filter(f=>f.selected).map(f=>f.label);presetDraft.nameMode=profile.nameMode||'name';presetDraft.showName=profile.showName!==false;render();}break;
  }
});
app.addEventListener('input',e=>{const t=e.target;if(!presetDraft)return;if(t.id==='preset-name')presetDraft.name=t.value;});
app.addEventListener('change',e=>{
  const t=e.target;if(!presetDraft)return;
  if(t.name==='presetField'){presetDraft.labels=t.checked?[...new Set([...presetDraft.labels,t.value])]:presetDraft.labels.filter(label=>label!==t.value);}
  if(t.name==='presetIdentity')presetDraft.nameMode=t.value;
  if(t.name==='presetShowName')presetDraft.showName=t.checked;
});
app.addEventListener('submit',e=>{if(e.target.id==='preset-form'){e.preventDefault();savePresetForm(e.target);}});
const updateBeforePresets=updateCard;
updateCard=function(){updateBeforePresets();const status=document.getElementById('preset-status');if(status)status.innerHTML=currentPresetStatus();};
window.DamDaPresetControls=presetControls;
restorePresetSelection();
render();

