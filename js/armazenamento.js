(function(global){
    'use strict';
    let connection, state, queue=Promise.resolve(), writable=false,reserving=null,legacyPreserved=false;
    const P=RHProtocol;
    function transaction(store,mode,operation){return new Promise((resolve,reject)=>{
        const tx=connection.transaction(store,mode),request=operation(tx.objectStore(store));
        tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error||new Error('Falha ao salvar neste aparelho.'));tx.onabort=()=>reject(tx.error||new Error('Gravação local interrompida.'));
    });}
    async function reserve(owner){
        if(writable)return;
        if(reserving)return reserving;
        if(!navigator.locks)throw new Error('Atualize o navegador para proteger a edição em várias abas.');
        reserving=new Promise((resolve,reject)=>navigator.locks.request('alorh-editor-'+owner,{ifAvailable:true},async lock=>{
            if(!lock){reject(new Error('O Alô RH já está aberto em outra aba. Feche a outra aba para editar aqui.'));return;}
            writable=true;resolve();await new Promise(()=>{});
        }).catch(reject));
        try{await reserving;}finally{reserving=null;}
    }
    async function init(owner){
        await reserve(owner);
        connection=await new Promise((resolve,reject)=>{const open=indexedDB.open('alorh-v2-'+owner,1);open.onupgradeneeded=()=>{open.result.createObjectStore('state');open.result.createObjectStore('backups',{autoIncrement:true});};open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
        await new Promise((resolve,reject)=>{
            const tx=connection.transaction('backups','readwrite'),cursor=tx.objectStore('backups').openCursor();
            cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;const value=row.value;if(value.raw){try{const old=JSON.parse(value.raw);if(old.app_id!=='alorh'||!Array.isArray(old.funcionarios)||!Array.isArray(old.registros))throw new Error('Backup incompleto');value.bank=P.clean(RHModel.normalizarBanco(old));P.validate(value.bank);delete value.raw;row.update(value);}catch(_){tx.abort();return;}}row.continue();};
            tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(new Error('Um backup antigo precisa de recuperação. Os dados foram preservados.'));
        });
        state=await transaction('state','readonly',store=>store.get('current'));
        const legacy=localStorage.getItem('alorh_v1');
        if(legacy){
            let parsed;try { parsed=JSON.parse(legacy); } catch(_) { throw new Error('A cópia antiga deste navegador está corrompida. Ela foi preservada; recupere um backup antes de continuar.'); }
            if(parsed.app_id!=='alorh'||!Array.isArray(parsed.funcionarios)||!Array.isArray(parsed.registros))throw new Error('A cópia antiga está incompleta. Os dados foram preservados.');
            const sanitized=P.clean(RHModel.normalizarBanco(parsed));P.validate(sanitized);
            await transaction('backups','readwrite',store=>store.add({at:Date.now(),reason:'migração-legada',bank:sanitized}));
            legacyPreserved=true;
            localStorage.removeItem('alorh_v1');
        }
        return state;
    }
    function save(value){
        if(!writable)throw new Error('Esta aba não pode gravar.');
        state=P.clone(value);const snapshot=P.clone(value);
        queue=queue.catch(()=>{}).then(()=>transaction('state','readwrite',store=>store.put(snapshot,'current')));
        return queue;
    }
    function backup(bank,reason){return transaction('backups','readwrite',store=>store.add({at:Date.now(),reason,bank:P.clone(bank)}));}
    function backups(){return transaction('backups','readonly',store=>store.getAll());}
    global.RHStore={init,reserve,save,backup,backups,legacyPreserved:()=>legacyPreserved,flush:()=>queue,get:()=>P.clone(state)};
})(window);
