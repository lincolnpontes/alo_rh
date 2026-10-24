/* Serviço compartilhado pelo Apps Script e pela cópia local. O adaptador mantém leitura, validação, backup e gravação sob exclusão mútua. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../js/protocolo.js'),require('../js/modelo.js'));else root.RHService=factory(root.RHProtocol,root.RHModel);})(typeof globalThis!=='undefined'?globalThis:this,function(P,M){
    'use strict';
    const MINUTE=60000,DAY=86400000,error=(message,code='invalid')=>P.fail(message,code);
    function create(state,env){
        // Retain the existing local database namespace and business data, but discard the former account sessions.
        state.bankId = state.bankId || state.security?.owner?.id || env.random();
        if(state.security?.kind!=='internal-pin')state.security={kind:'internal-pin',credentials:state.security?.credentials||{},sessions:{},attempts:{}};
        state.schema=3;
        const normalized=P.clean(M.normalizarBanco(state.bank));if(!P.equal(normalized,state.bank)){state.bank=normalized;state.revision=(state.revision||1)+1;}
        state.receipts = state.receipts || {};state.versions = state.versions || {};state.revision = state.revision || 1;
        const sec=state.security,now=()=>env.now(),hash=v=>env.digest(String(v));
        function audit(action,detail=''){state.accessAudit = state.accessAudit || [];state.accessAudit.unshift({at:now(),action,detail:String(detail).slice(0,120)});state.accessAudit=state.accessAudit.slice(0,500);}
        function limit(key){
            const id=hash(key);let a=sec.attempts[id]||{count:0,since:now(),until:0};
            if(a.until>now())error('Muitas tentativas. Aguarde 30 segundos e tente novamente.','rate_limit');
            if(now()-a.since>30*MINUTE||a.until)a={count:0,since:now(),until:0};
            a.count++;if(a.count>=3)a.until=now()+30000;sec.attempts[id]=a;
            for(const k of Object.keys(sec.attempts))if(now()-sec.attempts[k].since>DAY)delete sec.attempts[k];
        }
        function clearLimit(key){delete sec.attempts[hash(key)];}
        function deviceSecret(body){if(!/^[a-f0-9]{64}$/.test(body.secret||''))error('Identificação do aparelho inválida.');return hash(body.secret);}
        function person(id){return state.bank.administradores.find(a=>a.id===id);}
        function actor(a){return {profileId:a.id,permissions:a.permissoes||{},owner:false};}
        function checkPin(id,pin){
            const a=person(id);if(!a)error('Pessoa ou PIN incorreto.','invalid_credentials');
            // Per-person throttling cannot be bypassed by changing a device identifier.
            limit('pin:'+id);
            if(!/^\d{3,12}$/.test(String(pin||''))||!sec.credentials[id]||!env.verifyPassword(String(pin),sec.credentials[id]))error('PIN incorreto. Tente novamente.','invalid_credentials');
            clearLimit('pin:'+id);return a;
        }
        function prepareLogin(body){
            const secretHash=deviceSecret(body),a=person(body.profileId),credential=a&&sec.credentials[a.id];
            if(!credential)error('Pessoa não encontrada. Atualize a lista.','invalid_credentials');
            const attempt=sec.attempts[hash('pin:'+a.id)];
            if(attempt?.until>now())error('Muitas tentativas. Aguarde 30 segundos e tente novamente.','rate_limit');
            if(!env.challengeCache){sec.challenges=sec.challenges||{};for(const k of Object.keys(sec.challenges))if(sec.challenges[k].expires<=now())delete sec.challenges[k];}
            const key=hash(state.bankId+':'+secretHash+':'+a.id),credentialTag=hash(P.stable(credential));
            let challenge=env.challengeCache?env.challengeCache.get(key):sec.challenges[key];
            if(!challenge||challenge.expires<=now()||challenge.credentialTag!==credentialTag){
                challenge={nonce:env.random(),expires:now()+2*MINUTE,credentialTag};
                if(env.challengeCache)env.challengeCache.set(key,challenge);
                else {while(Object.keys(sec.challenges).length>=64)delete sec.challenges[Object.keys(sec.challenges)[0]];sec.challenges[key]=challenge;}
            }
            return {nonce:challenge.nonce,expires:challenge.expires,salt:credential.salt,iterations:credential.iterations};
        }
        function checkProof(body){
            const secretHash=deviceSecret(body),a=person(body.profileId),credential=a&&sec.credentials[a.id];
            const key=hash(state.bankId+':'+secretHash+':'+body.profileId),challenge=env.challengeCache?env.challengeCache.get(key):sec.challenges?.[key];
            if(!credential||!challenge||challenge.nonce!==body.challenge||challenge.expires<=now()||challenge.credentialTag!==hash(P.stable(credential)))error('O acesso preparado expirou. Digite o PIN novamente.','challenge_expired');
            if(env.challengeCache)env.challengeCache.remove(key);else delete sec.challenges[key];limit('pin:'+a.id);
            const expected=env.hmac(JSON.stringify(['alorh-pin-proof-v1',state.bankId,a.id,body.secret,challenge.nonce]),credential.hash);
            if(!/^[a-f0-9]{64}$/.test(body.proof||'')||!env.equal(body.proof,expected))error('PIN incorreto. Tente novamente.','invalid_credentials');
            clearLimit('pin:'+a.id);return a;
        }
        function renewedTokens(oldToken,nonce){return {token:env.hmac('alorh-access:'+nonce,oldToken),refreshToken:env.hmac('alorh-refresh:'+nonce,oldToken)};}
        function issue(a,secretHash,previous,renewal,oldToken){
            const {token,refreshToken}=renewal?renewedTokens(oldToken,renewal.nonce):{token:env.random(),refreshToken:env.random()},expires=now()+30*MINUTE;
            for(const k of Object.keys(sec.sessions))if(sec.sessions[k].refreshExpires<=now()||sec.sessions[k].secretHash===secretHash)delete sec.sessions[k];
            sec.sessions[hash(token)]={secretHash,profileId:a.id,expires,refreshHash:hash(refreshToken),refreshExpires:previous?.refreshExpires||now()+8*60*MINUTE,settingsUntil:previous?.settingsUntil||0,...(renewal?{renewal}:{})};
            return {token,refreshToken,expires,bankId:state.bankId,profile:P.clone(a)};
        }
        function auth(body,permission,settings=false){
            const s=sec.sessions[hash(body.session||'')],a=s&&person(s.profileId);
            if(!s||!a||s.expires<=now()||s.refreshExpires<=now()||s.secretHash!==deviceSecret(body))error('A sessão interna expirou. Selecione a pessoa e informe o PIN.','unauthorized');
            if(permission&&a.permissoes?.[permission]!==true)error('Seu perfil não tem permissão para esta ação.','forbidden');
            if(settings&&s.settingsUntil<=now())error('Confirme seu PIN para continuar.','reauth_required');
            return {s,a,actor:actor(a)};
        }
        function envelope(){return {revision:state.revision,versions:P.clone(state.versions),bank:P.clean(state.bank)};}
        function revokeProfile(id,keep){for(const k of Object.keys(sec.sessions))if(sec.sessions[k].profileId===id&&sec.sessions[k]!==keep)delete sec.sessions[k];}
        function mutate(operations,operator,body){
            if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,100}$/.test(body.requestId))error('Identificador da operação inválido.');
            const digest=hash(P.stable(operations)),previous=state.receipts[body.requestId];
            if(previous){if(previous.digest!==digest||previous.profileId!==operator.profileId)error('Identificador de operação reutilizado com outro conteúdo.','replay');return {requestId:body.requestId,...envelope()};}
            const result=P.apply(state.bank,operations,state.versions,state.revision+1,operator);
            if(result.conflicts.length)return {ok:false,code:'conflict',message:'Há alterações feitas em outro aparelho. Revise antes de salvar.',conflicts:result.conflicts,...envelope()};
            state.bank=result.bank;state.versions=result.versions;state.revision++;
            state.receipts[body.requestId]={digest,profileId:operator.profileId,revision:state.revision,at:now()};
            for(const id of Object.keys(state.receipts))if(now()-state.receipts[id].at>90*DAY)delete state.receipts[id];
            audit('gravação',operator.profileId);return {requestId:body.requestId,...envelope()};
        }
        function handle(body){
            if(!body||typeof body!=='object')error('Requisição inválida.');P.clone(body);const action=body.action;
            if(action==='info')return {protocol:3,loginProtocol:'pin-proof-v1',bankId:state.bankId,profiles:state.bank.administradores.filter(a=>!!sec.credentials[a.id]).map(a=>({id:a.id,nome:a.nome})),...(body.profileId&&person(body.profileId)&&sec.credentials[body.profileId]?{challenge:prepareLogin(body)}:{})};
            if(action==='prepare-login')return {challenge:prepareLogin(body)};
            if(action==='login'){
                const secretHash=deviceSecret(body),a=body.proof!==undefined?checkProof(body):checkPin(body.profileId,body.pin);
                audit('entrada',a.nome);return {...issue(a,secretHash),...envelope(),nextLogin:{profileId:a.id,challenge:prepareLogin(body)}};
            }
            if(action==='refresh'){
                const id=body.requestId;if(id!==undefined&&!/^[a-zA-Z0-9_-]{16,100}$/.test(id))error('Identificador de renovação inválido.');
                // A lost reply may repeat the exact same rotation briefly. Store only hashes and a nonce,
                // never raw access/refresh tokens. A new request ID cannot replay the previous token.
                if(id){
                    const prior=Object.values(sec.sessions).find(s=>s.renewal?.previousHash===hash(body.refreshToken||'')&&s.renewal.requestHash===hash(id));
                    if(prior&&prior.renewal.until>now()&&prior.refreshExpires>now()&&prior.expires>now()&&prior.secretHash===deviceSecret(body)&&person(prior.profileId))return {...renewedTokens(body.refreshToken,prior.renewal.nonce),expires:prior.expires,bankId:state.bankId,profile:P.clone(person(prior.profileId))};
                }
                const s=Object.values(sec.sessions).find(s=>s.refreshHash===hash(body.refreshToken||'')),a=s&&person(s.profileId);
                if(!s||!a||s.refreshExpires<=now()||s.secretHash!==deviceSecret(body))error('Informe seu PIN novamente.','unauthorized');
                const renewal=id?{previousHash:hash(body.refreshToken),requestHash:hash(id),nonce:env.random(),until:now()+2*MINUTE}:null;
                return issue(a,s.secretHash,s,renewal,body.refreshToken);
            }
            const {s,a,actor:operator}=auth(body);
            if(action==='signout'){delete sec.sessions[hash(body.session)];audit('saída',a.nome);return {};}
            if(action==='verify-pin'){checkPin(a.id,body.pin);s.settingsUntil=now()+5*MINUTE;return {expires:s.settingsUntil};}
            if(action==='access-audit'){auth(body,'auditoria',true);return {events:P.clone(state.accessAudit||[])};}
            if(action==='backup'){auth(body,'configGerais',true);env.snapshot(state);return {revision:state.revision,createdAt:now()};}
            if(action==='save-profile'){
                auth(body,'gerenciarAdministradores',true);const p=body.profile;
                if(!p||typeof p.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(p.id)||['__proto__','constructor','prototype'].includes(p.id)||typeof p.nome!=='string'||!p.nome.trim()||!p.permissoes||Object.values(p.permissoes).some(v=>typeof v!=='boolean'))error('Perfil inválido.');
                if(body.pin&&!/^\d{4,12}$/.test(body.pin))error('Use de quatro a doze dígitos no PIN.');
                if(!body.pin&&!sec.credentials[p.id])error('Defina o PIN da pessoa.');
                const next=state.bank.administradores.filter(x=>x.id!==p.id);next.push({id:p.id,nome:p.nome.trim().slice(0,100),permissoes:P.clone(p.permissoes)});
                // Check invariants before changing either credentials or data.
                if(!next.some(x=>x.permissoes?.gerenciarAdministradores&&(sec.credentials[x.id]||(x.id===p.id&&body.pin))))error('Mantenha pelo menos uma pessoa com PIN e permissão para gerenciar os acessos.');
                if(body.pin){sec.credentials[p.id]=env.password(body.pin);revokeProfile(p.id,s);}
                state.bank.administradores=next;state.revision++;audit('acesso atualizado',p.nome);return {};
            }
            if(action==='delete-profile'){
                auth(body,'gerenciarAdministradores',true);if(!person(body.profileId))error('Pessoa não encontrada.');
                if(body.profileId===a.id)error('Use outro perfil autorizado para excluir o seu acesso.');
                const next=state.bank.administradores.filter(x=>x.id!==body.profileId);
                if(!next.some(x=>x.permissoes?.gerenciarAdministradores&&sec.credentials[x.id]))error('Mantenha pelo menos uma pessoa com PIN e permissão para gerenciar os acessos.');
                state.bank.administradores=next;delete sec.credentials[body.profileId];revokeProfile(body.profileId);state.revision++;audit('acesso removido',body.profileId);return {};
            }
            if(action==='status')return {revision:state.revision,...(body.prepareLogin?{nextLogin:{profileId:a.id,challenge:prepareLogin({...body,profileId:a.id})}}:{})};
            if(action==='read')return envelope();
            if(action==='commit'){
                if(Array.isArray(body.operations)&&body.operations.filter(o=>o.entity==='registros'&&o.after===null).length>10)auth(body,'configGerais',true);
                return mutate(body.operations,operator,body);
            }
            error('Ação não reconhecida.');
        }
        return {handle,state};
    }
    function migrate(bank,env){
        P.validate(bank);const state={schema:3,bankId:env.random(),revision:1,versions:{},bank:P.clean(M.normalizarBanco(bank)),receipts:{},security:{kind:'internal-pin',sessions:{},credentials:{},attempts:{}}};
        for(const a of bank.administradores)if(a.senha)state.security.credentials[a.id]=env.password(String(a.senha));
        return state;
    }
    return {create,migrate};
});
