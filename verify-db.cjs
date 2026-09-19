const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
  await db.exec(await fs.readFile('supabase/migrations/202609190001_damda.sql','utf8'));
  const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222',cardId='33333333-3333-4333-8333-333333333333';
  await db.query('insert into auth.users(id) values ($1),($2)',[first,second]);
  async function as(role,id,fn){return db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);return fn(tx);});}
  await as('authenticated',first,tx=>tx.query('insert into public.damda_accounts(user_id,profile) values ($1,$2)',[first,{name:'Private A'}]));
  await as('authenticated',second,tx=>tx.query('insert into public.damda_accounts(user_id,profile) values ($1,$2)',[second,{name:'Private B'}]));
  const own=await as('authenticated',first,tx=>tx.query('select user_id from public.damda_accounts'));assert.deepEqual(own.rows,[{user_id:first}]);
  await assert.rejects(()=>as('anon','',tx=>tx.query('select * from public.damda_accounts')),/permission denied/);
  await assert.rejects(()=>as('authenticated',first,tx=>tx.query('insert into public.damda_accounts(user_id) values ($1)',[second])),/row-level security/);
  assert.equal((await as('authenticated',first,tx=>tx.query('update public.damda_accounts set profile=$1 where user_id=$2 returning user_id',[{name:'Intrusion'},second]))).rows.length,0);
  await assert.rejects(()=>as('authenticated',first,tx=>tx.query('update public.damda_accounts set user_id=$1 where user_id=$2',[second,first])),/row-level security/);
  await as('authenticated',first,tx=>tx.query('insert into public.damda_shared_cards(id,owner_id,data) values ($1,$2,$3)',[cardId,first,{name:'Public A',fields:[]}]))
  await assert.rejects(()=>as('anon','',tx=>tx.query('select * from public.damda_shared_cards')),/permission denied/);
  assert.equal((await as('authenticated',second,tx=>tx.query('select * from public.damda_shared_cards'))).rows.length,0);
  const publicCard=await as('anon','',tx=>tx.query('select public.damda_get_shared_card($1) as card',[cardId]));assert.deepEqual(publicCard.rows[0].card,{name:'Public A',fields:[]});
  assert.equal((await as('anon','',tx=>tx.query('select public.damda_get_shared_card($1) as card',[first]))).rows[0].card,null);
  assert.equal((await as('authenticated',second,tx=>tx.query('delete from public.damda_shared_cards where id=$1 returning id',[cardId]))).rows.length,0);
  await assert.rejects(()=>as('authenticated',second,tx=>tx.query('insert into public.damda_shared_cards(owner_id,data) values ($1,$2)',[first,{name:'Spoof'}])),/row-level security/);
  await as('authenticated',first,tx=>tx.query('delete from public.damda_shared_cards where id=$1',[cardId]));
  console.log('PASS (local PostgreSQL): migration, own-account read/write, cross-account denial, anonymous table denial, exact-ID public card RPC, unknown link, owner-only revoke, spoofed owner denial.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
