'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {buildPages}=require('./build-pages.cjs');
(async()=>{
 await buildPages();
 const root=path.resolve('_site');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:process.env.DAMDA_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-prod=guest-start]').click();
 assert.equal(await page.evaluate(()=>collection.filter(c=>c.id==='damda-welcome-v1').length),1);
 await page.reload();await page.locator('[data-prod=guest-start]').click();assert.equal(await page.evaluate(()=>collection.filter(c=>c.id==='damda-welcome-v1').length),1);
 await page.locator('a[href="#book"]').click();await page.locator('[data-prod=collection-delete]').click();await page.locator('[data-modal-all]').check();page.once('dialog',d=>d.accept());await page.locator('#modal-apply').click();
 await page.reload();await page.locator('[data-prod=guest-start]').click();assert.equal(await page.evaluate(()=>collection.length),0);
 await page.evaluate(()=>{collection=Array.from({length:15},(_,i)=>({...structuredClone(model),id:'fixture-'+i,name:'연결 '+i,company:'담다',group:i<8?'동료':'친구'}));persist();location.hash='book';});
 await page.locator('[data-prod=category-add]').click();await page.locator('[name=category]').fill('프로젝트');await page.locator('#category-form .primary').click();assert.equal(await page.locator('[data-filter=프로젝트]').count(),1);
 await page.locator('[data-prod=category-add]').click();await page.locator('[name=category]').fill('프로젝트');await page.locator('#category-form .primary').click();assert.match(await page.locator('#form-error').innerText(),/다른 분류/);await page.locator('[data-action=close-dialog]').click();
 await page.locator('[data-prod=collection-edit]').click();await page.locator('[data-modal-folder=동료]').click();await page.locator('[data-modal-all]').check();await page.locator('[data-modal-folder=친구]').click();await page.locator('[data-modal-card="fixture-8"]').check();assert.equal(await page.locator('#modal-selection-count').innerText(),'9개 선택');assert(await page.locator('[data-modal-all]').evaluate(el=>el.indeterminate));
 await page.locator('#modal-category').selectOption('프로젝트');await page.locator('#modal-apply').click();assert.equal(await page.evaluate(()=>collection.filter(c=>c.group==='프로젝트').length),9);
 await page.locator('[data-prod=category-manage]').click();await page.locator('[data-category-input]').first().fill('작업');await page.locator('[data-category-rename]').first().click();assert.equal(await page.evaluate(()=>collection.filter(c=>c.group==='작업').length),9);
 page.once('dialog',d=>d.dismiss());await page.locator('[data-category-delete=작업]').click();assert.equal(await page.locator('[data-category-delete=작업]').count(),1);
 page.once('dialog',d=>d.accept());await page.locator('[data-category-delete=작업]').click();await page.locator('[data-action=close-dialog]').click();assert.equal(await page.evaluate(()=>collection.filter(c=>c.group==='미분류').length),9);
 await page.locator('[data-prod=collection-delete]').click();await page.locator('[data-modal-folder=미분류]').click();await page.locator('[data-modal-all]').check();page.once('dialog',d=>d.dismiss());await page.locator('#modal-apply').click();assert.equal(await page.evaluate(()=>collection.length),15);page.once('dialog',d=>d.accept());await page.locator('#modal-apply').click();assert.equal(await page.evaluate(()=>collection.length),6);
 await page.reload();await page.locator('[data-prod=guest-start]').click();await page.locator('a[href="#book"]').click();assert.equal(await page.evaluate(()=>collection.length),6);
 assert.equal(await page.locator('.collection-bulk,.collection-select').count(),0);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-prod=collection-edit]').click();assert(await page.locator('#modal-apply').isDisabled());assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.locator('[data-action=close-dialog]').click();}
 await page.setViewportSize({width:1440,height:1000});await page.locator('.collection-preview').first().click();
 const normalWidth=await page.locator('.detail-card').evaluate(el=>el.getBoundingClientRect().width);
 await page.locator('#card-group').selectOption('__new__');await page.locator('#card-group-new').fill('작성 중 분류');
 await page.locator('[data-prod=collection-enlarge]').click();assert(await page.locator('#dialog').evaluate(el=>el.classList.contains('collection-viewer')));
 const stage=page.locator('.collection-viewer .card-object');assert((await stage.boundingBox()).width>normalWidth);
 const ownAngle=await page.evaluate(()=>JSON.stringify(angle)),box=await stage.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+120,box.y+box.height/2+60,{steps:8});await page.mouse.up();
 assert.equal(await stage.getAttribute('data-rx'),'-30');assert.equal(await stage.getAttribute('data-ry'),'72');assert.equal(await page.evaluate(()=>JSON.stringify(angle)),ownAngle);
 await stage.focus();await page.keyboard.press('ArrowRight');assert.equal(await stage.getAttribute('data-ry'),'87');await page.keyboard.press('Home');assert.equal(await stage.getAttribute('data-ry'),'0');
 await page.locator('[data-prod=collection-flip]').click();assert.equal(await stage.getAttribute('data-ry'),'180');await page.locator('[data-prod=collection-reset]').click();assert.equal(await stage.getAttribute('data-ry'),'0');
 assert.equal(await page.locator('#card-group-new-row').isVisible(),false);await page.waitForFunction(()=>getComputedStyle(document.querySelector('.collection-viewer .card-rotator')).transform==='matrix(1, 0, 0, 1, 0, 0)');
 await fs.mkdir('.tmp-browser',{recursive:true});await page.screenshot({path:'.tmp-browser/collection-viewer-desktop.png'});
 await page.keyboard.press('Escape');assert(await page.locator('#dialog').evaluate(el=>el.open&&!el.classList.contains('collection-viewer')));assert.equal(await page.locator('#card-group-new').inputValue(),'작성 중 분류');
 await page.locator('[data-prod=collection-enlarge]').click();await page.setViewportSize({width:390,height:844});assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.collection-viewer .card-rotator')).transform==='matrix(1, 0, 0, 1, 0, 0)');await page.screenshot({path:'.tmp-browser/collection-viewer-mobile.png'});await page.locator('[data-action=close-dialog]').click();
 const touchContext=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),touchPage=await touchContext.newPage();touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto('http://127.0.0.1:'+server.address().port);await touchPage.locator('[data-prod=guest-start]').tap();await touchPage.locator('a[href="#book"]').tap();await touchPage.locator('.collection-preview').first().tap();await touchPage.locator('[data-prod=collection-enlarge]').tap();
 const touchStage=touchPage.locator('.collection-viewer .card-object'),tb=await touchStage.boundingBox(),cdp=await touchContext.newCDPSession(touchPage);const tx=tb.x+tb.width/2,ty=tb.y+tb.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+70,y:ty+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(Math.abs(Number(await touchStage.getAttribute('data-ry')))>20);assert(Math.abs(Number(await touchStage.getAttribute('data-rx')))>10);assert.equal(await touchStage.evaluate(el=>el.classList.contains('dragging')),false);await touchContext.close();
 console.log('PASS enlarged viewer: mouse/touch rotation, retained angles, flip/reset, keyboard, independent state, preserved category draft and responsive layouts.');
 assert.deepEqual(errors,[]);console.log('PASS collection: category validation, cross-folder selection, bulk move, rename/delete, delete cancellation, persistence and responsive dialogs.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
