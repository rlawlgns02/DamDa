'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {buildPages}=require('./build-pages.cjs');
const root=path.join(__dirname,'_site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
async function main(){
 await buildPages();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/'){res.writeHead(302,{Location:'/DamDa/'});return res.end();}
   if(!url.pathname.startsWith('/DamDa/')){res.writeHead(404);return res.end('Not found');}
   const name=decodeURIComponent(url.pathname.slice('/DamDa/'.length))||'index.html';
   const file=path.resolve(root,name),relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden');}
   const real=await fs.realpath(file),realRelative=path.relative(root,real);
   if(realRelative.startsWith('..')||path.isAbsolute(realRelative)){res.writeHead(403);return res.end('Forbidden');}
   const data=await fs.readFile(real);res.writeHead(200,{'Content-Type':mime[path.extname(real)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 server.on('error',e=>{console.error(e.message);process.exitCode=1;});
 server.listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173/DamDa/\nUses configured Supabase. After editing dist/, run npm run build:pages and refresh.'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
