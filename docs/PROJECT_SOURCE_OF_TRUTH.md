# Proz Saúde — fonte de verdade local

Esta é a referência operacional temporária para continuar o produto em localhost enquanto o Figma MCP estiver indisponível. Requisitos explícitos do pedido de 30/09/2026 prevalecem; `design-reference/figma/` e `docs/figma/` são referências locais anteriores, úteis para composição e inventário, mas não prova do estado atual do Figma. Quando o acesso voltar, comparar visualmente sem desfazer fluxos funcionais por suposição.

## Produto e identidade

- Prontuário eletrônico **hospitalar** para profissionais autorizados. Não há agenda de consultas, fluxo de clínica ou recomendações médicas automáticas. Dados de demonstração são fictícios.
- O amarelo da identidade é a cor principal da interface e é **sempre `#FFEA94`** (tokens `--yellow`, `--yellow-soft`, `--sidebar`), inclusive nos botões principais; texto sobre amarelo é escuro e os botões não têm borda amarela. Azul-petróleo `#0B4352` fica reservado a alguns detalhes e ao contorno de foco. Botões secundários têm fundo transparente; na navegação, texto e ícone do item ativo ficam vermelhos, sem fundo ou contorno. Tokens ficam em `app/globals.css`.
- Abas e filtros selecionados ficam com texto e ícone vermelhos, sem fundo; os demais têm fundo transparente. A lista de pacientes abre em "Internados" e alterna para "Todos" com resultados reais. O estado "Sem resultado" retorna à lista completa ao limpar a busca. A marca respeita a altura declarada no componente, inclusive no menu aberto.
- A imagem anexada no pedido de 30/09/2026 é a logo oficial. O arquivo original fica em `public/brand/proz-saude.png` e não deve ser redesenhado, recolorido ou distorcido. Marca em login, topbar, sidebar, telas institucionais e ADM consome o componente único `components/Brand.tsx`.
- Tipografia legível, uma família, títulos e rótulos claros, botões de 44 px, controles de 46 px, foco visível e áreas de toque de pelo menos 44 px. Evitar sombras, gradientes e ornamentação sem função.

## Layout e navegação

- **Foco principal: tablet.** Faixas: celular < 700 px (composição Mobile); tablet em pé 700–1023 px (composição Desktop com menu lateral compacto de ícone + nome, alvos de 56 px); tablet deitado e desktop ≥ 1024 px (menu completo). Nenhuma palavra pode ser quebrada no meio nem cortada em botões; botões usam a largura do design como mínima e linhas de botões quebram para a linha seguinte.
- Após o login, o profissional chega à página do Setembro Amarelo dentro do sistema (menu e barra superior da tela Início), com botão para continuar ao Início. Banner oficial em `public/setembro/voce-nao-esta-sozinho.png`; sem o arquivo, um banner equivalente em texto é exibido.
- Menu lateral (layout aprovado em 01/10/2026): Início, Pacientes, Prontuários, Cirurgias, Documentos, Saídas hospitalares, Configurações; rodapé com perfil e "Sair da conta". Triagem, Enfermagem e Exames saíram do menu e ficam em: Acesso rápido do Início (Enfermagem, Exames, Triagem), atalhos em cada paciente da lista (Triagem, Enfermagem, Exames) e abas do prontuário. Atalho sem paciente leva a Pacientes com o aviso "Escolha o paciente para abrir…" e segue direto para a seção. O menu inferior do celular mantém Enfermagem.
- Desktop: sidebar com estado ativo claro e ação "Sair da conta" no rodapé; a preferência pelo menu compacto persiste entre páginas e permite navegar sem expandi-lo. Topbar, identificação e alertas do paciente permanecem acessíveis enquanto o conteúdo clínico rola. Nenhum overflow horizontal da página.
- Mobile: composição própria com topbar, contexto do paciente, alertas, conteúdo rolável e navegação inferior fixa. Acessos rápidos: Início, Pacientes, Prontuário, Enfermagem e Mais. Outras seções ficam no menu Mais ou na navegação do prontuário. A mesma função clínica deve estar disponível em desktop e mobile.
- Manter o identificador do paciente na URL entre módulos. Uma URL com paciente inválido não pode abrir silenciosamente outro prontuário. Antes de criar um registro, exigir paciente selecionado.

## Módulos e fluxos

- Fluxo central: Login → tela institucional, quando aplicável → Início → Pacientes → Prontuário → Triagem → Enfermagem → Nova anotação → Revisão → Confirmação → Prontuário.
- Prontuário: identificação, admissão/internação, triagem, sinais vitais, anamnese, exame físico, exames/resultados, prescrição/checagem, enfermagem, histórico, procedimentos, cirurgias, documentos, alergias/riscos e saída hospitalar.
- Cirurgias: Início → Cirurgias → Detalhes → prontuário do mesmo paciente. Busca e filtros devem operar sobre dados persistidos. Revisar mostra os dados preenchidos; corrigir os preserva; confirmar salva com autoria e retorna ao contexto correto.
- As telas de revisão aguardam o rascunho local antes de exibir os dados ou permitir a confirmação; não é possível confirmar uma revisão vazia.
- Rascunhos locais precisam ser separados por paciente e formulário. Registros confirmados e anexos locais pertencem ao paciente correto. O histórico apresenta momento, tipo e autoria quando disponível.
- "Retomar rascunho" só aparece quando existe uma anotação local preenchida para o paciente atual.
- Estados de loading, vazio, erro, sucesso, offline, sem permissão, sessão expirada e rascunho salvo compartilham o design system. Sucesso não usa aparência de erro. Alergias e riscos são identificados por texto.

## Acesso, administração e segurança

- Autenticação local, senha com hash, sessão protegida, autorização e validação no servidor, persistência em JSON local e auditoria permanecem ativos. Não usar serviços externos nem fazer deploy.
- Perfis atuais: administrador (único, definido em `.env.local`, só painel de contas), enfermeiro, técnico de enfermagem e médico. Não existem usuários pré-cadastrados nem tela de configuração inicial. Permissões clínicas são verificadas na API; ações sem permissão devem oferecer leitura ou indicar claramente a restrição na interface.
- O painel ADM serve apenas para contas de acesso (CRUD completo das contas assistenciais). Excluir só é permitido para contas sem registros clínicos; as demais são desativadas. Mudança de senha, perfil, e-mail ou desativação encerra as sessões abertas. Apenas administrador entra. Não acrescentar funções clínicas ao painel.
- `Esqueceu a senha?` é apenas um controle visual. Pode orientar a procurar o administrador; não existem recuperação, e-mail, token, código, redefinição ou rota funcional.
- Preservar `.env.example`, proteção de rotas e ausência de segredos versionados. Usar somente pacientes fictícios.

## Decisões de consolidação

- O renderizador e o pacote de telas locais existentes são mantidos enquanto forem coerentes; correções compartilhadas vêm antes de ajustes pontuais.
- A sidebar amarela e os tokens existentes são decisões de continuidade locais. Seu valor e sua equivalência exata com o Figma atual precisam de revisão futura.
- `docs/figma/` mantém o inventário histórico; seus IDs, dimensões e SVGs não são tratados como nova consulta ao Figma.
