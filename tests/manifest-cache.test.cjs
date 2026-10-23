const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function worker(fetcher,cached){
 const events={},writes=[];
 const ctx=vm.createContext({URL,Response,fetch:fetcher,self:{location:{origin:'https://lincolnpontes.github.io'},registration:{scope:'https://lincolnpontes.github.io/alo_rh/'},addEventListener:(name,fn)=>events[name]=fn},caches:{match:async()=>cached,open:async()=>({put:async(key,value)=>writes.push({key,value:await value.text()})})}});
 vm.runInContext(fs.readFileSync('service-worker.js','utf8'),ctx);
 async function request(url='https://lincolnpontes.github.io/alo_rh/manifest.json'){let reply;const jobs=[];events.fetch({request:{url,method:'GET',mode:'cors'},respondWith:p=>reply=p,waitUntil:p=>jobs.push(p)});const result=await reply;await Promise.all(jobs);return result;}
 return {request,writes};
}
test('installer receives current manifest even when an older manifest is cached',async()=>{
 const w=worker(async()=>new Response('{"name":"Alô RH atualizado"}'),new Response('{"name":"Antigo"}'));
 assert.equal(await(await w.request()).text(),'{"name":"Alô RH atualizado"}');assert.deepEqual(w.writes,[{key:'./manifest.json',value:'{"name":"Alô RH atualizado"}'}]);
});
test('versioned manifest URL refreshes identity and keeps the canonical offline copy',async()=>{
 const manifest=fs.readFileSync('manifest.json','utf8');
 const w=worker(async()=>new Response(manifest),new Response('{"id":"./"}'));
 const current=await(await w.request('https://lincolnpontes.github.io/alo_rh/manifest.json?v=1.3.1')).json();
 assert.equal(current.id,'/alo_rh/');assert.deepEqual(w.writes,[{key:'./manifest.json',value:manifest}]);
});
test('offline installer metadata falls back to the last valid cached manifest',async()=>{
 const w=worker(async()=>{throw Error('offline');},new Response('{"name":"Alô RH"}'));
 assert.equal(await(await w.request()).text(),'{"name":"Alô RH"}');assert.equal(w.writes.length,0);
});
test('HTTP failure cannot replace a valid manifest with an error page',async()=>{
 const w=worker(async()=>new Response('<html>indisponível</html>',{status:503}),new Response('{"name":"Alô RH"}'));
 assert.equal(await(await w.request()).text(),'{"name":"Alô RH"}');assert.equal(w.writes.length,0);
});
test('RH worker never intercepts the installation manifest of another app',async()=>{
 let calls=0;const w=worker(async()=>{calls++;return new Response('{}');});
 assert.equal(await w.request('https://lincolnpontes.github.io/alo_cozinha/manifest.json'),undefined);assert.equal(calls,0);
 const manifest=JSON.parse(fs.readFileSync('manifest.json'));const base='https://lincolnpontes.github.io/alo_rh/';
 assert.equal(new URL(manifest.scope,base).href,base);
});

test('RH installation identity resolves from the start URL origin to its own app path',()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.json'));
 const start=new URL(manifest.start_url,'https://lincolnpontes.github.io/alo_rh/manifest.json');
 // Manifest id uses the start URL origin, unlike scope and start_url.
 // https://www.w3.org/TR/appmanifest/#id-member
 const identity=new URL(manifest.id,start.origin+'/');
 assert.equal(identity.href,'https://lincolnpontes.github.io/alo_rh/');
 assert.equal(start.href,'https://lincolnpontes.github.io/alo_rh/index.html');
});

test('installing RH stays distinct from Feira and Cozinha on the same origin',()=>{
 const origin='https://lincolnpontes.github.io/';
 const manifest=JSON.parse(fs.readFileSync('manifest.json'));
 // Public manifest values inspected on 2026-10-23: Feira id './'; Cozinha has no id.
 const installedIdentities=new Set([
  new URL('./',origin).href,
  new URL('./index.html',origin+'alo_cozinha/manifest.json').href
 ]);
 assert.equal(installedIdentities.has(new URL(manifest.id,origin).href),false);
});
