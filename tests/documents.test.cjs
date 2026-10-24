const {test}=require('node:test'),assert=require('node:assert/strict');
const {documentClient,renderer}=require('./document-helpers.cjs');
for(const kind of ['vt','quinzena','ponto','mensal'])test(`${kind}: real generator creates a valid A4 PDF with accents, values and one page`,()=>{
 const c=documentClient(kind),html=c.generate(),{pdf,filename}=renderer().RHDocuments.build(html);
 assert.match(filename,/\.pdf$/);assert.equal(pdf.getNumberOfPages(),1);assert.equal(Math.round(pdf.internal.pageSize.getWidth()),210);assert.equal(Math.round(pdf.internal.pageSize.getHeight()),297);
 assert.equal(Buffer.from(pdf.output('arraybuffer')).subarray(0,5).toString(),'%PDF-');
 // Check the actual PDF text drawing operators, before compression. Money remains from the existing calculation.
 const operators=pdf.internal.pages.flat().join('\n');
 assert.match(operators,/Restaurante Exemplo/);assert.match(operators,/Pessoa 01|PESSOA 01/);
 if(kind==='quinzena')assert.match(operators,/500,00/);
 if(kind==='mensal')assert.match(operators,/2\.500,50/);
 if(kind==='ponto')assert.match(operators,/01\/10\/2026 a 31\/10\/2026/);
});
test('multiple employees and long names preserve pagination and the last employee',()=>{
 for(const kind of ['vt','quinzena','ponto','mensal']){
  const {pdf}=renderer().RHDocuments.build(documentClient(kind,kind==='ponto'||kind==='mensal'?2:18,true).generate());
  assert.equal(pdf.getNumberOfPages(),2,kind);assert.match(pdf.internal.pages.flat().join('\n'),kind==='ponto'?/PESSOA 02/:kind==='mensal'?/Pessoa 02/:/Pessoa 18/);
 }
});
test('desktop reserves a tab synchronously and navigates to a real PDF blob for printing',async()=>{
 const target={document:{write(){},close(){}},location:{replace:value=>target.url=value}},blobs=[];
 const c=renderer({open:()=>target,URL:{createObjectURL:blob=>{blobs.push(blob);return'blob:pdf-test';},revokeObjectURL(){}}}),w=c.RHDocuments.open();
 assert.equal(target.opener,null);assert.equal(blobs.length,0);
 w.document.write(documentClient('ponto').generate());await w.print();
 assert.equal(target.url,'blob:pdf-test');assert.equal(blobs[0].type,'application/pdf');
});
test('APK passes the same PDF to the native share bridge without opening a tab',async()=>{
 const jobs=[],c=renderer({RHAndroid:{sharePdf:async(blob,name)=>jobs.push({blob,name})},open:()=>{throw Error('Unexpected popup');}}),w=c.RHDocuments.open();
 w.document.write(documentClient('vt').generate());await w.print();assert.equal(jobs.length,1);assert.equal(jobs[0].blob.type,'application/pdf');assert.match(jobs[0].name,/\.pdf$/);
});
test('browser Document serialization and embedded company logo both produce a PDF',async()=>{
 const {DOMParser}=require('linkedom'),fs=require('node:fs'),jobs=[],alerts=[];
 class BrowserParser {parseFromString(...args){const doc=new DOMParser().parseFromString(...args);doc.toString=()=> '[object HTMLDocument]';return doc;}}
 const c=documentClient('vt');c.ctx.logo='data:image/png;base64,'+fs.readFileSync('icons/alo-rh-v120-192.png').toString('base64');c.run('db.empresa.logo=logo');
 const r=renderer({DOMParser:BrowserParser,RHAndroid:{sharePdf:async blob=>jobs.push(blob)},alert:s=>alerts.push(s)}),w=r.RHDocuments.open();w.document.write(c.generate());await w.print();
 assert.deepEqual(alerts,[]);assert.equal(jobs.length,1);assert.equal(jobs[0].type,'application/pdf');
});
test('blocked desktop popup and cancelled generation explain the problem without exporting',async()=>{
 const alerts=[],c=renderer({open:()=>null,alert:s=>alerts.push(s)}),w=c.RHDocuments.open();w.document.write(documentClient('vt').generate());await w.print();assert.match(alerts[0],/nova aba/);
 const jobs=[],native=renderer({RHAndroid:{sharePdf:async()=>jobs.push(1)}}),cancelled=native.RHDocuments.open();cancelled.document.write(documentClient('vt').generate());cancelled.close();await cancelled.print();assert.equal(jobs.length,0);
});
test('invalid document or remote image fails without loading untrusted resources',()=>{
 const c=renderer();assert.throws(()=>c.RHDocuments.build('<html></html>'),/Nenhuma página/);
 const html=documentClient('vt').generate().replace('<div class="vt-topo">','<div class="vt-topo"><img src="https://untrusted.invalid/logo.png">');
 assert.throws(()=>c.RHDocuments.build(html),/PNG ou JPEG/);
});
test('payroll summary uses native text share in APK and preserves WhatsApp web flow',()=>{
 const c=documentClient('quinzena'),jobs=[];
 c.ctx.window.RHAndroid={shareText:s=>jobs.push(s)};c.run("enviarContrachequeWhatsapp('f0','2026-10','2026-11')");assert.equal(jobs.length,1);assert.match(jobs[0],/Pessoa 01/);assert.match(jobs[0],/2\.500,50/);
 delete c.ctx.window.RHAndroid;c.ctx.window.open=url=>jobs.push(url);c.run("db.funcionarios[0].telefone='83999999999'; enviarContrachequeWhatsapp('f0','2026-10','2026-11')");assert.match(jobs[1],/^https:\/\/wa.me\//);
});
