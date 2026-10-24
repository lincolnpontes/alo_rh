# Validação local — 23/10/2026

## Revisão v1.3.1 — identidade de instalação

O `id: "./"` era interpretado em relação à origem de `start_url`, conforme o [algoritmo do manifest](https://www.w3.org/TR/appmanifest/#id-member), e resultava em `https://lincolnpontes.github.io/`. A conferência dos manifests públicos em 23/10/2026 encontrou o mesmo identificador no Alô Feira. O teste anterior resolvia `id` incorretamente em relação à pasta `/alo_rh/`, deixando passar a colisão.

O RH agora usa o identificador permanente `/alo_rh/`. A origem, o endereço inicial, o escopo, o armazenamento e a API continuam iguais. O HTML solicita `manifest.json?v=1.3.1` para não reutilizar a resposta HTTP antiga; o service worker conserva uma cópia canônica para uso offline. O Alô Feira e os demais apps não foram alterados. Para navegadores que consideram o `id`, esta é uma nova identidade de instalação: quem ainda tiver a instalação antiga pode ver uma segunda opção, mas os ícones existentes não são removidos automaticamente.

Os dois testes de identidade falharam com o manifest anterior e passaram após a correção. 87 testes passaram, incluindo isolamento da identidade em relação ao Feira/Cozinha, atualização pelo manifest versionado, fallback offline e preservação do escopo. Código anterior preservado em bundle Git e manifest original em `.local/instalacao-2026-10-23/`. No navegador local, a página v1.3.1 solicitou o manifest versionado, abriu o acesso e entrou com o PIN fictício, sem erros de console. Não houve escrita no Apps Script nem no banco. A colisão está comprovada nos arquivos publicados; o resultado da reinstalação depende da confirmação no Android do usuário.

## Revisão v1.3.0

84 testes passaram. Os quatro testes novos verificam que a instalação recebe o manifest atual, preserva a cópia válida sem conexão, não grava uma página de erro no lugar do manifest e não intercepta a instalação de outro app do mesmo domínio. O identificador e o escopo de instalação foram preservados. O registro do service worker solicita atualização sem reutilizar o cache HTTP do script.

O agente de design revisou o código e os assets reais do Alô Cozinha e as capturas do RH. Cabeçalho de 68 px em uma linha, logo do app, perfil ativo, engrenagem original e menu com as três opções. Os quatro atalhos ilustrados ficam em cartões claros e têm 72 px de largura mínima no viewport de 320 px. As linhas de funcionários usam cerca de 69 px e seleção suave, sem perder a marca de seleção.

Conferências no navegador local: perfis fictícios, nome longo, larguras de 320, 390 e 1280 px sem rolagem lateral, seleção/limpeza, menu por mouse e teclado, setas, Escape com retorno do foco, troca de perfil e acesso às três telas. Os atalhos Ponto, Quinzena, VT e Docs abriram seus diálogos corretos; não foram emitidos documentos nem lançados pagamentos. O console não registrou erros ou avisos na conferência final. Um perfil fictício com permissões explicitamente negadas só vê aniversariantes no menu; os atalhos protegidos permanecem ocultos. Nenhum cadastro ou lançamento real foi alterado. Backup adicional do banco no Drive e local, mais bundle Git, preservados antes de publicar. Evidências privadas em `.local/layout-2026-10-23/`.

O aviso Android/Chrome de “já instalado” não foi reproduzido neste computador e não pode ser declarado resolvido. A identidade do app já era a mesma antes da atualização. Há um [registro oficial do Chromium](https://issues.chromium.org/issues/572287931) de instalação de diferentes PWAs no mesmo domínio/subdiretórios, inclusive GitHub Pages, recusada incorretamente como já instalada. Isso é uma hipótese para o relato do usuário; a confirmação depende do estado e da versão do Chrome no celular. A correção do cache de manifest evita metadados antigos, mas não remove registros de instalação do Android. Não foram limpos dados locais nem criadas identidades/domínios alternativos.

## Revisão v1.2.0

80 testes passaram, incluindo prova do PIN por Web Crypto/HMAC, recusa de repetição, vínculo ao banco/aparelho/pessoa, expiração, mudança e exclusão de credenciais, bloqueio por tentativas, descarte do CacheService e compatibilidade com PIN legado de três dígitos. A preparação do desafio não escreve no arquivo do banco no Apps Script. Sintaxe JavaScript, unicidade de IDs e 75 referências de arquivos HTML/cache foram conferidas.

No navegador local foram conferidos: abertura direta no modal do Cozinha; seleção de pessoa; PIN incorreto recusado e correto aceito; teclado na própria tela; campo somente leitura; entrada pelo teclado físico; apagar e limpar; lista de nomes disponível após recarga; indicador verde; arquivamento ausente das ações rápidas e presente apenas no cadastro. O modal de cadastro não tem rolagem horizontal em 320, 390 e 1280 px. Expediente e intervalo ficam em dois pares de campos. Evidências privadas em `.local/login-2026-10-23/`. Não foi testado em celular físico.

A logo usa o nome completo Alô RH. Os PNGs de 192 e 512 px são opacos, quadrados e mantêm todas as letras dentro do círculo de segurança de 40% para máscaras do sistema. Manifest, favicon, atalho Apple e service worker v1.2.0 apontam para os mesmos arquivos novos.

No runtime real do Google, a validação fictícia em memória terminou com sucesso em 2.263 ms; a conferência da prova de uso único levou 68 ms. A versão 8 foi publicada na implantação existente, mantendo URL e permissões. A leitura e as credenciais existentes foram verificadas pela API real: duas entradas completas levaram 4.729 e 6.001 ms, com derivação local de 23 e 21 ms; medições anteriores de login eram 7.363 e 10.079 ms. A preparação antecipada do desafio levou cerca de 2,5 s. São amostras, não garantia de latência: rede, Drive e inicialização do Google continuam influenciando o tempo.

Antes da implantação foram preservados: cópia do estado no Drive, cópia local validada com SHA-256 igual, código anterior do editor e bundle Git. A comparação após publicar confirmou os 34 funcionários, 268 registros e todos os campos de negócio iguais ao backup. Os testes de produção fizeram autenticação, leitura e saída; não editaram funcionários nem lançamentos. Os testes de mutação e sincronização usaram exclusivamente a cópia fictícia. CacheService armazena apenas desafios temporários; sua [documentação oficial](https://developers.google.com/apps-script/reference/cache/cache) não garante retenção até a expiração, por isso a perda do desafio recusa a entrada até nova preparação.

## Revisão v1.1.2

69 testes passaram com dados fictícios. Os seis casos novos cobrem estabilidade do indicador durante checagens, erro e reconexão, espera pela confirmação de gravação, preservação offline, arquivamento dentro do funcionário, cancelamento, restauração, histórico e permissões. Sintaxe JavaScript e XML dos 35 ícones também foram conferidos.

A ficha com os novos símbolos de Pix e WhatsApp foi conferida no navegador local. Na largura de 390 px, o modal permanece dentro da tela sem transbordamento horizontal. Em 1280 px foram conferidos a lista sem ação de arquivamento, o acesso ao cadastro e a restauração dentro da ficha. A conferência visual encontrou uma regra CSS que escondia o botão de abrir cadastro; o botão agora declara sua apresentação e área de toque de 44 px. O funcionário fictício arquivado no teste foi restaurado e voltou à lista de ativos. O diálogo nativo de confirmação interrompeu a automação; os caminhos de confirmação e cancelamento também têm cobertura automatizada. Nenhum funcionário real foi arquivado. Evidências privadas em `.local/ui-2026-10-23/`.

Esta revisão altera o frontend; não modifica o Apps Script nem o banco em produção. URLs dos scripts, estilos e ícones e a versão do service worker foram atualizadas em conjunto para evitar mistura com arquivos do cache anterior.

## Revisão anterior — v1.1.0

Branch: `codex/sincronizacao-seguranca`. Base: v1.0.52. Versão local: v1.1.0.

## Resultado atual

63 testes passaram com dados fictícios: 36 de regras, cálculos e acesso interno; 15 de transporte e fila; quatro do bundle Apps Script com Drive/LockService simulados; sete de migração e restauração; um de ponta a ponta via HTTP do servidor Node local. Comando: `node --test tests/*.test.cjs`.

O teste HTTP valida seleção pública sem dados de RH, PIN incorreto/correto, leitura protegida, alteração, arquivo persistido, confirmação, repetição sem duplicar, backup, isolamento de arquivos privados, recusa de origem externa e encerramento da sessão.

O login foi corrigido para **pessoa + PIN**, seguindo o acesso interno do Alô Cozinha. Foram removidos conta de titular, Google Identity, e-mail, recuperação por e-mail, QR e pareamento.

Os emojis da interface foram substituídos por SVGs simples. Foram verificadas sintaxe JavaScript, estrutura XML dos SVGs, ausência de IDs repetidos, referências de arquivos e recursos do service worker.

**Conferência no navegador concluída nesta revisão:** a cópia local abriu após iniciar o servidor. Foram verificados seleção de pessoa, recusa do PIN incorreto, entrada correta, bloqueio da segunda aba, ícones, navegação, gravação fictícia confirmada e persistência após recarga, confirmação adicional do PIN e acesso às cópias locais. Evidências privadas em `.local/pre-publicacao-2026-10-22/`. Não houve teste em aparelho móvel físico.

No runtime real do Google, um teste em memória, sem acesso ao Drive e com dados fictícios, validou migração, PIN, leitura, alteração, repetição idempotente e saída em 2.143 ms. A sintaxe de atribuição lógica foi substituída por uma forma aceita pelo parser do Apps Script. A versão 7 foi publicada na implantação existente, mantendo suas permissões.

A migração criou um novo estado privado, conferiu a gravação por releitura e preservou os bytes originais. Testes recusam origem alterada durante a migração, cópia gravada incorretamente, falta de gestor com PIN, destino já configurado e bloqueio indisponível. O backup da origem pode ser restaurado sem perda de campos. A cópia antiga de cada navegador é preservada e sua existência é avisada na primeira abertura.

## Correções da análise anterior

| Problema | Correção e cobertura |
| --- | --- |
| Falsa confirmação (S01–S04) | HTTP/JSON/ok/requestId e revisão; fila preservada em falha; sem fallback opaco. |
| Sobrescrita de salário/polling parcial (S05–S06) | Alterações por campo com base/revisão; atualização de todos os cadastros; conflito visível. |
| Escritas simultâneas (S07) | Lock até concluir backup e persistência; falhas não recebem ACK de sucesso. |
| Quinzena duplicada (S08) | Unicidade por funcionário/competência e idempotência. |
| Duas abas (S09) | Web Lock antes do login interno; segunda aba recebe bloqueio. |
| Senhas compartilhadas/token genérico (S10/S17) | PBKDF2 privado, sessões opacas e permissões no servidor; perfis fora das operações comuns de sync. |
| Restauração incompleta (S11) | Validação do esquema, prévia, cópia anterior e confirmação. |
| Excel/histórico salarial (S12/S13) | Valores numéricos corretos, competência, histórico e preservação de campos ausentes. |
| Vale-transporte (S14) | Cálculo comum à tela e impressão, recorte mensal e deduplicação de dias. |
| Caches de outros apps (S15) | Limpeza limitada ao prefixo próprio e sem cache de erros HTTP. |
| Legados/relógio (S16/S18) | Registros sem timestamp preservados; versões do servidor governam conflitos. |
| Requisição pendurada (S19) | Timeout e retentativas com atraso; fila sobrevive ao recarregamento. |

Outras verificações: edição durante envio; ACK perdido; falta de espaço; envio recusado; PIN errado e bloqueio resistente à troca do identificador de aparelho; sessão expirada; tokens rotativos; troca/exclusão de PIN invalidando outras sessões; último administrador protegido; permissões adulteradas; IDs perigosos; exclusão de cadastros em uso; pagamentos semanais sobrepostos; equivalência PBKDF2 Node/CryptoJS.

## Dados e limites

A cópia local preserva os cadastros e lançamentos originais. Dois lançamentos legados continuam sem cadastro correspondente. A tela de vínculos os sinaliza; não foi inventado o vínculo nem excluída a informação. Os detalhes permanecem apenas nos arquivos privados locais.

Não houve teste desta revisão em APK ou celular físico, teste prolongado de cotas/carga, nem validação contábil de todas as regras originais de folha.

Backups anteriores à implantação foram criados no Drive e no computador, com hashes SHA-256 iguais. O banco original permanece intacto; o serviço novo usa outro arquivo privado. A migração preservou 34 funcionários, 268 lançamentos e dois perfis de acesso existentes, sem ampliar permissões. Não houve modificação no Alô Cozinha nem uso de Supabase.


## v1.4.0 — categorias, confirmação de PIN e APK

102 testes Node aprovados; 3 testes Java aprovados; lint Android sem erros (avisos de versões das bibliotecas, JavaScript necessário à interface e ícone monocromático opcional). APK release assinado e verificado, 70 assets web comparados por SHA-256 com a fonte.

Revisão visual com dados fictícios em 320/390/1280px: barra de categoria/seleção em uma linha, nomes longos no seletor, cards abaixo, seleção entre filtros, Escape/teclado, menu em grade, PIN avançado vazio/incorreto/correto/cancelado. Nenhum overflow horizontal observado. Cancelamento durante resposta de PIN também coberto em teste automatizado.

Banco e Apps Script de produção inalterados nesta entrega; backup privado anterior preservado. APK usa o mesmo endpoint, uma origem local empacotada e armazenamento separado. A instalação física e as integrações nativas de impressão/arquivos precisam de conferência no celular. Veja ANDROID.md.

## v1.4.1 — resposta do acesso, sessão e ferramentas

- Troca de perfil abre o modal imediatamente; a revogação do token capturado segue em segundo plano. Fechar o app/alternar perfil não permite que uma resposta antiga derrube o novo acesso.
- Requisições concorrentes compartilham uma renovação. Resposta perdida usa o mesmo identificador persistido por até dois minutos; o servidor guarda somente hashes e nonce. Repetição com outro identificador/aparelho, fora da janela ou após saída permanece recusada.
- Login e consulta de revisão preparam o próximo desafio de PIN. Quando válido, a troca rápida de perfil reaproveita a preparação e a lista recente; a prova de PIN e a credencial offline são derivadas em paralelo. A verificação continua no Google, sem desbloqueio antecipado. Tokens de 30 minutos e limite absoluto de oito horas mantidos.
- Menu com seis ferramentas, sem botão `+`; categoria compacta, seleção por quadradinho e contador condicional. Presença semanal com calendário simples. Configurações avançadas sem URL, atualização forçada e parágrafo auxiliar.
- 116 testes Node aprovados, incluindo nove cenários de sessão, pausa de sincronização com resposta atrasada, permissões das ferramentas, transporte e preservação do histórico. Validação fictícia no Google concluída: 5.326 ms no total, 83 ms para prova de PIN.
- Interface conferida em 320, 390 e 1280 pixels, com dados fictícios; filtros, selecionar/desmarcar, três novos atalhos, presença semanal, confirmação de PIN e perfil restrito. Sem erros no console. Troca de perfil + captura do estado local: 371 ms, incluindo a automação; isso não mede a latência do Google.
- APK release 1.4.1 (versionCode 2), 829.033 bytes; três testes Java aprovados, lint com zero erros e quatro avisos já existentes. Mesma assinatura da v1.4.0; todos os 71 assets públicos comparados com as fontes. Nenhum aparelho conectado para validar a instalação física.
- Backup privado do estado completo e do código anterior preservado antes da implantação. Banco com 34 funcionários e 268 lançamentos. O teste em produção lê o banco e valida apenas o ciclo de autenticação/renovação/saída; não grava dados de RH.

Rollback: a versão 8 permanece no histórico do Apps Script, o APK 1.4.0 permanece em downloads e há bundle Git privado anterior. Não restaurar o banco por cima de lançamentos posteriores; a atualização altera apenas código e metadados de sessão.
