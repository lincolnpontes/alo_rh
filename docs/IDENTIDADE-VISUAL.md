# Logo Alô RH — v1.2.0

Nome completo em duas linhas: **Alô** acima de **RH**. Letras brancas grandes, fundo verde opaco e poucos elementos. O H termina em uma pequena ponta de balão. Não há texto miúdo nem moldura que possa ser recortada pelo Android.

Criada em 23/10/2026 com a ferramenta ImageGen, revisando a primeira proposta para incluir o nome completo solicitado. Orientação usada: preservar o fundo verde e o estilo simples; escrever exatamente “Alô” sobre “RH”, incluindo o circunflexo; manter o conjunto central com espaço seguro para o ícone do celular; evitar detalhes pequenos e palavras adicionais.

Arquivos finais: `icons/alo-rh-v120-192.png` e `icons/alo-rh-v120-512.png`. O original de 1254 px foi preservado no diretório local de imagens geradas. Pillow foi usado somente para conversão RGB e redução proporcional com Lanczos.

As letras ocupam raio máximo de 37,8% da largura, dentro do círculo seguro de 40% do ícone maskable. Os dois PNGs são quadrados, opacos e não sofrem esticamento. Manifest, favicon, atalho Apple e cache foram atualizados juntos, mantendo o mesmo identificador de instalação do app.

## Cabeçalho e ações — v1.3.0

O desenho foi revisado por um agente de design com acesso ao código real do Alô Cozinha. O cabeçalho reaproveita a estrutura em grid dos módulos e o tratamento do perfil ativo. `icons/settings-gear.png` é cópia exata de `assets/settings-gear.png` do Cozinha, usada em 40 px dentro de um botão de 44 px.

As ilustrações de Ponto, Quinzena, VT e Docs estão em `icons/actions/`. São SVGs próprios de 128×128, derivados do sistema visual de `assets/module-manager.svg` do Cozinha: papéis claros, azul/verde, volume discreto e detalhes suficientes para leitura a 40 px. Foram desenhados diretamente em vetor; não são emojis nem dependem de fontes ou imagens externas.
