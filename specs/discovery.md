# Discovery: Aplicação de Previsão do Tempo

## Contexto

A empresa solicitou uma aplicação de previsão do tempo para que usuários consultem as condições meteorológicas de cidades. A experiência deve permitir buscar uma cidade, visualizar o clima atual e a previsão dos próximos cinco dias, alternar entre Celsius e Fahrenheit e funcionar em dispositivos móveis.

O briefing define as capacidades principais, mas ainda não especifica a plataforma técnica, o público prioritário, as regiões atendidas, o detalhamento das informações meteorológicas nem o fuso horário, a granularidade e os campos da previsão. A janela de cinco dias já foi definida como hoje mais os quatro dias seguintes.

## Personas (Hipóteses)

As personas abaixo são hipóteses baseadas nas tarefas descritas no briefing; devem ser validadas com usuários reais. Os tempos indicados são alvos exploratórios, não critérios de aceite aprovados.

### 1. Decisor do dia a dia

- **Objetivo principal:** saber rapidamente as condições atuais para decidir como se vestir ou se preparar para sair.
- **Contexto de uso:** principalmente mobile, em consultas rápidas antes de sair ou durante o deslocamento; pode preferir Fahrenheit ou Celsius conforme sua região.
- **Métrica de sucesso pessoal (hipótese):** encontrar a cidade correta e entender a temperatura e condição atual em até 30 segundos, sem precisar repetir a busca; validar esse alvo com usuários.

### 2. Planejador de viagem

- **Objetivo principal:** consultar a previsão dos próximos cinco dias para escolher quando viajar ou como organizar atividades.
- **Contexto de uso:** principalmente desktop ao planejar, com consultas posteriores pelo celular; busca cidades de destino e compara as condições dia a dia.
- **Métrica de sucesso pessoal (hipótese):** localizar o destino e identificar, em uma única consulta, quais dias atendem às suas necessidades de planejamento em até dois minutos; validar esse alvo com usuários.


## Requisitos Funcionais

- **RF1** — Buscar cidade por nome (com sugestões/desambiguação).
- **RF2** — Exibir clima atual (temperatura, condição, umidade, vento, pressão, precipitação).
- **RF3** — Exibir previsão de 5 dias (mín/máx, condição, precipitação, vento).
- **RF4** — Alternar unidade Celsius/Fahrenheit, atualizando todos os valores.
- **RF5** — Indicar estados de carregamento, erro e vazio.

## Requisitos Não-Funcionais

- **RNF1 — Performance:** carga inicial < 2s em conexão típica; resposta de busca percebida como instantânea.
- **RNF2 — Responsividade:** mobile-first; funcional de 320px a desktop.
- **RNF3 — Acessibilidade:** navegação por teclado, roles/labels semânticos, contraste adequado (WCAG AA básico).
- **RNF4 — Resiliência:** degradação graciosa em falha de rede/API.
- **RNF5 — Sem chave de API:** usar fonte pública (Open-Meteo) para simplificar deploy estático.
- **RNF6 — Observabilidade básica:** mensagens de erro claras ao usuário.

## Riscos

