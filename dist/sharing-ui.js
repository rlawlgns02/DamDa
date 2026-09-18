function selectedSnapshot(){return {name:profile.showName===false?'':profile.name,showName:profile.showName!==false,theme:profile.theme,photo:profile.photo||'',fields:profile.fields.filter(f=>f.selected&&f.value.trim()).map(({label,value})=>({label,value}))};}
async function api(path,options){const response=await fetch(path,options);let result;try{result=await response.json();}catch{throw Error('서버를 재시작한 뒤 다시 시도해 주세요.');}if(!response.ok)throw Error(result.error||'요청을 처리하지 못했어요.');return result;}
async function share(){
  if(sharePending)return;
  const data=selectedSnapshot();if(!data.name&&!data.fields.length){toast('명함에 공개할 정보를 하나 이상 선택해 주세요.');return;}
  const revision=shareRevision;const button=document.querySelector('[data-action="share"]');
  sharePending=true;button.disabled=true;button.textContent='명함을 만들고 있어요…';
  try{
    const network=await api('/api/network');
    const saved=await api('/api/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(revision!==shareRevision||!document.getElementById('share-result')){toast('정보가 변경됐어요. 최신 정보로 다시 만들어 주세요.');return;}
    const networks=network.networks||[];
    const isLocal=['localhost','127.0.0.1'].includes(location.hostname);
    const origin=isLocal?(networks[0]?.origin||location.origin):location.origin;
    activeShare={id:saved.id,origin,networks};showShare();
  }catch(error){toast(error.message||'명함을 만들지 못했어요. 다시 시도해 주세요.');}
  finally{sharePending=false;if(button.isConnected){button.disabled=false;button.innerHTML='명함 만들고 공유하기 '+arrow;}}
}
function showShare(){
  const {id,origin,networks}=activeShare;
  const url=origin+'/#card?id='+id;
  const qr='/api/cards/'+id+'/qr?origin='+encodeURIComponent(origin);
  document.getElementById('share-result').innerHTML=`<section class="share-panel"><div class="share-heading"><span class="share-check">✓</span><div><h3>명함이 준비됐어요</h3><p>QR을 스캔하거나 링크를 보내주세요.</p></div></div><div class="qr-frame"><img id="share-qr" src="${esc(qr)}" width="216" height="216" alt="명함을 열 수 있는 공유 QR 코드"></div><p id="qr-error" class="hint" role="status"></p>${networks.length>1?`<label class="network-label" for="share-network">공유에 사용할 Wi-Fi / 네트워크</label><select id="share-network">${networks.map(n=>`<option value="${esc(n.origin)}" ${n.origin===origin?'selected':''}>${esc(n.name)} · ${esc(n.origin)}</option>`).join('')}</select>`:''}<label class="network-label" for="share-url">공유 링크</label><div class="copy-row"><input id="share-url" readonly value="${esc(url)}"><button class="secondary" id="copy-link">복사</button></div><div class="share-actions"><a class="secondary" href="${esc(url)}" target="_blank" rel="noopener">명함 열기</a><a class="secondary" href="${esc(qr)}&download=1" download="DamDa-QR.png">QR 저장 ↓</a>${navigator.share?'<button class="secondary" id="native-share">공유하기</button>':''}</div><p class="hint">같은 Wi-Fi에 연결하고 이 PC의 서버를 켜두세요. 외부 인터넷에서는 열리지 않아요.</p><p class="hint">지금 만든 명함은 고정된 사본이에요. 정보를 수정하면 새로 공유해 주세요.</p></section>`;
  document.getElementById('share-qr').onerror=()=>{document.getElementById('qr-error').textContent='QR을 불러오지 못했어요. 아래 링크로 공유하거나 다시 만들어 주세요.';};
  document.getElementById('copy-link').onclick=async()=>{try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else{const input=document.getElementById('share-url');input.focus();input.select();if(!document.execCommand('copy'))throw Error();}toast('명함 링크를 복사했어요.');}catch{document.getElementById('share-url').select();toast('링크를 길게 누르거나 Ctrl+C로 복사해 주세요.');}};
  const select=document.getElementById('share-network');if(select)select.onchange=()=>{activeShare.origin=select.value;showShare();};
  const native=document.getElementById('native-share');if(native)native.onclick=async()=>{try{await navigator.share({title:'DamDa 명함',url});}catch(error){if(error.name!=='AbortError')toast('링크 복사를 이용해 주세요.');}};
}
async function renderReceived(){
  receivedCard=null;const requested=location.hash;
  app.innerHTML=header()+'<main class="shared"><p class="sub" role="status">명함을 불러오고 있어요…</p></main>'+footer;
  try{
    let data;
    if(requested.startsWith('#card?id=')){
      const id=new URLSearchParams(requested.slice(6)).get('id');if(!/^[a-f0-9]{36}$/.test(id))throw Error('공유 주소를 다시 확인해 주세요.');
      data=await api('/api/cards/'+id);
    }else{
      let raw;try{raw=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(requested.slice(6)),c=>c.charCodeAt(0))));}catch{throw Error('공유 주소를 다시 확인해 주세요.');}
      data={...raw,photo:'',fields:raw.fields?.map(f=>({...f,selected:true}))};
    }
    if(location.hash!==requested)return;
    if(typeof data.name!=='string'||data.name.length>30||!Array.isArray(data.fields)||data.fields.length>30||!data.fields.every(f=>typeof f.label==='string'&&f.label.length<=20&&typeof f.value==='string'&&f.value.length<=120))throw Error('명함 정보가 올바르지 않아요.');
    if(data.photo&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data.photo))throw Error('사진 형식이 올바르지 않아요.');
    receivedCard=data;
    app.innerHTML=header()+`<main class="shared"><div class="eyebrow">NICE TO MEET YOU</div><h1 class="received-title">반가워요, 나의 명함이에요.</h1>${card(data)}<div class="download-actions"><button class="primary" data-action="download-png">명함 이미지 저장 ↓</button><button class="secondary" data-action="download-vcf">연락처 저장 <span>VCF</span></button></div><p class="hint">로그인 없이 저장할 수 있어요. 연락처 파일을 열면 주소록에 추가할 수 있어요.</p><a class="received-cta" href="#login">나도 DamDa 명함 만들기</a></main>`+footer;
  }catch(error){if(location.hash!==requested)return;app.innerHTML=header()+`<main class="shared"><h2>명함을 열 수 없어요</h2><p class="sub">${esc(error.message==='Failed to fetch'?'명함을 공유한 PC가 켜져 있는지, 같은 Wi-Fi에 연결되어 있는지 확인해 주세요.':error.message||'공유 링크를 다시 확인해 주세요.')}</p><button class="secondary" data-action="retry-card">다시 시도</button></main>`+footer;}
}
async function downloadReceived(format,button){
  if(!receivedCard)return;const data=receivedCard;button.disabled=true;
  try{const blob=format==='png'?await DamDaExport.png(data):new Blob([DamDaExport.vcard(data)],{type:'text/vcard;charset=utf-8'});DamDaExport.download(blob,DamDaExport.filename(data,format));toast('다운로드를 시작했어요.');}
  catch(error){toast(error.message||'다운로드에 실패했어요. 다시 시도해 주세요.');}finally{button.disabled=false;}
}
