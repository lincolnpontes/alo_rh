# Validação local — 23/10/2026

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