| Tipo | Risco | Probabilidade | Impacto | Estratégia de mitigação |
| --- | --- | --- | --- | --- |
| Técnico | Indisponibilidade, lentidão ou limite de requisições do Open-Meteo interromper consultas. | Média | Alto | Validar limites e garantias do serviço; definir timeout, tratamento de erros, retentativa controlada e política de cache com indicação da atualização dos dados. |
| Técnico | Dados meteorológicos desatualizados, imprecisos ou sem cobertura para algumas cidades. | Média | Alto | Validar cobertura e horário de atualização do Open-Meteo; exibir horário/fuso da observação e comunicar indisponibilidade de dados. |
| Técnico | Busca retornar cidades homônimas ou coordenadas incorretas. | Média | Alto | Exibir país e região nos resultados, permitir confirmação do local e testar buscas ambíguas e sem resultado. |
| Técnico | Fuso horário e limites do dia causarem datas erradas na previsão de hoje mais quatro dias. | Média | Alto | Usar o fuso horário do local selecionado e cobrir mudanças de data e horário de verão nos testes. |
| Técnico | Conversão ou formatação incorreta de unidades gerar valores enganosos. | Baixa | Alto | Centralizar conversões e formatação, indicar unidades junto aos valores e validar conversões com testes automatizados. |
| Técnico | Desempenho ruim em redes móveis ou dispositivos de baixo desempenho. | Média | Médio | Definir metas separadas para interface e serviço externo, limitar recursos carregados e medir a experiência em rede e dispositivos representativos. |
| Técnico | Falha de rede deixar a interface sem explicação ou apresentar dados antigos como atuais. | Média | Alto | Prever estados de carregamento, erro e ausência de dados; oferecer nova tentativa e identificar claramente dados em cache e seu horário. |
| Produto | Granularidade e campos da previsão não corresponderem às expectativas dos usuários. | Alta | Médio | Validar com usuários se a previsão deve ser diária ou horária e quais informações são necessárias antes de fechar os critérios de aceite. |
| Produto | Experiência em telas pequenas dificultar busca ou leitura da previsão. | Média | Alto | Adotar abordagem mobile-first, validar em larguras e dispositivos representativos e testar as tarefas principais com usuários. |
| Produto | Barreiras de acessibilidade impedirem parte dos usuários de consultar ou operar a aplicação. | Média | Alto | Definir padrão de conformidade, projetar controles semânticos e operáveis por teclado e validar com ferramentas e testes manuais. |
| Produto | Falta de objetivo e métricas de sucesso levar a um produto sem valor demonstrável ou prioridades claras. | Média | Alto | Acordar problema, público prioritário e indicadores de sucesso antes de expandir o escopo. |
| Produto | Requisitos não esclarecidos sobre geolocalização, favoritos ou persistência ampliarem escopo e atrasarem a entrega. | Média | Médio | Delimitar a primeira versão e registrar explicitamente quais capacidades são adiadas; pedir consentimento antes de coletar localização. |
| Produto | Idioma, formatos regionais ou unidades padrão não atenderem o público-alvo. | Média | Médio | Confirmar mercados e preferências regionais; validar idioma, datas e unidades com usuários representativos. |
| Produto | Termos, custos ou mudanças do Open-Meteo restringirem o uso ou tornarem a solução inviável. | Baixa | Alto | Validar licença, atribuição, limites e política de mudanças como condição para lançamento; estimar volume e custo para o uso esperado. |

## Perguntas em Aberto

1. **Qual problema de negócio o app deve resolver e quais indicadores medirão seu sucesso?** *(Impacto: sem objetivo e métricas, não há base para priorizar funcionalidades nem avaliar valor.)*
2. **Quais usuários e situações de uso são prioritários?** *(Impacto: orienta conteúdo, fluxo e prioridade entre mobile e desktop; as personas atuais ainda são hipóteses.)*
3. **A plataforma será web responsiva, PWA, nativa ou combinação? A aplicação chamará o Open-Meteo diretamente ou por um serviço intermediário?** *(Impacto: condiciona arquitetura, distribuição, hospedagem, segurança operacional e suporte.)*
4. **Quais países e regiões terão cobertura?** *(Impacto: precisa ser confrontado com a cobertura e as regras do Open-Meteo e afeta localização e conformidade.)*
5. **Além da interface em pt-BR já decidida, quais formatos de data/hora, convenções regionais e idiomas adicionais serão suportados?** *(Impacto: afeta apresentação de datas e expansão para outros mercados.)*
6. **Como a busca será feita e quais informações geográficas identificarão cada resultado?** *(Impacto: sem desambiguação suficiente, o usuário pode consultar a cidade errada.)*
7. **Qual comportamento será apresentado para consulta vazia, cidade não encontrada ou local inválido?** *(Impacto: define se o usuário consegue recuperar-se de buscas sem resultado.)*
8. **A busca será manual ou também usará geolocalização?** *(Impacto: localização exige permissão, fluxo de recusa e decisões de privacidade.)*
9. **Sem autenticação nem persistência de servidor, quais preferências (cidade, unidade, favoritos ou histórico) devem persistir localmente e por quanto tempo?** *(Impacto: afeta experiência entre sessões, armazenamento no dispositivo e privacidade.)*
10. **Quais campos compõem o clima atual (por exemplo, temperatura, sensação térmica, umidade, vento e precipitação)?** *(Impacto: define dados necessários, contrato de integração, layout e critérios de aceite.)*
11. **Qual frequência de atualização e defasagem máxima são aceitáveis para observações e previsões?** *(Impacto: afeta cache, confiança e política de atualização; precisa ser compatível com o provedor.)*
12. **A escolha do Open-Meteo está condicionada a quais confirmações de cobertura, licença/atribuição, limites de uso e disponibilidade?** *(Impacto: uma restrição do serviço pode exigir mudança de integração ou provedor.)*
13. **Qual fuso horário local define os limites de “hoje” na previsão de hoje mais quatro dias?** *(Impacto: sem essa regra, datas exibidas podem divergir do dia local da cidade.)*
14. **A previsão será diária, horária ou ambas, e quais campos serão exibidos em cada período?** *(Impacto: determina volume e formato dos dados, interface e critérios de aceite.)*
15. **A alternância entre Celsius e Fahrenheit afeta somente temperatura? A preferência será salva localmente e qual precisão será exibida?** *(Impacto: evita inconsistência entre valores, rótulos e sessões; Celsius como padrão já está decidido.)*
16. **Alertas meteorológicos estão dentro do escopo da primeira versão?** *(Impacto: podem exigir outra fonte, atualização mais urgente e tratamento de risco ao usuário.)*
17. **Como a aplicação tratará carregamento, falha do provedor, perda de conexão e dados em cache? Haverá suporte offline e qual idade máxima do cache?** *(Impacto: define resiliência e evita apresentar informação vencida como atual.)*
18. **Quais metas de desempenho e disponibilidade serão usadas, em quais condições de rede e separando aplicação de Open-Meteo?** *(Impacto: sem metas verificáveis, qualidade e responsabilidade por falhas externas não podem ser validadas.)*
19. **WCAG 2.2 AA será o nível de acessibilidade adotado ou há outro padrão exigido?** *(Impacto: o alvo atual é uma proposta; a decisão afeta implementação e critérios de conformidade.)*
20. **Quais dispositivos, larguras, navegadores e versões mínimas serão suportados?** *(Impacto: define matriz de compatibilidade e cobertura dos testes; 320 px é apenas uma proposta inicial.)*
21. **Haverá geolocalização, analytics ou logs? Quais dados serão coletados, retidos ou enviados a terceiros?** *(Impacto: mesmo sem conta ou persistência de servidor, dados no cliente e telemetria têm implicações de privacidade e conformidade.)*
22. **Há identidade visual, conteúdo editorial ou diretrizes de marca obrigatórios?** *(Impacto: afeta interface, tom das mensagens e esforço de design/conteúdo.)*
23. **Quais são as restrições de hospedagem, tecnologia, orçamento e prazo, e quem opera e monitora o serviço?** *(Impacto: condiciona arquitetura viável, escopo e resposta a incidentes.)*
24. **Quais critérios de aceite cobrirão busca, seleção do local, atualidade dos dados, previsão, unidades, acessibilidade e falhas?** *(Impacto: sem critérios observáveis, implementação e validação ficam sujeitas a interpretações diferentes.)*

