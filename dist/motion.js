'use strict';
let motionPreference=setting('damda-motion','system');
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
function applyMotion(){
  const reduced=motionPreference==='reduced'||motionQuery.matches;
  document.documentElement.dataset.motion=reduced?'reduced':'full';
}
function motionControl(){
  return '<label class="motion-setting">'+tr('애니메이션','Animation')+'<select id="motion-preference" aria-label="'+tr('애니메이션 설정','Animation preference')+'">'+options([['system',tr('시스템 설정','System setting')],['reduced',tr('애니메이션 줄이기','Reduce motion')]],motionPreference)+'</select></label>';
}
const decorateBeforeMotion=decorate;
decorate=function(){
  decorateBeforeMotion();
  const settings=app.querySelector('.damda-settings')||app.querySelector('.organizer-nav > div:last-child');
  if(settings&&!document.getElementById('motion-preference'))settings.insertAdjacentHTML('beforeend',motionControl());
};
app.addEventListener('change',e=>{
  if(e.target.id!=='motion-preference')return;
  motionPreference=e.target.value==='reduced'?'reduced':'system';
  guard(()=>localStorage.setItem('damda-motion',motionPreference));
  applyMotion();
});
motionQuery.addEventListener('change',applyMotion);
applyMotion();
render();

