(function(global){
    'use strict';
    const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
    const find=(node,selector)=>text(node.querySelector(selector));
    const all=(node,selector)=>Array.from(node.querySelectorAll(selector));
    let producing=false;
    function build(html){
        if(typeof html!=='string'||html.length>8*1024*1024)throw Error('Documento inválido ou muito grande.');
        const source=new DOMParser().parseFromString(html,'text/html');
        const sections=all(source,'section.vt-folha,section.quinzena-folha,section.folha,section.recibo-folha');
        if(!sections.length)throw Error('Nenhuma página disponível para gerar o PDF.');
        const title=find(source,'title')||'Documento Alô RH';
        const pdf=new global.jspdf.jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
        pdf.setProperties({title,author:'Alô RH',creator:'Alô RH'});
        pdf.setFont('times','normal');pdf.setTextColor(0);pdf.setDrawColor(0);
        function write(value,x,y,width,size=11,style='normal',align='left'){
            pdf.setFont('times',style);pdf.setFontSize(size);
            const lines=pdf.splitTextToSize(value||'',width),lineHeight=size*0.352778*1.18;
            if(value)pdf.text(lines,align==='center'?x+width/2:align==='right'?x+width:x,y,{align,lineHeightFactor:1.18});
            return y+Math.max(1,lines.length)*lineHeight;
        }
        function border(){pdf.setDrawColor(0);pdf.setLineWidth(.25);pdf.rect(10,10,190,277);pdf.rect(10.8,10.8,188.4,275.4);}
        function logo(section,y){
            const src=section.querySelector('img')?.getAttribute('src');
            if(!src)return y;
            if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(src))throw Error('A logo precisa estar salva como imagem PNG ou JPEG.');
            const p=pdf.getImageProperties(src),scale=Math.min(58/p.width,25/p.height),w=p.width*scale,h=p.height*scale;
            pdf.addImage(src,p.fileType,(210-w)/2,y,w,h);return y+h+5;
        }
        function table(options){
            pdf.autoTable({theme:'plain',styles:{font:'times',fontSize:10.5,textColor:0,cellPadding:1.5,overflow:'linebreak',lineColor:0,lineWidth:0},headStyles:{fontStyle:'bold',fillColor:[238,238,238]},rowPageBreak:'avoid',margin:{left:17,right:17,top:20,bottom:38},...options});
            return pdf.lastAutoTable.finalY;
        }
        function signature(label,x,y,width){pdf.setDrawColor(0);pdf.setLineWidth(.25);pdf.line(x,y,x+width,y);write(label,x,y+4,width,10,'normal','center');}
        function receiptList(section,vt,listSections){
            const header=()=>{
                border();let y=logo(section,16);
                if(!section.querySelector('img'))y=write(find(section,vt?'.logo-vt-texto':'.logo-quinzena-texto'),17,y+4,176,14,'bold','center');
                y=write(find(section,vt?'.vt-razao':'.sub-empresa'),17,y+3,176,13,'bold','center');
                y=write(find(section,vt?'.vt-cnpj':'.cnpj-empresa'),17,y+1,176,10,'normal','center');
                y=write(find(section,vt?'.titulo-vt':'.titulo-doc'),17,y+7,176,12,'bold','center');
                return write(find(section,vt?'.texto-vt':'.texto-declara'),17,y+5,176,11)+5;
            };
            const y=header();let page=0;
            table({startY:y,margin:{left:17,right:17,top:y,bottom:vt?49:35},
                head:[['Funcionário','Valor (R$)','Assinatura']],
                body:listSections.flatMap(part=>all(part,vt?'.linha-vt':'.linha-quinzena')).map(row=>[find(row,'.nome'),find(row,'.valor'),'']),
                columnStyles:{0:{cellWidth:96},1:{cellWidth:27,halign:'right'},2:{cellWidth:53}},
                bodyStyles:{minCellHeight:8.2,lineWidth:{bottom:.2}},
                willDrawPage:()=>{if(page++)header();},
                didDrawPage:()=>{write(find(section,vt?'.data-vt':'.rodape-data'),17,vt?258:272,176,11,'bold','right');if(vt)signature(find(section,'.assinatura-diretor-vt'),69,274,72);}
            });
        }
        function cells(row){return Array.from(row.children).map(cell=>({content:text(cell),colSpan:Number(cell.getAttribute('colspan')||1),rowSpan:Number(cell.getAttribute('rowspan')||1)}));}
        function attendance(section){
            let y=write(find(section,'.titulo-ponto'),8,15,194,13,'bold','center')+2;
            y=write(Array.from(section.querySelector('.periodo-ponto').children).map(text).join(' '),8,y,194,11,'bold','center')+3;
            const top=y;
            for(const line of Array.from(section.querySelector('.empresa-dados').children))y=write(text(line),8,y,94,10);
            y+=3;
            for(const line of Array.from(section.querySelector('.func-dados').children))y=write(text(line),8,y,94,10,line.classList.contains('func-nome')?'bold':'normal');
            const schedule=section.querySelector('.quadro-horarios');
            const right=table({startY:top-3,margin:{left:107,right:8,top:12,bottom:34},tableWidth:95,
                head:all(schedule,'thead tr').map(cells),body:all(schedule,'tbody tr').map(cells),
                styles:{font:'times',fontSize:9,cellPadding:1.1,textColor:0},columnStyles:{0:{cellWidth:26},1:{cellWidth:36},2:{cellWidth:33}}});
            const grid=section.querySelector('.tabela-ponto');
            const end=table({startY:Math.max(y,right)+4,theme:'grid',margin:{left:8,right:8,top:14,bottom:34},
                head:all(grid,'thead tr').map(cells),body:all(grid,'tbody tr').map(cells),
                styles:{font:'times',fontSize:9,cellPadding:.8,minCellHeight:5.35,halign:'center',valign:'middle',textColor:0,lineWidth:.2,lineColor:0},
                columnStyles:Object.fromEntries([8,10,18,20,20,18,20,20,60].map((cellWidth,i)=>[i,{cellWidth}]))});
            const footer=end+9;write('Reconheço a exatidão destas anotações.',18,footer,174,11);
            write('Data: _____ / _____ / __________',18,footer+14,80,11);signature('Assinatura do Diretor',124,footer+14,65);
        }
        function monthly(section){
            border();let y=write(find(section,'.empresa'),22,24,166,14,'bold','center');
            y=write(find(section,'.cnpj'),22,y+1,166,10,'normal','center');
            y=write(find(section,'.titulo'),22,y+9,166,13,'bold','center');
            y=write(find(section,'.texto'),22,y+7,166,11)+5;
            y=write(find(section,'.func'),22,y,166,12,'bold')+4;
            const columns=Array.from(section.querySelector('.grid').children),rows=columns.map(col=>all(col,'.linha'));
            const pair=row=>row?Array.from(row.children).map(cell=>({content:text(cell),styles:{fontStyle:row.classList.contains('total')?'bold':'normal'}})):[{content:'',styles:{lineWidth:0}},{content:'',styles:{lineWidth:0}}];
            const continuation=()=>{border();write(find(section,'.func'),22,22,166,11,'bold');};
            const footer=()=>{write(find(section,'.rodape'),22,260,166,11,'bold','right');signature(find(section,'.assinatura'),64,278,82);};
            let part=0;
            y=table({startY:y,tableWidth:166,margin:{left:22,right:22,top:35,bottom:48},
                head:[[{content:find(columns[0],'.bloco-titulo'),colSpan:2},{content:'',styles:{fillColor:false}},{content:find(columns[1],'.bloco-titulo'),colSpan:2}]],
                body:Array.from({length:Math.max(...rows.map(list=>list.length))},(_,i)=>[...pair(rows[0][i]),{content:'',styles:{lineWidth:0}},...pair(rows[1][i])]),
                columnStyles:{0:{cellWidth:52},1:{cellWidth:26,halign:'right'},2:{cellWidth:10},3:{cellWidth:52},4:{cellWidth:26,halign:'right'}},bodyStyles:{minCellHeight:6,lineWidth:{bottom:.2}},
                willDrawPage:()=>{if(part++)continuation();},didDrawPage:footer
            })+8;
            const extras=Array.from(section.children).filter(el=>el.classList.contains('linha'));
            const contentPage=pdf.internal.getCurrentPageInfo().pageNumber;
            table({startY:y,tableWidth:166,margin:{left:22,right:22,top:35,bottom:48},
                body:extras.map(row=>Array.from(row.children).map(cell=>({content:text(cell),styles:{fontStyle:'bold'}}))),
                columnStyles:{0:{cellWidth:123},1:{cellWidth:43,halign:'right'}},bodyStyles:{minCellHeight:8,lineWidth:{bottom:.25}},
                willDrawPage:()=>{if(pdf.internal.getCurrentPageInfo().pageNumber!==contentPage)continuation();},
                didDrawPage:()=>{if(pdf.internal.getCurrentPageInfo().pageNumber!==contentPage)footer();}});
        }
        const listKind=sections[0].classList.contains('vt-folha')?'vt-folha':sections[0].classList.contains('quinzena-folha')?'quinzena-folha':null;
        const pages=listKind?[sections[0]]:sections;
        pages.forEach((section,index)=>{if(index)pdf.addPage();
            if(listKind)receiptList(section,listKind==='vt-folha',sections);
            else if(section.classList.contains('folha'))attendance(section);
            else monthly(section);
        });
        const filename=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-|-$/g,'')+'.pdf';
        return {pdf,filename};
    }
    async function prepareImages(html){
        // Existing company logos may be GIF/WebP/SVG. Decode locally in an image,
        // then embed a bounded PNG; no document HTML or SVG script is executed.
        const source=new DOMParser().parseFromString(html,'text/html');
        for(const node of all(source,'section img')){
            const src=node.getAttribute('src')||'';
            if(/^data:image\/(png|jpeg);base64,/i.test(src))continue;
            if(!/^data:image\/(gif|webp|bmp|svg\+xml)[;,]/i.test(src))throw Error('A logo precisa ser uma imagem salva no cadastro da empresa.');
            const converted=await new Promise((resolve,reject)=>{
                const img=new Image(),timer=setTimeout(()=>reject(Error('Não foi possível preparar a logo.')),10000);
                img.onerror=()=>{clearTimeout(timer);reject(Error('Não foi possível ler a logo da empresa.'));};
                img.onload=()=>{clearTimeout(timer);try{
                    const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
                    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
                    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'));
                }catch(error){reject(error);}};img.src=src;
            });
            node.setAttribute('src',converted);
        }
        return '<!doctype html>'+source.documentElement.outerHTML;
    }
    function open(){
        // Reserve the desktop tab during the user's click, before any asynchronous work.
        const target=global.RHAndroid?null:global.open('','_blank');
        let html='',closed=false;
        if(target){target.opener=null;target.document.write('<!doctype html><html lang="pt-BR"><title>Preparando PDF — Alô RH</title><body style="font:16px Arial;padding:32px"><p role="status">Preparando PDF…</p></body></html>');target.document.close();}
        return {document:{write:value=>{html+=String(value);},close(){}},close(){closed=true;target?.close();},async print(){
            if(closed||!html)return;
            if(producing){target?.close();alert('Aguarde a preparação do PDF anterior.');return;}
            if(!global.RHAndroid&&!target){alert('Permita abrir uma nova aba para visualizar e imprimir o PDF.');return;}
            producing=true;
            try{
                if(html.length>8*1024*1024)throw Error('Documento maior que 8 MB.');
                const {pdf,filename}=build(await prepareImages(html)),blob=pdf.output('blob');
                if(global.RHAndroid)await global.RHAndroid.sharePdf(blob,filename);
                else {const url=URL.createObjectURL(blob);target.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),600000);}
            }catch(error){if(target&&!target.closed)target.document.body.textContent='Não foi possível gerar o PDF. '+error.message;alert(error.message);}
            finally{producing=false;}
        }};
    }
    global.RHDocuments={build,open};
})(window);
