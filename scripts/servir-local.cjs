const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Service=require('../server/service.js');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||49317);
const privateDir=path.resolve(root,'.local',process.env.RH_LOCAL_DIR||'homologacao');
if(!privateDir.startsWith(path.join(root,'.local')+path.sep))throw new Error('Pasta local inválida.');
fs.mkdirSync(privateDir,{recursive:true});
const stateFile=path.join(privateDir,'estado.json');
const env={now:()=>Date.now(),random:()=>crypto.randomBytes(32).toString('hex'),digest:v=>crypto.createHash('sha256').update(v).digest('hex'),equal:(a,b)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b)),hmac:(value,key)=>crypto.createHmac('sha256',Buffer.from(key,'hex')).update(value).digest('hex'),
 password:value=>{const salt=crypto.randomBytes(32).toString('hex');return {scheme:'pbkdf2-sha256',iterations:120000,salt,hash:crypto.pbkdf2Sync(value,Buffer.from(salt,'hex'),120000,32,'sha256').toString('hex')};},
 verifyPassword:(value,c)=>!!c&&c.iterations===120000&&env.equal(crypto.pbkdf2Sync(value,Buffer.from(c.salt,'hex'),c.iterations,32,'sha256').toString('hex'),c.hash),
 snapshot:state=>fs.writeFileSync(path.join(privateDir,'backup-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.json'),JSON.stringify(state))};
if(!fs.existsSync(stateFile)) {
 const original=JSON.parse(fs.readFileSync(process.env.RH_TEST_BANK||path.join(root,'.local','drive','banco.json'),'utf8').replace(/^\uFEFF/,''));
 const state=Service.migrate(original,env);
 fs.writeFileSync(stateFile,JSON.stringify(state));
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
function send(res,status,body,type='application/json') {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; form-action 'self'; frame-ancestors 'none'"});res.end(body);}
const server=http.createServer(async(req,res)=>{
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return send(res,403,'{}');
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(req.method==='POST'&&pathname==='/__dev__/api') {
  if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return send(res,403,'{}');
  try {let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8*1024*1024)throw Error('Envio muito grande.');}
   const body=JSON.parse(raw),before=fs.readFileSync(stateFile,'utf8'),state=JSON.parse(before);let result;
   // Synchronous critical section: no await between read, validation and atomic rename.
   try{result={ok:true,...Service.create(state,env).handle(body)};}catch(e){result={ok:false,code:e.code||'invalid',message:e.message};}
   if(JSON.stringify(state)!==before){if(state.revision!==JSON.parse(before).revision||state.schema!==JSON.parse(before).schema||JSON.stringify(state.security.credentials)!==JSON.stringify(JSON.parse(before).security.credentials))env.snapshot(JSON.parse(before));fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state));fs.renameSync(stateFile+'.tmp',stateFile);}
   return send(res,200,JSON.stringify(result));
  }catch(e){return send(res,500,JSON.stringify({ok:false,message:'Falha no servidor local. Nenhum envio confirmado.'}));}
 }
 if(!['GET','HEAD'].includes(req.method))return send(res,405,'{}');
 if(pathname==='/__dev__/config.js')return send(res,200,"window.RH_CONFIG={endpoint:'/__dev__/api',local:true};",types['.js']);
 const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
 if(!/^(index\.html|manifest\.json|(?:js|css|icons)\/[a-zA-Z0-9_.\/-]+)$/.test(relative)||relative.includes('..'))return send(res,404,'{}');
 const file=path.join(root,relative);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,'{}');
 let content=fs.readFileSync(file);if(relative==='index.html')content=content.toString().replace('<script src="js/config.js','<script src="/__dev__/config.js"></script>\n<script src="js/config.js').replace("if ('serviceWorker' in navigator)",'if (false)');
 send(res,200,req.method==='HEAD'?'':content,types[path.extname(file)]||'application/octet-stream');
});
server.listen(port,'127.0.0.1',()=>console.log('Alô RH local: http://127.0.0.1:'+port+' — cópia isolada; acesso interno por pessoa e PIN'));
