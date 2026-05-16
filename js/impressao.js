// IMPRESSÕES E VT
    let arrVTParaImprimir = [];
    function abrirAjusteVT() { if(itensSelecionados.size === 0) return alert("Selecione os funcionários!"); document.getElementById('vtMesRef').value = getHojeSTR().substring(0,7); document.getElementById('vtDataPagto').value = getHojeSTR(); gerarListaAjusteVT(); document.getElementById('modalPrintVT').style.display = 'flex'; }
    function gerarListaAjusteVT() {
        let box = document.getElementById('areaListaAjusteVT'); let html = ''; arrVTParaImprimir = [];
        let mesRef = document.getElementById('vtMesRef').value; if(!mesRef) return;
        let ano = parseInt(mesRef.split('-')[0]); let mes = parseInt(mesRef.split('-')[1]);
        let diasNoMes = new Date(ano, mes, 0).getDate();
        let diasUteis = 0; for(let d=1; d<=diasNoMes; d++) { let dt = new Date(ano, mes-1, d); if(db.configGerais.diasFuncionamento.includes(dt.getDay().toString())) diasUteis++; }
        
        let mesAnt = mes - 1; let anoAnt = ano; if(mesAnt === 0) { mesAnt = 12; anoAnt = ano - 1; } let mesAntStr = `${anoAnt}-${String(mesAnt).padStart(2,'0')}`;

        Array.from(itensSelecionados)
            .map(id => db.funcionarios.find(x => x.id === id))
            .filter(f => f && !f.arquivado && f.vtRota)
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
            .forEach(f => {
            const id = f.id;
            let rotaObj = (db.configGerais.valesTransporte || []).find(v => v.rota === f.vtRota); if(!rotaObj) return;
            
            let passagensPorDia = 2; let passagensMes = diasUteis * passagensPorDia;
            
            // Abater Faltas em DIAS UTEIS do mes anterior
            let faltasAnt = db.registros.filter(r => r.type === 'falta' && r.funcId === id && r.descontarPassagem && r.data.startsWith(mesAntStr)).reduce((acc, r) => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; let diasUteisFalta = 0; for(let d=new Date(d1); d<=d2; d.setDate(d.getDate()+1)) { if(db.configGerais.diasFuncionamento.includes(d.getDay().toString())) diasUteisFalta++; } return acc + diasUteisFalta; }, 0);
            
            // Abater Ferias em DIAS UTEIS do mes atual
            let feriasMesAt = db.registros.filter(r => r.type === 'ferias' && r.funcId === id).reduce((acc, r) => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; let diasFeriasUteis = 0; for(let d=new Date(d1); d<=d2; d.setDate(d.getDate()+1)) { if(d.getFullYear()===ano && (d.getMonth()+1)===mes && db.configGerais.diasFuncionamento.includes(d.getDay().toString())) diasFeriasUteis++; } return acc + diasFeriasUteis; }, 0);

            let descontoPassagens = (faltasAnt + feriasMesAt) * passagensPorDia; let passagensFinais = Math.max(0, passagensMes - descontoPassagens);
            let valorUnit = parseMoeda(rotaObj.valor); let valTotal = passagensFinais * valorUnit;
            arrVTParaImprimir.push({ id: f.id, codigo: f.codigo || '', nome: f.nome, rota: rotaObj.rota, valorUnit: valorUnit, passagens: passagensFinais, valTotal: valTotal });
            
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #ddd;">
                <div style="flex:1;"><strong>${escapeHTML(f.nome)}</strong><br><small>${escapeHTML(rotaObj.rota)} (R$ ${formatMoeda(valorUnit)})<br>Base: ${passagensMes} | Desc.: -${descontoPassagens}</small></div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; font-size:12px;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <label style="margin:0; color:#555;">Passagens:</label>
                        <input type="number" id="vt_pass_${f.id}" value="${passagensFinais}" style="width:60px; padding:6px; text-align:center; border:1px solid #ccc; border-radius:4px;" onchange="atualizarArrVT('${f.id}', 'passagens', this.value)">
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <label style="margin:0; color:#555;">Valor (R$):</label>
                        <input type="text" id="vt_val_${f.id}" value="${formatMoeda(valTotal)}" style="width:60px; padding:6px; text-align:center; border:1px solid #ccc; border-radius:4px;" oninput="maskMoeda(this)" onchange="atualizarArrVT('${f.id}', 'valor', this.value)">
                    </div>
                </div>
            </div>`;
        });
        if(arrVTParaImprimir.length === 0) html = "<div style='padding:15px;'>Nenhum funcionário selecionado possui rota de VT configurada.</div>";
        box.innerHTML = html;
    }
    function atualizarArrVT(id, campo, val) { 
        let obj = arrVTParaImprimir.find(x => x.id === id); if(!obj) return;
        if(campo === 'passagens') { obj.passagens = parseInt(val) || 0; obj.valTotal = obj.passagens * obj.valorUnit; document.getElementById(`vt_val_${id}`).value = formatMoeda(obj.valTotal); } 
        else { obj.valTotal = parseMoeda(val); }
    }
    function getEmpresaPrint() { return db.empresa.razao || db.empresa.fantasia || 'EMPRESA'; }
    function getEnderecoEmpresaPrint() {
        const rua = [db.empresa.rua, db.empresa.numero].filter(Boolean).join(', ');
        return [rua, db.empresa.bairro].filter(Boolean).join(', ');
    }
    function getFuncaoPrint(funcaoId) {
        const funcao = db.funcoes.find(fn => fn.id === funcaoId);
        if(!funcao) return '';
        const numero = String(funcao.numero || '').trim();
        const nome = String(funcao.nome || '').toUpperCase();
        return numero ? `${numero.padStart(3, '0')} - ${nome}` : nome;
    }
    function getMesAnoExtensoPrint(mesRef) {
        const [ano, mes] = mesRef.split('-');
        return { ano, mes: getExtensoMes(parseInt(mes)).toLowerCase() };
    }
    function formatDataExtensoPrint(dataStr, cidade = '') {
        const partes = String(dataStr || '').split('-');
        if(partes.length !== 3) return cidade ? `${cidade}, ${dataStr || ''}` : (dataStr || '');
        const [ano, mes, dia] = partes;
        const cidadePrefixo = cidade ? `${cidade}, ` : '';
        return `${cidadePrefixo}${dia} de ${getExtensoMes(parseInt(mes)).toLowerCase()} de ${ano}`;
    }
    function quebrarPaginas(lista, tamanho) {
        const paginas = [];
        for(let i = 0; i < lista.length; i += tamanho) paginas.push(lista.slice(i, i + tamanho));
        return paginas;
    }
    function getLayoutAssinaturaPrint(lista) {
        const maiorNome = Math.max(0, ...lista.map(item => String(item.nome || '').length));
        const nomeMm = Math.min(104, Math.max(76, Math.ceil(maiorNome * 1.9)));
        const fontPx = maiorNome > 52 ? 14 : (maiorNome > 44 ? 14.7 : 15.5);
        return { nomeMm, fontPx };
    }
    function executarPrintVT() {
        if(arrVTParaImprimir.length === 0) return alert("Nada para imprimir.");
        let mesRefVT = document.getElementById('vtMesRef').value;
        let { ano, mes } = getMesAnoExtensoPrint(mesRefVT);
        let empresa = getEmpresaPrint();
        let cidade = db.empresa.cidade || 'Cabedelo';
        let dataFolha = document.getElementById('vtDataPagto').value || getHojeSTR();
        let logoHtml = db.empresa.logo
            ? `<img class="logo-vt" src="${db.empresa.logo}">`
            : `<div class="logo-vt-texto">${escapeHTML(db.empresa.fantasia || '')}</div>`;
        const itensOrdenados = [...arrVTParaImprimir].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        const paginas = quebrarPaginas(itensOrdenados, 16);
        let w = window.open('','_blank'); let html = `<html><head><title>Recibo VT</title><style>
            @page{size:A4 portrait;margin:10mm;}
            body{font-family:"Times New Roman",serif;color:#000;margin:0;font-size:16px;}
            .vt-folha{height:277mm;border:4px double #000;box-sizing:border-box;padding:3mm 7mm 5mm;display:flex;flex-direction:column;page-break-after:always;}
            .vt-folha:last-child{page-break-after:auto;}
            .vt-topo{text-align:center;font-weight:bold;}
            .logo-vt{max-height:28mm;max-width:58mm;object-fit:contain;display:block;margin:0 auto 1mm;}
            .logo-vt-texto{min-height:14mm;font-size:20px;display:flex;align-items:center;justify-content:center;text-transform:uppercase;color:#5d3434;}
            .vt-razao{font-size:20px;line-height:1.1;}
            .vt-cnpj{font-size:16px;margin-top:2px;}
            .titulo-vt{font-size:17px;text-align:center;font-weight:bold;margin-top:7mm;}
            .texto-vt{font-size:16px;line-height:1.65;text-align:justify;margin-top:4mm;text-indent:0;}
            .lista-vt{margin-top:3mm;}
            .linha-vt{display:grid;grid-template-columns:var(--nome-col,92mm) 7mm 18mm 1fr;column-gap:0;align-items:end;min-height:8.6mm;font-size:var(--linha-font,15.5px);}
            .linha-vt .nome,.linha-vt .valor,.linha-vt .moeda{border-bottom:1.5px solid #000;padding:0 3px 2px;}
            .linha-vt .nome{white-space:nowrap;}
            .linha-vt .assinatura{border-bottom:1.5px solid #000;margin-left:10px;padding:0 3px 2px;}
            .linha-vt .moeda{text-align:left;padding-left:4px;}
            .linha-vt .valor{text-align:right;padding-right:8px;}
            .rodape-vt{margin-top:auto;font-size:16px;}
            .data-vt{text-align:right;font-weight:bold;margin-bottom:13mm;}
            .assinatura-diretor-vt{width:72mm;border-top:1px solid #000;text-align:center;margin:0 auto;padding-top:3px;}
        </style></head><body>`;
        paginas.forEach((pagina) => {
            const layout = getLayoutAssinaturaPrint(pagina);
            html += `<section class="vt-folha" style="--nome-col:${layout.nomeMm}mm;--linha-font:${layout.fontPx}px;"><div class="vt-topo">${logoHtml}<div class="vt-razao">${escapeHTML(empresa)}</div><div class="vt-cnpj">CNPJ ${escapeHTML(db.empresa.cnpj || '')}</div></div><div class="titulo-vt">Folha de Pagamento dos Vales-Combustível</div><div class="texto-vt">Ao assinar esta folha, declaro que recebi da empresa supracitada a importância referente aos <b>vales-combustível</b> do mês de <b>${escapeHTML(mes)} de ${escapeHTML(ano)}</b>, que é <b>preferência minha recebê-los em dinheiro e que tenho ciência de que há previsão para tal na Convenção Coletiva da Categoria.</b></div><div class="lista-vt">`;
            pagina.forEach((item) => {
                html += `<div class="linha-vt"><div class="nome">${escapeHTML(item.nome)}</div><div class="moeda">R$</div><div class="valor">${formatMoeda(item.valTotal)}</div><div class="assinatura"></div></div>`;
            });
            html += `</div><div class="rodape-vt"><div class="data-vt">${escapeHTML(formatDataExtensoPrint(dataFolha, cidade))}</div><div class="assinatura-diretor-vt">Assinatura do Diretor</div></div></section>`;
        });
        html += '</body></html>'; w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintVT');
    }

    function abrirConfigQuinzena() { if(itensSelecionados.size === 0) return alert("Selecione funcionários!"); document.getElementById('quinzenaMesRef').value = getHojeSTR().substring(0,7); document.getElementById('quinzenaDataPagto').value = getHojeSTR(); document.getElementById('modalPrintQuinzena').style.display = 'flex'; }
    function executarPrintQuinzena() {
        let quinzBase = parseMoeda(db.configGerais.adiantamentoQuinzena || "0");
        let mesRef = document.getElementById('quinzenaMesRef').value; if(!mesRef) return; let ano = mesRef.split('-')[0]; let mesNum = mesRef.split('-')[1]; let dataPgto = document.getElementById('quinzenaDataPagto').value || getHojeSTR(); let cidade = db.empresa.cidade || 'Cidade';
        let itensQuinzena = Array.from(itensSelecionados).map(id => {
            let f = db.funcionarios.find(x => x.id === id); if(!f || f.arquivado) return;
            let valFinal = quinzBase;
            return { nome: f.nome, valor: valFinal };
        }).filter(Boolean).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        if(itensQuinzena.length === 0) return alert("Nenhum funcionário ativo selecionado para imprimir.");
        const paginas = quebrarPaginas(itensQuinzena, 16);
        let logoHtml = db.empresa.logo ? `<img class="logo-quinzena" src="${db.empresa.logo}">` : `<div class="logo-quinzena-texto">${escapeHTML(db.empresa.fantasia || 'NOME DA EMPRESA')}</div>`;
        let w = window.open('','_blank'); 
        let html = `<html><head><title>Quinzena</title><style>
            @page{size:A4 portrait;margin:10mm;}
            body{font-family:"Times New Roman",serif;color:#000;margin:0;font-size:16px;}
            .quinzena-folha{height:277mm;border:4px double #000;box-sizing:border-box;padding:3mm 7mm 6mm;display:flex;flex-direction:column;page-break-after:always;}
            .quinzena-folha:last-child{page-break-after:auto;}
            .logo-area{text-align:center;font-weight:bold;}
            .logo-quinzena{max-height:28mm;max-width:70mm;object-fit:contain;display:block;margin:0 auto 1mm;}
            .logo-quinzena-texto{min-height:18mm;font-size:28px;display:flex;align-items:center;justify-content:center;font-weight:normal;}
            .sub-empresa{font-size:18px;line-height:1.15;}
            .cnpj-empresa{font-size:16px;margin-top:2px;}
            .titulo-doc{font-size:18px;font-weight:bold;margin:8mm 0 5mm;text-align:center;}
            .texto-declara{font-size:16px;margin-bottom:8mm;text-align:justify;line-height:1.35;}
            .lista-quinzena{margin-top:0;}
            .linha-quinzena{display:grid;grid-template-columns:var(--nome-col,92mm) 7mm 18mm 1fr;column-gap:0;align-items:end;min-height:8.6mm;font-size:var(--linha-font,15.5px);}
            .linha-quinzena .nome,.linha-quinzena .moeda,.linha-quinzena .valor{border-bottom:1.5px solid #000;padding:0 3px 2px;}
            .linha-quinzena .nome{white-space:nowrap;}
            .linha-quinzena .moeda{text-align:left;padding-left:4px;}
            .linha-quinzena .valor{text-align:right;padding-right:8px;}
            .linha-quinzena .assinatura{border-bottom:1.5px solid #000;margin-left:10px;padding:0 3px 2px;}
            .rodape-data{text-align:right;margin-top:auto;font-size:17px;font-weight:bold;padding-right:8mm;}
        </style></head><body>`;
        paginas.forEach((pagina) => {
            const layout = getLayoutAssinaturaPrint(pagina);
            html += `<section class="quinzena-folha" style="--nome-col:${layout.nomeMm}mm;--linha-font:${layout.fontPx}px;"><div class="logo-area">${logoHtml}<div class="sub-empresa">${escapeHTML(db.empresa.razao || '')}</div><div class="cnpj-empresa">CNPJ ${escapeHTML(db.empresa.cnpj || '')}</div></div>`;
            html += `<div class="titulo-doc">FOLHA DE PAGAMENTO DE ADIANTAMENTO DA QUINZENA</div>`;
            html += `<div class="texto-declara">Ao assinar esta folha, declaro que recebi, da empresa supracitada, a importância respectiva a cada colaborador em adiantamento do salário do mês de <b>${escapeHTML(getExtensoMes(mesNum).toUpperCase())} DE ${escapeHTML(ano)}</b>.</div><div class="lista-quinzena">`;
            pagina.forEach((item) => {
                html += `<div class="linha-quinzena"><div class="nome">${escapeHTML(item.nome)}</div><div class="moeda">R$</div><div class="valor">${formatMoeda(item.valor)}</div><div class="assinatura"></div></div>`;
            });
            html += `</div><div class="rodape-data">${escapeHTML(formatDataExtensoPrint(dataPgto, cidade))}</div></section>`;
        });
        html += `</body></html>`;
        w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintQuinzena');
    }

    function abrirConfigPonto() { if(itensSelecionados.size === 0) return alert("Selecione funcionários!"); document.getElementById('pontoMesRef').value = getHojeSTR().substring(0,7); document.getElementById('modalPrintPonto').style.display = 'flex'; }
    function executarPrintPonto() {
        let mesRef = document.getElementById('pontoMesRef').value; if(!mesRef) return; let ano = parseInt(mesRef.split('-')[0]); let mes = parseInt(mesRef.split('-')[1]); let diasNoMes = new Date(ano, mes, 0).getDate();
        let w = window.open('','_blank'); let html = `<html><head><title>Folha de Ponto</title><style>
            @page{size:A4 portrait;margin:10mm 8mm 8mm 8mm;}
            html,body{margin:0;padding:0;color:#000;}
            body{font-family:"Times New Roman",serif;font-size:12px;line-height:1.15;}
            .folha{width:100%;box-sizing:border-box;break-after:page;page-break-after:always;}
            .folha:last-child{break-after:auto;page-break-after:auto;}
            .cabecalho-ponto{display:grid;grid-template-columns:52% 48%;border:2px solid #000;border-bottom:0;}
            .cab-left{border-right:2px solid #000;}
            .titulo-ponto,.periodo-ponto{height:22px;border-bottom:2px solid #000;display:flex;align-items:center;box-sizing:border-box;}
            .titulo-ponto{justify-content:center;background:#d0d0d0;font-weight:bold;font-size:15px;letter-spacing:.2px;}
            .periodo-ponto{justify-content:space-around;padding:0 12px;font-size:14px;}
            .empresa-dados{padding:4px 5px;border-bottom:2px solid #000;min-height:62px;box-sizing:border-box;font-size:13px;}
            .func-dados{padding:4px 5px;min-height:61px;box-sizing:border-box;font-size:13px;}
            .func-nome{font-weight:bold;font-size:14px;margin-bottom:5px;}
            .quadro-horarios{width:100%;border-collapse:collapse;margin-top:5px;font-size:12px;}
            .quadro-horarios th,.quadro-horarios td{border:0;padding:2px 8px;text-align:left;white-space:nowrap;}
            .quadro-horarios th{font-size:13px;font-weight:bold;}
            .quadro-horarios .centro{text-align:center;}
            .tabela-ponto{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;border:2px solid #000;}
            .tabela-ponto th,.tabela-ponto td{border:2px solid #000;text-align:center;padding:0 2px;height:5.35mm;box-sizing:border-box;font-weight:normal;}
            .tabela-ponto thead th{height:6mm;font-size:12px;}
            .tabela-ponto .assinatura{text-align:left;padding-left:4px;}
            .rodape-ponto{font-size:13px;margin-top:10mm;padding:0 10mm;}
            .rodape-linhas{display:grid;grid-template-columns:70mm 70mm;justify-content:space-between;align-items:start;margin-top:12mm;gap:24mm;}
            .data-ponto{display:flex;align-items:flex-start;gap:4px;white-space:nowrap;}
            .data-campo{display:inline-block;border-bottom:1.5px solid #000;height:13px;vertical-align:top;}
            .data-campo.curto{width:12mm;}
            .data-campo.longo{width:24mm;}
            .diretor-ponto{text-align:center;}
            .linha-diretor{display:block;width:65mm;border-top:1.5px solid #000;margin:13px auto 3px;}
        </style></head><body>`;
        const diasSemanaNome = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const diasSemanaFull = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const ordemSemana = [1, 2, 3, 4, 5, 6, 0];
        const cidadeUf = [db.empresa.cidade, db.empresa.uf].filter(Boolean).join(' / ');
        const endereco = getEnderecoEmpresaPrint();
        let folhasGeradas = 0;
        Array.from(itensSelecionados).forEach((id) => {
            let f = db.funcionarios.find(x => x.id === id); if(!f || f.arquivado) return;
            folhasGeradas++;
            let hsOrigem = f.horarios || {};
            let hs = { entrada: hsOrigem.entrada || '07:00', saida: hsOrigem.saida || '17:00', intEnt: hsOrigem.intEnt || '11:00', intSai: hsOrigem.intSai || '12:00', folgas: Array.isArray(hsOrigem.folgas) ? hsOrigem.folgas : [] };
            let expedHtml = '<table class="quadro-horarios"><thead><tr><th>Dia</th><th>Expediente</th><th>Intervalo</th></tr></thead><tbody>';
            ordemSemana.forEach((realDw) => {
                let isAberto = db.configGerais.diasFuncionamento.includes(realDw.toString());
                let isFolga = (hs.folgas || []).includes(realDw.toString());
                if(!isAberto || isFolga) expedHtml += `<tr><td>${diasSemanaFull[realDw]}</td><td class="centro" colspan="2">Folga</td></tr>`;
                else expedHtml += `<tr><td>${diasSemanaFull[realDw]}</td><td>${hs.entrada} às ${hs.saida}</td><td>${hs.intEnt && hs.intSai ? `${hs.intEnt} às ${hs.intSai}` : ''}</td></tr>`;
            });
            expedHtml += '</tbody></table>';
            
            let feriasFunc = db.registros.filter(r => r.type === 'ferias' && r.funcId === id);
            html += `<section class="folha"><div class="cabecalho-ponto"><div class="cab-left"><div class="titulo-ponto">FOLHA DE PONTO DIÁRIA</div><div class="empresa-dados"><div><b>Empresa:</b> <strong>${escapeHTML(db.empresa.razao || '')}</strong></div><div><b>CNPJ:</b> ${escapeHTML(db.empresa.cnpj || '')}</div><div><b>Endereço:</b> ${escapeHTML(endereco)}</div><div><b>Cidade/UF:</b> ${escapeHTML(cidadeUf)}</div></div><div class="func-dados"><div class="func-nome">${f.codigo ? `${escapeHTML(f.codigo)} - ` : ''}${escapeHTML(String(f.nome || '').toUpperCase())}</div><div><b>Função:</b> ${escapeHTML(getFuncaoPrint(f.funcao))}</div><div><b>CTPS:</b> ${escapeHTML(f.ctps || '')} &nbsp;&nbsp; <b>Serviço:</b> ${escapeHTML(db.empresa.razao || '')}</div><div><b>Admissão:</b> ${formatDataBR(f.admissao)}</div></div></div><div class="cab-right"><div class="periodo-ponto"><b>Período:</b><strong>01/${String(mes).padStart(2,'0')}/${ano}</strong><b>a</b><strong>${String(diasNoMes).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}</strong></div>${expedHtml}</div></div><table class="tabela-ponto"><colgroup><col style="width:4%;"><col style="width:5%;"><col style="width:9%;"><col style="width:10%;"><col style="width:10%;"><col style="width:9%;"><col style="width:10%;"><col style="width:10%;"><col style="width:33%;"></colgroup><thead><tr><th rowspan="2" colspan="2">Dias</th><th rowspan="2">Entrada</th><th colspan="2">Intervalo</th><th rowspan="2">Saída</th><th colspan="2">Hora Extra</th><th rowspan="2">Assinatura</th></tr><tr><th>Saída</th><th>Entrada</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>`;
            for(let d=1; d<=diasNoMes; d++) { 
                let dt = new Date(ano, mes-1, d); let diaW = dt.getDay(); 
                let isAberto = db.configGerais.diasFuncionamento.includes(diaW.toString()); 
                let isFolga = (hs.folgas || []).includes(diaW.toString()); 
                let emFerias = false;
                feriasFunc.forEach(r => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; if(dt >= d1 && dt <= d2) emFerias = true; });
                if(emFerias) {
                    html += `<tr><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td colspan="6">Em férias</td><td class="assinatura"></td></tr>`;
                } else if(!isAberto || isFolga) {
                    html += `<tr class="tr-off"><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td><td class="assinatura"></td></tr>`;
                } else {
                    html += `<tr><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="assinatura">x</td></tr>`;
                }
            }
            html += `</tbody></table><div class="rodape-ponto"><div>Reconheço a exatidão destas anotações.</div><div class="rodape-linhas"><div class="data-ponto"><b>Data:</b><span class="data-campo curto"></span>/<span class="data-campo curto"></span>/<span class="data-campo longo"></span></div><div class="diretor-ponto"><span class="linha-diretor"></span><div>Assinatura do Diretor</div></div></div></div></section>`;
        });
        if(folhasGeradas === 0) { w.close(); return alert("Nenhum funcionário ativo selecionado para imprimir."); }
        html += '</body></html>'; w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintPonto');
    }
