# Bibliotecas de PDF

Arquivos locais para gerar PDF sem rede; nenhuma dependência CDN.

| Arquivo | Versão | Origem | SHA-256 |
| --- | --- | --- | --- |
| jspdf.umd.min.js | 4.2.1 | https://github.com/parallax/jsPDF/releases/tag/v4.2.1 | e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54 |
| jspdf.plugin.autotable.min.js | 5.0.8 | https://github.com/simonbengtsson/jsPDF-AutoTable/releases/tag/v5.0.8 | a65dff2c6a8296b16aff24e69f7683cd7dbaed4a4ec26b507d6840ee27d54649 |

Distribuições obtidas do registro npm, com integridade SHA-512 do pacote verificada antes da extração. Licenças MIT adjacentes. O app usa desenho de texto, tabelas e imagens locais; não usa o método `html()` nem renderiza scripts de documentos.

`linkedom`, fixado no lockfile da raiz, é usado somente pelos testes Node para interpretar as estruturas HTML existentes. Não é empacotado no APK ou carregado pela web.
