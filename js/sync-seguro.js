(function(global){
    'use strict';
    const P=RHProtocol;
    let state,initialized=false,running=null,timer,failures=0,storeReady=false,lastPersist=Promise.resolve(),currentStatus='local';
    const clean=value=>P.clean(normalizarBanco(P.clone(value)));
    const pending=()=>!!state&&(!!state.outbox||state.conflicts.length>0||P.diff(state.base,clean(db),state.versions).length>0);
    function status(text,kind='local'){
        currentStatus=kind;
        const el=document.getElementById('rhSyncStatus');if(el){el.dataset.state=kind;el.title=text;el.setAttribute('aria-label','Sincronização: '+text);}
        const detail=document.getElementById('syncStatusTexto');if(detail)detail.textContent=text;
    }
    function persist(){state.working=clean(db);lastPersist=RHStore.save(state);lastPersist.catch(()=>status('Não foi possível salvar neste aparelho. Exporte os dados antes de fechar.','error'));return lastPersist;}
    function schedule(delay=1200){clearTimeout(timer);timer=setTimeout(()=>sync().catch(()=>{}),delay);}
    async function init(envelope){
        if(!storeReady){state=await RHStore.init(RHAuth.bankId());storeReady=true;}
        if(!state){if(!envelope)throw new Error('Conecte-se à internet para baixar a primeira cópia.');const bank=clean(envelope.bank);state={base:bank,working:bank,versions:envelope.versions,revision:envelope.revision,conflicts:[],outbox:null,lastConfirmed:0};}
        db=normalizarBanco(P.clone(state.working));db.configs.url=RH_CONFIG.endpoint;
        if(envelope&&!state.outbox)await receive(envelope);
        initialized=true;await persist();
        status(pending()?'Há alterações aguardando confirmação':envelope?'Dados conferidos · nenhuma alteração pendente':'Sem conexão · cópia deste aparelho',pending()?'pending':envelope?'synced':'offline');
        render();schedule(pending()?100:60000);return db;
    }
    function render(){renderizarFiltros();renderizarLista();aplicarTemaApp();atualizarLogoTopo();atualizarVisibilidadePermissoes();}
    function changed(){
        if(!initialized)throw new Error('Entre no aplicativo antes de salvar.');
        state.pendingProfile=state.pendingProfile||RHAuth.profile()?.id;
        status('Salvando neste aparelho…','pending');
        persist().then(()=>{status('Salvo neste aparelho · aguardando confirmação','pending');schedule();}).catch(()=>{});
    }
    async function receive(envelope,base=state.base,local=clean(db),versions=state.versions){
        P.validate(envelope.bank);if(!Number.isInteger(envelope.revision)||envelope.revision<1||!envelope.versions)throw new Error('Revisão inválida recebida do servidor.');
        const remote=clean(envelope.bank),result=P.rebase(base,local,remote,versions,envelope.versions);
        if(result.conflicts.length){await RHStore.backup(local,'antes-de-conflito');state.conflicts.push(...result.conflicts);}
        state.base=remote;state.versions=envelope.versions;state.revision=envelope.revision;
        db=normalizarBanco(result.bank);db.configs.url=RH_CONFIG.endpoint;await persist();
    }
    async function sendOutbox(){
        const packet=state.outbox;
        try{
            const answer=await RHAuth.request('commit',{requestId:packet.id,operations:packet.operations});
            if(answer.requestId!==packet.id)throw new Error('O servidor não confirmou esta operação.');
            // Edits made while the request was in flight survive the acknowledgment.
            await receive(answer,packet.snapshot,clean(db),answer.versions);
            state.outbox=null;state.lastConfirmed=Date.now();state.pendingProfile=null;await persist();
        }catch(error){
            if(error.code==='conflict'){
                state.outbox=null;await receive(error.data);await persist();
            }
            else if(['forbidden','invalid','duplicate','reference'].includes(error.code)) {
                state.outbox.rejected=error.message;await persist();
            }
            else if(error.code==='reauth_required'){state.outbox.needsSettings=true;await persist();}
            throw error;
        }
    }
    async function sync(){
        if(!initialized||!RHAuth.profile())return false;
        if(running)return running;
        running=(async()=>{
            try{
                await lastPersist;
                if(!navigator.onLine){status('Sem internet · alterações preservadas neste aparelho','offline');return false;}
                if(state.pendingProfile&&state.pendingProfile!==RHAuth.profile().id)throw new Error('Volte ao perfil que criou as alterações pendentes para sincronizar.');
                // A consulta periódica não muda uma confirmação válida para "pendente".
                if(pending())status('Enviando alterações · aguardando confirmação','pending');
                else if(currentStatus!=='synced')status('Conferindo conexão com o servidor','checking');
                if(state.outbox?.rejected){status(state.outbox.rejected+' · toque para revisar','conflict');return false;}
                if(state.outbox)await sendOutbox();
                const summary=await RHAuth.request('status');
                if(summary.revision!==state.revision)await receive(await RHAuth.request('read'));
                if(state.conflicts.length){status(state.conflicts.length+' conflito(s) · toque para revisar','conflict');render();return false;}
                const operations=P.diff(state.base,clean(db),state.versions);
                if(operations.length){
                    state.outbox={id:crypto.randomUUID(),operations,snapshot:clean(db)};await persist();await sendOutbox();
                }
                failures=0;status(pending()?'Salvo neste aparelho · envio pendente':state.lastConfirmed?'Confirmado às '+new Date(state.lastConfirmed).toLocaleTimeString('pt-BR'):'Dados conferidos · nenhuma alteração pendente',pending()?'pending':'synced');render();return !pending();
            }catch(error){failures++;status(error.message,'error');return false;}
            finally{running=null;schedule(Math.min(300000,failures?5000*Math.pow(2,Math.min(failures,6)):document.hidden?300000:60000));}
        })();return running;
    }
    async function conflicts(){
        if(state?.outbox?.needsSettings){if(await RHAuth.settings()){delete state.outbox.needsSettings;await sync();}return;}
        if(state?.outbox?.rejected){
            if(!confirm(state.outbox.rejected+'\n\nGuardar uma cópia destas alterações e voltar aos dados confirmados do servidor?'))return;
            await RHStore.backup(clean(db),'envio-recusado');const remote=await RHAuth.request('read');P.validate(remote.bank);
            state.base=clean(remote.bank);state.versions=remote.versions;state.revision=remote.revision;state.outbox=null;state.conflicts=[];state.pendingProfile=null;
            db=normalizarBanco(P.clone(state.base));await persist();render();await sync();return;
        }
        if(!state?.conflicts.length){await sync();return;}
        const modal=document.createElement('dialog');modal.className='rh-dialog';modal.setAttribute('aria-label','Revisar conflitos');
        const heading=document.createElement('h2');heading.textContent='Revisar alterações';modal.append(heading);
        state.conflicts.forEach((op,index)=>{
            const card=document.createElement('section'),text=document.createElement('p');
            text.textContent=op.entity+' · '+op.id+' · '+op.field+'\nSua alteração: '+JSON.stringify(op.after)+'\nO dado atual do servidor foi preservado.';card.append(text);
            for(const [label,mine] of [['Manter o dado do servidor',false],['Aplicar minha alteração',true]]){
                const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{
                    try{
                        await RHStore.backup(clean(db),'resolução-de-conflito');
                        if(mine){const current=P.lists.includes(op.entity)?db[op.entity].find(x=>x.id===op.id):db[op.entity];const resolved={...op,before:op.field==='*'?(current||null):(current?.[op.field]??null),version:state.versions[P.key(op.entity,op.id,op.field)]||0};
                            const result=P.apply(clean(db),[resolved],state.versions,state.revision,null,false);if(result.conflicts.length)throw new Error('O dado mudou novamente.');db=normalizarBanco(result.bank);}
                        state.conflicts=state.conflicts.filter(x=>x!==op);await persist();card.remove();if(!state.conflicts.length){modal.close();schedule(100);render();}
                    }catch(e){alert(e.message);}
                };card.append(button);
            }modal.append(card);
        });const close=document.createElement('button');close.textContent='Revisar depois';close.onclick=()=>modal.close();modal.append(close);modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();
    }
    async function restore(bank){
        P.validate(bank);if(pending())throw new Error('Resolva as alterações pendentes antes de restaurar um backup.');
        await RHStore.backup(clean(db),'antes-de-restauração');
        const restored=clean(bank);restored.administradores=P.clone(db.administradores);restored.auditoria=P.clone(db.auditoria);
        state.restorePreview=restored;await persist();
        // The preview remains isolated; only a second explicit action creates cloud operations.
        const modal=document.createElement('dialog');modal.className='rh-dialog';modal.setAttribute('aria-label','Revisar restauração');
        const message=document.createElement('p');message.textContent='Backup válido: '+restored.funcionarios.length+' funcionários e '+restored.registros.length+' lançamentos. A cópia atual foi preservada. Aplicar esta substituição e sincronizar com o banco?';modal.append(message);
        const apply=document.createElement('button');apply.textContent='Aplicar restauração';apply.onclick=()=>{db=normalizarBanco(restored);delete state.restorePreview;changed();render();modal.close();};modal.append(apply);
        const cancel=document.createElement('button');cancel.textContent='Cancelar';cancel.onclick=()=>modal.close();modal.append(cancel);modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();
    }
    async function localBackups(){
        const records=(await RHStore.backups()).filter(b=>b.bank).reverse();
        const modal=document.createElement('dialog');modal.className='rh-dialog';modal.setAttribute('aria-label','Cópias locais');
        const title=document.createElement('h2');title.textContent='Cópias preservadas neste aparelho';modal.append(title);
        for(const record of records){const row=document.createElement('section'),text=document.createElement('p');text.textContent=new Date(record.at).toLocaleString('pt-BR')+' · '+record.reason+' · '+record.bank.funcionarios.length+' funcionários';row.append(text);const button=document.createElement('button');button.textContent='Revisar restauração';button.onclick=async()=>{try{if(!await RHAuth.settings())return;modal.close();await restore(record.bank);}catch(e){alert(e.message);}};row.append(button);modal.append(row);}
        if(!records.length){const empty=document.createElement('p');empty.textContent='Nenhuma cópia anterior neste aparelho.';modal.append(empty);}
        const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>modal.close();modal.append(close);modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();
    }
    function integrity(){
        const missing=db.registros.filter(r=>r.funcId&&!db.funcionarios.some(f=>f.id===r.funcId));
        const modal=document.createElement('dialog');modal.className='rh-dialog';modal.setAttribute('aria-label','Integridade do histórico');
        const title=document.createElement('h2');title.textContent='Vínculos do histórico';modal.append(title);
        const intro=document.createElement('p');intro.textContent=missing.length?'Estes lançamentos foram preservados, mas o cadastro do funcionário não está disponível. Confirme a identidade antes de corrigir o vínculo.':'Todos os lançamentos estão vinculados a cadastros existentes.';modal.append(intro);
        missing.forEach(r=>{const row=document.createElement('p');row.textContent=(r.tipo||r.type)+' · '+formatDataBR(r.data)+' · referência '+r.funcId;modal.append(row);});
        const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>modal.close();modal.append(close);modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();
    }
    global.RHSync={init,changed,sync,pending,status,conflicts,restore,localBackups,integrity,flush:()=>lastPersist,state:()=>P.clone(state),backup:reason=>RHStore.backup(clean(db),reason)};
    addEventListener('online',()=>schedule(200));addEventListener('offline',()=>status('Sem internet · alterações preservadas neste aparelho','offline'));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(200);});
    addEventListener('beforeunload',event=>{if(state&&pending()){event.preventDefault();event.returnValue='';}});
})(window);
