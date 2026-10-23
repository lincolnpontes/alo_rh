const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {server,P}=require('./helpers.cjs'),Proof=require('../js/pin-proof.js');
function challenge(s,secret=s.secret){return s.svc.handle({action:'prepare-login',profileId:'a',secret}).challenge;}
const sign=(s,c,pin='1234',secret=s.secret)=>Proof.sign(pin,{bankId:s.state.bankId,profileId:'a',secret},c,crypto.webcrypto);
const login=(s,proof,secret=s.secret)=>s.svc.handle({action:'login',profileId:'a',secret,...proof});

test('native client proof enters with one verification, without sending PIN or derived key',async()=>{
 const s=server(),c=challenge(s),proof=await sign(s,c);s.env.verifyPassword=()=>{throw Error('Slow PBKDF2 must not run on server');};
 assert.deepEqual(Object.keys(proof).sort(),['challenge','proof']);assert.notEqual(proof.proof,s.state.security.credentials.a.hash);
 const answer=login(s,proof);assert.equal(answer.profile.id,'a');assert(answer.token);assert(P.equal(answer.bank,s.state.bank));
});
test('proof is single-use even on retry and cannot cross device or bank',async()=>{
 const s=server(),c=challenge(s),proof=await sign(s,c);
 assert.throws(()=>login(s,proof,s.env.random()),/expirou/);assert(login(s,proof).token);assert.throws(()=>login(s,proof),/expirou/);
 const next=challenge(s),bad=await Proof.sign('1234',{bankId:'another-bank',profileId:'a',secret:s.secret},next,crypto.webcrypto);assert.throws(()=>login(s,bad),/incorreto/);
});
test('wrong proof counts toward shared PIN throttle, including changed device identifiers',async()=>{
 const s=server();for(let i=0;i<3;i++){const secret=s.env.random(),c=challenge(s,secret);assert.throws(()=>login(s,{challenge:c.nonce,proof:'0'.repeat(64)},secret),/incorreto/);}
 assert.throws(()=>challenge(s,s.env.random()),/Muitas/);assert.throws(()=>s.svc.handle({action:'login',profileId:'a',pin:'1234',secret:s.secret}),/Muitas/);
 s.env.advance(31000);assert(login(s,await sign(s,challenge(s))).token);
});
test('challenge expires and changing PIN invalidates already prepared proofs',async()=>{
 const s=server(),c=challenge(s),proof=await sign(s,c);s.env.advance(120001);assert.throws(()=>login(s,proof),/expirou/);
 const next=challenge(s),before=await sign(s,next);s.state.security.credentials.a=s.env.password('5678');assert.throws(()=>login(s,before),/expirou/);
 assert(login(s,await sign(s,challenge(s),'5678')).token);
});
test('deleted people cannot prepare or use a prior challenge',async()=>{
 const s=server(),proof=await sign(s,challenge(s));s.state.bank.administradores=[];assert.throws(()=>login(s,proof),/expirou/);assert.throws(()=>challenge(s),/encontrada/);
});
test('public preparation exposes no credential verifier, session or HR data and is bounded',()=>{
 const s=server(),c=s.svc.handle({action:'info',profileId:'a',secret:s.secret});assert(c.challenge);assert(!JSON.stringify(c).includes(s.state.security.credentials.a.hash));assert(!('bank'in c));assert(!('token'in c));
 const first=challenge(s);assert.equal(challenge(s).nonce,first.nonce);for(let i=0;i<80;i++)challenge(s,s.env.random());assert(Object.keys(s.state.security.challenges).length<=64);
});
test('malformed proof cannot fall back to a supplied correct PIN',()=>{const s=server(),c=challenge(s);assert.throws(()=>login(s,{challenge:c.nonce,proof:'',pin:'1234'}),/incorreto/);});
test('client rejects unexpected work factors and malformed salt before derivation',async()=>{const s=server(),c=challenge(s);await assert.rejects(sign(s,{...c,iterations:1}),/preparar/);await assert.rejects(sign(s,{...c,salt:'broken'}),/preparar/);});
test('Apps Script HMAC agrees with native proof and retains legacy three-digit PIN',async()=>{
 const s=server();s.state.security.credentials.a=s.env.password('123');const c=challenge(s),p=await sign(s,c,'123'),C=require('../server/vendor/crypto-js-4.2.0.js');
 assert.equal(p.proof,C.HmacSHA256(JSON.stringify(['alorh-pin-proof-v1',s.state.bankId,'a',s.secret,c.nonce]),C.enc.Hex.parse(s.state.security.credentials.a.hash)).toString());assert(login(s,p).token);
});
