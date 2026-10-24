const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {server,client}=require('./helpers.cjs');
function harness(){
 const s=server(),c=client(),stored=new Map([['alorh_internal_session_v3',JSON.stringify(s.login)],['alorh_device_secret_v2',s.secret]]),requests=[];
 let expired=0,intercept;class Clock extends Date{static now(){return s.env.now();}}
 Object.assign(c.ctx,{window:c.ctx,Date:Clock,RH_CONFIG:{local:true,endpoint:'/__dev__/api'},RHStore:{reserve:async()=>{}},RHApp:{expired:()=>expired++},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)}});
 const answer=body=>{try{return {ok:true,...s.svc.handle(body)};}catch(e){return {ok:false,code:e.code,message:e.message};}};
 c.ctx.fetch=async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);const value=intercept?await intercept(body,answer):answer(body);return {ok:true,json:async()=>value};};
 vm.runInContext(fs.readFileSync('js/autenticacao.js','utf8'),c.ctx);
 return{s,c,requests,stored,auth:c.ctx.RHAuth,intercept:fn=>intercept=fn,expired:()=>expired};
}
test('a lost refresh response retries the same persisted rotation without logging out',async()=>{
 const h=harness();h.s.env.advance(31*60000);let lose=true;
 h.intercept((body,answer)=>{const result=answer(body);if(body.action==='refresh'&&lose){lose=false;throw Error('Resposta perdida');}return result;});
 await assert.rejects(h.auth.request('status'),/perdida/);assert.equal(h.expired(),0);assert(h.stored.has('alorh_internal_session_v3'));
 assert.equal((await h.auth.request('status')).revision,h.s.state.revision);const renewals=h.requests.filter(r=>r.action==='refresh');assert.equal(renewals.length,2);assert.equal(renewals[0].requestId,renewals[1].requestId);assert.equal(h.expired(),0);
});
test('a delayed request using a rotated access token retries with the new token',async()=>{
 const h=harness();let release,arrived;const started=new Promise(r=>arrived=r);let first=true;
 h.intercept(async(body,answer)=>{if(body.action==='status'&&first){first=false;arrived();await new Promise(r=>release=r);}return answer(body);});
 const old=h.auth.request('status');await started;h.s.env.advance(29.5*60000);await h.auth.request('status');release();assert.equal((await old).revision,h.s.state.revision);assert.equal(h.expired(),0);assert.equal(h.requests.filter(r=>r.action==='refresh').length,1);
});
test('a delayed signout cannot block the login screen or clear a new profile',async()=>{
 const h=harness();let release;h.intercept(async(body,answer)=>{if(body.action==='signout')await new Promise(r=>release=r);return answer(body);});
 await h.auth.leave();assert(!h.stored.has('alorh_internal_session_v3'));assert.equal(h.auth.profile(),null);
 await h.auth.authenticateProfile('a','1234');const fresh=JSON.parse(h.stored.get('alorh_internal_session_v3')).token;release();await new Promise(setImmediate);
 assert.equal(JSON.parse(h.stored.get('alorh_internal_session_v3')).token,fresh);assert.equal(h.auth.profile().id,'a');assert.equal(h.expired(),0);
});
test('old unauthorized replies cannot log out a newly selected profile',async()=>{
 const h=harness();let release,arrived;const started=new Promise(r=>arrived=r);let first=true;
 h.intercept(async(body,answer)=>{if(body.action==='status'&&first){first=false;arrived();await new Promise(r=>release=r);return {ok:false,code:'unauthorized',message:'Antiga'};}return answer(body);});
 const old=h.auth.request('status');await started;await h.auth.leave();await h.auth.authenticateProfile('a','1234');release();await assert.rejects(old,e=>e.code==='session_changed');assert.equal(h.auth.profile().id,'a');assert.equal(h.expired(),0);
});
test('concurrent requests share one token renewal',async()=>{const h=harness();h.s.env.advance(31*60000);await Promise.all([h.auth.request('status'),h.auth.request('read')]);assert.equal(h.requests.filter(r=>r.action==='refresh').length,1);assert.equal(h.expired(),0);});
test('a truly revoked session still locks the app instead of retrying forever',async()=>{const h=harness();h.s.call('signout');await assert.rejects(h.auth.request('status'),e=>e.code==='unauthorized');assert.equal(h.expired(),1);assert(!h.stored.has('alorh_internal_session_v3'));assert.equal(h.requests.length,2);});
test('refresh retries require the same request, device and two-minute retry window',()=>{
 const s=server(),requestId=crypto.randomUUID(),body={action:'refresh',secret:s.secret,refreshToken:s.login.refreshToken,requestId};const first=s.svc.handle(body),again=s.svc.handle(body);assert.deepEqual(again,first);
 assert.throws(()=>s.svc.handle({...body,requestId:crypto.randomUUID()}),/novamente/);assert.throws(()=>s.svc.handle({...body,secret:s.env.random()}),/novamente/);
 const serialized=JSON.stringify(s.state.security);assert(!serialized.includes(first.token));assert(!serialized.includes(first.refreshToken));assert(!serialized.includes(body.refreshToken));
 s.env.advance(120001);assert.throws(()=>s.svc.handle(body),/novamente/);assert(s.svc.handle({action:'status',session:first.token,secret:s.secret}).revision);
});
test('signout also revokes the retry path and cannot resurrect a rotated session',()=>{const s=server(),body={action:'refresh',secret:s.secret,refreshToken:s.login.refreshToken,requestId:crypto.randomUUID()},next=s.svc.handle(body);s.svc.handle({action:'signout',secret:s.secret,session:next.token});assert.throws(()=>s.svc.handle(body),/novamente/);});
test('routine revision poll can prepare the next PIN challenge without disclosing a verifier',()=>{const s=server(),result=s.call('status',{prepareLogin:true});assert.equal(result.nextLogin.profileId,'a');assert(result.nextLogin.challenge.nonce);assert(!JSON.stringify(result).includes(s.state.security.credentials.a.hash));assert(!result.bank);});
