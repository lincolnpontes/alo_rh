# Alô RH para Android

APK independente do instalador WebAPK/Chrome. Pacote permanente `io.github.lincolnpontes.alorh`, versão inicial 1.4.0, versionCode 1. Interface web empacotada localmente com WebViewAssetLoader, seguindo a estrutura do Alô Cozinha. Backend, autorização por pessoa/PIN e protocolo de sincronização permanecem no Google Apps Script.

## Instalação e atualizações

Abra [a página de instalação](https://lincolnpontes.github.io/alo_rh/instalar.html) no Android, baixe o APK e abra o arquivo. Permita a instalação pelo navegador se o Android solicitar. No primeiro acesso, conecte-se à internet para autenticar e carregar o banco. O APK tem armazenamento próprio; alterações pendentes de uma instalação anterior precisam ser sincronizadas nela antes da troca.

Atualizações nativas exigem outro APK, assinado com **a mesma chave** e versionCode maior. Instalar por cima preserva os dados locais. A atualização do site/PWA não altera os arquivos empacotados no APK. Não trocar o applicationId nem gerar nova chave para uma atualização.

## Compilação neste computador

Execute `./build-apk.ps1` na raiz. Requer Android Studio JBR, SDK 36 e build-tools 36.0.0. O script executa testes Java, lint, build release e verificação da assinatura; copia o resultado para `dist/Alo-RH-v1.4.0.apk`.

A chave própria e sua configuração ficam apenas em `.local/android-signing/`, ignorada pelo Git. O arquivo privado `signing.json` contém `keystore` (caminho absoluto) e `password`. A chave inicial foi gerada com RSA 3072 e validade de 10.000 dias. Nunca publicar esses arquivos nem incluí-los nos assets. Há uma segunda cópia privada em `.local/apk-2026-10-23/signing-backup/`. Para outro computador, transferir a chave por meio privado e ajustar somente o caminho no JSON.

O script copia uma lista explícita de fontes públicas para uma pasta temporária ASCII em `%LOCALAPPDATA%/AloRHBuild/`. Isso evita a falha de carregamento de classes dos testes Gradle no caminho Windows com acento. O caminho de cada compilação fica em `.local/android-signing/last-build-path.txt`; os relatórios ficam em `android/app/build/reports/` dessa pasta.

## Integrações e segurança

- HTML, JS, CSS e ícones empacotados; nenhum banco, PIN, chave de assinatura ou código privado do servidor dentro do APK.
- Ponte nativa por WebMessageListener, limitada à origem local e ao frame principal. Navegação externa abre no aplicativo correspondente; scripts remotos e tráfego HTTP são bloqueados.
- Rede da WebView limitada ao transporte Apps Script e seu redirecionamento de resposta. Sessões não são copiadas por backup Android ou transferência automática de aparelho.
- Impressão de ponto, quinzena, VT e recibos pelo serviço de impressão do Android, incluindo salvar PDF. WebView de impressão com JavaScript e rede desativados.
- Exportações JSON/XLSX usam seletor de destino do Android; importações usam o seletor de arquivo, sem pedir acesso amplo ao armazenamento. Limite de exportação: 8 MB.
- WhatsApp abre externamente; botão Voltar fecha diálogos e menus antes de minimizar o app.

## Validação desta entrega

102 testes Node, 3 testes Java de política de navegação/arquivos, lint Android sem erros e APK release com assinatura verificada. Assets extraídos do pacote comparados com os arquivos locais. Interface revisada em 320, 390 e 1280 pixels com banco fictício; login, PIN avançado, categorias, seleção e menus conferidos no navegador.

O aparelho do usuário não estava conectado: instalação física, impressora Android e seletores de arquivo nativos ainda precisam da conferência no celular. Não afirmar que o erro do instalador Chrome foi corrigido: o APK usa outro caminho de instalação.
