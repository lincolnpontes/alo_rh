/* Adaptador Google Apps Script. Use IDs explícitos do banco e dos backups. */
function rhProperties_() { return PropertiesService.getScriptProperties(); }
function rhRequired_(name) { const value=rhProperties_().getProperty(name);if(!value)throw new Error('Backend não configurado: '+name);return value; }
function rhRandom_() { return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''); }
function rhEqual_(a,b) { a=String(a);b=String(b);let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0; }
function rhEnvironment_() {
    return {
        now:()=>Date.now(),random:rhRandom_,digest:v=>CryptoJS.SHA256(v).toString(),equal:rhEqual_,
        password:value=>{const salt=rhRandom_();return {scheme:'pbkdf2-sha256',iterations:120000,salt,hash:CryptoJS.PBKDF2(value,CryptoJS.enc.Hex.parse(salt),{keySize:8,iterations:120000,hasher:CryptoJS.algo.SHA256}).toString()};},
        verifyPassword:(value,c)=>!!c&&c.scheme==='pbkdf2-sha256'&&c.iterations===120000&&rhEqual_(CryptoJS.PBKDF2(value,CryptoJS.enc.Hex.parse(c.salt),{keySize:8,iterations:c.iterations,hasher:CryptoJS.algo.SHA256}).toString(),c.hash),
        snapshot:state=>rhSnapshot_(JSON.stringify(state))
    };
}
function rhSnapshot_(text) {
    const folder=DriveApp.getFolderById(rhRequired_('RH_BACKUP_FOLDER_ID'));
    folder.createFile('alorh-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+Utilities.getUuid()+'.json',text,MimeType.PLAIN_TEXT);
}
function doGet() { return rhJson_({ok:false,code:'method',message:'Use o protocolo autenticado do Alô RH.'}); }
function doPost(event) {
    const lock=LockService.getScriptLock();let locked=false;
    try {
        const raw=event?.postData?.contents||'';if(raw.length>8*1024*1024)throw new Error('Requisição muito grande.');
        const body=JSON.parse(raw);locked=lock.tryLock(15000);if(!locked)throw new Error('Servidor ocupado. Tente novamente.');
        const file=DriveApp.getFileById(rhRequired_('RH_STATE_FILE_ID')),before=file.getBlob().getDataAsString('UTF-8');
        const state=JSON.parse(before);if(![2,3].includes(state.schema))throw new Error('Migração do banco ainda não concluída.');
        const service=RHService.create(state,rhEnvironment_());let result;
        try { result={ok:true,...service.handle(body)}; }
        catch(error) {result={ok:false,code:error.code||'invalid',message:error.message||'Não foi possível concluir.'};}
        const after=JSON.stringify(state);
        if(after!==before){
            const old=JSON.parse(before);
            if(state.revision!==old.revision || JSON.stringify(state.security.credentials)!==JSON.stringify(old.security.credentials) || state.schema!==old.schema)rhSnapshot_(before);
            file.setContent(after);
        }
        return rhJson_(result);
    } catch(error) {return rhJson_({ok:false,code:'unavailable',message:'Não foi possível concluir no servidor. Nenhum envio foi confirmado.'});}
    finally {if(locked)lock.releaseLock();}
}
function rhJson_(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
// Run explicitly in a separate Apps Script project. Source is read-only; a new folder and file are created.
function prepararCopiaSegura() {
    if(rhProperties_().getProperty('RH_STATE_FILE_ID'))throw new Error('Este projeto já possui banco configurado.');
    const source=DriveApp.getFileById(rhRequired_('RH_SOURCE_FILE_ID'));
    const bank=JSON.parse(source.getBlob().getDataAsString('UTF-8'));
    const state=RHService.migrate(bank,rhEnvironment_());
    const folder=DriveApp.createFolder('Alô RH — Cópia segura '+new Date().toISOString());
    folder.createFile('original-antes-migracao.json',JSON.stringify(bank),MimeType.PLAIN_TEXT);
    const backups=folder.createFolder('Backups');
    const file=folder.createFile('estado-seguro.json',JSON.stringify(state),MimeType.PLAIN_TEXT);
    rhProperties_().setProperties({RH_STATE_FILE_ID:file.getId(),RH_BACKUP_FOLDER_ID:backups.getId()});
}
