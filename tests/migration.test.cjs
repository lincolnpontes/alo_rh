const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {fixture,environment,S,P}=require('./helpers.cjs');
function setup(options={}){
 const bank=fixture();if(options.noPin)delete bank.administradores[0].senha;
 const original=JSON.stringify(bank,null,2),files=[],props={RH_SOURCE_FILE_ID:'source'};let released=false,reads=0;
 if(options.configured)props.RH_STATE_FILE_ID='existing';
 const source={getBlob:()=>({getDataAsString:()=>++reads>1&&options.race?original+' ':original})};
 const folder={createFolder:()=>folder,getId:()=> 'backups',createFile:(name,text)=>{const file={name,text,getId:()=>name,getBlob:()=>({getDataAsString:()=>options.corrupt&&name==='estado-seguro.json'?'{}':text})};files.push(file);return file;}};
 const env=environment();const ctx=vm.createContext({console:{log(){}},RHService:S,RHProtocol:P,CryptoJS:{SHA256:v=>({toString:()=>crypto.createHash('sha256').update(v).digest('hex')})},LockService:{getScriptLock:()=>({tryLock:()=>!options.busy,releaseLock:()=>released=true})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperties:p=>Object.assign(props,p)})},DriveApp:{getFileById:()=>source,createFolder:()=>folder},MimeType:{PLAIN_TEXT:'text/plain'}});
 vm.runInContext(fs.readFileSync('server/apps-script-adapter.js','utf8'),ctx);ctx.rhEnvironment_=()=>env;
 return {run:()=>ctx.prepararCopiaSegura(),files,props,original,bank,released:()=>released};
}
test('migration keeps exact original backup, restores all business fields and preserves PIN',()=>{
 const g=setup();g.run();assert(g.released());assert.equal(g.files[0].text,g.original);
 const restored=JSON.parse(g.files[0].text);assert.deepEqual(restored,g.bank);
 const state=JSON.parse(g.files.find(f=>f.name==='estado-seguro.json').text);
 assert.deepEqual(state.bank,P.clean(require('../js/modelo.js').normalizarBanco(restored)));
 assert.equal(state.schema,3);assert.equal(state.bank.administradores[0].senha,undefined);
 const env=environment(),service=S.create(state,env);assert.equal(service.handle({action:'login',profileId:'a',pin:'1234',secret:env.random()}).profile.id,'a');
 assert.equal(g.props.RH_STATE_FILE_ID,'estado-seguro.json');
});
for(const [label,options] of [['changed source',{race:true}],['corrupt written copy',{corrupt:true}],['missing manager PIN',{noPin:true}],['existing destination',{configured:true}],['busy lock',{busy:true}]])test('migration refuses '+label+' without activating a new bank',()=>{
 const g=setup(options);assert.throws(g.run);assert.equal(g.props.RH_STATE_FILE_ID,options.configured?'existing':undefined);if(!options.busy)assert(g.released());
});
test('existing three-digit PIN survives migration but new PINs require at least four digits',()=>{
 const bank=fixture();bank.administradores[0].senha='123';const env=environment(),state=S.migrate(bank,env),service=S.create(state,env),secret=env.random();
 const login=service.handle({action:'login',profileId:'a',pin:'123',secret});assert.equal(login.profile.id,'a');
 service.handle({action:'verify-pin',pin:'123',secret,session:login.token});
 assert.throws(()=>service.handle({action:'save-profile',profile:{id:'new',nome:'Novo acesso',permissoes:{}},pin:'123',secret,session:login.token}),/quatro a doze/);
});
