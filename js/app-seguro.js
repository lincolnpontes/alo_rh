(function(global){
    let initial=true;
    function lock(message=''){
        global.RHCabecalho?.close(false);
        document.body.classList.add('rh-locked');document.getElementById('rhAccess').hidden=false;
        document.querySelectorAll('.modal-overlay').forEach(el=>el.style.display='none');
        if(message)RHSync.status(message,'error');
    }
    async function entered(result){
        adminSessaoId=RHAuth.profile().id;sessionStorage.setItem('alorh_admin_sessao',adminSessaoId);
        let migrated=false;
        if(initial){await RHSync.init(result);initial=false;migrated=RHStore.legacyPreserved();}
        else await RHSync.init(result);
        document.body.classList.remove('rh-locked');document.getElementById('rhAccess').hidden=true;
        document.getElementById('actionBar').style.display='grid';initDiasFiltro();atualizarAcoesMassa();renderizarFiltros();renderizarLista();aplicarTemaApp();atualizarLogoTopo();atualizarBoxPerfilAdmin();atualizarVisibilidadePermissoes();
        if(migrated)alert('A cópia da versão anterior deste aparelho foi preservada. Se havia alterações sem enviar, confira em Configurações Avançadas → Cópias locais anteriores antes de continuar. Os dados exibidos agora vêm do banco atualizado.');
    }
    async function start(){
        prepararModaisNoTopo();document.getElementById('splashScreen').style.display='none';lock();
        document.getElementById('rhSyncStatus').onclick=()=>RHSync.conflicts();
        try{await RHAuth.start(entered);}catch(e){document.getElementById('rhAccess').append(Object.assign(document.createElement('p'),{textContent:e.message}));}
    }
    async function switchProfile(){if(RHSync.pending())return alert('Sincronize ou resolva as alterações pendentes antes de trocar o perfil.');try{await RHAuth.leave();lock();await RHAuth.showProfiles(entered);}catch(e){alert(e.message);}}
    global.RHApp={start,lock,switchProfile,expired:message=>{lock(message);RHAuth.login(entered).catch(()=>{});}};
})(window);
