const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(native=true){
 const messages=[],listeners={},nodes={};const window={open:()=> 'browser',...(native?{AloRHNative:{postMessage:value=>messages.push(JSON.parse(value))}}:{})};
 const ctx={window,document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>nodes[id],querySelector:()=>null,querySelectorAll:()=>[]},location:{href:'https://appassets.androidplatform.net/assets/index.html'},URL,Map,JSON,setTimeout,clearTimeout,alert(){},getComputedStyle:()=>({display:'none'})};
 vm.runInNewContext(fs.readFileSync('js/android.js','utf8'),ctx);return{window,messages,listeners,nodes};
}
test('browser printing remains unchanged when native bridge is absent',()=>{const c=setup(false);assert.equal(c.window.open(),'browser');assert.equal(c.window.RHAndroid,undefined);});
test('native printing waits for print and preserves the complete generated document',()=>{const c=setup(),win=c.window.open('','_blank');win.document.write('<html>');win.document.write('Recibo</html>');win.document.close();assert.equal(c.messages.length,0);win.print();assert.deepEqual(c.messages,[{action:'print',html:'<html>Recibo</html>'}]);});
test('cancelled empty print windows do not start a print job',()=>{const c=setup(),win=c.window.open('','_blank');win.document.write('cancelled');win.close();win.print();assert.equal(c.messages.length,0);});
test('WhatsApp opens externally; browser data stays in the packaged UI',()=>{const c=setup();assert.equal(c.window.open('https://wa.me/5583000000000','_blank'),null);assert.deepEqual(c.messages,[{action:'external',url:'https://wa.me/5583000000000'}]);});
test('Android back closes category and shortcut popovers before leaving',()=>{const c=setup();let closed=0;c.window.RHCabecalho={close:()=>closed++};c.nodes.popoverCategorias={hidden:false};assert.equal(c.window.RHAndroid.back(),true);assert.equal(closed,1);c.nodes.popoverCategorias.hidden=true;c.nodes.menuHeaderMais={hidden:false};assert.equal(c.window.RHAndroid.back(),true);assert.equal(closed,2);});
test('large exports are rejected before allocating a native payload',async()=>{const c=setup();await assert.rejects(c.window.RHAndroid.saveFile({size:8*1024*1024+1},'backup.json'),/8 MB/);assert.equal(c.messages.length,0);});
