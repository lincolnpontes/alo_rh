const {test}=require('node:test'),assert=require('node:assert/strict'),{client}=require('./helpers.cjs');
function setup(){const c=client();c.run("adminSessaoId='a';renderizarLista=()=>{};salvarBanco=()=>{};");return c;}
test('employee management list has no archive shortcut; employee details do',()=>{
 const c=setup();c.run("abrirGerenciar('funcionarios')");assert(!c.e('conteudoListagem').innerHTML.includes('arquivarFuncionario('));
 c.run("configurarAcaoArquivoFuncionario('btnArquivarFuncAcoes',db.funcionarios[0],'acoes')");assert.equal(c.e('btnArquivarFuncAcoes').hidden,false);assert.match(c.e('btnArquivarFuncAcoes').innerHTML,/Arquivar funcionário/);
 c.run("db.funcionarios[0].arquivado=true;configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',db.funcionarios[0],'cadastro')");assert.match(c.e('btnArquivoFuncCadastro').innerHTML,/Restaurar funcionário/);
});
test('canceling archive leaves employee and history intact; confirming preserves history',()=>{
 const c=setup();c.run("db.registros.push({id:'r',funcId:'f',type:'adiantamento',valor:50});cliqueItem('f')");const before=c.get();c.ctx.confirm=()=>false;c.run("arquivarFuncionario('f','acoes')");assert.deepEqual(c.get(),before);
 c.ctx.confirm=()=>true;c.run("arquivarFuncionario('f','acoes')");assert.equal(c.get().funcionarios[0].arquivado,true);assert.deepEqual(c.get().registros,before.registros);assert.equal(c.e('modalAcoesFunc').style.display,'none');
 c.run("restaurarFuncionario('f','acoes')");assert.equal(c.get().funcionarios[0].arquivado,false);assert.deepEqual(c.get().registros,before.registros);
});
test('archive requires both permissions enforced by the server and is absent for a new employee',()=>{
 const c=setup();c.run("db.administradores[0].permissoes.vinculoHorarios=false;configurarAcaoArquivoFuncionario('btnArquivarFuncAcoes',db.funcionarios[0],'acoes');arquivarFuncionario('f','acoes')");assert.equal(c.e('btnArquivarFuncAcoes').hidden,true);assert(!c.get().funcionarios[0].arquivado);
 c.run("configurarAcaoArquivoFuncionario('btnArquivoFuncCadastro',undefined,'cadastro')");assert.equal(c.e('btnArquivoFuncCadastro').hidden,true);
});
