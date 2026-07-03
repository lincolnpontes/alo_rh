function getHojeSTR() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
    function getDatesDaSemana() {
        let hj = new Date(); hj.setHours(0,0,0,0);
        let day = hj.getDay(); let isoDay = day === 0 ? 7 : day; 
        let monday = new Date(hj.getTime() - ((isoDay - 1) * 86400000));
        let qui = new Date(monday.getTime() + (3 * 86400000));
        let sex = new Date(monday.getTime() + (4 * 86400000));
        let sab = new Date(monday.getTime() + (5 * 86400000));
        let dom = new Date(monday.getTime() + (6 * 86400000));
        let toStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return { hoje: { str: toStr(hj), dt: hj }, qui: { str: toStr(qui), dt: qui }, sex: { str: toStr(sex), dt: sex }, sab: { str: toStr(sab), dt: sab }, dom: { str: toStr(dom), dt: dom } };
    }

    
function isEmFerias(funcId, dateStr) { return db.registros.some(r => { if(r.type !== 'ferias' || r.funcId !== funcId) return false; let d1 = r.data; let d2 = r.dataFim || r.data; return (dateStr >= d1 && dateStr <= d2); }); }

    function isAptoNoDia(f, dtStr) {
        if(isEmFerias(f.id, dtStr)) return false;
        let temFalta = db.registros.some(r => r.type==='falta' && r.funcId===f.id && r.data<=dtStr && (r.dataFim?r.dataFim:r.data)>=dtStr);
        if(temFalta) return false;
        let catObj = db.categorias.find(c => c.id === f.categoria);
        if(catObj && catObj.semanal) {
            let temPresenca = db.registros.some(r => r.type==='presenca' && r.funcId===f.id && r.data===dtStr);
            if(!temPresenca) return false;
        } else {
            let dateObj = new Date(dtStr + "T00:00:00"); let diaSemana = dateObj.getDay().toString();
            if(!db.configGerais.diasFuncionamento.includes(diaSemana)) return false;
            if(f.horarios && f.horarios.folgas && f.horarios.folgas.includes(diaSemana)) return false;
        } return true;
    }
