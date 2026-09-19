// Read-only verification of the deployed Supabase configuration and public access rules.
const fs=require('node:fs/promises');
(async()=>{
 const file=JSON.parse((await fs.readFile('config/supabase.json','utf8')).replace(/^\uFEFF/,''));
 const url=process.env.DAMDA_SUPABASE_URL||file.url,key=process.env.DAMDA_SUPABASE_PUBLISHABLE_KEY||file.key;
 if(!url||!key)throw Error('Supabase project URL and publishable key are not configured.');
 const headers={apikey:key,'Content-Type':'application/json'};
 const settings=await fetch(url+'/auth/v1/settings',{headers});if(!settings.ok)throw Error('Supabase authentication configuration is not reachable ('+settings.status+').');
 const auth=await settings.json();if(!auth.external?.email||auth.disable_signup)throw Error('Email/password signup is disabled in Supabase.');
 const card=await fetch(url+'/rest/v1/rpc/damda_get_shared_card',{method:'POST',headers,body:JSON.stringify({card_id:'00000000-0000-0000-0000-000000000000'})});
 if(!card.ok)throw Error('Apply supabase/migrations/202609190001_damda.sql in the target project before deployment.');
 if(await card.json()!==null)throw Error('Unexpected data returned for the empty test ID.');
 for(const table of ['damda_accounts','damda_shared_cards']){const response=await fetch(url+'/rest/v1/'+table+'?select=*&limit=0',{headers});if(![401,403].includes(response.status))throw Error('Anonymous table access was not rejected: '+table+' ('+response.status+').');await response.arrayBuffer();}
 console.log('PASS (live Supabase, read-only): authentication enabled, schema/RPC reachable, unknown card returns null, anonymous table access denied.');
 console.log(auth.mailer_autoconfirm?'Email confirmation is disabled in the project.':'Email confirmation is enabled; configure production SMTP and allowed redirect URLs.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
