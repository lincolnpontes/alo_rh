// 1. MÁSCARAS
    function maskCNPJ(el) { let v = el.value.replace(/\D/g, ""); if (v.length > 14) v = v.substring(0, 14); v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); el.value = v; }
    function maskTelefone(el) { let v = el.value.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/^(\d{2})(\d)/g,"($1) $2"); v = v.replace(/(\d{5})(\d{4})$/,"$1-$2"); el.value = v; }
    function maskCPF(el) { let v = el.value.replace(/\D/g,""); if (v.length > 11) v = v.substring(0, 11); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d)/,"$1.$2"); v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2"); el.value = v; }
    function maskCTPS(el) { let v = el.value.replace(/\D/g,""); if (v.length > 12) v = v.substring(0, 12); v = v.replace(/^(\d{7})(\d)/, "$1/$2"); el.value = v; }
    function maskMoeda(el) { let v = el.value.replace(/\D/g, ""); if(!v) { el.value = ""; return; } v = (parseFloat(v) / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2}); el.value = v; }
    function parseMoeda(str) { if(!str) return 0; return parseFloat(String(str).replace(/\./g, "").replace(",", ".")); }
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
    const APP_VERSION = 'v1.0.26';
    const STORAGE_KEY = 'alorh_v1';
    const APP_ID = 'alorh';
    const SYNC_DELAY_MS = 900;
    const REGISTROS_SYNC_INTERVAL_MS = 10000;

    let db = carregarBanco();
    let categoriaAtual = null; let modoSelecaoAtivo = false; let itensSelecionados = new Set(); let filtroAptosHoje = false; let diaFiltroAptos = null;
    let isSyncingFundo = false; let syncPendente = false; let timerSincronizacao = null; let timerSyncRegistros = null; let isPuxandoNuvem = false;
    let tempVT = []; let tempMotivos = []; let tempINSS = []; let tempPix = []; let tempSalariosClasse = []; let dataTempPresenca = ''; let motivoToDelete = null;
    let origemFormClasse = 'gerenciar'; let origemFormFuncao = 'gerenciar'; let origemFormFuncionario = 'gerenciar';
    let assinaturasRegistros = new Map(); let idsRegistrosConhecidos = new Set(); registrarEstadoRegistros();

    function criarBancoBase() {
        return {
            app_id: APP_ID,
            empresa: { logo: "", razao: "", fantasia: "", cnpj: "", rua: "", numero: "", bairro: "", cidade: "", uf: "PB" },
            categorias: [],
            funcoes: [],
            funcionarios: [],
            administradores: [],
            configGerais: { salarioMinimo: "1621,00", adiantamentoQuinzena: "500,00", diasFuncionamento: ['1','2','3','4','5','6'], valesTransporte: [], motivosAdiantamento: [], inssFaixas: criarTabelaINSSPadrao() },
            registros: [],
            configs: { url: "", dadosBaixados: false, ultimaMudancaLocal: 0, ultimaSincronizacao: 0, registrosExcluidos: {}, senhaAdminHash: "", senhaAdminSalt: "", segurancaVersao: 2 }
        };
    }

    function criarTabelaINSSPadrao() {
        return [
            { limite: "1621,00", aliquota: "7,5" },
            { limite: "2902,84", aliquota: "9" },
            { limite: "4354,27", aliquota: "12" },
            { limite: "8475,55", aliquota: "14" }
        ];
    }

    function normalizarBanco(dados) {
        let base = criarBancoBase();
        let origem = (dados && typeof dados === 'object') ? dados : {};
        let normalizado = {
            ...base,
            ...origem,
            empresa: { ...base.empresa, ...(origem.empresa || {}) },
            configGerais: { ...base.configGerais, ...(origem.configGerais || {}) },
            configs: { ...base.configs, ...(origem.configs || {}) }
        };
        normalizado.app_id = APP_ID;
        normalizado.categorias = Array.isArray(normalizado.categorias) ? normalizado.categorias : [];
        normalizado.funcoes = Array.isArray(normalizado.funcoes) ? normalizado.funcoes : [];
        normalizado.funcionarios = Array.isArray(normalizado.funcionarios) ? normalizado.funcionarios : [];
        normalizado.administradores = Array.isArray(normalizado.administradores) ? normalizado.administradores : [];
        normalizado.registros = Array.isArray(normalizado.registros) ? normalizado.registros : [];
        normalizado.configGerais.diasFuncionamento = Array.isArray(normalizado.configGerais.diasFuncionamento) ? normalizado.configGerais.diasFuncionamento : ['1','2','3','4','5','6'];
        normalizado.configGerais.valesTransporte = Array.isArray(normalizado.configGerais.valesTransporte) ? normalizado.configGerais.valesTransporte : [];
        normalizado.configGerais.motivosAdiantamento = Array.isArray(normalizado.configGerais.motivosAdiantamento) ? normalizado.configGerais.motivosAdiantamento : [];
        normalizado.configGerais.inssFaixas = Array.isArray(normalizado.configGerais.inssFaixas) && normalizado.configGerais.inssFaixas.length ? normalizado.configGerais.inssFaixas : criarTabelaINSSPadrao();
        normalizado.configs.ultimaMudancaLocal = Number(normalizado.configs.ultimaMudancaLocal || 0);
        normalizado.configs.ultimaSincronizacao = Number(normalizado.configs.ultimaSincronizacao || 0);
        normalizado.configs.registrosExcluidos = normalizarExclusoesRegistros(normalizado.configs.registrosExcluidos);
        const camposFuncionarioPadrao = { pedirVT: true, pedirGratificacao: true, pedirSalFamilia: true, pedirUnidentis: true };
        normalizado.categorias = normalizado.categorias.map((categoria) => ({
            ...categoria,
            camposFuncionario: { ...camposFuncionarioPadrao, ...((categoria && categoria.camposFuncionario) || {}) }
        }));
        normalizado.funcoes = normalizado.funcoes.map((funcao) => ({ numero: "", ...funcao }));
        normalizado.funcionarios = normalizado.funcionarios.map((funcionario) => ({ nomeSocial: "", habAtrasos: true, arquivado: false, ...funcionario }));
        normalizado.registros = normalizado.registros.map((registro) => {
            const registroNormalizado = { ...registro };
            if(!registroNormalizado._syncAtualizadoEm) registroNormalizado._syncAtualizadoEm = Number(registroNormalizado.editadoEm || registroNormalizado.criadoEm || 0);
            return registroNormalizado;
        });
        if(normalizado.configs.senhaAdmin && !normalizado.configs.senhaAdminHash) normalizado.configs.senhaAdminLegada = normalizado.configs.senhaAdmin;
        delete normalizado.configs.senhaAdmin;
        return normalizado;
    }

    function carregarBanco() {
        let salvo = localStorage.getItem(STORAGE_KEY);
        if(!salvo) return criarBancoBase();
        try { return normalizarBanco(JSON.parse(salvo)); }
        catch(e) {
            console.warn('Banco local invalido, iniciando base limpa.', e);
            return criarBancoBase();
        }
    }

    function agendarSincronizacao(delay = SYNC_DELAY_MS) {
        if(!db.configs || !db.configs.url) return;
        clearTimeout(timerSincronizacao);
        timerSincronizacao = setTimeout(() => {
            if(typeof sincronizarFundo === 'function') sincronizarFundo(false, true);
        }, delay);
    }

    function salvarBanco(opcoes = {}) {
        const deveSincronizar = opcoes.sincronizar !== false;
        const atualizarMudanca = opcoes.atualizarMudanca !== false;
        db = normalizarBanco(db);
        if(atualizarMudanca) {
            marcarAlteracoesRegistros();
            db.configs.ultimaMudancaLocal = Date.now();
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        registrarEstadoRegistros();
        if(deveSincronizar) agendarSincronizacao();
    }

    function prepararBancoCompartilhado(origem = db) {
        const copia = normalizarBanco(JSON.parse(JSON.stringify(origem)));
        copia.configs = { ...(copia.configs || {}) };
        delete copia.configs.url;
        delete copia.configs.senhaAdmin;
        delete copia.configs.senhaAdminHash;
        delete copia.configs.senhaAdminSalt;
        delete copia.configs.senhaAdminLegada;
        delete copia.configs.segurancaVersao;
        delete copia.configs.ultimaSincronizacao;
        copia.configs.dadosBaixados = false;
        return copia;
    }

    function normalizarExclusoesRegistros(exclusoes) {
        const limpas = {};
        if(exclusoes && typeof exclusoes === 'object') {
            Object.keys(exclusoes).forEach((id) => {
                const quando = Number(exclusoes[id] || 0);
                if(id && quando > 0) limpas[id] = quando;
            });
        }
        return limpas;
    }

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
            if(Number(exclusoes[registroCopia.id] || 0) >= atualizadoEm) return;
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

    function fecharModal(id) { document.getElementById(id).style.display = 'none'; }
    function marcarMudancaEstrutural() { salvarBanco({ sincronizar: true }); }

    function escapeHTML(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function safeAttr(valor) { return escapeHTML(valor).replace(/`/g, '&#96;'); }
    function safeColor(valor, fallback = '#00695C') { return /^#[0-9A-Fa-f]{6}$/.test(String(valor || '')) ? valor : fallback; }
    function jsArg(valor) { return safeAttr(JSON.stringify(String(valor ?? ''))); }
    function optionHTML(valor, texto, selecionado = false) { return `<option value="${safeAttr(valor)}" ${selecionado ? 'selected' : ''}>${escapeHTML(texto)}</option>`; }

    function exigirCriptoLocal() {
        if(!window.crypto || !window.crypto.subtle) throw new Error('Este navegador nao suporta a protecao de senha local.');
    }

    function gerarSaltSenha() {
        let bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashSenhaAvancada(pin, salt) {
        exigirCriptoLocal();
        const dados = new TextEncoder().encode(`${salt}:${pin}`);
        const digest = await window.crypto.subtle.digest('SHA-256', dados);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function senhaAvancadaConfigurada() { return !!(db.configs && db.configs.senhaAdminHash && db.configs.senhaAdminSalt); }

    async function definirSenhaAvancada(pin, opcoes = {}) {
        if(!/^\d{4,12}$/.test(String(pin || ''))) throw new Error('Use uma senha numerica de 4 a 12 digitos.');
        const salt = gerarSaltSenha();
        db.configs.senhaAdminSalt = salt;
        db.configs.senhaAdminHash = await hashSenhaAvancada(pin, salt);
        db.configs.segurancaVersao = 2;
        delete db.configs.senhaAdmin;
        delete db.configs.senhaAdminLegada;
        salvarBanco({ sincronizar: opcoes.sincronizar !== false, atualizarMudanca: false });
    }

    async function validarSenhaAvancada(pin) {
        if(!senhaAvancadaConfigurada()) return false;
        return (await hashSenhaAvancada(pin, db.configs.senhaAdminSalt)) === db.configs.senhaAdminHash;
    }

    async function migrarSenhaAvancadaLegada() {
        if(db.configs && db.configs.senhaAdminLegada && !senhaAvancadaConfigurada()) {
            await definirSenhaAvancada(db.configs.senhaAdminLegada, { sincronizar: false });
        }
    }
