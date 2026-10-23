(function(global){
    'use strict';
    const trigger=document.getElementById('btnHeaderMais'),menu=document.getElementById('menuHeaderMais'),profileButton=document.getElementById('btnPerfilAtivo');
    const items=()=>[...menu.querySelectorAll('[role=menuitem]')].filter(item=>item.style.display!=='none'&&!item.disabled);
    function close(restore=true){
        if(menu.hidden)return;menu.hidden=true;trigger.setAttribute('aria-expanded','false');
        if(restore)trigger.focus();
    }
    function open(last=false){
        atualizarVisibilidadePermissoes();menu.hidden=false;trigger.setAttribute('aria-expanded','true');
        const available=items();(last?available[available.length-1]:available[0])?.focus();
    }
    function update(){
        const name=global.RHAuth?.profile()?.nome||getAdminAtual()?.nome||'Perfil';
        document.getElementById('nomePerfilAtivo').textContent=name;
        profileButton.setAttribute('aria-label','Perfil ativo: '+name+'. Trocar perfil');profileButton.title='Trocar perfil: '+name;
    }
    trigger.addEventListener('click',()=>menu.hidden?open():close());
    trigger.addEventListener('keydown',event=>{
        if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}
    });
    menu.addEventListener('keydown',event=>{
        const available=items(),index=available.indexOf(document.activeElement);
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
        else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
            event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?available.length-1:(index+(event.key==='ArrowDown'?1:-1)+available.length)%available.length;available[next]?.focus();
        }
    });
    document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!event.target.closest('.header-more-anchor'))close(false);});
    document.addEventListener('focusin',event=>{if(!menu.hidden&&!event.target.closest('.header-more-anchor'))close(false);});
    profileButton.addEventListener('click',()=>close(false));
    global.RHCabecalho={close,update};
})(window);
