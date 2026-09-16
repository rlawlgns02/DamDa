const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {once}=require('node:events');
const {createServer}=require('./server.cjs');
const {normalizeCard}=require('./card-store.cjs');
const {vcard,png}=require('./dist/card-export.js');
const QRCode=require('qrcode');
async function main(){
  const directory=await fs.mkdtemp(path.join(__dirname,'.sharing-test-'));
  let server=createServer({directory});
  try{
    server.listen(0,'127.0.0.1');await once(server,'listening');
    let base='http://127.0.0.1:'+server.address().port;
    const input={name:'숨겨진 이름',showName:false,theme:'dark',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1kAAAAASUVORK5CYII=',fields:[{label:'이메일',value:'public@example.com',selected:true},{label:'전화번호',value:'PRIVATE-PHONE',selected:false},{label:'메모',value:'한글, 세미콜론; 줄바꿈\n그리고 다음 줄',selected:true}]};
    const create=await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(input)});
    assert.equal(create.status,201);const {id}=await create.json();assert.match(id,/^[a-f0-9]{36}$/);
    const data=await (await fetch(base+'/api/cards/'+id)).json();
    assert.equal(data.name,'');assert.equal(data.photo,input.photo);assert.equal(data.theme,'dark');assert(!JSON.stringify(data).includes('PRIVATE-PHONE'));assert(!JSON.stringify(data).includes('숨겨진 이름'));
    const disk=await fs.readFile(path.join(directory,id+'.json'),'utf8');assert(!disk.includes('PRIVATE-PHONE'));
    const target=base+'/#card?id='+id;
    const qr=await fetch(base+'/api/cards/'+id+'/qr?origin='+encodeURIComponent(base)+'&download=1');
    assert.equal(qr.headers.get('content-type'),'image/png');assert.match(qr.headers.get('content-disposition'),/attachment/);
    const actual=Buffer.from(await qr.arrayBuffer());assert(actual.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert(actual.equals(await QRCode.toBuffer(target,{type:'png',width:600,margin:4,errorCorrectionLevel:'M'})));
    assert.equal((await fetch(base+'/api/cards/'+id+'/qr?origin=https://example.com')).status,400);
    assert.equal((await fetch(base+'/api/cards/'+'0'.repeat(36))).status,404);
    assert.equal((await fetch(base+'/data/cards/'+id+'.json')).status,404);
    assert.equal((await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(input)})).status,403);
    assert.equal((await fetch(base+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:'broken'})).status,400);
    assert.throws(()=>normalizeCard({...input,photo:'https://example.com/image.jpg'}));
    assert.throws(()=>normalizeCard({...input,fields:[],photo:''}));
    const contact=vcard(data);assert(contact.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));assert(contact.includes('EMAIL;TYPE=INTERNET:public@example.com'));assert(!contact.includes('PRIVATE-PHONE'));assert(!contact.includes('숨겨진 이름'));assert(contact.includes('\\n'));assert(contact.includes('\\,'));assert(contact.includes('\\;'));
    const long=vcard({name:'테스트',fields:[{label:'메모',value:'가'.repeat(120),selected:true}]});assert(long.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
    // Exercise exported PNG layout with long Korean content, without a browser dependency.
    const draw=[];const ctx={font:'',measureText:s=>({width:s.length*31}),fillRect(){},strokeRect(){},fillText:(text,x,y)=>draw.push({text,x,y}),beginPath(){},moveTo(){},lineTo(){},stroke(){}};
    const canvas={width:0,height:0,getContext:()=>ctx,toBlob:cb=>cb(new Blob(['png'],{type:'image/png'}))};
    global.document={createElement:()=>canvas};
    const image=await png({name:'한글 이름',theme:'dark',fields:[{label:'메모',value:'가나다라'.repeat(30),selected:true}]});assert.equal(image.type,'image/png');assert(draw.every(p=>p.y<canvas.height));assert(draw.filter(p=>p.text.includes('가')).length>1);delete global.document;
    await new Promise(resolve=>server.close(resolve));server=createServer({directory});server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
    const persisted=await (await fetch(base+'/api/cards/'+id)).json();assert.deepEqual(persisted,data);
    console.log('PASS: card API, selected-field privacy, photos, QR PNG/link correspondence, missing/malformed cards, origin checks, persistence after restart, vCard escaping/UTF-8, image text wrapping.');
  }finally{if(server.listening)await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(directory);assert(resolved.startsWith(path.resolve(__dirname)+path.sep+'.sharing-test-'));await fs.rm(resolved,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
