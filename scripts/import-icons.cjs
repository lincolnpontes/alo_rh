// Ícones Phosphor 2.1.1 (MIT), incorporados como SVGs locais; sem dependência de rede em execução.
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];if(!source)throw Error('Informe a pasta extraída de @phosphor-icons/core.');
const colors={green:'#267968',blue:'#397da2',orange:'#bc783e',rose:'#b85760',slate:'#506875'};
const icons={
 absence:['calendar-x','rose'],alert:['warning','orange'],
 'arrow-down':['arrow-fat-down','blue'],'arrow-up':['arrow-fat-up','blue'],
 briefcase:['briefcase','slate'],building:['storefront','green'],bus:['bus','blue'],
 cake:['cake','rose'],calendar:['calendar-dots','blue'],card:['identification-card','slate'],
 chat:['chats-circle','green'],'clipboard-check':['clipboard-text','green'],clock:['timer','orange'],
 cloud:['cloud-check','green'],connection:['plugs-connected','green'],eye:['eye','blue'],
 files:['files','blue'],history:['clock-counter-clockwise','slate'],import:['download-simple','blue'],
 list:['list-checks','green'],'manager-key':['key','orange'],package:['archive','orange'],
 pencil:['pencil-simple','slate'],people:['users','green'],receipt:['receipt','blue'],
 refresh:['arrows-clockwise','blue'],restore:['arrow-counter-clockwise','green'],
 settings:['gear-six','slate'],shield:['shield-check','green'],tag:['tag','orange'],
 'trash-2':['trash','rose'],umbrella:['umbrella','orange'],wallet:['wallet','blue'],
 pix:['pix-logo','#32a999','fill'],whatsapp:['whatsapp-logo','#26965c','fill']
};
const entries=Object.entries(icons).map(([name,[asset,color,weight='duotone']])=>{
 const file=path.join(source,'assets',weight,asset+'-'+weight+'.svg');
 const svg=fs.readFileSync(file,'utf8').replace('fill="currentColor"','fill="'+(colors[color]||color)+'"').replace(/opacity="0.2"/g,'opacity="0.28"');
 return [name,svg];
});
for(const [name,svg]of entries)fs.writeFileSync(path.join(__dirname,'../icons/ui',name+'.svg'),svg+'\n');
fs.copyFileSync(path.join(source,'LICENSE'),path.join(__dirname,'../icons/ui/LICENSE-phosphor.txt'));
const css='.rh-icon{display:inline-block;width:1.4em;height:1.4em;vertical-align:-.3em;flex-shrink:0;background:var(--rh-icon) center/contain no-repeat;print-color-adjust:exact;-webkit-print-color-adjust:exact}\n.header-actions .rh-icon{width:24px;height:24px;padding:3px;border-radius:6px;background-color:#f2f7f5;background-size:24px 24px}.btn-outline>.rh-icon{margin-right:8px}\n'+entries.map(([name])=>'[data-icon="'+name+'"]{--rh-icon:url("../icons/ui/'+name+'.svg?v=1.1.1")}').join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'../css/icones.css'),css);
console.log(entries.length+' ícones incorporados.');
