const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {buildPages}=require('./build-pages.cjs');
async function staticServer(){const root=path.join(__dirname,'_site');const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.replace(/^\/DamDa\//,'');const file=path.resolve(root,name||'index.html');if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(bytes);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));return server;}
(async()=>{
 process.env.DAMDA_SUPABASE_URL='https://damda-test.supabase.co';process.env.DAMDA_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_fixture';await buildPages();
 const server=await staticServer();let browser;
 try{
  browser=await chromium.launch({channel:process.env.DAMDA_BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext();
  const accountId=crypto.randomUUID(),accounts=new Map(),cards=new Map(),calls=[],errors=[];
  const user={id:accountId,aud:'authenticated',role:'authenticated',email:'qa@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:'테스트 사용자'},created_at:new Date().toISOString()};
  const accessToken=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:accountId,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.testsignature';
  const session=()=>({access_token:accessToken,token_type:'bearer',expires_in:3600,refresh_token:'fixture-refresh-token',user});
  let failedSave=false,autoConfirm=false;
  await context.route('https://damda-test.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),body=req.postDataJSON(),method=req.method(),authorized=req.headers().authorization==='Bearer '+accessToken;calls.push({path:url.pathname,method,body});
   const send=(data,status=200)=>route.fulfill({status,headers:{'x-supabase-api-version':'2024-01-01','access-control-allow-origin':'*','access-control-expose-headers':'x-supabase-api-version','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'},contentType:'application/json',body:JSON.stringify(data)});
   if(method==='OPTIONS')return send({});
   const rows=data=>req.headers().accept?.includes('application/vnd.pgrst.object+json')?data.length?send(data[0]):send({code:'PGRST116',details:'The result contains 0 rows',message:'No rows'},406):send(data);
   if(url.pathname==='/auth/v1/token'){if(body.password!=='Correct-password-123!')return send({code:'invalid_credentials',msg:'Invalid login credentials'},400);return send(session());}
   if(url.pathname==='/auth/v1/user'){if(!authorized)return send({code:'bad_jwt'},401);return send(user);}
   if(url.pathname==='/auth/v1/signup')return send(autoConfirm?session():{user,session:null});
   if(['/auth/v1/logout','/auth/v1/recover','/auth/v1/resend'].includes(url.pathname))return send({});
   if(url.pathname==='/rest/v1/damda_accounts'){
    const requested=url.searchParams.get('user_id')?.replace(/^eq\./,'');
    if(!authorized)return send({code:'42501'},403);
    if(method==='GET')return rows(accounts.has(requested)?[accounts.get(requested)]:[]);
    if(method==='POST'){const row={...body};accounts.set(body.user_id,row);return rows([row]);}
    if(method==='PATCH'){if(failedSave)return send({message:'temporary failure'},503);const row=accounts.get(requested);if(!row||String(row.revision)!==url.searchParams.get('revision')?.replace(/^eq\./,''))return rows([]);Object.assign(row,body);return rows([row]);}
   }
   if(url.pathname==='/rest/v1/damda_shared_cards'&&method==='POST'){if(!authorized||body.owner_id!==accountId)return send({code:'42501'},403);const row={...body,id:crypto.randomUUID()};cards.set(row.id,row);return rows([{id:row.id}]);}
   if(url.pathname==='/rest/v1/rpc/damda_get_shared_card')return send(cards.get(body.card_id)?.data||null);
   return send({code:'PGRST205',message:'Table unavailable'},404);
  });
  const base='http://127.0.0.1:'+server.address().port+'/DamDa/',page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.locator('#login-form').waitFor();assert.equal(await page.locator('[data-action="fill-demo"]').count(),0);
  await page.locator('#login-id').fill('qa@example.com');await page.locator('#login-password').fill('wrong');await page.locator('.login-submit').click();await page.getByText('이메일 또는 비밀번호를 확인해 주세요.',{exact:true}).waitFor({timeout:5000}).catch(async e=>{console.log({errors,requests:calls.map(c=>c.path),form:await page.locator('#form-error').textContent()});throw e;});assert.equal(accounts.size,0);
  await page.locator('a[href="#signup"]').first().click();await page.locator('#signup-name').fill('가입 사용자');await page.locator('#signup-email').fill('new@example.com');await page.locator('#signup-password').fill('abcdefgh');assert.match(await page.locator('#signup-password-guide').textContent(),/약함/);await page.locator('#confirm-password').fill('abcdefgh');await page.locator('#signup-form input[type="checkbox"]').check();await page.locator('#signup-form [type="submit"]').click();assert(!calls.some(c=>c.path==='/auth/v1/signup'));await page.locator('#signup-password').fill('Abcdefgh');assert.match(await page.locator('#signup-password-guide').textContent(),/중간/);await page.locator('#signup-password').fill('Correct-password-123!');assert.match(await page.locator('#signup-password-guide').textContent(),/강력/);await page.locator('#confirm-password').fill('Not-the-same-password!');await page.locator('#signup-form input[type="checkbox"]').check();await page.locator('#signup-form [type="submit"]').click();await page.getByText('비밀번호가 일치하지 않아요.',{exact:true}).waitFor();assert(!calls.some(c=>c.path==='/auth/v1/signup'));
  await page.locator('#confirm-password').fill('Correct-password-123!');await page.locator('#signup-form [type="submit"]').click();await page.waitForURL('**/#login');assert(await page.locator('.login-submit').isEnabled());
  await page.locator('#login-id').fill('qa@example.com');await page.locator('#login-password').fill('Correct-password-123!');await page.locator('.login-submit').click();await page.waitForURL('**/#home');await page.locator('#profile-name').waitFor();assert.equal(await page.locator('#profile-name').inputValue(),'테스트 사용자');
  await page.locator('#profile-name').fill('공개 이름');await page.locator('#back-title').fill('계정에 저장된 뒷면');await page.locator('[data-setting="back-color"][value="mint"]').check();await page.waitForFunction(()=>document.getElementById('cloud-save-status')?.textContent==='계정에 저장됨');assert.equal(accounts.get(accountId).profile.back.title,'계정에 저장된 뒷면');
  await page.reload();await page.locator('#profile-name').waitFor();assert.equal(await page.locator('#back-title').inputValue(),'계정에 저장된 뒷면');
  failedSave=true;await page.locator('#back-message').fill('저장 실패 후 복구');await page.waitForFunction(()=>document.getElementById('cloud-save-status')?.dataset.failed==='true');failedSave=false;await page.locator('#cloud-save-status').click();await page.waitForFunction(()=>document.getElementById('cloud-save-status')?.textContent==='계정에 저장됨');assert.equal(accounts.get(accountId).profile.back.message,'저장 실패 후 복구');
  await page.locator('[data-action="share"]').click();await page.locator('#share-url').waitFor();await page.waitForFunction(()=>document.getElementById('share-qr')?.naturalWidth>0);const shared=await page.locator('#share-url').inputValue();assert(shared.startsWith(base+'#card?id='));assert.equal(cards.size,1);
  assert(!JSON.stringify([...cards.values()][0].data).includes('password'));
  const receiver=await context.newPage();receiver.on('pageerror',e=>errors.push(e.message));await receiver.goto(shared);await receiver.locator('.studio-back-copy').waitFor();assert.match(await receiver.locator('.studio-back-copy').textContent(),/계정에 저장된 뒷면/);
  await page.locator('[data-action="logout"]').click();await page.locator('#login-form').waitFor();assert(!await page.evaluate(()=>sessionStorage.getItem('fold-profile')));
  await receiver.reload();await receiver.locator('.studio-back-copy').waitFor();assert.equal(await receiver.locator('[data-action="logout"]').count(),0);
  await page.locator('#login-id').fill('qa@example.com');await page.locator('[data-cloud="forgot"]').click();assert(calls.some(c=>c.path==='/auth/v1/recover'));await page.getByText('이메일을 확인해 주세요. 등록된 계정이라면 안내 메일이 도착합니다.',{exact:true}).waitFor();
  await page.evaluate(()=>sessionStorage.setItem('fold-session','true'));await page.goto(base+'#home');await page.locator('#login-form').waitFor();assert.equal(await page.locator('#profile-name').count(),0);
  autoConfirm=true;await page.locator('a[href="#signup"]').first().click();await page.locator('#signup-name').fill('New user');await page.locator('#signup-email').fill('new@example.com');await page.locator('#signup-password').fill('Abcdefgh');await page.locator('#confirm-password').fill('Abcdefgh');await page.locator('#signup-form input[type="checkbox"]').check();await page.locator('#signup-form [type="submit"]').click();await page.locator('#profile-name').waitFor();assert.equal(await page.locator('[data-cloud="resend"]').count(),0);assert.deepEqual(errors,[]);console.log('PASS (mock Supabase): real SDK session handling, signup validation and confirmation, login failure/success, account autosave/reload/retry, DB-backed short share URL and QR, anonymous received card, signout, reset request, demo-session bypass rejected.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
