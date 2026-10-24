(function(global){
    'use strict';
    const trigger=document.getElementById('btnHeaderMais'),menu=document.getElementById('menuHeaderMais'),profileButton=document.getElementById('btnPerfilAtivo');
    const categoryButton=document.getElementById('btnCategoriaAtual'),categoryPopover=document.getElementById('popoverCategorias'),categoryList=document.getElementById('opcoesCategorias'),fullNameButton=document.getElementById('btnNomeCompleto');
    // A lista fica fora da área com overflow:hidden para não ser cortada no celular.
    document.body.append(categoryPopover);
    const items=()=>[...menu.querySelectorAll('[role=menuitem]')].filter(item=>item.style.display!=='none'&&!item.disabled);
    const categoryItems=()=>[...categoryList.querySelectorAll('[role=option]')];
    function closeMore(restore=true){
        if(menu.hidden)return;menu.hidden=true;trigger.setAttribute('aria-expanded','false');
        if(restore)trigger.focus();
    }
    function closeCategories(restore=true){
        if(categoryPopover.hidden)return;
        categoryPopover.hidden=true;categoryButton.setAttribute('aria-expanded','false');
        if(restore)categoryButton.focus();
    }
    function close(restore=true){
        const categoryWasOpen=!categoryPopover.hidden;
        closeCategories(restore);closeMore(restore&&!categoryWasOpen);
    }
    function open(last=false){
        closeCategories(false);
        atualizarVisibilidadePermissoes();menu.hidden=false;trigger.setAttribute('aria-expanded','true');
        const available=items();(last?available[available.length-1]:available[0])?.focus();
    }
    function positionCategories(){
        if(categoryPopover.hidden)return;
        const rect=categoryButton.getBoundingClientRect(),viewport=global.visualViewport;
        const viewportTop=viewport?.offsetTop||0,viewportHeight=viewport?.height||global.innerHeight;
        const margin=8,width=Math.min(340,global.innerWidth-margin*2);
        const below=viewportTop+viewportHeight-rect.bottom-margin-6,above=rect.top-viewportTop-margin-6;
        const placeAbove=below<180&&above>below;
        const available=Math.max(44,Math.min(480,placeAbove?above:below));
        categoryPopover.style.width=width+'px';categoryPopover.style.maxHeight=available+'px';
        categoryPopover.style.left=Math.max(margin,Math.min(rect.left,global.innerWidth-width-margin))+'px';
        const height=categoryPopover.getBoundingClientRect().height;
        categoryPopover.style.top=(placeAbove?Math.max(viewportTop+margin,rect.top-height-6):rect.bottom+6)+'px';
    }
    function focusCategory(option){
        if(!option)return;
        categoryItems().forEach(item=>item.tabIndex=item===option?0:-1);
        option.focus();option.scrollIntoView({block:'nearest'});
    }
    function openCategories(last=false){
        if(document.body.classList.contains('rh-locked'))return;
        closeMore(false);renderizarFiltros();categoryPopover.hidden=false;categoryButton.setAttribute('aria-expanded','true');
        positionCategories();
        const available=categoryItems(),current=available.find(item=>item.getAttribute('aria-selected')==='true');
        focusCategory(last?available[available.length-1]:current||available[0]);
    }
    function renderCategories({categories,selected,fullNames}){
        const current=categories.find(category=>category.id===selected);
        const name=current?.nome||'Todos';
        document.getElementById('nomeCategoriaAtual').textContent=name;
        categoryButton.title='Categoria: '+name;categoryButton.setAttribute('aria-label','Categoria: '+name+'. Escolher categoria');
        fullNameButton.setAttribute('aria-checked',String(fullNames));
        const focusedId=document.activeElement?.dataset?.categoryId;
        const available=[{id:null,nome:'Todos os vínculos',cor:'#6b8b7c'},...categories];
        categoryList.replaceChildren(...available.map(category=>{
            const option=document.createElement('button');option.type='button';option.className='category-option';option.tabIndex=category.id===selected?0:-1;
            option.dataset.categoryId=category.id??'';option.setAttribute('role','option');option.setAttribute('aria-selected',String(category.id===selected));
            const color=document.createElement('span');color.className='category-option-color';color.setAttribute('aria-hidden','true');color.style.setProperty('--category-color',category.cor);
            const label=document.createElement('span');label.className='category-option-name';label.textContent=category.nome;
            const check=document.createElement('span');check.className='category-option-check';check.setAttribute('aria-hidden','true');check.textContent=category.id===selected?'✓':'';
            option.append(color,label,check);
            option.addEventListener('click',()=>{closeCategories();filtrarCat(category.id);});
            return option;
        }));
        if(!categoryPopover.hidden){
            positionCategories();
            if(focusedId!==undefined)focusCategory(categoryItems().find(item=>item.dataset.categoryId===focusedId));
        }
    }
    function update(){
        const name=global.RHAuth?.profile()?.nome||getAdminAtual()?.nome||'Perfil';
        document.getElementById('nomePerfilAtivo').textContent=name;
        profileButton.setAttribute('aria-label','Perfil ativo: '+name+'. Trocar perfil');profileButton.title='Trocar perfil: '+name;
    }
    trigger.addEventListener('click',()=>menu.hidden?open():closeMore());
    trigger.addEventListener('keydown',event=>{
        if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}
    });
    menu.addEventListener('keydown',event=>{
        const available=items(),index=available.indexOf(document.activeElement);
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMore();}
        else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
            event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?available.length-1:(index+(event.key==='ArrowDown'?1:-1)+available.length)%available.length;available[next]?.focus();
        }
    });
    categoryButton.addEventListener('click',()=>categoryPopover.hidden?openCategories():closeCategories());
    categoryButton.addEventListener('keydown',event=>{
        if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openCategories(event.key==='ArrowUp');}
    });
    let categorySearch='',categorySearchTime=0;
    const searchable=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
    categoryList.addEventListener('keydown',event=>{
        const available=categoryItems(),index=available.indexOf(document.activeElement);
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
            event.preventDefault();
            const next=event.key==='Home'?0:event.key==='End'?available.length-1:(index+(event.key==='ArrowDown'?1:-1)+available.length)%available.length;
            focusCategory(available[next]);
        }else if(event.key.length===1&&event.key!==' '&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
            event.preventDefault();const now=Date.now();categorySearch=now-categorySearchTime>700?'':categorySearch;categorySearchTime=now;categorySearch+=searchable(event.key);
            const ordered=[...available.slice(index+1),...available.slice(0,index+1)];
            const match=ordered.find(item=>searchable(item.querySelector('.category-option-name').textContent).startsWith(categorySearch));
            if(match)focusCategory(match);
        }
    });
    categoryPopover.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeCategories();}});
    fullNameButton.addEventListener('click',()=>alternarNomesTodos());
    function dismissOutside(event){
        if(!menu.hidden&&!event.target.closest('.header-more-anchor'))closeMore(false);
        if(!categoryPopover.hidden&&event.target!==categoryButton&&!categoryButton.contains(event.target)&&!categoryPopover.contains(event.target))closeCategories(false);
    }
    document.addEventListener('pointerdown',dismissOutside);
    document.addEventListener('focusin',dismissOutside);
    global.addEventListener('resize',positionCategories);
    global.visualViewport?.addEventListener('resize',positionCategories);
    global.visualViewport?.addEventListener('scroll',positionCategories);
    new MutationObserver(()=>{if(document.body.classList.contains('rh-locked'))close(false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
    profileButton.addEventListener('click',()=>close(false));
    global.RHCabecalho={close,update,renderCategories,openTools:open};
})(window);
