(function(global){
    'use strict';
    const SESSION='alorh_internal_session_v3',SECRET='alorh_device_secret_v2',LAST='alorh_last_person';
    let session=null,refreshing,settingsUntil=0,profile=null,bankId=null,profiles=[];
    try{session=JSON.parse(localStorage.getItem(SESSION)||'null');bankId=session?.bankId||null;}catch(_){}
    // The previous local account prototype has no authority over internal access.
    localStorage.removeItem('alorh_session_v2');
    let secret=localStorage.getItem(SECRET);
    if(!/^[a-f0-9]{64}$/.test(secret||'')){secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');localStorage.setItem(SECRET,secret);}
    function endpoint(){
        const value=RH_CONFIG.endpoint;
        if(RH_CONFIG.local&&value==='/__dev__/api')return value;
        if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value||''))throw new Error('Configure a URL do Google Apps Script, sem token.');
        return value;
    }
    async function transport(body){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
        try{
            const response=await fetch(endpoint(),{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...body,secret}),signal:controller.signal,cache:'no-store',credentials:'omit'});
            if(!response.ok||response.type==='opaque')throw new Error('O servidor não confirmou a resposta.');
            let data;try{data=await response.json();}catch(_){throw new Error('Resposta inválida do servidor. Nenhum envio foi confirmado.');}
            if(data?.ok!==true)throw Object.assign(new Error(data?.message||data?.erro||'O servidor recusou a operação.'),{code:data?.code,data});
            return data;
        }catch(error){if(error.name==='AbortError')throw new Error('O servidor demorou para responder. As alterações locais foram preservadas.');throw error;}
        finally{clearTimeout(timer);}
    }
    function saveSession(value){session=value;localStorage.setItem(SESSION,JSON.stringify(value));}
    async function refresh(){
        if(!refreshing)refreshing=transport({action:'refresh',refreshToken:session?.refreshToken}).then(data=>{
            const {token,refreshToken,expires,profile:person}=data;saveSession({...session,token,refreshToken,expires,profile:person});if(profile)profile=person;
        }).finally(()=>{refreshing=null;});
        await refreshing;
    }
    async function request(action,data={},publicRequest=false){
        try{
            if(!publicRequest){if(!session)throw Object.assign(new Error('Selecione a pessoa e informe o PIN.'),{code:'unauthorized'});if(session.expires<Date.now()+60000)await refresh();}
            return await transport({action,...data,...(!publicRequest?{session:session.token}:{})});
        }catch(error){
            if(error.code==='unauthorized'){profile=null;settingsUntil=0;session=null;localStorage.removeItem(SESSION);global.RHApp?.expired(error.message);}throw error;
        }
    }
    function node(tag,text,props={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;Object.assign(el,props);return el;}
    function dialog(title){const el=node('dialog',undefined,{className:'rh-dialog'});el.setAttribute('aria-label',title);el.append(node('h2',title));document.body.append(el);el.addEventListener('close',()=>el.remove(),{once:true});el.showModal();return el;}
    function button(parent,label,fn){const b=node('button',label,{type:'button'});b.onclick=fn;parent.append(b);return b;}
    function notice(parent){const p=node('p','',{className:'rh-feedback'});p.setAttribute('role','status');parent.append(p);return p;}
    function pinField(parent){
        const group=node('div',undefined,{className:'rh-pin-group'}),label=node('label','PIN'),input=node('input',undefined,{type:'password',required:true,maxLength:12,placeholder:'••••',className:'rh-pin-input'});
        input.autocomplete='off';input.inputMode='numeric';input.setAttribute('aria-label','PIN');input.setAttribute('enterkeyhint','go');input.pattern='[0-9]{3,12}';
        input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,12);};
        label.append(input);group.append(label);
        const keys=node('div',undefined,{className:'rh-pin-keypad'});keys.setAttribute('aria-label','Teclado do PIN');
        for(const key of ['1','2','3','4','5','6','7','8','9','Limpar','0','Apagar']){
            const b=button(keys,key,()=>{input.value=key==='Limpar'?'':key==='Apagar'?input.value.slice(0,-1):(input.value+key).slice(0,12);input.dispatchEvent(new Event('input'));input.focus();});
            if(key==='Apagar')b.setAttribute('aria-label','Apagar último número');
        }
        group.append(keys);parent.append(group);return {group,input};
    }
    function busy(form,on){form.setAttribute('aria-busy',String(on));form.querySelectorAll('input,select,button').forEach(el=>el.disabled=on);}
    async function settings(){
        if(settingsUntil>Date.now())return true;
        if(!profile)throw new Error('Selecione a pessoa para continuar.');
        const modal=dialog('Confirmar acesso'),form=node('form');form.append(node('p',profile.nome));
        const {input}=pinField(form),feedback=notice(form),submit=node('button','Continuar',{type:'submit'});form.append(submit);modal.append(form);
        button(modal,'Cancelar',()=>modal.close());
        return new Promise(resolve=>{
            let accepted=false,inFlight=false;modal.addEventListener('close',()=>{input.value='';resolve(accepted);},{once:true});
            form.onsubmit=async e=>{e.preventDefault();if(inFlight)return;inFlight=true;busy(form,true);feedback.textContent='Verificando acesso…';
                try{const r=await request('verify-pin',{pin:input.value});settingsUntil=r.expires;accepted=true;modal.close();}
                catch(err){input.value='';feedback.textContent=err.message;}finally{inFlight=false;busy(form,false);}};
            input.focus();
        });
    }
    async function pinHash(pin,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:120000},key,256))).join(',');}
    async function authenticateProfile(id,pin){
        if(!bankId)throw new Error('Carregue a lista de pessoas antes de entrar.');
        await RHStore.reserve(bankId);
        const result=await request('login',{profileId:id,pin},true),salt=crypto.getRandomValues(new Uint8Array(16));
        if(result.bankId!==bankId)throw new Error('A origem dos dados mudou. Reabra o aplicativo.');
        profile=result.profile;settingsUntil=0;
        saveSession({token:result.token,refreshToken:result.refreshToken,expires:result.expires,bankId,profile,offlineCredential:{salt:Array.from(salt),hash:await pinHash(pin,salt)},offlineUntil:Date.now()+8*3600000});
        localStorage.setItem(LAST,id);return result;
    }
    function accessShell(){
        const host=document.getElementById('rhAccess');host.replaceChildren();
        const mark=node('div','Alô RH',{className:'rh-access-brand'});host.append(mark,node('h1','Acesso do funcionário'),node('p','Selecione a pessoa para continuar.'));
        if(RH_CONFIG.local)host.append(node('p','Cópia local',{className:'rh-local-label'}));
        return host;
    }
    async function offlinePin(id,pin){
        if(!session||session.profile?.id!==id||session.offlineUntil<=Date.now()||!session.offlineCredential)throw new Error('Conecte-se para confirmar o acesso desta pessoa.');
        const key='alorh_offline_attempts',attempt=JSON.parse(localStorage.getItem(key)||'null')||{count:0,until:0};
        if(attempt.until>Date.now())throw new Error('Aguarde 30 segundos antes de tentar novamente.');
        if(await pinHash(pin,session.offlineCredential.salt)!==session.offlineCredential.hash){
            attempt.count++;if(attempt.count>=3){attempt.count=0;attempt.until=Date.now()+30000;}localStorage.setItem(key,JSON.stringify(attempt));throw new Error('PIN incorreto. Tente novamente.');
        }
        await RHStore.reserve(bankId);localStorage.removeItem(key);profile=session.profile;return null;
    }
    async function showProfiles(onSuccess){
        const host=accessShell(),feedback=notice(host);feedback.textContent='Carregando pessoas…';
        let offline=false;
        try{const result=await request('info',{},true);bankId=result.bankId;profiles=result.profiles;}
        catch(error){
            if(!error.code&&session?.offlineUntil>Date.now()&&session?.offlineCredential){offline=true;bankId=session.bankId;profiles=[{id:session.profile.id,nome:session.profile.nome}];}
            else{feedback.textContent=error.message;button(host,'Tentar novamente',()=>showProfiles(onSuccess));return;}
        }
        const form=node('form'),label=node('label','Pessoa'),select=node('select',undefined,{required:true});select.setAttribute('aria-label','Pessoa');
        select.append(node('option','Selecione a pessoa',{value:''}));profiles.forEach(p=>select.append(node('option',p.nome,{value:p.id})));
        const last=localStorage.getItem(LAST);if(profiles.some(p=>p.id===last))select.value=last;
        label.append(select);form.append(label);const {group,input}=pinField(form);
        group.hidden=!select.value;select.onchange=()=>{input.value='';group.hidden=!select.value;feedback.textContent='';if(select.value)input.focus();};
        const submit=node('button','Entrar',{type:'submit'});form.append(submit);host.insertBefore(form,feedback);
        feedback.textContent=offline?'Sem conexão. Use o PIN do último acesso autorizado neste aparelho.':!profiles.length?'Nenhuma pessoa possui acesso interno configurado.':'';
        let inFlight=false;
        form.onsubmit=async e=>{e.preventDefault();if(inFlight)return;if(!select.value){feedback.textContent='Selecione a pessoa.';select.focus();return;}
            inFlight=true;busy(form,true);feedback.textContent='Verificando acesso…';
            try{const result=offline?await offlinePin(select.value,input.value):await authenticateProfile(select.value,input.value);input.value='';feedback.textContent='Abrindo…';await onSuccess(result);}
            catch(err){input.value='';feedback.textContent=err.message;}
            finally{inFlight=false;busy(form,false);}
        };
        if(select.value)input.focus();else select.focus();
    }
    async function leave(){
        try{if(session)await transport({action:'signout',session:session.token});}catch(_){/* Local locking remains possible without a server response. */}
        finally{session=null;profile=null;settingsUntil=0;localStorage.removeItem(SESSION);}
    }
    async function signout(){if(global.RHSync?.pending())return alert('Sincronize ou resolva as alterações pendentes antes de sair.');await leave();location.reload();}
    async function accessHistory(){
        if(!await settings())return;const modal=dialog('Histórico de acessos'),feedback=notice(modal);
        try{const r=await request('access-audit');r.events.forEach(e=>modal.append(node('p',new Date(e.at).toLocaleString('pt-BR')+' · '+e.action+' · '+e.detail)));}catch(e){feedback.textContent=e.message;}
        button(modal,'Fechar',()=>modal.close());
    }
    global.RHAuth={request,start:showProfiles,login:showProfiles,showProfiles,settings,authenticateProfile,accessHistory,signout,leave,profile:()=>profile,bankId:()=>bankId,transport};
})(window);
