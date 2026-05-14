// IMPRESSÕES E VT
    let arrVTParaImprimir = [];
    function abrirAjusteVT() { if(itensSelecionados.size === 0) return alert("Selecione os funcionários!"); document.getElementById('vtMesRef').value = getHojeSTR().substring(0,7); gerarListaAjusteVT(); document.getElementById('modalPrintVT').style.display = 'flex'; }
    function gerarListaAjusteVT() {
        let box = document.getElementById('areaListaAjusteVT'); let html = ''; arrVTParaImprimir = [];
        let mesRef = document.getElementById('vtMesRef').value; if(!mesRef) return;
        let ano = parseInt(mesRef.split('-')[0]); let mes = parseInt(mesRef.split('-')[1]);
        let diasNoMes = new Date(ano, mes, 0).getDate();
        let diasUteis = 0; for(let d=1; d<=diasNoMes; d++) { let dt = new Date(ano, mes-1, d); if(db.configGerais.diasFuncionamento.includes(dt.getDay().toString())) diasUteis++; }
        
        let mesAnt = mes - 1; let anoAnt = ano; if(mesAnt === 0) { mesAnt = 12; anoAnt = ano - 1; } let mesAntStr = `${anoAnt}-${String(mesAnt).padStart(2,'0')}`;

        Array.from(itensSelecionados).forEach(id => {
            let f = db.funcionarios.find(x => x.id === id); if(!f || !f.vtRota) return;
            let rotaObj = (db.configGerais.valesTransporte || []).find(v => v.rota === f.vtRota); if(!rotaObj) return;
            
            let passagensPorDia = 2; let passagensMes = diasUteis * passagensPorDia;
            
            // Abater Faltas em DIAS UTEIS do mes anterior
            let faltasAnt = db.registros.filter(r => r.type === 'falta' && r.funcId === id && r.descontarPassagem && r.data.startsWith(mesAntStr)).reduce((acc, r) => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; let diasUteisFalta = 0; for(let d=new Date(d1); d<=d2; d.setDate(d.getDate()+1)) { if(db.configGerais.diasFuncionamento.includes(d.getDay().toString())) diasUteisFalta++; } return acc + diasUteisFalta; }, 0);
            
            // Abater Ferias em DIAS UTEIS do mes atual
            let feriasMesAt = db.registros.filter(r => r.type === 'ferias' && r.funcId === id).reduce((acc, r) => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; let diasFeriasUteis = 0; for(let d=new Date(d1); d<=d2; d.setDate(d.getDate()+1)) { if(d.getFullYear()===ano && (d.getMonth()+1)===mes && db.configGerais.diasFuncionamento.includes(d.getDay().toString())) diasFeriasUteis++; } return acc + diasFeriasUteis; }, 0);

            let descontoPassagens = (faltasAnt + feriasMesAt) * passagensPorDia; let passagensFinais = Math.max(0, passagensMes - descontoPassagens);
            let valorUnit = parseMoeda(rotaObj.valor); let valTotal = passagensFinais * valorUnit;
            arrVTParaImprimir.push({ id: f.id, nome: f.nome, rota: rotaObj.rota, valorUnit: valorUnit, passagens: passagensFinais, valTotal: valTotal });
            
            html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #ddd;">
                <div style="flex:1;"><strong>${f.nome}</strong><br><small>${rotaObj.rota} (R$ ${formatMoeda(valorUnit)})<br>Base: ${passagensMes} | Desc.: -${descontoPassagens}</small></div>
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
    function executarPrintVT() {
        if(arrVTParaImprimir.length === 0) return alert("Nada para imprimir."); let mesStr = document.getElementById('vtMesRef').value.split('-').reverse().join('/');
        let w = window.open('','_blank'); let html = `<html><head><title>Recibo VT</title><style>body{font-family:Arial,sans-serif;} .recibo{border: 1px solid #000; padding: 15px; margin-bottom: 20px; width: 45%; display: inline-block; vertical-align: top; margin-right: 2%; box-sizing:border-box;} h3{margin: 0 0 10px 0; text-align:center;} .linha{display:flex; justify-content:space-between; margin-bottom:5px; font-size:13px; border-bottom: 1px dotted #ccc;} .page-break { page-break-after: always; }</style></head><body>`;
        arrVTParaImprimir.forEach((item, idx) => { let brk = (idx > 0 && idx % 4 === 0) ? 'class="page-break"' : ''; html += `<div class="recibo" ${brk}><h3>RECIBO DE VALE TRANSPORTE</h3><div style="font-size:12px; text-align:center; margin-bottom:10px;">Referência: ${mesStr}</div><div style="font-size:14px; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #000; padding-bottom:5px;">${item.nome}</div><div class="linha"><span>Rota</span><span>${item.rota}</span></div><div class="linha"><span>Qtd. Passagens</span><span>${item.passagens}</span></div><div style="font-weight:bold; font-size:16px; border-top: 2px solid #000; padding-top:5px; margin-top:10px; display:flex; justify-content:space-between;"><span>TOTAL:</span><span>R$ ${formatMoeda(item.valTotal)}</span></div><br><div style="margin-top: 30px; border-top: 1px solid #000; text-align:center; font-size:12px; width: 80%; margin-left: 10%;">Assinatura do Funcionário</div></div>`; });
        html += '</body></html>'; w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintVT');
    }

    function abrirConfigQuinzena() { if(itensSelecionados.size === 0) return alert("Selecione funcionários!"); document.getElementById('quinzenaMesRef').value = getHojeSTR().substring(0,7); document.getElementById('quinzenaDataPagto').value = getHojeSTR(); document.getElementById('modalPrintQuinzena').style.display = 'flex'; }
    function executarPrintQuinzena() {
        let mesRef = document.getElementById('quinzenaMesRef').value; if(!mesRef) return; let ano = mesRef.split('-')[0]; let mesNum = mesRef.split('-')[1]; let dataPgto = document.getElementById('quinzenaDataPagto').value; let cidade = db.empresa.cidade || 'Cidade';
        let ids = Array.from(itensSelecionados); let w = window.open('','_blank'); 
        let html = `<html><head><title>Quinzena</title><style>body{font-family:Arial,sans-serif; margin:20px; padding:20px; border:2px solid #000;} .logo-area{text-align:center; margin-bottom:10px;} .logo-area img{max-height:80px; margin-bottom:10px;} .titulo-empresa{font-size:22px; font-weight:bold; margin:0;} .sub-empresa{font-size:14px; font-weight:bold; margin:5px 0;} .titulo-doc{font-size:18px; font-weight:bold; margin:20px 0; text-align:center;} .texto-declara{font-size:14px; margin-bottom:30px; text-align:justify; line-height:1.5;} .tabela-lista{width:100%; border-collapse:collapse; font-size:14px;} .tabela-lista td{padding:12px 5px; vertical-align:bottom;} .linha-ass{border-bottom:1px solid #000; width:100%; display:inline-block; margin-bottom:2px;} .rodape-data{text-align:right; margin-top:40px; font-size:16px; font-weight:bold;}</style></head><body>`;
        let logoHtml = db.empresa.logo ? `<img src="${db.empresa.logo}">` : `<div class="titulo-empresa">${db.empresa.fantasia || 'NOME DA EMPRESA'}</div>`;
        html += `<div class="logo-area">${logoHtml}<div class="sub-empresa">${db.empresa.razao || ''}</div><div class="sub-empresa">CNPJ ${db.empresa.cnpj || ''}</div></div>`;
        html += `<div class="titulo-doc">FOLHA DE PAGAMENTO DE ADIANTAMENTO DA QUINZENA</div>`;
        html += `<div class="texto-declara">Ao assinar esta folha, declaro que recebi, da empresa supracitada, a importância respectiva a cada colaborador em adiantamento do salário do mês de <b>${getExtensoMes(mesNum).toUpperCase()} DE ${ano}</b>.</div>`;
        html += `<table class="tabela-lista">`;
        let quinzBase = parseMoeda(db.configGerais.adiantamentoQuinzena || "0");
        ids.forEach(id => {
            let f = db.funcionarios.find(x => x.id === id); if(!f) return;
            let valFinal = quinzBase - parseMoeda(f.unidentis || "0");
            html += `<tr><td style="width:40%;">${f.nome}</td><td style="width:15%;">R$ ${formatMoeda(valFinal)}</td><td style="width:45%;"><span class="linha-ass"></span></td></tr>`;
        });
        html += `</table><div class="rodape-data">${cidade}, ${formatDataBR(dataPgto)}</div></body></html>`;
        w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintQuinzena');
    }

    function abrirConfigPonto() { if(itensSelecionados.size === 0) return alert("Selecione funcionários!"); document.getElementById('pontoMesRef').value = getHojeSTR().substring(0,7); document.getElementById('modalPrintPonto').style.display = 'flex'; }
    function executarPrintPonto() {
        let mesRef = document.getElementById('pontoMesRef').value; if(!mesRef) return; let ano = parseInt(mesRef.split('-')[0]); let mes = parseInt(mesRef.split('-')[1]); let diasNoMes = new Date(ano, mes, 0).getDate();
        let w = window.open('','_blank'); let html = `<html><head><title>Folha de Ponto</title><style>body{font-family:Arial,sans-serif; margin:0; padding:10px;} table{width:100%; border-collapse:collapse; margin-bottom: 20px;} th,td{border:1px solid #000; padding:4px; text-align:center; font-size:11px;} .page-break { page-break-after: always; } .cabecalho{display:flex; border:1px solid #000; margin-bottom:5px;} .cab-left{flex:6; padding:5px; border-right:1px solid #000;} .cab-right{flex:4; padding:5px;} .bold{font-weight:bold;} .dias-sem{width:100%; border-collapse:collapse;} .dias-sem td{border:none; text-align:left; font-size:10px; padding:1px;} .tr-off td{background-color:#f0f0f0; color:#555;} </style></head><body>`;
        const diasSemanaNome = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]; const diasSemanaFull = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        Array.from(itensSelecionados).forEach((id, idx) => {
            let f = db.funcionarios.find(x => x.id === id); if(!f) return;
            let funName = db.funcoes.find(fn => fn.id === f.funcao); funName = funName ? funName.nome : '';
            let hs = f.horarios || { entrada: '07:00', saida: '17:00', intEnt: '11:00', intSai: '12:00', folgas: [] };
            let expedHtml = '<table class="dias-sem">';
            for(let dw=1; dw<=7; dw++) { let realDw = dw === 7 ? 0 : dw; let isAberto = db.configGerais.diasFuncionamento.includes(realDw.toString()); let isFolga = (hs.folgas || []).includes(realDw.toString()); let textoH = (!isAberto || isFolga) ? 'Folga' : `${hs.entrada} às ${hs.saida} &nbsp;&nbsp;&nbsp; ${hs.intEnt} às ${hs.intSai}`; expedHtml += `<tr><td>${diasSemanaFull[realDw]}</td><td align="right">${textoH}</td></tr>`; } expedHtml += '</table>';
            
            let feriasFunc = db.registros.filter(r => r.type === 'ferias' && r.funcId === id);

            html += `<div ${idx !== itensSelecionados.size-1 ? 'class="page-break"' : ''}><div class="cabecalho"><div class="cab-left"><div style="background:#ddd; font-weight:bold; text-align:center; padding:2px; border-bottom:1px solid #000; margin:-5px -5px 5px -5px;">FOLHA DE PONTO DIÁRIA</div><div><span class="bold">Empresa:</span> ${db.empresa.razao || ''}</div><div><span class="bold">CNPJ:</span> ${db.empresa.cnpj || ''}</div><div><span class="bold">Endereço:</span> ${db.empresa.rua || ''}, ${db.empresa.numero || ''} - ${db.empresa.bairro || ''}</div><div><span class="bold">Cidade/UF:</span> ${db.empresa.cidade || ''} / ${db.empresa.uf || ''}</div><div style="border-top:1px solid #000; margin:5px -5px 5px -5px;"></div><div><span class="bold">${f.codigo ? f.codigo+' - ' : ''}${f.nome}</span></div><div><span class="bold">Função:</span> ${funName} &nbsp;&nbsp; <span class="bold">Serviço:</span> ${db.empresa.fantasia || ''}</div><div><span class="bold">CTPS:</span> ${f.ctps || ''} &nbsp;&nbsp; <span class="bold">Admissão:</span> ${formatDataBR(f.admissao)}</div></div><div class="cab-right"><div><span class="bold">Período:</span> 01/${String(mes).padStart(2,'0')}/${ano} a ${diasNoMes}/${String(mes).padStart(2,'0')}/${ano}</div><div style="border-top:1px solid #000; margin:5px -5px 5px -5px;"></div>${expedHtml}</div></div><table><tr><th rowspan="2" colspan="2">Dias</th><th rowspan="2">Entrada</th><th colspan="2">Intervalo</th><th rowspan="2">Saída</th><th colspan="2">Hora Extra</th><th rowspan="2">Assinatura</th></tr><tr><th>Saída</th><th>Entrada</th><th>Entrada</th><th>Saída</th></tr>`;
            for(let d=1; d<=diasNoMes; d++) { 
                let dt = new Date(ano, mes-1, d); let diaW = dt.getDay(); 
                let isAberto = db.configGerais.diasFuncionamento.includes(diaW.toString()); 
                let isFolga = (hs.folgas || []).includes(diaW.toString()); 
                
                let emFerias = false;
                feriasFunc.forEach(r => { let d1 = new Date(r.data + "T00:00:00"); let d2 = r.dataFim ? new Date(r.dataFim + "T00:00:00") : d1; if(dt >= d1 && dt <= d2) emFerias = true; });

                if(emFerias) {
                    html += `<tr><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td colspan="6">Em férias</td><td>Em férias</td></tr>`;
                } else if(!isAberto || isFolga) { 
                    html += `<tr class="tr-off"><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td></tr>`; 
                } else { 
                    html += `<tr><td>${String(d).padStart(2,'0')}</td><td>${diasSemanaNome[diaW]}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`; 
                } 
            }
            html += `</table><div style="margin-top:20px; text-align:center;">Reconheço a exatidão destas anotações.<br><br><div style="display:flex; justify-content:space-between; margin-top:30px; padding:0 20px;"><div>Data: ___/___/______</div><div style="width:250px; border-top:1px solid #000; padding-top:5px;">Assinatura do Diretor</div></div></div></div>`;
        });
        html += '</body></html>'; w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); fecharModal('modalPrintPonto');
    }
