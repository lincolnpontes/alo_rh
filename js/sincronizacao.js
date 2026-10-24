// Transporte autenticado e fila persistente em sync-seguro.js.
    async function solicitarAcessoAvancado() {
        if(!await RHAuth.settings()) return;
        fecharModal('modalPainelUnificado');
        document.getElementById('modalConfigAvancadas').style.display = 'flex';
    }
    function abrirHistoricoAcessos() { return RHAuth.accessHistory(); }
    function atualizarTextoSincronizacao(texto) { RHSync.status(texto); }
    function sincronizarAoEntrar() { return RHSync.sync(); }
    function sincronizarFundo() { return RHSync.sync(); }
    function sincronizarRegistrosTempoReal() { return RHSync.sync(); }
    function iniciarSyncRegistrosTempoReal() { /* Agendamento centralizado em RHSync. */ }
    async function forcarSincronizacaoManual() { if(await RHSync.sync()) alert('Sincronização confirmada.'); }
    async function testarSincronizacao() { try { const r=await RHAuth.request('status'); alert('Conexão autenticada. Revisão: '+r.revision); } catch(e) { alert(e.message); } }
    function salvarURL() { alert('A URL é definida em js/config.js para evitar conectar esta cópia ao banco errado.'); }
    async function forcarEnvioNuvemCompleto() {
        if(!await RHAuth.settings()) return;
        if(!await RHSync.sync()) return alert('Resolva as pendências antes de criar o backup remoto.');
        try { await RHAuth.request('backup'); alert('Cópia independente criada na pasta de backups do servidor.'); } catch(e) { alert(e.message); }
    }
    function resumoBancoSync(banco) { return `${banco.funcionarios.length} funcionários e ${banco.registros.length} lançamentos`; }

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
        return (!tipo || tipo === 'n') && v.textContent !== '' ? Number(v.textContent) : (v.textContent || '');
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
            return linha.map(v => v ?? '');
        });
    }

    function valorDaLinha(row, mapa, nomes) {
        for(const nome of nomes) {
            const idx = mapa[normalizarCabecalhoPlanilha(nome)];
            if(idx !== undefined) return String(row[idx] ?? '').trim();
        }
        return '';
    }

    function prepararImportacaoFuncionarios(linhas, original, vigencia) {
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(vigencia)) throw new Error('Informe a competência no formato AAAA-MM.');
        const anterior=db; db=normalizarBanco(RHProtocol.clone(original));
        try {
            const mapa = {};
            linhas[0].forEach((cab, idx) => { mapa[normalizarCabecalhoPlanilha(cab)] = idx; });
            if(mapa[normalizarCabecalhoPlanilha('Nome')]===undefined)throw new Error('A planilha precisa da coluna Nome.');
            let criados = 0, atualizados = 0, ignorados = 0; const vistos = new Set();
            linhas.slice(1).forEach((row) => {
                const nome = valorDaLinha(row, mapa, ['Nome']);
                if(!nome) { ignorados++; return; }
                const codigo = valorDaLinha(row, mapa, ['Código', 'Codigo']);
                const cpf = valorDaLinha(row, mapa, ['CPF']);
                const matches = db.funcionarios.filter(f => (codigo && String(f.codigo || '') === codigo) || (cpf && String(f.cpf || '').replace(/\D/g,'') === cpf.replace(/\D/g,'')));
                if(matches.length>1) throw new Error('Código e CPF apontam para cadastros diferentes: '+nome);
                const existente=matches[0];
                const nomeVinculo=valorDaLinha(row,mapa,['Vínculo','Vinculo']);
                const vinculoId = existente && !nomeVinculo ? existente.categoria : obterOuCriarVinculoImportado(nomeVinculo);
                const nomeFuncao=valorDaLinha(row,mapa,['Função','Funcao']), numeroFuncao=valorDaLinha(row,mapa,['Função Nº','Funcao Nº','Funcao N','Função N']);
                const funcaoId = existente && !nomeFuncao && !numeroFuncao ? existente.funcao : obterOuCriarFuncaoImportada(nomeFuncao,numeroFuncao);
                const chaveLinha=existente?.id||codigo||cpf||nome; if(vistos.has(chaveLinha)) throw new Error('Funcionário repetido na planilha: '+nome); vistos.add(chaveLinha);
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
                    rgUF: valorDaLinha(row, mapa, ['RG UF']) || existente?.rgUF || 'PB',
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
                    habFaltas: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Faltas']), existente ? existente.habFaltas !== false : true),
                    habFerias: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Férias', 'Habilitar Ferias']), existente ? existente.habFerias !== false : true),
                    habAtrasos: valorBooleanoImportado(valorDaLinha(row, mapa, ['Habilitar Atrasos', 'Habilitar Atraso']), existente ? existente.habAtrasos !== false : true),
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
                    // Empty cells preserve existing information; erasure belongs to the explicit editor.
                    for(const key of Object.keys(funcionario)) if(funcionario[key] === '' || funcionario[key] === undefined) funcionario[key]=existente[key]??'';
                    for(const key of Object.keys(funcionario.horarios)) if(!funcionario.horarios[key]?.length) funcionario.horarios[key]=existente.horarios?.[key]??funcionario.horarios[key];
                    if(!valorDaLinha(row,mapa,['Vínculo','Vinculo'])) funcionario.categoria=existente.categoria;
                    if(!valorDaLinha(row,mapa,['Função','Funcao','Função Nº','Funcao Nº'])) funcionario.funcao=existente.funcao;
                }
                for(const [field,headers] of [['salario',['Salário','Salario']],['gratificacao',['Gratificação','Gratificacao']],['salFamilia',['Salário Família','Salario Familia','Sal. Família','Sal Familia']],['unidentis',['Desc. Unidentis','Unidentis']]]) {
                    const idx=headers.map(h=>mapa[normalizarCabecalhoPlanilha(h)]).find(i=>i!==undefined);
                    if(idx!==undefined && row[idx]!=='' && row[idx]!==undefined) {
                        const value=parseMoeda(row[idx]); if(value<0) throw new Error('Valor negativo para '+nome);
                        funcionario[field]=formatMoeda(value);
                    }
                }
                if(!existente || parseMoeda(funcionario.salario)!==parseMoeda(existente.salario)) registrarValorHistorico(funcionario, existente ? vigencia : '0000-01', funcionario.salario || db.configGerais.salarioMinimo);
                if(existente) {
                    db.funcionarios[db.funcionarios.findIndex(f => f.id === existente.id)] = funcionario;
                    atualizados++;
                } else {
                    db.funcionarios.push(funcionario);
                    criados++;
                }
            });
            RHProtocol.validate(db);
            return {banco:db,criados,atualizados,ignorados};
        } finally { db=anterior; }
    }

    async function importarFuncionariosXLSX(event) {
        const file=event.target.files[0]; if(!file) return;
        if(!['dadosPessoais','vinculoHorarios','financeiro','configGerais'].every(temPermissaoAtual)) return alert('Este perfil não pode importar funcionários.');
        try {
            if(file.size>8*1024*1024) throw new Error('Planilha muito grande.');
            const linhas=await lerLinhasFuncionariosXLSX(file);
            if(linhas.length<2) throw new Error('Planilha sem funcionários.');
            const vigencia=prompt('Competência de vigência dos salários atualizados (AAAA-MM):',getHojeSTR().slice(0,7)); if(!vigencia)return;
            const preview=prepararImportacaoFuncionarios(linhas,db,vigencia);
            const mudancas=RHProtocol.diff(RHProtocol.clean(db),RHProtocol.clean(preview.banco));
            const detalhes=mudancas.filter(o=>o.entity==='funcionarios').map(o=>{const f=preview.banco.funcionarios.find(f=>f.id===o.id);return `${f?.nome||o.id} · ${o.field==='*'?'novo cadastro':o.field}: ${o.field==='*'?'salário '+(o.after?.salario||''):JSON.stringify(o.before)+' → '+JSON.stringify(o.after)}`;}).join('\n');
            if(!confirm(`Prévia: ${preview.criados} novos, ${preview.atualizados} atualizados. Vigência salarial: ${vigencia}.\n\n${detalhes}\n\nAplicar importação?`))return;
            await RHSync.backup('antes-de-importar-planilha');
            db=preview.banco;salvarBanco();await RHSync.flush();renderizarFiltros();renderizarLista();
            alert('Importação salva neste aparelho. Acompanhe a confirmação na barra de sincronização.');
        } catch(e) { alert('Não foi possível importar: '+e.message); }
        finally { event.target.value=''; }
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

    async function importarDados(event) {
        const file=event.target.files[0]; if(!file) return;
        try {
            if(file.size > 8 * 1024 * 1024) throw new Error('O backup excede o limite de 8 MB.');
            const imported=JSON.parse(await file.text()); RHProtocol.validate(imported);
            if(!await RHAuth.settings()) return;
            await RHSync.restore(imported);
        } catch(e) { alert('Não foi possível restaurar: '+e.message); }
        finally { event.target.value=''; }
    }

    async function excluirTodoHistorico() {
        let frase = document.getElementById('inputExcluirTudo').value.trim().toLowerCase();
        if(frase === "quero excluir todo o histórico") {
            if(!confirm("TEM CERTEZA? Essa acao apaga todos os lancamentos.")) return;
            if(!await RHAuth.settings()) return;
            await RHSync.backup('antes-de-excluir-historico');
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
