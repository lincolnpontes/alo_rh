(function(global){
    'use strict';
    const SESSION='alorh_internal_session_v3',SECRET='alorh_device_secret_v2',LAST='alorh_last_person',DIRECTORY='alorh_person_directory';
    let session=null,refreshing,settingsUntil=0,profile=null,bankId=null,profiles=[],challengeTask=null,challengeProfile=null,challengeMode=false;
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
        const group=node('div',undefined,{className:'form-group operator-pin-group'}),label=node('label','PIN:'),field=node('div',undefined,{className:'operator-pin-field'});
        const input=node('input',undefined,{type:'password',readOnly:true,tabIndex:-1,maxLength:12,className:'operator-pin-input'});
        input.autocomplete='off';input.inputMode='none';input.setAttribute('aria-label','PIN digitado');
        const dots=node('div',undefined,{className:'pin-display-dots'});dots.setAttribute('aria-hidden','true');
        const progress=node('div','Verificando acesso…',{className:'operator-login-progress',hidden:true});progress.setAttribute('role','status');
        const setValue=value=>{input.value=String(value).replace(/\D/g,'').slice(0,12);dots.innerHTML='<i></i>'.repeat(input.value.length);};
        field.append(input,dots,progress);group.append(label,field);
        const keys=node('div',undefined,{className:'pin-keypad'});keys.setAttribute('aria-label','Teclado do PIN');
        const activate=key=>{if(input.disabled)return;setValue(key==='clear'?'':key==='backspace'?input.value.slice(0,-1):input.value+key);};
        for(const key of ['1','2','3','4','5','6','7','8','9','clear','0','backspace']){
            const b=node('button',key==='clear'?'Limpar':key==='backspace'?'⌫':key,{type:'button'});
            if(key==='clear'){b.className='pin-key-clear';b.dataset.pinAction='clear';}
            else if(key==='backspace'){b.dataset.pinAction=key;b.setAttribute('aria-label','Apagar último número');}
            else b.dataset.pinKey=key;
            // Mesmo tratamento do Cozinha: resposta no toque sem abrir teclado do sistema nem duplicar o clique.
            let lastPointer=0;
            b.onpointerdown=e=>{if(b.disabled)return;e.preventDefault();lastPointer=Date.now();activate(key);};
            b.onclick=e=>{e.preventDefault();if(Date.now()-lastPointer>=600)activate(key);};keys.append(b);
        }
        parent.tabIndex=-1;
        parent.addEventListener('keydown',e=>{
            if(input.disabled||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.tagName==='SELECT')return;
            if(/^\d$/.test(e.key)){e.preventDefault();activate(e.key);}
            else if(e.key==='Backspace'){e.preventDefault();activate('backspace');}
            else if(e.key==='Delete'){e.preventDefault();activate('clear');}
            else if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();parent.requestSubmit();}
        });
        group.append(keys);parent.append(group);return {group,input,setValue,progress};
    }
    function busy(form,on){form.setAttribute('aria-busy',String(on));form.querySelectorAll('input,select,button').forEach(el=>el.disabled=on);}
    async function settings(){
        if(settingsUntil>Date.now())return true;
        if(!profile)throw new Error('Selecione a pessoa para continuar.');
        const modal=dialog('Confirmar acesso'),form=node('form');
        modal.classList.add('modal-login-operador');modal.querySelector('h2').className='modal-title';
        const personGroup=node('div',undefined,{className:'form-group'}),personLabel=node('label','Pessoa:'),person=node('div',profile.nome,{className:'operator-person-readonly'});
        person.setAttribute('aria-label','Pessoa: '+profile.nome);personGroup.append(personLabel,person);form.append(personGroup);
        const {input,setValue,progress}=pinField(form),feedback=node('div','',{className:'senha-feedback'}),actions=node('div',undefined,{className:'modal-actions'});
        feedback.setAttribute('role','alert');button(actions,'Cancelar',()=>modal.close()).className='btn-cancel';
        actions.append(node('button','Continuar',{type:'submit',className:'btn-action'}));form.append(feedback,actions);modal.append(form);
        return new Promise(resolve=>{
            let accepted=false,inFlight=false;modal.addEventListener('close',()=>{setValue('');resolve(accepted);},{once:true});
            form.onsubmit=async e=>{e.preventDefault();if(inFlight)return;if(!/^\d{3,12}$/.test(input.value)){feedback.textContent='Digite seu PIN.';form.focus();return;}inFlight=true;busy(form,true);progress.hidden=false;feedback.textContent='';
                try{const r=await request('verify-pin',{pin:input.value});if(!modal.open)return;settingsUntil=r.expires;accepted=true;modal.close();}
                catch(err){setValue('');feedback.textContent=err.message;}finally{inFlight=false;busy(form,false);progress.hidden=true;}};
            form.focus();
        });
    }
    async function pinHash(pin,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:120000},key,256))).join(',');}
    function prepareLogin(id,force=false){
        if(!id||!challengeMode)return Promise.resolve(null);
        if(!force&&challengeProfile===id&&challengeTask)return challengeTask;
        challengeProfile=id;challengeTask=request('prepare-login',{profileId:id},true).then(r=>r.challenge);
        challengeTask.catch(()=>{});return challengeTask;
    }
    async function loginCredentials(id,pin){
        if(!challengeMode)return {pin}; // Compatibilidade com a implantação anterior durante a atualização.
        let challenge=await prepareLogin(id);
        if(!challenge||challenge.expires<=Date.now()+3000)challenge=await prepareLogin(id,true);
        challengeTask=null;challengeProfile=null;
        return RHPinProof.sign(pin,{bankId,profileId:id,secret},challenge);
    }
    async function authenticateProfile(id,pin){
        if(!bankId)throw new Error('Carregue a lista de pessoas antes de entrar.');
        await RHStore.reserve(bankId);
        const salt=crypto.getRandomValues(new Uint8Array(16)),credentials=await loginCredentials(id,pin);
        const [result,offlineHash]=await Promise.all([request('login',{profileId:id,...credentials},true),pinHash(pin,salt)]);
        if(result.bankId!==bankId)throw new Error('A origem dos dados mudou. Reabra o aplicativo.');
        profile=result.profile;settingsUntil=0;
        saveSession({token:result.token,refreshToken:result.refreshToken,expires:result.expires,bankId,profile,offlineCredential:{salt:Array.from(salt),hash:offlineHash},offlineUntil:Date.now()+8*3600000});
        localStorage.setItem(LAST,id);return result;
    }
    function accessShell(){
        const host=document.getElementById('rhAccess');host.replaceChildren();
        const stack=node('div',undefined,{className:'operator-login-stack'}),card=node('section',undefined,{className:'modal modal-login-operador'});
        card.append(node('h1','Entrar no Alô RH',{className:'modal-title'}));stack.append(card);host.append(stack);
        if(RH_CONFIG.local)stack.append(node('p','Cópia local',{className:'rh-local-label'}));return card;
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
        const host=accessShell(),form=node('form'),personGroup=node('div',undefined,{className:'form-group'}),label=node('label','Pessoa:'),select=node('select');select.setAttribute('aria-label','Pessoa');
        label.append(select);personGroup.append(label);form.append(personGroup);
        const {input,setValue,progress}=pinField(form),feedback=node('div','',{className:'senha-feedback'});feedback.setAttribute('role','alert');
        const actions=node('div',undefined,{className:'modal-actions'}),cancel=button(actions,'Cancelar',()=>{setValue('');feedback.textContent='';form.focus();}),submit=node('button','Entrar',{type:'submit',className:'btn-action'});
        cancel.className='btn-cancel';actions.append(submit);form.append(feedback,actions);host.append(form);
        let offline=false,inFlight=false,loadError=null;
        try{const cached=JSON.parse(localStorage.getItem(DIRECTORY)||'null');if(cached?.endpoint===endpoint()&&Array.isArray(cached.profiles)){profiles=cached.profiles;bankId=cached.bankId;}}catch(_){}
        if(!profiles.length&&session?.profile){profiles=[{id:session.profile.id,nome:session.profile.nome}];bankId=session.bankId;}
        const fillPeople=()=>{const selected=select.value||localStorage.getItem(LAST);select.replaceChildren(node('option',profiles.length?'Selecione a pessoa':'Buscando pessoas…',{value:''}));profiles.forEach(p=>select.append(node('option',p.nome,{value:p.id})));if(profiles.some(p=>p.id===selected))select.value=selected;};
        fillPeople();
        select.onchange=()=>{setValue('');feedback.textContent='';prepareLogin(select.value);form.focus();};
        const initialPerson=select.value;
        const ready=request('info',{profileId:initialPerson||undefined},true).then(result=>{
            bankId=result.bankId;profiles=result.profiles;challengeMode=result.loginProtocol==='pin-proof-v1';
            if(result.challenge&&select.value===initialPerson){challengeProfile=initialPerson;challengeTask=Promise.resolve(result.challenge);}
            try{localStorage.setItem(DIRECTORY,JSON.stringify({endpoint:endpoint(),bankId,profiles}));}catch(_){}
            // Não trocar a pessoa nem apagar o PIN enquanto a pessoa já está digitando.
            if(!inFlight){fillPeople();if(!profiles.length)feedback.textContent='Nenhuma pessoa possui acesso interno configurado.';else if(select.value!==initialPerson)prepareLogin(select.value);}
        }).catch(error=>{
            if(!error.code&&session?.offlineUntil>Date.now()&&session?.offlineCredential){offline=true;bankId=session.bankId;profiles=[{id:session.profile.id,nome:session.profile.nome}];if(!inFlight)fillPeople();feedback.textContent='Sem conexão. Use o PIN do último acesso neste aparelho.';}
            else{loadError=error;if(!profiles.length){feedback.textContent=error.message;button(host,'Tentar novamente',()=>showProfiles(onSuccess));}}
        });
        form.onsubmit=async e=>{e.preventDefault();if(inFlight)return;if(!select.value){feedback.textContent='Selecione a pessoa.';select.focus();return;}
            if(!/^\d{3,12}$/.test(input.value)){feedback.textContent='Digite seu PIN.';form.focus();return;}
            inFlight=true;busy(form,true);progress.hidden=false;feedback.textContent='';
            try{await ready;if(loadError&&!bankId)throw loadError;const result=offline?await offlinePin(select.value,input.value):await authenticateProfile(select.value,input.value);setValue('');progress.textContent='Abrindo…';await onSuccess(result);}
            catch(err){setValue('');feedback.textContent=err.message;prepareLogin(select.value,true);}
            finally{inFlight=false;busy(form,false);progress.hidden=true;progress.textContent='Verificando acesso…';form.focus();}
        };
        form.focus();await ready;
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