## Decisões

- **Fonte de dados: Open-Meteo, sem API key.** Justificativa: atende à necessidade de obter dados meteorológicos sem exigir gestão de uma chave de API. Resolve a escolha inicial da fonte na pergunta 12; cobertura, termos/licença, limites e disponibilidade do serviço ainda precisam ser verificados.
- **“5 dias” significa hoje + os quatro dias seguintes.** Justificativa: estabelece um período de previsão consistente para produto, interface e validação. Resolve a ambiguidade principal da pergunta 13; o fuso horário que determina o início de cada dia ainda precisa ser definido.
- **Unidade padrão: Celsius.** Justificativa: define uma apresentação inicial consistente com a localização pt-BR. Resolve a escolha da unidade inicial na pergunta 15; persistência da preferência e unidades de vento, precipitação e pressão seguem em aberto.
- **Sem autenticação e sem persistência de servidor.** Justificativa: mantém a primeira versão focada nas consultas meteorológicas, sem contas ou armazenamento de dados de usuário no servidor. Resolve parte das perguntas 9 e 21; persistência local, favoritos e histórico de busca ainda não foram decididos.
- **Idioma da interface: pt-BR.** Justificativa: define o idioma da experiência inicial para o público brasileiro. Resolve o idioma da interface na pergunta 5; formatos regionais, fuso horário e eventual suporte a outros idiomas permanecem em aberto.

## Suposições

- O usuário inicia a consulta pesquisando uma cidade; geolocalização automática não está confirmada pelo briefing.
- A aplicação depende de dados meteorológicos do Open-Meteo; adequação da cobertura e condições do serviço ainda precisam ser validadas.
- O clima atual e a previsão referem-se à cidade selecionada pelo usuário.
- A alternância entre Celsius e Fahrenheit afeta todas as temperaturas apresentadas, sem alterar a condição meteorológica descrita.
- A aplicação deve permitir concluir as consultas principais em dispositivos móveis, mas não há requisito confirmado de funcionamento offline.
- Não haverá autenticação nem persistência de servidor na primeira versão; persistência local de preferências, favoritos e histórico de busca ainda não foi decidida.