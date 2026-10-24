(function(global){
    'use strict';
    const bridge=global.AloRHNative;
    if(!bridge?.postMessage)return;
    let sequence=0;const pending=new Map();
    function send(action,data={}){bridge.postMessage(JSON.stringify({action,...data}));}
    bridge.onmessage=event=>{try{const result=JSON.parse(event.data),job=pending.get(result.id);if(job){clearTimeout(job.timer);pending.delete(result.id);result.ok?job.resolve():job.reject(new Error(result.error||'Não foi possível salvar.'));}}catch(_){}};
    function saveFile(blob,name){
        if(blob.size>8*1024*1024)return Promise.reject(new Error('Arquivo maior que 8 MB.'));
        return new Promise((resolve,reject)=>{
            const reader=new FileReader();reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));
            reader.onload=()=>{
                const id='save-'+(++sequence),timer=setTimeout(()=>{pending.delete(id);reject(new Error('O Android não confirmou o arquivo. Confira o destino antes de tentar novamente.'));},300000);
                pending.set(id,{resolve,reject,timer});send('save',{id,name,base64:String(reader.result).split(',')[1]});
            };reader.readAsDataURL(blob);
        });
    }
    // The existing document generators write into a blank window and then print it.
    global.open=(url='',target)=>{
        if(url&&url!=='about:blank'){send('external',{url:new URL(url,location.href).href});return null;}
        let html='',closed=false;
        return {document:{write(value){if(!closed)html+=String(value);},close(){}},close(){closed=true;html='';},print(){if(!closed&&html)send('print',{html});}};
    };
    document.addEventListener('click',event=>{
        const link=event.target.closest?.('a[download]');if(!link)return;
        event.preventDefault();
        // Start reading synchronously: callers may immediately revoke a blob URL after click().
        fetch(link.href).then(response=>response.blob()).then(blob=>saveFile(blob,link.download||'arquivo-alorh')).catch(error=>alert(error.message));
    },true);
    global.RHAndroid={saveFile,back(){
        const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}
        const popover=document.getElementById('popoverCategorias'),menu=document.getElementById('menuHeaderMais');
        if((popover&&!popover.hidden)||(menu&&!menu.hidden)){global.RHCabecalho?.close();return true;}
        const modals=Array.from(document.querySelectorAll('.modal-overlay')).filter(el=>getComputedStyle(el).display!=='none');
        if(modals.length){const modal=modals[modals.length-1];if(modal.id&&typeof global.fecharModal==='function')global.fecharModal(modal.id);return true;}
        return false;
    }};
})(window);
