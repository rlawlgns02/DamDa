
const fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild');
async function buildPages(){
 const checked=JSON.parse((await fs.readFile(path.join(__dirname,'config/supabase.json'),'utf8')).replace(/^\uFEFF/,''));
 const config={url:process.env.DAMDA_SUPABASE_URL||checked.url,key:process.env.DAMDA_SUPABASE_PUBLISHABLE_KEY||checked.key};
 const url=new URL(config.url);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/')throw Error('A valid Supabase project URL is required.');
 let publicKey=config.key.startsWith('sb_publishable_');
 if(config.key.startsWith('eyJ')){try{publicKey=JSON.parse(Buffer.from(config.key.split('.')[1],'base64url')).role==='anon';}catch{publicKey=false;}}
 if(!publicKey)throw Error('Only a Supabase publishable or anon key may be used in a browser build.');
 const out=path.resolve(__dirname,'_site');
 // Only this fixed generated directory is replaced; source and legacy test assets stay intact.
 if(path.dirname(out)!==path.resolve(__dirname))throw Error('Invalid build output directory.');
 await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
 const assets=['index.html','design.css','mark.svg','icon.svg','lab-sans.woff2','font-LICENSE.txt','card-export.js','card-model.js','account-client.js','modern-app.js','production-ui.js','mockup.html','mockup.js','mockup.css','damda-logo.png'];
 await Promise.all(assets.map(file=>fs.copyFile(path.join(__dirname,'dist',file),path.join(out,file))));
 const index=await fs.readFile(path.join(out,'index.html'),'utf8');
 const csp="default-src 'self'; script-src 'self'; connect-src 'self' "+url.origin+"; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'";
 await fs.writeFile(path.join(out,'index.html'),index.replace('<html lang="ko">','<html lang="ko" data-hosting="cloud">').replace('<head>','<head>\n<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="'+csp+'">').replace('<!-- APP_SCRIPTS -->',"<script src=\"runtime-config.js\" defer></script><script src=\"supabase-browser.js\" defer></script><script src=\"qr-browser.js\" defer></script><script src=\"card-export.js\" defer></script><script src=\"card-model.js\" defer></script><script src=\"account-client.js\" defer></script><script src=\"modern-app.js\" defer></script><script src=\"production-ui.js\" defer></script>"));
 await fs.writeFile(path.join(out,'runtime-config.js'),'window.DamDaCloudConfig='+JSON.stringify(config)+';\n');
 await esbuild.build({entryPoints:[require.resolve('qrcode/lib/browser')],outfile:path.join(out,'qr-browser.js'),bundle:true,platform:'browser',format:'iife',globalName:'DamDaQR',minify:true,legalComments:'eof'});
 await esbuild.build({entryPoints:[require.resolve('@supabase/supabase-js')],outfile:path.join(out,'supabase-browser.js'),bundle:true,platform:'browser',format:'iife',globalName:'supabase',minify:true,legalComments:'eof'});
 await fs.copyFile(require.resolve('qrcode/license'),path.join(out,'qrcode-LICENSE.txt'));
 await fs.writeFile(path.join(out,'.nojekyll'),'');console.log('GitHub Pages build: _site/');
}
if(require.main===module)buildPages().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={buildPages};

