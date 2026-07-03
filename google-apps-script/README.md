# Google Apps Script do Alo RH

Use este script para criar a URL de sincronizacao do app.

## Como publicar

1. Acesse `https://script.google.com` e crie um novo projeto.
2. Apague o conteudo do arquivo `Code.gs` e cole o conteudo deste arquivo: `google-apps-script/Code.gs`.
3. Salve o projeto com o nome `Alo RH Sync`.
4. Execute a funcao `criarTokenDeSincronizacao` uma vez e autorize o acesso ao Google Drive.
5. Abra os registros de execucao e copie o token gerado.
6. Clique em `Implantar > Nova implantacao`.
7. Escolha o tipo `App da Web`.
8. Em `Executar como`, deixe `Eu`.
9. Em `Quem pode acessar`, selecione `Qualquer pessoa`.
10. Copie a URL terminada em `/exec`.
11. No Alo RH, cole a URL assim: `SUA_URL_DO_WEB_APP?token=TOKEN_GERADO`.

## Como a sincronizacao funciona

- Ao abrir o app, ele puxa o `banco.json` da nuvem e compara com a copia deste aparelho.
- Quando voce salva qualquer cadastro ou configuracao, o app salva primeiro neste aparelho e depois envia para a nuvem.
- Lancamentos de RH, como faltas, adiantamentos, ferias e presencas, tambem sao conferidos automaticamente a cada 10 segundos enquanto o app estiver aberto.
- O botao `Sincronizar Agora` forca essa conferencia manualmente.

## Onde os dados ficam

O script cria ou usa a pasta `Meu Drive > Apps > Alô RH` e salva o arquivo `banco.json` dentro dela.

No computador, se o Google Drive estiver instalado, essa pasta costuma aparecer como:

`L:\Meu Drive\Apps\Alô RH`

A URL publicada precisa ficar guardada com cuidado, porque o token no final dela funciona como uma chave de acesso.

## O que nao vai para a nuvem

- A senha avancada do app.
- A URL de sincronizacao.
- O token separado em algum arquivo do GitHub.

Essas informacoes ficam no aparelho onde o app foi configurado.
