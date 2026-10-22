(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RHModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
const APP_ID='alorh';
    function criarBancoBase() {
        return {
            app_id: APP_ID,
            empresa: { logo: "", mostrarLogoTopo: false, razao: "", fantasia: "", cnpj: "", rua: "", numero: "", bairro: "", cidade: "", uf: "PB" },
            categorias: [],
            funcoes: [],
            funcionarios: [],
            administradores: [],
            auditoria: [],
            configGerais: { salarioMinimo: "1621,00", historicoSalarioMinimo: [{ vigencia: "0000-01", valor: "1621,00" }], adiantamentoQuinzena: "500,00", diasAquisitivoFerias: 360, tema: "verde", diasFuncionamento: ['1','2','3','4','5','6'], valesTransporte: [], motivosAdiantamento: [], inssFaixas: criarTabelaINSSPadrao(), folgasGerais: [] },
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

    function criarPermissoesAdminPadrao() {
        return {
            dadosPessoais: true,
            vinculoHorarios: true,
            financeiro: true,
            gerarContracheque: true,
            gerarQuinzena: true,
            gerarPonto: true,
            gerarVT: true,
            registrarAdiantamentos: true,
            lancarFerias: true,
            registrarAusencia: true,
            registrarAtraso: true,
            registrarPresencaSemanal: true,
            acessoResumo: true,
            auditoria: true,
            dadosEmpresa: true,
            configGerais: true,
            gerenciarAdministradores: true
        };
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
        normalizado.administradores = normalizado.administradores.map((admin) => ({ ...admin, permissoes: { ...criarPermissoesAdminPadrao(), ...((admin && admin.permissoes) || {}) } }));
        normalizado.auditoria = Array.isArray(normalizado.auditoria) ? normalizado.auditoria : [];
        normalizado.registros = Array.isArray(normalizado.registros) ? normalizado.registros : [];
        normalizado.configGerais.diasFuncionamento = Array.isArray(normalizado.configGerais.diasFuncionamento) ? normalizado.configGerais.diasFuncionamento : ['1','2','3','4','5','6'];
        normalizado.configGerais.valesTransporte = Array.isArray(normalizado.configGerais.valesTransporte) ? normalizado.configGerais.valesTransporte : [];
        normalizado.configGerais.motivosAdiantamento = Array.isArray(normalizado.configGerais.motivosAdiantamento) ? normalizado.configGerais.motivosAdiantamento : [];
        normalizado.configGerais.inssFaixas = Array.isArray(normalizado.configGerais.inssFaixas) && normalizado.configGerais.inssFaixas.length ? normalizado.configGerais.inssFaixas : criarTabelaINSSPadrao();
        normalizado.configGerais.folgasGerais = Array.isArray(normalizado.configGerais.folgasGerais) ? normalizado.configGerais.folgasGerais : [];
        normalizado.configGerais.historicoSalarioMinimo = Array.isArray(normalizado.configGerais.historicoSalarioMinimo) ? normalizado.configGerais.historicoSalarioMinimo.filter(item => item && item.vigencia && item.valor) : [];
        if(normalizado.configGerais.historicoSalarioMinimo.length === 0) normalizado.configGerais.historicoSalarioMinimo.push({ vigencia: '0000-01', valor: normalizado.configGerais.salarioMinimo || base.configGerais.salarioMinimo });
        normalizado.configGerais.historicoSalarioMinimo.sort((a, b) => String(a.vigencia).localeCompare(String(b.vigencia)));
        normalizado.configGerais.diasAquisitivoFerias = Math.max(1, Math.min(370, Number(normalizado.configGerais.diasAquisitivoFerias || 360)));
        normalizado.configs.ultimaMudancaLocal = Number(normalizado.configs.ultimaMudancaLocal || 0);
        normalizado.configs.ultimaSincronizacao = Number(normalizado.configs.ultimaSincronizacao || 0);
        normalizado.configs.registrosExcluidos = normalizarExclusoesRegistros(normalizado.configs.registrosExcluidos);
        const camposFuncionarioPadrao = { pedirVT: true, pedirGratificacao: true, pedirSalFamilia: true, pedirUnidentis: true, pedirDescontoPassagem: true, pedirINSS: true, pedirINSSProvento: false, temControlePonto: true };
        normalizado.configGerais.tema = normalizado.configGerais.tema || 'verde';
        normalizado.categorias = normalizado.categorias.map((categoria) => {
            const tipoPagamento = (categoria && categoria.tipoPagamento) || ((categoria && categoria.semanal) ? 'semanal' : ((categoria && categoria.recebeContracheque === false) ? 'mensal_sem_carteira' : 'contracheque'));
            const camposOrigem = (categoria && categoria.camposFuncionario) || {};
            const camposFuncionario = { ...camposFuncionarioPadrao, ...camposOrigem };
            if(tipoPagamento === 'mensal_sem_carteira' && camposOrigem.pedirINSSProvento === undefined) camposFuncionario.pedirINSSProvento = camposFuncionario.pedirINSS !== false;
            return {
                ...categoria,
                tipoPagamento,
                temQuinquenio: categoria && categoria.temQuinquenio === true,
                temFerias: !(categoria && categoria.semanal) && !(categoria && categoria.temFerias === false),
                recebeQuinzena: !(categoria && categoria.recebeQuinzena === false),
                recebeContracheque: !(categoria && categoria.recebeContracheque === false),
                camposFuncionario
            };
        }).map((categoria) => ({ ...categoria, semanal: categoria.tipoPagamento === 'semanal', recebeContracheque: categoria.tipoPagamento === 'contracheque', temFerias: categoria.tipoPagamento !== 'semanal' && categoria.temFerias !== false, gerarInformesContador: categoria.gerarInformesContador === true }));
        normalizado.funcoes = normalizado.funcoes.map((funcao) => ({ numero: "", ...funcao }));
        normalizado.funcionarios = normalizado.funcionarios.map((funcionario) => {
            const f = { nomeSocial: "", habAtrasos: true, arquivado: false, recebeQuinquenio: false, qtdQuinquenios: 1, recebeQuinzena: true, recebeContracheque: true, temGratificacao: true, temSalFamilia: true, temUnidentis: true, descontaPassagem: true, descontaINSS: true, recebeINSSProvento: true, temControlePonto: true, temFerias: true, ...funcionario };
            f.qtdQuinquenios = Math.max(1, Math.min(9, Number(f.qtdQuinquenios || 1)));
            f.historicoSalarios = Array.isArray(f.historicoSalarios) ? f.historicoSalarios.filter(item => item && item.vigencia && item.valor) : [];
            if(f.historicoSalarios.length === 0) f.historicoSalarios.push({ vigencia: '0000-01', valor: f.salario || normalizado.configGerais.salarioMinimo });
            f.historicoSalarios.sort((a, b) => String(a.vigencia).localeCompare(String(b.vigencia)));
            return f;
        });
        normalizado.registros = normalizado.registros.map((registro) => {
            const registroNormalizado = { ...registro };
            if(!registroNormalizado._syncAtualizadoEm) registroNormalizado._syncAtualizadoEm = Number(registroNormalizado.editadoEm || registroNormalizado.criadoEm || 0);
            return registroNormalizado;
        });
        if(normalizado.configs.senhaAdmin && !normalizado.configs.senhaAdminHash) normalizado.configs.senhaAdminLegada = normalizado.configs.senhaAdmin;
        delete normalizado.configs.senhaAdmin;
        return normalizado;
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


return {criarBancoBase,criarTabelaINSSPadrao,criarPermissoesAdminPadrao,normalizarBanco,normalizarExclusoesRegistros};
});
