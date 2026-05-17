function toggleDiv(id) { let el = document.getElementById(id); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; }
    function converterLogo(input) { if (input.files && input.files[0]) { let reader = new FileReader(); reader.onload = function(e) { document.getElementById('empLogoBase64').value = e.target.result; document.getElementById('previewLogo').innerHTML = `<img src="${e.target.result}" style="max-height:50px;">`; }; reader.readAsDataURL(input.files[0]); } }
    
    window.onload = async () => { await migrarSenhaAvancadaLegada(); setTimeout(() => { document.getElementById('splashScreen').style.opacity = '0'; setTimeout(()=>{document.getElementById('splashScreen').style.display = 'none';}, 500); }, 1000); document.getElementById('actionBar').style.display = 'grid'; initDiasFiltro(); atualizarAcoesMassa(); renderizarFiltros(); renderizarLista(); if(typeof sincronizarAoEntrar === 'function') sincronizarAoEntrar(); };

    function toggleModoSelecao() { 
        atualizarAcoesMassa();
    }

    function atualizarAcoesMassa() {
        const temSelecionados = itensSelecionados.size > 0;
        const visivel = temSelecionados ? 'flex' : 'none';
        const actionBar = document.getElementById('actionBar');
        if(actionBar) actionBar.classList.toggle('com-selecao', temSelecionados);
        document.getElementById('btnAcaoMassa1').style.display = visivel;
        document.getElementById('btnAcaoMassa2').style.display = visivel;
        document.getElementById('btnAcaoMassa3').style.display = visivel;
        document.getElementById('btnAcaoMassa4').style.display = visivel;
        document.getElementById('boxFiltrosDias').style.display = temSelecionados ? 'none' : 'flex';
        const btnSelecionarLista = document.getElementById('btnSelecionarLista');
        if(btnSelecionarLista) {
            const funcs = obterFuncionariosListados();
            const todosListadosSelecionados = funcs.length > 0 && funcs.every(f => itensSelecionados.has(f.id));
            btnSelecionarLista.style.display = funcs.length ? 'flex' : 'none';
            btnSelecionarLista.classList.toggle('selecionado', todosListadosSelecionados);
        }
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
        if(diaFiltroAptos === diaKey) { diaFiltroAptos = null; } else { diaFiltroAptos = diaKey; categoriaAtual = null; }
        document.querySelectorAll('#boxFiltrosDias .btn-action-bar').forEach(b => b.classList.remove('ativo'));
        if(diaFiltroAptos) document.getElementById(`btnFiltro_${diaKey}`).classList.add('ativo');
        renderizarFiltros(); renderizarLista();
    }

    function renderizarFiltros() { 
        let classTodos = diaFiltroAptos ? "aptos" : (categoriaAtual === null ? "active" : "");
        let html = `<div class="chip ${classTodos}" onclick="filtrarCat(null)">TODOS</div>`; 
        db.categorias.forEach(cat => { html += `<div class="chip ${categoriaAtual === cat.id ? 'active' : ''}" style="background-color: ${safeColor(cat.cor)}; color: ${safeColor(cat.corTexto, '#ffffff')};" onclick="filtrarCat(${jsArg(cat.id)})">${escapeHTML(cat.nome)}</div>`; }); 
        document.getElementById('containerFiltros').innerHTML = html; 
    }
    
    function filtrarCat(id) { 
        if(id === null) { categoriaAtual = null; diaFiltroAptos = null; document.querySelectorAll('#boxFiltrosDias .btn-action-bar').forEach(b => b.classList.remove('ativo')); } else { categoriaAtual = id; diaFiltroAptos = null; document.querySelectorAll('#boxFiltrosDias .btn-action-bar').forEach(b => b.classList.remove('ativo')); }
        renderizarFiltros(); renderizarLista(); 
    }

    function obterFuncionariosListados() {
        let funcs = db.funcionarios.filter(f => !f.arquivado);
        if (categoriaAtual) funcs = funcs.filter(f => f.categoria === categoriaAtual);
        if(diaFiltroAptos) funcs = funcs.filter(f => isAptoNoDia(f, diaFiltroAptos));
        funcs.sort((a,b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        return funcs;
    }

    function renderizarLista() {
        const lista = document.getElementById('listaPrincipal'); let html = '';
        let funcs = obterFuncionariosListados();
        let hj = new Date(); hj.setHours(0,0,0,0);
        
        funcs.forEach(f => {
            let catObj = db.categorias.find(c => c.id === f.categoria) || { cor: '#999', nome: 'Sem vínculo', semanal: false };
            let isSelected = itensSelecionados.has(f.id);
            let badgeExtra = catObj.semanal ? `<div style="color:#E65100; font-size:11px; font-weight:bold; margin-bottom:2px; text-align:right;">SEMANAL</div>` : '';
            let nomeBase = getNomeUsoFuncionario(f);
            let nomeFunc = escapeHTML(nomeBase || 'Sem nome');
            let inicialFunc = escapeHTML(String(nomeBase || '?').charAt(0).toUpperCase());
            let funcCodStr = f.codigo ? `<strong style="color:#00695C;">[${escapeHTML(f.codigo)}]</strong> ` : '';
            let funName = db.funcoes.find(fn => fn.id === f.funcao); funName = funName ? formatarFuncaoLista(funName) : 'Sem função';
            
            let feriasMsg = '';
            let feriasList = db.registros.filter(r => r.type === 'ferias' && r.funcId === f.id);
            for(let r of feriasList) {
                let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1;
                if(hj >= d1 && hj <= d2) { feriasMsg = `<div style="color:#1565C0; font-size:11px; font-weight:bold; text-align:right;">Em férias<br>até ${formatDataCurta(r.dataFim)}</div>`; break; } 
                else if (d1 > hj) { let diff = (d1 - hj) / 86400000; if(diff <= 15) { feriasMsg = `<div style="color:#F57F17; font-size:11px; font-weight:bold; text-align:right;">Férias em breve<br>(${formatDataCurta(r.data)})</div>`; break; } }
            }

            let infoDireita = badgeExtra + feriasMsg;
            html += `<li class="item ${isSelected ? 'selecionado' : ''}" onclick="cliqueItem(${jsArg(f.id)})"><div style="display: flex; align-items: center; flex: 1; overflow:hidden;"><button class="item-avatar item-avatar-select ${isSelected ? 'selecionado' : ''}" style="background-color: ${safeColor(catObj.cor, '#999999')}; color: ${safeColor(catObj.corTexto, '#ffffff')};" onclick="toggleSelecaoFuncionario(event, ${jsArg(f.id)})">${inicialFunc}</button><div class="item-info"><div class="item-title">${nomeFunc}</div><div class="item-subtitle">${funcCodStr}${escapeHTML(funName)} • ${escapeHTML(catObj.nome)}</div></div></div><div class="info-direita" style="text-align: right; margin-left: 10px; flex-shrink: 0;">${infoDireita}</div></li>`;
        });
        if(funcs.length === 0) html = renderizarEstadoVazio();
        lista.innerHTML = html;
        atualizarAcoesMassa();
    }

    function renderizarEstadoVazio() {
        const ativos = db.funcionarios.filter(f => !f.arquivado);
        if(ativos.length > 0) {
            return `<li class="empty-state"><div class="empty-state-title">Nenhum funcionário neste filtro</div><div class="empty-state-text">Limpe os filtros ou escolha outro vínculo para voltar à lista.</div><div class="empty-actions"><button class="btn-action" onclick="filtrarCat(null)">Limpar filtros</button></div></li>`;
        }
        if(db.funcionarios.length > 0) {
            return `<li class="empty-state"><div class="empty-state-title">Nenhum funcionário ativo</div><div class="empty-state-text">Há funcionários arquivados. Você pode restaurar alguém em Gerenciar Funcionários ou cadastrar uma nova pessoa.</div><div class="empty-actions"><button class="btn-action" onclick="abrirGerenciar('funcionarios')">Gerenciar Funcionários</button><button class="btn-outline" onclick="abrirFormFunc(null, 'inicio')">Novo Funcionário</button></div></li>`;
        }
        return `<li class="empty-state"><div class="empty-state-title">Monte a base do RH</div><div class="empty-state-text">Cadastre vínculos como Carteira Assinada, Extra ou Contrato, depois crie as funções e adicione o primeiro funcionário.</div><div class="empty-actions"><button class="btn-action" onclick="abrirFormClasse(null, 'inicio')">Criar Vínculo</button><button class="btn-outline" onclick="abrirFormFuncao(null, 'inicio')">Criar Função</button><button class="btn-action" onclick="abrirFormFunc(null, 'inicio')">Novo Funcionário</button></div></li>`;
    }

    function cliqueItem(id) {
        let f = db.funcionarios.find(x => x.id === id); let catObj = db.categorias.find(c => c.id === f.categoria); document.getElementById('tituloAcoesFunc').innerText = getNomeUsoFuncionario(f); document.getElementById('acoesFuncId').value = f.id; document.getElementById('btnPagarExtra').style.display = (catObj && catObj.semanal) ? 'block' : 'none'; 
        document.getElementById('btnAcaoAtraso').style.display = (f.habAtrasos !== false) ? 'block' : 'none';
        if(catObj && catObj.semanal) { document.getElementById('btnAcaoFalta').style.display = (f.habFaltas) ? 'block' : 'none'; document.getElementById('btnAcaoFerias').style.display = (f.habFerias) ? 'block' : 'none'; } else { document.getElementById('btnAcaoFalta').style.display = 'block'; document.getElementById('btnAcaoFerias').style.display = 'block'; }
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

    function formatarFuncaoLista(funcao) {
        if(!funcao) return '';
        const numero = String(funcao.numero || '').trim();
        return numero ? `${numero.padStart(3, '0')} - ${funcao.nome || ''}` : (funcao.nome || '');
    }

    // 3. GERENCIAMENTO CRUD
    function abrirGerenciar(tipo) {
        fecharModal('modalPainelUnificado');
        if(tipo === 'configGerais') { document.getElementById('confSalario').value = db.configGerais.salarioMinimo || ''; document.getElementById('confAdiantamento').value = db.configGerais.adiantamentoQuinzena || ''; tempVT = db.configGerais.valesTransporte ? [...db.configGerais.valesTransporte] : []; tempMotivos = db.configGerais.motivosAdiantamento ? [...db.configGerais.motivosAdiantamento] : []; tempINSS = db.configGerais.inssFaixas ? JSON.parse(JSON.stringify(db.configGerais.inssFaixas)) : criarTabelaINSSPadrao(); document.querySelectorAll('.chk-dias-func').forEach(el => el.checked = db.configGerais.diasFuncionamento.includes(el.value)); renderListasConfig(); document.getElementById('modalConfigGerais').style.display = 'flex'; return; }
        if(tipo === 'empresa') { document.getElementById('empLogoBase64').value = db.empresa.logo || ''; document.getElementById('previewLogo').innerHTML = db.empresa.logo ? `<img src="${db.empresa.logo}" style="max-height:50px;">` : ''; document.getElementById('empRazao').value = db.empresa.razao || ''; document.getElementById('empFantasia').value = db.empresa.fantasia || ''; document.getElementById('empCNPJ').value = db.empresa.cnpj || ''; document.getElementById('empRua').value = db.empresa.rua || ''; document.getElementById('empNum').value = db.empresa.numero || ''; document.getElementById('empBairro').value = db.empresa.bairro || ''; document.getElementById('empCidade').value = db.empresa.cidade || ''; document.getElementById('empUF').value = db.empresa.uf || 'PB'; document.getElementById('modalFormEmpresa').style.display = 'flex'; return; }
        
        const lista = document.getElementById('conteudoListagem'); let htmlLista = '';
        if(tipo === 'funcionarios') {
            document.getElementById('tituloListagem').innerText = "Funcionários"; document.getElementById('btnClassesListagem').style.display = 'flex'; document.getElementById('btnFuncoesListagem').style.display = 'flex'; document.getElementById('btnNovoListagem').onclick = () => abrirFormFunc(null);
            document.getElementById('btnVoltarListagem').onclick = () => { fecharModal('modalListagem'); document.getElementById('modalPainelUnificado').style.display='flex'; };
            let funcs = [...db.funcionarios].sort((a,b) => String(a.nome || '').localeCompare(String(b.nome || '')));
            const renderFuncionarioGerenciar = (f) => {
                let codStr = f.codigo ? `<strong style="color:#00695C;">[${escapeHTML(f.codigo)}]</strong> ` : '';
                let funName = db.funcoes.find(fn => fn.id === f.funcao); funName = funName ? formatarFuncaoLista(funName) : 'Sem função';
                let acaoArquivo = f.arquivado
                    ? `<button style="background:none; border:none; font-size:18px; cursor:pointer; color:#2E7D32;" title="Restaurar" onclick="restaurarFuncionario(${jsArg(f.id)})">↩️</button>`
                    : `<button style="background:none; border:none; font-size:18px; cursor:pointer; color:#F57F17;" title="Arquivar" onclick="arquivarFuncionario(${jsArg(f.id)})">📦</button>`;
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

    function excluirItem(tipo, id) { if(confirm("Deseja realmente excluir?")) { db[tipo] = db[tipo].filter(x => x.id !== id); salvarBanco(); abrirGerenciar(tipo); if(tipo==='categorias') renderizarFiltros(); } }
    function arquivarFuncionario(id) {
        const f = db.funcionarios.find(x => x.id === id);
        if(!f) return;
        if(!confirm(`Arquivar ${f.nome || 'funcionário'}? Ele não aparecerá nas listas, filtros e impressões de ativos.`)) return;
        f.arquivado = true;
        f.arquivadoEm = Date.now();
        itensSelecionados.delete(id);
        salvarBanco();
        abrirGerenciar('funcionarios');
        renderizarLista();
    }
    function restaurarFuncionario(id) {
        const f = db.funcionarios.find(x => x.id === id);
        if(!f) return;
        f.arquivado = false;
        f.arquivadoEm = null;
        salvarBanco();
        abrirGerenciar('funcionarios');
        renderizarLista();
    }

    function salvarEmpresa() { 
        let cnpj = document.getElementById('empCNPJ').value; if(cnpj && cnpj.length < 18) return alert("CNPJ incompleto. Digite os 14 números.");
        db.empresa.logo = document.getElementById('empLogoBase64').value; db.empresa.razao = document.getElementById('empRazao').value; db.empresa.fantasia = document.getElementById('empFantasia').value; db.empresa.cnpj = cnpj; db.empresa.rua = document.getElementById('empRua').value; db.empresa.numero = document.getElementById('empNum').value; db.empresa.bairro = document.getElementById('empBairro').value; db.empresa.cidade = document.getElementById('empCidade').value; db.empresa.uf = document.getElementById('empUF').value; salvarBanco(); fecharModal('modalFormEmpresa'); document.getElementById('modalPainelUnificado').style.display = 'flex'; 
    }
    
    function abrirFormAdmin(id) { fecharModal('modalListagem'); if(id) { let a = db.administradores.find(x => x.id === id); document.getElementById('adminId').value = a.id; document.getElementById('adminNome').value = a.nome; document.getElementById('adminSenha').value = a.senha; } else { document.getElementById('adminId').value = ''; document.getElementById('adminNome').value = ''; document.getElementById('adminSenha').value = ''; } document.getElementById('modalFormAdmin').style.display = 'flex'; }
    function salvarAdmin() { let id = document.getElementById('adminId').value || 'adm_' + Date.now(); let novo = { id: id, nome: document.getElementById('adminNome').value, senha: document.getElementById('adminSenha').value }; const idx = db.administradores.findIndex(x => x.id === id); if(idx >= 0) db.administradores[idx] = novo; else db.administradores.push(novo); salvarBanco(); fecharModal('modalFormAdmin'); abrirGerenciar('administradores'); }

    // VINCULOS E SALARIOS
    function getCamposFuncionarioClasse(c = {}) {
        const campos = c.camposFuncionario || {};
        return {
            pedirVT: campos.pedirVT !== false,
            pedirGratificacao: campos.pedirGratificacao !== false,
            pedirSalFamilia: campos.pedirSalFamilia !== false,
            pedirUnidentis: campos.pedirUnidentis !== false
        };
    }

    function preencherCamposFuncionarioClasse(c = {}) {
        const campos = getCamposFuncionarioClasse(c);
        document.getElementById('classePedirVT').checked = campos.pedirVT;
        document.getElementById('classePedirGratificacao').checked = campos.pedirGratificacao;
        document.getElementById('classePedirSalFamilia').checked = campos.pedirSalFamilia;
        document.getElementById('classePedirUnidentis').checked = campos.pedirUnidentis;
    }

    function abrirFormClasse(id, origem = 'gerenciar') { 
        origemFormClasse = origem;
        fecharModal('modalListagem'); tempSalariosClasse = [];
        if(id) { 
            let c = db.categorias.find(x => x.id === id); document.getElementById('classeId').value = c.id; document.getElementById('classeNome').value = c.nome; document.getElementById('classeCorFundo').value = c.cor || '#00695C'; document.getElementById('classeCorTexto').value = c.corTexto || '#ffffff'; document.getElementById('classeSemanal').checked = c.semanal || false; 
            document.getElementById('classeHoraEntrada').value = (c.horarios && c.horarios.entrada) ? c.horarios.entrada : ''; document.getElementById('classeHoraSaida').value = (c.horarios && c.horarios.saida) ? c.horarios.saida : ''; document.getElementById('classeHoraIntEnt').value = (c.horarios && c.horarios.intEnt) ? c.horarios.intEnt : ''; document.getElementById('classeHoraIntSai').value = (c.horarios && c.horarios.intSai) ? c.horarios.intSai : ''; document.getElementById('classeSemIntervalo').checked = (c.horarios && c.horarios.semIntervalo) || false;
            preencherCamposFuncionarioClasse(c);
            if(c.salarios) tempSalariosClasse = [...c.salarios];
        } else { 
            document.getElementById('classeId').value = ''; document.getElementById('classeNome').value = ''; document.getElementById('classeCorFundo').value = '#00695C'; document.getElementById('classeCorTexto').value = '#ffffff'; document.getElementById('classeSemanal').checked = false; 
            document.getElementById('classeHoraEntrada').value = ''; document.getElementById('classeHoraSaida').value = ''; document.getElementById('classeHoraIntEnt').value = ''; document.getElementById('classeHoraIntSai').value = ''; document.getElementById('classeSemIntervalo').checked = false;
            preencherCamposFuncionarioClasse();
        } 
        toggleIntervaloClasse(); renderListaSalariosClasse(); document.getElementById('modalFormClasse').style.display = 'flex'; 
    }
    function toggleIntervaloClasse() { let isSem = document.getElementById('classeSemIntervalo').checked; document.getElementById('classeHoraIntEnt').disabled = isSem; document.getElementById('classeHoraIntSai').disabled = isSem; if(isSem) { document.getElementById('classeHoraIntEnt').value = ''; document.getElementById('classeHoraIntSai').value = ''; } }
    function renderListaSalariosClasse() { const box = document.getElementById('listaSalariosClasse'); if(tempSalariosClasse.length === 0) { box.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">Nenhum salário base.</div>'; return; } box.innerHTML = tempSalariosClasse.map((s, i) => `<div class="list-item-config"><span>R$ ${formatMoeda(s)}</span><button onclick="removerSalarioClasse(${i})">X</button></div>`).join(''); }
    function addSalarioClasse() { let vStr = document.getElementById('novoSalarioClasse').value; let val = parseMoeda(vStr); if(val > 0) { tempSalariosClasse.push(val); document.getElementById('novoSalarioClasse').value = ''; renderListaSalariosClasse(); } }
    function removerSalarioClasse(idx) { tempSalariosClasse.splice(idx, 1); renderListaSalariosClasse(); }
    
    function voltarDepoisFormClasse() { if(origemFormClasse === 'inicio') { origemFormClasse = 'gerenciar'; renderizarFiltros(); renderizarLista(); return; } abrirGerenciar('categorias'); }
    function cancelarFormClasse() { fecharModal('modalFormClasse'); voltarDepoisFormClasse(); }
    function salvarClasse() { let id = document.getElementById('classeId').value || 'c_' + Date.now(); let novo = { id: id, nome: document.getElementById('classeNome').value, cor: document.getElementById('classeCorFundo').value, corTexto: document.getElementById('classeCorTexto').value, semanal: document.getElementById('classeSemanal').checked, camposFuncionario: { pedirVT: document.getElementById('classePedirVT').checked, pedirGratificacao: document.getElementById('classePedirGratificacao').checked, pedirSalFamilia: document.getElementById('classePedirSalFamilia').checked, pedirUnidentis: document.getElementById('classePedirUnidentis').checked }, horarios: { entrada: document.getElementById('classeHoraEntrada').value, saida: document.getElementById('classeHoraSaida').value, intEnt: document.getElementById('classeHoraIntEnt').value, intSai: document.getElementById('classeHoraIntSai').value, semIntervalo: document.getElementById('classeSemIntervalo').checked }, salarios: tempSalariosClasse }; const idx = db.categorias.findIndex(x => x.id === id); if(idx >= 0) db.categorias[idx] = novo; else db.categorias.push(novo); salvarBanco(); fecharModal('modalFormClasse'); voltarDepoisFormClasse(); renderizarFiltros(); renderizarLista(); }

    function abrirFormFuncao(id, origem = 'gerenciar') { origemFormFuncao = origem; fecharModal('modalListagem'); if(id) { let fn = db.funcoes.find(x => x.id === id); document.getElementById('funcaoId').value = fn.id; document.getElementById('funcaoNumero').value = fn.numero || ''; document.getElementById('funcaoNome').value = fn.nome; } else { document.getElementById('funcaoId').value = ''; document.getElementById('funcaoNumero').value = ''; document.getElementById('funcaoNome').value = ''; } document.getElementById('modalFormFuncao').style.display = 'flex'; }
    function voltarDepoisFormFuncao() { if(origemFormFuncao === 'inicio') { origemFormFuncao = 'gerenciar'; renderizarLista(); return; } abrirGerenciar('funcoes'); }
    function cancelarFormFuncao() { fecharModal('modalFormFuncao'); voltarDepoisFormFuncao(); }
    function salvarFuncao() { let id = document.getElementById('funcaoId').value || 'fn_' + Date.now(); let novo = { id: id, numero: document.getElementById('funcaoNumero').value.trim(), nome: document.getElementById('funcaoNome').value }; const idx = db.funcoes.findIndex(x => x.id === id); if(idx >= 0) db.funcoes[idx] = novo; else db.funcoes.push(novo); salvarBanco(); fecharModal('modalFormFuncao'); voltarDepoisFormFuncao(); renderizarLista(); }

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
        alternar('boxCampoVT', campos.pedirVT);
        alternar('boxCampoGratificacao', campos.pedirGratificacao);
        alternar('boxCampoSalFamilia', campos.pedirSalFamilia);
        alternar('boxCampoUnidentis', campos.pedirUnidentis);
    }

    function aplicarPadroesClasse() {
        let catId = document.getElementById('funcCategoria').value;
        let c = db.categorias.find(x => x.id === catId);
        aplicarCamposVisiveisFuncionario(c);
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
        origemFormFuncionario = origem;
        fecharModal('modalListagem'); tempPix = [];
        if(id) {
            let f = db.funcionarios.find(x => x.id === id); carregarComboCategorias(f.categoria, f.funcao, f.vtRota);
            let c = db.categorias.find(x => x.id === f.categoria); document.getElementById('boxPermissoesSemanais').style.display = (c && c.semanal) ? 'block' : 'none';
            aplicarCamposVisiveisFuncionario(c);
            document.getElementById('funcId').value = f.id; document.getElementById('funcCodigo').value = f.codigo || ''; document.getElementById('funcNome').value = f.nome || ''; document.getElementById('funcNomeSocial').value = f.nomeSocial || ''; document.getElementById('funcDataNasc').value = f.dataNasc || ''; document.getElementById('funcAdmissao').value = f.admissao || ''; document.getElementById('funcCPF').value = f.cpf || ''; document.getElementById('funcRG').value = f.rg || ''; document.getElementById('funcRGUF').value = f.rgUF || 'PB'; document.getElementById('funcCTPS').value = f.ctps || ''; document.getElementById('funcTel').value = f.telefone || ''; document.getElementById('funcSalario').value = f.salario || db.configGerais.salarioMinimo; document.getElementById('funcGratificacao').value = f.gratificacao || ''; document.getElementById('funcSalFamilia').value = f.salFamilia || ''; document.getElementById('funcUnidentis').value = f.unidentis || '';
            document.getElementById('funcHabFaltas').checked = f.habFaltas !== undefined ? f.habFaltas : true; document.getElementById('funcHabFerias').checked = f.habFerias !== undefined ? f.habFerias : true; document.getElementById('funcHabAtrasos').checked = f.habAtrasos !== undefined ? f.habAtrasos : true;
            document.getElementById('funcHoraEntrada').value = (f.horarios && f.horarios.entrada) ? f.horarios.entrada : ''; document.getElementById('funcHoraSaida').value = (f.horarios && f.horarios.saida) ? f.horarios.saida : ''; document.getElementById('funcHoraIntEnt').value = (f.horarios && f.horarios.intEnt) ? f.horarios.intEnt : ''; document.getElementById('funcHoraIntSai').value = (f.horarios && f.horarios.intSai) ? f.horarios.intSai : ''; 
            renderizarDiasFolgaFuncionario(f.horarios ? f.horarios.folgas : []);
            if(f.pixList) tempPix = JSON.parse(JSON.stringify(f.pixList));
        } else {
            carregarComboCategorias(); document.getElementById('boxPermissoesSemanais').style.display = 'none';
            aplicarCamposVisiveisFuncionario(null);
            document.getElementById('funcId').value = ''; document.getElementById('funcCodigo').value = ''; document.getElementById('funcNome').value = ''; document.getElementById('funcNomeSocial').value = ''; document.getElementById('funcDataNasc').value = ''; document.getElementById('funcAdmissao').value = ''; document.getElementById('funcCPF').value = ''; document.getElementById('funcRG').value = ''; document.getElementById('funcRGUF').value = 'PB'; document.getElementById('funcCTPS').value = ''; document.getElementById('funcTel').value = ''; document.getElementById('funcSalario').value = db.configGerais.salarioMinimo; document.getElementById('funcGratificacao').value = ''; document.getElementById('funcSalFamilia').value = ''; document.getElementById('funcUnidentis').value = '';
            document.getElementById('funcHabFaltas').checked = true; document.getElementById('funcHabFerias').checked = true; document.getElementById('funcHabAtrasos').checked = true;
            document.getElementById('funcHoraEntrada').value = ''; document.getElementById('funcHoraSaida').value = ''; document.getElementById('funcHoraIntEnt').value = ''; document.getElementById('funcHoraIntSai').value = ''; 
            renderizarDiasFolgaFuncionario(null);
        }
        renderListaPix(); document.getElementById('modalFormFuncionario').style.display = 'flex';
    }
    function renderListaPix() { const box = document.getElementById('listaPix'); if(tempPix.length === 0) { box.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">Nenhuma chave PIX.</div>'; return; } box.innerHTML = tempPix.map((p, i) => `<div class="list-item-config" style="align-items:flex-start;"><div><small style="color:#0277BD; font-weight:bold;">${escapeHTML(p.tipo || 'PIX')}</small><br><span style="word-break: break-all;">${escapeHTML(p.chave)}</span><br><label class="radio-custom"><input type="radio" name="pixPrinc" onchange="setPixPrincipal(${i})" ${p.principal ? 'checked' : ''}> Principal</label></div><button onclick="removerPix(${i})" style="margin-top:5px;">X</button></div>`).join(''); }
    function addPix() { 
        let tipo = document.getElementById('novoPixTipo').value; let chv = document.getElementById('novoPixInput').value.trim(); 
        if(tipo === 'E-mail') { chv = chv.toLowerCase(); if(!chv.includes('@') || !chv.includes('.')) return alert('Digite um e-mail válido com @ e domínio.'); }
        if(chv) { tempPix.push({ tipo: tipo, chave: chv, principal: tempPix.length === 0 }); document.getElementById('novoPixInput').value = ''; renderListaPix(); } 
    }
    function removerPix(idx) { tempPix.splice(idx, 1); if(tempPix.length > 0 && !tempPix.some(p => p.principal)) tempPix[0].principal = true; renderListaPix(); }
    function setPixPrincipal(idx) { tempPix.forEach((p, i) => p.principal = (i === idx)); }
    function voltarDepoisFormFuncionario() { if(origemFormFuncionario === 'inicio') { origemFormFuncionario = 'gerenciar'; renderizarLista(); return; } abrirGerenciar('funcionarios'); }
    function cancelarFormFuncionario() { fecharModal('modalFormFuncionario'); voltarDepoisFormFuncionario(); }
    function salvarFuncionario() { 
        const id = document.getElementById('funcId').value || 'f_'+Date.now(); 
        const existente = db.funcionarios.find(x => x.id === id);
        let folgas = Array.from(document.querySelectorAll('.chk-folga-func:checked')).map(el => el.value);
        const novo = { id: id, codigo: document.getElementById('funcCodigo').value, nome: document.getElementById('funcNome').value, nomeSocial: document.getElementById('funcNomeSocial').value, dataNasc: document.getElementById('funcDataNasc').value, admissao: document.getElementById('funcAdmissao').value, cpf: document.getElementById('funcCPF').value, rg: document.getElementById('funcRG').value, rgUF: document.getElementById('funcRGUF').value, ctps: document.getElementById('funcCTPS').value, telefone: document.getElementById('funcTel').value, funcao: document.getElementById('funcFuncao').value, categoria: document.getElementById('funcCategoria').value, vtRota: document.getElementById('funcVTRota').value, pixList: tempPix, salario: document.getElementById('funcSalario').value, gratificacao: document.getElementById('funcGratificacao').value, salFamilia: document.getElementById('funcSalFamilia').value, unidentis: document.getElementById('funcUnidentis').value, habFaltas: document.getElementById('funcHabFaltas').checked, habFerias: document.getElementById('funcHabFerias').checked, habAtrasos: document.getElementById('funcHabAtrasos').checked, arquivado: existente ? !!existente.arquivado : false, arquivadoEm: existente ? existente.arquivadoEm : null, horarios: { entrada: document.getElementById('funcHoraEntrada').value, saida: document.getElementById('funcHoraSaida').value, intEnt: document.getElementById('funcHoraIntEnt').value, intSai: document.getElementById('funcHoraIntSai').value, folgas: folgas } }; 
        const idx = db.funcionarios.findIndex(x => x.id === id); if(idx >= 0) db.funcionarios[idx] = novo; else db.funcionarios.push(novo); salvarBanco(); fecharModal('modalFormFuncionario'); voltarDepoisFormFuncionario(); 
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
    function salvarConfigGerais() { db.configGerais.salarioMinimo = document.getElementById('confSalario').value; db.configGerais.adiantamentoQuinzena = document.getElementById('confAdiantamento').value; db.configGerais.diasFuncionamento = Array.from(document.querySelectorAll('.chk-dias-func:checked')).map(el => el.value); db.configGerais.valesTransporte = tempVT; db.configGerais.motivosAdiantamento = tempMotivos; db.configGerais.inssFaixas = ordenarINSS(tempINSS).length ? ordenarINSS(tempINSS) : criarTabelaINSSPadrao(); salvarBanco(); fecharModal('modalConfigGerais'); document.getElementById('modalPainelUnificado').style.display='flex'; }

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

    function copiarTextoSeguro(texto, sucesso) {
        const mensagem = sucesso || 'Copiada para a área de transferência.';
        if(navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(() => mostrarMensagemBaixa(mensagem)).catch(() => mostrarMensagemBaixa('Não foi possível copiar.'));
            return;
        }
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        mostrarMensagemBaixa(mensagem);
    }

    function mostrarMensagemBaixa(texto) {
        let toast = document.getElementById('toastApp');
        if(!toast) {
            toast = document.createElement('div');
            toast.id = 'toastApp';
            toast.className = 'toast-app';
            document.body.appendChild(toast);
        }
        toast.innerText = texto;
        toast.classList.add('visivel');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('visivel'), 1800);
    }

    function copiarPixFuncionario() { abrirEscolhaPixFuncionario(); }

    function abrirEscolhaPixFuncionario() {
        const f = getFuncionarioAcoes();
        const lista = (f && Array.isArray(f.pixList)) ? f.pixList.filter(p => p && p.chave) : [];
        if(lista.length === 0) return alert('Nenhuma chave PIX cadastrada para este funcionário.');
        if(lista.length === 1) return copiarChavePixFuncionario(0);
        const box = document.getElementById('listaEscolhaPix');
        box.innerHTML = lista.map((pix, i) => {
            const principal = pix.principal ? 'Principal' : `PIX ${i + 1}`;
            const tipo = pix.tipo ? ` • ${escapeHTML(pix.tipo)}` : '';
            return `<button class="btn-outline" style="margin-bottom:0; border-color:#0277BD; color:#0277BD; text-align:left;" onclick="copiarChavePixFuncionario(${i})"><strong>${principal}${tipo}</strong><br><span style="font-size:12px; word-break:break-all;">${escapeHTML(pix.chave)}</span></button>`;
        }).join('');
        document.getElementById('modalEscolhaPix').style.display = 'flex';
    }

    function copiarChavePixFuncionario(indice) {
        const f = getFuncionarioAcoes();
        const lista = (f && Array.isArray(f.pixList)) ? f.pixList.filter(p => p && p.chave) : [];
        const pix = lista[indice];
        if(!pix) return alert('Chave PIX não encontrada.');
        fecharModal('modalEscolhaPix');
        copiarTextoSeguro(pix.chave, 'Copiada para a área de transferência.');
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
    
    function abrirModalPresencaSemana() {
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
    function registrarPresenca(val) { const funcId = document.getElementById('acoesFuncId').value; db.registros.push({ id: 'reg_'+Date.now(), type: 'presenca', funcId: funcId, data: dataTempPresenca, valor: val, status: 'pendente' }); salvarBanco(); renderizarPresencasPendentes(funcId); }
    
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
        const funcId = document.getElementById('acoesFuncId').value;
        let pendentes = db.registros.filter(r => r.type === 'presenca' && r.funcId === funcId && r.status === 'pendente');
        if(pendentes.length === 0) return alert("Não há dias trabalhados na lista.");
        if(!confirm("Confirmar pagamento dos dias pendentes? Isso vai zerar o acumulado.")) return;
        let total = 0; let diasIds = []; pendentes.forEach(r => { total += r.valor; r.status = 'pago'; diasIds.push(r.data); });
        db.registros.push({ id: 'reg_'+Date.now(), type: 'pagamento_semana', funcId: funcId, data: getHojeSTR(), valorTotal: total, dias: diasIds });
        salvarBanco(); renderizarPresencasPendentes(funcId); alert("Pagamento Confirmado!");
    }

    // ADIANTAMENTOS
    function abrirModalAdiantamento(editId = null) {
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        let selMotivo = document.getElementById('adiantMotivo'); selMotivo.innerHTML = ''; db.configGerais.motivosAdiantamento.forEach(m => selMotivo.innerHTML += optionHTML(m, m)); if(db.configGerais.motivosAdiantamento.length === 0) selMotivo.innerHTML = optionHTML('Vale', 'Vale');
        document.getElementById('adiantAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        let areaEdit = document.getElementById('areaEditAdiant');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('adiantEditId').value = editId; document.getElementById('adiantData').value = r.data; document.getElementById('adiantValor').value = formatMoeda(r.valor); document.getElementById('adiantMotivo').value = r.motivo; document.getElementById('adiantForma').value = r.forma === 'PIX' ? 'Pix' : (r.forma || 'Pix'); document.getElementById('adiantAdmin').value = r.adminId; document.getElementById('btnSalvarAdiantamento').innerText = "Salvar Edição"; document.getElementById('btnCancelEditAdiant').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { document.getElementById('adiantEditId').value = ''; document.getElementById('adiantData').value = getHojeSTR(); document.getElementById('adiantValor').value = ''; document.getElementById('adiantForma').value = 'Pix'; document.getElementById('btnSalvarAdiantamento').innerText = "Gravar Lançamento"; document.getElementById('btnCancelEditAdiant').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistAdiantamento(funcId); document.getElementById('modalFormAdiantamento').style.display = 'flex';
    }
    function cancelarEdicaoRegistro(tipo) { if(tipo === 'adiantamento') abrirModalAdiantamento(null); else if(tipo === 'falta') abrirModalFalta(null); else if(tipo === 'atraso') abrirModalAtraso(null); else if(tipo === 'ferias') abrirModalFerias(null); }
    function salvarAdiantamento() {
        const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('adiantEditId').value; const valorStr = document.getElementById('adiantValor').value; if(!valorStr) return alert("Digite um valor.");
        const novo = { type: 'adiantamento', funcId: funcId, data: document.getElementById('adiantData').value, valor: parseMoeda(valorStr), motivo: document.getElementById('adiantMotivo').value, forma: document.getElementById('adiantForma').value, adminId: document.getElementById('adiantAdmin').value, descontado: false };
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); }
        salvarBanco(); abrirModalAdiantamento(null); // reseta tela
    }
    
    function marcarDesconto(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.aguardandoDesconto = true; renderizarHistAdiantamento(r.funcId); setTimeout(() => { let rCheck = db.registros.find(x => x.id === id); if(rCheck && rCheck.aguardandoDesconto) { rCheck.aguardandoDesconto = false; rCheck.descontado = true; salvarBanco(); if(document.getElementById('modalFormAdiantamento').style.display === 'flex') renderizarHistAdiantamento(rCheck.funcId); } }, 10000); }
    function desfazerDescontoTemp(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.aguardandoDesconto = false; renderizarHistAdiantamento(r.funcId); }
    function estornarDesconto(id) { let r = db.registros.find(x => x.id === id); if(!r) return; r.descontado = false; salvarBanco(); renderizarHistAdiantamento(r.funcId); }

    function renderizarHistAdiantamento(funcId) {
        let boxPendAtual = document.getElementById('listaHistoricoAdiantamentos');
        let boxPendAnt = document.getElementById('listaHistoricoAdiantamentosAnt');
        let boxDesc = document.getElementById('listaHistoricoAdiantDescontados');
        let hAtual = ''; let hAnt = ''; let hDesc = '';
        let totalAtual = 0; let totalAnt = 0;
        const mesAtual = getHojeSTR().substring(0, 7);
        let regs = db.registros.filter(r => r.type === 'adiantamento' && r.funcId === funcId).sort((a,b) => new Date(b.data) - new Date(a.data));
        const htmlPendente = (r) => {
            let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado)</span>` : '';
            let btnAcao = r.aguardandoDesconto ? `<button style="background:#Fbc02d; color:#fff; font-weight:bold; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:11px;" onclick="desfazerDescontoTemp(${jsArg(r.id)})">Desfazer (10s)</button>` : `<button style="background:#2e7d32; color:#fff; font-weight:bold; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:11px;" onclick="marcarDesconto(${jsArg(r.id)})">Descontar</button>`;
            return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0; align-items:center; gap:8px;"><div><b>${formatDataBR(r.data)}</b> - ${escapeHTML(r.motivo)} ${msgEdit}<br><span style="color:#666; font-size:10px;">Resp: ${getAdminNome(r.adminId)}</span></div><div style="display:flex; gap:5px; align-items:center; flex-shrink:0;"><b style="color:#1565C0;">R$ ${formatMoeda(r.valor)}</b> <button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalAdiantamento(${jsArg(r.id)})">✏️</button> ${btnAcao} <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro(${jsArg(r.id)}, 'adiantamento')">🗑️</button></div></div>`;
        };
        regs.forEach(r => { 
            let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado)</span>` : '';
            if(r.descontado) {
                hDesc += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0; gap:8px;"><div><b style="color:#777;">${formatDataBR(r.data)}</b> - ${escapeHTML(r.motivo)} ${msgEdit}<br><span style="color:#999; font-size:10px;">Resp: ${getAdminNome(r.adminId)}</span></div><div style="display:flex; gap:5px; align-items:center; flex-shrink:0;"><b style="color:#777;">R$ ${formatMoeda(r.valor)}</b> <button style="background:#eee; border:none; border-radius:4px; padding:2px 5px; cursor:pointer; font-size:10px;" onclick="estornarDesconto(${jsArg(r.id)})">Desfazer</button></div></div>`;
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
            linhas.push(`• ${formatDataBR(r.data)}${motivo}${forma}: R$ ${formatMoeda(r.valor)} - ${status}`);
        });

        linhas.push('', 'Qualquer divergência, me avise por aqui.');
        abrirWhatsappFuncionario(linhas.join('\n'));
    }

    // FALTAS E FÉRIAS
    function changeTipoFalta() { let t = document.getElementById('faltaTipo').value; if(t === 'Atestado' || t === 'Folga') document.getElementById('faltaDescontarDia').checked = false; else document.getElementById('faltaDescontarDia').checked = true; }
    
    function abrirModalFalta(editId = null) {
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        document.getElementById('faltaAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        let areaEdit = document.getElementById('areaEditFalta');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('faltaEditId').value = editId; document.getElementById('faltaData').value = r.data; document.getElementById('faltaDataFim').value = r.dataFim || ''; document.getElementById('faltaTipo').value = r.tipo; document.getElementById('faltaDescontarDia').checked = r.descontarDia; document.getElementById('faltaDescontarPassagem').checked = r.descontarPassagem; document.getElementById('faltaAdmin').value = r.adminId; document.getElementById('btnSalvarFalta').innerText = "Salvar Edição"; document.getElementById('btnCancelEditFalta').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { document.getElementById('faltaEditId').value = ''; document.getElementById('faltaData').value = getHojeSTR(); document.getElementById('faltaDataFim').value = ''; document.getElementById('faltaTipo').value = 'Falta'; document.getElementById('faltaDescontarDia').checked = true; document.getElementById('faltaDescontarPassagem').checked = true; document.getElementById('btnSalvarFalta').innerText = "Gravar Registro"; document.getElementById('btnCancelEditFalta').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistFaltas(funcId); document.getElementById('modalFormFalta').style.display = 'flex';
    }
    function salvarFalta() {
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
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); }
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
                if(db.configGerais.diasFuncionamento.includes(d.getDay().toString())) { diasUteisFalta++; groups[mY].dsrSemanas.add(getWeekNumber(d)); }
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
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value;
        document.getElementById('atrasoAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
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
        const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('atrasoEditId').value;
        const data = document.getElementById('atrasoData').value; if(!data) return alert("Informe a data do atraso.");
        const horaPrevista = document.getElementById('atrasoPrevisto').value;
        const horaChegada = document.getElementById('atrasoChegada').value;
        const novo = { type: 'atraso', funcId: funcId, data: data, horaPrevista: horaPrevista, horaChegada: horaChegada, minutos: minutosEntreHorarios(horaPrevista, horaChegada), observacao: document.getElementById('atrasoObs').value, adminId: document.getElementById('atrasoAdmin').value };
        if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); }
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

    function abrirModalFerias(editId = null) {
        fecharModal('modalAcoesFunc'); const funcId = document.getElementById('acoesFuncId').value; document.getElementById('feriasAdmin').innerHTML = getAdminOptions(db.administradores.length > 0 ? db.administradores[0].id : '');
        let areaEdit = document.getElementById('areaEditFerias');
        if(editId) { let r = db.registros.find(x => x.id === editId); document.getElementById('feriasEditId').value = editId; document.getElementById('feriasData').value = r.data; document.getElementById('feriasDataFim').value = r.dataFim; document.getElementById('feriasRetorno').value = r.retorno; document.getElementById('feriasAdmin').value = r.adminId; document.getElementById('btnSalvarFerias').innerText = "Salvar Edição"; document.getElementById('btnCancelEditFerias').style.display = 'block'; areaEdit.classList.add('edit-highlight'); } 
        else { document.getElementById('feriasEditId').value = ''; document.getElementById('feriasData').value = getHojeSTR(); document.getElementById('feriasDataFim').value = ''; document.getElementById('feriasRetorno').value = ''; document.getElementById('btnSalvarFerias').innerText = "Gravar Férias"; document.getElementById('btnCancelEditFerias').style.display = 'none'; areaEdit.classList.remove('edit-highlight'); }
        renderizarHistFerias(funcId); document.getElementById('modalFormFerias').style.display = 'flex';
    }
    function salvarFerias() { const funcId = document.getElementById('acoesFuncId').value; const editId = document.getElementById('feriasEditId').value; const novo = { type: 'ferias', funcId: funcId, data: document.getElementById('feriasData').value, dataFim: document.getElementById('feriasDataFim').value, retorno: document.getElementById('feriasRetorno').value, adminId: document.getElementById('feriasAdmin').value }; if(editId) { let r = db.registros.find(x => x.id === editId); if(r) { Object.assign(r, novo); r.editadoEm = Date.now(); r.id = editId; } } else { novo.id = 'reg_'+Date.now(); db.registros.push(novo); } salvarBanco(); abrirModalFerias(null); renderizarLista(); }
    function renderizarHistFerias(funcId) { let box = document.getElementById('listaHistoricoFerias'); let html = ''; let regs = db.registros.filter(r => r.type === 'ferias' && r.funcId === funcId).sort((a,b) => new Date(b.data) - new Date(a.data)); if(regs.length === 0) { box.innerHTML = '<div style="color:#999; text-align:center;">Nenhum registro.</div>'; return; } regs.forEach(r => { let msgEdit = r.editadoEm ? `<span style="color:#d32f2f; font-size:9px;">(Editado por ${getAdminNome(r.adminId)})</span>` : `<span style="color:#666; font-size:10px;">(Resp: ${getAdminNome(r.adminId)})</span>`; html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ddd; padding:5px 0;"><div>De <b>${formatDataBR(r.data)}</b> a <b>${formatDataBR(r.dataFim)}</b><br><span style="color:#F57F17; font-size:11px; font-weight:bold;">Volta: ${formatDataBR(r.retorno)}</span><br>${msgEdit}</div><div><button style="background:none; border:none; cursor:pointer; font-size:16px;" onclick="abrirModalFerias('${r.id}')">✏️</button> <button style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:16px;" onclick="excluirRegistro('${r.id}', 'ferias')">🗑️</button></div></div>`; }); box.innerHTML = html; }

    function excluirRegistro(id, tela) { if(confirm("Apagar registro?")) { db.registros = db.registros.filter(r => r.id !== id); salvarBanco(); let funcId = document.getElementById('acoesFuncId').value; if(tela === 'adiantamento') renderizarHistAdiantamento(funcId); else if(tela === 'falta') renderizarHistFaltas(funcId); else if(tela === 'atraso') renderizarHistAtrasos(funcId); else if(tela === 'ferias') renderizarHistFerias(funcId); else if(tela === 'presenca') renderizarPresencasPendentes(funcId); renderizarLista(); } }

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
    function gerarResumo() {
        const box = document.getElementById('resultadoResumo'); if(!box) return;
        const intervalo = obterIntervaloResumo();
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
        box.innerHTML = `<div class="resumo-periodo-label">${escapeHTML(intervalo.label)}</div><div class="resumo-grid">
            <div class="resumo-card"><strong>${ativos.length}</strong><span>funcionários ativos</span></div>
            <div class="resumo-card"><strong>${faltaram.size}</strong><span>funcionários com ausência (${faltas.length} registros)</span></div>
            <div class="resumo-card"><strong>${atrasos.length}</strong><span>atrasos registrados${minutosAtraso ? ` (${minutosAtraso} min)` : ''}</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(totalExtrasLancados)}</strong><span>${extras.length} extras lançados no período</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(totalPagoExtras)}</strong><span>pago para extras (${pagamentosExtras.length} pagamentos)</span></div>
            <div class="resumo-card"><strong>R$ ${formatMoeda(totalAdiantamentos)}</strong><span>adiantamentos (${adiantamentos.length} lançamentos)</span></div>
        </div>`;
    }

    function abrirConfigContracheque() {
        if(itensSelecionados.size === 0) return alert("Selecione funcionários!");
        document.getElementById('contraMesRef').value = getHojeSTR().substring(0, 7);
        document.getElementById('contraDescontoPassagem').value = 'padrao';
        gerarPreviaContracheque();
        document.getElementById('modalContracheque').style.display = 'flex';
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

    function calcularValesCombustivelMes(f, ano, mes) {
        const rotaObj = (db.configGerais.valesTransporte || []).find(v => v.rota === f.vtRota);
        if(!rotaObj) return { passagens: 0, total: 0 };
        const diasBase = contarDiasEmpresaNoMes(ano, mes);
        const faltas = db.registros
            .filter(r => r.type === 'falta' && r.funcId === f.id && r.descontarPassagem)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, ano, mes), 0);
        const ferias = db.registros
            .filter(r => r.type === 'ferias' && r.funcId === f.id)
            .reduce((acc, r) => acc + contarDiasUteisRegistroNoMes(r, ano, mes), 0);
        const passagens = Math.max(0, (diasBase - faltas - ferias) * 2);
        return { passagens, total: passagens * parseMoeda(rotaObj.valor) };
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

    function gerarPreviaContracheque() {
        const box = document.getElementById('areaContracheque'); if(!box) return;
        const mesRef = document.getElementById('contraMesRef').value || getHojeSTR().substring(0, 7);
        const [ano, mes] = mesRef.split('-').map(Number);
        const modoPassagem = document.getElementById('contraDescontoPassagem').value || 'padrao';
        const funcs = Array.from(itensSelecionados)
            .map(id => db.funcionarios.find(x => x.id === id))
            .filter(f => f && !f.arquivado)
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));

        if(funcs.length === 0) { box.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhum funcionário ativo selecionado.</div>'; return; }

        let totalLiquido = 0;
        let html = '';
        funcs.forEach((f) => {
            const salario = parseMoeda(f.salario || db.configGerais.salarioMinimo);
            const gratificacao = parseMoeda(f.gratificacao);
            const salarioFamilia = parseMoeda(f.salFamilia);
            const unidentis = parseMoeda(f.unidentis);
            const vales = calcularValesCombustivelMes(f, ano, mes);
            const baseInss = salario + gratificacao;
            const inssCalc = calcularINSSPrevia(baseInss);
            const inss = inssCalc.valor;
            let descontoPassagem = Math.min(salario * 0.06, vales.total);
            if(modoPassagem === 'nao') descontoPassagem = 0;
            if(modoPassagem === 'total') descontoPassagem = vales.total;
            const proventos = salario + gratificacao + salarioFamilia + vales.total;
            const descontos = unidentis + descontoPassagem + inss;
            const liquido = proventos - descontos;
            totalLiquido += liquido;
            const nomeSocial = f.nomeSocial ? `<div style="font-size:11px; color:#666;">Nome social: ${escapeHTML(f.nomeSocial)}</div>` : '';
            html += `<div style="border:1px solid #e0e0e0; border-left:4px solid #6A1B9A; border-radius:8px; padding:10px; margin-bottom:10px; background:#fff;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
                    <div><strong>${escapeHTML(f.nome || 'Sem nome')}</strong>${nomeSocial}<div style="font-size:11px; color:#777;">${escapeHTML(getExtensoMes(mes))} de ${ano} • ${vales.passagens} passagens</div></div>
                    <strong style="color:#6A1B9A; white-space:nowrap;">R$ ${formatMoeda(liquido)}</strong>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
                    <div style="background:#f8fbf8; border-radius:6px; padding:8px;"><b style="color:#2E7D32;">Proventos</b><br>Salário: R$ ${formatMoeda(salario)}<br>Gratificação: R$ ${formatMoeda(gratificacao)}<br>Vales-combustível: R$ ${formatMoeda(vales.total)}<br>Salário Família: R$ ${formatMoeda(salarioFamilia)}</div>
                    <div style="background:#fff8f8; border-radius:6px; padding:8px;"><b style="color:#D32F2F;">Descontos</b><br>Passagem: R$ ${formatMoeda(descontoPassagem)}<br>INSS estimado (${formatPercentual(inssCalc.aliquotaEfetiva)}%): R$ ${formatMoeda(inss)}<br>Desc. Unidentis: R$ ${formatMoeda(unidentis)}<br>Total descontos: R$ ${formatMoeda(descontos)}</div>
                </div>
            </div>`;
        });

        box.innerHTML = `<div style="background:#F3E5F5; color:#4A148C; padding:10px; border-radius:8px; font-weight:bold; margin-bottom:10px; display:flex; justify-content:space-between;"><span>${funcs.length} funcionário(s)</span><span>Total líquido: R$ ${formatMoeda(totalLiquido)}</span></div>${html}`;
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
