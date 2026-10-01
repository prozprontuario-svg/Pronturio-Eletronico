# Decisões e lacunas

Decisão de continuidade (pedido de 30/09/2026): a indisponibilidade do Figma MCP não bloqueia correções locais. `docs/PROJECT_SOURCE_OF_TRUTH.md` governa a consolidação temporária; o arquivo Figma será comparado novamente quando acessível. A logo oficial veio anexada ao pedido e tem prioridade sobre qualquer reconstrução ou marca anterior.

1. Os 20 frames repetidos de estados não viram rotas adicionais. O primeiro ID de cada nome é a referência canônica.
2. As telas de recuperação e instruções enviadas permanecem apenas no inventário histórico. A regra explícita do pedido as exclui do produto.
3. A conexão `david` atingiu o limite MCP Starter. A auditoria de hierarquia se apoiou nos metadados completos; a auditoria de conteúdo secundário usa o pacote local anterior como apoio. A equivalência visual atual de todas as telas ainda precisa ser confirmada quando o limite permitir.
4. O pacote local anterior não substitui o Figma atual em caso de divergência.
5. Prisma é a camada de dados das rotas. `node:sqlite` inicializa as tabelas e a amostra fictícia em localhost. A migração futura para PostgreSQL exige trocar o provedor/URL e a inicialização, mantendo as regras nas rotas e os modelos Prisma.
6. O logo aprovado no Figma atual não foi baixado por indisponibilidade da rede de assets. A marca textual é provisória; a fidelidade visual desse elemento permanece pendente.
