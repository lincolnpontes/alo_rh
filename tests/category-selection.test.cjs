const {test}=require('node:test');
const assert=require('node:assert/strict');
const {client,fixture}=require('./helpers.cjs');

function setup(){
    const seed=fixture();
    seed.categorias.push({id:'extra',nome:'Extra com nome completo'}, {id:'empty',nome:'Sem pessoas'});
    seed.funcionarios[0].nome='Nome completo da pessoa';seed.funcionarios[0].nomeSocial='Nome social';
    seed.funcionarios.push({id:'g',nome:'Outra pessoa',categoria:'extra'}, {id:'archived',nome:'Arquivada',categoria:'extra',arquivado:true});
    const c=client(seed);
    c.run("adminSessaoId='a';renderizarLista=()=>atualizarAcoesMassa();");
    c.ctx.window.RHCabecalho={renderCategories:data=>{c.categories=JSON.parse(JSON.stringify(data));}};
    return c;
}

test('category picker starts with everyone and choosing Todos does not change name preference',()=>{
    const c=setup();c.run('renderizarFiltros()');
    assert.equal(c.categories.selected,null);
    assert.equal(c.run('obterFuncionariosListados().length'),2);
    c.run("filtrarCat('extra');filtrarCat(null)");
    assert.equal(c.categories.selected,null);
    assert.equal(c.run('modoNomeLista'),'social');
    assert.equal(c.run('obterFuncionariosListados().length'),2);
});

test('selecting or clearing the visible category preserves selections in another category',()=>{
    const c=setup();
    c.run("itensSelecionados.add('f');filtrarCat('extra');toggleSelecionarTodosListados()");
    assert.equal(c.run("itensSelecionados.has('f')&&itensSelecionados.has('g')"),true);
    assert.equal(c.e('contadorSelecao').textContent,'2 selecionados');
    assert.match(c.e('contadorSelecao').title,/1 fora do filtro atual/);
    c.run('toggleSelecionarTodosListados()');
    assert.equal(c.run("itensSelecionados.has('f')"),true);
    assert.equal(c.run("itensSelecionados.has('g')"),false);
    assert.equal(c.e('contadorSelecao').textContent,'1 selecionado');
    c.run('limparSelecaoFuncionarios()');
    assert.equal(c.run('itensSelecionados.size'),0);
    assert.equal(c.e('contadorSelecao').hidden,true);
});

test('explicit full-name toggle changes only the displayed names',()=>{
    const c=setup();
    c.run("filtrarCat('c');itensSelecionados.add('f');alternarNomesTodos()");
    assert.equal(c.run('categoriaAtual'),'c');
    assert.equal(c.run('getNomeListaFuncionario(db.funcionarios[0])'),'Nome completo da pessoa');
    assert.equal(c.categories.fullNames,true);
    assert.equal(c.run("itensSelecionados.has('f')"),true);
    c.run('alternarNomesTodos()');
    assert.equal(c.run('getNomeListaFuncionario(db.funcionarios[0])'),'Nome social');
    assert.equal(c.run('categoriaAtual'),'c');
});

test('an empty category disables select-all while preserving the true global count',()=>{
    const c=setup();
    c.run("itensSelecionados.add('f');filtrarCat('empty')");
    assert.equal(c.e('btnSelecionarLista').disabled,true);
    assert.equal(c.e('contadorSelecao').textContent,'1 selecionado');
    assert.match(c.e('contadorSelecao').title,/fora do filtro atual/);
    c.run('toggleSelecionarTodosListados()');
    assert.equal(c.run("itensSelecionados.has('f')"),true);
});

test('archived or removed employees do not inflate the selection count',()=>{
    const c=setup();
    c.run("itensSelecionados.add('archived');itensSelecionados.add('missing');atualizarAcoesMassa()");
    assert.equal(c.e('contadorSelecao').hidden,true);
    assert.equal(c.e('btnAcaoMassa1').style.display,'none');
    c.run("itensSelecionados.add('f');atualizarAcoesMassa()");
    assert.equal(c.e('contadorSelecao').textContent,'1 selecionado');
});

test('removing the current category returns to Todos without discarding selection',()=>{
    const c=setup();
    c.run("itensSelecionados.add('f');filtrarCat('extra');db.categorias=db.categorias.filter(cat=>cat.id!=='extra');renderizarFiltros()");
    assert.equal(c.categories.selected,null);
    assert.equal(c.run("itensSelecionados.has('f')"),true);
});
