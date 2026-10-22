const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['server/vendor/crypto-js-4.2.0.js','js/protocolo.js','js/modelo.js','server/service.js','server/apps-script-adapter.js'];
const source='// GERADO por node scripts/build-backend.cjs. Edite server/ e js/protocolo.js.\n'+files.map(file=>'\n// Fonte: '+file+'\n'+fs.readFileSync(path.join(root,file),'utf8')).join('\n');
fs.writeFileSync(path.join(root,'google-apps-script/Code.gs'),source);
console.log('Code.gs gerado localmente. Nenhuma implantação realizada.');
