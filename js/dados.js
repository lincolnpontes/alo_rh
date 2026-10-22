// 1. MÁSCARAS
    function maskCNPJ(el) { let v = el.value.replace(/\D/g, ""); if (v.length > 14) v = v.substring(0, 14); v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); el.value = v; }
    function maskTelefone(el) { let v = el.value.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/^(\d{2})(\d)/g,"($1) $2"); v = v.replace(/(\d{5})(\d{4})$/,"$1-$2"); el.value = v; }
    function maskCPF(el) { let v = el.value.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2"); el.value = v; }
    function maskCTPS(el) { let v = el.value.replace(/\D/g,""); if (v.length > 12) v = v.substring(0, 12); v = v.replace(/^(\d{7})(\d)/, "$1/$2"); el.value = v; }
    function maskMoeda(el) { let v = el.value.replace(/\D/g, ""); if(!v) { el.value = ""; return; } v = (parseFloat(v) / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2}); el.value = v; }
    function parseMoeda(str) {
        if(typeof str === 'number') return Number.isFinite(str) ? str : 0;
        if(str === undefined || str === null || str === '') return 0;
        let value = String(str).trim().replace(/R\$|\s/g, '');
        if(value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
        else if(/^-?\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
        const parsed = Number(value);
        if(!Number.isFinite(parsed)) throw new Error('Valor monetário inválido: ' + str);
        return parsed;
    }
    function formatMoeda(val) { return parseFloat(val).toLocaleString('pt-BR', {minimumFractionDigits: 2}); }
    function formatDataBR(dataStr) { if(!dataStr) return ""; const partes = dataStr.split('-'); if(partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`; return dataStr; }
    function formatDataCurta(dataStr) { if(!dataStr) return ""; let p = dataStr.split('-'); if(p.length !== 3) return dataStr; const m = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]; return `${p[2]}/${m[parseInt(p[1])-1]}`; }
    function getExtensoMes(mesNum) { const m = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]; return m[parseInt(mesNum)-1] || ""; }

    function mascaraPixDinamica(el) {
        let tipo = document.getElementById('novoPixTipo').value; let v = el.value;
        if(tipo === 'CPF') { v = v.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2"); el.value = v; } 
        else if (tipo === 'Celular') { v = v.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/^(\d{2})(\d)/g,"($1) $2"); v = v.replace(/(\d{5})(\d{4})$/,"$1-$2"); el.value = v; }
        else if (tipo === 'E-mail') { el.value = el.value.toLowerCase(); }
    }

    
// 2. DADOS BASE E PERSISTENCIA
    const APP_VERSION = 'v1.1.0-local';
    const STORAGE_KEY = 'alorh_v1';
    const APP_ID = 'alorh';
    const SYNC_DELAY_MS = 900;
    const REGISTROS_SYNC_INTERVAL_MS = 10000;

    let db = carregarBanco();
    let categoriaAtual = null; let modoNomeLista = 'social'; let modoSelecaoAtivo = false; let itensSelecionados = new Set(); let filtroAptosHoje = false; let diaFiltroAptos = null;
    let isSyncingFundo = false; let syncPendente = false; let timerSincronizacao = null; let timerSyncRegistros = null; let isPuxandoNuvem = false;
    let tempVT = []; let tempMotivos = []; let tempINSS = []; let tempPix = []; let tempSalariosClasse = []; let dataTempPresenca = ''; let motivoToDelete = null; let overridesContracheque = {}; let resumoContrachequeVisivel = false; let contrachequesAbertos = new Set(); let recibosMensaisAbertos = new Set(); let resumoReciboMensalVisivel = false; let contextoDescontoAtual = 'contracheque'; let adminSessaoId = sessionStorage.getItem('alorh_admin_sessao') || '';
    let origemFormClasse = 'gerenciar'; let origemFormFuncao = 'gerenciar'; let origemFormFuncionario = 'gerenciar'; let origemModalFerias = 'acoes'; let origemModalAdiantamento = 'acoes';
    let assinaturasRegistros = new Map(); let idsRegistrosConhecidos = new Set(); registrarEstadoRegistros();

    function criarBancoBase(...args) { return RHModel.criarBancoBase(...args); }

    function criarTabelaINSSPadrao(...args) { return RHModel.criarTabelaINSSPadrao(...args); }

    function criarPermissoesAdminPadrao(...args) { return RHModel.criarPermissoesAdminPadrao(...args); }

    function normalizarBanco(...args) { return RHModel.normalizarBanco(...args); }

    function carregarBanco() { return criarBancoBase(); }

    function agendarSincronizacao(delay = SYNC_DELAY_MS) {
        if(!db.configs || !db.configs.url) return;
        clearTimeout(timerSincronizacao);
        timerSincronizacao = setTimeout(() => {
            if(typeof sincronizarFundo === 'function') sincronizarFundo(false, true);
        }, delay);
    }

    function salvarBanco(opcoes = {}) {
        db = normalizarBanco(db);
        if(window.RHSync) { RHSync.changed(); return; }
        throw new Error('Armazenamento seguro ainda não inicializado.');
    }

    function prepararBancoCompartilhado(origem = db) { return RHProtocol.clean(origem); }

    function normalizarExclusoesRegistros(...args) { return RHModel.normalizarExclusoesRegistros(...args); }

    function assinaturaRegistro(registro) {
        const copia = { ...(registro || {}) };
        delete copia._syncAtualizadoEm;
        return JSON.stringify(copia);
    }

    function registrarEstadoRegistros() {
        assinaturasRegistros = new Map();
        idsRegistrosConhecidos = new Set();
        (db.registros || []).forEach((registro) => {
            if(!registro || !registro.id) return;
            assinaturasRegistros.set(registro.id, assinaturaRegistro(registro));
            idsRegistrosConhecidos.add(registro.id);
        });
    }

    function marcarAlteracoesRegistros() {
        const agora = Date.now();
        const atuais = new Set();
        db.configs.registrosExcluidos = normalizarExclusoesRegistros(db.configs.registrosExcluidos);
        (db.registros || []).forEach((registro) => {
            if(!registro.id) registro.id = `reg_${agora}_${Math.random().toString(36).slice(2, 8)}`;
            atuais.add(registro.id);
            const assinaturaAtual = assinaturaRegistro(registro);
            if(!assinaturasRegistros.has(registro.id) || assinaturasRegistros.get(registro.id) !== assinaturaAtual) {
                registro._syncAtualizadoEm = agora;
                delete db.configs.registrosExcluidos[registro.id];
            }
        });
        idsRegistrosConhecidos.forEach((id) => {
            if(!atuais.has(id)) db.configs.registrosExcluidos[id] = agora;
        });
    }

    function timestampRegistro(registro) { return Number((registro && (registro._syncAtualizadoEm || registro.editadoEm || registro.criadoEm)) || 0); }

    function assinaturaListaRegistros(registros, exclusoes) {
        const ordenados = [...(registros || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
        const exclusoesNormalizadas = normalizarExclusoesRegistros(exclusoes);
        const exclusoesOrdenadas = {};
        Object.keys(exclusoesNormalizadas).sort().forEach((id) => { exclusoesOrdenadas[id] = Number(exclusoesNormalizadas[id]); });
        return JSON.stringify({ registros: ordenados, registrosExcluidos: exclusoesOrdenadas });
    }

    function mesclarRegistrosBancos(bancoA, bancoB) {
        const local = normalizarBanco(bancoA);
        const nuvem = normalizarBanco(bancoB);
        const exclusoes = { ...local.configs.registrosExcluidos };
        Object.entries(nuvem.configs.registrosExcluidos).forEach(([id, quando]) => {
            exclusoes[id] = Math.max(Number(exclusoes[id] || 0), Number(quando || 0));
        });

        const porId = new Map();
        const considerar = (registro) => {
            if(!registro || !registro.id) return;
            const registroCopia = { ...registro };
            const atualizadoEm = timestampRegistro(registroCopia);
            if(Object.prototype.hasOwnProperty.call(exclusoes, registroCopia.id) && Number(exclusoes[registroCopia.id]) >= atualizadoEm) return;
            const atual = porId.get(registroCopia.id);
            if(!atual || atualizadoEm >= timestampRegistro(atual)) porId.set(registroCopia.id, registroCopia);
        };
        local.registros.forEach(considerar);
        nuvem.registros.forEach(considerar);

        const registros = Array.from(porId.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
        const assinaturaFinal = assinaturaListaRegistros(registros, exclusoes);
        return {
            registros,
            registrosExcluidos: exclusoes,
            mudouLocal: assinaturaListaRegistros(local.registros, local.configs.registrosExcluidos) !== assinaturaFinal,
            precisaEnviar: assinaturaListaRegistros(nuvem.registros, nuvem.configs.registrosExcluidos) !== assinaturaFinal
        };
    }

    function assinaturaAuditoria(auditoria) {
        return JSON.stringify([...(auditoria || [])].sort((a, b) => String(a.id).localeCompare(String(b.id))));
    }

    function mesclarAuditoriaBancos(bancoA, bancoB) {
        const local = normalizarBanco(bancoA);
        const nuvem = normalizarBanco(bancoB);
        const porId = new Map();
        [...local.auditoria, ...nuvem.auditoria].forEach((item) => {
            if(item && item.id) porId.set(item.id, { ...item });
        });
        const auditoria = Array.from(porId.values())
            .sort((a, b) => Number(b.data || 0) - Number(a.data || 0))
            .slice(0, 700);
        const assinaturaFinal = assinaturaAuditoria(auditoria);
        return {
            auditoria,
            mudouLocal: assinaturaAuditoria(local.auditoria) !== assinaturaFinal,
            precisaEnviar: assinaturaAuditoria(nuvem.auditoria) !== assinaturaFinal
        };
    }

    function resetarModalTopo(modalOverlay) {
        if(!modalOverlay) return;
        requestAnimationFrame(() => {
            modalOverlay.scrollTop = 0;
            const modal = modalOverlay.querySelector('.modal');
            if(modal) modal.scrollTop = 0;
        });
    }
    function prepararModaisNoTopo() {
        document.querySelectorAll('.modal-overlay').forEach((overlay) => {
            if(overlay.dataset.topObserver === '1') return;
            overlay.dataset.topObserver = '1';
            new MutationObserver(() => {
                if(overlay.style.display && overlay.style.display !== 'none') resetarModalTopo(overlay);
            }).observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
        });
    }
    function fecharModal(id) { document.getElementById(id).style.display = 'none'; }
    function marcarMudancaEstrutural() { salvarBanco({ sincronizar: true }); }

    function escapeHTML(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function safeAttr(valor) { return escapeHTML(valor).replace(/`/g, '&#96;'); }
    function safeColor(valor, fallback = '#00695C') { return /^#[0-9A-Fa-f]{6}$/.test(String(valor || '')) ? valor : fallback; }
    function jsArg(valor) { return safeAttr(JSON.stringify(String(valor ?? ''))); }
    function optionHTML(valor, texto, selecionado = false) { return `<option value="${safeAttr(valor)}" ${selecionado ? 'selected' : ''}>${escapeHTML(texto)}</option>`; }
