# Comportamento

Consolidação local de 30/09/2026: módulos clínicos exigem `?patient=<id>` válido; ausência ou ID inexistente direciona à lista de pacientes. Rascunhos são separados por formulário e paciente. Revisão usa os campos obrigatórios do formulário de origem. Na ausência de sinais vitais confirmados, mostrar “Não registrado”. Ações sem permissão clínica ficam desabilitadas na interface e continuam bloqueadas pela API.

Navegação lateral aberta/recolhida no desktop. No mobile, TopBar de 56 px e navegação inferior de 76 px, com conteúdo rolável. Cabeçalho e alertas de paciente devem persistir entre seções. Alertas de alergia e risco de queda têm texto além de cor.

Busca, filtros, abas, formulários, confirmação e correção devem alterar o estado real da aplicação. Ações clínicas exigem registro persistente e autoria. Estados de erro, vazio, offline, sem permissão, sessão expirada e rascunho têm telas próprias no inventário.

Consolidação local de 01/10/2026: filtros "Internados" e "Todos" atualizam lista e estado selecionado; a tela "Sem resultado" limpa para a lista completa de Pacientes. Configurações mantém apenas opções funcionais; o menu compacto já mostra os nomes e sua preferência pode ser alterada no botão do menu. A página Setembro Amarelo oferece continuidade para Início e usa o banner em `public/setembro/voce-nao-esta-sozinho.png`. Revisões aguardam os dados do rascunho e bloqueiam confirmação vazia.

Nenhuma tela de recuperação de senha é funcional nesta versão.
