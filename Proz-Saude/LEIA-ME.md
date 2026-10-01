# Proz Saúde — pacote de design para importar no Figma

## Comece por aqui

Este ZIP contém a pasta completa solicitada. O importador monta o design no seu Figma com textos editáveis, componentes, instâncias, Auto Layout, estilos e navegação. Não é preciso instalar Node, executar terminal, publicar plugin ou usar a integração do ChatGPT com Figma.

### Importação recomendada: componentes e Auto Layout

Use o aplicativo Figma Desktop no Windows ou macOS, em um arquivo de Design que você possa editar.

1. Extraia todo o ZIP. Não abra os arquivos de dentro do ZIP ainda compactado.
2. Crie um arquivo novo de Figma Design.
3. No menu do Figma, abra **Plugins → Development → New Plugin**. Escolha Figma Design e o modelo **Run once**. Nomeie como **Proz Saúde — Importador** e salve a pasta criada pelo Figma.
4. Copie **Importar-no-Figma/code.js** deste pacote para a pasta do plugin que o Figma acabou de criar, substituindo o code.js dela. Preserve o manifest.json e o identificador gerados pelo próprio Figma.
5. Execute **Plugins → Development → Proz Saúde — Importador**. Aguarde a mensagem de conclusão.
6. O arquivo estará organizado em seis páginas. Comece por **03 — Desktop** ou **04 — Mobile**. No modo de apresentação, selecione o fluxo Proz Saúde / Desktop ou Proz Saúde / Mobile.
7. Para guardar uma cópia .fig, use **File → Save local copy**.

A importação não apaga conteúdo anterior. Para evitar duplicações, rode em arquivo novo. Ela usa a fonte **Arial** (equivalente legível à Inter), que deve estar disponível no computador. Os ícones são vetoriais da família **Lucide**.

### Se houver limite de páginas no seu plano

Alguns arquivos de equipe Starter limitam a quantidade de páginas. O importador padrão exige seis. Se o Figma impedir essa criação, ele interrompe antes de desenhar e remove apenas as páginas vazias que acabou de tentar criar.

Nesse caso, substitua o code.js do seu plugin pelo **code-compacto.js**, renomeando-o para **code.js**, e rode novamente em arquivo vazio. A versão compacta mantém as mesmas telas, componentes e links em uma única página, distribuídos em áreas. Ela é uma alternativa para o limite de páginas; o pacote padrão continua organizado nas seis páginas pedidas.

O arquivo manifest.exemplo.json é apenas referência. Seu identificador de plugin deve vir do Figma; não é necessário editar ou inventar um ID.

### Outras formas de consultar

- **Preview/ABRIR-PREVIA.html:** prévia visual navegável, offline, com seletor de tela e versão. Os campos são desenhos e não gravam informações.
- **Design/Desktop**, **Design/Mobile**, **Design/States:** SVGs individuais para consulta ou importação vetorial. Os SVGs mostram o conteúdo completo das áreas roláveis. Arrastar SVGs não recria componentes, Auto Layout nem ligações — para isso, use o importador.
- **Design/Foundations**, **Design/Components**, **Design/Fluxo:** amostras visuais do sistema de design e do fluxo.
- **Design/design.json:** definição completa que gera a importação e a prévia.
- **Design/INVENTARIO.csv:** lista das telas e estados.

## Conteúdo do projeto

**85 telas e estados únicos:** 37 telas/estados obrigatórios em duas versões (74), uma tela mobile “Mais” e dez pranchas auxiliares de confirmação/retomada (cinco em cada versão).

**Componentes:** 75 componentes/variantes de interface, organizados em 26 famílias, mais 46 componentes de ícones vetoriais. São criados 121 componentes principais e 16 conjuntos de variantes. Botões, campos e estados possuem variantes reutilizáveis. As telas usam instâncias, em vez de cópias desconectadas. Os rótulos principais expõem propriedades de texto.

Para manter os links de protótipo dentro da mesma página, os estados também ficam junto à versão desktop/mobile. A página States reúne 20 cópias desses estados para inspeção; elas não contam como telas novas.

**Páginas padrão:**

- 00 — Fluxo
- 01 — Foundations
- 02 — Components
- 03 — Desktop
- 04 — Mobile
- 05 — States

**Fluxo principal conectado:** Login → Setembro Amarelo → Início → Pacientes → Prontuário → Triagem → Enfermagem → Nova anotação → Revisão → Prontuário.

Também há acesso a exames, prescrição, histórico, documentos, saída hospitalar e cirurgias. O botão do menu lateral alterna entre sidebar aberta e fechada. No mobile, a barra inferior e o cabeçalho do paciente ficam fora da área rolável.

## Critérios aplicados

Proz Saúde é hospitalar. Foram retirados a agenda de retornos e o contexto de consultório. A paleta segue azul petróleo #0B4352, #07333F, branco, grafite e apoio amarelo. Vermelho fica reservado ao alerta de alergia. O risco de queda tem indicação textual e amarelo de apoio. Não há fotos de pessoas, emojis, saudações ou slogans.

As telas de anamnese, exame físico e prescrição apresentam consulta para o perfil técnico de enfermagem. Triagem e saída hospitalar identificam o profissional autorizado. As informações do protótipo são fictícias; os campos não sugerem diagnóstico, doses ou tratamento. O foco é a organização do design para a aula.

## Verificação e limites

Conferidos: 85 descrições de tela, 121 componentes principais, hierarquia de Auto Layout, correspondência das instâncias, existência dos destinos e 1.169 ligações de navegação, além dos dois controles de alternância do menu. Não foram detectados elementos fora dos limites planejados, salvo o conteúdo intencional das áreas de rolagem.

O importador padrão e o compacto passaram por execução local com uma simulação da API para conferir dependências e construção. Os desenhos foram renderizados para inspeção visual. **O importador não foi executado no editor Figma nesta sessão.** A importação real pode revelar diferenças de fonte ou comportamento do editor e precisa ser conferida após executar.

Os campos e estados são de design, não um sistema funcional. Algumas linhas de pacientes são exemplos sem navegação para outros prontuários. Os controles de seleção exemplificam estados; não alteram dados clínicos. A confirmação de saída demonstra transferência; a tela de saída contém alta, transferência e óbito no mesmo formulário.

## Referências de importação

https://help.figma.com/hc/en-us/articles/360042786733-Create-a-plugin-for-development
https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files
https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages
https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizinghorizontal/
https://developers.figma.com/docs/plugins/api/properties/nodes-reactions/

Licença dos ícones: Licencas/LUCIDE-LICENSE.txt.
