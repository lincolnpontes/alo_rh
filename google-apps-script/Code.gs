const APP_ID = 'alorh';
const CAMINHO_PASTA_DADOS = ['Apps', 'Alô RH'];
const ARQUIVO_BANCO = 'banco.json';
const PROPRIEDADE_TOKEN = 'ALO_RH_SYNC_TOKEN';

function doGet(e) {
  return responderJson_(e, function() {
    validarToken_(e);
    return lerBanco_();
  });
}

function doPost(e) {
  return responderJson_(e, function() {
    validarToken_(e);
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'salvar_banco') throw new Error('Acao invalida.');
    const banco = normalizarBanco_(payload.dados);
    const bancoSalvo = salvarBanco_(banco);
    return { ok: true, app_id: APP_ID, salvoEm: new Date().toISOString(), resumo: resumoBanco_(bancoSalvo) };
  });
}

function criarTokenDeSincronizacao() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(PROPRIEDADE_TOKEN, token);
  Logger.log('Token do Alo RH: ' + token);
  Logger.log('Depois de implantar, cole no app: SUA_URL_DO_WEB_APP?token=' + token);
}

function lerBanco_() {
  const arquivo = obterArquivoBanco_();
  const conteudo = arquivo.getBlob().getDataAsString('UTF-8');
  if (!conteudo) return criarBancoBase_();
  try {
    return normalizarBanco_(JSON.parse(conteudo));
  } catch (erro) {
    throw new Error('Banco salvo no Drive esta invalido.');
  }
}

function salvarBanco_(banco) {
  const atual = lerBanco_();
  const mesclado = mesclarBancos_(atual, banco);
  const arquivo = obterArquivoBanco_();
  arquivo.setContent(JSON.stringify(normalizarBanco_(mesclado)));
  return mesclado;
}

function obterArquivoBanco_() {
  const pasta = obterPastaDados_();
  const arquivos = pasta.getFilesByName(ARQUIVO_BANCO);
  if (arquivos.hasNext()) return arquivos.next();
  return pasta.createFile(ARQUIVO_BANCO, JSON.stringify(criarBancoBase_()), MimeType.PLAIN_TEXT);
}

function obterPastaDados_() {
  let pastaAtual = DriveApp.getRootFolder();
  CAMINHO_PASTA_DADOS.forEach(function(nome) {
    const encontradas = pastaAtual.getFoldersByName(nome);
    pastaAtual = encontradas.hasNext() ? encontradas.next() : pastaAtual.createFolder(nome);
  });
  return pastaAtual;
}

function validarToken_(e) {
  const tokenConfigurado = PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_TOKEN);
  if (!tokenConfigurado) throw new Error('Token nao configurado no Apps Script.');
  const tokenRecebido = e && e.parameter ? e.parameter.token : '';
  if (!tokenRecebido || tokenRecebido !== tokenConfigurado) throw new Error('Token invalido.');
}

function responderJson_(e, executar) {
  try {
    return json_(e, executar());
  } catch (erro) {
    return json_(e, { ok: false, erro: erro.message || String(erro) });
  }
}

function json_(e, dados) {
  const texto = JSON.stringify(dados);
  const callback = e && e.parameter ? e.parameter.callback : '';
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + texto + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(texto)
    .setMimeType(ContentService.MimeType.JSON);
}

function criarBancoBase_() {
  return {
    app_id: APP_ID,
    empresa: { logo: '', razao: '', fantasia: '', cnpj: '', rua: '', numero: '', bairro: '', cidade: '', uf: 'PB' },
    categorias: [],
    funcoes: [],
    funcionarios: [],
    administradores: [],
    auditoria: [],
    configGerais: { salarioMinimo: '1621,00', adiantamentoQuinzena: '500,00', diasAquisitivoFerias: 360, diasFuncionamento: ['1','2','3','4','5','6'], valesTransporte: [], motivosAdiantamento: [], inssFaixas: criarTabelaINSSPadrao_(), folgasGerais: [] },
    registros: [],
    configs: { dadosBaixados: false, ultimaMudancaLocal: 0, registrosExcluidos: {} }
  };
}

