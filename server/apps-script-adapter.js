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
// Execute somente após suspender a escrita do serviço legado. A origem permanece intacta.
function prepararCopiaSegura() {
    const lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw new Error('Servidor ocupado.');
    try {
    if(rhProperties_().getProperty('RH_STATE_FILE_ID'))throw new Error('Este projeto já possui banco configurado.');
    const source=DriveApp.getFileById(rhRequired_('RH_SOURCE_FILE_ID'));
    const original=source.getBlob().getDataAsString('UTF-8'),bank=JSON.parse(original);
    const state=RHService.migrate(bank,rhEnvironment_());
    if(!state.bank.administradores.some(a=>a.permissoes?.gerenciarAdministradores&&state.security.credentials[a.id]))throw new Error('A origem precisa de pelo menos um gestor com PIN.');
    const folder=DriveApp.createFolder('Alô RH — Cópia segura '+new Date().toISOString());
    const backup=folder.createFile('original-antes-migracao.json',original,MimeType.PLAIN_TEXT);
    const backups=folder.createFolder('Backups');
    const serialized=JSON.stringify(state),file=folder.createFile('estado-seguro.json',serialized,MimeType.PLAIN_TEXT);
    if(backup.getBlob().getDataAsString('UTF-8')!==original||file.getBlob().getDataAsString('UTF-8')!==serialized)throw new Error('Verificação das cópias falhou; banco não ativado.');
    if(source.getBlob().getDataAsString('UTF-8')!==original)throw new Error('A origem mudou durante a cópia; banco não ativado.');
    rhProperties_().setProperties({RH_STATE_FILE_ID:file.getId(),RH_BACKUP_FOLDER_ID:backups.getId()});
    console.log(JSON.stringify({schema:state.schema,revision:state.revision,funcionarios:state.bank.funcionarios.length,registros:state.bank.registros.length,perfis:Object.keys(state.security.credentials).length,originalSHA256:CryptoJS.SHA256(original).toString()}));
    } finally {lock.releaseLock();}
}

// Verificação sem Drive: usa apenas dados fictícios e mede o custo real do PIN no Google.
function validarBackendComDadosFicticios() {
    const start=Date.now(),env=rhEnvironment_();
    const bank={app_id:'alorh',empresa:{razao:'Teste fictício'},configGerais:{},categorias:[],funcoes:[],funcionarios:[],registros:[],auditoria:[],administradores:[{id:'teste',nome:'Pessoa de teste',senha:'1234',permissoes:{gerenciarAdministradores:true,dadosEmpresa:true}}]};
    const state=RHService.migrate(bank,env),service=RHService.create(state,env),secret=env.random();
    const login=service.handle({action:'login',profileId:'teste',pin:'1234',secret});
    if(login.bank.administradores[0].senha||state.security.credentials.teste.hash==='1234')throw new Error('Credencial exposta.');
    const before=service.handle({action:'read',session:login.token,secret}).bank,next=RHProtocol.clone(before);next.empresa.razao='Teste de gravação fictício';
    const request={action:'commit',session:login.token,secret,requestId:env.random(),operations:RHProtocol.diff(before,next)};
    const first=service.handle(request),retry=service.handle(request);
    if(first.revision!==retry.revision||retry.bank.empresa.razao!==next.empresa.razao)throw new Error('Falha de idempotência.');
    service.handle({action:'signout',session:login.token,secret});
    console.log(JSON.stringify({ok:true,ambiente:'fictício, sem acesso ao Drive',duracaoMs:Date.now()-start,revision:state.revision}));
}
