// AVANCADO, SEGURANCA E SINCRONIZACAO
    let modoSenhaAvancada = 'criar';
    let validandoSenhaAvancadaAuto = false;

    function abrirModalSenhaAvancada(modo = 'criar') {
        modoSenhaAvancada = modo;
        document.getElementById('novaSenhaAvancada').value = '';
        document.getElementById('confirmaSenhaAvancada').value = '';
        document.getElementById('novaSenhaAvancadaErro').style.display = 'none';
        document.getElementById('tituloCriarSenhaAvancada').innerText = modo === 'trocar' ? 'Trocar Senha Avancada' : 'Criar Senha Avancada';
        document.getElementById('textoCriarSenhaAvancada').innerText = modo === 'trocar'
            ? 'Defina uma nova senha numerica para a area avancada deste aparelho.'
            : 'Crie uma senha numerica para proteger a area de sincronizacao, backup e exclusao de historico neste aparelho.';
        document.getElementById('modalCriarSenhaAvancada').style.display = 'flex';
        setTimeout(() => document.getElementById('novaSenhaAvancada').focus(), 100);
    }

    function solicitarAcessoAvancado() {
        fecharModal('modalPainelUnificado');
        if(!senhaAvancadaConfigurada()) {
            abrirModalSenhaAvancada('criar');
            return;
        }
        document.getElementById('senhaAvancada').value = '';
        document.getElementById('senhaAvancadaErro').style.display = 'none';
        document.getElementById('modalSenhaAvancada').style.display = 'flex';
        setTimeout(() => document.getElementById('senhaAvancada').focus(), 100);
    }

    async function validarAcessoAvancado() {
        const input = document.getElementById('senhaAvancada');
        const erro = document.getElementById('senhaAvancadaErro');
        try {
            if(await validarSenhaAvancada(input.value)) {
                input.blur();
                input.value = '';
                erro.style.display = 'none';
                fecharModal('modalSenhaAvancada');
                document.getElementById('configUrlApp').value = db.configs.url || '';
                document.getElementById('modalConfigAvancadas').style.display = 'flex';
            } else {
                erro.style.display = 'block';
                input.select();
            }
        } catch(e) {
            erro.innerText = e.message || 'Falha ao validar senha.';
            erro.style.display = 'block';
        }
    }

    async function aoDigitarSenhaAvancada(input) {
        input.value = input.value.replace(/[^0-9]/g, '');
        const erro = document.getElementById('senhaAvancadaErro');
        erro.style.display = 'none';
        if(validandoSenhaAvancadaAuto || input.value.length < 4) return;
        validandoSenhaAvancadaAuto = true;
        try {
            if(await validarSenhaAvancada(input.value)) await validarAcessoAvancado();
        } finally {
            validandoSenhaAvancadaAuto = false;
        }
    }

    function abrirTrocaSenhaAvancada() { abrirModalSenhaAvancada('trocar'); }

    function cancelarCriacaoSenhaAvancada() {
        fecharModal('modalCriarSenhaAvancada');
        if(modoSenhaAvancada === 'criar') document.getElementById('modalPainelUnificado').style.display = 'flex';
    }

    async function salvarNovaSenhaAvancada() {
        const senha = document.getElementById('novaSenhaAvancada').value;
        const confirma = document.getElementById('confirmaSenhaAvancada').value;
        const erro = document.getElementById('novaSenhaAvancadaErro');
        erro.style.display = 'none';

        if(senha !== confirma) {
            erro.innerText = 'As senhas nao conferem.';
            erro.style.display = 'block';
            return;
        }

        try {
            await definirSenhaAvancada(senha, { sincronizar: false });
            fecharModal('modalCriarSenhaAvancada');
            if(modoSenhaAvancada === 'criar') {
                document.getElementById('configUrlApp').value = db.configs.url || '';
                document.getElementById('modalConfigAvancadas').style.display = 'flex';
            } else {
                alert('Senha avancada atualizada.');
            }
        } catch(e) {
            erro.innerText = e.message || 'Nao foi possivel salvar a senha.';
            erro.style.display = 'block';
        }
    }

    document.getElementById('senhaAvancada').addEventListener('keydown', function(e) {
        if(e.key === 'Enter') validarAcessoAvancado();
    });

    function adicionarParametroURL(url, chave, valor) {
        return url + (url.includes('?') ? '&' : '?') + encodeURIComponent(chave) + '=' + encodeURIComponent(valor);
    }

    function atualizarTextoSincronizacao(texto) {
        const el = document.getElementById('syncStatusTexto');
        if(el) el.innerText = texto;
    }

    function textoHorarioSync() {
        return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    async function puxarBancoNuvem(url = db.configs.url) {
        const fetchUrl = adicionarParametroURL(url, 'nocache', Date.now());
        const erros = [];
        try {
            const res = await fetch(fetchUrl, { redirect: "follow", cache: "no-store" });
            const dados = await res.json();
            if(dados && dados.ok === false) throw new Error(dados.erro || 'Falha na nuvem.');
            return dados;
        } catch(e) {
            erros.push(e.message || 'Falha ao ler resposta direta.');
        }

        try {
            return await puxarBancoNuvemJSONP(url);
        } catch(e) {
            const detalhe = e.message || erros[0] || 'Falha ao puxar dados.';
            throw new Error(detalhe);
        }
    }

    function puxarBancoNuvemJSONP(url) {
        return new Promise((resolve, reject) => {
            const callback = `alorhSync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const script = document.createElement('script');
            const limpar = () => {
                delete window[callback];
                if(script.parentNode) script.parentNode.removeChild(script);
            };
            const timer = setTimeout(() => {
                limpar();
                reject(new Error('O Google Script nao respondeu como app do Alo RH. Confira se o Code.gs completo foi colado e se a implantacao esta atualizada.'));
            }, 15000);
            window[callback] = (dados) => {
                clearTimeout(timer);
                limpar();
                if(dados && dados.ok === false) reject(new Error(dados.erro || 'Falha na nuvem.'));
                else resolve(dados);
            };
            script.onerror = () => {
                clearTimeout(timer);
                limpar();
                reject(new Error('Falha ao carregar a URL do Google Script. Confira a implantacao e o acesso como Qualquer pessoa.'));
            };
            script.src = adicionarParametroURL(adicionarParametroURL(url, 'callback', callback), 'nocache', Date.now());
            document.head.appendChild(script);
        });
    }

    async function enviarBancoNuvem() {
        const payload = JSON.stringify({ action: 'salvar_banco', dados: prepararBancoCompartilhado(db) });
        const opcoes = {
            method: 'POST',
            redirect: "follow",
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        };
        try {
            const res = await fetch(db.configs.url, opcoes);
            try {
                const retorno = await res.json();
                if(retorno && retorno.ok === false) throw new Error(retorno.erro || 'Falha ao salvar na nuvem.');
            } catch(parseErr) {
                if(parseErr && /Falha/.test(parseErr.message || '')) throw parseErr;
            }
        } catch(e) {
            await fetch(db.configs.url, { ...opcoes, mode: 'no-cors' });
        }
    }

    function preservarConfigsLocais(novoBanco, bancoLocal = db) {
        const preservado = normalizarBanco(novoBanco);
        const configsLocais = bancoLocal.configs || {};
        preservado.configs.url = configsLocais.url || preservado.configs.url || '';
        preservado.configs.dadosBaixados = true;
        preservado.configs.ultimaSincronizacao = Date.now();
        if(configsLocais.senhaAdminHash) {
            preservado.configs.senhaAdminHash = configsLocais.senhaAdminHash;
            preservado.configs.senhaAdminSalt = configsLocais.senhaAdminSalt;
            preservado.configs.segurancaVersao = configsLocais.segurancaVersao || 2;
        }
        return preservado;
    }

    function temDadosNegocio(banco) {
        const b = normalizarBanco(banco);
        const empresaPreenchida = ['logo','razao','fantasia','cnpj','rua','numero','bairro','cidade']
            .some(campo => String((b.empresa || {})[campo] || '').trim());
        return empresaPreenchida
            || b.categorias.length > 0
            || b.funcoes.length > 0
            || b.funcionarios.length > 0
            || b.administradores.length > 0
            || b.registros.length > 0
            || b.configGerais.valesTransporte.length > 0
            || b.configGerais.motivosAdiantamento.length > 0;
    }

    function resumoBancoSync(banco) {
        const b = normalizarBanco(banco);
        return [
            `funcionários: ${b.funcionarios.length}`,
            `vínculos: ${b.categorias.length}`,
            `funções: ${b.funcoes.length}`,
            `lançamentos: ${b.registros.length}`
        ].join(', ');
    }

    function aplicarBancoNuvem(nuvemDB, modo = 'completo') {
        if(!nuvemDB || nuvemDB.app_id !== APP_ID) throw new Error('Banco invalido.');
        const localAtual = normalizarBanco(db);
        const nuvem = normalizarBanco(nuvemDB);
        const localTs = Number(localAtual.configs.ultimaMudancaLocal || 0);
        const nuvemTs = Number(nuvem.configs.ultimaMudancaLocal || 0);
        const localTemDados = temDadosNegocio(localAtual);
        const nuvemTemDados = temDadosNegocio(nuvem);
        let base = localAtual;
        if(modo === 'completo') {
            if(!localTemDados && nuvemTemDados) base = nuvem;
            else if(localTemDados && !nuvemTemDados) base = localAtual;
            else base = nuvemTs > localTs ? nuvem : localAtual;
        }
        const outro = base === nuvem ? localAtual : nuvem;
        const mergeRegistros = mesclarRegistrosBancos(base, outro);
        const mergeAuditoria = typeof mesclarAuditoriaBancos === 'function' ? mesclarAuditoriaBancos(base, outro) : { auditoria: base.auditoria || [], mudouLocal: false, precisaEnviar: false };
        const novoBanco = normalizarBanco(base);

        novoBanco.registros = mergeRegistros.registros;
        novoBanco.auditoria = mergeAuditoria.auditoria;
        novoBanco.configs.registrosExcluidos = mergeRegistros.registrosExcluidos;
        db = preservarConfigsLocais(novoBanco, localAtual);

        const mudouLocal = JSON.stringify(prepararBancoCompartilhado(localAtual)) !== JSON.stringify(prepararBancoCompartilhado(db));
        salvarBanco({ sincronizar: false, atualizarMudanca: false });
        return { mudouLocal: mudouLocal || mergeAuditoria.mudouLocal, precisaEnviar: (modo === 'completo' && localTs > nuvemTs) || mergeRegistros.precisaEnviar || mergeAuditoria.precisaEnviar };
    }

    async function sincronizarAoEntrar(manual = false) {
        if(!db.configs.url) return;
        if(isPuxandoNuvem) return;
        isPuxandoNuvem = true;
        if(manual) atualizarTextoSincronizacao('Sincronizando agora...');
        try {
            const nuvemDB = await puxarBancoNuvem();
            const resultado = aplicarBancoNuvem(nuvemDB, 'completo');
            if(resultado.mudouLocal) {
                renderizarFiltros();
                renderizarLista();
                if(typeof aplicarTemaApp === 'function') aplicarTemaApp();
                if(typeof atualizarLogoTopo === 'function') atualizarLogoTopo();
            }
            if(resultado.precisaEnviar) await sincronizarFundo(false, true);
            atualizarTextoSincronizacao(`Ultima sincronizacao: ${textoHorarioSync()}`);
            return true;
        } catch(e) {
            atualizarTextoSincronizacao('Nao foi possivel sincronizar agora. O app continua com os dados deste aparelho.');
            if(manual) alert(`Nao foi possivel sincronizar agora.\n\nDetalhe: ${e.message || 'Confira a URL e o token.'}`);
            return false;
        } finally {
            isPuxandoNuvem = false;
            iniciarSyncRegistrosTempoReal();
        }
    }

    function iniciarSyncRegistrosTempoReal() {
        clearInterval(timerSyncRegistros);
        if(!db.configs.url) return;
        timerSyncRegistros = setInterval(() => sincronizarRegistrosTempoReal(), REGISTROS_SYNC_INTERVAL_MS);
    }

    async function sincronizarRegistrosTempoReal() {
        if(!db.configs.url || isPuxandoNuvem || isSyncingFundo) return;
        isPuxandoNuvem = true;
        try {
            const nuvemDB = await puxarBancoNuvem();
            const resultado = aplicarBancoNuvem(nuvemDB, 'registros');
            if(resultado.mudouLocal) { renderizarLista(); if(typeof aplicarTemaApp === 'function') aplicarTemaApp(); if(typeof atualizarLogoTopo === 'function') atualizarLogoTopo(); }
            if(resultado.precisaEnviar) agendarSincronizacao(300);
            atualizarTextoSincronizacao(`Lancamentos conferidos: ${textoHorarioSync()}`);
        } catch(e) {
            atualizarTextoSincronizacao('Sincronizacao de lancamentos pendente.');
        } finally {
            isPuxandoNuvem = false;
        }
    }

    async function forcarSincronizacaoManual() {
        if(!db.configs.url) return alert("Configure a URL!");
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            const ok = await sincronizarAoEntrar(true);
            if(ok) alert('Sincronizacao concluida.');
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    async function testarSincronizacao() {
        if(!db.configs.url) return alert("Configure a URL!");
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            const nuvemDB = await puxarBancoNuvem();
            alert(`Conexao com a nuvem OK.\n\nNeste aparelho: ${resumoBancoSync(db)}\nNa nuvem: ${resumoBancoSync(nuvemDB)}`);
        } catch(e) {
            alert(`Teste falhou.\n\nDetalhe: ${e.message || 'Confira a URL, token e implantacao do Apps Script.'}`);
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    async function salvarURL() {
        const inputUrl = document.getElementById('configUrlApp').value.trim();
        if(!inputUrl) return alert("Digite a URL!");
        if(!/^https:\/\/script\.google\.com\/macros\/s\//.test(inputUrl) || !/[?&]token=/.test(inputUrl)) {
            return alert("Cole a URL completa do Google Script com o token no final.");
        }
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            db.configs.url = inputUrl;
            let nuvemDB = await puxarBancoNuvem(inputUrl);
            const resultado = aplicarBancoNuvem(nuvemDB, 'completo');
            db.configs.url = inputUrl;
            await migrarSenhaAvancadaLegada();
            salvarBanco({ sincronizar: false, atualizarMudanca: false });
            if(resultado.precisaEnviar) await sincronizarFundo(true, true);
            iniciarSyncRegistrosTempoReal();
            alert("Concluido! Dados puxados.");
            location.reload();
        } catch(e) {
            alert(`Falha ao puxar dados.\n\nDetalhe: ${e.message || 'Confira a URL do Google Script e o token.'}`);
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    async function sincronizarFundo(forcado = false, apenasEmpurrar = false) {
        if(!db.configs.url) return;
        if(isSyncingFundo) { syncPendente = true; return; }
        isSyncingFundo = true;
        let indicador = document.getElementById('syncIndicador');
        if(indicador) indicador.style.opacity = '1';
        try {
            await enviarBancoNuvem();
            db.configs.ultimaSincronizacao = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            atualizarTextoSincronizacao(`Enviado para a nuvem: ${textoHorarioSync()}`);
        } catch(e) {
            if(forcado) throw e;
        } finally {
            isSyncingFundo = false;
            if(indicador) indicador.style.opacity = '0';
            if(syncPendente) {
                syncPendente = false;
                agendarSincronizacao(300);
            }
        }
    }

    async function forcarEnvioNuvemCompleto() {
        if(!db.configs.url) return alert("Configure a URL!");
        clearTimeout(timerSincronizacao);
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            await sincronizarFundo(true, true);
            alert("Backup salvo!");
        } catch(e) {
            alert("Falha ao salvar backup.");
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    const COLUNAS_MODELO_FUNCIONARIOS = [
        'Código', 'Nome', 'Nome Social', 'Data Nasc.', 'Admissão', 'CPF', 'RG', 'RG UF', 'CTPS', 'WhatsApp',
        'Vínculo', 'Função Nº', 'Função', 'Salário', 'Gratificação', 'Salário Família', 'Desc. Unidentis',
        'Tem Gratificação', 'Tem Salário Família', 'Tem Unidentis', 'Recebe Quinquênio', 'Qtd. Quinquênios', 'Recebe Quinzena', 'Recebe Contracheque', 'Desconta Passagem', 'Desconta INSS', 'Controle Ponto',
        'Vale-Transporte', 'PIX Tipo', 'PIX Chave', 'Entrada', 'Saída', 'Intervalo Início', 'Intervalo Fim',
        'Folgas', 'Habilitar Faltas', 'Habilitar Férias', 'Habilitar Atrasos'
    ];

    function xmlEscape(valor) {
        return String(valor ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
    }

    function colunaXLSX(indice) {
        let s = '';
        let n = indice + 1;
        while(n > 0) {
            const mod = (n - 1) % 26;
            s = String.fromCharCode(65 + mod) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    }

    function worksheetXML(linhas) {
        const rows = linhas.map((linha, rIdx) => {
            const cells = linha.map((valor, cIdx) => `<c r="${colunaXLSX(cIdx)}${rIdx + 1}" t="inlineStr"><is><t>${xmlEscape(valor)}</t></is></c>`).join('');
            return `<row r="${rIdx + 1}">${cells}</row>`;
        }).join('');
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${COLUNAS_MODELO_FUNCIONARIOS.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 1 ? 28 : 16}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
    }

    function crc32(bytes) {
        if(!crc32.tabela) {
            crc32.tabela = Array.from({ length: 256 }, (_, n) => {
                let c = n;
                for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                return c >>> 0;
            });
        }
        let crc = 0 ^ -1;
        for(let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crc32.tabela[(crc ^ bytes[i]) & 0xFF];
        return (crc ^ -1) >>> 0;
    }

    function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; }
    function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; }
    function textoBytes(texto) { return new TextEncoder().encode(texto); }

    function criarXLSXSemCompressao(arquivos) {
        const partes = [];
        const centrais = [];
        let offset = 0;
        arquivos.forEach((arquivo) => {
            const nome = textoBytes(arquivo.nome);
            const dados = textoBytes(arquivo.conteudo);
            const crc = crc32(dados);
            const local = [u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), nome, dados];
            partes.push(...local);
            centrais.push([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nome]);
            offset += local.reduce((total, item) => total + item.length, 0);
        });
        const inicioCentral = offset;
        centrais.forEach((central) => { partes.push(...central); offset += central.reduce((total, item) => total + item.length, 0); });
        const tamanhoCentral = offset - inicioCentral;
        partes.push(u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length), u32(tamanhoCentral), u32(inicioCentral), u16(0));
        return new Blob(partes, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    function formatarDataModeloFuncionarios(data) {
        if(!data) return '';
        const partes = String(data).split('-');
        if(partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
        return data;
    }

    function nomesFolgasModelo(folgas = []) {
        const nomes = { '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb', '0': 'Dom' };
        return (folgas || []).map(dia => nomes[dia]).filter(Boolean).join(', ');
    }

    function linhaModeloFuncionario(funcionario) {
        const vinculo = db.categorias.find(c => c.id === funcionario.categoria);
        const funcao = db.funcoes.find(fn => fn.id === funcionario.funcao);
        const pix = (funcionario.pixList || []).find(p => p.principal) || (funcionario.pixList || [])[0] || {};
        const horarios = funcionario.horarios || {};
        return [
            funcionario.codigo || '',
            funcionario.nome || '',
            funcionario.nomeSocial || '',
            formatarDataModeloFuncionarios(funcionario.dataNasc),
            formatarDataModeloFuncionarios(funcionario.admissao),
            funcionario.cpf || '',
            funcionario.rg || '',
            funcionario.rgUF || 'PB',
            funcionario.ctps || '',
            funcionario.telefone || '',
            vinculo ? vinculo.nome : '',
            funcao ? (funcao.numero || '') : '',
            funcao ? (funcao.nome || '') : '',
            funcionario.salario || '',
            funcionario.gratificacao || '',
            funcionario.salFamilia || '',
            funcionario.unidentis || '',
            funcionario.temGratificacao === false ? 'Não' : 'Sim',
            funcionario.temSalFamilia === false ? 'Não' : 'Sim',
            funcionario.temUnidentis === false ? 'Não' : 'Sim',
            funcionario.recebeQuinquenio === true ? 'Sim' : 'Não',
            funcionario.qtdQuinquenios || 1,
            funcionario.recebeQuinzena === false ? 'Não' : 'Sim',
            funcionario.recebeContracheque === false ? 'Não' : 'Sim',
            funcionario.descontaPassagem === false ? 'Não' : 'Sim',
            funcionario.descontaINSS === false ? 'Não' : 'Sim',
            funcionario.temControlePonto === false ? 'Não' : 'Sim',
            funcionario.vtRota || '',
            pix.tipo || 'CPF',
            pix.chave || '',
            horarios.entrada || '',
            horarios.saida || '',
            horarios.intEnt || '',
            horarios.intSai || '',
            nomesFolgasModelo(horarios.folgas || []),
            funcionario.habFaltas === false ? 'Não' : 'Sim',
            funcionario.habFerias === false ? 'Não' : 'Sim',
            funcionario.habAtrasos === false ? 'Não' : 'Sim'
        ];
    }

    function baixarModeloFuncionariosXLSX() {
        const exemplo = ['001', 'ANTONIO DA SILVA', '', '15/03/1990', '03/11/2020', '000.000.000-00', '', 'PB', '0000000/00000', '(83) 99999-9999', 'Carteira Assinada', '002', 'Garçom', '1.500,00', '', '', '', 'Sim', 'Sim', 'Sim', 'Não', '1', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Centro', 'CPF', '000.000.000-00', '07:00', '17:00', '11:00', '12:00', 'Seg, Ter', 'Sim', 'Sim', 'Sim'];
        const linhasFuncionarios = (db.funcionarios || []).map(linhaModeloFuncionario);
        const sheet = worksheetXML([COLUNAS_MODELO_FUNCIONARIOS, ...(linhasFuncionarios.length ? linhasFuncionarios : [exemplo])]);
        const arquivos = [
            { nome: '[Content_Types].xml', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
            { nome: '_rels/.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
            { nome: 'xl/workbook.xml', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Funcionarios" sheetId="1" r:id="rId1"/></sheets></workbook>' },
            { nome: 'xl/_rels/workbook.xml.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
            { nome: 'xl/worksheets/sheet1.xml', conteudo: sheet }
        ];
        const blob = criarXLSXSemCompressao(arquivos);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'alo_rh_modelo_funcionarios.xlsx';
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
    }

    function normalizarCabecalhoPlanilha(valor) {
        return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    function valorBooleanoImportado(valor, padrao = true) {
        const texto = String(valor || '').trim().toLowerCase();
        if(!texto) return padrao;
        return ['sim', 's', 'true', '1', 'x', 'yes'].includes(texto);
    }

    function normalizarDataImportada(valor) {
        const texto = String(valor || '').trim();
        if(!texto) return '';
        if(/^\d+(\.\d+)?$/.test(texto) && Number(texto) > 20000) {
            const data = new Date(Date.UTC(1899, 11, 30) + Number(texto) * 86400000);
            return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
        }
        const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if(br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
        const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if(iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
        return texto;
    }

    function normalizarFolgasImportadas(valor) {
        const mapa = { seg: '1', segunda: '1', ter: '2', terca: '2', terça: '2', qua: '3', quarta: '3', qui: '4', quinta: '4', sex: '5', sexta: '5', sab: '6', sáb: '6', sabado: '6', sábado: '6', dom: '0', domingo: '0' };
        return String(valor || '').split(/[;,|]/).map(v => v.trim().toLowerCase()).map(v => mapa[v] || '').filter(Boolean);
    }

    function obterOuCriarVinculoImportado(nome) {
        const texto = String(nome || '').trim();
        if(!texto) return '';
        let vinculo = db.categorias.find(c => String(c.nome || '').trim().toLowerCase() === texto.toLowerCase());
        if(vinculo) return vinculo.id;
        vinculo = { id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), nome: texto, cor: '#00695C', corTexto: '#ffffff', semanal: false, temQuinquenio: false, recebeQuinzena: true, recebeContracheque: true, camposFuncionario: { pedirVT: true, pedirGratificacao: true, pedirSalFamilia: true, pedirUnidentis: true, pedirDescontoPassagem: true, pedirINSS: true, temControlePonto: true }, horarios: { entrada: '', saida: '', intEnt: '', intSai: '', semIntervalo: false }, salarios: [] };
        db.categorias.push(vinculo);
        return vinculo.id;
    }

    function obterOuCriarFuncaoImportada(nome, numero) {
        const texto = String(nome || '').trim();
        const num = String(numero || '').trim();
        if(!texto) return '';
        let funcao = db.funcoes.find(fn => String(fn.nome || '').trim().toLowerCase() === texto.toLowerCase());
        if(funcao) {
            if(num && !funcao.numero) funcao.numero = num;
            return funcao.id;
        }
        funcao = { id: 'fn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), numero: num, nome: texto };
        db.funcoes.push(funcao);
        return funcao.id;
    }

    function bytesParaTexto(bytes) { return new TextDecoder('utf-8').decode(bytes); }
    function lerU16(bytes, off) { return new DataView(bytes.buffer, bytes.byteOffset + off, 2).getUint16(0, true); }
    function lerU32(bytes, off) { return new DataView(bytes.buffer, bytes.byteOffset + off, 4).getUint32(0, true); }

    async function inflarDeflateRaw(bytes) {
        if(!('DecompressionStream' in window)) throw new Error('Este navegador nao consegue ler XLSX compactado. Use o Chrome atualizado.');
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function lerArquivosXLSX(buffer) {
        const bytes = new Uint8Array(buffer);
        let eocd = -1;
        for(let i = bytes.length - 22; i >= 0; i--) {
            if(lerU32(bytes, i) === 0x06054b50) { eocd = i; break; }
        }
        if(eocd < 0) throw new Error('Arquivo XLSX invalido.');
        const total = lerU16(bytes, eocd + 10);
        let off = lerU32(bytes, eocd + 16);
        const arquivos = {};
        for(let i = 0; i < total; i++) {
            if(lerU32(bytes, off) !== 0x02014b50) throw new Error('Estrutura do XLSX invalida.');
            const metodo = lerU16(bytes, off + 10);
            const compSize = lerU32(bytes, off + 20);
            const nomeLen = lerU16(bytes, off + 28);
            const extraLen = lerU16(bytes, off + 30);
            const commentLen = lerU16(bytes, off + 32);
            const localOff = lerU32(bytes, off + 42);
            const nome = bytesParaTexto(bytes.slice(off + 46, off + 46 + nomeLen));
            const localNomeLen = lerU16(bytes, localOff + 26);
            const localExtraLen = lerU16(bytes, localOff + 28);
            const inicioDados = localOff + 30 + localNomeLen + localExtraLen;
            const dadosCompactados = bytes.slice(inicioDados, inicioDados + compSize);
            const dados = metodo === 0 ? dadosCompactados : await inflarDeflateRaw(dadosCompactados);
            arquivos[nome] = bytesParaTexto(dados);
            off += 46 + nomeLen + extraLen + commentLen;
        }
        return arquivos;
    }

    function textoCelulaXLSX(celula, compartilhadas) {
        const tipo = celula.getAttribute('t');
        if(tipo === 'inlineStr') return Array.from(celula.getElementsByTagName('t')).map(t => t.textContent).join('');
        const v = celula.getElementsByTagName('v')[0];
        if(!v) return '';
        if(tipo === 's') return compartilhadas[Number(v.textContent)] || '';
        return v.textContent || '';
    }

    function indiceColunaRef(ref) {
        const letras = String(ref || '').replace(/[0-9]/g, '');
        let total = 0;
        for(const letra of letras) total = total * 26 + (letra.charCodeAt(0) - 64);
        return total - 1;
    }

    async function lerLinhasFuncionariosXLSX(file) {
        const arquivos = await lerArquivosXLSX(await file.arrayBuffer());
        const parser = new DOMParser();
        const compartilhadas = [];
        if(arquivos['xl/sharedStrings.xml']) {
            const sharedDoc = parser.parseFromString(arquivos['xl/sharedStrings.xml'], 'application/xml');
            Array.from(sharedDoc.getElementsByTagName('si')).forEach(si => compartilhadas.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent).join('')));
        }
        let sheetPath = 'xl/worksheets/sheet1.xml';
        if(!arquivos[sheetPath] && arquivos['xl/workbook.xml'] && arquivos['xl/_rels/workbook.xml.rels']) {
            const workbook = parser.parseFromString(arquivos['xl/workbook.xml'], 'application/xml');
            const sheet = workbook.getElementsByTagName('sheet')[0];
            const rid = sheet && (sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
            const rels = parser.parseFromString(arquivos['xl/_rels/workbook.xml.rels'], 'application/xml');
            const rel = Array.from(rels.getElementsByTagName('Relationship')).find(r => r.getAttribute('Id') === rid);
            if(rel) sheetPath = 'xl/' + rel.getAttribute('Target').replace(/^\/?xl\//, '').replace(/^\//, '');
        }
        if(!arquivos[sheetPath]) throw new Error('Nao encontrei a primeira aba da planilha.');
        const sheetDoc = parser.parseFromString(arquivos[sheetPath], 'application/xml');
        return Array.from(sheetDoc.getElementsByTagName('row')).map(row => {
            const linha = [];
            Array.from(row.getElementsByTagName('c')).forEach(celula => {
                linha[indiceColunaRef(celula.getAttribute('r'))] = textoCelulaXLSX(celula, compartilhadas);
            });
            return linha.map(v => v || '');
        });
    }

    function valorDaLinha(row, mapa, nomes) {
        for(const nome of nomes) {
            const idx = mapa[normalizarCabecalhoPlanilha(nome)];
            if(idx !== undefined) return String(row[idx] || '').trim();
        }
        return '';
    }

    async function importarFuncionariosXLSX(event) {
        const file = event.target.files[0];
        if(!file) return;
        document.getElementById('loadingOverlay').style.display = 'flex';
        try {
            const linhas = await lerLinhasFuncionariosXLSX(file);
            if(linhas.length < 2) throw new Error('A planilha nao tem linhas de funcionarios.');
            const mapa = {};
            linhas[0].forEach((cab, idx) => { mapa[normalizarCabecalhoPlanilha(cab)] = idx; });
            let criados = 0, atualizados = 0, ignorados = 0;
            linhas.slice(1).forEach((row) => {
                const nome = valorDaLinha(row, mapa, ['Nome']);
                if(!nome) { ignorados++; return; }
                const codigo = valorDaLinha(row, mapa, ['Código', 'Codigo']);
                const cpf = valorDaLinha(row, mapa, ['CPF']);
                const existente = db.funcionarios.find(f => (codigo && String(f.codigo || '') === codigo) || (cpf && String(f.cpf || '') === cpf));
                const vinculoId = obterOuCriarVinculoImportado(valorDaLinha(row, mapa, ['Vínculo', 'Vinculo']));
                const funcaoId = obterOuCriarFuncaoImportada(valorDaLinha(row, mapa, ['Função', 'Funcao']), valorDaLinha(row, mapa, ['Função Nº', 'Funcao Nº', 'Funcao N', 'Função N']));
                const pixChave = valorDaLinha(row, mapa, ['PIX Chave']);
                const pixTipo = valorDaLinha(row, mapa, ['PIX Tipo']) || 'CPF';
                const pixList = pixChave ? [{ tipo: pixTipo, chave: pixChave, principal: true }] : (existente && existente.pixList ? existente.pixList : []);
                const funcionario = {
                    ...(existente || {}),
                    id: existente ? existente.id : 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    codigo,
                    nome,
                    nomeSocial: valorDaLinha(row, mapa, ['Nome Social', 'NomeSocial']) || (existente ? existente.nomeSocial || '' : ''),
                    dataNasc: normalizarDataImportada(valorDaLinha(row, mapa, ['Data Nasc.', 'Data Nasc', 'Nascimento'])),
                    admissao: normalizarDataImportada(valorDaLinha(row, mapa, ['Admissão', 'Admissao'])),
                    cpf,
                    rg: valorDaLinha(row, mapa, ['RG']),
                    rgUF: valorDaLinha(row, mapa, ['RG UF']) || 'PB',
                    ctps: valorDaLinha(row, mapa, ['CTPS']),
                    telefone: valorDaLinha(row, mapa, ['WhatsApp', 'Telefone']),
                    categoria: vinculoId,
                    funcao: funcaoId,
                    salario: valorDaLinha(row, mapa, ['Salário', 'Salario']),
                    gratificacao: valorDaLinha(row, mapa, ['Gratificação', 'Gratificacao']),
                    salFamilia: valorDaLinha(row, mapa, ['Salário Família', 'Salario Familia', 'Sal. Família', 'Sal Familia']),
                    unidentis: valorDaLinha(row, mapa, ['Desc. Unidentis', 'Unidentis']),
                    temGratificacao: valorBooleanoImportado(valorDaLinha(row, mapa, ['Tem Gratificação', 'Tem Gratificacao']), existente ? existente.temGratificacao !== false : true),
                    temSalFamilia: valorBooleanoImportado(valorDaLinha(row, mapa, ['Tem Salário Família', 'Tem Salario Familia']), existente ? existente.temSalFamilia !== false : true),
                    temUnidentis: valorBooleanoImportado(valorDaLinha(row, mapa, ['Tem Unidentis', 'Desconto Unidentis']), existente ? existente.temUnidentis !== false : true),
                    recebeQuinquenio: valorBooleanoImportado(valorDaLinha(row, mapa, ['Recebe Quinquênio', 'Recebe Quinquenio', 'Quinquênio', 'Quinquenio']), existente ? existente.recebeQuinquenio === true : false),
                    qtdQuinquenios: Math.max(1, Math.min(9, parseInt(valorDaLinha(row, mapa, ['Qtd. Quinquênios', 'Qtd Quinquenios', 'Quantidade Quinquênios', 'Quantidade Quinquenios']) || (existente ? existente.qtdQuinquenios || 1 : 1), 10) || 1)),
                    recebeQuinzena: valorBooleanoImportado(valorDaLinha(row, mapa, ['Recebe Quinzena', 'Quinzena']), existente ? existente.recebeQuinzena !== false : true),
                    recebeContracheque: valorBooleanoImportado(valorDaLinha(row, mapa, ['Recebe Contracheque', 'Contracheque']), existente ? existente.recebeContracheque !== false : true),
                    descontaPassagem: valorBooleanoImportado(valorDaLinha(row, mapa, ['Desconta Passagem', 'Desconto Passagem']), existente ? existente.descontaPassagem !== false : true),
                    descontaINSS: valorBooleanoImportado(valorDaLinha(row, mapa, ['Desconta INSS', 'Desconto INSS']), existente ? existente.descontaINSS !== false : true),
                    temControlePonto: valorBooleanoImportado(valorDaLinha(row, mapa, ['Controle Ponto', 'Controle de Ponto']), existente ? existente.temControlePonto !== false : true),
                    vtRota: valorDaLinha(row, mapa, ['Vale-Transporte', 'Rota VT', 'VT']),
                    pixList,
                    habFaltas: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Faltas']), true),
                    habFerias: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Férias', 'Habilitar Ferias']), true),
                    habAtrasos: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Atrasos', 'Habilitar Atraso']), true),
                    arquivado: existente ? !!existente.arquivado : false,
                    horarios: {
                        entrada: valorDaLinha(row, mapa, ['Entrada']),
                        saida: valorDaLinha(row, mapa, ['Saída', 'Saida']),
                        intEnt: valorDaLinha(row, mapa, ['Intervalo Início', 'Intervalo Inicio']),
                        intSai: valorDaLinha(row, mapa, ['Intervalo Fim']),
                        folgas: normalizarFolgasImportadas(valorDaLinha(row, mapa, ['Folgas']))
                    }
                };
                if(existente) {
                    db.funcionarios[db.funcionarios.findIndex(f => f.id === existente.id)] = funcionario;
                    atualizados++;
                } else {
                    db.funcionarios.push(funcionario);
                    criados++;
                }
            });
            salvarBanco();
            renderizarFiltros();
            renderizarLista();
            if(typeof aplicarTemaApp === 'function') aplicarTemaApp();
            if(typeof atualizarLogoTopo === 'function') atualizarLogoTopo();
            alert(`Importacao concluida.\n\nCriados: ${criados}\nAtualizados: ${atualizados}\nIgnorados: ${ignorados}`);
        } catch(e) {
            alert(`Nao foi possivel importar a planilha.\n\nDetalhe: ${e.message || 'Verifique o modelo XLSX.'}`);
        } finally {
            document.getElementById('loadingOverlay').style.display = 'none';
            event.target.value = '';
        }
    }

    function exportarDados() {
        if(!confirm('O backup inclui dados sensiveis como CPF, PIX, salarios e historico. A senha avancada e a URL de sincronizacao nao serao exportadas. Exportar agora?')) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prepararBancoCompartilhado(db), null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "alorh_bkp_" + getHojeSTR() + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function importarDados(event) {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedDb = JSON.parse(e.target.result);
                if(importedDb && importedDb.app_id === APP_ID) {
                    const urlSalva = db.configs.url;
                    const segurancaLocal = {
                        senhaAdminHash: db.configs.senhaAdminHash,
                        senhaAdminSalt: db.configs.senhaAdminSalt,
                        segurancaVersao: db.configs.segurancaVersao
                    };
                    db = normalizarBanco(importedDb);
                    if(urlSalva) db.configs.url = urlSalva;
                    if(segurancaLocal.senhaAdminHash && !db.configs.senhaAdminHash) {
                        db.configs.senhaAdminHash = segurancaLocal.senhaAdminHash;
                        db.configs.senhaAdminSalt = segurancaLocal.senhaAdminSalt;
                        db.configs.segurancaVersao = segurancaLocal.segurancaVersao || 2;
                    }
                    await migrarSenhaAvancadaLegada();
                    salvarBanco();
                    alert("Restaurado!");
                    location.reload();
                } else {
                    alert("Arquivo invalido.");
                }
            } catch(err) {
                alert("Erro ao ler arquivo.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    async function excluirTodoHistorico() {
        let frase = document.getElementById('inputExcluirTudo').value.trim().toLowerCase();
        if(frase === "quero excluir todo o histórico") {
            if(!confirm("TEM CERTEZA? Essa acao apaga todos os lancamentos.")) return;
            db.registros = [];
            marcarMudancaEstrutural();
            document.getElementById('inputExcluirTudo').value = '';
            fecharModal('modalConfigAvancadas');
            alert("Historico limpo.");
        } else {
            alert("Frase incorreta.");
        }
    }

    function forcarAtualizacao() {
        if(confirm("Deseja forcar a atualizacao do aplicativo?")) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) registration.update();
                });
            }
            window.location.href = window.location.pathname + '?nocache=' + new Date().getTime();
        }
    }
