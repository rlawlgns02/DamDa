(function(root){
 'use strict';
 const cfg=root.DamDaCloudConfig;
 const client=cfg?.url&&cfg?.key?supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'damda-auth-'+new URL(cfg.url).hostname}}):null;
 let state={phase:'loading',user:null,account:null,dirty:false,saving:false,error:'',recovery:false},listeners=[],timer,version=0,epoch=0,pending=null,authBusy=false,changes={};
 const emit=()=>listeners.forEach(fn=>fn({...state}));
 const reset=()=>{clearTimeout(timer);epoch++;version=0;changes={};pending=null;state={phase:'anonymous',user:null,account:null,dirty:false,saving:false,error:'',recovery:false};};
 const base=()=>location.origin+location.pathname;
 async function load(user){
  if(state.user?.id===user.id&&state.account){state.phase='ready';emit();return;}
  reset();const ticket=epoch;state.user=user;state.phase='loading';emit();
  try{let r=await client.from('damda_accounts').select('profile,organizer,revision').eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;
   if(!r.data){const m=DamDaModel.empty();m.name=user.user_metadata?.display_name||'';m.email=user.email||'';const fresh={user_id:user.id,profile:DamDaModel.toProfile(m),organizer:{cards:[DamDaModel.welcomeCard()],tabs:['미분류'],presets:[]},revision:0};r=await client.from('damda_accounts').insert(fresh).select('profile,organizer,revision').single();if(r.error?.code==='23505')r=await client.from('damda_accounts').select('profile,organizer,revision').eq('user_id',user.id).single();if(r.error)throw r.error;}
   DamDaModel.decode(r.data);if(ticket!==epoch)return;state.account=r.data;state.phase='ready';state.error='';emit();
  }catch(e){if(ticket!==epoch)return;state.phase='error';state.error='계정 정보를 불러오지 못했습니다. 다시 시도해 주세요.';emit();}
 }
 async function flush(){
  const ticket=epoch;
  clearTimeout(timer);if(pending){await pending;if(ticket===epoch&&state.dirty)return flush();return;}
  if(!state.dirty||!state.user||!state.account)return;
  const rev=state.account.revision,uid=state.user.id,sent={...changes},data={revision:rev+1,updated_at:new Date().toISOString()};
  for(const field of Object.keys(sent))data[field]=structuredClone(state.account[field]);
  state.saving=true;emit();
  const request=(async()=>{const r=await client.from('damda_accounts').update(data).eq('user_id',uid).eq('revision',rev).select('revision').maybeSingle();if(ticket!==epoch)return;if(r.error)throw Error('변경 내용을 저장하지 못했습니다. 연결을 확인하고 다시 저장해 주세요.');if(!r.data)throw Error('다른 기기에서 변경된 내용이 있습니다. 현재 내용을 백업한 뒤 다시 불러와 주세요.');state.account.revision=r.data.revision;for(const field of Object.keys(sent))if(changes[field]===sent[field])delete changes[field];state.dirty=Object.keys(changes).length>0;state.error='';})();
  pending=request;
  try{await request;}catch(e){if(ticket===epoch)state.error=e.message;throw e;}finally{if(pending===request)pending=null;if(ticket===epoch){state.saving=false;emit();}}
  if(ticket===epoch&&state.dirty)return flush();
 }
 function save(data){if(state.phase!=='ready'||!state.account)return;let changed=false;for(const field of ['profile','organizer']){if(!Object.hasOwn(data,field)||JSON.stringify(data[field])===JSON.stringify(state.account[field]))continue;state.account[field]=data[field];changes[field]=++version;changed=true;}if(!changed)return;state.dirty=true;state.error='';clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),650);emit();}
 async function init(){
  if(!client){state.phase='error';state.error='서비스 연결 설정을 확인해 주세요.';emit();return;}
  client.auth.onAuthStateChange((event,session)=>setTimeout(()=>{if(event==='PASSWORD_RECOVERY'){state.recovery=true;state.user=session?.user||null;state.phase='recovery';emit();return;}if(event==='SIGNED_OUT'){reset();emit();return;}if(event!=='INITIAL_SESSION'&&session?.user&&!authBusy&&state.phase!=='loading'&&!state.recovery)load(session.user);},0));
  try{const r=await client.auth.getSession();if(r.error)throw r.error;if(r.data.session){const v=await client.auth.getUser();if(v.error)throw v.error;if(new URLSearchParams(location.search).get('auth')==='recovery'||state.recovery){state.user=v.data.user;state.recovery=true;state.phase='recovery';emit();}else await load(v.data.user);}else{state.phase='anonymous';emit();}}catch{reset();state.error='로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.';emit();}
 }
 async function authenticate(fn){if(authBusy)return;authBusy=true;try{return await fn();}finally{authBusy=false;}}
 root.DamDaAccount={get state(){return state;},subscribe(fn){listeners.push(fn);return()=>listeners=listeners.filter(x=>x!==fn);},init,save,flush,
  login(email,password){return authenticate(async()=>{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;await load(r.data.user);});},
  signup(email,password,name){return authenticate(async()=>{const r=await client.auth.signUp({email,password,options:{data:{display_name:name}}});if(r.error)throw r.error;if(r.data.session)await load(r.data.user);else throw Error('가입 후 자동 로그인되지 않았습니다. 기존 계정 또는 관리자에게 가입 설정을 확인해 주세요.');});},
  async logout({discardChanges=false}={}){const ticket=epoch;if(!discardChanges){try{await flush();}catch(e){e.unsavedChanges=true;throw e;}}if(ticket!==epoch)return;clearTimeout(timer);const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;reset();emit();},
  async resetPassword(email){const r=await client.auth.resetPasswordForEmail(email,{redirectTo:base()+'?auth=recovery'});if(r.error)throw r.error;},
  async changePassword(password){const r=await client.auth.updateUser({password});if(r.error)throw r.error;state.recovery=false;history.replaceState(null,'',location.pathname+'#home');await load(r.data.user);},
  retry(){if(state.user)return load(state.user);return init();},
  async publish(data){const ticket=epoch,owner=state.user?.id;if(!owner||state.phase!=='ready')throw Error('먼저 로그인해 주세요.');const snapshot=structuredClone(data);await flush();if(ticket!==epoch||state.user?.id!==owner)throw Error('계정이 변경되었습니다. 다시 공유해 주세요.');const r=await client.from('damda_shared_cards').insert({owner_id:owner,data:snapshot}).select('id').single();if(r.error)throw r.error;if(ticket!==epoch)throw Error('계정이 변경되었습니다. 다시 공유해 주세요.');return r.data.id;},
  async readCard(id){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('올바르지 않은 공유 주소입니다.');const r=await client.rpc('damda_get_shared_card',{card_id:id});if(r.error)throw r.error;if(!r.data)throw Error('명함이 없거나 공유가 종료되었습니다.');DamDaModel.fromSnapshot(r.data);return r.data;},
  async listShares(){const r=await client.from('damda_shared_cards').select('id,data,created_at').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data;},
  async revoke(id){const r=await client.from('damda_shared_cards').delete().eq('id',id);if(r.error)throw r.error;}
 };
 window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
})(window);
