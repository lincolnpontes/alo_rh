# Validação local — 22/10/2026

Branch: `codex/sincronizacao-seguranca`. Base: v1.0.52. Versão local: v1.1.0.

## Resultado atual

56 testes passaram com dados fictícios: 36 de regras, cálculos e acesso interno; 15 de transporte e fila; quatro do bundle Apps Script com Drive/LockService simulados; um de ponta a ponta via HTTP do servidor Node local. Comando: `node --test tests/*.test.cjs`.

O teste HTTP valida seleção pública sem dados de RH, PIN incorreto/correto, leitura protegida, alteração, arquivo persistido, confirmação, repetição sem duplicar, backup, isolamento de arquivos privados, recusa de origem externa e encerramento da sessão.

O login foi corrigido para **pessoa + PIN**, seguindo o acesso interno do Alô Cozinha. Foram removidos conta de titular, Google Identity, e-mail, recuperação por e-mail, QR e pareamento.

Os emojis da interface foram substituídos por SVGs simples. Foram verificadas sintaxe JavaScript, estrutura XML dos SVGs, ausência de IDs repetidos, referências de arquivos e recursos do service worker.

**Conferência visual desta revisão pendente:** a ferramenta de navegador recusou a abertura de `http://127.0.0.1:49317/` pela política de URL. Não foi tentado contorno. As capturas anteriores em `.local/auditoria/` pertencem à versão anterior ao ajuste do login/ícones e não comprovam o visual atual.

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

O teste local não mede CORS, redirecionamentos, latência ou cotas de uma implantação real do Apps Script. Não houve teste desta revisão em APK ou celular físico, nem validação contábil de todas as regras originais de folha.

O código é enviado ao GitHub em uma branch de desenvolvimento, sem implantação. Não houve POST no Apps Script de produção, alteração do banco original ou modificação no Alô Cozinha. Nenhum recurso Supabase foi criado ou usado.
