const fs=require('node:fs'),vm=require('node:vm'),{DOMParser}=require('linkedom');
const {fixture,client}=require('./helpers.cjs');
function documentClient(kind,count=1,long=false){
 const seed=fixture();
 Object.assign(seed.empresa,{razao:'Restaurante Exemplo Ltda.',fantasia:'Restaurante Exemplo',cnpj:'00.000.000/0001-00',rua:'Rua de Teste',numero:'123',bairro:'Centro',cidade:'Cabedelo',uf:'PB'});
 seed.configGerais.valesTransporte=[{rota:'Centro',valor:'5,00'}];seed.configGerais.adiantamentoQuinzena='500,00';
 if(kind==='mensal')Object.assign(seed.categorias[0],{tipoPagamento:'mensal_sem_carteira',recebeContracheque:false});
 seed.funcionarios=Array.from({length:count},(_,i)=>({...seed.funcionarios[0],id:'f'+i,nome:`Pessoa ${String(i+1).padStart(2,'0')} ${long?'Maria da Conceição Albuquerque Vasconcelos de Oliveira e Silva':'Fictícia'}`,salario:'2500,50',historicoSalarios:[{vigencia:'0000-01',valor:'2500,50'}],vtRota:'Centro',admissao:'2024-02-01',temControlePonto:true,ctps:'123456',gratificacao:'150,25',temGratificacao:true,descontaPassagem:true,recebeINSSProvento:true}));
 const c=client(seed);let html='';
 c.ctx.RHDocuments={open:()=>({document:{write:s=>{html+=s;},close(){}},print(){},close(){}})};
 c.run('garantirPermissao=()=>true; salvarBanco=()=>{}; gerarPreviaReciboMensal=()=>{}; db.funcionarios.forEach(f=>itensSelecionados.add(f.id));');
 for(const field of ['vtMesRef','quinzenaMesRef','pontoMesRef','reciboMesRef'])c.e(field).value='2026-10';
 for(const field of ['vtDataPagto','quinzenaDataPagto'])c.e(field).value='2026-10-15';
 c.e('reciboVTMesRef').value='2026-11';
 c.generate=()=>{c.run(({vt:'gerarListaAjusteVT();executarPrintVT()',quinzena:'executarPrintQuinzena()',ponto:'executarPrintPonto()',mensal:'imprimirRecibosMensaisSelecionados()'})[kind]);if(!html)throw Error('Documento não gerado: '+c.alerts.join(';'));return html;};
 return c;
}
function renderer(overrides={}){
 const ctx=vm.createContext({console,DOMParser,TextEncoder,TextDecoder,Uint8Array,Uint32Array,Int32Array,ArrayBuffer,DataView,Blob,atob,btoa,navigator:{userAgent:'test'},setTimeout:()=>1,clearTimeout,URL,alert(){},...overrides});ctx.window=ctx;ctx.self=ctx;
 for(const path of ['js/vendor/jspdf.umd.min.js','js/vendor/jspdf.plugin.autotable.min.js','js/documentos.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
 return ctx;
}
module.exports={documentClient,renderer};
