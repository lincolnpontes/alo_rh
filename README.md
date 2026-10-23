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

A tela oferece seleção de pessoa, PIN, teclado numérico e entrada pelo teclado físico. PINs novos exigem quatro a doze dígitos; os acessos legados de três dígitos são preservados. Lembra a última pessoa; pede o PIN ao abrir. Operações sensíveis exigem confirmação do PIN e permissão do perfil, verificada novamente no servidor.

PINs são migrados para PBKDF2-SHA256 com salt individual e 120.000 iterações. Credenciais não entram no banco compartilhado ou exportado. Três erros bloqueiam temporariamente novas tentativas para aquela pessoa, mesmo trocando o identificador de aparelho.

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

Os controles usam 35 SVGs locais Phosphor, com preenchimento suave em duas tonalidades e símbolos próprios de Pix e WhatsApp. A licença MIT acompanha os arquivos em `icons/ui/LICENSE-phosphor.txt`. Os ícones ficam disponíveis no cache do aplicativo e têm rótulos acessíveis nos botões.

A bolinha ao lado da engrenagem segue o indicador do Alô Cozinha: verde quando o servidor confirmou os dados e não há pendências; vermelha enquanto há alterações pendentes, desconexão ou erro. A checagem periódica mantém a confirmação anterior até receber o resultado, sem exibir uma faixa de sincronização. O botão mantém a descrição acessível e abre a revisão de pendências quando necessário.

Arquivar e restaurar ficam dentro de cada funcionário, com preservação do histórico e verificação das permissões de dados pessoais e vínculo. A lista geral oferece acesso ao cadastro.

## Verificação

```powershell
node scripts/build-backend.cjs
node --test tests/*.test.cjs
```

Os testes usam dados fictícios, incluindo uma execução HTTP real do servidor local. Veja [a validação e seus limites](docs/VALIDACAO-LOCAL.md).

Fontes principais: `js/protocolo.js` e `js/modelo.js` para dados; `js/armazenamento.js` e `js/sync-seguro.js` para persistência; `js/autenticacao.js` para acesso interno; `server/service.js` para regras do backend. `google-apps-script/Code.gs` é gerado, não editado diretamente.

Origem: [lincolnpontes/alo_rh](https://github.com/lincolnpontes/alo_rh), base `2605212f756ccb25d88c143c337e87d2fe44acbe` (v1.0.52). Versão v1.1.1; backend Apps Script versão 7, atualizado em 22/10/2026. O banco anterior e seus backups permanecem privados e preservados. Nenhum recurso Supabase usado.