function criarTabelaINSSPadrao_() {
  return [
    { limite: '1621,00', aliquota: '7,5' },
    { limite: '2902,84', aliquota: '9' },
    { limite: '4354,27', aliquota: '12' },
    { limite: '8475,55', aliquota: '14' }
  ];
}

function temDadosNegocio_(banco) {
  const b = normalizarBanco_(banco);
  const empresa = b.empresa || {};
  const empresaPreenchida = ['logo','razao','fantasia','cnpj','rua','numero','bairro','cidade'].some(function(chave) {
    return String(empresa[chave] || '').trim() !== '';
  });
  return empresaPreenchida
    || b.categorias.length > 0
    || b.funcoes.length > 0
    || b.funcionarios.length > 0
    || b.administradores.length > 0
    || b.registros.length > 0
    || b.configGerais.valesTransporte.length > 0
    || b.configGerais.motivosAdiantamento.length > 0;
}

function resumoBanco_(banco) {
  const b = normalizarBanco_(banco);
  return {
    funcionarios: b.funcionarios.length,
    classes: b.categorias.length,
    funcoes: b.funcoes.length,
    lancamentos: b.registros.length
  };
}

function timestampRegistro_(registro) {
  return Number((registro && (registro._syncAtualizadoEm || registro.editadoEm || registro.criadoEm)) || 0);
}

function mesclarRegistros_(atual, novo) {
  const a = normalizarBanco_(atual);
  const n = normalizarBanco_(novo);
  const exclusoes = Object.assign({}, a.configs.registrosExcluidos || {});
  Object.keys(n.configs.registrosExcluidos || {}).forEach(function(id) {
    exclusoes[id] = Math.max(Number(exclusoes[id] || 0), Number(n.configs.registrosExcluidos[id] || 0));
  });

  const porId = {};
  function considerar(registro) {
    if (!registro || !registro.id) return;
    const atualizadoEm = timestampRegistro_(registro);
    if (Number(exclusoes[registro.id] || 0) >= atualizadoEm) return;
    if (!porId[registro.id] || atualizadoEm >= timestampRegistro_(porId[registro.id])) {
      porId[registro.id] = registro;
    }
  }
  a.registros.forEach(considerar);
  n.registros.forEach(considerar);

  return {
    registros: Object.keys(porId).map(function(id) { return porId[id]; }),
    registrosExcluidos: exclusoes
  };
}

function mesclarAuditoria_(atual, novo) {
  const a = normalizarBanco_(atual);
  const n = normalizarBanco_(novo);
  const porId = {};
  a.auditoria.forEach(function(item) { if (item && item.id) porId[item.id] = item; });
  n.auditoria.forEach(function(item) { if (item && item.id) porId[item.id] = item; });
  return Object.keys(porId)
    .map(function(id) { return porId[id]; })
    .sort(function(x, y) { return Number(y.data || 0) - Number(x.data || 0); })
    .slice(0, 700);
}

function mesclarBancos_(atual, novo) {
  const a = normalizarBanco_(atual);
  const n = normalizarBanco_(novo);
  const atualTemDados = temDadosNegocio_(a);
  const novoTemDados = temDadosNegocio_(n);
  const atualTs = Number(a.configs.ultimaMudancaLocal || 0);
  const novoTs = Number(n.configs.ultimaMudancaLocal || 0);

  let base = a;
  if (!atualTemDados && novoTemDados) base = n;
  else if (atualTemDados && !novoTemDados) base = a;
  else base = novoTs >= atualTs ? n : a;

  const mesclaRegistros = mesclarRegistros_(a, n);
  const final = normalizarBanco_(base);
  final.registros = mesclaRegistros.registros;
  final.auditoria = mesclarAuditoria_(a, n);
  final.configs.registrosExcluidos = mesclaRegistros.registrosExcluidos;
  final.configs.ultimaMudancaLocal = Math.max(atualTs, novoTs);
  return final;
}

