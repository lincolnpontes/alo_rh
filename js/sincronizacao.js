// AVANCADO, SEGURANCA E SINCRONIZACAO
    let modoSenhaAvancada = 'criar';

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
        try {
            const res = await fetch(fetchUrl, { redirect: "follow", cache: "no-store" });
            const dados = await res.json();
            if(dados && dados.ok === false) throw new Error(dados.erro || 'Falha na nuvem.');
            return dados;
        } catch(e) {
            return puxarBancoNuvemJSONP(url);
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
                reject(new Error('Tempo esgotado ao puxar dados.'));
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
                reject(new Error('Falha ao puxar dados.'));
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

    function aplicarBancoNuvem(nuvemDB, modo = 'completo') {
        if(!nuvemDB || nuvemDB.app_id !== APP_ID) throw new Error('Banco invalido.');
        const localAtual = normalizarBanco(db);
        const nuvem = normalizarBanco(nuvemDB);
        const localTs = Number(localAtual.configs.ultimaMudancaLocal || 0);
        const nuvemTs = Number(nuvem.configs.ultimaMudancaLocal || 0);
        const base = (modo === 'completo' && nuvemTs > localTs) ? nuvem : localAtual;
        const outro = base === nuvem ? localAtual : nuvem;
        const mergeRegistros = mesclarRegistrosBancos(base, outro);
        const novoBanco = normalizarBanco(base);

        novoBanco.registros = mergeRegistros.registros;
        novoBanco.configs.registrosExcluidos = mergeRegistros.registrosExcluidos;
        db = preservarConfigsLocais(novoBanco, localAtual);

        const mudouLocal = JSON.stringify(prepararBancoCompartilhado(localAtual)) !== JSON.stringify(prepararBancoCompartilhado(db));
        salvarBanco({ sincronizar: false, atualizarMudanca: false });
        return { mudouLocal, precisaEnviar: (modo === 'completo' && localTs > nuvemTs) || mergeRegistros.precisaEnviar };
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
            }
            if(resultado.precisaEnviar) await sincronizarFundo(false, true);
            atualizarTextoSincronizacao(`Ultima sincronizacao: ${textoHorarioSync()}`);
            return true;
        } catch(e) {
            atualizarTextoSincronizacao('Nao foi possivel sincronizar agora. O app continua com os dados deste aparelho.');
            if(manual) alert('Nao foi possivel sincronizar agora. Confira a URL e o token.');
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
            if(resultado.mudouLocal) renderizarLista();
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
            alert("Falha ao puxar dados. Confira a URL do Google Script.");
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
