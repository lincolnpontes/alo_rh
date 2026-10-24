const {test}=require('node:test');
const assert=require('node:assert/strict');
const {client}=require('./helpers.cjs');

function restricted(){
    const c=client();
    c.run("adminSessaoId='a';for(const key of Object.keys(db.administradores[0].permissoes))db.administradores[0].permissoes[key]=false;");
    return c;
}

test('tools menu exposes accountant reports and general time off only with their existing permissions',()=>{
    const c=restricted();c.run('atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderInformes').style.display,'none');
    assert.equal(c.e('btnHeaderFolga').style.display,'none');
    assert.equal(c.e('btnHeaderPendentes').style.display,'none');
    c.run('db.administradores[0].permissoes.acessoResumo=true;atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderInformes').style.display,'flex');
    assert.equal(c.e('btnHeaderFolga').style.display,'none');
    c.run('db.administradores[0].permissoes.gerarVT=true;atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderFolga').style.display,'flex');
    assert.equal(c.e('btnHeaderPendentes').style.display,'none');
});

test('pending payments remain available to either payroll or weekly-payment operators',()=>{
    const c=restricted();
    c.run('db.administradores[0].permissoes.registrarPresencaSemanal=true;atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderPendentes').style.display,'flex');
    c.run('db.administradores[0].permissoes.registrarPresencaSemanal=false;db.administradores[0].permissoes.gerarContracheque=true;atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderPendentes').style.display,'flex');
    c.run('db.administradores[0].permissoes.gerarContracheque=false;atualizarVisibilidadePermissoes()');
    assert.equal(c.e('btnHeaderPendentes').style.display,'none');
});

test('direct calls to the moved tools still reject a profile without access',()=>{
    const c=restricted(),before=c.get();
    c.run('abrirInformesContador();abrirModalFolgaGeral();abrirPagamentosPendentes()');
    assert.equal(c.alerts.length,3);
    assert.notEqual(c.e('modalInformesContador').style.display,'flex');
    assert.notEqual(c.e('modalFolgaGeral').style.display,'flex');
    assert.notEqual(c.e('modalPagamentosPendentes').style.display,'flex');
    assert.deepEqual(c.get(),before);
});

test('weekly attendance shortcut retains its permission in the employee and selection views',()=>{
    const c=restricted();
    c.run("db.categorias[0].semanal=true;db.categorias[0].tipoPagamento='semanal';itensSelecionados.add('f');atualizarAcoesMassa();cliqueItem('f')");
    assert.equal(c.e('btnAcaoMassaSemana').style.display,'none');
    assert.equal(c.e('btnPagarExtra').style.display,'none');
    c.run("db.administradores[0].permissoes.registrarPresencaSemanal=true;atualizarAcoesMassa();cliqueItem('f')");
    assert.equal(c.e('btnAcaoMassaSemana').style.display,'flex');
    assert.equal(c.e('btnPagarExtra').style.display,'block');
});
