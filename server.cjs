const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const QRCode = require('qrcode');
const {createStore} = require('./card-store.cjs');
const root = path.resolve(__dirname,'dist');
function networkAddresses() {
  return Object.entries(os.networkInterfaces()).flatMap(([name,list])=>list.filter(i=>i.family==='IPv4'&&!i.internal).map(i=>({name,address:i.address}))).sort((a,b)=>Number(/virtual|vethernet|vmware|vpn|wsl/i.test(a.name))-Number(/virtual|vethernet|vmware|vpn|wsl/i.test(b.name)));
}
function createServer({directory=path.join(__dirname,'data','cards')}={}) {
  const store=createStore(directory);
  const server=http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy','no-referrer');
    let url;
    try {url=new URL(req.url,'http://localhost');} catch {return json(400,{error:'잘못된 주소예요.'});}
    const origins=[`http://127.0.0.1:${server.address().port}`,`http://localhost:${server.address().port}`,...networkAddresses().map(n=>`http://${n.address}:${server.address().port}`)];
    if(req.method==='POST' && req.headers.origin && !origins.includes(req.headers.origin)) return json(403,{error:'이 앱에서 명함을 만들어 주세요.'});
    try {
      if(url.pathname==='/api/network'&&req.method==='GET') return json(200,{networks:networkAddresses().map(n=>({name:n.name,origin:`http://${n.address}:${server.address().port}`}))});
      if(url.pathname==='/api/cards'&&req.method==='POST') {
        if(!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON 형식이 필요해요.'});
        const chunks=[];let size=0;
        for await (const chunk of req) {size+=chunk.length;if(size>3000000){json(413,{error:'사진 크기를 줄여 주세요.'});return;}chunks.push(chunk);}
        let raw;try{raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'명함 정보를 읽을 수 없어요.'});}
        try {const saved=await store.save(raw);return json(201,{id:saved.id});}catch(error){if(error.code)throw error;return json(400,{error:error.message});}
      }
      const match=url.pathname.match(/^\/api\/cards\/([a-f0-9]{36})(\/qr)?$/);
      if(match&&req.method==='GET') {
        const data=await store.get(match[1]);if(!data)return json(404,{error:'명함을 찾을 수 없어요. 공유한 사람에게 새 링크를 요청해 주세요.'});
        if(match[2]) {
          const origin=url.searchParams.get('origin');
          if(!origins.includes(origin))return json(400,{error:'공유 주소를 확인해 주세요.'});
          const target=origin+'/#card?id='+match[1];
          const png=await QRCode.toBuffer(target,{type:'png',width:600,margin:4,errorCorrectionLevel:'M'});
          res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store',...(url.searchParams.has('download')?{'Content-Disposition':'attachment; filename="DamDa-QR.png"'}:{})}).end(png);return;
        }
        return json(200,data);
      }
      if(url.pathname.startsWith('/api/'))return json(404,{error:'요청한 기능을 찾을 수 없어요.'});
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
      const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      try {
        let bytes=await fs.readFile(file);
        if(file===path.join(root,'index.html')){
          const styles=['style.css','enhancements.css','workspace.css','motion.css','studio.css'];
          const scripts=['organizer.js','i18n.js','sharing-ui.js','card-export.js','app.js','enhancements.js','workspace-view.js','presets-ui.js','motion.js','studio-ui.js'];
          bytes=Buffer.from(bytes.toString('utf8').replace('<link rel="stylesheet" href="design.css">',styles.map(src=>'<link rel="stylesheet" href="'+src+'">').join('')).replace('<!-- APP_SCRIPTS -->',scripts.map(src=>'<script src="'+src+'" defer></script>').join('')).replace(' popover="manual"',''));
        }
        res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(req.method==='HEAD'?undefined:bytes);
      } catch {res.writeHead(404).end('Not found');}
    }catch(error){console.error('DamDa request failed:',error.code||error.message);if(!res.headersSent)json(500,{error:'저장 공간이나 서버 상태를 확인하고 다시 시도해 주세요.'});else res.end();}
  });
  return server;
}
if(require.main===module){
  const server=createServer();let port=Number(process.env.PORT||5173),retries=0;
  if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT must be an integer between 1 and 65535.');process.exit(1);}
  server.on('error',error=>{if(error.code==='EADDRINUSE'&&retries++<10&&port<65535){console.log(`Port ${port} is already in use. Trying ${++port}...`);server.listen(port,'0.0.0.0');return;}console.error(`Unable to start DamDa: ${error.message}`);process.exitCode=1;});
  server.on('listening',()=>{console.log(`DamDa: http://127.0.0.1:${port}`);networkAddresses().forEach(n=>console.log(`Same Wi-Fi (${n.name}): http://${n.address}:${port}`));});
  server.listen(port,'0.0.0.0');
}
module.exports={createServer};
