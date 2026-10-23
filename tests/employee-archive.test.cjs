const {test}=require('node:test'),assert=require('node:assert/strict'),{client}=require('./helpers.cjs');
function setup(){const c=client();c.run("adminSessaoId='a';renderizarLista=()=>{};salvarBanco=()=>{};");return c;}
test('archive belongs only to the editing form, never employee quick actions or management list',()=>{
 const c=setup();c.run("abrirGerenciar('funcionarios')");assert(!c.e('conteudoListagem').innerHTML.includes('arquivarFuncionario('));
 const html=require('node:fs').readFileSync('index.html','utf8');assert(!html.includes('btnArquivarFuncAcoes'));assert(html.includes('btnArquivoFuncCadastro'));
 c.run("configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',db.funcionarios[0],'cadastro')");assert.equal(c.e('btnArquivoFuncCadastro').hidden,false);assert.match(c.e('btnArquivoFuncCadastro').innerHTML,/Arquivar funcionário/);
 c.run("db.funcionarios[0].arquivado=true;configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',db.funcionarios[0],'cadastro')");assert.match(c.e('btnArquivoFuncCadastro').innerHTML,/Restaurar funcionário/);
});
test('canceling archive leaves employee and history intact; confirming preserves history',()=>{
 const c=setup();c.run("db.registros.push({id:'r',funcId:'f',type:'adiantamento',valor:50});cliqueItem('f')");const before=c.get();c.ctx.confirm=()=>false;c.run("arquivarFuncionario('f','cadastro')");assert.deepEqual(c.get(),before);
 c.ctx.confirm=()=>true;c.run("arquivarFuncionario('f','cadastro')");assert.equal(c.get().funcionarios[0].arquivado,true);assert.deepEqual(c.get().registros,before.registros);assert.equal(c.e('modalAcoesFunc').style.display,'none');
 c.run("restaurarFuncionario('f','cadastro')");assert.equal(c.get().funcionarios[0].arquivado,false);assert.deepEqual(c.get().registros,before.registros);
});
test('archive requires both permissions enforced by the server and is absent for a new employee',()=>{
 const c=setup();c.run("db.administradores[0].permissoes.vinculoHorarios=false;configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',db.funcionarios[0],'cadastro');arquivarFuncionario('f','cadastro')");assert.equal(c.e('btnArquivoFuncCadastro').hidden,true);assert(!c.get().funcionarios[0].arquivado);
 c.run("configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',undefined,'cadastro')");assert.equal(c.e('btnArquivoFuncCadastro').hidden,true);
});
