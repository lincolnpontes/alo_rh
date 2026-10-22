(function(){
    const overlays=[...document.querySelectorAll('.modal-overlay')];let current=null,previousFocus=null;
    for(const overlay of overlays){
        overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
        const heading=overlay.querySelector('h1,h2,h3,.modal-title');if(heading){heading.id||=overlay.id+'TituloAcessivel';overlay.setAttribute('aria-labelledby',heading.id);}else overlay.setAttribute('aria-label','Janela do Alô RH');
        new MutationObserver(()=>{
            const visible=overlay.style.display&&overlay.style.display!=='none';overlay.setAttribute('aria-hidden',visible?'false':'true');
            if(visible&&current!==overlay){previousFocus=document.activeElement;current=overlay;overlay.tabIndex=-1;requestAnimationFrame(()=>overlay.focus());}
            if(!visible&&current===overlay){current=overlays.filter(o=>o.style.display&&o.style.display!=='none').pop()||null;if(!current&&previousFocus?.isConnected)previousFocus.focus();}
            for(const el of document.body.children)if(!['SCRIPT','STYLE','DIALOG'].includes(el.tagName))el.inert=!!current&&el!==current;
        }).observe(overlay,{attributes:true,attributeFilter:['style']});
    }
    document.querySelectorAll('label:not([for])').forEach(label=>{const input=label.querySelector('input,select,textarea')||label.nextElementSibling;if(input&&['INPUT','SELECT','TEXTAREA'].includes(input.tagName)&&input.id)label.htmlFor=input.id;});
    document.querySelectorAll('button').forEach(button=>{const text=button.textContent.trim();if(['×','X','✕','✖'].includes(text))button.setAttribute('aria-label','Fechar');});
    document.addEventListener('keydown',event=>{
        if(!current||event.key!=='Tab')return;
        const fields=[...current.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
        if(!fields.length){event.preventDefault();current.focus();return;}
        const first=fields[0],last=fields[fields.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===current)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
})();
