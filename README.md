# Alô RH

O backend continua no **Google Apps Script**, com o banco em arquivos privados no **Google Drive**. O acesso é exclusivamente interno: **pessoa + PIN**, seguindo o fluxo de funcionários do Alô Cozinha. Não há conta do aplicativo, login Google, login por e-mail, cadastro de titular ou pareamento de aparelhos.

## Executar

```powershell
./iniciar-local.ps1
# ou
node scripts/servir-local.cjs
```

Abra [a cópia local](http://127.0.0.1:49317/). O servidor escuta somente neste computador e injeta uma API local; conexões externas são bloqueadas por CSP. A configuração pública em `js/config.js` é usada apenas na versão publicada.

A primeira execução copia `.local/drive/banco.json` para `.local/homologacao/estado.json`, preservando o original. Entre selecionando um dos perfis autorizados já existentes e seu PIN. Não é necessário criar conta nem cadastrar e-mail. Os cadastros de funcionários da folha não recebem automaticamente permissão de acesso.

## Acesso interno

O identificador permanente de instalação é `/alo_rh/`. A v1.3.1 corrige o antigo `./`, que se resolvia para a raiz do domínio e coincidia com o Alô Feira. O manifest usa uma URL versionada para renovar os metadados; a origem, o escopo e os dados continuam iguais. Quem já removeu o app pode tentar instalar pelo site atualizado. Instalações antigas não são removidas automaticamente. Veja [validação e limites da reinstalação](docs/VALIDACAO-LOCAL.md).

A abertura mostra diretamente o modal de acesso do Alô Cozinha, com as mesmas cores, espaçamento e teclado dentro da tela. O campo de PIN é somente leitura, sem abrir o teclado do celular; o teclado físico continua disponível. A última lista de nomes aparece imediatamente e é atualizada em segundo plano. PINs novos exigem quatro a doze dígitos; os acessos legados de três dígitos são preservados. Lembra a última pessoa; pede o PIN ao abrir. Operações sensíveis exigem confirmação do PIN e permissão do perfil, verificada novamente no servidor.

PINs são migrados para PBKDF2-SHA256 com salt individual e 120.000 iterações. Credenciais não entram no banco compartilhado ou exportado. Três erros bloqueiam temporariamente novas tentativas para aquela pessoa, mesmo trocando o identificador de aparelho.

Na entrada, o navegador calcula PBKDF2 por Web Crypto e assina uma prova HMAC de uso único. O servidor confere pessoa, aparelho, banco, validade e versão da credencial; o PIN e o verificador derivado não são transmitidos nesse fluxo. A preparação ocorre enquanto a pessoa digita, com desafio de dois minutos em CacheService; descarte do cache exige nova preparação e nunca libera acesso. O fluxo anterior permanece compatível com clientes ainda não atualizados. A confirmação de operações sensíveis continua no servidor. Veja a [validação](docs/VALIDACAO-LOCAL.md).

A troca de perfil mostra o login imediatamente e revoga o token anterior em segundo plano. Respostas atrasadas de outro perfil não encerram o acesso atual. A renovação persiste um identificador de tentativa e recupera a mesma resposta por até dois minutos se a rede a perder, sem guardar tokens abertos no servidor. A consulta normal de revisão também prepara o próximo desafio de PIN.

Sessões opacas são vinculadas à instalação, têm tokens rotativos de 30 minutos e limite absoluto de oito horas. Trocar um PIN invalida as outras sessões daquela pessoa. Excluir um perfil encerra seu acesso; o último administrador de acessos não pode ser removido.

O último perfil autorizado pode abrir a cópia offline com PIN por até oito horas após autenticar online. Essa autorização local não comprova revogação remota enquanto o aparelho estiver desconectado. As permissões herdadas regulam edição e ferramentas; um perfil autorizado recebe a base de RH, sem credenciais. Não há segregação de leitura por funcionário.

A migração remove a antiga camada experimental de conta e suas sessões, mantendo os dados, os verificadores de PIN e o mesmo espaço de armazenamento local. Nunca apagar `.local` para atualizar o aplicativo.

## Sincronização e recuperação

- Alterações por campo, com valor base e revisão esperada. Conflitos são apresentados para revisão.
- Fila persistente em IndexedDB, identificador idempotente e confirmação explícita do servidor. Falhas HTTP, HTML, respostas opacas, recusas e timeout não confirmam gravações.
- Lock no Apps Script abrange leitura, validação, backup e escrita. Falha de persistência ou backup impede confirmação.
- Web Lock impede duas abas editoras. Edições feitas durante um envio sobrevivem à resposta.
- Quinzenas, presenças e pagamentos possuem verificações contra duplicidade. Funcionários com histórico são arquivados.
- Importação XLSX preserva valores numéricos e campos ausentes, atualiza histórico salarial com competência e apresenta prévia.
- Restauração exige banco completo e preserva cópia anterior. Cópias locais, conflitos e vínculos antigos podem ser revisados em **Dados e recuperação**.

## Imagens

O cabeçalho usa uma única linha: logo Alô RH, perfil ativo, bolinha de sincronização, menu de férias, resumo, aniversariantes, informes ao contador, folga geral e pagamentos pendentes e a mesma engrenagem PNG do Alô Cozinha. O perfil permite voltar ao login interno; as permissões continuam controlando cada opção. A logo do restaurante permanece nos documentos da empresa. Os atalhos de seleção Ponto, Quinzena, VT e Docs usam quatro ilustrações vetoriais próprias sobre cartões claros, com categoria compacta, quadradinho para selecionar/desmarcar a lista e contador visível apenas quando há seleção. Presença semanal usa um calendário simples com marca de confirmação.

Os controles usam 35 SVGs locais Phosphor, com preenchimento suave em duas tonalidades e símbolos próprios de Pix e WhatsApp. A licença MIT acompanha os arquivos em `icons/ui/LICENSE-phosphor.txt`. Os ícones ficam disponíveis no cache do aplicativo e têm rótulos acessíveis nos botões.

A bolinha ao lado da engrenagem segue o indicador do Alô Cozinha: verde quando o servidor confirmou os dados e não há pendências; vermelha enquanto há alterações pendentes, desconexão ou erro. A checagem periódica mantém a confirmação anterior até receber o resultado, sem exibir uma faixa de sincronização. O botão mantém a descrição acessível e abre a revisão de pendências quando necessário.

Arquivar e restaurar ficam apenas no formulário de edição do funcionário, com preservação do histórico e verificação das permissões de dados pessoais e vínculo. As ações rápidas da tela inicial não oferecem arquivamento. O cadastro tem largura limitada à tela e pares separados para expediente e intervalo.

A nova logo traz o nome completo **Alô RH**, em branco sobre verde, com margem para máscaras circulares e arredondadas do celular. O manifest e os atalhos Apple usam imagens opacas de 192 e 512 px com URLs novas. Veja [origem e preparação dos arquivos](docs/IDENTIDADE-VISUAL.md).

## Verificação

```powershell
pnpm install --frozen-lockfile --ignore-scripts
node scripts/build-backend.cjs
node --test tests/*.test.cjs
```

Os testes usam dados fictícios, incluindo uma execução HTTP real do servidor local. Veja [a validação e seus limites](docs/VALIDACAO-LOCAL.md).

Fontes principais: `js/protocolo.js` e `js/modelo.js` para dados; `js/armazenamento.js` e `js/sync-seguro.js` para persistência; `js/autenticacao.js` para acesso interno; `server/service.js` para regras do backend. `google-apps-script/Code.gs` é gerado, não editado diretamente.

## PDF e compartilhamento

Ponto, quinzena, VT e recibo mensal produzem PDFs A4 com texto e tabelas locais, inclusive offline. `js/documentos.js` reutiliza os cálculos e textos existentes; jsPDF e AutoTable estão empacotados, com versões e licenças em `js/vendor/README.md`. A logo cadastrada da empresa é incorporada ao arquivo.

No APK, gerar PDF abre o compartilhamento nativo do Android. No PC, abre uma nova aba com o PDF e a impressão fica disponível no visualizador do navegador. Se o navegador bloquear a aba, o app informa como liberar. O botão WhatsApp do resumo do contracheque usa a seleção nativa de destino no APK e mantém o link WhatsApp na web. Nada é enviado automaticamente.

Manter web e APK na mesma versão em cada publicação. Atualizar `index.html`, cache do service worker, assets e `versionName`/`versionCode`; compilar o APK com a chave existente e atualizar a página de instalação. Atualizar o site sozinho não atualiza a interface já empacotada no celular.

Origem: [lincolnpontes/alo_rh](https://github.com/lincolnpontes/alo_rh), base `2605212f756ccb25d88c143c337e87d2fe44acbe` (v1.0.52). Versão v1.4.2; backend Apps Script na versão 9. O banco anterior e seus backups permanecem privados e preservados. Nenhum recurso Supabase usado.

## APK Android

[Instalar Alô RH](https://lincolnpontes.github.io/alo_rh/instalar.html). Pacote próprio, separado do instalador Chrome, com a mesma pessoa e PIN e o mesmo banco Apps Script. Veja [compilação, assinatura e limites de validação](docs/ANDROID.md).
