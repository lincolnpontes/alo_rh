function toggleDiv(id) { let el = document.getElementById(id); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; }
    function converterLogo(input) { if (input.files && input.files[0]) { let reader = new FileReader(); reader.onload = function(e) { document.getElementById('empLogoBase64').value = e.target.result; document.getElementById('previewLogo').innerHTML = `<img src="${e.target.result}" style="max-height:50px;">`; }; reader.readAsDataURL(input.files[0]); } }
    
    window.onload = async () => { await migrarSenhaAvancadaLegada(); prepararModaisNoTopo(); if(db.administradores.length) { adminSessaoId = ''; sessionStorage.removeItem('alorh_admin_sessao'); } aplicarTemaApp(); atualizarLogoTopo(); setTimeout(() => { document.getElementById('splashScreen').style.opacity = '0'; setTimeout(()=>{document.getElementById('splashScreen').style.display = 'none'; if(db.administradores.length) trocarPerfilAdmin(true);}, 500); }, 1000); document.getElementById('actionBar').style.display = 'grid'; initDiasFiltro(); atualizarAcoesMassa(); renderizarFiltros(); renderizarLista(); if(typeof sincronizarAoEntrar === 'function') sincronizarAoEntrar(); };

    const TEMAS_APP = [
        { id: 'verde', nome: 'Verde', cor: '#00695C' },
        { id: 'azul', nome: 'Azul', cor: '#1565C0' },
        { id: 'vinho', nome: 'Vinho', cor: '#8E244D' },
        { id: 'grafite', nome: 'Grafite', cor: '#455A64' },
        { id: 'roxo', nome: 'Roxo', cor: '#6A1B9A' },
        { id: 'laranja', nome: 'Laranja', cor: '#E65100' }
    ];

    function aplicarTemaApp(tema = '') {
        const escolhido = tema || (db.configGerais && db.configGerais.tema) || 'verde';
        document.body.classList.remove(...TEMAS_APP.map(t => `tema-${t.id}`));
        document.body.classList.add(`tema-${escolhido}`);
        const meta = document.getElementById('metaThemeColor');
        const info = TEMAS_APP.find(t => t.id === escolhido) || TEMAS_APP[0];
        if(meta) meta.setAttribute('content', info.cor);
    }

    function renderTemasConfig() {
        const box = document.getElementById('confTemasApp');
        if(!box) return;
        const atual = (db.configGerais && db.configGerais.tema) || 'verde';
        box.innerHTML = TEMAS_APP.map(t => `<button type="button" class="theme-option ${t.id === atual ? 'ativo' : ''}" style="background:${t.cor};" onclick="selecionarTemaConfig(${jsArg(t.id)})">${escapeHTML(t.nome)}</button>`).join('');
    }

    function selecionarTemaConfig(tema) {
        db.configGerais.tema = tema;
        renderTemasConfig();
        aplicarTemaApp(tema);
    }

    function atualizarLogoTopo() {
        const img = document.getElementById('headerLogoEmpresa');
        const header = document.querySelector('.header');
        if(!img || !header) return;
        const mostrar = !!(db.empresa && db.empresa.mostrarLogoTopo && db.empresa.logo);
        img.style.display = mostrar ? 'block' : 'none';
        header.classList.toggle('com-logo', mostrar);
        if(mostrar) img.src = db.empresa.logo;
        else img.removeAttribute('src');
    }

    function toggleModoSelecao() { 
        atualizarAcoesMassa();
    }

    function getCategoriaFuncionario(f) {
        return f ? db.categorias.find(c => c.id === f.categoria) : null;
    }

    function funcionarioTemDireitoFerias(f) {
        if(!f) return false;
        const cat = getCategoriaFuncionario(f);
        if(getTipoPagamentoFuncionario(f) === 'semanal') return false;
        if(cat && cat.temFerias === false) return false;
        return f.temFerias !== false;
    }

    function isFuncionarioSemanal(f) {
        return getTipoPagamentoFuncionario(f) === 'semanal';
    }

    function getTipoPagamentoFuncionario(f) {
        const cat = getCategoriaFuncionario(f);
        return getTipoPagamentoVinculo(cat || {});
    }

    function isFuncionarioMensalSemCarteira(f) {
        return getTipoPagamentoFuncionario(f) === 'mensal_sem_carteira';
    }

    function obterFuncionariosSelecionados() {
        return Array.from(itensSelecionados).map(id => db.funcionarios.find(f => f.id === id)).filter(f => f && !f.arquivado);
    }

    function atualizarAcoesMassa() {
        const temSelecionados = itensSelecionados.size > 0;
        const selecionados = obterFuncionariosSelecionados();
        const somenteSemanais = selecionados.length > 0 && selecionados.every(isFuncionarioSemanal);
        const visivel = temSelecionados && !somenteSemanais ? 'flex' : 'none';
        const actionBar = document.getElementById('actionBar');
        if(actionBar) actionBar.classList.toggle('com-selecao', temSelecionados);
        document.getElementById('btnAcaoMassa1').style.display = visivel;
        document.getElementById('btnAcaoMassa2').style.display = visivel;
        document.getElementById('btnAcaoMassa3').style.display = visivel;
        document.getElementById('btnAcaoMassa4').style.display = visivel;
        const btnDocPagamento = document.getElementById('btnAcaoMassa4');
        if(btnDocPagamento) {
            const temMensalSemCarteira = selecionados.some(isFuncionarioMensalSemCarteira);
            const temContracheque = selecionados.some(funcionarioRecebeContracheque);
            btnDocPagamento.innerHTML = temMensalSemCarteira && !temContracheque ? '🧾 Recibo' : (temMensalSemCarteira && temContracheque ? '🧾 Docs' : '🧾 Contracheque');
            btnDocPagamento.onclick = abrirDocumentosPagamento;
        }
        const btnSemana = document.getElementById('btnAcaoMassaSemana');
        if(btnSemana) btnSemana.style.display = temSelecionados && somenteSemanais ? 'flex' : 'none';
        document.getElementById('boxFiltrosDias').style.display = temSelecionados ? 'none' : 'flex';
        const btnFolgaGeral = document.getElementById('btnFolgaGeral');
        if(btnFolgaGeral) btnFolgaGeral.style.display = temSelecionados ? 'none' : 'flex';
        const btnSelecionarLista = document.getElementById('btnSelecionarLista');
        if(btnSelecionarLista) {
            const funcs = obterFuncionariosListados();
            const todosListadosSelecionados = funcs.length > 0 && funcs.every(f => itensSelecionados.has(f.id));
            btnSelecionarLista.style.display = funcs.length ? 'flex' : 'none';
            btnSelecionarLista.classList.toggle('selecionado', todosListadosSelecionados);
        }
        if(typeof atualizarVisibilidadePermissoes === 'function') atualizarVisibilidadePermissoes();
    }

    function initDiasFiltro() {
        let dates = getDatesDaSemana(); let box = document.getElementById('boxFiltrosDias');
        const botoes = [
            { label: 'Qui', data: dates.qui },
            { label: 'Sex', data: dates.sex },
            { label: 'Sáb', data: dates.sab },
            { label: 'Dom', data: dates.dom }
        ];
        box.innerHTML = botoes.map((botao) => {
            const label = botao.data.str === dates.hoje.str ? 'Hoje' : botao.label;
            return `<button class="btn-action-bar" id="btnFiltro_${botao.data.str}" onclick="setFiltroApto('${botao.data.str}')">${label}</button>`;
        }).join('');
    }

    function setFiltroApto(diaKey) {
        if(diaFiltroAptos === diaKey) { diaFiltroAptos = null; } else { diaFiltroAptos = diaKey; }
        document.querySelectorAll('#boxFiltrosDias .btn-action-bar').forEach(b => b.classList.remove('ativo'));
        if(diaFiltroAptos) document.getElementById(`btnFiltro_${diaKey}`).classList.add('ativo');
        renderizarFiltros(); renderizarLista();
    }

    function renderizarFiltros() { 
        let classTodos = categoriaAtual === null ? "active" : "";
        let html = `<div class="chip ${classTodos}" onclick="filtrarCat(null)">TODOS</div>`; 
        db.categorias.forEach(cat => { html += `<div class="chip ${categoriaAtual === cat.id ? 'active' : ''}" style="background-color: ${safeColor(cat.cor)}; color: ${safeColor(cat.corTexto, '#ffffff')};" onclick="filtrarCat(${jsArg(cat.id)})">${escapeHTML(cat.nome)}</div>`; }); 
        document.getElementById('containerFiltros').innerHTML = html; 
    }
    
    function filtrarCat(id) { 
        categoriaAtual = id;
        renderizarFiltros(); renderizarLista(); 
    }

    function limparFiltrosTelaInicial() {
        categoriaAtual = null;
        diaFiltroAptos = null;
        document.querySelectorAll('#boxFiltrosDias .btn-action-bar').forEach(b => b.classList.remove('ativo'));
        renderizarFiltros(); renderizarLista();
    }

    function obterFuncionariosListados() {
        let funcs = db.funcionarios.filter(f => !f.arquivado);
        if (categoriaAtual) funcs = funcs.filter(f => f.categoria === categoriaAtual);
        if(diaFiltroAptos) funcs = funcs.filter(f => isAptoNoDia(f, diaFiltroAptos));
        funcs.sort((a,b) => String(getNomeUsoFuncionario(a) || '').localeCompare(String(getNomeUsoFuncionario(b) || '')));
        return funcs;
    }

    function renderizarLista() {
        const lista = document.getElementById('listaPrincipal'); let html = '';
        let funcs = obterFuncionariosListados();
        let hj = new Date(); hj.setHours(0,0,0,0);
        
        funcs.forEach(f => {
            let catObj = db.categorias.find(c => c.id === f.categoria) || { cor: '#999', nome: 'Sem vínculo', semanal: false };
            let isSelected = itensSelecionados.has(f.id);
            let nomeBase = getNomeUsoFuncionario(f);
            let nomeFunc = escapeHTML(nomeBase || 'Sem nome');
            let inicialFunc = escapeHTML(String(nomeBase || '?').charAt(0).toUpperCase());
            
            let feriasMsg = '';
            let feriasList = db.registros.filter(r => r.type === 'ferias' && r.funcId === f.id);
            for(let r of feriasList) {
                let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1;
                if(hj >= d1 && hj <= d2) { feriasMsg = `<div style="color:#1565C0; font-size:11px; font-weight:bold; text-align:right;">Em férias<br>até ${formatDataCurta(r.dataFim)}</div>`; break; } 
                else if (d1 > hj) { let diff = (d1 - hj) / 86400000; if(diff <= 30) { feriasMsg = `<div style="color:#F57F17; font-size:11px; font-weight:bold; text-align:right;">Férias em breve<br>(${formatDataCurta(r.data)})</div>`; break; } }
            }

            let infoDireita = feriasMsg;
            html += `<li class="item ${isSelected ? 'selecionado' : ''}" onclick="cliqueItem(${jsArg(f.id)})"><div style="display: flex; align-items: center; flex: 1; overflow:hidden;"><button class="item-avatar item-avatar-select ${isSelected ? 'selecionado' : ''}" style="background-color: ${safeColor(catObj.cor, '#999999')}; color: ${safeColor(catObj.corTexto, '#ffffff')};" onclick="toggleSelecaoFuncionario(event, ${jsArg(f.id)})">${inicialFunc}</button><div class="item-info"><div class="item-title">${nomeFunc}</div></div></div><div class="info-direita" style="text-align: right; margin-left: 10px; flex-shrink: 0;">${infoDireita}</div></li>`;
        });
        if(funcs.length === 0) html = renderizarEstadoVazio();
        lista.innerHTML = html;
        atualizarAcoesMassa();
    }

    function renderizarEstadoVazio() {
        const ativos = db.funcionarios.filter(f => !f.arquivado);
        if(ativos.length > 0) {
            return `<li class="empty-state"><div class="empty-state-title">Nenhum funcionário neste filtro</div><div class="empty-state-text">Limpe os filtros ou escolha outro vínculo para voltar à lista.</div><div class="empty-actions"><button class="btn-action" onclick="limparFiltrosTelaInicial()">Limpar filtros</button></div></li>`;
        }
        if(db.funcionarios.length > 0) {
            return `<li class="empty-state"><div class="empty-state-title">Nenhum funcionário ativo</div><div class="empty-state-text">Há funcionários arquivados. Você pode restaurar alguém em Gerenciar Funcionários ou cadastrar uma nova pessoa.</div><div class="empty-actions"><button class="btn-action" onclick="abrirGerenciar('funcionarios')">Gerenciar Funcionários</button><button class="btn-outline" onclick="abrirFormFunc(null, 'inicio')">Novo Funcionário</button></div></li>`;
        }
        return `<li class="empty-state"><div class="empty-state-title">Monte a base do RH</div><div class="empty-state-text">Cadastre vínculos como Carteira Assinada, Extra ou Contrato, depois crie as funções e adicione o primeiro funcionário.</div><div class="empty-actions"><button class="btn-action" onclick="abrirFormClasse(null, 'inicio')">Criar Vínculo</button><button class="btn-outline" onclick="abrirFormFuncao(null, 'inicio')">Criar Função</button><button class="btn-action" onclick="abrirFormFunc(null, 'inicio')">Novo Funcionário</button></div></li>`;
    }

    function cliqueItem(id) {
        origemModalFerias = 'acoes';
        let f = db.funcionarios.find(x => x.id === id); let catObj = db.categorias.find(c => c.id === f.categoria); document.getElementById('tituloAcoesFunc').innerText = getNomeUsoFuncionario(f); document.getElementById('acoesFuncId').value = f.id; document.getElementById('btnPagarExtra').style.display = (catObj && catObj.semanal) ? 'block' : 'none'; 
        document.getElementById('btnAcaoAtraso').style.display = (f.habAtrasos !== false) ? 'block' : 'none';
        if(catObj && catObj.semanal) { document.getElementById('btnAcaoFalta').style.display = (f.habFaltas) ? 'block' : 'none'; document.getElementById('btnAcaoFerias').style.display = (f.habFerias && funcionarioTemDireitoFerias(f)) ? 'block' : 'none'; } else { document.getElementById('btnAcaoFalta').style.display = 'block'; document.getElementById('btnAcaoFerias').style.display = funcionarioTemDireitoFerias(f) ? 'block' : 'none'; }
        const ocultarSemPermissao = (idBotao, permissao, display = 'block') => { const botao = document.getElementById(idBotao); if(botao) botao.style.display = (temPermissaoAtual(permissao) && botao.style.display !== 'none') ? display : 'none'; };
        ocultarSemPermissao('btnAcaoAdiantamento', 'registrarAdiantamentos');
        ocultarSemPermissao('btnAcaoFalta', 'registrarAusencia');
        ocultarSemPermissao('btnAcaoAtraso', 'registrarAtraso');
        ocultarSemPermissao('btnAcaoFerias', 'lancarFerias');
        ocultarSemPermissao('btnPagarExtra', 'registrarPresencaSemanal');
        document.getElementById('modalAcoesFunc').style.display = 'flex';
    }

    function toggleSelecaoFuncionario(event, id) {
        event.stopPropagation();
        if (itensSelecionados.has(id)) itensSelecionados.delete(id);
        else itensSelecionados.add(id);
        renderizarLista();
    }

    function selecionarTodosListados() {
        const funcs = obterFuncionariosListados();
        if(funcs.length === 0) return;
        funcs.forEach(f => {
            itensSelecionados.add(f.id);
        });
        renderizarLista();
    }

    function limparSelecaoFuncionarios() {
        itensSelecionados.clear();
        renderizarLista();
    }

    function toggleSelecionarTodosListados() {
        const funcs = obterFuncionariosListados();
        if(funcs.length === 0) return;
        const todosListadosSelecionados = funcs.every(f => itensSelecionados.has(f.id));
        funcs.forEach(f => {
            if(todosListadosSelecionados) itensSelecionados.delete(f.id);
            else itensSelecionados.add(f.id);
        });
        renderizarLista();
    }

    function abrirMenuAdicionar() {
        if(!garantirAlgumaPermissao(['gerarVT', 'gerarContracheque', 'registrarPresencaSemanal'], () => abrirMenuAdicionar(), 'abrir opções adicionais')) return;
        const opcoes = document.querySelectorAll('#modalMenuAdicionar .add-menu-opcao');
        if(opcoes[0]) opcoes[0].style.display = temPermissaoAtual('gerarVT') ? 'flex' : 'none';
        if(opcoes[1]) opcoes[1].style.display = (temPermissaoAtual('gerarContracheque') || temPermissaoAtual('registrarPresencaSemanal')) ? 'flex' : 'none';
        document.getElementById('modalMenuAdicionar').style.display = 'flex';
    }

    function abrirModalFolgaGeral() {
        if(!garantirPermissao('gerarVT', () => abrirModalFolgaGeral(), 'cadastrar folga geral')) return;
        const hoje = getHojeSTR();
        document.getElementById('folgaGeralData').value = hoje;
        document.getElementById('folgaGeralMes').value = hoje.substring(0, 7);
        document.getElementById('folgaGeralObs').value = '';
        renderFolgasGerais();
        document.getElementById('modalFolgaGeral').style.display = 'flex';
    }

    function salvarFolgaGeral() {
        const data = document.getElementById('folgaGeralData').value;
        const mesDesconto = document.getElementById('folgaGeralMes').value;
        const observacao = document.getElementById('folgaGeralObs').value.trim();
        if(!data || !mesDesconto) return alert('Informe a data da folga e o mês de desconto no VT.');
        if(!db.configGerais.folgasGerais) db.configGerais.folgasGerais = [];
        const nova = { id: 'fg_' + Date.now(), data, mesDesconto, observacao };
        db.configGerais.folgasGerais.push(nova);
        registrarAuditoria('Folga geral cadastrada', `${formatDataBR(data)} para desconto no VT de ${mesDesconto.split('-').reverse().join('/')}${observacao ? ` - ${observacao}` : ''}.`, 'folga_geral', nova.id);
        salvarBanco();
        document.getElementById('folgaGeralObs').value = '';
        renderFolgasGerais();
    }

    function excluirFolgaGeral(id) {
        const folga = (db.configGerais.folgasGerais || []).find(f => f.id === id);
        db.configGerais.folgasGerais = (db.configGerais.folgasGerais || []).filter(f => f.id !== id);
        if(folga) registrarAuditoria('Folga geral excluída', `${formatDataBR(folga.data)} para VT de ${String(folga.mesDesconto || '').split('-').reverse().join('/')}.`, 'folga_geral', id);
        salvarBanco();
        renderFolgasGerais();
    }

    function renderFolgasGerais() {
        const box = document.getElementById('listaFolgasGerais'); if(!box) return;
        const lista = [...(db.configGerais.folgasGerais || [])].sort((a, b) => String(b.mesDesconto || '').localeCompare(String(a.mesDesconto || '')) || String(b.data || '').localeCompare(String(a.data || '')));
        if(lista.length === 0) { box.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">Nenhuma folga geral cadastrada.</div>'; return; }
        box.innerHTML = lista.map((folga) => {
            const obs = folga.observacao ? `<br><small style="color:#666;">${escapeHTML(folga.observacao)}</small>` : '';
            const mes = folga.mesDesconto ? folga.mesDesconto.split('-').reverse().join('/') : '';
            return `<div class="list-item-config"><span><b>${formatDataBR(folga.data)}</b> <small style="color:#F57F17; font-weight:bold;">VT ${escapeHTML(mes)}</small>${obs}</span><button onclick="excluirFolgaGeral(${jsArg(folga.id)})">X</button></div>`;
        }).join('');
    }

    function formatarFuncaoLista(funcao) {
        if(!funcao) return '';
        const numero = String(funcao.numero || '').trim();
        return numero ? `${numero.padStart(3, '0')} - ${funcao.nome || ''}` : (funcao.nome || '');
    }

    const ADMIN_PERMISSOES = [
        { chave: 'dadosPessoais', label: 'Alterar Dados Pessoais' },
        { chave: 'vinculoHorarios', label: 'Alterar Vínculo e Horários' },
        { chave: 'financeiro', label: 'Alterar Financeiro' },
        { chave: 'gerarContracheque', label: 'Gerar Contracheque' },
        { chave: 'gerarQuinzena', label: 'Gerar Quinzena' },
        { chave: 'gerarPonto', label: 'Gerar Ponto' },
        { chave: 'gerarVT', label: 'Gerar VT' },
        { chave: 'registrarAdiantamentos', label: 'Registrar Adiantamentos' },
        { chave: 'lancarFerias', label: 'Lançar Férias' },
        { chave: 'registrarAusencia', label: 'Registrar Ausência' },
        { chave: 'registrarAtraso', label: 'Registrar Atraso' },
        { chave: 'registrarPresencaSemanal', label: 'Registrar Presença Semanal' },
        { chave: 'acessoResumo', label: 'Acesso ao Resumo' },
        { chave: 'auditoria', label: 'Acesso à Auditoria do Sistema' },
        { chave: 'dadosEmpresa', label: 'Acesso aos Dados da Empresa' },
        { chave: 'configGerais', label: 'Acesso às Configurações Gerais' },
        { chave: 'gerenciarAdministradores', label: 'Gerenciar Administradores' }
    ];

    function getAdminAtual() {
        return db.administradores.find(a => a.id === adminSessaoId) || null;
    }

    function adminTemPermissao(admin, chave) {
        if(db.administradores.length === 0) return true;
        if(!admin) return false;
        const permissoes = admin.permissoes || criarPermissoesAdminPadrao();
        return permissoes[chave] !== false;
    }

    function adminRestrito(admin) {
        if(!admin || !admin.permissoes) return false;
        const primeiroAdmin = db.administradores[0];
        if(primeiroAdmin && primeiroAdmin.id !== admin.id) return true;
        return ADMIN_PERMISSOES.some(p => admin.permissoes[p.chave] === false);
    }

    function temPermissaoAtual(chave) {
        if(db.administradores.length === 0) return true;
        return adminTemPermissao(getAdminAtual(), chave);
    }

    function garantirAlgumaPermissao(chaves, aoAutorizar, texto = 'continuar') {
        if(db.administradores.length === 0) return true;
        const listaChaves = Array.isArray(chaves) ? chaves : [chaves];
        const atual = getAdminAtual();
        if(atual && listaChaves.some(chave => adminTemPermissao(atual, chave))) return true;
        if(atual) {
            alert('Este perfil não tem permissão para esta ferramenta.');
            return false;
        }
        const senha = prompt(`Digite a senha do administrador para ${texto}:`);
        if(senha === null) return false;
        const admin = db.administradores.find(a => String(a.senha || '') === String(senha || ''));
        if(!admin) { alert('Senha de administrador não encontrada.'); return false; }
        if(!listaChaves.some(chave => adminTemPermissao(admin, chave))) { alert('Este administrador não tem permissão para esta ação.'); return false; }
        adminSessaoId = admin.id;
        sessionStorage.setItem('alorh_admin_sessao', adminSessaoId);
        if(typeof aoAutorizar === 'function') aoAutorizar();
        return false;
    }

    function garantirPermissao(chave, aoAutorizar, texto = 'continuar') {
        return garantirAlgumaPermissao([chave], aoAutorizar, texto);
    }

    function renderizarPermissoesAdmin(permissoes = {}) {
        const box = document.getElementById('adminPermissoesBox');
        if(!box) return;
        const base = { ...criarPermissoesAdminPadrao(), ...(permissoes || {}) };
        box.innerHTML = ADMIN_PERMISSOES.map(p => `<label class="switch-row"><span class="switch-row-text">${escapeHTML(p.label)}</span><span class="switch"><input type="checkbox" class="chk-admin-permissao" value="${escapeHTML(p.chave)}" ${base[p.chave] !== false ? 'checked' : ''}><span class="slider"></span></span></label>`).join('');
    }

    function coletarPermissoesAdmin() {
        const permissoes = criarPermissoesAdminPadrao();
        document.querySelectorAll('.chk-admin-permissao').forEach(chk => {
            permissoes[chk.value] = chk.checked;
        });
        return permissoes;
    }

    function aplicarPermissoesFormularioFuncionario() {
        const mapa = [
            { id: 'secFuncDadosPessoais', chave: 'dadosPessoais' },
            { id: 'secFuncVinculoHorarios', chave: 'vinculoHorarios' },
            { id: 'secFuncFinanceiro', chave: 'financeiro' }
        ];
        mapa.forEach(item => {
            const el = document.getElementById(item.id);
            if(el) el.classList.toggle('bloqueada', !temPermissaoAtual(item.chave));
        });
    }

    function configurarSelectAdminPorPermissao(selectId, permissao) {
        const sel = document.getElementById(selectId);
        if(!sel) return;
        const atual = getAdminAtual();
        sel.disabled = false;
        if(atual && adminTemPermissao(atual, permissao)) {
            sel.value = atual.id;
            if(adminRestrito(atual)) sel.disabled = true;
        }
    }

    function adminSelecionadoTemPermissao(selectId, permissao) {
        const sel = document.getElementById(selectId);
        const admin = sel ? db.administradores.find(a => a.id === sel.value) : getAdminAtual();
        if(!adminTemPermissao(admin, permissao)) {
            alert('O administrador selecionado não tem permissão para esta ação.');
            return false;
        }
        return true;
    }

    function atualizarBoxPerfilAdmin() {
        const box = document.getElementById('perfilAdminBox');
        if(!box) return;
        if(db.administradores.length === 0) {
            box.innerHTML = `<span><strong>Perfil:</strong> sem administradores cadastrados</span>`;
            return;
        }
        const admin = getAdminAtual();
        const nome = admin ? admin.nome : 'nenhum perfil ativo';
        box.innerHTML = `<span><strong>Perfil:</strong> ${escapeHTML(nome)}</span><div class="perfil-admin-acoes"><button onclick="trocarPerfilAdmin()">Trocar perfil</button>${admin ? '<button class="sair" onclick="sairPerfilAdmin()">Sair</button>' : ''}</div>`;
    }

    function abrirMenuPrincipal() {
        atualizarBoxPerfilAdmin();
        atualizarVisibilidadePermissoes();
        document.getElementById('modalPainelUnificado').style.display = 'flex';
    }

    function aplicarDisplayPermissao(id, permissao, display = '') {
        const el = document.getElementById(id);
        if(el) el.style.display = temPermissaoAtual(permissao) ? display : 'none';
    }

    function atualizarVisibilidadePermissoes() {
        document.querySelectorAll('.menu-perm[data-perm]').forEach((el) => {
            el.style.display = temPermissaoAtual(el.dataset.perm) ? '' : 'none';
        });
        aplicarDisplayPermissao('btnHeaderFerias', 'lancarFerias');
        aplicarDisplayPermissao('btnHeaderResumo', 'acessoResumo', 'flex');
        aplicarDisplayPermissao('btnAcaoMassa1', 'gerarPonto', document.getElementById('btnAcaoMassa1').style.display === 'none' ? 'none' : 'flex');
        aplicarDisplayPermissao('btnAcaoMassa2', 'gerarQuinzena', document.getElementById('btnAcaoMassa2').style.display === 'none' ? 'none' : 'flex');
        aplicarDisplayPermissao('btnAcaoMassa3', 'gerarVT', document.getElementById('btnAcaoMassa3').style.display === 'none' ? 'none' : 'flex');
        aplicarDisplayPermissao('btnAcaoMassa4', 'gerarContracheque', document.getElementById('btnAcaoMassa4').style.display === 'none' ? 'none' : 'flex');
        aplicarDisplayPermissao('btnAcaoMassaSemana', 'registrarPresencaSemanal', document.getElementById('btnAcaoMassaSemana').style.display === 'none' ? 'none' : 'flex');
        const btnMais = document.getElementById('btnFolgaGeral');
        if(btnMais && btnMais.style.display !== 'none') {
            btnMais.style.display = (temPermissaoAtual('gerarVT') || temPermissaoAtual('gerarContracheque') || temPermissaoAtual('registrarPresencaSemanal')) ? 'flex' : 'none';
        }
    }

    function trocarPerfilAdmin(obrigatorio = false) {
        if(db.administradores.length === 0) return alert('Cadastre um administrador primeiro.');
        const lista = document.getElementById('listaPerfisAdmin');
        lista.innerHTML = db.administradores.map(admin => `<div class="perfil-admin-card"><strong>${escapeHTML(admin.nome || 'Administrador')}</strong><span>${adminRestrito(admin) ? 'perfil com permissões definidas' : 'perfil completo'}</span></div>`).join('');
        const input = document.getElementById('senhaTrocaPerfilAdmin');
        input.value = '';
        const titulo = document.getElementById('tituloTrocaPerfilAdmin');
        if(titulo) titulo.innerText = obrigatorio ? 'Entrar no Alô RH' : 'Trocar Perfil';
        const btnFechar = document.getElementById('btnFecharTrocaPerfil');
        if(btnFechar) btnFechar.style.display = obrigatorio ? 'none' : 'inline-flex';
        const btnCancelar = document.querySelector('#modalTrocarPerfilAdmin .btn-cancel');
        if(btnCancelar) btnCancelar.style.display = obrigatorio ? 'none' : '';
        document.getElementById('trocaPerfilErro').style.display = 'none';
        document.getElementById('modalTrocarPerfilAdmin').style.display = 'flex';
        setTimeout(() => { input.focus(); input.select(); }, 120);
    }

    function aoDigitarSenhaPerfilAdmin(input) {
        input.value = input.value.replace(/[^0-9]/g, '');
        document.getElementById('trocaPerfilErro').style.display = 'none';
        const admin = getAdminPorSenha(input.value);
        if(admin) entrarComPerfilAdmin(admin);
    }

    function validarTrocaPerfilAdmin() {
        const senha = document.getElementById('senhaTrocaPerfilAdmin').value;
        const admin = getAdminPorSenha(senha);
        if(!admin) {
            document.getElementById('trocaPerfilErro').style.display = 'block';
            return;
        }
        entrarComPerfilAdmin(admin);
    }

    function entrarComPerfilAdmin(admin) {
        adminSessaoId = admin.id;
        sessionStorage.setItem('alorh_admin_sessao', adminSessaoId);
        fecharModal('modalTrocarPerfilAdmin');
        atualizarBoxPerfilAdmin();
        atualizarVisibilidadePermissoes();
        renderizarLista();
    }

    function sairPerfilAdmin() {
        adminSessaoId = '';
        sessionStorage.removeItem('alorh_admin_sessao');
        atualizarBoxPerfilAdmin();
        if(db.administradores.length) trocarPerfilAdmin(true);
    }

    function registrarAuditoria(acao, detalhes = '', entidade = '', alvoId = '') {
        db.auditoria = Array.isArray(db.auditoria) ? db.auditoria : [];
        const admin = getAdminAtual();
        db.auditoria.unshift({
            id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            data: Date.now(),
            adminId: admin ? admin.id : '',
            adminNome: admin ? admin.nome : 'Sistema',
            acao,
            detalhes,
            entidade,
            alvoId
        });
        if(db.auditoria.length > 700) db.auditoria = db.auditoria.slice(0, 700);
    }

    function formatarDataHoraAuditoria(ts) {
        const data = new Date(Number(ts || Date.now()));
        return data.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    function abrirAuditoria() {
        if(!garantirPermissao('auditoria', () => abrirAuditoria(), 'abrir a auditoria do sistema')) return;
        fecharModal('modalPainelUnificado');
        const busca = document.getElementById('auditoriaBusca');
        if(busca) busca.value = '';
        renderAuditoria();
        document.getElementById('modalAuditoria').style.display = 'flex';
    }

    function renderAuditoria() {
        const lista = document.getElementById('listaAuditoria');
        const resumo = document.getElementById('auditoriaResumo');
        if(!lista || !resumo) return;
        const termo = String((document.getElementById('auditoriaBusca') || {}).value || '').trim().toLowerCase();
        const logs = Array.isArray(db.auditoria) ? db.auditoria : [];
        const filtrados = logs.filter(item => {
            const texto = `${item.acao || ''} ${item.detalhes || ''} ${item.adminNome || ''} ${item.entidade || ''}`.toLowerCase();
            return !termo || texto.includes(termo);
        });
        resumo.innerHTML = `${filtrados.length} registro(s) exibido(s) de ${logs.length}.`;
        if(filtrados.length === 0) {
            lista.innerHTML = '<div style="text-align:center; color:#999; padding:16px;">Nenhum registro encontrado.</div>';
            return;
        }
        lista.innerHTML = filtrados.slice(0, 300).map(item => `<div class="auditoria-item">
            <div class="auditoria-item-head"><strong>${escapeHTML(item.acao || 'Ação')}</strong><span>${formatarDataHoraAuditoria(item.data)}</span></div>
            <div>${escapeHTML(item.detalhes || '')}</div>
            <small>Admin: ${escapeHTML(item.adminNome || 'Sistema')}${item.entidade ? ` • ${escapeHTML(item.entidade)}` : ''}</small>
        </div>`).join('');
    }

    // 3. GERENCIAMENTO CRUD
    function abrirGerenciar(tipo) {
        const permissoesGerenciar = { empresa: 'dadosEmpresa', configGerais: 'configGerais', administradores: 'gerenciarAdministradores', categorias: 'vinculoHorarios', funcoes: 'vinculoHorarios' };
        if(permissoesGerenciar[tipo] && !garantirPermissao(permissoesGerenciar[tipo], () => abrirGerenciar(tipo), 'abrir esta área')) return;
        fecharModal('modalPainelUnificado');
        if(tipo === 'configGerais') { document.getElementById('confSalario').value = db.configGerais.salarioMinimo || ''; document.getElementById('confAdiantamento').value = db.configGerais.adiantamentoQuinzena || ''; document.getElementById('confDiasAquisitivoFerias').value = db.configGerais.diasAquisitivoFerias || 360; tempVT = db.configGerais.valesTransporte ? [...db.configGerais.valesTransporte] : []; tempMotivos = db.configGerais.motivosAdiantamento ? [...db.configGerais.motivosAdiantamento] : []; tempINSS = db.configGerais.inssFaixas ? JSON.parse(JSON.stringify(db.configGerais.inssFaixas)) : criarTabelaINSSPadrao(); document.querySelectorAll('.chk-dias-func').forEach(el => el.checked = db.configGerais.diasFuncionamento.includes(el.value)); renderTemasConfig(); renderListasConfig(); document.getElementById('modalConfigGerais').style.display = 'flex'; return; }
        if(tipo === 'empresa') { document.getElementById('empLogoBase64').value = db.empresa.logo || ''; document.getElementById('previewLogo').innerHTML = db.empresa.logo ? `<img src="${db.empresa.logo}" style="max-height:50px;">` : ''; document.getElementById('empMostrarLogoTopo').checked = !!db.empresa.mostrarLogoTopo; document.getElementById('empRazao').value = db.empresa.razao || ''; document.getElementById('empFantasia').value = db.empresa.fantasia || ''; document.getElementById('empCNPJ').value = db.empresa.cnpj || ''; document.getElementById('empRua').value = db.empresa.rua || ''; document.getElementById('empNum').value = db.empresa.numero || ''; document.getElementById('empBairro').value = db.empresa.bairro || ''; document.getElementById('empCidade').value = db.empresa.cidade || ''; document.getElementById('empUF').value = db.empresa.uf || 'PB'; document.getElementById('modalFormEmpresa').style.display = 'flex'; return; }
        
        const lista = document.getElementById('conteudoListagem'); let htmlLista = '';
        if(tipo === 'funcionarios') {
            const podeVinculoFuncao = temPermissaoAtual('vinculoHorarios');
            const podeArquivar = temPermissaoAtual('dadosPessoais');
            document.getElementById('tituloListagem').innerText = "Funcionários"; document.getElementById('btnClassesListagem').style.display = podeVinculoFuncao ? 'flex' : 'none'; document.getElementById('btnFuncoesListagem').style.display = podeVinculoFuncao ? 'flex' : 'none'; document.getElementById('btnNovoListagem').onclick = () => abrirFormFunc(null);
            document.getElementById('btnVoltarListagem').onclick = () => { fecharModal('modalListagem'); document.getElementById('modalPainelUnificado').style.display='flex'; };
            let funcs = [...db.funcionarios].sort((a,b) => String(a.nome || '').localeCompare(String(b.nome || '')));
            const renderFuncionarioGerenciar = (f) => {
                let codStr = f.codigo ? `<strong style="color:#00695C;">[${escapeHTML(f.codigo)}]</strong> ` : '';
                let funName = db.funcoes.find(fn => fn.id === f.funcao); funName = funName ? formatarFuncaoLista(funName) : 'Sem função';
                let acaoArquivo = !podeArquivar ? '' : (f.arquivado
                    ? `<button style="background:none; border:none; font-size:18px; cursor:pointer; color:#2E7D32;" title="Restaurar" onclick="restaurarFuncionario(${jsArg(f.id)})">↩️</button>`
                    : `<button style="background:none; border:none; font-size:18px; cursor:pointer; color:#F57F17;" title="Arquivar" onclick="arquivarFuncionario(${jsArg(f.id)})">📦</button>`);
                return `<div style="padding:10px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center; opacity:${f.arquivado ? '0.65' : '1'};"><div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${codStr}<strong>${escapeHTML(f.nome)}</strong>${f.arquivado ? ' <small style="color:#F57F17; font-weight:bold;">(Arquivado)</small>' : ''}<br><small style="color:#666;">${escapeHTML(funName)}</small></div><div style="flex-shrink:0; margin-left:10px; display:flex; gap:4px; align-items:center;"><button style="background:none; border:none; font-size:20px; cursor:pointer;" onclick="abrirFormFunc(${jsArg(f.id)})">✏️</button>${acaoArquivo}</div></div>`;
            };
            const ativos = funcs.filter(f => !f.arquivado);
            const arquivados = funcs.filter(f => f.arquivado);
            if(ativos.length) {
                htmlLista += `<div class="section-title" style="margin-top:0;">Ativos</div>`;
                ativos.forEach((f) => { htmlLista += renderFuncionarioGerenciar(f); });
            } else {
                htmlLista += `<div style="padding:12px; color:#999; text-align:center;">Nenhum funcionário ativo.</div>`;
            }
            if(arquivados.length) {
                htmlLista += `<div class="section-title" style="background:#eeeeee; border-left-color:#9e9e9e;">Arquivados</div>`;
                arquivados.forEach((f) => { htmlLista += renderFuncionarioGerenciar(f); });
            }
        } else if(tipo === 'categorias') {
            fecharModal('modalListagem'); document.getElementById('tituloListagem').innerText = "Vínculos"; document.getElementById('btnClassesListagem').style.display = 'none'; document.getElementById('btnFuncoesListagem').style.display = 'none'; document.getElementById('btnNovoListagem').onclick = () => abrirFormClasse(null);
            document.getElementById('btnVoltarListagem').onclick = () => { abrirGerenciar('funcionarios'); };
            db.categorias.forEach((c) => { let bExtra = c.semanal ? `<span style="font-size:10px; color:#E65100;">(Semanal)</span>` : ''; htmlLista += `<div style="padding:10px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;"><div><span style="background:${safeColor(c.cor)}; color:${safeColor(c.corTexto, '#ffffff')}; padding:3px 8px; border-radius:4px; font-size:13px; font-weight:bold;">${escapeHTML(c.nome)}</span> ${bExtra}</div><div><button style="background:none; border:none; font-size:20px; cursor:pointer;" onclick="abrirFormClasse(${jsArg(c.id)})">✏️</button> <button style="background:none; border:none; font-size:20px; cursor:pointer; color:#d32f2f;" onclick="excluirItem('categorias',${jsArg(c.id)})">🗑️</button></div></div>`; });
        } else if(tipo === 'funcoes') {
            fecharModal('modalListagem'); document.getElementById('tituloListagem').innerText = "Funções/Cargos"; document.getElementById('btnClassesListagem').style.display = 'none'; document.getElementById('btnFuncoesListagem').style.display = 'none'; document.getElementById('btnNovoListagem').onclick = () => abrirFormFuncao(null);
            document.getElementById('btnVoltarListagem').onclick = () => { abrirGerenciar('funcionarios'); };
            db.funcoes.forEach((fn) => { htmlLista += `<div style="padding:10px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;"><div><strong>${escapeHTML(formatarFuncaoLista(fn))}</strong></div><div><button style="background:none; border:none; font-size:20px; cursor:pointer;" onclick="abrirFormFuncao(${jsArg(fn.id)})">✏️</button> <button style="background:none; border:none; font-size:20px; cursor:pointer; color:#d32f2f;" onclick="excluirItem('funcoes',${jsArg(fn.id)})">🗑️</button></div></div>`; });
        } else if(tipo === 'administradores') {
            document.getElementById('tituloListagem').innerText = "Administradores"; document.getElementById('btnClassesListagem').style.display = 'none'; document.getElementById('btnFuncoesListagem').style.display = 'none'; document.getElementById('btnNovoListagem').onclick = () => abrirFormAdmin(null);
            document.getElementById('btnVoltarListagem').onclick = () => { fecharModal('modalListagem'); document.getElementById('modalPainelUnificado').style.display='flex'; };
            db.administradores.forEach((a) => { htmlLista += `<div style="padding:10px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;"><div><strong>${escapeHTML(a.nome)}</strong></div><div><button style="background:none; border:none; font-size:20px; cursor:pointer;" onclick="abrirFormAdmin(${jsArg(a.id)})">✏️</button></div></div>`; });
        }
        lista.innerHTML = htmlLista; document.getElementById('modalListagem').style.display = 'flex';
    }

    function excluirItem(tipo, id) { if(confirm("Deseja realmente excluir?")) { const item = (db[tipo] || []).find(x => x.id === id); db[tipo] = db[tipo].filter(x => x.id !== id); registrarAuditoria('Item excluído', `${tipo}: ${item ? (item.nome || item.razao || id) : id}.`, tipo, id); salvarBanco(); abrirGerenciar(tipo); if(tipo==='categorias') renderizarFiltros(); } }
    function arquivarFuncionario(id) {
        if(!garantirPermissao('dadosPessoais', () => arquivarFuncionario(id), 'arquivar funcionário')) return;
        const f = db.funcionarios.find(x => x.id === id);
        if(!f) return;
        if(!confirm(`Arquivar ${f.nome || 'funcionário'}? Ele não aparecerá nas listas, filtros e impressões de ativos.`)) return;
        f.arquivado = true;
        f.arquivadoEm = Date.now();
        itensSelecionados.delete(id);
        registrarAuditoria('Funcionário arquivado', f.nome || 'Funcionário sem nome', 'funcionario', id);
        salvarBanco();
        abrirGerenciar('funcionarios');
        renderizarLista();
    }
    function restaurarFuncionario(id) {
        if(!garantirPermissao('dadosPessoais', () => restaurarFuncionario(id), 'restaurar funcionário')) return;
        const f = db.funcionarios.find(x => x.id === id);
        if(!f) return;
        f.arquivado = false;
        f.arquivadoEm = null;
        registrarAuditoria('Funcionário restaurado', f.nome || 'Funcionário sem nome', 'funcionario', id);
        salvarBanco();
        abrirGerenciar('funcionarios');
        renderizarLista();
    }

    function salvarEmpresa() { 
        let cnpj = document.getElementById('empCNPJ').value; if(cnpj && cnpj.length < 18) return alert("CNPJ incompleto. Digite os 14 números.");
        db.empresa.logo = document.getElementById('empLogoBase64').value; db.empresa.mostrarLogoTopo = document.getElementById('empMostrarLogoTopo').checked; db.empresa.razao = document.getElementById('empRazao').value; db.empresa.fantasia = document.getElementById('empFantasia').value; db.empresa.cnpj = cnpj; db.empresa.rua = document.getElementById('empRua').value; db.empresa.numero = document.getElementById('empNum').value; db.empresa.bairro = document.getElementById('empBairro').value; db.empresa.cidade = document.getElementById('empCidade').value; db.empresa.uf = document.getElementById('empUF').value; registrarAuditoria('Dados da empresa salvos', db.empresa.razao || db.empresa.fantasia || 'Empresa', 'empresa', 'empresa'); salvarBanco(); atualizarLogoTopo(); fecharModal('modalFormEmpresa'); document.getElementById('modalPainelUnificado').style.display = 'flex'; 
    }
    
    function abrirFormAdmin(id) {
        if(!garantirPermissao('gerenciarAdministradores', () => abrirFormAdmin(id), 'gerenciar administradores')) return;
        fecharModal('modalListagem');
        if(id) {
            let a = db.administradores.find(x => x.id === id);
            document.getElementById('adminId').value = a.id;
            document.getElementById('adminNome').value = a.nome;
            document.getElementById('adminSenha').value = a.senha;
            renderizarPermissoesAdmin(a.permissoes);
        } else {
            document.getElementById('adminId').value = '';
            document.getElementById('adminNome').value = '';
            document.getElementById('adminSenha').value = '';
            renderizarPermissoesAdmin(criarPermissoesAdminPadrao());
        }
        document.getElementById('modalFormAdmin').style.display = 'flex';
    }
    function salvarAdmin() {
        if(!garantirPermissao('gerenciarAdministradores', () => salvarAdmin(), 'salvar administrador')) return;
        let id = document.getElementById('adminId').value || 'adm_' + Date.now();
        let novo = { id: id, nome: document.getElementById('adminNome').value, senha: document.getElementById('adminSenha').value, permissoes: coletarPermissoesAdmin() };
        const idx = db.administradores.findIndex(x => x.id === id);
        if(idx >= 0) db.administradores[idx] = novo;
        else db.administradores.push(novo);
        registrarAuditoria(idx >= 0 ? 'Administrador editado' : 'Administrador cadastrado', novo.nome || 'Perfil sem nome', 'administrador', id);
        salvarBanco();
        fecharModal('modalFormAdmin');
        abrirGerenciar('administradores');
    }

    // VINCULOS E SALARIOS
    function getCamposFuncionarioClasse(c = {}) {
        const campos = c.camposFuncionario || {};
        return {
            pedirVT: campos.pedirVT !== false,
            pedirGratificacao: campos.pedirGratificacao !== false,
            pedirSalFamilia: campos.pedirSalFamilia !== false,
            pedirUnidentis: campos.pedirUnidentis !== false,
            pedirDescontoPassagem: campos.pedirDescontoPassagem !== false,
            pedirINSS: campos.pedirINSS !== false,
            pedirINSSProvento: campos.pedirINSSProvento === true,
            temControlePonto: campos.temControlePonto !== false
        };
    }

    function getTipoPagamentoVinculo(c = {}) {
        if(c && c.tipoPagamento) return c.tipoPagamento;
        if(c && c.semanal) return 'semanal';
        if(c && c.recebeContracheque === false) return 'mensal_sem_carteira';
        return 'contracheque';
    }

    function getBeneficiosVinculo(c = {}) {
        const tipoPagamento = getTipoPagamentoVinculo(c);
        return {
            temQuinquenio: c && c.temQuinquenio === true,
            temFerias: tipoPagamento !== 'semanal' && !(c && c.temFerias === false),
            recebeQuinzena: !(c && c.recebeQuinzena === false),
            recebeContracheque: tipoPagamento === 'contracheque' && !(c && c.recebeContracheque === false)
        };
    }

    function preencherCamposFuncionarioClasse(c = {}) {
        const campos = getCamposFuncionarioClasse(c);
        document.getElementById('classePedirVT').checked = campos.pedirVT;
        document.getElementById('classePedirGratificacao').checked = campos.pedirGratificacao;
        document.getElementById('classePedirSalFamilia').checked = campos.pedirSalFamilia;
        document.getElementById('classePedirUnidentis').checked = campos.pedirUnidentis;
        document.getElementById('classePedirDescontoPassagem').checked = campos.pedirDescontoPassagem;
        document.getElementById('classePedirINSS').checked = campos.pedirINSS;
        document.getElementById('classePedirINSSProvento').checked = campos.pedirINSSProvento;
        document.getElementById('classeTemControlePonto').checked = campos.temControlePonto;
        const beneficios = getBeneficiosVinculo(c);
        document.getElementById('classeTemQuinquenio').checked = beneficios.temQuinquenio;
        document.getElementById('classeTemFerias').checked = beneficios.temFerias;
        document.getElementById('classeRecebeQuinzena').checked = beneficios.recebeQuinzena;
        document.getElementById('classeRecebeContracheque').checked = beneficios.recebeContracheque;
    }

    function toggleRegrasVinculoSemanal() {
        const tipo = document.getElementById('classeTipoPagamento') ? document.getElementById('classeTipoPagamento').value : (document.getElementById('classeSemanal').checked ? 'semanal' : 'contracheque');
        const semanal = tipo === 'semanal';
        document.getElementById('classeSemanal').checked = semanal;
        document.getElementById('classeRecebeContracheque').checked = tipo === 'contracheque';
        const titulo = document.getElementById('tituloRegrasVinculo');
        const box = document.getElementById('boxRegrasVinculo');
        const linhaContracheque = document.getElementById('linhaClasseRecebeContracheque');
        if(titulo) titulo.style.display = semanal ? 'none' : '';
        if(box) box.style.display = semanal ? 'none' : '';
        if(linhaContracheque) linhaContracheque.style.display = 'none';
        const chkINSSProvento = document.getElementById('classePedirINSSProvento');
        if(chkINSSProvento && tipo === 'mensal_sem_carteira' && !document.getElementById('classeId').value) chkINSSProvento.checked = true;
    }

    function aoMudarTipoPagamentoVinculo() {
        toggleRegrasVinculoSemanal();
    }

    function abrirFormClasse(id, origem = 'gerenciar') { 
        origemFormClasse = origem;
        fecharModal('modalListagem'); tempSalariosClasse = [];
        if(id) { 
            let c = db.categorias.find(x => x.id === id); document.getElementById('classeId').value = c.id; document.getElementById('classeNome').value = c.nome; document.getElementById('classeCorFundo').value = c.cor || '#00695C'; document.getElementById('classeCorTexto').value = c.corTexto || '#ffffff'; document.getElementById('classeSemanal').checked = c.semanal || false; 
            document.getElementById('classeTipoPagamento').value = getTipoPagamentoVinculo(c);
            document.getElementById('classeHoraEntrada').value = (c.horarios && c.horarios.entrada) ? c.horarios.entrada : ''; document.getElementById('classeHoraSaida').value = (c.horarios && c.horarios.saida) ? c.horarios.saida : ''; document.getElementById('classeHoraIntEnt').value = (c.horarios && c.horarios.intEnt) ? c.horarios.intEnt : ''; document.getElementById('classeHoraIntSai').value = (c.horarios && c.horarios.intSai) ? c.horarios.intSai : ''; document.getElementById('classeSemIntervalo').checked = (c.horarios && c.horarios.semIntervalo) || false;
            preencherCamposFuncionarioClasse(c);
            if(c.salarios) tempSalariosClasse = [...c.salarios];
        } else { 
            document.getElementById('classeId').value = ''; document.getElementById('classeNome').value = ''; document.getElementById('classeCorFundo').value = '#00695C'; document.getElementById('classeCorTexto').value = '#ffffff'; document.getElementById('classeSemanal').checked = false; 
            document.getElementById('classeTipoPagamento').value = 'contracheque';
            document.getElementById('classeHoraEntrada').value = ''; document.getElementById('classeHoraSaida').value = ''; document.getElementById('classeHoraIntEnt').value = ''; document.getElementById('classeHoraIntSai').value = ''; document.getElementById('classeSemIntervalo').checked = false;
            preencherCamposFuncionarioClasse();
        } 
        toggleIntervaloClasse(); toggleRegrasVinculoSemanal(); renderListaSalariosClasse(); document.getElementById('modalFormClasse').style.display = 'flex'; 
    }
    function toggleIntervaloClasse() { let isSem = document.getElementById('classeSemIntervalo').checked; document.getElementById('classeHoraIntEnt').disabled = isSem; document.getElementById('classeHoraIntSai').disabled = isSem; if(isSem) { document.getElementById('classeHoraIntEnt').value = ''; document.getElementById('classeHoraIntSai').value = ''; } }
    function renderListaSalariosClasse() { const box = document.getElementById('listaSalariosClasse'); if(tempSalariosClasse.length === 0) { box.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">Nenhum salário base.</div>'; return; } box.innerHTML = tempSalariosClasse.map((s, i) => `<div class="list-item-config"><span>R$ ${formatMoeda(s)}</span><button onclick="removerSalarioClasse(${i})">X</button></div>`).join(''); }
    function addSalarioClasse() { let vStr = document.getElementById('novoSalarioClasse').value; let val = parseMoeda(vStr); if(val > 0) { tempSalariosClasse.push(val); document.getElementById('novoSalarioClasse').value = ''; renderListaSalariosClasse(); } }
    function removerSalarioClasse(idx) { tempSalariosClasse.splice(idx, 1); renderListaSalariosClasse(); }
    
    function voltarDepoisFormClasse() { if(origemFormClasse === 'inicio') { origemFormClasse = 'gerenciar'; renderizarFiltros(); renderizarLista(); return; } abrirGerenciar('categorias'); }
    function cancelarFormClasse() { fecharModal('modalFormClasse'); voltarDepoisFormClasse(); }
    function salvarClasse() {
        let id = document.getElementById('classeId').value || 'c_' + Date.now();
        const tipoPagamento = document.getElementById('classeTipoPagamento').value || 'contracheque';
        const semanal = tipoPagamento === 'semanal';
        let novo = {
            id: id,
            nome: document.getElementById('classeNome').value,
            cor: document.getElementById('classeCorFundo').value,
            corTexto: document.getElementById('classeCorTexto').value,
            tipoPagamento: tipoPagamento,
            semanal: semanal,
            temQuinquenio: document.getElementById('classeTemQuinquenio').checked,
            temFerias: !semanal && document.getElementById('classeTemFerias').checked,
            recebeQuinzena: document.getElementById('classeRecebeQuinzena').checked,
            recebeContracheque: tipoPagamento === 'contracheque',
            camposFuncionario: {
                pedirVT: document.getElementById('classePedirVT').checked,
                pedirGratificacao: document.getElementById('classePedirGratificacao').checked,
                pedirSalFamilia: document.getElementById('classePedirSalFamilia').checked,
                pedirUnidentis: document.getElementById('classePedirUnidentis').checked,
                pedirDescontoPassagem: document.getElementById('classePedirDescontoPassagem').checked,
                pedirINSS: document.getElementById('classePedirINSS').checked,
                pedirINSSProvento: document.getElementById('classePedirINSSProvento').checked,
                temControlePonto: document.getElementById('classeTemControlePonto').checked
            },
            horarios: {
                entrada: document.getElementById('classeHoraEntrada').value,
                saida: document.getElementById('classeHoraSaida').value,
                intEnt: document.getElementById('classeHoraIntEnt').value,
                intSai: document.getElementById('classeHoraIntSai').value,
                semIntervalo: document.getElementById('classeSemIntervalo').checked
            },
            salarios: tempSalariosClasse
        };
        const idx = db.categorias.findIndex(x => x.id === id);
        if(idx >= 0) db.categorias[idx] = novo;
        else db.categorias.push(novo);
        registrarAuditoria(idx >= 0 ? 'Vínculo editado' : 'Vínculo cadastrado', novo.nome || 'Vínculo sem nome', 'vinculo', id);
        salvarBanco();
        fecharModal('modalFormClasse');
        voltarDepoisFormClasse();
        renderizarFiltros();
        renderizarLista();
    }

    function abrirFormFuncao(id, origem = 'gerenciar') { origemFormFuncao = origem; fecharModal('modalListagem'); if(id) { let fn = db.funcoes.find(x => x.id === id); document.getElementById('funcaoId').value = fn.id; document.getElementById('funcaoNumero').value = fn.numero || ''; document.getElementById('funcaoNome').value = fn.nome; } else { document.getElementById('funcaoId').value = ''; document.getElementById('funcaoNumero').value = ''; document.getElementById('funcaoNome').value = ''; } document.getElementById('modalFormFuncao').style.display = 'flex'; }
    function voltarDepoisFormFuncao() { if(origemFormFuncao === 'inicio') { origemFormFuncao = 'gerenciar'; renderizarLista(); return; } abrirGerenciar('funcoes'); }
    function cancelarFormFuncao() { fecharModal('modalFormFuncao'); voltarDepoisFormFuncao(); }
    function salvarFuncao() { let id = document.getElementById('funcaoId').value || 'fn_' + Date.now(); let novo = { id: id, numero: document.getElementById('funcaoNumero').value.trim(), nome: document.getElementById('funcaoNome').value }; const idx = db.funcoes.findIndex(x => x.id === id); if(idx >= 0) db.funcoes[idx] = novo; else db.funcoes.push(novo); registrarAuditoria(idx >= 0 ? 'Função editada' : 'Função cadastrada', formatarFuncaoLista(novo), 'funcao', id); salvarBanco(); fecharModal('modalFormFuncao'); voltarDepoisFormFuncao(); renderizarLista(); }

    // FUNCIONARIO
    function carregarComboCategorias(selCat = '', selFun = '', selVt = '') { 
        const cCat = document.getElementById('funcCategoria'); cCat.innerHTML = optionHTML('', '-- Selecione o Vínculo --'); db.categorias.forEach(c => cCat.innerHTML += optionHTML(c.id, c.nome, selCat === c.id)); 
        const cFun = document.getElementById('funcFuncao'); cFun.innerHTML = optionHTML('', '-- Função --'); db.funcoes.forEach(fn => cFun.innerHTML += optionHTML(fn.id, formatarFuncaoLista(fn), selFun === fn.id));
        const cVt = document.getElementById('funcVTRota'); cVt.innerHTML = optionHTML('', '-- Rota (Nenhuma) --'); (db.configGerais.valesTransporte || []).forEach(v => cVt.innerHTML += optionHTML(v.rota, v.rota, selVt === v.rota));
    }

    function aplicarCamposVisiveisFuncionario(c = null) {
        const campos = getCamposFuncionarioClasse(c || {});
        const alternar = (id, visivel) => {
            const el = document.getElementById(id);
            if(el) el.style.display = visivel ? '' : 'none';
        };
        alternar('boxCampoGratificacao', campos.pedirGratificacao);
        alternar('boxCampoSalFamilia', campos.pedirSalFamilia);
        alternar('boxCampoUnidentis', campos.pedirUnidentis);
    }

    function aplicarBeneficiosVinculoFuncionario(c = null, funcionario = null) {
        const campos = getCamposFuncionarioClasse(c || {});
        const beneficios = getBeneficiosVinculo(c || {});
        const box = document.getElementById('boxBeneficiosVinculo');
        if(!box) return;
        const linhasBeneficios = ['linhaFuncVT','linhaFuncGratificacao','linhaFuncSalFamilia','linhaFuncUnidentis','linhaFuncPassagem','linhaFuncINSS','linhaFuncQuinzena','linhaFuncContracheque','linhaFuncControlePonto','linhaFuncFerias','linhaFuncQuinquenio'];
        if(!c) {
            linhasBeneficios.forEach((id) => {
                const linha = document.getElementById(id);
                if(linha) linha.style.display = 'none';
            });
            box.style.display = 'none';
            return;
        }
        if(c.semanal) {
            linhasBeneficios.forEach((id) => {
                const linha = document.getElementById(id);
                if(linha) linha.style.display = 'none';
            });
            box.style.display = 'none';
            return;
        }
        const configs = [
            { linha: 'linhaFuncVT', input: 'funcTemVT', visivel: campos.pedirVT, checked: funcionario ? !!funcionario.vtRota : true },
            { linha: 'linhaFuncGratificacao', input: 'funcTemGratificacao', visivel: campos.pedirGratificacao, checked: funcionario ? funcionario.temGratificacao !== false : true },
            { linha: 'linhaFuncSalFamilia', input: 'funcTemSalFamilia', visivel: campos.pedirSalFamilia, checked: funcionario ? funcionario.temSalFamilia !== false : true },
            { linha: 'linhaFuncUnidentis', input: 'funcTemUnidentis', visivel: campos.pedirUnidentis, checked: funcionario ? funcionario.temUnidentis !== false : true },
            { linha: 'linhaFuncPassagem', input: 'funcDescontaPassagem', visivel: campos.pedirDescontoPassagem, checked: funcionario ? funcionario.descontaPassagem !== false : true },
            { linha: 'linhaFuncINSS', input: 'funcDescontaINSS', visivel: campos.pedirINSS, checked: funcionario ? funcionario.descontaINSS !== false : true },
            { linha: 'linhaFuncQuinzena', input: 'funcRecebeQuinzena', visivel: beneficios.recebeQuinzena, checked: funcionario ? funcionario.recebeQuinzena !== false : true },
            { linha: 'linhaFuncContracheque', input: 'funcRecebeContracheque', visivel: beneficios.recebeContracheque, checked: funcionario ? funcionario.recebeContracheque !== false : true },
            { linha: 'linhaFuncControlePonto', input: 'funcTemControlePonto', visivel: campos.temControlePonto, checked: funcionario ? funcionario.temControlePonto !== false : true },
            { linha: 'linhaFuncFerias', input: 'funcTemFerias', visivel: beneficios.temFerias, checked: funcionario ? funcionario.temFerias !== false : true },
            { linha: 'linhaFuncQuinquenio', input: 'funcRecebeQuinquenio', visivel: beneficios.temQuinquenio, checked: funcionario ? funcionario.recebeQuinquenio === true : true }
        ];
        let temAlgum = false;
        configs.forEach((cfg) => {
            const linha = document.getElementById(cfg.linha);
            const input = document.getElementById(cfg.input);
            if(linha) linha.style.display = cfg.visivel ? 'flex' : 'none';
            if(input) input.checked = !!(cfg.visivel && cfg.checked);
            if(cfg.visivel) temAlgum = true;
        });
        const qtd = document.getElementById('funcQtdQuinquenios');
        if(qtd) qtd.value = Math.max(1, Math.min(9, Number((funcionario && funcionario.qtdQuinquenios) || 1)));
        toggleQtdQuinqueniosFuncionario();
        atualizarCamposValoresBeneficios();
        box.style.display = temAlgum ? 'block' : 'none';
    }

    function toggleValorBeneficioFuncionario(inputSwitchId, inputValorId) {
        const chk = document.getElementById(inputSwitchId);
        const input = document.getElementById(inputValorId);
        if(input && chk) input.style.display = chk.checked ? '' : 'none';
    }

    function atualizarCamposValoresBeneficios() {
        toggleValorBeneficioFuncionario('funcTemVT', 'funcVTRota');
        toggleValorBeneficioFuncionario('funcTemGratificacao', 'funcGratificacao');
        toggleValorBeneficioFuncionario('funcTemSalFamilia', 'funcSalFamilia');
        toggleValorBeneficioFuncionario('funcTemUnidentis', 'funcUnidentis');
    }

    function toggleQtdQuinqueniosFuncionario() {
        const chk = document.getElementById('funcRecebeQuinquenio');
        const qtd = document.getElementById('funcQtdQuinquenios');
        if(qtd && chk) {
            qtd.disabled = !chk.checked;
            if(chk.checked && (!qtd.value || Number(qtd.value) < 1)) qtd.value = 1;
        }
    }

    function aplicarPadroesClasse() {
        let catId = document.getElementById('funcCategoria').value;
        let c = db.categorias.find(x => x.id === catId);
        aplicarCamposVisiveisFuncionario(c);
        aplicarBeneficiosVinculoFuncionario(c);
        if(c) {
            if(c.horarios) {
                document.getElementById('funcHoraEntrada').value = c.horarios.entrada || ''; document.getElementById('funcHoraSaida').value = c.horarios.saida || '';
                if(c.horarios.semIntervalo) { document.getElementById('funcHoraIntEnt').value = ''; document.getElementById('funcHoraIntSai').value = ''; document.getElementById('funcHoraIntEnt').disabled = true; document.getElementById('funcHoraIntSai').disabled = true; } else { document.getElementById('funcHoraIntEnt').value = c.horarios.intEnt || ''; document.getElementById('funcHoraIntSai').value = c.horarios.intSai || ''; document.getElementById('funcHoraIntEnt').disabled = false; document.getElementById('funcHoraIntSai').disabled = false; }
            }
            if(c.salarios && c.salarios.length > 0) { document.getElementById('funcSalario').value = formatMoeda(c.salarios[0]); }
            document.getElementById('boxPermissoesSemanais').style.display = c.semanal ? 'block' : 'none';
        } else {
            document.getElementById('boxPermissoesSemanais').style.display = 'none';
        }
    }

    function renderizarDiasFolgaFuncionario(arrFolgasSelecionadas) {
        const box = document.getElementById('boxDiasFolgaFunc'); box.innerHTML = '';
        const diasArr = [{v:'1', n:'Seg'},{v:'2', n:'Ter'},{v:'3', n:'Qua'},{v:'4', n:'Qui'},{v:'5', n:'Sex'},{v:'6', n:'Sáb'},{v:'0', n:'Dom'}];
        diasArr.forEach(d => {
            let isChecked = false;
            if(arrFolgasSelecionadas) { isChecked = arrFolgasSelecionadas.includes(d.v); } 
            else { isChecked = !db.configGerais.diasFuncionamento.includes(d.v); }
            box.innerHTML += `<label><input type="checkbox" class="chk-folga-func" value="${d.v}" ${isChecked ? 'checked' : ''}> ${d.n}</label>`;
        });
    }

    function abrirFormFunc(id, origem = 'gerenciar') {
        if(!garantirAlgumaPermissao(['dadosPessoais', 'vinculoHorarios', 'financeiro'], () => abrirFormFunc(id, origem), 'abrir cadastro de funcionário')) return;
        origemFormFuncionario = origem;
        fecharModal('modalListagem'); tempPix = [];
        if(id) {
            let f = db.funcionarios.find(x => x.id === id); carregarComboCategorias(f.categoria, f.funcao, f.vtRota);
            let c = db.categorias.find(x => x.id === f.categoria); document.getElementById('boxPermissoesSemanais').style.display = (c && c.semanal) ? 'block' : 'none';
            aplicarCamposVisiveisFuncionario(c);
            aplicarBeneficiosVinculoFuncionario(c, f);
            document.getElementById('funcId').value = f.id; document.getElementById('funcCodigo').value = f.codigo || ''; document.getElementById('funcNome').value = f.nome || ''; document.getElementById('funcNomeSocial').value = f.nomeSocial || ''; document.getElementById('funcDataNasc').value = f.dataNasc || ''; document.getElementById('funcAdmissao').value = f.admissao || ''; document.getElementById('funcCPF').value = f.cpf || ''; document.getElementById('funcRG').value = f.rg || ''; document.getElementById('funcRGUF').value = f.rgUF || 'PB'; document.getElementById('funcCTPS').value = f.ctps || ''; document.getElementById('funcTel').value = f.telefone || ''; document.getElementById('funcSalario').value = f.salario || db.configGerais.salarioMinimo; document.getElementById('funcGratificacao').value = f.gratificacao || ''; document.getElementById('funcSalFamilia').value = f.salFamilia || ''; document.getElementById('funcUnidentis').value = f.unidentis || '';
            document.getElementById('funcHabFaltas').checked = f.habFaltas !== undefined ? f.habFaltas : true; document.getElementById('funcHabFerias').checked = f.habFerias !== undefined ? f.habFerias : true; document.getElementById('funcHabAtrasos').checked = f.habAtrasos !== undefined ? f.habAtrasos : true;
            document.getElementById('funcHoraEntrada').value = (f.horarios && f.horarios.entrada) ? f.horarios.entrada : ''; document.getElementById('funcHoraSaida').value = (f.horarios && f.horarios.saida) ? f.horarios.saida : ''; document.getElementById('funcHoraIntEnt').value = (f.horarios && f.horarios.intEnt) ? f.horarios.intEnt : ''; document.getElementById('funcHoraIntSai').value = (f.horarios && f.horarios.intSai) ? f.horarios.intSai : ''; 
            renderizarDiasFolgaFuncionario(f.horarios ? f.horarios.folgas : []);
            if(f.pixList) tempPix = JSON.parse(JSON.stringify(f.pixList));
        } else {
            carregarComboCategorias(); document.getElementById('boxPermissoesSemanais').style.display = 'none';
            aplicarCamposVisiveisFuncionario(null);
            aplicarBeneficiosVinculoFuncionario(null);
            document.getElementById('funcId').value = ''; document.getElementById('funcCodigo').value = ''; document.getElementById('funcNome').value = ''; document.getElementById('funcNomeSocial').value = ''; document.getElementById('funcDataNasc').value = ''; document.getElementById('funcAdmissao').value = ''; document.getElementById('funcCPF').value = ''; document.getElementById('funcRG').value = ''; document.getElementById('funcRGUF').value = 'PB'; document.getElementById('funcCTPS').value = ''; document.getElementById('funcTel').value = ''; document.getElementById('funcSalario').value = db.configGerais.salarioMinimo; document.getElementById('funcGratificacao').value = ''; document.getElementById('funcSalFamilia').value = ''; document.getElementById('funcUnidentis').value = '';
            document.getElementById('funcHabFaltas').checked = true; document.getElementById('funcHabFerias').checked = true; document.getElementById('funcHabAtrasos').checked = true;
            document.getElementById('funcHoraEntrada').value = ''; document.getElementById('funcHoraSaida').value = ''; document.getElementById('funcHoraIntEnt').value = ''; document.getElementById('funcHoraIntSai').value = ''; 
            renderizarDiasFolgaFuncionario(null);
        }
        atualizarCamposValoresBeneficios();
        toggleQtdQuinqueniosFuncionario();
        aplicarPermissoesFormularioFuncionario();
        renderListaPix(); document.getElementById('modalFormFuncionario').style.display = 'flex';
    }
    function renderListaPix() { const box = document.getElementById('listaPix'); if(tempPix.length === 0) { box.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">Nenhuma chave PIX.</div>'; return; } box.innerHTML = tempPix.map((p, i) => `<div class="list-item-config pix-list-row"><div class="pix-text"><b style="color:#0277BD;">${escapeHTML(p.tipo || 'PIX')}</b> - ${escapeHTML(p.chave || '')}</div><button onclick="removerPix(${i})">X</button></div>`).join(''); }
    function addPix() { 
        let tipo = document.getElementById('novoPixTipo').value; let chv = document.getElementById('novoPixInput').value.trim(); 
        if(tipo === 'E-mail') { chv = chv.toLowerCase(); if(!chv.includes('@') || !chv.includes('.')) return alert('Digite um e-mail válido com @ e domínio.'); }
        if(chv) { tempPix.push({ tipo: tipo, chave: chv }); document.getElementById('novoPixInput').value = ''; renderListaPix(); } 
    }
    function removerPix(idx) { tempPix.splice(idx, 1); renderListaPix(); }
    function voltarDepoisFormFuncionario() { if(origemFormFuncionario === 'inicio') { origemFormFuncionario = 'gerenciar'; renderizarLista(); return; } abrirGerenciar('funcionarios'); }
    function cancelarFormFuncionario() { fecharModal('modalFormFuncionario'); voltarDepoisFormFuncionario(); }
    function salvarFuncionario() { 
        const id = document.getElementById('funcId').value || 'f_'+Date.now(); 
        const existente = db.funcionarios.find(x => x.id === id);
        const novo = existente ? JSON.parse(JSON.stringify(existente)) : { id, arquivado: false, arquivadoEm: null };
        novo.id = id;
        let folgas = Array.from(document.querySelectorAll('.chk-folga-func:checked')).map(el => el.value);
        const linhaVisivel = (idLinha) => {
            const linha = document.getElementById(idLinha);
            return linha && linha.style.display !== 'none';
        };
        const qtdQuinquenios = Math.max(1, Math.min(9, parseInt(document.getElementById('funcQtdQuinquenios').value, 10) || 1));
        if(temPermissaoAtual('dadosPessoais')) {
            Object.assign(novo, { codigo: document.getElementById('funcCodigo').value, nome: document.getElementById('funcNome').value, nomeSocial: document.getElementById('funcNomeSocial').value, dataNasc: document.getElementById('funcDataNasc').value, admissao: document.getElementById('funcAdmissao').value, cpf: document.getElementById('funcCPF').value, rg: document.getElementById('funcRG').value, rgUF: document.getElementById('funcRGUF').value, ctps: document.getElementById('funcCTPS').value, telefone: document.getElementById('funcTel').value });
        }
        if(temPermissaoAtual('vinculoHorarios')) {
            Object.assign(novo, { funcao: document.getElementById('funcFuncao').value, categoria: document.getElementById('funcCategoria').value, habFaltas: document.getElementById('funcHabFaltas').checked, habFerias: document.getElementById('funcHabFerias').checked, habAtrasos: document.getElementById('funcHabAtrasos').checked, horarios: { entrada: document.getElementById('funcHoraEntrada').value, saida: document.getElementById('funcHoraSaida').value, intEnt: document.getElementById('funcHoraIntEnt').value, intSai: document.getElementById('funcHoraIntSai').value, folgas: folgas } });
        }
        if(temPermissaoAtual('financeiro')) {
            Object.assign(novo, { vtRota: linhaVisivel('linhaFuncVT') && document.getElementById('funcTemVT').checked ? document.getElementById('funcVTRota').value : '', pixList: tempPix, salario: document.getElementById('funcSalario').value, gratificacao: document.getElementById('funcGratificacao').value, salFamilia: document.getElementById('funcSalFamilia').value, unidentis: document.getElementById('funcUnidentis').value, temGratificacao: linhaVisivel('linhaFuncGratificacao') && document.getElementById('funcTemGratificacao').checked, temSalFamilia: linhaVisivel('linhaFuncSalFamilia') && document.getElementById('funcTemSalFamilia').checked, temUnidentis: linhaVisivel('linhaFuncUnidentis') && document.getElementById('funcTemUnidentis').checked, descontaPassagem: linhaVisivel('linhaFuncPassagem') && document.getElementById('funcDescontaPassagem').checked, descontaINSS: linhaVisivel('linhaFuncINSS') && document.getElementById('funcDescontaINSS').checked, recebeQuinquenio: linhaVisivel('linhaFuncQuinquenio') && document.getElementById('funcRecebeQuinquenio').checked, qtdQuinquenios: qtdQuinquenios, recebeQuinzena: linhaVisivel('linhaFuncQuinzena') && document.getElementById('funcRecebeQuinzena').checked, recebeContracheque: linhaVisivel('linhaFuncContracheque') && document.getElementById('funcRecebeContracheque').checked, temControlePonto: linhaVisivel('linhaFuncControlePonto') && document.getElementById('funcTemControlePonto').checked, temFerias: linhaVisivel('linhaFuncFerias') && document.getElementById('funcTemFerias').checked });
        }
        const idx = db.funcionarios.findIndex(x => x.id === id); if(idx >= 0) db.funcionarios[idx] = novo; else db.funcionarios.push(novo); registrarAuditoria(idx >= 0 ? 'Funcionário editado' : 'Funcionário cadastrado', novo.nome || 'Funcionário sem nome', 'funcionario', id); salvarBanco(); fecharModal('modalFormFuncionario'); voltarDepoisFormFuncionario(); 
    }

    // CONFIGS
    function normalizarInputPercentual(el) { el.value = el.value.replace(/[^0-9,.]/g, '').replace(/\./g, ','); }
    function parsePercentual(valor) { const texto = String(valor || '').replace(',', '.'); const numero = parseFloat(texto); return Number.isFinite(numero) ? numero : 0; }
    function formatPercentual(valor) { return parsePercentual(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
    function ordenarINSS(lista) { return [...(lista || [])].sort((a, b) => parseMoeda(a.limite) - parseMoeda(b.limite)); }

    function renderListasConfig() {
        const listVT = document.getElementById('listaVT');
        const listMot = document.getElementById('listaMotivos');
        const listINSS = document.getElementById('listaINSS');
        listVT.innerHTML = tempVT.length ? tempVT.map((v, i) => `<div class="list-item-config"><span>${escapeHTML(v.rota)} - <b style="color:#00695C;">R$ ${escapeHTML(v.valor)}</b></span><div><button class="btn-edit-small" onclick="editarVT(${i})">✏️</button><button onclick="removerVT(${i})">X</button></div></div>`).join('') : '<div style="color:#999; font-size:12px; text-align:center;">Nenhuma rota.</div>';
        listMot.innerHTML = tempMotivos.length ? tempMotivos.map((m, i) => `<div class="list-item-config"><span>${escapeHTML(m)}</span><div style="display:flex; gap:2px;"><button class="btn-edit-small" onclick="moverMotivo(${i}, -1)">⬆️</button><button class="btn-edit-small" onclick="moverMotivo(${i}, 1)">⬇️</button><button onclick="confirmarRemoverMotivo(${i})">X</button></div></div>`).join('') : '<div style="color:#999; font-size:12px; text-align:center;">Nenhum motivo.</div>';
        if(listINSS) {
            const ordenadas = ordenarINSS(tempINSS);
            listINSS.innerHTML = ordenadas.length ? ordenadas.map((faixa, i) => `<div class="list-item-config"><span>Até <b>R$ ${escapeHTML(formatMoeda(parseMoeda(faixa.limite)))}</b> - <b style="color:#6A1B9A;">${escapeHTML(formatPercentual(faixa.aliquota))}%</b></span><div><button class="btn-edit-small" onclick="editarINSS(${i})">✏️</button><button onclick="removerINSS(${i})">X</button></div></div>`).join('') : '<div style="color:#999; font-size:12px; text-align:center;">Nenhuma faixa de INSS.</div>';
        }
    }
    function addVT() { let r = document.getElementById('novoVTRota').value.trim(); let v = document.getElementById('novoVTValor').value.trim(); let editIdx = document.getElementById('editIdxVT').value; if(r && v) { if(editIdx !== "") { tempVT[editIdx] = {rota: r, valor: v}; document.getElementById('editIdxVT').value = ""; document.getElementById('btnSalvarVT').innerText = "+"; } else { tempVT.push({rota: r, valor: v}); } document.getElementById('novoVTRota').value = ''; document.getElementById('novoVTValor').value = ''; renderListasConfig(); } }
    function editarVT(idx) { let v = tempVT[idx]; document.getElementById('novoVTRota').value = v.rota; document.getElementById('novoVTValor').value = v.valor; document.getElementById('editIdxVT').value = idx; document.getElementById('btnSalvarVT').innerText = "OK"; }
    function removerVT(idx) { tempVT.splice(idx, 1); renderListasConfig(); }
    function addINSS() {
        let limite = document.getElementById('novoINSSLimite').value.trim();
        let aliquota = document.getElementById('novoINSSAliquota').value.trim();
        let editIdx = document.getElementById('editIdxINSS').value;
        if(!limite || !aliquota || parseMoeda(limite) <= 0 || parsePercentual(aliquota) <= 0) return alert('Informe o limite e a alíquota da faixa.');
        const faixa = { limite: formatMoeda(parseMoeda(limite)), aliquota: formatPercentual(aliquota) };
        const ordenadas = ordenarINSS(tempINSS);
        if(editIdx !== "") ordenadas[Number(editIdx)] = faixa;
        else ordenadas.push(faixa);
        tempINSS = ordenarINSS(ordenadas);
        document.getElementById('novoINSSLimite').value = '';
        document.getElementById('novoINSSAliquota').value = '';
        document.getElementById('editIdxINSS').value = '';
        document.getElementById('btnSalvarINSS').innerText = '+';
        renderListasConfig();
    }
    function editarINSS(idx) {
        tempINSS = ordenarINSS(tempINSS);
        let faixa = tempINSS[idx]; if(!faixa) return;
        document.getElementById('novoINSSLimite').value = faixa.limite;
        document.getElementById('novoINSSAliquota').value = faixa.aliquota;
        document.getElementById('editIdxINSS').value = idx;
        document.getElementById('btnSalvarINSS').innerText = 'OK';
    }
    function removerINSS(idx) { tempINSS = ordenarINSS(tempINSS); tempINSS.splice(idx, 1); renderListasConfig(); }
    function addMotivo() { let mot = document.getElementById('novoMotivo').value.trim(); if(mot) { tempMotivos.push(mot); document.getElementById('novoMotivo').value = ''; renderListasConfig(); } }
    function moverMotivo(idx, dir) { if(dir === -1 && idx > 0) { let t = tempMotivos[idx]; tempMotivos[idx] = tempMotivos[idx-1]; tempMotivos[idx-1] = t; } if(dir === 1 && idx < tempMotivos.length-1) { let t = tempMotivos[idx]; tempMotivos[idx] = tempMotivos[idx+1]; tempMotivos[idx+1] = t; } renderListasConfig(); }
    function confirmarRemoverMotivo(idx) { motivoToDelete = idx; document.getElementById('modalConfirmExclusaoMotivo').style.display = 'flex'; }
    function executarRemocaoMotivo() { if(motivoToDelete !== null) { tempMotivos.splice(motivoToDelete, 1); renderListasConfig(); } fecharModal('modalConfirmExclusaoMotivo'); }
    function salvarConfigGerais() { db.configGerais.salarioMinimo = document.getElementById('confSalario').value; db.configGerais.adiantamentoQuinzena = document.getElementById('confAdiantamento').value; db.configGerais.diasAquisitivoFerias = Math.max(1, Math.min(370, Number(document.getElementById('confDiasAquisitivoFerias').value || 360))); db.configGerais.tema = db.configGerais.tema || 'verde'; db.configGerais.diasFuncionamento = Array.from(document.querySelectorAll('.chk-dias-func:checked')).map(el => el.value); db.configGerais.valesTransporte = tempVT; db.configGerais.motivosAdiantamento = tempMotivos; db.configGerais.inssFaixas = ordenarINSS(tempINSS).length ? ordenarINSS(tempINSS) : criarTabelaINSSPadrao(); registrarAuditoria('Configurações gerais salvas', `Salário mínimo, quinzena, INSS, VT, motivos, férias e tema atualizados. Dias aquisitivos: ${db.configGerais.diasAquisitivoFerias}.`, 'configuracoes', 'gerais'); salvarBanco(); aplicarTemaApp(); fecharModal('modalConfigGerais'); document.getElementById('modalPainelUnificado').style.display='flex'; }

    // POPULAR ADMIN SELECT
    function getAdminOptions(selectedId = '') { let html = optionHTML('', '-- Selecione --'); db.administradores.forEach(a => { html += optionHTML(a.id, a.nome, selectedId === a.id); }); return html; }
    function getAdminNome(id) { let a = db.administradores.find(x => x.id === id); return a ? escapeHTML(a.nome) : 'N/I'; }

    // PRESENÇA SEMANAL, PIX E WHATSAPP
    function getFuncionarioAcoes() {
        const funcId = document.getElementById('acoesFuncId').value;
        return db.funcionarios.find(x => x.id === funcId);
    }

    function getNomeUsoFuncionario(f) {
        return (f && (f.nomeSocial || f.nome)) || 'Funcionário';
    }

    function copiarTextoSeguro(texto) {
        if(navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).catch(() => alert('Não foi possível copiar.'));
            return;
        }
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
    }

    function copiarPixFuncionario() { abrirEscolhaPixFuncionario(); }

    function abrirEscolhaPixFuncionario() {
        const f = getFuncionarioAcoes();
        if(!f) return alert('Funcionário não encontrado.');
        abrirEscolhaPixFuncionarioPorId(f.id);
    }

    function abrirEscolhaPixFuncionarioPorId(funcId, event = null) {
        if(event) event.stopPropagation();
        const f = db.funcionarios.find(x => x.id === funcId);
        const lista = (f && Array.isArray(f.pixList)) ? f.pixList.filter(p => p && p.chave) : [];
        if(lista.length === 0) return alert('Nenhuma chave PIX cadastrada para este funcionário.');
        if(lista.length === 1) return copiarChavePixFuncionario(0, funcId);
        const box = document.getElementById('listaEscolhaPix');
        box.innerHTML = lista.map((pix, i) => {
            const tipo = pix.tipo || 'PIX';
            return `<button class="btn-outline btn-pix-app" style="margin-bottom:0; border-color:#0277BD; color:#0277BD; text-align:left; justify-content:flex-start;" onclick="copiarChavePixFuncionario(${i}, ${jsArg(funcId)})"><span><strong><span class="emoji-pix">🔑</span>${escapeHTML(tipo)}</strong><br><span style="font-size:12px; word-break:break-all;">${escapeHTML(pix.chave)}</span></span></button>`;
        }).join('');
        document.getElementById('modalEscolhaPix').style.display = 'flex';
    }

    function copiarChavePixFuncionario(indice, funcId = '') {
        const f = funcId ? db.funcionarios.find(x => x.id === funcId) : getFuncionarioAcoes();
        const lista = (f && Array.isArray(f.pixList)) ? f.pixList.filter(p => p && p.chave) : [];
        const pix = lista[indice];
        if(!pix) return alert('Chave PIX não encontrada.');
        fecharModal('modalEscolhaPix');
        copiarTextoSeguro(pix.chave);
    }

    function normalizarTelefoneWhatsapp(telefone) {
        let digitos = String(telefone || '').replace(/\D/g, '');
        if(digitos.length === 10 || digitos.length === 11) digitos = '55' + digitos;
        return digitos.length >= 12 ? digitos : '';
    }

    function abrirWhatsappFuncionario(mensagem = '') {
        const f = getFuncionarioAcoes();
        if(!f) return alert('Funcionário não encontrado.');
        const telefone = normalizarTelefoneWhatsapp(f.telefone);
        if(!telefone) return alert('Cadastre um WhatsApp válido para este funcionário.');
        const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
        window.open(`https://wa.me/${telefone}${texto}`, '_blank');
    }

    function abrirWhatsappFuncionarioPorId(funcId, mensagem = '', event = null) {
        if(event) event.stopPropagation();
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        const telefone = normalizarTelefoneWhatsapp(f.telefone);
        if(!telefone) return alert('Cadastre um WhatsApp válido para este funcionário.');
        const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
        window.open(`https://wa.me/${telefone}${texto}`, '_blank');
    }

    function abrirWhatsappTexto(texto) {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    }
    
    function abrirModalPresencaSemana() {
        if(!garantirPermissao('registrarPresencaSemanal', () => abrirModalPresencaSemana(), 'registrar presença semanal')) return;
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value; let f = db.funcionarios.find(x => x.id === funcId); if(!f) return;
        document.getElementById('dataPresencaManual').value = getHojeSTR();
        
        let dates = getDatesDaSemana();
        let boxRapido = document.getElementById('boxBotoesDiasRapidos'); boxRapido.innerHTML = '';
        let m = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
        let diasArr = [ {n:'Qui', dt:dates.qui.dt}, {n:'Sex', dt:dates.sex.dt}, {n:'Sáb', dt:dates.sab.dt}, {n:'Dom', dt:dates.dom.dt} ];
        diasArr.forEach(d => { let dtStr = `${d.dt.getFullYear()}-${String(d.dt.getMonth()+1).padStart(2,'0')}-${String(d.dt.getDate()).padStart(2,'0')}`; boxRapido.innerHTML += `<button class="btn-dia-rapido" onclick="addPresencaManual('${dtStr}')">${d.n}<br>(${d.dt.getDate()}/${m[d.dt.getMonth()]})</button>`; });
        
        renderizarPresencasPendentes(funcId); document.getElementById('modalPresencaSemana').style.display = 'flex';
    }
    
    function addPresencaManual(dtForced = null) {
        if(!garantirPermissao('registrarPresencaSemanal', () => addPresencaManual(dtForced), 'registrar presença semanal')) return;
        const funcId = document.getElementById('acoesFuncId').value; let f = db.funcionarios.find(x => x.id === funcId);
        let dt = dtForced || document.getElementById('dataPresencaManual').value; if(!dt) return; dataTempPresenca = dt;
        
        if(db.registros.some(r => r.type==='presenca' && r.funcId===funcId && r.status==='pendente' && r.data===dt)) return alert("Dia já adicionado na lista pendente.");
        
        let c = db.categorias.find(x => x.id === f.categoria);
        if(c && c.salarios && c.salarios.length > 1) {
            let box = document.getElementById('listaBotoesSalario'); box.innerHTML = '';
            c.salarios.forEach(s => { box.innerHTML += `<button class="btn-action" style="background:#E65100; font-size:16px; padding:12px;" onclick="confirmarSalarioPresenca(${s})">R$ ${formatMoeda(s)}</button>`; });
            document.getElementById('modalEscolhaSalario').style.display = 'flex';
        } else {
            let valBase = (c && c.salarios && c.salarios.length === 1) ? c.salarios[0] : parseMoeda(f.salario || db.configGerais.salarioMinimo); registrarPresenca(valBase);
        }
    }
    function confirmarSalarioPresenca(val) { fecharModal('modalEscolhaSalario'); registrarPresenca(val); }
    function registrarPresenca(val) { const funcId = document.getElementById('acoesFuncId').value; const f = db.funcionarios.find(x => x.id === funcId); const reg = { id: 'reg_'+Date.now(), type: 'presenca', funcId: funcId, data: dataTempPresenca, valor: val, status: 'pendente', adminId: (getAdminAtual() || {}).id || '' }; db.registros.push(reg); registrarAuditoria('Presença semanal registrada', `${getNomeUsoFuncionario(f)} em ${formatDataBR(dataTempPresenca)} - R$ ${formatMoeda(val)}.`, 'presenca', reg.id); salvarBanco(); renderizarPresencasPendentes(funcId); }
    
    function renderizarPresencasPendentes(funcId) {
        let box = document.getElementById('listaPresencasPendentes'); let hPagos = document.getElementById('listaHistoricoPagosSemana');
        let pendentes = db.registros.filter(r => r.type === 'presenca' && r.funcId === funcId && r.status === 'pendente').sort((a,b) => new Date(a.data) - new Date(b.data));
        let pagos = db.registros.filter(r => r.type === 'pagamento_semana' && r.funcId === funcId).sort((a,b) => new Date(b.data) - new Date(a.data));
        
        let totalPend = 0; let html = '';
        pendentes.forEach(r => { totalPend += r.valor; html += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding:5px 0;"><span>📅 ${formatDataBR(r.data)}</span><span><b style="color:#00695C;">R$ ${formatMoeda(r.valor)}</b> <button style="background:none; border:none; color:#d32f2f; cursor:pointer;" onclick="excluirRegistro('${r.id}', 'presenca')">X</button></span></div>`; });
        document.getElementById('totalPresencasPendentes').innerText = `R$ ${formatMoeda(totalPend)}`; box.innerHTML = html || '<div style="color:#999; text-align:center;">Nenhum dia lançado na semana atual.</div>';
        
        let htmlP = ''; pagos.forEach(r => { htmlP += `<div style="border-bottom:1px solid #ddd; padding:5px 0;"><b>Pagamento em ${formatDataBR(r.data)}</b><br><span style="color:#E65100; font-weight:bold;">Total: R$ ${formatMoeda(r.valorTotal)} (${r.dias.length} dias)</span></div>`; });
        hPagos.innerHTML = htmlP || '<div style="color:#999; text-align:center;">Nenhum histórico.</div>';
    }

    function confirmarPagamentoSemana() {
        if(!garantirPermissao('registrarPresencaSemanal', () => confirmarPagamentoSemana(), 'confirmar pagamento semanal')) return;
        const funcId = document.getElementById('acoesFuncId').value;
        let pendentes = db.registros.filter(r => r.type === 'presenca' && r.funcId === funcId && r.status === 'pendente');
        if(pendentes.length === 0) return alert("Não há dias trabalhados na lista.");
        if(!confirm("Confirmar pagamento dos dias pendentes? Isso vai zerar o acumulado.")) return;
        let total = 0; let diasIds = []; pendentes.forEach(r => { total += r.valor; r.status = 'pago'; diasIds.push(r.data); });
        const pagamento = { id: 'reg_'+Date.now(), type: 'pagamento_semana', funcId: funcId, data: getHojeSTR(), valorTotal: total, dias: diasIds, adminId: (getAdminAtual() || {}).id || '' };
        db.registros.push(pagamento);
        registrarAuditoria('Pagamento semanal confirmado', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === funcId))}: R$ ${formatMoeda(total)} (${diasIds.length} dia(s)).`, 'pagamento_semana', pagamento.id);
        salvarBanco(); renderizarPresencasPendentes(funcId); alert("Pagamento Confirmado!");
    }

    function obterSelecionadosSemanais() {
        return obterFuncionariosSelecionados().filter(isFuncionarioSemanal);
    }

    function abrirModalPresencaMassaSemana() {
        if(!garantirPermissao('registrarPresencaSemanal', () => abrirModalPresencaMassaSemana(), 'registrar presença semanal')) return;
        const funcs = obterSelecionadosSemanais();
        if(funcs.length === 0 || funcs.length !== obterFuncionariosSelecionados().length) return alert('Selecione apenas funcionários com pagamento por semana.');
        document.getElementById('massaPresencaData').value = diaFiltroAptos || getHojeSTR();
        document.getElementById('massaPresencaValor').value = '';
        document.getElementById('textoPresencaMassaSemana').innerText = `${funcs.length} funcionário(s) selecionado(s). O valor escolhido será lançado para todos nesse dia.`;
        const valores = [];
        funcs.forEach((f) => {
            const cat = getCategoriaFuncionario(f);
            if(cat && Array.isArray(cat.salarios)) cat.salarios.forEach(v => { const valor = typeof v === 'number' ? v : parseMoeda(v); if(valor > 0) valores.push(valor); });
            const salario = parseMoeda(f.salario);
            if(salario > 0) valores.push(salario);
        });
        const unicos = [...new Set(valores.map(v => Math.round(v * 100) / 100))].sort((a, b) => a - b);
        const box = document.getElementById('botoesValoresPresencaMassa');
        box.innerHTML = unicos.map(v => `<button class="btn-dia-rapido" style="flex:0 0 auto; min-width:88px;" onclick="definirValorPresencaMassa(${v})">R$ ${formatMoeda(v)}</button>`).join('');
        if(unicos.length === 1) document.getElementById('massaPresencaValor').value = formatMoeda(unicos[0]);
        document.getElementById('modalPresencaMassaSemana').style.display = 'flex';
    }

    function definirValorPresencaMassa(valor) {
        document.getElementById('massaPresencaValor').value = formatMoeda(valor);
    }

    function registrarPresencaMassaSemana() {
        if(!garantirPermissao('registrarPresencaSemanal', () => registrarPresencaMassaSemana(), 'registrar presença semanal')) return;
        const data = document.getElementById('massaPresencaData').value;
        const valor = parseMoeda(document.getElementById('massaPresencaValor').value);
        if(!data) return alert('Informe a data da presença.');
        if(valor <= 0) return alert('Informe o valor para lançar.');
        const funcs = obterSelecionadosSemanais();
        const agora = Date.now();
        let criados = 0;
        let pulados = 0;
        funcs.forEach((f, idx) => {
            const jaExiste = db.registros.some(r => r.type === 'presenca' && r.funcId === f.id && r.status === 'pendente' && r.data === data);
            if(jaExiste) { pulados++; return; }
            db.registros.push({ id: `reg_${agora}_${idx}`, type: 'presenca', funcId: f.id, data, valor, status: 'pendente', adminId: (getAdminAtual() || {}).id || '', criadoEm: agora, editadoEm: agora, _syncAtualizadoEm: agora });
            criados++;
        });
        registrarAuditoria('Presença semanal em massa', `${criados} funcionário(s) em ${formatDataBR(data)} - R$ ${formatMoeda(valor)}.${pulados ? ` ${pulados} já tinham esse dia pendente.` : ''}`, 'presenca_massa', data);
        salvarBanco();
        fecharModal('modalPresencaMassaSemana');
        renderizarLista();
        alert(`Presença registrada para ${criados} funcionário(s).${pulados ? ` ${pulados} já tinham esse dia pendente.` : ''}`);
    }

    // ADIANTAMENTOS
    function abrirModalAdiantamento(editId = null) {
        if(!garantirPermissao('registrarAdiantamentos', () => abrirModalAdiantamento(editId), 'registrar adiantamentos')) return;
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        let selMotivo = document.getElementById('adiantMotivo'); selMotivo.innerHTML = ''; db.configGerais.motivosAdiantamento.forEach(m => selMotivo.innerHTML += optionHTML(m, m)); if(db.configGerais.motivosAdiantamento.length === 0) selMotivo.innerHTML = optionHTML('Vale', 'Vale');
        document.getElementById('adiantAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        configurarSelectAdminPorPermissao('adiantAdmin', 'registrarAdiantamentos');
        let areaEdit = document.getElementById('areaEditAdiant');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('adiantEditId').value = editId; document.getElementById('adiantData').value = r.data; document.getElementById('adiantValor').value = formatMoeda(r.valor); document.getElementById('adiantMotivo').value = r.motivo; document.getElementById('adiantObs').value = r.observacao || ''; document.getElementById('adiantForma').value = r.forma === 'PIX' ? 'Pix' : (r.forma || 'Pix'); document.getElementById('adiantAdmin').value = r.adminId; document.getElementById('btnSalvarAdiantamento').innerText = "Salvar Edição"; document.getElementById('btnCancelEditAdiant').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { document.getElementById('adiantEditId').value = ''; document.getElementById('adiantData').value = getHojeSTR(); document.getElementById('adiantValor').value = ''; document.getElementById('adiantObs').value = ''; document.getElementById('adiantForma').value = 'Pix'; document.getElementById('btnSalvarAdiantamento').innerText = "Gravar Lançamento"; document.getElementById('btnCancelEditAdiant').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistAdiantamento(funcId); document.getElementById('modalFormAdiantamento').style.display = 'flex';
    }
    function cancelarEdicaoRegistro(tipo) { if(tipo === 'adiantamento') abrirModalAdiantamento(null); else if(tipo === 'falta') abrirModalFalta(null); else if(tipo === 'atraso') abrirModalAtraso(null); else if(tipo === 'ferias') abrirModalFerias(null, origemModalFerias); }
    function salvarAdiantamento() {
        if(!adminSelecionadoTemPermissao('adiantAdmin', 'registrarAdiantamentos')) return;
        const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('adiantEditId').value; const valorStr = document.getElementById('adiantValor').value; if(!valorStr) return alert("Digite um valor.");
        const novo = { type: 'adiantamento', funcId: funcId, data: document.getElementById('adiantData').value, valor: parseMoeda(valorStr), motivo: document.getElementById('adiantMotivo').value, observacao: document.getElementById('adiantObs').value.trim(), forma: document.getElementById('adiantForma').value, adminId: document.getElementById('adiantAdmin').value, descontado: false };
        const f = db.funcionarios.find(x => x.id === funcId);
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; registrarAuditoria('Adiantamento editado', `${getNomeUsoFuncionario(f)}: R$ ${formatMoeda(novo.valor)} - ${novo.motivo}.`, 'adiantamento', editId); } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); registrarAuditoria('Adiantamento registrado', `${getNomeUsoFuncionario(f)}: R$ ${formatMoeda(novo.valor)} - ${novo.motivo}.`, 'adiantamento', novo.id); }
        salvarBanco(); abrirModalAdiantamento(null); // reseta tela
    }
    
    function marcarDesconto(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.aguardandoDesconto = true; renderizarHistAdiantamento(r.funcId); setTimeout(() => { let rCheck = db.registros.find(x => x.id === id); if(rCheck && rCheck.aguardandoDesconto) { rCheck.aguardandoDesconto = false; rCheck.descontado = true; registrarAuditoria('Adiantamento marcado como descontado', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === rCheck.funcId))}: R$ ${formatMoeda(rCheck.valor)}.`, 'adiantamento', id); salvarBanco(); if(document.getElementById('modalFormAdiantamento').style.display === 'flex') renderizarHistAdiantamento(rCheck.funcId); } }, 10000); }
    function desfazerDescontoTemp(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.aguardandoDesconto = false; renderizarHistAdiantamento(r.funcId); }
    function estornarDesconto(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.descontado = false; registrarAuditoria('Desconto de adiantamento estornado', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === r.funcId))}: R$ ${formatMoeda(r.valor)}.`, 'adiantamento', id); salvarBanco(); renderizarHistAdiantamento(r.funcId); }

    function renderizarHistAdiantamento(funcId) {
        let boxPendAtual = document.getElementById('listaHistoricoAdiantamentos');
        let boxPendAnt = document.getElementById('listaHistoricoAdiantamentosAnt');
        let boxDesc = document.getElementById('listaHistoricoAdiantDescontados');
        let hAtual = ''; let hAnt = ''; let hDesc = '';
        let totalAtual = 0; let totalAnt = 0;
        const mesAtual = getHojeSTR().substring(0, 7);
        const adminAtual = getAdminAtual();
        let regs = db.registros.filter(r => r.type === 'adiantamento' && r.funcId === funcId);
        if(adminRestrito(adminAtual)) regs = regs.filter(r => r.adminId === adminAtual.id);
        regs = regs.sort((a,b) => new Date(b.data) - new Date(a.data));
        const htmlPendente = (r) => {
            let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado)</span>` : '';
            let obs = r.observacao ? `<br><span style="color:#777; font-size:10px;">Obs: ${escapeHTML(r.observacao)}</span>` : '';
            let btnAcao = r.aguardandoDesconto ? `<button style="background:#Fbc02d; color:#fff; font-weight:bold; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:11px;" onclick="desfazerDescontoTemp(${jsArg(r.id)})">Desfazer (10s)</button>` : `<button style="background:#2e7d32; color:#fff; font-weight:bold; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:11px;" onclick="marcarDesconto(${jsArg(r.id)})">Descontar</button>`;
            return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0; align-items:center; gap:8px;"><div><b>${formatDataBR(r.data)}</b> - ${escapeHTML(r.motivo)} ${msgEdit}${obs}<br><span style="color:#666; font-size:10px;">Resp: ${getAdminNome(r.adminId)}</span></div><div style="display:flex; gap:5px; align-items:center; flex-shrink:0;"><b style="color:#1565C0;">R$ ${formatMoeda(r.valor)}</b> <button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalAdiantamento(${jsArg(r.id)})">✏️</button> ${btnAcao} <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro(${jsArg(r.id)}, 'adiantamento')">🗑️</button></div></div>`;
        };
        regs.forEach(r => { 
            let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado)</span>` : '';
            let obs = r.observacao ? `<br><span style="color:#999; font-size:10px;">Obs: ${escapeHTML(r.observacao)}</span>` : '';
            if(r.descontado) {
                hDesc += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0; gap:8px;"><div><b style="color:#777;">${formatDataBR(r.data)}</b> - ${escapeHTML(r.motivo)} ${msgEdit}${obs}<br><span style="color:#999; font-size:10px;">Resp: ${getAdminNome(r.adminId)}</span></div><div style="display:flex; gap:5px; align-items:center; flex-shrink:0;"><b style="color:#777;">R$ ${formatMoeda(r.valor)}</b> <button style="background:#eee; border:none; border-radius:4px; padding:2px 5px; cursor:pointer; font-size:10px;" onclick="estornarDesconto(${jsArg(r.id)})">Desfazer</button></div></div>`;
            } else if(String(r.data || '').substring(0, 7) === mesAtual) {
                totalAtual += Number(r.valor || 0);
                hAtual += htmlPendente(r);
            } else {
                totalAnt += Number(r.valor || 0);
                hAnt += htmlPendente(r);
            }
        });
        document.getElementById('totalAdiantPendenteAnt').innerText = `R$ ${formatMoeda(totalAnt)}`;
        document.getElementById('totalAdiantPendenteAtual').innerText = `R$ ${formatMoeda(totalAtual)}`;
        boxPendAnt.innerHTML = hAnt || '<div style="color:#999; text-align:center;">Nenhum pendente anterior.</div>';
        boxPendAtual.innerHTML = hAtual || '<div style="color:#999; text-align:center;">Nenhum pendente no mês atual.</div>';
        boxDesc.innerHTML = hDesc || '<div style="color:#999; text-align:center;">Nenhum histórico.</div>';
    }

    function enviarResumoDividaWhatsapp() {
        const f = getFuncionarioAcoes();
        if(!f) return alert('Funcionário não encontrado.');
        const regs = db.registros
            .filter(r => r.type === 'adiantamento' && r.funcId === f.id)
            .sort((a, b) => new Date(a.data) - new Date(b.data));
        if(regs.length === 0) return alert('Não há adiantamentos para enviar.');

        const pendentes = regs.filter(r => !r.descontado);
        const descontados = regs.filter(r => r.descontado);
        const totalPendente = pendentes.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const totalDescontado = descontados.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const linhas = [
            `Olá, ${getNomeUsoFuncionario(f)}.`,
            '',
            'Segue o resumo dos seus adiantamentos:',
            '',
            `Pendente: R$ ${formatMoeda(totalPendente)}`,
            `Já descontado: R$ ${formatMoeda(totalDescontado)}`,
            '',
            'Histórico:'
        ];

        regs.forEach((r) => {
            const status = r.descontado ? 'descontado' : 'pendente';
            const motivo = r.motivo ? ` - ${r.motivo}` : '';
            const forma = r.forma ? ` (${r.forma})` : '';
            const obs = r.observacao ? ` | Obs: ${r.observacao}` : '';
            linhas.push(`• ${formatDataBR(r.data)}${motivo}${forma}: R$ ${formatMoeda(r.valor)} - ${status}${obs}`);
        });

        linhas.push('', 'Qualquer divergência, me avise por aqui.');
        abrirWhatsappFuncionario(linhas.join('\n'));
    }

    // FALTAS E FÉRIAS
    function registroDescontaDSR(registro) {
        return registro && registro.tipo === 'Falta' && registro.descontarDia !== false;
    }

    function changeTipoFalta() { let t = document.getElementById('faltaTipo').value; if(t === 'Atestado' || t === 'Folga') document.getElementById('faltaDescontarDia').checked = false; else document.getElementById('faltaDescontarDia').checked = true; }
    
    function abrirModalFalta(editId = null) {
        if(!garantirPermissao('registrarAusencia', () => abrirModalFalta(editId), 'registrar ausência')) return;
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        document.getElementById('faltaAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        configurarSelectAdminPorPermissao('faltaAdmin', 'registrarAusencia');
        let areaEdit = document.getElementById('areaEditFalta');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('faltaEditId').value = editId; document.getElementById('faltaData').value = r.data; document.getElementById('faltaDataFim').value = r.dataFim || ''; document.getElementById('faltaTipo').value = r.tipo; document.getElementById('faltaDescontarDia').checked = r.descontarDia; document.getElementById('faltaDescontarPassagem').checked = r.descontarPassagem; document.getElementById('faltaAdmin').value = r.adminId; document.getElementById('btnSalvarFalta').innerText = "Salvar Edição"; document.getElementById('btnCancelEditFalta').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { document.getElementById('faltaEditId').value = ''; document.getElementById('faltaData').value = getHojeSTR(); document.getElementById('faltaDataFim').value = ''; document.getElementById('faltaTipo').value = 'Falta'; document.getElementById('faltaDescontarDia').checked = true; document.getElementById('faltaDescontarPassagem').checked = true; document.getElementById('btnSalvarFalta').innerText = "Gravar Registro"; document.getElementById('btnCancelEditFalta').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistFaltas(funcId); document.getElementById('modalFormFalta').style.display = 'flex';
    }
    function salvarFalta() {
        if(!adminSelecionadoTemPermissao('faltaAdmin', 'registrarAusencia')) return;
        const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('faltaEditId').value;
        let dataIni = document.getElementById('faltaData').value; let dataFim = document.getElementById('faltaDataFim').value || dataIni;
        
        let temDiaUtil = false; let d1Valid = new Date(dataIni + "T00:00:00"); let d2Valid = new Date(dataFim + "T00:00:00");
        for(let d = new Date(d1Valid); d <= d2Valid; d.setDate(d.getDate()+1)) { if(db.configGerais.diasFuncionamento.includes(d.getDay().toString())) { temDiaUtil = true; break; } }
        if(!temDiaUtil) return alert("O período selecionado não contém dias úteis. Verifique as configurações da empresa.");

        let conflitoFerias = db.registros.some(r => { if(r.type !== 'ferias' || r.funcId !== funcId) return false; let rIni = r.data; let rFim = r.dataFim || r.data; return (dataIni <= rFim && dataFim >= rIni); });
        if(conflitoFerias) return alert("Não é possível registrar ausência. O funcionário está de férias neste período!");

        let conflito = db.registros.some(r => { if(r.type !== 'falta' || r.funcId !== funcId || r.id === editId) return false; let rIni = r.data; let rFim = r.dataFim || r.data; return (dataIni <= rFim && dataFim >= rIni); });
        if(conflito) return alert("Já existe uma ausência registrada nestes dias para este funcionário.");
        
        const novo = { type: 'falta', funcId: funcId, data: dataIni, dataFim: document.getElementById('faltaDataFim').value, tipo: document.getElementById('faltaTipo').value, descontarDia: document.getElementById('faltaDescontarDia').checked, descontarPassagem: document.getElementById('faltaDescontarPassagem').checked, adminId: document.getElementById('faltaAdmin').value };
        const f = db.funcionarios.find(x => x.id === funcId);
        const periodo = `${formatDataBR(dataIni)}${dataFim && dataFim !== dataIni ? ` a ${formatDataBR(dataFim)}` : ''}`;
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; registrarAuditoria('Ausência editada', `${getNomeUsoFuncionario(f)}: ${periodo} - ${novo.tipo}.`, 'ausencia', editId); } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); registrarAuditoria('Ausência registrada', `${getNomeUsoFuncionario(f)}: ${periodo} - ${novo.tipo}.`, 'ausencia', novo.id); }
        salvarBanco(); abrirModalFalta(null); // reseta
    }
    function renderizarHistFaltas(funcId) {
        let box = document.getElementById('listaHistoricoFaltas'); let html = ''; let regs = db.registros.filter(r => r.type === 'falta' && r.funcId === funcId).sort((a,b) => new Date(b.data) - new Date(a.data));
        if(regs.length === 0) { box.innerHTML = '<div style="color:#999; text-align:center;">Nenhuma ausência.</div>'; return; }
        
        let groups = {};
        regs.forEach(r => {
            let mY = r.data.substring(0,7); if(!groups[mY]) groups[mY] = { records: [], diasDesc: 0, passDesc: 0, dsrSemanas: new Set() };
            groups[mY].records.push(r);
            let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1;
            let diasUteisFalta = 0;
            for(let d=new Date(d1); d<=d2; d.setDate(d.getDate()+1)) {
                if(db.configGerais.diasFuncionamento.includes(d.getDay().toString())) { diasUteisFalta++; if(registroDescontaDSR(r)) groups[mY].dsrSemanas.add(getWeekNumber(d)); }
            }
            if(r.descontarDia) { groups[mY].diasDesc += diasUteisFalta; }
            if(r.descontarPassagem) groups[mY].passDesc += diasUteisFalta;
        });

        for (const [mY, g] of Object.entries(groups)) {
            let mYStr = formatDataBR(mY+'-01').substring(3);
            html += `<div style="background:#e0e0e0; padding:4px 8px; font-weight:bold; margin-top:5px; border-radius:4px; display:flex; justify-content:space-between;"><span>Mês: ${mYStr}</span><span style="color:#D32F2F;">-${g.diasDesc} Dias | -${g.dsrSemanas.size} DSR | -${g.passDesc} Pass.</span></div>`;
            g.records.forEach(r => { let dFim = r.dataFim ? ` a ${formatDataBR(r.dataFim)}` : ''; let descDia = r.descontarDia ? '<span style="color:#D32F2F;">-Dia</span>' : ''; let descPas = r.descontarPassagem ? '<span style="color:#00695C;">-Pass</span>' : ''; let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado por ${getAdminNome(r.adminId)})</span>` : `<span style="color:#666; font-size:10px;">(Resp: ${getAdminNome(r.adminId)})</span>`; html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0;"><div><b>${formatDataBR(r.data)}${dFim}</b> - ${r.tipo}<br><div style="font-size:10px; gap:5px; display:flex;">${descDia} ${descPas}</div>${msgEdit}</div><div><button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalFalta('${r.id}')">✏️</button> <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro('${r.id}', 'falta')">🗑️</button></div></div>`; });
        }
        box.innerHTML = html;
    }

    function minutosEntreHorarios(inicio, fim) {
        if(!inicio || !fim) return 0;
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fim.split(':').map(Number);
        if(Number.isNaN(h1) || Number.isNaN(m1) || Number.isNaN(h2) || Number.isNaN(m2)) return 0;
        return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
    }

    function abrirModalAtraso(editId = null) {
        if(!garantirPermissao('registrarAtraso', () => abrirModalAtraso(editId), 'registrar atraso')) return;
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        document.getElementById('atrasoAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        configurarSelectAdminPorPermissao('atrasoAdmin', 'registrarAtraso');
        let areaEdit = document.getElementById('areaEditAtraso');
        if(editId) {
            let r = db.registros.find(x => x.id === editId); if(!r) return;
            document.getElementById('atrasoEditId').value = editId;
            document.getElementById('atrasoData').value = r.data || getHojeSTR();
            document.getElementById('atrasoPrevisto').value = r.horaPrevista || '';
            document.getElementById('atrasoChegada').value = r.horaChegada || '';
            document.getElementById('atrasoObs').value = r.observacao || '';
            document.getElementById('atrasoAdmin').value = r.adminId || '';
            document.getElementById('btnSalvarAtraso').innerText = "Salvar Edição";
            document.getElementById('btnCancelEditAtraso').style.display = 'block';
            areaEdit.classList.add('edit-highlight');
        } else {
            const f = db.funcionarios.find(x => x.id === funcId) || {};
            const hs = f.horarios || {};
            document.getElementById('atrasoEditId').value = '';
            document.getElementById('atrasoData').value = getHojeSTR();
            document.getElementById('atrasoPrevisto').value = hs.entrada || '';
            document.getElementById('atrasoChegada').value = '';
            document.getElementById('atrasoObs').value = '';
            document.getElementById('btnSalvarAtraso').innerText = "Gravar Atraso";
            document.getElementById('btnCancelEditAtraso').style.display = 'none';
            areaEdit.classList.remove('edit-highlight');
        }
        renderizarHistAtrasos(funcId); document.getElementById('modalFormAtraso').style.display = 'flex';
    }

    function salvarAtraso() {
        if(!adminSelecionadoTemPermissao('atrasoAdmin', 'registrarAtraso')) return;
        const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('atrasoEditId').value;
        const data = document.getElementById('atrasoData').value; if(!data) return alert("Informe a data do atraso.");
        const horaPrevista = document.getElementById('atrasoPrevisto').value;
        const horaChegada = document.getElementById('atrasoChegada').value;
        const novo = { type: 'atraso', funcId: funcId, data: data, horaPrevista: horaPrevista, horaChegada: horaChegada, minutos: minutosEntreHorarios(horaPrevista, horaChegada), observacao: document.getElementById('atrasoObs').value, adminId: document.getElementById('atrasoAdmin').value };
        const f = db.funcionarios.find(x => x.id === funcId);
        const detalhe = `${getNomeUsoFuncionario(f)}: ${formatDataBR(data)}${horaChegada ? ` - chegou ${horaChegada}` : ''}${novo.minutos ? ` (${novo.minutos} min)` : ''}.`;
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; registrarAuditoria('Atraso editado', detalhe, 'atraso', editId); } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); registrarAuditoria('Atraso registrado', detalhe, 'atraso', novo.id); }
        salvarBanco(); abrirModalAtraso(null); renderizarLista();
    }

    function renderizarHistAtrasos(funcId) {
        let box = document.getElementById('listaHistoricoAtrasos'); let html = '';
        let regs = db.registros.filter(r => r.type === 'atraso' && r.funcId === funcId).sort((a,b) => new Date(b.data) - new Date(a.data));
        if(regs.length === 0) { box.innerHTML = '<div style="color:#999; text-align:center;">Nenhum atraso registrado.</div>'; return; }
        regs.forEach(r => {
            let minutos = Number(r.minutos || minutosEntreHorarios(r.horaPrevista, r.horaChegada) || 0);
            let detalhe = [r.horaPrevista ? `Previsto: ${escapeHTML(r.horaPrevista)}` : '', r.horaChegada ? `Chegou: ${escapeHTML(r.horaChegada)}` : '', minutos ? `${minutos} min` : ''].filter(Boolean).join(' • ');
            let obs = r.observacao ? `<br><span style="color:#666;">${escapeHTML(r.observacao)}</span>` : '';
            let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado)</span>` : '';
            html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:6px 0; gap:8px;"><div><b>${formatDataBR(r.data)}</b> ${msgEdit}<br><span style="color:#795548; font-size:11px; font-weight:bold;">${detalhe || 'Atraso registrado'}</span>${obs}<br><span style="color:#999; font-size:10px;">Resp: ${getAdminNome(r.adminId)}</span></div><div style="flex-shrink:0;"><button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalAtraso(${jsArg(r.id)})">✏️</button> <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro(${jsArg(r.id)}, 'atraso')">🗑️</button></div></div>`;
        });
        box.innerHTML = html;
    }

    function getDiasAquisitivoFerias() {
        return Math.max(1, Math.min(370, Number((db.configGerais && db.configGerais.diasAquisitivoFerias) || 360)));
    }

    function getUltimaFeriasComPeriodo(funcId) {
        return getRegistrosFeriasFuncionario(funcId)[0] || null;
    }

    function sugerirPeriodoAquisitivoFuncionario(funcId) {
        const f = db.funcionarios.find(x => x.id === funcId) || {};
        const ultima = getUltimaFeriasComPeriodo(funcId);
        let inicio = f.admissao || getHojeSTR();
        if(ultima && ultima.periodoAquisitivoFim) inicio = somarDiasISO(ultima.periodoAquisitivoFim, 1);
        const fim = somarDiasISO(inicio, getDiasAquisitivoFerias() - 1);
        return { inicio, fim };
    }

    function sugerirFimPeriodoAquisitivo() {
        const inicio = document.getElementById('feriasAquisitivoInicio').value;
        if(!inicio) return;
        document.getElementById('feriasAquisitivoFim').value = somarDiasISO(inicio, getDiasAquisitivoFerias() - 1);
    }

    function atualizarRetornoFerias() {
        const fim = document.getElementById('feriasDataFim').value;
        if(!fim) return;
        document.getElementById('feriasRetorno').value = somarDiasISO(fim, 1);
    }

    function atualizarPeriodoFeriasPorInicio() {
        const inicio = document.getElementById('feriasData').value;
        if(!inicio) return;
        document.getElementById('feriasDataFim').value = somarDiasISO(inicio, 29);
        atualizarRetornoFerias();
    }

    function abrirModalFerias(editId = null, origem = '') {
        if(origem) origemModalFerias = origem;
        if(!garantirPermissao('lancarFerias', () => abrirModalFerias(editId, origemModalFerias), 'lançar férias')) return;
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value; document.getElementById('feriasAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        const funcionario = db.funcionarios.find(x => x.id === funcId);
        if(!editId && funcionario && !funcionarioTemDireitoFerias(funcionario)) return alert('Este funcionário está marcado como sem direito a férias.');
        configurarSelectAdminPorPermissao('feriasAdmin', 'lancarFerias');
        let areaEdit = document.getElementById('areaEditFerias');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('feriasEditId').value = editId; document.getElementById('feriasData').value = r.data; document.getElementById('feriasDataFim').value = r.dataFim; document.getElementById('feriasAquisitivoInicio').value = r.periodoAquisitivoInicio || ''; document.getElementById('feriasAquisitivoFim').value = r.periodoAquisitivoFim || ''; document.getElementById('feriasRetorno').value = r.retorno || (r.dataFim ? somarDiasISO(r.dataFim, 1) : ''); document.getElementById('feriasAdmin').value = r.adminId; document.getElementById('btnSalvarFerias').innerText = "Salvar Edição"; document.getElementById('btnCancelEditFerias').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { const periodo = sugerirPeriodoAquisitivoFuncionario(funcId); document.getElementById('feriasEditId').value = ''; document.getElementById('feriasData').value = getHojeSTR(); document.getElementById('feriasAquisitivoInicio').value = periodo.inicio; document.getElementById('feriasAquisitivoFim').value = periodo.fim; atualizarPeriodoFeriasPorInicio(); document.getElementById('btnSalvarFerias').innerText = "Gravar Férias"; document.getElementById('btnCancelEditFerias').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistFerias(funcId); document.getElementById('modalFormFerias').style.display = 'flex';
    }
    function salvarFerias() { if(!adminSelecionadoTemPermissao('feriasAdmin', 'lancarFerias')) return; const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('feriasEditId').value; const aqInicio = document.getElementById('feriasAquisitivoInicio').value; const aqFim = document.getElementById('feriasAquisitivoFim').value; const dataInicio = document.getElementById('feriasData').value; const dataFim = document.getElementById('feriasDataFim').value; if(aqInicio && aqFim && aqInicio > aqFim) return alert('O período aquisitivo está invertido.'); if(dataInicio && dataFim && dataInicio > dataFim) return alert('A data final das férias está antes da data inicial.'); const novo = { type: 'ferias', funcId: funcId, data: dataInicio, dataFim: dataFim, periodoAquisitivoInicio: aqInicio, periodoAquisitivoFim: aqFim, retorno: document.getElementById('feriasRetorno').value, adminId: document.getElementById('feriasAdmin').value }; const func = db.funcionarios.find(f => f.id === funcId); if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; registrarAuditoria('Férias editadas', `${getNomeUsoFuncionario(func)}: ${formatDataBR(dataInicio)} a ${formatDataBR(dataFim)}. Aquisitivo ${formatDataBR(aqInicio)} a ${formatDataBR(aqFim)}.`, 'ferias', editId); } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); registrarAuditoria('Férias registradas', `${getNomeUsoFuncionario(func)}: ${formatDataBR(dataInicio)} a ${formatDataBR(dataFim)}. Aquisitivo ${formatDataBR(aqInicio)} a ${formatDataBR(aqFim)}.`, 'ferias', novo.id); } salvarBanco(); abrirModalFerias(null, origemModalFerias); renderizarLista(); if(origemModalFerias === 'calendario') renderCalendarioFerias(); }

    function voltarModalFerias() {
        fecharModal('modalFormFerias');
        if(origemModalFerias === 'calendario') {
            renderCalendarioFerias();
            document.getElementById('modalCalendarioFerias').style.display = 'flex';
            return;
        }
        document.getElementById('modalAcoesFunc').style.display = 'flex';
    }
    function renderizarHistFerias(funcId) { let box = document.getElementById('listaHistoricoFerias'); let html = ''; let regs = getRegistrosFeriasFuncionario(funcId); if(regs.length === 0) { box.innerHTML = '<div style="color:#999; text-align:center;">Nenhum registro.</div>'; return; } regs.forEach(r => { let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado por ${getAdminNome(r.adminId)})</span>` : `<span style="color:#666; font-size:10px;">(Resp: ${getAdminNome(r.adminId)})</span>`; const periodo = r.periodoAquisitivoInicio || r.periodoAquisitivoFim ? `<br><span style="color:#795548; font-size:11px; font-weight:bold;">Aquisitivo: ${formatDataBR(r.periodoAquisitivoInicio)} a ${formatDataBR(r.periodoAquisitivoFim)}</span>` : ''; html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0;"><div>De <b>${formatDataBR(r.data)}</b> a <b>${formatDataBR(r.dataFim)}</b>${periodo}<br><span style="color:#F57F17; font-size:11px; font-weight:bold;">Volta: ${formatDataBR(r.retorno)}</span><br>${msgEdit}</div><div><button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalFerias('${r.id}')">✏️</button> <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro('${r.id}', 'ferias')">🗑️</button></div></div>`; }); box.innerHTML = html; }

    function somarMesesISO(dataStr, meses) {
        if(!dataStr) return '';
        const data = new Date(dataStr + "T00:00:00");
        const dia = data.getDate();
        data.setMonth(data.getMonth() + meses);
        if(data.getDate() < dia) data.setDate(0);
        return dataISO(data);
    }

    function subtrairDiasISO(dataStr, dias) {
        if(!dataStr) return '';
        const data = new Date(dataStr + "T00:00:00");
        data.setDate(data.getDate() - dias);
        return dataISO(data);
    }

    function diasEntreISO(inicio, fim) {
        const d1 = new Date(inicio + "T00:00:00");
        const d2 = new Date(fim + "T00:00:00");
        return Math.ceil((d2 - d1) / 86400000);
    }

    function getRegistrosFeriasFuncionario(funcId) {
        return db.registros
            .filter(r => r.type === 'ferias' && r.funcId === funcId && r.data)
            .sort((a, b) => {
                const dataB = String(b.periodoAquisitivoFim || b.dataFim || b.data || '');
                const dataA = String(a.periodoAquisitivoFim || a.dataFim || a.data || '');
                return dataB.localeCompare(dataA);
            });
    }

    function getProximoPeriodoAquisitivo(f) {
        if(!f || !f.admissao) return { inicio: '', fim: '', ultima: null };
        const ultima = getRegistrosFeriasFuncionario(f.id)[0] || null;
        let inicio = f.admissao;
        if(ultima && ultima.periodoAquisitivoFim) inicio = somarDiasISO(ultima.periodoAquisitivoFim, 1);
        else if(ultima && ultima.dataFim) inicio = somarDiasISO(ultima.dataFim, 1);
        const fim = somarDiasISO(inicio, getDiasAquisitivoFerias() - 1);
        return { inicio, fim, ultima };
    }

    function calcularSituacaoFerias(f) {
        const hoje = getHojeSTR();
        if(!funcionarioTemDireitoFerias(f)) {
            return { status: 'sem_direito', classe: '', rotulo: 'Sem direito', dias: null, aquisitivo: '', limite: '', ultima: null, periodoInicio: '', periodoFim: '' };
        }
        if(!f.admissao) {
            return { status: 'sem_admissao', classe: '', rotulo: 'Sem admissão', dias: null, aquisitivo: '', limite: '', ultima: null, periodoInicio: '', periodoFim: '' };
        }
        const periodo = getProximoPeriodoAquisitivo(f);
        const aquisitivo = periodo.fim;
        const limite = subtrairDiasISO(somarMesesISO(aquisitivo, 12), 29);
        const dias = diasEntreISO(hoje, limite);
        const comum = { dias, aquisitivo, limite, ultima: periodo.ultima, periodoInicio: periodo.inicio, periodoFim: periodo.fim };
        if(hoje < aquisitivo) return { ...comum, status: 'formacao', classe: 'formacao', rotulo: 'Em formação' };
        if(dias < 0) return { ...comum, status: 'vencido', classe: 'vencido', rotulo: 'Vencido' };
        if(dias <= 30) return { ...comum, status: 'urgente', classe: 'urgente', rotulo: 'Até 30 dias' };
        if(dias <= 90) return { ...comum, status: 'atencao', classe: 'atencao', rotulo: 'Até 90 dias' };
        return { ...comum, status: 'ok', classe: 'ok', rotulo: 'Em dia' };
    }

    function abrirCalendarioFerias() {
        document.getElementById('filtroCalendarioFerias').value = 'todos';
        renderCalendarioFerias();
        document.getElementById('modalCalendarioFerias').style.display = 'flex';
    }

    function abrirFeriasPeloCalendario(funcId) {
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        document.getElementById('acoesFuncId').value = f.id;
        document.getElementById('tituloAcoesFunc').innerText = getNomeUsoFuncionario(f);
        origemModalFerias = 'calendario';
        fecharModal('modalCalendarioFerias');
        abrirModalFerias(null, 'calendario');
    }

    function renderCalendarioFerias() {
        const lista = document.getElementById('listaCalendarioFerias');
        const resumoBox = document.getElementById('resumoCalendarioFerias');
        if(!lista || !resumoBox) return;
        const filtro = document.getElementById('filtroCalendarioFerias').value || 'todos';
        let itens = db.funcionarios
            .filter(f => !f.arquivado && funcionarioTemDireitoFerias(f))
            .map(f => ({ f, s: calcularSituacaoFerias(f) }))
            .sort((a, b) => {
                const la = a.s.limite || '9999-12-31';
                const lb = b.s.limite || '9999-12-31';
                return la.localeCompare(lb) || String(getNomeUsoFuncionario(a.f)).localeCompare(String(getNomeUsoFuncionario(b.f)));
            });
        const contagem = { vencido: 0, urgente: 0, atencao: 0, ok: 0, formacao: 0, sem_admissao: 0 };
        itens.forEach(item => { contagem[item.s.status] = (contagem[item.s.status] || 0) + 1; });
        resumoBox.innerHTML = `
            <div class="ferias-resumo-card"><strong>${contagem.vencido}</strong><span>vencido(s)</span></div>
            <div class="ferias-resumo-card"><strong>${contagem.urgente}</strong><span>até 30 dias</span></div>
            <div class="ferias-resumo-card"><strong>${contagem.atencao}</strong><span>até 90 dias</span></div>
            <div class="ferias-resumo-card"><strong>${contagem.ok + contagem.formacao}</strong><span>em dia/formação</span></div>`;
        if(filtro !== 'todos') {
            itens = itens.filter(item => {
                if(filtro === 'urgente') return item.s.status === 'urgente';
                if(filtro === 'atencao') return item.s.status === 'atencao';
                return item.s.status === filtro;
            });
        }
        if(itens.length === 0) {
            lista.innerHTML = '<div style="text-align:center; color:#999; padding:16px;">Nenhum funcionário neste filtro.</div>';
            return;
        }
        lista.innerHTML = itens.map(({ f, s }) => {
            const ultima = s.ultima ? `${formatDataBR(s.ultima.data)}${s.ultima.dataFim ? ` a ${formatDataBR(s.ultima.dataFim)}` : ''}` : 'Sem férias registradas';
            const ultimoPeriodo = s.ultima && (s.ultima.periodoAquisitivoInicio || s.ultima.periodoAquisitivoFim) ? `${formatDataBR(s.ultima.periodoAquisitivoInicio)} a ${formatDataBR(s.ultima.periodoAquisitivoFim)}` : 'Sem período anterior';
            const prazo = s.dias === null ? 'Informe a admissão' : (s.dias < 0 ? `${Math.abs(s.dias)} dia(s) vencido` : `${s.dias} dia(s) restantes`);
            const admissao = f.admissao ? formatDataBR(f.admissao) : 'Não informada';
            const periodoAquisitivo = s.periodoInicio || s.periodoFim ? `${formatDataBR(s.periodoInicio)} a ${formatDataBR(s.periodoFim)}` : '-';
            const aquisitivo = s.aquisitivo ? formatDataBR(s.aquisitivo) : '-';
            const limite = s.limite ? formatDataBR(s.limite) : '-';
            return `<div class="ferias-card ${s.classe}">
                <div class="ferias-card-head"><strong>${escapeHTML(f.nome || 'Sem nome')}</strong><span class="ferias-status">${escapeHTML(s.rotulo)}</span></div>
                <div class="ferias-meta">
                    <div>Admissão: <b>${admissao}</b></div>
                    <div>Últimas férias: <b>${escapeHTML(ultima)}</b></div>
                    <div>Último aquisitivo: <b>${escapeHTML(ultimoPeriodo)}</b></div>
                    <div>Próximo aquisitivo: <b>${escapeHTML(periodoAquisitivo)}</b></div>
                    <div>Direito formado em: <b>${aquisitivo}</b></div>
                    <div>Limite p/ gozo: <b>${limite}</b></div>
                    <div>Prazo: <b>${escapeHTML(prazo)}</b></div>
                    <div>Dias aquisitivos: <b>${getDiasAquisitivoFerias()}</b></div>
                </div>
                <div class="ferias-actions">
                    <button class="btn-outline btn-ferias-calc" onclick="abrirCalculoFerias(${jsArg(f.id)})">Calcular férias</button>
                    <button class="btn-outline btn-ferias-pagamento" onclick="abrirCalculoFerias(${jsArg(f.id)}, true)">Informar pagamento</button>
                    <button class="btn-outline btn-ferias-registro" onclick="abrirFeriasPeloCalendario(${jsArg(f.id)})">Registrar férias</button>
                </div>
            </div>`;
        }).join('');
    }

    function chavePagamentoFerias(funcId, aqInicio, aqFim) {
        return `ferias|${funcId}|${aqInicio || 'sem-inicio'}|${aqFim || 'sem-fim'}`;
    }

    function obterPagamentoFerias(funcId, aqInicio, aqFim) {
        return db.registros.find(r => r.type === 'ferias_pagamento' && r.funcId === funcId && r.periodoAquisitivoInicio === aqInicio && r.periodoAquisitivoFim === aqFim);
    }

    function abrirCalculoFerias(funcId, focoPagamento = false) {
        if(!garantirPermissao('lancarFerias', () => abrirCalculoFerias(funcId, focoPagamento), 'calcular férias')) return;
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        if(!funcionarioTemDireitoFerias(f)) return alert('Este funcionário está marcado como sem direito a férias.');
        const situacao = calcularSituacaoFerias(f);
        const periodo = situacao.periodoInicio || situacao.periodoFim ? { inicio: situacao.periodoInicio, fim: situacao.periodoFim } : sugerirPeriodoAquisitivoFuncionario(funcId);
        document.getElementById('calcFeriasFuncId').value = funcId;
        document.getElementById('calcFeriasNome').innerHTML = `${escapeHTML(f.nome || 'Funcionário')}<br><small>Período sugerido: ${formatDataBR(periodo.inicio)} a ${formatDataBR(periodo.fim)}</small>`;
        document.getElementById('calcFeriasAqInicio').value = periodo.inicio || '';
        document.getElementById('calcFeriasAqFim').value = periodo.fim || '';
        document.getElementById('calcFeriasGozoInicio').value = getHojeSTR();
        document.getElementById('calcFeriasDiasGozados').value = 30;
        document.getElementById('calcFeriasDiasAbono').value = 0;
        document.getElementById('calcFeriasDecimo').value = 'nao';
        fecharModal('modalCalendarioFerias');
        document.getElementById('modalCalculoFerias').style.display = 'flex';
        renderCalculoFerias();
        if(focoPagamento) {
            setTimeout(() => {
                const btn = document.querySelector('#modalCalculoFerias .modal-actions .btn-action');
                if(btn) btn.focus();
            }, 120);
        }
    }

    function aoMudarCalculoFerias() {
        const inicio = document.getElementById('calcFeriasAqInicio').value;
        if(inicio) document.getElementById('calcFeriasAqFim').value = somarDiasISO(inicio, getDiasAquisitivoFerias() - 1);
        renderCalculoFerias();
    }

    function getBaseRemuneracaoFerias(f) {
        const categoria = db.categorias.find(c => c.id === f.categoria);
        const campos = getCamposFuncionarioClasse(categoria || {});
        const beneficios = getBeneficiosVinculo(categoria || {});
        const salario = parseMoeda(f.salario || db.configGerais.salarioMinimo);
        const gratificacao = campos.pedirGratificacao && f.temGratificacao !== false ? parseMoeda(f.gratificacao) : 0;
        const qtdQuinquenios = Math.max(1, Math.min(9, Number(f.qtdQuinquenios || 1)));
        const quinquenio = beneficios.temQuinquenio && f.recebeQuinquenio === true ? salario * 0.05 * qtdQuinquenios : 0;
        return { salario, gratificacao, quinquenio, base: salario + gratificacao + quinquenio };
    }

    function obterAdiantamentosFerias(f, chave) {
        const registros = db.registros
            .filter(r => r.type === 'adiantamento' && r.funcId === f.id && !r.descontado)
            .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
        const total = registros.reduce((acc, r) => acc + getValorDescontoContracheque(r, chave), 0);
        return { quinzenaRegs: [], doMes: [], anteriores: registros, total };
    }

    function calcularDadosFeriasForm() {
        const funcId = document.getElementById('calcFeriasFuncId').value;
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return null;
        const aqInicio = document.getElementById('calcFeriasAqInicio').value;
        const aqFim = document.getElementById('calcFeriasAqFim').value;
        const gozoInicio = document.getElementById('calcFeriasGozoInicio').value;
        const diasGozados = Math.max(0, Math.min(30, Number(document.getElementById('calcFeriasDiasGozados').value || 0)));
        const diasAbono = Math.max(0, Math.min(10, Number(document.getElementById('calcFeriasDiasAbono').value || 0)));
        const diasDireito = 30;
        const diasRestantes = Math.max(0, diasDireito - diasGozados - diasAbono);
        const gozoFim = gozoInicio && diasGozados > 0 ? somarDiasISO(gozoInicio, diasGozados - 1) : '';
        const retorno = gozoFim ? somarDiasISO(gozoFim, 1) : '';
        const limite = aqFim ? subtrairDiasISO(somarMesesISO(aqFim, 12), Math.max(0, diasGozados - 1)) : '';
        const chave = chavePagamentoFerias(funcId, aqInicio, aqFim);
        const base = getBaseRemuneracaoFerias(f);
        const valorDia = base.base / 30;
        const ferias = valorDia * diasGozados;
        const tercoFerias = ferias / 3;
        const abono = valorDia * diasAbono;
        const tercoAbono = abono / 3;
        const decimoTerceiro = document.getElementById('calcFeriasDecimo').value === 'sim' ? base.base / 2 : 0;
        const adiantamentos = obterAdiantamentosFerias(f, chave);
        const bruto = ferias + tercoFerias + abono + tercoAbono + decimoTerceiro;
        const liquido = bruto - adiantamentos.total;
        return { f, funcId, aqInicio, aqFim, gozoInicio, gozoFim, retorno, diasDireito, diasGozados, diasAbono, diasRestantes, limite, chave, base, valorDia, ferias, tercoFerias, abono, tercoAbono, decimoTerceiro, adiantamentos, bruto, liquido };
    }

    function linhaCalculoFerias(label, valor) {
        return `<div class="ferias-calc-linha"><span>${label}</span><strong>${valor}</strong></div>`;
    }

    function renderCalculoFerias() {
        const box = document.getElementById('resultadoCalculoFerias');
        if(!box) return;
        const d = calcularDadosFeriasForm();
        if(!d) {
            box.innerHTML = '<div class="ferias-calc-box">Funcionário não encontrado.</div>';
            return;
        }
        const pagamento = obterPagamentoFerias(d.funcId, d.aqInicio, d.aqFim);
        const status = pagamento ? `<div class="ferias-pagamento-status">Pagamento informado em ${formatDataBR(pagamento.data)}: <b>R$ ${formatMoedaContracheque(pagamento.valorPago)}</b></div>` : '';
        box.innerHTML = `${status}
            <div class="ferias-calc-box">
                <div class="ferias-calc-tabela">
                    ${linhaCalculoFerias('Início aquisitivo', formatDataBR(d.aqInicio))}
                    ${linhaCalculoFerias('Fim aquisitivo', formatDataBR(d.aqFim))}
                    ${linhaCalculoFerias('Início gozo férias', formatDataBR(d.gozoInicio))}
                    ${linhaCalculoFerias('Fim gozo férias', formatDataBR(d.gozoFim))}
                    ${linhaCalculoFerias('Retorno', formatDataBR(d.retorno))}
                    ${linhaCalculoFerias('Limite p/ gozo', formatDataBR(d.limite))}
                    ${linhaCalculoFerias('Dias dir.', d.diasDireito)}
                    ${linhaCalculoFerias('Dias goz.', d.diasGozados)}
                    ${linhaCalculoFerias('Abono', d.diasAbono)}
                    ${linhaCalculoFerias('Dias rest.', d.diasRestantes)}
                </div>
            </div>
            <div class="contra-grid">
                <div class="contra-box contra-box-proventos"><b style="color:#2E7D32;">Cálculo</b>
                    ${linhaContracheque('Salário', d.base.salario)}
                    ${linhaContracheque('Gratificação', d.base.gratificacao)}
                    ${linhaContracheque('Quinquênio', d.base.quinquenio)}
                    ${linhaContracheque('Férias', d.ferias)}
                    ${linhaContracheque('1/3 férias', d.tercoFerias)}
                    ${linhaContracheque('Abono', d.abono)}
                    ${linhaContracheque('1/3 abono', d.tercoAbono)}
                    ${linhaContracheque('13º', d.decimoTerceiro)}
                    ${linhaContracheque('Total bruto', d.bruto, { total: true })}
                </div>
                ${renderBoxAdiantamentosContracheque(d.f, d.chave, d.adiantamentos, true, 'ferias')}
            </div>
            <div class="ferias-calc-box ferias-calc-total">
                ${linhaCalculoFerias('Bruto', 'R$ ' + formatMoedaContracheque(d.bruto))}
                ${linhaCalculoFerias('Adiantamentos escolhidos', 'R$ ' + formatMoedaContracheque(d.adiantamentos.total))}
                ${linhaCalculoFerias('Líquido a pagar', 'R$ ' + formatMoedaContracheque(d.liquido))}
            </div>`;
    }

    function registrarPagamentoFerias() {
        if(!garantirPermissao('lancarFerias', () => registrarPagamentoFerias(), 'informar pagamento de férias')) return;
        const d = calcularDadosFeriasForm();
        if(!d) return alert('Funcionário não encontrado.');
        if(!d.aqInicio || !d.aqFim || d.aqInicio > d.aqFim) return alert('Confira o período aquisitivo.');
        if(!d.gozoInicio || (d.gozoFim && d.gozoInicio > d.gozoFim)) return alert('Confira as datas de gozo das férias.');
        const existente = obterPagamentoFerias(d.funcId, d.aqInicio, d.aqFim);
        const agora = Date.now();
        const registro = existente || { id: `fp_${d.funcId}_${agora}`, type: 'ferias_pagamento', funcId: d.funcId, criadoEm: agora };
        Object.assign(registro, {
            data: getHojeSTR(),
            periodoAquisitivoInicio: d.aqInicio,
            periodoAquisitivoFim: d.aqFim,
            gozoInicio: d.gozoInicio,
            gozoFim: d.gozoFim,
            retorno: d.retorno,
            diasDireito: d.diasDireito,
            diasGozados: d.diasGozados,
            diasAbono: d.diasAbono,
            diasRestantes: d.diasRestantes,
            limiteGozo: d.limite,
            salario: d.base.salario,
            gratificacao: d.base.gratificacao,
            quinquenio: d.base.quinquenio,
            valorBruto: d.bruto,
            valorAdiantamentos: d.adiantamentos.total,
            valorPago: d.liquido,
            chaveDesconto: d.chave,
            editadoEm: agora,
            _syncAtualizadoEm: agora
        });
        if(!existente) db.registros.push(registro);
        registrarAuditoria(existente ? 'Pagamento de férias atualizado' : 'Pagamento de férias informado', `${getNomeUsoFuncionario(d.f)}: R$ ${formatMoeda(d.liquido)}. Aquisitivo ${formatDataBR(d.aqInicio)} a ${formatDataBR(d.aqFim)}.`, 'ferias_pagamento', registro.id);
        salvarBanco();
        fecharModal('modalCalculoFerias');
        renderCalendarioFerias();
        document.getElementById('modalCalendarioFerias').style.display = 'flex';
    }

    function excluirRegistro(id, tela) { if(confirm("Apagar registro?")) { const registro = db.registros.find(r => r.id === id); const func = registro ? db.funcionarios.find(f => f.id === registro.funcId) : null; db.registros = db.registros.filter(r => r.id !== id); registrarAuditoria('Registro excluído', `${tela || (registro && registro.type) || 'registro'}${func ? ` - ${getNomeUsoFuncionario(func)}` : ''}${registro && registro.data ? ` em ${formatDataBR(registro.data)}` : ''}.`, tela || (registro && registro.type) || 'registro', id); salvarBanco(); let funcId = document.getElementById('acoesFuncId').value; if(tela === 'adiantamento') renderizarHistAdiantamento(funcId); else if(tela === 'falta') renderizarHistFaltas(funcId); else if(tela === 'atraso') renderizarHistAtrasos(funcId); else if(tela === 'ferias') renderizarHistFerias(funcId); else if(tela === 'presenca') renderizarPresencasPendentes(funcId); renderizarLista(); } }

    function dataISO(data) {
        return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
    }
    function somarDiasISO(dataStr, dias) {
        const data = new Date(dataStr + "T00:00:00");
        data.setDate(data.getDate() + dias);
        return dataISO(data);
    }
    function registroNoIntervalo(registro, inicio, fim) {
        const dataIni = registro.data || '';
        const dataFim = registro.dataFim || registro.data || '';
        return dataIni <= fim && dataFim >= inicio;
    }
    function abrirModalResumo() {
        if(!garantirPermissao('acessoResumo', () => abrirModalResumo(), 'abrir o resumo')) return;
        const hoje = getHojeSTR();
        document.getElementById('resumoTipo').value = 'mes';
        document.getElementById('resumoMes').value = hoje.substring(0, 7);
        document.getElementById('resumoSemana').value = hoje;
        document.getElementById('resumoDia').value = hoje;
        document.getElementById('resumoInicio').value = hoje.substring(0, 7) + '-01';
        document.getElementById('resumoFim').value = hoje;
        alterarTipoResumo();
        document.getElementById('modalResumo').style.display = 'flex';
    }
    function alterarTipoResumo() {
        const tipo = document.getElementById('resumoTipo').value;
        ['Mes','Semana','Dia','Personalizado'].forEach(nome => {
            document.getElementById(`resumoCampos${nome}`).style.display = 'none';
        });
        const mapa = { mes: 'Mes', semana: 'Semana', dia: 'Dia', personalizado: 'Personalizado' };
        document.getElementById(`resumoCampos${mapa[tipo]}`).style.display = 'block';
        gerarResumo();
    }
    function obterIntervaloResumo() {
        const tipo = document.getElementById('resumoTipo').value;
        if(tipo === 'mes') {
            const mesRef = document.getElementById('resumoMes').value || getHojeSTR().substring(0, 7);
            const [ano, mes] = mesRef.split('-').map(Number);
            const fim = new Date(ano, mes, 0);
            return { inicio: `${mesRef}-01`, fim: dataISO(fim), label: getExtensoMes(mes) + ' de ' + ano };
        }
        if(tipo === 'semana') {
            const base = document.getElementById('resumoSemana').value || getHojeSTR();
            const data = new Date(base + "T00:00:00");
            const offset = (data.getDay() + 6) % 7;
            const segunda = new Date(data); segunda.setDate(data.getDate() - offset);
            const domingo = new Date(segunda); domingo.setDate(segunda.getDate() + 6);
            return { inicio: dataISO(segunda), fim: dataISO(domingo), label: `${formatDataBR(dataISO(segunda))} a ${formatDataBR(dataISO(domingo))}` };
        }
        if(tipo === 'dia') {
            const dia = document.getElementById('resumoDia').value || getHojeSTR();
            return { inicio: dia, fim: dia, label: formatDataBR(dia) };
        }
        const inicio = document.getElementById('resumoInicio').value || getHojeSTR();
        const fim = document.getElementById('resumoFim').value || inicio;
        return inicio <= fim ? { inicio, fim, label: `${formatDataBR(inicio)} a ${formatDataBR(fim)}` } : { inicio: fim, fim: inicio, label: `${formatDataBR(fim)} a ${formatDataBR(inicio)}` };
    }

    function contarDiasUteisRegistroIntervalo(registro, inicio, fim) {
        const dataInicio = registro.data || '';
        const dataFim = registro.dataFim || registro.data || '';
        if(!dataInicio) return 0;
        if(dataFim < inicio || dataInicio > fim) return 0;
        let atual = new Date((dataInicio < inicio ? inicio : dataInicio) + "T00:00:00");
        const fimReal = new Date((dataFim > fim ? fim : dataFim) + "T00:00:00");
        let total = 0;
        for(; atual <= fimReal; atual.setDate(atual.getDate() + 1)) {
            if(db.configGerais.diasFuncionamento.includes(String(atual.getDay()))) total++;
        }
        return total;
    }

    function listarDiasUteisRegistroIntervalo(registro, inicio, fim) {
        const dataInicio = registro.data || '';
        const dataFim = registro.dataFim || registro.data || '';
        if(!dataInicio || dataFim < inicio || dataInicio > fim) return [];
        let atual = new Date((dataInicio < inicio ? inicio : dataInicio) + "T00:00:00");
        const fimReal = new Date((dataFim > fim ? fim : dataFim) + "T00:00:00");
        const dias = [];
        for(; atual <= fimReal; atual.setDate(atual.getDate() + 1)) {
            if(db.configGerais.diasFuncionamento.includes(String(atual.getDay()))) dias.push(dataISO(atual));
        }
        return dias;
    }

    function getTipoAusenciaResumo(registro) {
        if(registro.tipo === 'Falta' && registro.descontarDia === false) return 'Falta justificada';
        if(registro.tipo === 'Atestado') return 'Atestado';
        return registro.tipo || 'Ausência';
    }

    function calcularResumoPeriodo(intervalo) {
        const ativos = db.funcionarios.filter(f => !f.arquivado);
        const faltas = db.registros.filter(r => r.type === 'falta' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const faltaram = new Set(faltas.map(r => r.funcId));
        const atrasos = db.registros.filter(r => r.type === 'atraso' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const minutosAtraso = atrasos.reduce((acc, r) => acc + Number(r.minutos || minutosEntreHorarios(r.horaPrevista, r.horaChegada) || 0), 0);
        const extras = db.registros.filter(r => r.type === 'presenca' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalExtrasLancados = extras.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const pagamentosExtras = db.registros.filter(r => r.type === 'pagamento_semana' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalPagoExtras = pagamentosExtras.reduce((acc, r) => acc + Number(r.valorTotal || 0), 0);
        const adiantamentos = db.registros.filter(r => r.type === 'adiantamento' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalAdiantamentos = adiantamentos.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const quinzena = db.registros.filter(r => r.type === 'desconto_quinzena' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const porVinculo = new Map();
        const nomeVinculo = (f) => {
            const cat = db.categorias.find(c => c.id === f.categoria);
            return cat ? cat.nome : 'Sem vínculo';
        };
        ativos.forEach((f) => {
            const nome = nomeVinculo(f);
            if(!porVinculo.has(nome)) porVinculo.set(nome, { nome, funcionarios: 0, pago: 0 });
            porVinculo.get(nome).funcionarios++;
        });
        const somarPagamento = (funcId, valor) => {
            const f = db.funcionarios.find(x => x.id === funcId);
            if(!f) return;
            const nome = nomeVinculo(f);
            if(!porVinculo.has(nome)) porVinculo.set(nome, { nome, funcionarios: 0, pago: 0 });
            porVinculo.get(nome).pago += Number(valor || 0);
        };
        pagamentosExtras.forEach(r => somarPagamento(r.funcId, r.valorTotal));
        adiantamentos.forEach(r => somarPagamento(r.funcId, r.valor));
        quinzena.forEach(r => somarPagamento(r.funcId, r.valor));
        return { ativos, faltas, faltaram, atrasos, minutosAtraso, extras, totalExtrasLancados, pagamentosExtras, totalPagoExtras, adiantamentos, totalAdiantamentos, quinzena, porVinculo: [...porVinculo.values()].sort((a, b) => a.nome.localeCompare(b.nome)) };
    }

    function montarResumoGeralWhatsapp(intervalo) {
        const r = calcularResumoPeriodo(intervalo);
        const linhas = [
            `Resumo Alô RH`,
            `Período: ${intervalo.label}`,
            '',
            `Funcionários ativos: ${r.ativos.length}`,
            `Funcionários com ausência: ${r.faltaram.size} (${r.faltas.length} registros)`,
            `Atrasos: ${r.atrasos.length}${r.minutosAtraso ? ` (${r.minutosAtraso} min)` : ''}`,
            `Extras lançados: R$ ${formatMoeda(r.totalExtrasLancados)} (${r.extras.length})`,
            `Pago para extras: R$ ${formatMoeda(r.totalPagoExtras)} (${r.pagamentosExtras.length})`,
            `Adiantamentos: R$ ${formatMoeda(r.totalAdiantamentos)} (${r.adiantamentos.length})`,
            '',
            `Por vínculo:`
        ];
        r.porVinculo.forEach(v => linhas.push(`- ${v.nome}: ${v.funcionarios} funcionário(s) | R$ ${formatMoeda(v.pago)}`));
        return linhas.join('\n');
    }

    function montarResumoContadorWhatsapp(intervalo) {
        const faltas = db.registros
            .filter(r => r.type === 'falta' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim))
            .sort((a, b) => String(a.funcId || '').localeCompare(String(b.funcId || '')) || String(a.data || '').localeCompare(String(b.data || '')));
        const linhas = [`Resumo para contador - Ausências`, `Período: ${intervalo.label}`, ''];
        if(faltas.length === 0) {
            linhas.push('Sem ausências registradas no período.');
            return linhas.join('\n');
        }
        let atualFunc = '';
        faltas.forEach((r) => {
            const f = db.funcionarios.find(x => x.id === r.funcId);
            const nome = f ? f.nome : 'Funcionário não encontrado';
            if(nome !== atualFunc) {
                if(atualFunc) linhas.push('');
                linhas.push(nome);
                atualFunc = nome;
            }
            const dias = listarDiasUteisRegistroIntervalo(r, intervalo.inicio, intervalo.fim);
            const dsr = registroDescontaDSR(r) ? new Set(dias.map(d => chaveSemanaAno(new Date(d + "T00:00:00")))).size : 0;
            const periodo = r.dataFim ? `${formatDataBR(r.data)} a ${formatDataBR(r.dataFim)}` : formatDataBR(r.data);
            linhas.push(`- ${periodo}: ${getTipoAusenciaResumo(r)} | ${dias.length} dia(s) | DSR ${dsr} | desc. dia: ${r.descontarDia ? 'sim' : 'não'}`);
        });
        return linhas.join('\n');
    }

    function enviarResumoWhatsapp(tipo) {
        const intervalo = obterIntervaloResumo();
        const texto = tipo === 'contador' ? montarResumoContadorWhatsapp(intervalo) : montarResumoGeralWhatsapp(intervalo);
        abrirWhatsappTexto(texto);
    }

    function gerarResumo() {
        const box = document.getElementById('resultadoResumo'); if(!box) return;
        const intervalo = obterIntervaloResumo();
        const resumo = calcularResumoPeriodo(intervalo);
        const linhasVinculos = resumo.porVinculo.map(v => `<div class="resumo-linha"><span>${escapeHTML(v.nome)}<br><small>${v.funcionarios} funcionário(s)</small></span><strong>R$ ${formatMoeda(v.pago)}</strong></div>`).join('');
        const textoGeral = montarResumoGeralWhatsapp(intervalo);
        const textoContador = montarResumoContadorWhatsapp(intervalo);
        box.innerHTML = `<div class="resumo-periodo-label">${escapeHTML(intervalo.label)}</div><div class="resumo-grid">
            <div class="resumo-card"><strong>${resumo.ativos.length}</strong><span>funcionários ativos</span></div>
            <div class="resumo-card"><strong>${resumo.faltaram.size}</strong><span>funcionários com ausência (${resumo.faltas.length} registros)</span></div>
            <div class="resumo-card"><strong>${resumo.atrasos.length}</strong><span>atrasos registrados${resumo.minutosAtraso ? ` (${resumo.minutosAtraso} min)` : ''}</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalExtrasLancados)}</strong><span>${resumo.extras.length} extras lançados no período</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalPagoExtras)}</strong><span>pago para extras (${resumo.pagamentosExtras.length} pagamentos)</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalAdiantamentos)}</strong><span>adiantamentos (${resumo.adiantamentos.length} lançamentos)</span></div>
        </div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Por vínculo</div>${linhasVinculos || '<div style="color:#999;">Nenhum vínculo cadastrado.</div>'}</div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Resumo geral para WhatsApp</div><div class="resumo-texto-preview">${escapeHTML(textoGeral)}</div><div class="resumo-acoes"><button class="btn-action" onclick="enviarResumoWhatsapp('geral')" style="background:#2E7D32;">Enviar por WhatsApp</button></div></div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Resumo para contador</div><div class="resumo-texto-preview">${escapeHTML(textoContador)}</div><div class="resumo-acoes"><button class="btn-action" onclick="enviarResumoWhatsapp('contador')" style="background:#0277BD;">Enviar ao contador</button></div></div>`;
    }

    function getTipoAusenciaResumo(registro) {
        if(registro.tipo === 'Falta' && registro.descontarDia === false) return 'Falta justificada';
        if(registro.tipo === 'Falta') return 'Falta injustificada';
        if(registro.tipo === 'Atestado') return 'Atestado médico';
        return registro.tipo || 'Ausência';
    }

    function getTipoAusenciaContador(registro) {
        if(registro.tipo === 'Falta' && registro.descontarDia === false) return 'Falta Justificada.';
        if(registro.tipo === 'Falta') return 'Falta Injustificada.';
        if(registro.tipo === 'Atestado') return 'Atestado Médico';
        return registro.tipo || 'Ocorrência';
    }

    function criarResumoVinculo(nome) {
        return { nome, funcionarios: 0, pagoMes: 0, extrasPagos: 0, quinzena: 0, ferias: 0, adiantamentos: 0, adiantamentosBaixados: 0, saldoAdiantamentos: 0 };
    }

    function calcularResumoPeriodo(intervalo) {
        const ativos = db.funcionarios.filter(f => !f.arquivado);
        const faltas = db.registros.filter(r => r.type === 'falta' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const faltaram = new Set(faltas.map(r => r.funcId));
        const atrasos = db.registros.filter(r => r.type === 'atraso' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const minutosAtraso = atrasos.reduce((acc, r) => acc + Number(r.minutos || minutosEntreHorarios(r.horaPrevista, r.horaChegada) || 0), 0);
        const extras = db.registros.filter(r => r.type === 'presenca' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalExtrasLancados = extras.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const pagamentosExtras = db.registros.filter(r => r.type === 'pagamento_semana' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalPagoExtras = pagamentosExtras.reduce((acc, r) => acc + Number(r.valorTotal || 0), 0);
        const adiantamentos = db.registros.filter(r => r.type === 'adiantamento' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalAdiantamentos = adiantamentos.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const totalAdiantamentosBaixados = adiantamentos.filter(r => r.descontado).reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const quinzena = db.registros.filter(r => r.type === 'desconto_quinzena' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalQuinzena = quinzena.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        const feriasPagas = db.registros.filter(r => r.type === 'ferias_pagamento' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim));
        const totalFeriasPagas = feriasPagas.reduce((acc, r) => acc + Number(r.valorPago || 0), 0);
        const totalPagoMes = totalPagoExtras + totalAdiantamentos + totalQuinzena + totalFeriasPagas;
        const saldoAdiantamentos = Math.max(0, totalAdiantamentos - totalAdiantamentosBaixados);
        const porVinculo = new Map();
        const nomeVinculo = (f) => {
            const cat = db.categorias.find(c => c.id === f.categoria);
            return cat ? cat.nome : 'Sem vínculo';
        };
        const garantirVinculo = (nome) => {
            if(!porVinculo.has(nome)) porVinculo.set(nome, criarResumoVinculo(nome));
            return porVinculo.get(nome);
        };
        const somarPagamento = (funcId, campo, valor) => {
            const f = db.funcionarios.find(x => x.id === funcId);
            if(!f) return;
            const item = garantirVinculo(nomeVinculo(f));
            item[campo] += Number(valor || 0);
        };
        ativos.forEach((f) => garantirVinculo(nomeVinculo(f)).funcionarios++);
        pagamentosExtras.forEach(r => {
            const valor = Number(r.valorTotal || 0);
            somarPagamento(r.funcId, 'extrasPagos', valor);
            somarPagamento(r.funcId, 'pagoMes', valor);
        });
        quinzena.forEach(r => {
            const valor = Number(r.valor || 0);
            somarPagamento(r.funcId, 'quinzena', valor);
            somarPagamento(r.funcId, 'pagoMes', valor);
        });
        feriasPagas.forEach(r => {
            const valor = Number(r.valorPago || 0);
            somarPagamento(r.funcId, 'ferias', valor);
            somarPagamento(r.funcId, 'pagoMes', valor);
        });
        adiantamentos.forEach(r => {
            const valor = Number(r.valor || 0);
            somarPagamento(r.funcId, 'adiantamentos', valor);
            somarPagamento(r.funcId, 'pagoMes', valor);
            if(r.descontado) somarPagamento(r.funcId, 'adiantamentosBaixados', valor);
        });
        porVinculo.forEach(v => { v.saldoAdiantamentos = Math.max(0, v.adiantamentos - v.adiantamentosBaixados); });
        return { ativos, faltas, faltaram, atrasos, minutosAtraso, extras, totalExtrasLancados, pagamentosExtras, totalPagoExtras, adiantamentos, totalAdiantamentos, totalAdiantamentosBaixados, saldoAdiantamentos, quinzena, totalQuinzena, feriasPagas, totalFeriasPagas, totalPagoMes, porVinculo: [...porVinculo.values()].sort((a, b) => a.nome.localeCompare(b.nome)) };
    }

    function montarResumoGeralWhatsapp(intervalo) {
        const r = calcularResumoPeriodo(intervalo);
        const linhas = [
            `*Resumo Alô RH*`,
            `*Período:* ${intervalo.label}`,
            '',
            `*Funcionários ativos por vínculo*`
        ];
        if(r.porVinculo.length === 0) linhas.push('- Nenhum vínculo cadastrado.');
        r.porVinculo.forEach(v => linhas.push(`- ${v.nome}: ${v.funcionarios} funcionário(s)`));
        linhas.push(
            '',
            `*Financeiro do período*`,
            `Pago/lançado: R$ ${formatMoeda(r.totalPagoMes)}`,
            `- Quinzena: R$ ${formatMoeda(r.totalQuinzena)}`,
            `- Férias pagas: R$ ${formatMoeda(r.totalFeriasPagas)}`,
            `- Pagamento de extras: R$ ${formatMoeda(r.totalPagoExtras)}`,
            `- Adiantamentos: R$ ${formatMoeda(r.totalAdiantamentos)}`,
            `Adiantamentos baixados: R$ ${formatMoeda(r.totalAdiantamentosBaixados)}`,
            `Saldo de adiantamentos: R$ ${formatMoeda(r.saldoAdiantamentos)}`,
            '',
            `*Ocorrências*`,
            `Funcionários com ausência: ${r.faltaram.size} (${r.faltas.length} registro(s))`,
            `Atrasos: ${r.atrasos.length}${r.minutosAtraso ? ` (${r.minutosAtraso} min)` : ''}`,
            '',
            `*Financeiro por vínculo*`
        );
        r.porVinculo.forEach(v => {
            linhas.push(`- ${v.nome}: pago R$ ${formatMoeda(v.pagoMes)} | quinzena R$ ${formatMoeda(v.quinzena)} | férias R$ ${formatMoeda(v.ferias)} | adiant. R$ ${formatMoeda(v.adiantamentos)} | baixado R$ ${formatMoeda(v.adiantamentosBaixados)} | saldo R$ ${formatMoeda(v.saldoAdiantamentos)}`);
        });
        return linhas.join('\n');
    }

    function montarResumoContadorWhatsapp(intervalo) {
        const faltas = db.registros
            .filter(r => r.type === 'falta' && registroNoIntervalo(r, intervalo.inicio, intervalo.fim))
            .map(r => ({ registro: r, funcionario: db.funcionarios.find(f => f.id === r.funcId) }))
            .sort((a, b) => String((a.funcionario && a.funcionario.nome) || '').localeCompare(String((b.funcionario && b.funcionario.nome) || '')) || String(a.registro.data || '').localeCompare(String(b.registro.data || '')));
        const linhas = [`*Ocorrências - Contracheque*`, `*Período:* ${intervalo.label}`, ''];
        if(faltas.length === 0) {
            linhas.push('Sem ocorrências registradas no período.');
            return linhas.join('\n');
        }
        let atualFunc = '';
        faltas.forEach((item) => {
            const r = item.registro;
            const nome = item.funcionario ? item.funcionario.nome : 'Funcionário não encontrado';
            if(nome !== atualFunc) {
                if(atualFunc) linhas.push('');
                linhas.push(nome);
                atualFunc = nome;
            }
            const dias = listarDiasUteisRegistroIntervalo(r, intervalo.inicio, intervalo.fim);
            const qtdDias = dias.length || contarDiasUteisRegistroIntervalo(r, intervalo.inicio, intervalo.fim);
            const dsr = registroDescontaDSR(r) ? new Set(dias.map(d => chaveSemanaAno(new Date(d + "T00:00:00")))).size : 0;
            const periodo = (r.dataFim && r.dataFim !== r.data) ? `${formatDataBR(r.data)} a ${formatDataBR(r.dataFim)}` : formatDataBR(r.data);
            const tipo = getTipoAusenciaContador(r);
            const complemento = r.descontarDia ? ` Descontar: ${qtdDias} dia(s)${dsr ? ` + ${dsr} DSR` : ''}` : `${tipo.endsWith('.') ? ' ' : '. '}${qtdDias} dia(s)`;
            linhas.push(`- ${periodo}: *${tipo}*${complemento}`);
        });
        return linhas.join('\n');
    }

    function gerarResumo() {
        const box = document.getElementById('resultadoResumo'); if(!box) return;
        const intervalo = obterIntervaloResumo();
        const resumo = calcularResumoPeriodo(intervalo);
        const textoGeral = montarResumoGeralWhatsapp(intervalo);
        const textoContador = montarResumoContadorWhatsapp(intervalo);
        const linhasAtivos = resumo.porVinculo.map(v => `<div class="resumo-linha"><span>${escapeHTML(v.nome)}</span><strong>${v.funcionarios}</strong></div>`).join('');
        const linhasVinculos = resumo.porVinculo.map(v => `<div class="resumo-vinculo">
            <div class="resumo-vinculo-head"><span>${escapeHTML(v.nome)}</span><small>${v.funcionarios} funcionário(s)</small></div>
            <div class="resumo-vinculo-grid">
                <div><span>Pago mês</span><strong>R$ ${formatMoeda(v.pagoMes)}</strong></div>
                <div><span>Quinzena</span><strong>R$ ${formatMoeda(v.quinzena)}</strong></div>
                <div><span>Férias</span><strong>R$ ${formatMoeda(v.ferias)}</strong></div>
                <div><span>Extras</span><strong>R$ ${formatMoeda(v.extrasPagos)}</strong></div>
                <div><span>Adiant.</span><strong>R$ ${formatMoeda(v.adiantamentos)}</strong></div>
                <div><span>Baixado</span><strong>R$ ${formatMoeda(v.adiantamentosBaixados)}</strong></div>
                <div><span>Saldo</span><strong>R$ ${formatMoeda(v.saldoAdiantamentos)}</strong></div>
            </div>
        </div>`).join('');
        box.innerHTML = `<div class="resumo-periodo-label">${escapeHTML(intervalo.label)}</div><div class="resumo-grid">
            <div class="resumo-card"><strong>${resumo.ativos.length}</strong><span>funcionários ativos</span></div>
            <div class="resumo-card"><strong>${resumo.faltaram.size}</strong><span>funcionários com ausência (${resumo.faltas.length} registros)</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalPagoMes)}</strong><span>pago/lançado no período</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.saldoAdiantamentos)}</strong><span>saldo de adiantamentos</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalQuinzena)}</strong><span>quinzena gerada</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(resumo.totalFeriasPagas)}</strong><span>férias pagas (${resumo.feriasPagas.length})</span></div>
            <div class="resumo-card"><strong>${resumo.atrasos.length}</strong><span>atrasos${resumo.minutosAtraso ? ` (${resumo.minutosAtraso} min)` : ''}</span></div>
        </div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Funcionários ativos por vínculo</div>${linhasAtivos || '<div style="color:#999;">Nenhum vínculo cadastrado.</div>'}</div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Financeiro por vínculo</div>${linhasVinculos || '<div style="color:#999;">Nenhum lançamento no período.</div>'}</div>
        <div class="resumo-bloco resumo-total-final"><div class="resumo-bloco-titulo">Totais financeiros</div>
            <div class="resumo-linha"><span>Pago/lançado</span><strong>R$ ${formatMoeda(resumo.totalPagoMes)}</strong></div>
            <div class="resumo-linha"><span>Adiantamentos baixados</span><strong>R$ ${formatMoeda(resumo.totalAdiantamentosBaixados)}</strong></div>
            <div class="resumo-linha"><span>Saldo de adiantamentos</span><strong>R$ ${formatMoeda(resumo.saldoAdiantamentos)}</strong></div>
        </div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Resumo geral para WhatsApp</div><div class="resumo-texto-preview">${escapeHTML(textoGeral)}</div><div class="resumo-acoes"><button class="btn-action" onclick="enviarResumoWhatsapp('geral')" style="background:#2E7D32;">Enviar por WhatsApp</button></div></div>
        <div class="resumo-bloco"><div class="resumo-bloco-titulo">Resumo para contador</div><div class="resumo-texto-preview">${escapeHTML(textoContador)}</div><div class="resumo-acoes"><button class="btn-action" onclick="enviarResumoWhatsapp('contador')" style="background:#0277BD;">Enviar ao contador</button></div></div>`;
    }

    function somarMesReferencia(mesRef, delta) {
        const [ano, mes] = String(mesRef || getHojeSTR().substring(0, 7)).split('-').map(Number);
        const data = new Date(ano, (mes || 1) - 1 + delta, 1);
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    }

    function labelMesRef(mesRef) {
        const mes = Number(String(mesRef || '').split('-')[1] || 0);
        return getExtensoMes(mes).toLowerCase();
    }

    function labelRubricaMes(nome, mesRef) {
        const mes = labelMesRef(mesRef);
        return mes ? `${nome} (${mes})` : nome;
    }

    function funcionarioRecebeContracheque(f) {
        if(!f || f.arquivado) return false;
        const categoria = db.categorias.find(c => c.id === f.categoria);
        if(getTipoPagamentoVinculo(categoria || {}) !== 'contracheque') return false;
        if(categoria && categoria.recebeContracheque === false) return false;
        return f.recebeContracheque !== false;
    }

    function funcionarioRecebeReciboMensal(f) {
        if(!f || f.arquivado) return false;
        return getTipoPagamentoFuncionario(f) === 'mensal_sem_carteira';
    }

    function calcularDadosContrachequeFuncionario(f, mesRef, vtMesRef) {
        const [ano, mes] = mesRef.split('-').map(Number);
        const [anoVT, mesVT] = vtMesRef.split('-').map(Number);
        const categoria = db.categorias.find(c => c.id === f.categoria);
        const campos = getCamposFuncionarioClasse(categoria || {});
        const beneficios = getBeneficiosVinculo(categoria || {});
        const salario = parseMoeda(f.salario || db.configGerais.salarioMinimo);
        const gratificacao = campos.pedirGratificacao && f.temGratificacao !== false ? parseMoeda(f.gratificacao) : 0;
        const qtdQuinquenios = Math.max(1, Math.min(9, Number(f.qtdQuinquenios || 1)));
        const quinquenio = beneficios.temQuinquenio && f.recebeQuinquenio === true ? salario * 0.05 * qtdQuinquenios : 0;
        const salarioFamilia = campos.pedirSalFamilia && f.temSalFamilia !== false ? parseMoeda(f.salFamilia) : 0;
        const unidentis = campos.pedirUnidentis && f.temUnidentis !== false ? parseMoeda(f.unidentis) : 0;
        const vales = calcularValesCombustivelPagamento(f, anoVT, mesVT);
        const valesPassagem = calcularValesCombustivelMes(f, ano, mes);
        const faltas = calcularDescontosFaltasContracheque(f, ano, mes, salario);
        const adiantamentosContra = obterAdiantamentosContracheque(f, mesRef);
        const podeDescontarINSS = campos.pedirINSS && f.descontaINSS !== false;
        const baseInss = Math.max(0, salario + gratificacao + quinquenio - faltas.valorFaltas - faltas.valorDSR);
        const inssCalc = podeDescontarINSS ? calcularINSSPrevia(baseInss) : { valor: 0, aliquotaEfetiva: 0 };
        const overrideInss = overridesContracheque[f.id];
        const inss = podeDescontarINSS ? (overrideInss ? overrideInss.valor : inssCalc.valor) : 0;
        const inssAliquota = podeDescontarINSS ? (overrideInss ? overrideInss.aliquota : inssCalc.aliquotaEfetiva) : 0;
        const descontoPassagem = (campos.pedirDescontoPassagem && f.descontaPassagem !== false) ? Math.min(salario * 0.06, valesPassagem.total) : 0;
        const proventos = salario + gratificacao + quinquenio + salarioFamilia;
        const descontos = unidentis + descontoPassagem + faltas.valorFaltas + faltas.valorDSR + inss;
        const subtotalSalario = proventos - descontos;
        const liquido = subtotalSalario + vales.total;
        const liquidoAPagar = liquido - adiantamentosContra.total;
        return { ano, mes, anoVT, mesVT, mesRef, vtMesRef, campos, beneficios, salario, gratificacao, qtdQuinquenios, quinquenio, salarioFamilia, unidentis, vales, valesPassagem, faltas, adiantamentosContra, inss, inssAliquota, descontoPassagem, proventos, descontos, subtotalSalario, liquido, liquidoAPagar };
    }

    function montarLinhaAdiantamentosMensagem(d) {
        const partes = [];
        d.adiantamentosContra.quinzenaRegs.forEach(r => {
            const valor = getValorDescontoContracheque(r, d.mesRef, true);
            if(valor > 0) partes.push(`R$ ${formatMoedaContracheque(valor)} (Quinzena)`);
        });
        [...d.adiantamentosContra.doMes, ...d.adiantamentosContra.anteriores].forEach(r => {
            const valor = getValorDescontoContracheque(r, d.mesRef);
            if(valor <= 0) return;
            const data = r.data ? formatDataBR(r.data) : '';
            const motivo = r.motivo || (String(r.data || '').substring(0, 7) < d.mesRef ? 'Pendente anterior' : 'Adiantamento');
            partes.push(`R$ ${formatMoedaContracheque(valor)}${data || motivo ? ` (${[data, motivo].filter(Boolean).join(' - ')})` : ''}`);
        });
        if(partes.length === 0) return '*R$ 0,00*';
        return `*${partes.join(' + ')} = R$ ${formatMoedaContracheque(d.adiantamentosContra.total)}*`;
    }

    function montarMensagemContrachequeFuncionario(f, mesRef, vtMesRef) {
        const d = calcularDadosContrachequeFuncionario(f, mesRef, vtMesRef);
        const linhas = [
            `> *Contracheque - ${getExtensoMes(d.mes)} de ${d.ano}*`,
            `*${f.nome || 'Funcionário'}*`,
            '',
            '> *Proventos:*',
            `- Salário: R$ ${formatMoedaContracheque(d.salario)}`
        ];
        if(d.gratificacao) linhas.push(`- Gratificação: R$ ${formatMoedaContracheque(d.gratificacao)}`);
        if(d.quinquenio) linhas.push(`- Quinquênio (${d.qtdQuinquenios}): R$ ${formatMoedaContracheque(d.quinquenio)}`);
        if(d.salarioFamilia) linhas.push(`- Salário Família: R$ ${formatMoedaContracheque(d.salarioFamilia)}`);
        linhas.push(`*- Total proventos:* R$ ${formatMoedaContracheque(d.proventos)}`);
        linhas.push('', '> *Descontos:*');
        if(d.descontoPassagem) linhas.push(`- ${labelRubricaMes('Passagem', d.mesRef)}: R$ ${formatMoedaContracheque(d.descontoPassagem)}`);
        if(d.faltas.valorFaltas) linhas.push(`- Falta (${d.faltas.diasFalta}): R$ ${formatMoedaContracheque(d.faltas.valorFaltas)}`);
        if(d.faltas.valorDSR) linhas.push(`- DSR (${d.faltas.dsr}): R$ ${formatMoedaContracheque(d.faltas.valorDSR)}`);
        if(d.inss) linhas.push(`- INSS (${formatPercentual(d.inssAliquota)}%): R$ ${formatMoedaContracheque(d.inss)}`);
        if(d.unidentis) linhas.push(`- Unidentis: R$ ${formatMoedaContracheque(d.unidentis)}`);
        linhas.push(`*- Total descontos: R$ ${formatMoedaContracheque(d.descontos)}*`);
        linhas.push('', `> *Vale-Transporte (${getExtensoMes(d.mesVT).toLowerCase()}):*`);
        linhas.push(`*- ${d.vales.passagens} passagens: R$ ${formatMoedaContracheque(d.vales.total)}*`);
        linhas.push('', '> *Adiantamentos:*');
        linhas.push(montarLinhaAdiantamentosMensagem(d));
        linhas.push('', '> *Valor a receber:*');
        linhas.push(`R$ ${formatMoedaContracheque(d.liquidoAPagar)}`);
        return linhas.join('\n');
    }

    function enviarContrachequeWhatsapp(funcId, mesRef, vtMesRef, event = null) {
        if(event) event.stopPropagation();
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        const telefone = normalizarTelefoneWhatsapp(f.telefone);
        if(!telefone) return alert('Cadastre um WhatsApp válido para este funcionário.');
        const texto = montarMensagemContrachequeFuncionario(f, mesRef, vtMesRef);
        window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank');
    }

    function aoAlterarMesContracheque() {
        const mesRef = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        document.getElementById('contraVTMesRef').value = somarMesReferencia(mesRef, 1);
        gerarPreviaContracheque();
    }

    function abrirDocumentosPagamento() {
        const selecionados = obterFuncionariosSelecionados();
        if(selecionados.length === 0) return alert('Selecione funcionários!');
        const comContracheque = selecionados.filter(funcionarioRecebeContracheque);
        const comRecibo = selecionados.filter(funcionarioRecebeReciboMensal);
        if(comContracheque.length && comRecibo.length) {
            return alert('Selecione só funcionários de contracheque ou só mensal sem carteira para gerar o documento.');
        }
        if(comRecibo.length) return abrirConfigReciboMensal();
        return abrirConfigContracheque();
    }

    function abrirConfigContracheque() {
        if(!garantirPermissao('gerarContracheque', () => abrirConfigContracheque(), 'gerar contracheque')) return;
        if(itensSelecionados.size === 0) return alert("Selecione funcionários!");
        overridesContracheque = {};
        resumoContrachequeVisivel = false;
        contrachequesAbertos.clear();
        const mesAtual = getHojeSTR().substring(0, 7);
        document.getElementById('contraMesRef').value = mesAtual;
        document.getElementById('contraVTMesRef').value = somarMesReferencia(mesAtual, 1);
        gerarPreviaContracheque();
        document.getElementById('modalContracheque').style.display = 'flex';
    }

    function getUltimoDiaMesRef(mesRef) {
        const [ano, mes] = String(mesRef || getHojeSTR().substring(0, 7)).split('-').map(Number);
        return dataISO(new Date(ano, mes, 0));
    }

    function mesRefEncerrado(mesRef) {
        return getHojeSTR() > getUltimoDiaMesRef(mesRef);
    }

    function obterReciboMensalPago(funcId, mesRef) {
        return db.registros.find(r => r.type === 'recibo_mensal_pago' && r.funcId === funcId && r.mesRef === mesRef);
    }

    function obterPagamentoDocumento(tipo, funcId, mesRef) {
        return db.registros.find(r => r.type === 'pagamento_documento' && r.documentoTipo === tipo && r.funcId === funcId && r.mesRef === mesRef);
    }

    function calcularDocumentoPagamento(tipo, f, mesRef, vtMesRef = '') {
        const vtRef = vtMesRef || somarMesReferencia(mesRef, 1);
        return tipo === 'recibo' ? calcularDadosReciboMensalFuncionario(f, mesRef, vtRef) : calcularDadosContrachequeFuncionario(f, mesRef, vtRef);
    }

    function informarPagamentoDocumento(tipo, funcId, mesRef = '', event = null) {
        if(event) event.stopPropagation();
        if(!garantirPermissao('gerarContracheque', () => informarPagamentoDocumento(tipo, funcId, mesRef, event), 'informar pagamento')) return;
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        const ref = mesRef || (tipo === 'recibo' ? document.getElementById('reciboMesRef').value : document.getElementById('contraMesRef').value) || getHojeSTR().substring(0, 7);
        const vtRef = tipo === 'recibo' ? (document.getElementById('reciboVTMesRef')?.value || somarMesReferencia(ref, 1)) : (document.getElementById('contraVTMesRef')?.value || somarMesReferencia(ref, 1));
        if(obterPagamentoDocumento(tipo, funcId, ref)) return alert('Pagamento já informado para este mês.');
        const d = calcularDocumentoPagamento(tipo, f, ref, vtRef);
        if(!confirm(`Informar pagamento de ${getNomeUsoFuncionario(f)} no valor de R$ ${formatMoedaContracheque(d.liquidoAPagar)}?`)) return;
        const agora = Date.now();
        const registro = {
            id: `pgdoc_${tipo}_${funcId}_${ref.replace('-', '')}_${agora}`,
            type: 'pagamento_documento',
            documentoTipo: tipo,
            funcId,
            mesRef: ref,
            vtMesRef: vtRef,
            data: getHojeSTR(),
            valor: d.liquidoAPagar,
            valorBruto: d.liquido,
            adiantamentos: d.adiantamentosContra.total,
            adminId: (getAdminAtual() || {}).id || '',
            criadoEm: agora,
            editadoEm: agora,
            _syncAtualizadoEm: agora
        };
        db.registros.push(registro);
        registrarAuditoria('Pagamento informado', `${getNomeUsoFuncionario(f)} - ${tipo === 'recibo' ? 'recibo mensal' : 'contracheque'} ${ref}: R$ ${formatMoedaContracheque(d.liquidoAPagar)}.`, 'pagamento', registro.id);
        salvarBanco();
        if(document.getElementById('modalReciboMensal')?.style.display === 'flex') gerarPreviaReciboMensal();
        if(document.getElementById('modalContracheque')?.style.display === 'flex') gerarPreviaContracheque();
        if(document.getElementById('modalPagamentosPendentes')?.style.display === 'flex') renderPagamentosPendentes();
    }

    function chaveReciboMensal(funcId, mesRef) {
        return `${funcId}|${mesRef}`;
    }

    function toggleResumoReciboMensal() {
        resumoReciboMensalVisivel = !resumoReciboMensalVisivel;
        gerarPreviaReciboMensal();
    }

    function toggleDetalhesReciboMensal(funcId, event) {
        if(event && event.target && event.target.closest('button,input,select,label')) return;
        const mesRef = document.getElementById('reciboMesRef').value || getHojeSTR().substring(0, 7);
        const key = chaveReciboMensal(funcId, mesRef);
        if(recibosMensaisAbertos.has(key)) recibosMensaisAbertos.delete(key);
        else recibosMensaisAbertos.add(key);
        gerarPreviaReciboMensal();
    }

    function calcularDadosReciboMensalFuncionario(f, mesRef, vtMesRef = '') {
        const [ano, mes] = mesRef.split('-').map(Number);
        vtMesRef = vtMesRef || somarMesReferencia(mesRef, 1);
        const [anoVT, mesVT] = vtMesRef.split('-').map(Number);
        const categoria = db.categorias.find(c => c.id === f.categoria);
        const campos = getCamposFuncionarioClasse(categoria || {});
        const salario = parseMoeda(f.salario || db.configGerais.salarioMinimo);
        const gratificacao = campos.pedirGratificacao && f.temGratificacao !== false ? parseMoeda(f.gratificacao) : 0;
        const vales = calcularValesCombustivelMes(f, anoVT, mesVT);
        const valesPassagem = calcularValesCombustivelMes(f, ano, mes);
        const faltas = calcularDescontosFaltasContracheque(f, ano, mes, salario);
        const baseSemGratificacao = Math.max(0, salario - faltas.valorFaltas - faltas.valorDSR);
        const baseRemuneracao = Math.max(0, salario + gratificacao - faltas.valorFaltas - faltas.valorDSR);
        const fgts = baseSemGratificacao * 0.08;
        const multaFgts = fgts * 0.40;
        const ferias = baseRemuneracao / 12;
        const tercoFerias = ferias / 3;
        const decimoTerceiro = baseRemuneracao / 12;
        const inss = (campos.pedirINSSProvento && f.descontaINSS !== false) ? baseSemGratificacao * 0.075 : 0;
        const descontoPassagem = (campos.pedirDescontoPassagem && f.descontaPassagem !== false) ? Math.min(salario * 0.06, valesPassagem.total) : 0;
        const adiantamentosContra = obterAdiantamentosContracheque(f, mesRef);
        const proventos = salario + gratificacao + vales.total + fgts + multaFgts + inss + ferias + tercoFerias + decimoTerceiro;
        const descontos = descontoPassagem + faltas.valorFaltas + faltas.valorDSR;
        const liquido = proventos - descontos;
        const liquidoAPagar = liquido - adiantamentosContra.total;
        return { ano, mes, anoVT, mesVT, mesRef, vtMesRef, campos, salario, gratificacao, vales, valesPassagem, faltas, baseSemGratificacao, baseRemuneracao, fgts, multaFgts, ferias, tercoFerias, decimoTerceiro, inss, descontoPassagem, adiantamentosContra, proventos, descontos, liquido, liquidoAPagar };
    }

    function abrirConfigReciboMensal(mesRefForcado = '') {
        if(!garantirPermissao('gerarContracheque', () => abrirConfigReciboMensal(mesRefForcado), 'gerar recibo mensal')) return;
        if(itensSelecionados.size === 0) return alert('Selecione funcionários!');
        resumoReciboMensalVisivel = false;
        recibosMensaisAbertos.clear();
        const mesAtual = mesRefForcado || getHojeSTR().substring(0, 7);
        document.getElementById('reciboMesRef').value = mesAtual;
        document.getElementById('reciboVTMesRef').value = somarMesReferencia(mesAtual, 1);
        gerarPreviaReciboMensal();
        document.getElementById('modalReciboMensal').style.display = 'flex';
    }

    function aoAlterarMesReciboMensal() {
        const mesRef = document.getElementById('reciboMesRef').value || getHojeSTR().substring(0, 7);
        document.getElementById('reciboVTMesRef').value = somarMesReferencia(mesRef, 1);
        gerarPreviaReciboMensal();
    }

    function gerarPreviaReciboMensal() {
        const box = document.getElementById('areaReciboMensal');
        if(!box) return;
        const mesRef = document.getElementById('reciboMesRef').value || getHojeSTR().substring(0, 7);
        const vtMesRef = document.getElementById('reciboVTMesRef').value || somarMesReferencia(mesRef, 1);
        const funcs = obterFuncionariosSelecionados()
            .filter(funcionarioRecebeReciboMensal)
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        if(funcs.length === 0) {
            box.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum funcionário mensal sem carteira selecionado.</div>';
            return;
        }
        let total = 0;
        let totalAPagar = 0;
        let html = '';
        funcs.forEach((f) => {
            const d = calcularDadosReciboMensalFuncionario(f, mesRef, vtMesRef);
            total += d.liquido;
            totalAPagar += d.liquidoAPagar;
            const pago = obterReciboMensalPago(f.id, mesRef);
            const pagamentoDoc = obterPagamentoDocumento('recibo', f.id, mesRef);
            const key = chaveReciboMensal(f.id, mesRef);
            const aberto = recibosMensaisAbertos.has(key);
            const editavel = !pago;
            const status = pago ? 'Gerado' : (aberto ? 'Aberto' : 'Tocar para abrir');
            const acaoPagamento = pagamentoDoc ? `<span class="contra-status">Pago em ${formatDataBR(pagamentoDoc.data)}</span>` : `<button class="btn-fechar-contra" style="background:#00695C;" onclick="informarPagamentoDocumento('recibo', ${jsArg(f.id)}, ${jsArg(mesRef)}, event)">Informar pagamento</button>`;
            const acaoRecibo = pago ? `<button class="btn-fechar-contra" style="background:#795548;" onclick="abrirReaberturaReciboMensal(${jsArg(f.id)}, event)">Reabrir Recibo</button>` : '<span class="contra-status">Gere o recibo para marcar como gerado</span>';
            const detalheFaltas = d.faltas.diasFalta ? ' • ' + d.faltas.diasFalta + ' falta(s)' : '';
            const linhaFaltaRecibo = linhaContracheque('Falta (' + d.faltas.diasFalta + ')', d.faltas.valorFaltas);
            const linhaDsrRecibo = linhaContracheque('DSR (' + d.faltas.dsr + ')', d.faltas.valorDSR);
            const detalhes = aberto ? `<div class="contra-detalhes">
                <div style="font-size:11px; color:#777; margin-bottom:8px;">Mensal ${escapeHTML(getExtensoMes(d.mes))} de ${d.ano} • VT ${escapeHTML(getExtensoMes(d.mesVT))} de ${d.anoVT} • ${d.vales.passagens} passagens${detalheFaltas}</div>
                <div class="contra-grid">
                    <div class="contra-box contra-box-proventos"><b style="color:#2E7D32;">Proventos</b>
                        ${linhaContracheque('Salário', d.salario)}
                        ${linhaContracheque('Gratificação', d.gratificacao)}
                        ${linhaContracheque(labelRubricaMes('VT', d.vtMesRef), d.vales.total)}
                        ${linhaContracheque('FGTS 8%', d.fgts)}
                        ${linhaContracheque('FGTS 40%', d.multaFgts)}
                        ${linhaContracheque('INSS (7,5%)', d.inss)}
                        ${linhaContracheque('Férias', d.ferias)}
                        ${linhaContracheque('1/3 férias', d.tercoFerias)}
                        ${linhaContracheque('13º', d.decimoTerceiro)}
                        ${linhaContracheque('Total', d.proventos, { total: true })}
                    </div>
                    <div class="contra-box contra-box-descontos"><b style="color:#D32F2F;">Descontos</b>
                        ${linhaContracheque(labelRubricaMes('Passagem', d.mesRef), d.descontoPassagem)}
                        ${linhaFaltaRecibo}
                        ${linhaDsrRecibo}
                        ${linhaContracheque('Total', d.descontos, { total: true })}
                    </div>
                    ${renderBoxAdiantamentosContracheque(f, mesRef, d.adiantamentosContra, editavel, 'recibo')}
                </div>
                <div class="contra-actions"><div class="contra-actions-left"><button class="btn-contra-util pix" onclick="abrirEscolhaPixFuncionarioPorId(${jsArg(f.id)}, event)"><span class="emoji-pix">🔑</span> Pix</button>${acaoPagamento}</div>${acaoRecibo}</div>
            </div>` : '';
            const equacao = aberto ? `<strong class="contra-equacao">R$ ${formatMoedaContracheque(d.liquido)} - R$ ${formatMoedaContracheque(d.adiantamentosContra.total)} = R$ ${formatMoedaContracheque(d.liquidoAPagar)}</strong>` : '';
            html += `<div class="contra-card recibo-mensal ${pago ? 'fechado' : ''}" onclick="toggleDetalhesReciboMensal(${jsArg(f.id)}, event)"><div class="contra-card-header"><div class="contra-card-top"><div class="contra-nome">${escapeHTML(f.nome || 'Sem nome')}</div><span class="contra-status">${status}</span></div>${equacao}</div>${detalhes}</div>`;
        });
        const classeResumo = resumoReciboMensalVisivel ? 'contra-resumo-bar aberto' : 'contra-resumo-bar';
        const classeOlho = resumoReciboMensalVisivel ? 'contra-resumo-toggle' : 'contra-resumo-toggle cortado';
        box.innerHTML = `<div class="${classeResumo}" style="background:#EFEBE9; color:#4E342E;"><div class="contra-resumo-dados"><span>${funcs.length} funcionário(s) - Líquido: R$ ${formatMoedaContracheque(total)} - A pagar: R$ ${formatMoedaContracheque(totalAPagar)}</span></div><button class="${classeOlho}" onclick="toggleResumoReciboMensal()" title="Mostrar ou ocultar resumo"><span>👁️‍🗨️</span></button></div>${html}`;
    }

    function registrarReciboMensalPago(funcId, mesRef, dados) {
        const existente = obterReciboMensalPago(funcId, mesRef);
        const agora = Date.now();
        const registro = existente || { id: `rm_${funcId}_${mesRef.replace('-', '')}_${agora}`, type: 'recibo_mensal_pago', funcId, mesRef, criadoEm: agora };
        Object.assign(registro, { data: getHojeSTR(), vtMesRef: dados.vtMesRef, valor: dados.liquido, valorAPagar: dados.liquidoAPagar, adiantamentos: dados.adiantamentosContra.total, editadoEm: agora, _syncAtualizadoEm: agora });
        if(!existente) db.registros.push(registro);
    }

    function imprimirRecibosMensaisSelecionados() {
        if(!garantirPermissao('gerarContracheque', () => imprimirRecibosMensaisSelecionados(), 'gerar recibo mensal')) return;
        const mesRef = document.getElementById('reciboMesRef').value || getHojeSTR().substring(0, 7);
        const vtMesRef = document.getElementById('reciboVTMesRef').value || somarMesReferencia(mesRef, 1);
        const funcs = obterFuncionariosSelecionados()
            .filter(funcionarioRecebeReciboMensal)
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        if(funcs.length === 0) return alert('Nenhum funcionário mensal sem carteira selecionado.');
        const cidade = db.empresa.cidade || 'Cabedelo';
        const empresa = typeof getEmpresaPrint === 'function' ? getEmpresaPrint() : (db.empresa.razao || db.empresa.fantasia || 'EMPRESA');
        const { ano, mes } = typeof getMesAnoExtensoPrint === 'function' ? getMesAnoExtensoPrint(mesRef) : { ano: mesRef.split('-')[0], mes: getExtensoMes(Number(mesRef.split('-')[1])).toLowerCase() };
        let html = `<html><head><title>Recibo Mensal</title><style>
            @page{size:A4 portrait;margin:12mm;}
            body{font-family:"Times New Roman",serif;color:#000;margin:0;font-size:15px;}
            .recibo-folha{height:273mm;border:4px double #000;box-sizing:border-box;padding:10mm 12mm;display:flex;flex-direction:column;page-break-after:always;}
            .recibo-folha:last-child{page-break-after:auto;}
            .topo{text-align:center;font-weight:bold;line-height:1.2;}
            .empresa{font-size:20px;}
            .cnpj{font-size:16px;margin-top:2px;}
            .titulo{text-align:center;font-size:18px;font-weight:bold;margin:12mm 0 8mm;text-transform:uppercase;}
            .texto{font-size:16px;line-height:1.45;text-align:justify;margin-bottom:7mm;}
            .func{font-size:17px;font-weight:bold;margin-bottom:5mm;}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14mm;}
            .linha{display:flex;justify-content:space-between;border-bottom:1px solid #000;padding:3px 2px;min-height:7mm;box-sizing:border-box;}
            .linha.total{font-weight:bold;border-bottom:2px solid #000;border-top:1px solid #000;margin-top:2mm;}
            .bloco-titulo{font-weight:bold;margin-bottom:2mm;}
            .rodape{margin-top:auto;text-align:right;font-weight:bold;font-size:16px;}
            .assinatura{width:82mm;border-top:1px solid #000;text-align:center;margin:18mm auto 0;padding-top:3px;font-weight:normal;}
        </style></head><body>`;
        funcs.forEach((f) => {
            const d = calcularDadosReciboMensalFuncionario(f, mesRef, vtMesRef);
            registrarReciboMensalPago(f.id, mesRef, d);
            const linhaFaltaPrintRecibo = linhaPrintRecibo('Falta (' + d.faltas.diasFalta + ')', d.faltas.valorFaltas);
            const linhaDsrPrintRecibo = linhaPrintRecibo('DSR (' + d.faltas.dsr + ')', d.faltas.valorDSR);
            const linhaAdiantamentosPrint = d.adiantamentosContra.total ? '<div class="linha total" style="margin-top:8mm;"><span>Adiantamentos descontados</span><strong>R$ ' + formatMoedaContracheque(d.adiantamentosContra.total) + '</strong></div>' : '';
            html += `<section class="recibo-folha"><div class="topo"><div class="empresa">${escapeHTML(empresa)}</div><div class="cnpj">CNPJ ${escapeHTML(db.empresa.cnpj || '')}</div></div>
                <div class="titulo">Recibo de Pagamento Mensal</div>
                <div class="texto">Declaro que recebi da empresa supracitada os valores referentes ao pagamento do mês de <b>${escapeHTML(mes)} de ${escapeHTML(ano)}</b>, incluindo VT de <b>${escapeHTML(getExtensoMes(d.mesVT).toLowerCase())} de ${d.anoVT}</b>, conforme discriminação abaixo.</div>
                <div class="func">${escapeHTML(f.nome || 'Funcionário')}</div>
                <div class="grid">
                    <div><div class="bloco-titulo">Proventos</div>
                        ${linhaPrintRecibo('Salário', d.salario)}
                        ${linhaPrintRecibo('Gratificação', d.gratificacao)}
                        ${linhaPrintRecibo(labelRubricaMes('VT', d.vtMesRef), d.vales.total)}
                        ${linhaPrintRecibo('FGTS 8%', d.fgts)}
                        ${linhaPrintRecibo('FGTS 40%', d.multaFgts)}
                        ${linhaPrintRecibo('INSS (7,5%)', d.inss)}
                        ${linhaPrintRecibo('Férias', d.ferias)}
                        ${linhaPrintRecibo('1/3 férias', d.tercoFerias)}
                        ${linhaPrintRecibo('13º', d.decimoTerceiro)}
                        ${linhaPrintRecibo('Total', d.proventos, true)}
                    </div>
                    <div><div class="bloco-titulo">Descontos</div>
                        ${linhaPrintRecibo(labelRubricaMes('Passagem', d.mesRef), d.descontoPassagem)}
                        ${linhaFaltaPrintRecibo}
                        ${linhaDsrPrintRecibo}
                        ${linhaPrintRecibo('Total', d.descontos, true)}
                    </div>
                </div>
                ${linhaAdiantamentosPrint}
                <div class="linha total" style="margin-top:${d.adiantamentosContra.total ? '2mm' : '8mm'};"><span>Líquido a receber</span><strong>R$ ${formatMoedaContracheque(d.liquidoAPagar)}</strong></div>
                <div class="rodape">${escapeHTML(typeof formatDataExtensoPrint === 'function' ? formatDataExtensoPrint(getHojeSTR(), cidade) : formatDataBR(getHojeSTR()))}</div>
                <div class="assinatura">Assinatura do Funcionário</div>
            </section>`;
        });
        html += '</body></html>';
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        registrarAuditoria('Recibo mensal gerado', `${funcs.length} funcionário(s) - ${mesRef}.`, 'recibo_mensal', mesRef);
        salvarBanco();
        gerarPreviaReciboMensal();
        setTimeout(() => { w.print(); }, 500);
    }

    function linhaPrintRecibo(label, valor, total = false) {
        if(!total && Math.abs(Number(valor) || 0) < 0.0001) return '';
        return `<div class="linha ${total ? 'total' : ''}"><span>${label}</span><strong>R$ ${formatMoedaContracheque(valor)}</strong></div>`;
    }

    function selecionarSomenteFuncionario(funcId) {
        itensSelecionados.clear();
        itensSelecionados.add(funcId);
        renderizarLista();
        atualizarAcoesMassa();
    }

    function abrirDocumentoPendente(tipo, funcId, mesRef) {
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        selecionarSomenteFuncionario(funcId);
        fecharModal('modalPagamentosPendentes');
        if(tipo === 'recibo') return abrirConfigReciboMensal(mesRef);
        if(tipo === 'semanal') {
            document.getElementById('acoesFuncId').value = f.id;
            document.getElementById('tituloAcoesFunc').innerText = getNomeUsoFuncionario(f);
            return abrirModalPresencaSemana();
        }
        abrirConfigContracheque();
        document.getElementById('contraMesRef').value = mesRef;
        document.getElementById('contraVTMesRef').value = somarMesReferencia(mesRef, 1);
        gerarPreviaContracheque();
    }

    function abrirPagamentosPendentes() {
        if(!garantirAlgumaPermissao(['gerarContracheque', 'registrarPresencaSemanal'], () => abrirPagamentosPendentes(), 'ver pagamentos pendentes')) return;
        document.getElementById('pendentesMesRef').value = getHojeSTR().substring(0, 7);
        renderPagamentosPendentes();
        document.getElementById('modalPagamentosPendentes').style.display = 'flex';
    }

    function confirmarPagamentoSemanaFuncionario(funcId, event = null) {
        if(event) event.stopPropagation();
        if(!garantirPermissao('registrarPresencaSemanal', () => confirmarPagamentoSemanaFuncionario(funcId, event), 'confirmar pagamento semanal')) return;
        const f = db.funcionarios.find(x => x.id === funcId);
        if(!f) return alert('Funcionário não encontrado.');
        const pendentes = db.registros.filter(r => r.type === 'presenca' && r.funcId === funcId && r.status === 'pendente');
        if(pendentes.length === 0) return alert('Não há dias trabalhados pendentes para este funcionário.');
        const total = pendentes.reduce((acc, r) => acc + Number(r.valor || 0), 0);
        if(!confirm(`Informar pagamento semanal de ${getNomeUsoFuncionario(f)} no valor de R$ ${formatMoedaContracheque(total)}?`)) return;
        const diasIds = [];
        pendentes.forEach(r => { r.status = 'pago'; r.editadoEm = Date.now(); r._syncAtualizadoEm = r.editadoEm; diasIds.push(r.data); });
        const pagamento = { id: 'reg_'+Date.now(), type: 'pagamento_semana', funcId, data: getHojeSTR(), valorTotal: total, dias: diasIds, adminId: (getAdminAtual() || {}).id || '' };
        db.registros.push(pagamento);
        registrarAuditoria('Pagamento semanal confirmado', `${getNomeUsoFuncionario(f)}: R$ ${formatMoeda(total)} (${diasIds.length} dia(s)).`, 'pagamento_semana', pagamento.id);
        salvarBanco();
        renderPagamentosPendentes();
    }

    function renderPagamentosPendentes() {
        const box = document.getElementById('listaPagamentosPendentes');
        if(!box) return;
        const mesRef = document.getElementById('pendentesMesRef').value || getHojeSTR().substring(0, 7);
        const itens = [];
        const mesEncerrado = mesRefEncerrado(mesRef);
        if(mesEncerrado && temPermissaoAtual('gerarContracheque')) {
            db.funcionarios.filter(funcionarioRecebeContracheque).forEach((f) => {
                if(!obterPagamentoDocumento('contracheque', f.id, mesRef)) {
                    const d = calcularDadosContrachequeFuncionario(f, mesRef, somarMesReferencia(mesRef, 1));
                    const doc = obterFechamentoContracheque(f.id, mesRef) ? 'contracheque fechado' : 'contracheque ainda aberto';
                    itens.push({ tipo: 'contra', func: f, titulo: 'Pagamento de contracheque pendente', detalhe: `${getExtensoMes(Number(mesRef.split('-')[1]))} de ${mesRef.split('-')[0]} • ${doc}`, valor: `R$ ${formatMoedaContracheque(d.liquidoAPagar)}` });
                }
            });
            db.funcionarios.filter(funcionarioRecebeReciboMensal).forEach((f) => {
                if(!obterPagamentoDocumento('recibo', f.id, mesRef)) {
                    const d = calcularDadosReciboMensalFuncionario(f, mesRef);
                    const doc = obterReciboMensalPago(f.id, mesRef) ? 'recibo gerado' : 'recibo ainda não gerado';
                    itens.push({ tipo: 'recibo', func: f, titulo: 'Pagamento de recibo pendente', detalhe: `${getExtensoMes(Number(mesRef.split('-')[1]))} de ${mesRef.split('-')[0]} • ${doc}`, valor: `R$ ${formatMoedaContracheque(d.liquidoAPagar)}` });
                }
            });
        }
        if(temPermissaoAtual('registrarPresencaSemanal')) {
            const porFunc = new Map();
            db.registros.filter(r => r.type === 'presenca' && r.status === 'pendente').forEach((r) => {
                const f = db.funcionarios.find(x => x.id === r.funcId);
                if(!f || f.arquivado) return;
                if(!porFunc.has(f.id)) porFunc.set(f.id, { func: f, dias: 0, valor: 0 });
                const item = porFunc.get(f.id);
                item.dias++;
                item.valor += Number(r.valor || 0);
            });
            porFunc.forEach((item) => {
                itens.push({ tipo: 'semanal', func: item.func, titulo: 'Pagamento semanal pendente', detalhe: `${item.dias} dia(s) lançado(s)`, valor: `R$ ${formatMoedaContracheque(item.valor)}` });
            });
        }
        itens.sort((a, b) => String(getNomeUsoFuncionario(a.func)).localeCompare(String(getNomeUsoFuncionario(b.func))) || a.tipo.localeCompare(b.tipo));
        if(itens.length === 0) {
            box.innerHTML = `<div style="color:#999; text-align:center; padding:16px;">Nenhum pagamento pendente${mesEncerrado ? '.' : '. Os pagamentos mensais aparecem depois do último dia do mês.'}</div>`;
            return;
        }
        box.innerHTML = itens.map((item) => {
            const tipoDoc = item.tipo === 'contra' ? 'contracheque' : item.tipo;
            const acaoInformar = item.tipo === 'semanal'
                ? `confirmarPagamentoSemanaFuncionario(${jsArg(item.func.id)}, event)`
                : `informarPagamentoDocumento(${jsArg(tipoDoc)}, ${jsArg(item.func.id)}, ${jsArg(mesRef)}, event)`;
            return `<div class="pendente-card ${item.tipo}">
            <div class="pendente-head"><strong>${escapeHTML(getNomeUsoFuncionario(item.func))}</strong><span>${escapeHTML(item.valor || '')}</span></div>
            <div style="color:#555;"><b>${escapeHTML(item.titulo)}</b><br><small>${escapeHTML(item.detalhe)}</small></div>
            <div class="pendente-actions-linha"><button class="btn-action" onclick="abrirDocumentoPendente(${jsArg(tipoDoc)}, ${jsArg(item.func.id)}, ${jsArg(mesRef)})">Abrir pagamento</button><button class="btn-pendente-pix" onclick="abrirEscolhaPixFuncionarioPorId(${jsArg(item.func.id)}, event)" title="Copiar Pix"><span class="emoji-pix">🔑</span> Pix</button><button class="btn-pendente-pagar" onclick="${acaoInformar}">Informar pagamento</button><button class="btn-pendente-whats" onclick="abrirWhatsappFuncionarioPorId(${jsArg(item.func.id)}, '', event)" title="WhatsApp">WhatsApp</button></div>
        </div>`;
        }).join('');
    }

    function contarDiasEmpresaNoMes(ano, mes) {
        const diasNoMes = new Date(ano, mes, 0).getDate();
        let total = 0;
        for(let dia = 1; dia <= diasNoMes; dia++) {
            const dt = new Date(ano, mes - 1, dia);
            if(db.configGerais.diasFuncionamento.includes(String(dt.getDay()))) total++;
        }
        return total;
    }

    function contarFolgasGeraisNoVT(ano, mes) {
        const mesRef = `${ano}-${String(mes).padStart(2, '0')}`;
        return (db.configGerais.folgasGerais || []).filter((folga) => {
            if(!folga || folga.mesDesconto !== mesRef || !folga.data) return false;
            const dt = new Date(folga.data + "T00:00:00");
            return db.configGerais.diasFuncionamento.includes(String(dt.getDay()));
        }).length;
    }

    function contarDiasUteisRegistroNoMes(registro, ano, mes) {
        const inicio = registro.data || '';
        const fim = registro.dataFim || registro.data || '';
        if(!inicio) return 0;
        const limiteInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const limiteFim = dataISO(new Date(ano, mes, 0));
        if(fim < limiteInicio || inicio > limiteFim) return 0;
        let atual = new Date((inicio < limiteInicio ? limiteInicio : inicio) + "T00:00:00");
        const fimReal = new Date((fim > limiteFim ? limiteFim : fim) + "T00:00:00");
        let total = 0;
        for(; atual <= fimReal; atual.setDate(atual.getDate() + 1)) {
            if(db.configGerais.diasFuncionamento.includes(String(atual.getDay()))) total++;
        }
        return total;
    }

    function chaveSemanaAno(data) {
        const inicioAno = new Date(data.getFullYear(), 0, 1);
        const diaAno = Math.floor((data - inicioAno) / 86400000) + 1;
        const semana = Math.ceil((diaAno + inicioAno.getDay()) / 7);
        return `${data.getFullYear()}-${semana}`;
    }

    function calcularDescontosFaltasContracheque(f, ano, mes, salario) {
        const limiteInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const limiteFim = dataISO(new Date(ano, mes, 0));
        const salarioDia = salario > 0 ? salario / 30 : 0;
        let diasFalta = 0;
        const semanasDSR = new Set();
        db.registros
            .filter(r => r.type === 'falta' && r.funcId === f.id && registroNoIntervalo(r, limiteInicio, limiteFim))
            .forEach((registro) => {
                const inicio = registro.data < limiteInicio ? limiteInicio : registro.data;
                const fim = (registro.dataFim || registro.data) > limiteFim ? limiteFim : (registro.dataFim || registro.data);
                let atual = new Date(inicio + "T00:00:00");
                const fimReal = new Date(fim + "T00:00:00");
                for(; atual <= fimReal; atual.setDate(atual.getDate() + 1)) {
                    if(!db.configGerais.diasFuncionamento.includes(String(atual.getDay()))) continue;
                    if(registro.descontarDia !== false) diasFalta++;
                    if(registroDescontaDSR(registro)) semanasDSR.add(chaveSemanaAno(atual));
                }
            });
        return {
            diasFalta,
            dsr: semanasDSR.size,
            valorFaltas: diasFalta * salarioDia,
            valorDSR: semanasDSR.size * salarioDia
        };
    }

    function calcularValesCombustivelMes(f, ano, mes) {
        const rotaObj = (db.configGerais.valesTransporte || []).find(v => v.rota === f.vtRota);
        if(!rotaObj) return { passagens: 0, total: 0 };
        const diasBase = contarDiasEmpresaNoMes(ano, mes);
        const folgasGerais = contarFolgasGeraisNoVT(ano, mes);
        const faltas = db.registros
            .filter(r => r.type === 'falta' && r.funcId === f.id && r.descontarPassagem)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, ano, mes), 0);
        const ferias = db.registros
            .filter(r => r.type === 'ferias' && r.funcId === f.id)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, ano, mes), 0);
        const passagens = Math.max(0, (diasBase - faltas - ferias - folgasGerais) * 2);
        return { passagens, total: passagens * parseMoeda(rotaObj.valor) };
    }

    function calcularValesCombustivelPagamento(f, ano, mes) {
        const rotaObj = (db.configGerais.valesTransporte || []).find(v => v.rota === f.vtRota);
        if(!rotaObj) return { passagens: 0, total: 0, passagensBase: 0, passagensDescontadas: 0, faltasDescontadas: 0, feriasDescontadas: 0, folgasGerais: 0, valorUnit: 0 };
        const refAnterior = new Date(ano, mes - 2, 1);
        const anoAnterior = refAnterior.getFullYear();
        const mesAnterior = refAnterior.getMonth() + 1;
        const diasBase = contarDiasEmpresaNoMes(ano, mes);
        const faltasDescontadas = db.registros
            .filter(r => r.type === 'falta' && r.funcId === f.id && r.descontarPassagem)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, anoAnterior, mesAnterior), 0);
        const feriasDescontadas = db.registros
            .filter(r => r.type === 'ferias' && r.funcId === f.id)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, ano, mes), 0);
        const folgasGerais = contarFolgasGeraisNoVT(ano, mes);
        const passagensBase = diasBase * 2;
        const passagensDescontadas = (faltasDescontadas + feriasDescontadas + folgasGerais) * 2;
        const passagens = Math.max(0, passagensBase - passagensDescontadas);
        const valorUnit = parseMoeda(rotaObj.valor);
        return { passagens, total: passagens * valorUnit, passagensBase, passagensDescontadas, faltasDescontadas, feriasDescontadas, folgasGerais, valorUnit, rota: rotaObj.rota };
    }

    function calcularDescontoQuinzenaMes(f, mesRef) {
        return db.registros
            .filter(r => r.type === 'desconto_quinzena' && r.funcId === f.id && r.mesRef === mesRef)
            .reduce((acc, r) => acc + Number(r.valor || 0), 0);
    }

    function chaveContracheque(funcId, mesRef) {
        return `${funcId}|${mesRef}`;
    }

    function obterFechamentoContracheque(funcId, mesRef) {
        return db.registros.find(r => r.type === 'contracheque_fechado' && r.funcId === funcId && r.mesRef === mesRef);
    }

    function validarSenhaAdminSimples(senha) {
        const texto = String(senha || '');
        return db.administradores.some(a => String(a.senha || '') === texto);
    }

    function getAdminPorSenha(senha) {
        const texto = String(senha || '');
        return db.administradores.find(a => String(a.senha || '') === texto) || null;
    }

    function toggleDetalhesContracheque(funcId, event) {
        if(event && event.target && event.target.closest('button,input,select,label')) return;
        const mesRef = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        const key = chaveContracheque(funcId, mesRef);
        if(contrachequesAbertos.has(key)) {
            contrachequesAbertos.delete(key);
            gerarPreviaContracheque();
            return;
        }
        contrachequesAbertos.add(key);
        gerarPreviaContracheque();
    }

    function abrirReaberturaContracheque(funcId, event) {
        if(event) event.stopPropagation();
        if(db.administradores.length === 0) return alert('Cadastre ao menos um administrador para reabrir contracheques fechados.');
        document.getElementById('contraSenhaFuncId').value = funcId;
        document.getElementById('contraSenhaContexto').value = 'contracheque';
        document.getElementById('contraSenhaMesRef').value = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        document.getElementById('contraSenhaTitulo').innerText = 'Reabrir Contracheque';
        document.getElementById('contraSenhaTexto').innerText = 'Digite a senha de um administrador para reabrir e permitir ajustes neste contracheque.';
        document.getElementById('contraSenhaAdmin').value = '';
        document.getElementById('contraSenhaErro').style.display = 'none';
        document.getElementById('modalSenhaAdminContracheque').style.display = 'flex';
        setTimeout(() => document.getElementById('contraSenhaAdmin').focus(), 100);
    }

    function abrirReaberturaReciboMensal(funcId, event) {
        if(event) event.stopPropagation();
        if(db.administradores.length === 0) return alert('Cadastre ao menos um administrador para reabrir recibos.');
        document.getElementById('contraSenhaFuncId').value = funcId;
        document.getElementById('contraSenhaContexto').value = 'recibo';
        document.getElementById('contraSenhaMesRef').value = document.getElementById('reciboMesRef').value || getHojeSTR().substring(0, 7);
        document.getElementById('contraSenhaTitulo').innerText = 'Reabrir Recibo';
        document.getElementById('contraSenhaTexto').innerText = 'Digite a senha de um administrador para desmarcar o recibo gerado e permitir ajustes.';
        document.getElementById('contraSenhaAdmin').value = '';
        document.getElementById('contraSenhaErro').style.display = 'none';
        document.getElementById('modalSenhaAdminContracheque').style.display = 'flex';
        setTimeout(() => document.getElementById('contraSenhaAdmin').focus(), 100);
    }

    function validarSenhaContracheque() {
        const funcId = document.getElementById('contraSenhaFuncId').value;
        const senha = document.getElementById('contraSenhaAdmin').value;
        const admin = getAdminPorSenha(senha);
        if(!admin || !adminTemPermissao(admin, 'gerarContracheque')) {
            document.getElementById('contraSenhaErro').style.display = 'block';
            return;
        }
        adminSessaoId = admin.id;
        sessionStorage.setItem('alorh_admin_sessao', adminSessaoId);
        const contexto = document.getElementById('contraSenhaContexto').value || 'contracheque';
        const mesRef = document.getElementById('contraSenhaMesRef').value || getHojeSTR().substring(0, 7);
        if(contexto === 'recibo') {
            db.registros = db.registros.filter(r => !(r.type === 'recibo_mensal_pago' && r.funcId === funcId && r.mesRef === mesRef) && !(r.type === 'pagamento_documento' && r.documentoTipo === 'recibo' && r.funcId === funcId && r.mesRef === mesRef));
            recibosMensaisAbertos.add(chaveReciboMensal(funcId, mesRef));
            fecharModal('modalSenhaAdminContracheque');
            registrarAuditoria('Recibo reaberto', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === funcId))} - ${mesRef}.`, 'recibo_mensal', funcId);
            salvarBanco();
            gerarPreviaReciboMensal();
            return;
        }
        db.registros = db.registros.filter(r => !(r.type === 'contracheque_fechado' && r.funcId === funcId && r.mesRef === mesRef));
        contrachequesAbertos.add(chaveContracheque(funcId, mesRef));
        fecharModal('modalSenhaAdminContracheque');
        registrarAuditoria('Contracheque reaberto', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === funcId))} - ${mesRef}.`, 'contracheque', funcId);
        salvarBanco();
        gerarPreviaContracheque();
    }

    function fecharContrachequeFuncionario(funcId, event) {
        if(event) event.stopPropagation();
        if(!garantirPermissao('gerarContracheque', () => fecharContrachequeFuncionario(funcId, event), 'fechar contracheque')) return;
        const mesRef = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        if(!confirm('Fechar este contracheque? Para visualizar depois, será exigida senha de administrador.')) return;
        const existente = obterFechamentoContracheque(funcId, mesRef);
        const agora = Date.now();
        const registro = existente || { id: `cf_${funcId}_${mesRef.replace('-', '')}_${agora}`, type: 'contracheque_fechado', funcId, mesRef };
        registro.data = getHojeSTR();
        registro.fechadoEm = agora;
        registro.editadoEm = agora;
        registro._syncAtualizadoEm = agora;
        if(!existente) db.registros.push(registro);
        contrachequesAbertos.delete(chaveContracheque(funcId, mesRef));
        registrarAuditoria('Contracheque fechado', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === funcId))} - ${mesRef}.`, 'contracheque', registro.id);
        salvarBanco();
        gerarPreviaContracheque();
    }

    function getValorDescontoContracheque(registro, mesRef, padraoAutomatico = false) {
        const bruto = registro ? registro.valor : 0;
        const valorOriginal = typeof bruto === 'number' ? bruto : parseMoeda(bruto);
        if(!registro || valorOriginal <= 0) return 0;
        if(registro.type === 'desconto_quinzena' && registro.mesRef === mesRef) return valorOriginal;
        if(registro.mesDescontoContracheque !== mesRef) return 0;
        const informado = Number(registro.valorDescontoContracheque);
        const valor = Number.isFinite(informado) ? informado : valorOriginal;
        return Math.min(valorOriginal, Math.max(0, valor));
    }

    function definirDescontoAdiantamentoContracheque(id, mesRef, valorMaximo, event, contexto = 'contracheque') {
        if(event) event.stopPropagation();
        contextoDescontoAtual = contexto;
        const registro = db.registros.find(r => r.id === id);
        if(!registro) return;
        if(registro.type === 'desconto_quinzena') return;
        const atual = getValorDescontoContracheque(registro, mesRef, registro.type === 'desconto_quinzena');
        document.getElementById('descontoContraRegId').value = id;
        document.getElementById('descontoContraMesRef').value = mesRef;
        document.getElementById('descontoContraMax').value = String(valorMaximo || 0);
        document.getElementById('descontoContraDescricao').innerText = registro.type === 'desconto_quinzena' ? 'Quinzena gerada para este mês.' : `${formatDataBR(registro.data)} - ${registro.motivo || 'Adiantamento'}`;
        document.getElementById('descontoContraLimite').innerText = `Máximo: R$ ${formatMoedaContracheque(valorMaximo)}`;
        const input = document.getElementById('descontoContraValor');
        input.value = formatMoedaContracheque(atual > 0 ? atual : valorMaximo);
        document.getElementById('modalDescontoContracheque').style.display = 'flex';
        setTimeout(() => { input.focus(); input.select(); }, 120);
    }

    function aplicarValorDescontoContracheque(valor) {
        const id = document.getElementById('descontoContraRegId').value;
        const mesRef = document.getElementById('descontoContraMesRef').value;
        const valorMaximo = Number(document.getElementById('descontoContraMax').value || 0);
        const registro = db.registros.find(r => r.id === id);
        if(!registro) return;
        if(valor <= 0) {
            registro.mesDescontoContracheque = '';
            registro.valorDescontoContracheque = 0;
        } else {
            registro.mesDescontoContracheque = mesRef;
            registro.valorDescontoContracheque = Math.min(valorMaximo, valor);
        }
        registro.editadoEm = Date.now();
        registro._syncAtualizadoEm = registro.editadoEm;
        registrarAuditoria('Desconto no contracheque ajustado', `${getNomeUsoFuncionario(db.funcionarios.find(f => f.id === registro.funcId))}: ${valor <= 0 ? 'sem desconto' : `R$ ${formatMoeda(valor)}`} em ${mesRef}.`, 'contracheque', id);
        salvarBanco();
        fecharModal('modalDescontoContracheque');
        if(contextoDescontoAtual === 'recibo') gerarPreviaReciboMensal();
        else if(contextoDescontoAtual === 'ferias') renderCalculoFerias();
        else gerarPreviaContracheque();
    }

    function confirmarDescontoContracheque() {
        const valorMaximo = Number(document.getElementById('descontoContraMax').value || 0);
        const valor = Math.min(valorMaximo, Math.max(0, parseMoeda(document.getElementById('descontoContraValor').value)));
        aplicarValorDescontoContracheque(valor);
    }

    function zerarDescontoContracheque() {
        aplicarValorDescontoContracheque(0);
    }

    function obterAdiantamentosContracheque(f, mesRef) {
        const quinzenaRegs = db.registros.filter(r => r.type === 'desconto_quinzena' && r.funcId === f.id && r.mesRef === mesRef);
        const registros = db.registros.filter(r => r.type === 'adiantamento' && r.funcId === f.id && !r.descontado);
        const doMes = registros.filter(r => String(r.data || '').substring(0, 7) === mesRef);
        const anteriores = registros.filter(r => String(r.data || '').substring(0, 7) < mesRef);
        const totalQuinzena = quinzenaRegs.reduce((acc, r) => acc + getValorDescontoContracheque(r, mesRef, true), 0);
        const totalMes = doMes.reduce((acc, r) => acc + getValorDescontoContracheque(r, mesRef), 0);
        const totalAnt = anteriores.reduce((acc, r) => acc + getValorDescontoContracheque(r, mesRef), 0);
        return {
            quinzenaRegs,
            doMes,
            anteriores,
            total: totalQuinzena + totalMes + totalAnt
        };
    }

    function renderLinhaAdiantamentoContracheque(registro, mesRef, label, editavel, padraoAutomatico = false, contexto = 'contracheque') {
        const valorOriginal = typeof registro.valor === 'number' ? registro.valor : parseMoeda(registro.valor);
        const valorDesconto = getValorDescontoContracheque(registro, mesRef, padraoAutomatico);
        const ativo = valorDesconto > 0;
        if(registro.type === 'desconto_quinzena') {
            return `<div class="linha-adiant"><button class="btn-contra-check ativo" disabled>R$ ${formatMoedaContracheque(valorDesconto)}</button><span>${label} <small style="color:#777;">obrigatório</small></span><span class="valor">R$ ${formatMoedaContracheque(valorOriginal)}</span></div>`;
        }
        const textoBotao = ativo ? `R$ ${formatMoedaContracheque(valorDesconto)}` : 'Descontar';
        const disabled = editavel ? '' : 'disabled';
        return `<div class="linha-adiant"><button class="btn-contra-check ${ativo ? 'ativo' : ''}" ${disabled} onclick="definirDescontoAdiantamentoContracheque(${jsArg(registro.id)}, ${jsArg(mesRef)}, ${valorOriginal}, event, ${jsArg(contexto)})">${textoBotao}</button><span>${label}</span><span class="valor">R$ ${formatMoedaContracheque(valorOriginal)}</span></div>`;
    }

    function renderBoxAdiantamentosContracheque(f, mesRef, dados, editavel = true, contexto = 'contracheque') {
        const linhas = [];
        dados.quinzenaRegs.forEach(r => {
            linhas.push(renderLinhaAdiantamentoContracheque(r, mesRef, 'Quinzena', editavel, true, contexto));
        });
        dados.doMes.forEach(r => {
            const obs = r.observacao ? ` - ${escapeHTML(r.observacao)}` : '';
            linhas.push(renderLinhaAdiantamentoContracheque(r, mesRef, `${formatDataBR(r.data)} - ${escapeHTML(r.motivo || 'Adiantamento')}${obs}`, editavel, false, contexto));
        });
        dados.anteriores.forEach(r => {
            const obs = r.observacao ? ` - ${escapeHTML(r.observacao)}` : '';
            linhas.push(renderLinhaAdiantamentoContracheque(r, mesRef, `${formatDataBR(r.data)} - ${escapeHTML(r.motivo || 'Pendente anterior')}${obs}`, editavel, false, contexto));
        });
        if(linhas.length === 0) return '';
        return `<div class="contra-adiantamentos-box"><b style="color:#D32F2F;">Adiantamentos</b>${linhas.join('')}<div class="contra-linha contra-total"><span>Total adiantamentos</span><strong class="valor">R$ ${formatMoedaContracheque(dados.total)}</strong></div></div>`;
    }

    function renderBoxVTContracheque(d) {
        if(!d || !d.vales || !d.vales.total) return '';
        const detalhes = [];
        if(d.vales.passagensBase) detalhes.push(`Base: ${d.vales.passagensBase}`);
        if(d.vales.passagensDescontadas) detalhes.push(`Desc.: -${d.vales.passagensDescontadas}`);
        detalhes.push(`${d.vales.passagens} passagens`);
        return `<div class="contra-vt-box">
            <b style="color:#00695C;">Vale-Transporte</b>
            ${linhaContracheque(labelRubricaMes('VT', d.vtMesRef), d.vales.total)}
            <div class="contra-vt-detalhe">${escapeHTML(detalhes.join(' | '))}</div>
        </div>`;
    }

    function calcularINSSPrevia(base) {
        if(base <= 0) return { valor: 0, aliquotaEfetiva: 0 };
        const faixas = ordenarINSS((db.configGerais && db.configGerais.inssFaixas) || criarTabelaINSSPadrao())
            .map(f => ({ limite: parseMoeda(f.limite), aliquota: parsePercentual(f.aliquota) }))
            .filter(f => f.limite > 0 && f.aliquota > 0);
        let anterior = 0;
        let total = 0;
        for(const faixa of faixas) {
            const limiteAplicado = Math.min(base, faixa.limite);
            if(limiteAplicado > anterior) total += (limiteAplicado - anterior) * (faixa.aliquota / 100);
            anterior = faixa.limite;
            if(base <= faixa.limite) break;
        }
        return { valor: total, aliquotaEfetiva: base ? (total / base) * 100 : 0 };
    }

    function formatMoedaContracheque(valor) {
        const numero = Number(valor) || 0;
        const ajuste = Number.EPSILON;
        const duasCasas = numero < 0 ? Math.ceil((numero - ajuste) * 100) / 100 : Math.floor((numero + ajuste) * 100) / 100;
        return duasCasas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function linhaContracheque(label, valor, opcoes = {}) {
        if(!opcoes.total && Math.abs(Number(valor) || 0) < 0.0001) return '';
        const classe = opcoes.total ? 'contra-linha contra-total' : 'contra-linha';
        return `<div class="${classe}"><span>${label}</span><strong class="valor">R$ ${formatMoedaContracheque(valor)}</strong></div>`;
    }

    function toggleResumoContracheque() {
        resumoContrachequeVisivel = !resumoContrachequeVisivel;
        gerarPreviaContracheque();
    }

    function abrirEdicaoINSSContracheque(funcId, aliquota, valor) {
        document.getElementById('editINSSFuncId').value = funcId;
        document.getElementById('editINSSAliquota').value = formatPercentual(aliquota);
        document.getElementById('editINSSValor').value = formatMoedaContracheque(valor);
        document.getElementById('modalEditINSSContracheque').style.display = 'flex';
    }

    function salvarEdicaoINSSContracheque() {
        const funcId = document.getElementById('editINSSFuncId').value;
        if(!funcId) return;
        overridesContracheque[funcId] = {
            aliquota: parsePercentual(document.getElementById('editINSSAliquota').value),
            valor: parseMoeda(document.getElementById('editINSSValor').value)
        };
        fecharModal('modalEditINSSContracheque');
        gerarPreviaContracheque();
    }

    function gerarPreviaContracheque() {
        const box = document.getElementById('areaContracheque'); if(!box) return;
        const mesRef = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        const [ano, mes] = mesRef.split('-').map(Number);
        const vtMesRef = document.getElementById('contraVTMesRef').value || somarMesReferencia(mesRef, 1);
        const [anoVT, mesVT] = vtMesRef.split('-').map(Number);
        const funcs = Array.from(itensSelecionados)
            .map(id => db.funcionarios.find(x => x.id === id))
            .filter(f => funcionarioRecebeContracheque(f))
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));

        if(funcs.length === 0) { box.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum funcionário selecionado recebe contracheque.</div>'; return; }

        let totalLiquido = 0;
        let html = '';
        funcs.forEach((f) => {
            const d = calcularDadosContrachequeFuncionario(f, mesRef, vtMesRef);
            const { salario, gratificacao, qtdQuinquenios, quinquenio, salarioFamilia, unidentis, vales, faltas, adiantamentosContra, inss, inssAliquota, descontoPassagem, proventos, descontos, liquido, liquidoAPagar } = d;
            totalLiquido += liquido;
            const key = chaveContracheque(f.id, mesRef);
            const fechado = !!obterFechamentoContracheque(f.id, mesRef);
            const pagamentoDoc = obterPagamentoDocumento('contracheque', f.id, mesRef);
            const aberto = contrachequesAbertos.has(key);
            const editavel = !fechado;
            const inssLabel = editavel ? `INSS (${formatPercentual(inssAliquota)}%) <button class="btn-mini-edit" onclick="abrirEdicaoINSSContracheque(${jsArg(f.id)}, ${inssAliquota}, ${inss})" title="Editar INSS">✏️</button>` : `INSS (${formatPercentual(inssAliquota)}%)`;
            const status = pagamentoDoc ? 'Pago' : (fechado ? 'Fechado' : (aberto ? 'Aberto' : 'Tocar para abrir'));
            const acaoPagamento = pagamentoDoc ? `<span class="contra-status">Pago em ${formatDataBR(pagamentoDoc.data)}</span>` : `<button class="btn-fechar-contra" style="background:#00695C;" onclick="informarPagamentoDocumento('contracheque', ${jsArg(f.id)}, ${jsArg(mesRef)}, event)">Informar pagamento</button>`;
            const detalhes = aberto ? `<div class="contra-detalhes">
                <div style="font-size:11px; color:#777; margin-bottom:8px;">Salário ${escapeHTML(getExtensoMes(mes))} de ${ano} • VT ${escapeHTML(getExtensoMes(mesVT))} de ${anoVT} • ${vales.passagens} passagens${faltas.diasFalta ? ` • ${faltas.diasFalta} falta(s)` : ''}</div>
                <div class="contra-grid">
                    <div class="contra-box contra-box-proventos"><b style="color:#2E7D32;">Proventos</b>
                        ${linhaContracheque('Salário', salario)}
                        ${linhaContracheque('Gratificação', gratificacao)}
                        ${linhaContracheque(`Quinquênio (${quinquenio ? qtdQuinquenios : 0})`, quinquenio)}
                        ${linhaContracheque('Salário Família', salarioFamilia)}
                        ${linhaContracheque('Total', proventos, { total: true })}
                    </div>
                    <div class="contra-box contra-box-descontos"><b style="color:#D32F2F;">Descontos</b>
                        ${linhaContracheque(labelRubricaMes('Passagem', mesRef), descontoPassagem)}
                        ${linhaContracheque(`Falta (${faltas.diasFalta})`, faltas.valorFaltas)}
                        ${linhaContracheque(`DSR (${faltas.dsr})`, faltas.valorDSR)}
                        ${linhaContracheque(inssLabel, inss)}
                        ${linhaContracheque('Unidentis', unidentis)}
                        ${linhaContracheque('Total', descontos, { total: true })}
                    </div>
                    ${renderBoxVTContracheque(d)}
                    ${renderBoxAdiantamentosContracheque(f, mesRef, adiantamentosContra, editavel)}
                </div>
                <div class="contra-actions"><div class="contra-actions-left"><button class="btn-contra-util pix" onclick="abrirEscolhaPixFuncionarioPorId(${jsArg(f.id)}, event)"><span class="emoji-pix">🔑</span> Pix</button><button class="btn-contra-util whats" onclick="enviarContrachequeWhatsapp(${jsArg(f.id)}, ${jsArg(mesRef)}, ${jsArg(vtMesRef)}, event)">📝 WhatsApp</button>${acaoPagamento}</div>${fechado ? `<button class="btn-fechar-contra" style="background:#2E7D32;" onclick="abrirReaberturaContracheque(${jsArg(f.id)}, event)">Reabrir Contracheque</button>` : `<button class="btn-fechar-contra" onclick="fecharContrachequeFuncionario(${jsArg(f.id)}, event)">Fechar Contracheque</button>`}</div>
            </div>` : '';
            const equacao = aberto ? `<strong class="contra-equacao">R$ ${formatMoedaContracheque(liquido)} - R$ ${formatMoedaContracheque(adiantamentosContra.total)} = R$ ${formatMoedaContracheque(liquidoAPagar)}</strong>` : '';
            html += `<div class="contra-card ${fechado ? 'fechado' : ''}" onclick="toggleDetalhesContracheque(${jsArg(f.id)}, event)"><div class="contra-card-header"><div class="contra-card-top"><div class="contra-nome">${escapeHTML(f.nome || 'Sem nome')}</div><span class="contra-status">${status}</span></div>${equacao}</div>${detalhes}</div>`;
        });

        const classeResumo = resumoContrachequeVisivel ? 'contra-resumo-bar aberto' : 'contra-resumo-bar';
        const classeOlho = resumoContrachequeVisivel ? 'contra-resumo-toggle' : 'contra-resumo-toggle cortado';
        box.innerHTML = `<div class="${classeResumo}"><div class="contra-resumo-dados"><span>${funcs.length} funcionário(s) - Total líquido: R$ ${formatMoedaContracheque(totalLiquido)}</span></div><button class="${classeOlho}" onclick="toggleResumoContracheque()" title="Mostrar ou ocultar resumo"><span>👁️‍🗨️</span></button></div>${html}`;
    }

    function abrirModalAniversarios() {
        let box = document.getElementById('listaAniversarios'); let html = '';
        let grupos = {};
        db.funcionarios.filter(f => !f.arquivado).forEach(f => { if(!f.dataNasc) return; let m = f.dataNasc.split('-')[1]; let d = f.dataNasc.split('-')[2]; if(!grupos[m]) grupos[m] = []; grupos[m].push({nome: f.nome, dia: d}); });
        for(let m=1; m<=12; m++) {
            let mStr = String(m).padStart(2,'0'); if(!grupos[mStr]) continue;
            html += `<div style="background:#00695C; color:#fff; padding:5px 10px; font-weight:bold; margin-top:10px; border-radius:4px;">${getExtensoMes(m).toUpperCase()}</div>`;
            grupos[mStr].sort((a,b) => parseInt(a.dia) - parseInt(b.dia)).forEach(aniv => { html += `<div style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${escapeHTML(aniv.nome)}</span><strong>Dia ${escapeHTML(aniv.dia)}</strong></div>`; });
        }
        box.innerHTML = html || '<div style="padding:20px; text-align:center; color:#999;">Nenhum aniversário cadastrado.</div>';
        document.getElementById('modalAniversarios').style.display = 'flex';
    }