function normalizarBanco_(dados) {
  const base = criarBancoBase_();
  const origem = dados && typeof dados === 'object' ? dados : {};
  const banco = Object.assign({}, base, origem);
  banco.empresa = Object.assign({}, base.empresa, origem.empresa || {});
  banco.configGerais = Object.assign({}, base.configGerais, origem.configGerais || {});
  banco.configs = Object.assign({}, base.configs, origem.configs || {});
  banco.app_id = APP_ID;
  banco.categorias = Array.isArray(banco.categorias) ? banco.categorias : [];
  banco.funcoes = Array.isArray(banco.funcoes) ? banco.funcoes : [];
  banco.funcionarios = Array.isArray(banco.funcionarios) ? banco.funcionarios : [];
  banco.administradores = Array.isArray(banco.administradores) ? banco.administradores : [];
  banco.auditoria = Array.isArray(banco.auditoria) ? banco.auditoria : [];
  banco.registros = Array.isArray(banco.registros) ? banco.registros : [];
  banco.configGerais.diasFuncionamento = Array.isArray(banco.configGerais.diasFuncionamento) ? banco.configGerais.diasFuncionamento : ['1','2','3','4','5','6'];
  banco.configGerais.valesTransporte = Array.isArray(banco.configGerais.valesTransporte) ? banco.configGerais.valesTransporte : [];
  banco.configGerais.motivosAdiantamento = Array.isArray(banco.configGerais.motivosAdiantamento) ? banco.configGerais.motivosAdiantamento : [];
  banco.configGerais.inssFaixas = Array.isArray(banco.configGerais.inssFaixas) && banco.configGerais.inssFaixas.length ? banco.configGerais.inssFaixas : criarTabelaINSSPadrao_();
  banco.configGerais.folgasGerais = Array.isArray(banco.configGerais.folgasGerais) ? banco.configGerais.folgasGerais : [];
  banco.configGerais.diasAquisitivoFerias = Math.max(1, Math.min(370, Number(banco.configGerais.diasAquisitivoFerias || 360)));
  var camposFuncionarioPadrao = { pedirVT: true, pedirGratificacao: true, pedirSalFamilia: true, pedirUnidentis: true, pedirDescontoPassagem: true, pedirINSS: true, temControlePonto: true };
  banco.categorias = banco.categorias.map(function(categoria) {
    var c = categoria || {};
    c.tipoPagamento = c.tipoPagamento || (c.semanal ? 'semanal' : (c.recebeContracheque === false ? 'mensal_sem_carteira' : 'contracheque'));
    c.semanal = c.tipoPagamento === 'semanal';
    c.camposFuncionario = Object.assign({}, camposFuncionarioPadrao, c.camposFuncionario || {});
    c.temQuinquenio = c.temQuinquenio === true;
    c.temFerias = c.tipoPagamento === 'semanal' ? false : c.temFerias !== false;
    c.recebeQuinzena = c.recebeQuinzena !== false;
    c.recebeContracheque = c.tipoPagamento === 'contracheque';
    return c;
  });
  banco.funcionarios = banco.funcionarios.map(function(funcionario) {
    var f = funcionario || {};
    f.recebeQuinquenio = f.recebeQuinquenio === true;
    f.qtdQuinquenios = Math.max(1, Math.min(9, Number(f.qtdQuinquenios || 1)));
    f.recebeQuinzena = f.recebeQuinzena !== false;
    f.recebeContracheque = f.recebeContracheque !== false;
    f.temGratificacao = f.temGratificacao !== false;
    f.temSalFamilia = f.temSalFamilia !== false;
    f.temUnidentis = f.temUnidentis !== false;
    f.descontaPassagem = f.descontaPassagem !== false;
    f.descontaINSS = f.descontaINSS !== false;
    f.temControlePonto = f.temControlePonto !== false;
    f.temFerias = f.temFerias !== false;
    return f;
  });
  banco.configs.registrosExcluidos = banco.configs.registrosExcluidos && typeof banco.configs.registrosExcluidos === 'object' ? banco.configs.registrosExcluidos : {};
  delete banco.configs.url;
  delete banco.configs.senhaAdmin;
  delete banco.configs.senhaAdminHash;
  delete banco.configs.senhaAdminSalt;
  delete banco.configs.senhaAdminLegada;
  delete banco.configs.segurancaVersao;
  banco.configs.dadosBaixados = false;
  return banco;
}
