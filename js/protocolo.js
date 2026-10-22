/* Protocolo compartilhado pelo navegador, Apps Script e testes locais. */
(function(root, factory) {
    const api = factory();
    if(typeof module === 'object' && module.exports) module.exports = api;
    else root.RHProtocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';
    const lists = ['categorias','funcoes','funcionarios','administradores','registros','auditoria'];
    const singletons = ['empresa','configGerais'];
    const forbidden = new Set(['__proto__','prototype','constructor','senha','senhaHash','senhaSalt','password','credentials']);
    const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    const stable = value => JSON.stringify(sort(value));
    function sort(value) {
        if(Array.isArray(value)) return value.map(sort);
        if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k,sort(value[k])]));
        return value;
    }
    const equal = (a,b) => stable(a) === stable(b);
    function fail(message, code='invalid') { throw Object.assign(new Error(message), {code}); }
    function inspect(value, depth=0) {
        if(depth > 30) fail('Estrutura muito profunda.');
        if(typeof value === 'number' && !Number.isFinite(value)) fail('Número inválido.');
        if(value && typeof value === 'object') for(const k of Object.keys(value)) {
            if(['__proto__','prototype','constructor'].includes(k)) fail('Campo inválido.');
            inspect(value[k],depth+1);
        }
    }
    function validate(bank) {
        if(!bank || bank.app_id !== 'alorh' || (bank.schemaVersion && bank.schemaVersion !== 2)) fail('Arquivo de outro aplicativo ou versão incompatível.');
        inspect(bank);
        for(const name of lists) {
            if(!Array.isArray(bank[name])) fail('Backup incompleto: '+name+'.');
            const ids = new Set();
            for(const item of bank[name]) {
                if(!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(item.id) || ['__proto__','prototype','constructor'].includes(item.id) || ids.has(item.id)) fail('Identificador inválido ou repetido em '+name+'.');
                ids.add(item.id);
                if(name === 'registros' && (typeof item.type !== 'string' || !item.type)) fail('Lançamento sem tipo.');
                for(const field of name==='funcionarios'?['salario','gratificacao','salFamilia','unidentis']:name==='registros'?['valor','valorTotal']:[]) {
                    const value=item[field];if(value===undefined||value===null||value==='')continue;
                    if(!['number','string'].includes(typeof value))fail('Valor monetário inválido.');
                    const text=String(value).replace(/\s|R\$/g,'');const number=Number(text.includes(',')?text.replace(/\./g,'').replace(',','.'):text);
                    if(!Number.isFinite(number)||number<0)fail('Valor monetário inválido.');
                }
            }
        }
        for(const name of singletons) if(!bank[name] || typeof bank[name] !== 'object' || Array.isArray(bank[name])) fail('Backup incompleto: '+name+'.');
        return bank;
    }
    function clean(bank) {
        const out = {app_id:'alorh',schemaVersion:2};
        for(const name of [...lists,...singletons]) out[name] = clone(bank[name]);
        out.administradores = (out.administradores||[]).map(a => ({id:a.id,nome:a.nome,permissoes:clone(a.permissoes||{})}));
        for(const r of out.registros||[]) delete r._syncAtualizadoEm;
        return out;
    }
    const key = (entity,id,field) => JSON.stringify([entity,id,field]);
    function entries(bank, entity) { return lists.includes(entity) ? new Map((bank[entity]||[]).map(x=>[x.id,x])) : new Map([['singleton',bank[entity]||{}]]); }
    function diff(base, current, versions={}) {
        const ops=[];
        for(const entity of [...singletons,...lists]) {
            const old=entries(base,entity), next=entries(current,entity);
            for(const id of new Set([...old.keys(),...next.keys()])) {
                const before=old.get(id), after=next.get(id);
                if(!before || !after) {
                    ops.push({entity,id,field:'*',version:versions[key(entity,id,'*')]||0,before:before||null,after:after||null});
                    continue;
                }
                for(const field of new Set([...Object.keys(before),...Object.keys(after)])) {
                    if(field==='id' || field==='_syncAtualizadoEm' || forbidden.has(field)) continue;
                    if(!equal(before[field],after[field])) ops.push({entity,id,field,version:versions[key(entity,id,field)]||0,before:before[field]??null,after:after[field]??null});
                }
            }
        }
        return ops;
    }
    function businessKey(r) {
        if(['desconto_quinzena','contracheque_fechado','recibo_mensal_pago'].includes(r.type)) return [r.type,r.funcId,r.mesRef].join('|');
        if(r.type==='presenca') return [r.type,r.funcId,r.data].join('|');
        if(r.type==='pagamento_documento') return [r.type,r.documentoTipo,r.funcId,r.mesRef].join('|');
        if(r.type==='pagamento_semana' && Array.isArray(r.dias)) return [r.type,r.funcId,[...r.dias].sort().join(',')].join('|');
        if(r.type==='ferias_pagamento') return [r.type,r.funcId,r.periodoAquisitivoInicio,r.periodoAquisitivoFim].join('|');
        return null;
    }
    const financial = new Set(['salario','historicoSalarios','gratificacao','salFamilia','unidentis','pixList','vtRota','temGratificacao','temSalFamilia','temUnidentis','recebeQuinquenio','qtdQuinquenios','recebeQuinzena','recebeContracheque','descontaPassagem','descontaINSS','recebeINSSProvento']);
    const contract = new Set(['categoria','funcao','admissao','horarios','habFaltas','habFerias','habAtrasos','temControlePonto','temFerias','arquivado']);
    const recordPermissions = {falta:'registrarAusencia',atraso:'registrarAtraso',ferias:'lancarFerias',ferias_pagamento:'lancarFerias',adiantamento:'registrarAdiantamentos',presenca:'registrarPresencaSemanal',pagamento_semana:'registrarPresencaSemanal',desconto_quinzena:'gerarQuinzena',contracheque_fechado:'gerarContracheque',recibo_mensal_pago:'gerarContracheque',pagamento_documento:'gerarContracheque',folga_geral:'configGerais'};
    function authorize(op, bank, actor) {
        if(!actor || !actor.profileId) fail('Entre em um perfil para continuar.','unauthorized');
        const p=actor.permissions||{}, allowed=name=>actor.owner || p[name]===true;
        if(op.entity==='administradores') fail('Perfis só podem ser alterados nas configurações protegidas da conta.','forbidden');
        if(op.entity==='auditoria') {
            if(op.before!==null || !op.after || op.after.adminId!==actor.profileId) fail('Auditoria não pode ser substituída.','forbidden');
            return;
        }
        if(op.entity==='funcionarios' && op.field==='*' && op.after===null && bank.registros.some(r=>r.funcId===op.id)) fail('Arquive o funcionário para preservar seu histórico.','reference');
        let required=[];
        if(op.entity==='funcionarios') required=op.field==='*'?['dadosPessoais','vinculoHorarios','financeiro']:[financial.has(op.field)?'financeiro':contract.has(op.field)?'vinculoHorarios':'dadosPessoais'];
        else if(op.entity==='registros') {
            const previous=(bank.registros||[]).find(r=>r.id===op.id);
            const type=op.after?.type||previous?.type;
            if(op.field==='type' || (op.field==='*'&&op.before&&op.after)) fail('O tipo de lançamento não pode ser alterado.','forbidden');
            if(!recordPermissions[type]) fail('Tipo de lançamento não autorizado.','forbidden');
            required=[recordPermissions[type]];
            if(op.field==='adminId' && op.after!==actor.profileId) fail('Autor inválido.','forbidden');
        }
        else required=[op.entity==='empresa'?'dadosEmpresa':'configGerais'];
        if(!required.every(allowed)) fail('Este perfil não tem permissão para esta alteração.','forbidden');
    }
    function apply(bank, operations, versions={}, revision=1, actor=null, authorizeChanges=true) {
        if(!Array.isArray(operations) || operations.length>10000) fail('Lote de alterações inválido.');
        const result=clone(bank), nextVersions={...versions}, conflicts=[];
        for(const op of operations) {
            inspect(op);
            if(![...lists,...singletons].includes(op.entity) || typeof op.id!=='string' || typeof op.field!=='string' || forbidden.has(op.field)) fail('Alteração inválida.');
            if(authorizeChanges) authorize(op,bank,actor);
            const map=entries(result,op.entity), item=map.get(op.id);
            const actual=op.field==='*'?(item||null):(item?.[op.field]??null);
            const version=nextVersions[key(op.entity,op.id,op.field)]||0;
            if(equal(actual,op.after)) continue;
            if((version!==op.version || !equal(actual,op.before)) || (op.field!=='*'&&!item)) { conflicts.push({entity:op.entity,id:op.id,field:op.field});continue; }
            if(op.field==='*') {
                if(op.after===null) map.delete(op.id);
                else { if(op.after.id!==op.id) fail('ID de criação inválido.');map.set(op.id,clone(op.after)); }
            } else {
                if(op.after===null) delete item[op.field];else item[op.field]=clone(op.after);
                map.set(op.id,item);
            }
            if(lists.includes(op.entity)) result[op.entity]=[...map.values()];else result[op.entity]=map.get('singleton');
            nextVersions[key(op.entity,op.id,op.field)]=revision;
            nextVersions[key(op.entity,op.id,'*')]=revision;
        }
        if(conflicts.length) return {bank:clone(bank),versions,conflicts};
        const seen=new Map(),paidDays=new Map();
        for(const r of result.registros) {
            const k=businessKey(r);
            if(k && seen.has(k) && seen.get(k)!==r.id) fail('Já existe um lançamento para este funcionário e período. Atualize os dados antes de continuar.','duplicate');
            if(k) seen.set(k,r.id);
            if(r.type==='pagamento_semana')for(const day of r.dias||[]){
                if(paidDays.has(day)&&paidDays.get(day)!==r.id)fail('Uma presença já está incluída em outro pagamento.','duplicate');paidDays.set(day,r.id);
            }
        }
        // Preserve legacy orphans, but never introduce new dangling references.
        for(const f of result.funcionarios) for(const [field,entity] of [['categoria','categorias'],['funcao','funcoes']]) {
            if(f[field] && !result[entity].some(x=>x.id===f[field]) && bank[entity].some(x=>x.id===f[field])) fail('Este cadastro está em uso por um funcionário.','reference');
        }
        for(const r of result.registros) if(r.funcId&&!result.funcionarios.some(f=>f.id===r.funcId) && !bank.registros.some(old=>old.id===r.id&&old.funcId===r.funcId)) fail('Funcionário do lançamento não encontrado.','reference');
        validate(result);
        return {bank:result,versions:nextVersions,conflicts:[]};
    }
    function rebase(base, local, remote, oldVersions={}, remoteVersions={}) {
        const ops=diff(base,local,oldVersions), conflicts=[];
        let merged=clone(remote);
        for(const op of ops) {
            try {
                const applied=apply(merged,[op],remoteVersions,0,null,false);
                if(applied.conflicts.length) conflicts.push({...op,remote:entries(remote,op.entity).get(op.id)?.[op.field]});
                else merged=applied.bank;
            } catch(error) {
                if(['duplicate','reference'].includes(error.code)) conflicts.push({...op,message:error.message});
                else throw error;
            }
        }
        return {bank:merged,conflicts};
    }
    return {lists,singletons,clone,stable,equal,validate,clean,key,diff,businessKey,authorize,apply,rebase,financial,fail};
});
