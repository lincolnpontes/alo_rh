const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};this.value='';this.dataset={};this.classList={add:()=>{}};}
 append(...children){this.children.push(...children);}
 setAttribute(){} focus(){} remove(){this.removed=true;}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 showModal(){this.open=true;} close(){this.open=false;(this.handlers.close||[]).forEach(fn=>fn());}
 querySelector(selector){return this.all().find(el=>el.tagName===selector.toUpperCase());}
 querySelectorAll(selector){return this.all().filter(el=>selector.split(',').includes(el.tagName.toLowerCase()));}
 all(){return this.children.flatMap(el=>[el,...el.all()]);}
}
async function setup(){
 const body=new Element('body');let requests=0,answer;
 const stored={alorh_internal_session_v3:JSON.stringify({bankId:'test-bank'})};
 const context={console,document:{createElement:tag=>new Element(tag),body},crypto:webcrypto,TextEncoder,Uint8Array,AbortController,setTimeout,clearTimeout,Date,JSON,RHStore:{reserve:async()=>{}},RH_CONFIG:{endpoint:'/__dev__/api',local:true},localStorage:{getItem:k=>stored[k]||null,setItem:(k,v)=>stored[k]=v,removeItem:k=>delete stored[k]},fetch:async(_url,options)=>{
 const data=JSON.parse(options.body);if(data.action==='login')return {ok:true,json:async()=>({ok:true,bankId:'test-bank',profile:{id:'a',nome:'Pessoa de teste'},token:'test-token',expires:Date.now()+3600000})};
 if(data.action==='verify-pin'){requests++;return new Promise(resolve=>answer=value=>resolve({ok:true,json:async()=>value}));}throw Error(data.action);
 }};context.window=context;vm.runInNewContext(fs.readFileSync('js/autenticacao.js','utf8'),context);
 await context.RHAuth.authenticateProfile('a','1234');
 return{auth:context.RHAuth,body,get requests(){return requests;},respond:result=>answer(result),modal:()=>body.children[body.children.length-1]};
}
const submit=modal=>modal.querySelector('form').onsubmit({preventDefault(){}});
test('advanced access rejects empty PIN without contacting the server',async()=>{const c=await setup(),result=c.auth.settings(),modal=c.modal();await submit(modal);assert.equal(c.requests,0);modal.close();assert.equal(await result,false);});
test('closing confirmation while verification is pending never unlocks the next dialog',async()=>{
 const c=await setup(),result=c.auth.settings(),modal=c.modal();modal.querySelector('input').value='1234';const sent=submit(modal);modal.close();assert.equal(await result,false);
 c.respond({ok:true,expires:Date.now()+300000});await sent;
 const next=c.auth.settings();assert.notEqual(c.modal(),modal);c.modal().close();assert.equal(await next,false);
});
test('duplicate submits verify once and a rejected PIN can be retried',async()=>{
 const c=await setup(),result=c.auth.settings(),modal=c.modal();modal.querySelector('input').value='111';const first=submit(modal);await submit(modal);assert.equal(c.requests,1);
 c.respond({ok:false,message:'PIN incorreto.'});await first;assert.equal(modal.open,true);assert.equal(modal.querySelector('input').value,'');
 modal.querySelector('input').value='1234';const second=submit(modal);c.respond({ok:true,expires:Date.now()+300000});await second;assert.equal(await result,true);assert.equal(await c.auth.settings(),true);
});
