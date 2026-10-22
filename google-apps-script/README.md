# Backend Google Apps Script — acesso interno

O pacote permanece local. O banco continua no Drive e a autenticação é **pessoa + PIN**, sem Google Identity, e-mail, MailApp ou conta de titular. O cliente antigo com token compartilhado não é compatível com este protocolo.

## Gerar e verificar

```powershell
node scripts/build-backend.cjs
node --test tests/*.test.cjs
```

O bundle inclui modelo, protocolo, serviço, adaptador e CryptoJS 4.2.0; a licença fica em `server/vendor/`. O estado usa esquema 3; o formato de operações por campo continua v2. A migração de estados locais de esquema 2 preserva banco, credenciais internas e identificador de armazenamento, descartando a antiga camada de conta.

## Configuração futura do backend

Nenhum destes passos foi executado na nuvem nesta tarefa.

1. Use inicialmente um projeto Apps Script separado, com runtime V8, e o `Code.gs` gerado.
2. Defina `RH_SOURCE_FILE_ID` nas propriedades do script com o ID do JSON a copiar.
3. Execute `prepararCopiaSegura()`. A função lê a origem, deriva os verificadores dos PINs existentes e cria uma pasta nova com cópia original, estado seguro e backups. Grava `RH_STATE_FILE_ID` e `RH_BACKUP_FOLDER_ID` e recusa reexecutar sobre estado já configurado.
4. Confira contagens e mantenha os arquivos privados. O script precisa acessar o Drive. Não exige envio de e-mail nem configuração OAuth para login do usuário.
5. O app da Web executa com os direitos do proprietário do script. O serviço valida o PIN e as permissões internas antes de retornar dados. A rota pública de seleção retorna somente IDs e nomes dos perfis; GET nunca retorna o banco.
6. Teste o endpoint novo com uma cópia do frontend. Somente depois de validar a transição, configure a URL `/exec`, sem parâmetros, em `js/config.js`. O servidor Node local continua injetando sua própria API isolada.

A autorização do proprietário para executar um Apps Script é uma configuração do backend; não cria uma tela de login Google no Alô RH.

## Verificações para uma futura implantação

O teste local cobre PIN, sessões, permissões, conflitos, repetição idempotente, backups e falhas de escrita. Ainda é necessário verificar redirecionamentos/CORS, latência, cotas do Drive, custo do PBKDF2 no runtime do Google e recuperação de backups na implantação real. Nada disso depende de login Google ou e-mail no aplicativo.

A seção crítica usa [LockService.getScriptLock](https://developers.google.com/apps-script/reference/lock/lock-service) até finalizar backup e escrita. Os snapshots são arquivos independentes; não há limpeza automática deles nesta versão.

A passagem para produção deve preservar uma cópia atual do banco, suspender clientes legados durante a transição e atualizar frontend/backend de forma coordenada. Nenhuma função procura o banco de produção pelo nome nem sobrescreve automaticamente a origem.
