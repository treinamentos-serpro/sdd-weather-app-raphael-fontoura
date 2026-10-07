# Especificação de Produto: Aplicação de Previsão do Tempo

## Overview

Aplicação de previsão do tempo para consultar condições meteorológicas de cidades. A primeira versão deve permitir encontrar e selecionar uma cidade, consultar o clima atual e a previsão diária de cinco dias (hoje e os quatro dias seguintes) e alternar temperaturas entre Celsius e Fahrenheit.

- **Status:** MVP de aplicação web responsiva; decisões de produto do MVP aprovadas.
- **Plataforma:** web responsiva, sem app nativo ou PWA.
- **Idioma da interface:** pt-BR.
- **Fonte de dados e acesso:** Open-Meteo chamado diretamente, sem chave de API. A validação formal de cobertura, termos, atribuição e limites foi explicitamente adiada para depois do MVP.
- **Cobertura geográfica:** cidades brasileiras retornadas pela fonte, priorizadas na busca, e as capitais internacionais aprovadas: Buenos Aires, Canberra, Ottawa, Beijing, Paris, Berlin, New Delhi, Jakarta, Rome, Tokyo, Mexico City, Moscow, Riyadh, Pretoria (capital administrativa), Seoul, Ankara, London e Washington, D.C.
- **Unidade inicial:** Celsius.
- **Público hipotético:** pessoas que consultam rapidamente as condições do dia e pessoas que planejam viagens ou atividades para os próximos dias. As personas ainda precisam de validação.
- **Critério de sucesso do MVP:** todos os critérios de aceite funcionais passam e os requisitos não funcionais são verificados na matriz de suporte definida. Métricas de adoção e analytics ficam fora do MVP.

## Functional Requirements

- **RF1 — Busca e seleção de cidade:** permitir pesquisar manualmente cidades brasileiras retornadas pela fonte e as capitais internacionais listadas no Overview. Priorizar resultados brasileiros; identificar cada resultado com região e país quando disponíveis; excluir outros locais internacionais; e distinguir busca vazia, ausência de local suportado e falha de serviço.
- **RF2 — Clima atual:** para o local selecionado, apresentar temperatura, condição meteorológica, umidade, vento, pressão e precipitação. Exibir temperatura em Celsius/Fahrenheit conforme RF4, umidade em porcentagem, vento em km/h, pressão em hPa e precipitação em mm. Valores ausentes devem ser marcados como indisponíveis. Exibir o horário de observação/atualização no fuso local quando fornecido. Dados com mais de 60 minutos de idade não podem ser apresentados como atuais.
- **RF3 — Previsão de cinco dias:** apresentar cinco datas consecutivas, começando pela data atual no fuso local do lugar selecionado, com mínima, máxima, condição meteorológica, precipitação e vento em cada data. Temperaturas seguem RF4; precipitação é exibida em mm e vento em km/h. Datas ou campos sem dados devem permanecer identificáveis como indisponíveis.
- **RF4 — Alternância de temperatura:** iniciar em Celsius e permitir alternar Celsius/Fahrenheit, atualizando todas as temperaturas atuais e previstas e arredondando ao grau inteiro mais próximo. A conversão não deve alterar a cidade, outros valores ou a condição meteorológica.
- **RF5 — Estados da consulta:** distinguir carregamento, ausência de resultados, indisponibilidade de dados, falha de serviço e timeout. Cada busca ou consulta deve atingir sucesso ou estado terminal em até 10 segundos; encerrar carregamentos ao concluir ou falhar, informar o estado em pt-BR e oferecer nova tentativa manual, sem repetição automática.

## User Stories

- **US1 (RF1) — Encontrar uma cidade:** Como decisor do dia a dia, quero buscar uma cidade e escolher entre resultados identificados por região e país para consultar o local correto sem confundir cidades homônimas.
- **US2 (RF2) — Consultar as condições atuais:** Como decisor do dia a dia, quero consultar temperatura, condição, umidade, vento, pressão e precipitação para decidir como me preparar para sair.
- **US3 (RF3) — Planejar os próximos dias:** Como planejador de viagem, quero comparar mínima, máxima, condição, precipitação e vento nos próximos cinco dias para organizar minhas viagens e atividades.
- **US4 (RF4) — Escolher a unidade de temperatura:** Como decisor do dia a dia, quero alternar entre Celsius e Fahrenheit para entender a temperatura na unidade que prefiro.
- **US5 (RF5) — Recuperar-se de estados da consulta:** Como planejador de viagem, quero receber informações claras sobre carregamento, erros e ausência de dados, com opção de tentar novamente quando houver falha, para concluir minha consulta ou saber como prosseguir.

## Acceptance Criteria

- **AC1.1 (RF1)**
	- **Given:** a busca está disponível e a fonte retorna resultados para o nome informado.
	- **When:** a pessoa envia o nome de uma cidade.
	- **Then:** a interface apresenta as sugestões retornadas para esse nome.
- **AC1.2 (RF1)**
	- **Given:** a fonte retorna duas ou mais cidades com o mesmo nome e fornece dados de região e/ou país.
	- **When:** as sugestões são apresentadas.
	- **Then:** cada sugestão exibe os dados geográficos de identificação fornecidos pela fonte, incluindo região e país quando disponíveis.
- **AC1.3 (RF1)**
	- **Given:** há sugestões de cidades disponíveis.
	- **When:** a pessoa seleciona uma sugestão.
	- **Then:** os dados meteorológicos exibidos correspondem ao local selecionado; ao selecionar outro resultado, os dados anteriores são substituídos pelos do novo local.
- **AC1.4 (RF1)**
	- **Given:** o nome de uma cidade contém acentos, espaços, hífens ou apóstrofos e há um resultado correspondente.
	- **When:** a pessoa envia a busca.
	- **Then:** a busca retorna e apresenta o resultado correspondente ao nome informado.
- **AC1.5 (RF1)**
	- **Given:** o serviço de geocoding retorna com sucesso uma lista vazia para a busca.
	- **When:** a busca termina.
	- **Then:** a interface informa que não encontrou um local suportado pelo MVP, mantém o texto pesquisado editável e não inicia uma consulta meteorológica.
- **AC1.6 (RF1)**
	- **Given:** a busca retorna pelo menos uma cidade brasileira e uma capital internacional incluída na lista aprovada.
	- **When:** as sugestões são apresentadas.
	- **Then:** os resultados brasileiros aparecem antes dos resultados internacionais.
- **AC1.7 (RF1)**
	- **Given:** a busca retorna uma cidade internacional que não pertence à lista aprovada de capitais.
	- **When:** os resultados são filtrados para o catálogo do MVP.
	- **Then:** a cidade não é apresentada como selecionável, nenhuma consulta meteorológica é iniciada para ela e a interface informa que não encontrou local suportado.
- **AC2.1 (RF2)**
	- **Given:** uma cidade está selecionada e a fonte retorna seus dados atuais.
	- **When:** a consulta atual termina com sucesso.
	- **Then:** a interface apresenta temperatura, condição meteorológica, umidade, vento, pressão e precipitação.
- **AC2.2 (RF2)**
	- **Given:** dados meteorológicos atuais completos ou parciais estão disponíveis.
	- **When:** a interface apresenta os dados atuais.
	- **Then:** temperatura usa a unidade selecionada, umidade usa %, vento usa km/h, pressão usa hPa e precipitação usa mm; cada campo ausente é marcado como indisponível, sem valor substituto.
- **AC2.3 (RF2)**
	- **Given:** a fonte retorna horário da observação ou da atualização para os dados atuais.
	- **When:** esses dados são apresentados.
	- **Then:** a interface exibe o horário fornecido e o identifica no fuso local da cidade selecionada.
- **AC2.4 (RF2)**
	- **Given:** a resposta meteorológica tem timestamp com mais de 60 minutos em relação ao momento da consulta.
	- **When:** a interface processa a resposta.
	- **Then:** os valores são identificados como desatualizados e não são apresentados como clima atual.
- **AC3.1 (RF3)**
	- **Given:** uma cidade está selecionada e seu fuso horário local está disponível.
	- **When:** a consulta de previsão termina.
	- **Then:** a interface apresenta cinco datas locais consecutivas, começando pela data atual da cidade e incluindo os quatro dias seguintes, independentemente do fuso do dispositivo da pessoa.
- **AC3.2 (RF3)**
	- **Given:** existe uma previsão para o intervalo de cinco datas, completa ou parcial.
	- **When:** a interface apresenta a previsão.
	- **Then:** cada data exibe mínima e máxima na unidade selecionada, condição, precipitação em mm e vento em km/h quando disponíveis; a data de calendário é identificada e campos ausentes são marcados como indisponíveis.
- **AC4.1 (RF4)**
	- **Given:** nenhuma unidade foi escolhida na interface.
	- **When:** a pessoa consulta uma cidade.
	- **Then:** as temperaturas são apresentadas em Celsius e identificadas como tal.
- **AC4.2 (RF4)**
	- **Given:** temperaturas atuais e/ou da previsão estão visíveis em Celsius ou Fahrenheit.
	- **When:** a pessoa seleciona a outra unidade.
	- **Then:** todas as temperaturas visíveis, incluindo mínimas e máximas, são convertidas pelas relações °F = (°C × 9/5) + 32 e °C = (°F − 32) × 5/9, arredondadas ao grau inteiro mais próximo e identificadas com a unidade selecionada.
- **AC4.3 (RF4)**
	- **Given:** uma cidade e seus dados meteorológicos estão visíveis.
	- **When:** a pessoa alterna a unidade de temperatura.
	- **Then:** a cidade, os valores que não são temperaturas e as condições meteorológicas permanecem inalterados.
- **AC5.1 (RF5)**
	- **Given:** uma busca ou consulta meteorológica foi iniciada e ainda não terminou.
	- **When:** a interface aguarda a resposta.
	- **Then:** apresenta um estado de carregamento associado à operação em andamento.
- **AC5.2 (RF5)**
	- **Given:** a busca termina sem um local do catálogo, a solicitação falha ou a fonte responde sem dados meteorológicos.
	- **When:** a operação termina.
	- **Then:** a interface distingue e informa, respectivamente, “nenhum local suportado encontrado”, “falha na consulta” ou “dados meteorológicos indisponíveis”; valores ausentes não são apresentados como dados válidos.
- **AC5.3 (RF5)**
	- **Given:** a consulta meteorológica da cidade selecionada falhou.
	- **When:** a interface apresenta o estado de erro.
	- **Then:** oferece uma ação de nova tentativa e, quando acionada, inicia outra consulta para a cidade selecionada.
- **AC5.4 (RF5)**
	- **Given:** o campo de busca está vazio ou contém apenas espaços.
	- **When:** a pessoa envia a busca.
	- **Then:** nenhuma consulta de cidade é iniciada e a interface permanece ou passa para um estado vazio compreensível.
- **AC5.5 (RF5)**
	- **Given:** uma solicitação de busca ou meteorológica falha por erro do serviço.
	- **When:** a falha é recebida.
	- **Then:** o carregamento termina, uma mensagem clara de erro é apresentada em pt-BR e, para uma cidade selecionada, há uma ação de nova tentativa.
- **AC5.6 (RF5)**
	- **Given:** uma busca ou consulta meteorológica permanece sem resposta por 10 segundos.
	- **When:** os 10 segundos se completam.
	- **Then:** o carregamento termina, a interface informa que a consulta excedeu o tempo de espera e permite repetir a mesma operação com o termo ou local preservado.
- **AC5.7 (RF5)**
	- **Given:** a resposta contém apenas parte dos campos atuais ou dos dias da previsão esperados.
	- **When:** a interface apresenta os dados recebidos.
	- **Then:** os valores disponíveis são exibidos, os ausentes são identificados como indisponíveis e nenhum valor é inventado ou apresentado como válido.
- **AC6.1 (RNF2)**
	- **Given:** a aplicação é exibida em cada navegador da matriz (versão atual e anterior estáveis de Chrome, Edge, Firefox e Safari) em viewport de 320 px ou desktop.
	- **When:** a pessoa acessa a busca, os dados atuais e a previsão.
	- **Then:** não há rolagem horizontal e o conteúdo e os controles essenciais permanecem visíveis e utilizáveis.
- **AC6.2 (RNF3)**
	- **Given:** a pessoa usa somente o teclado.
	- **When:** realiza busca, seleciona um resultado, alterna a unidade e aciona nova tentativa após erro.
	- **Then:** todos os controles do fluxo podem receber foco visível e ser operados sem ponteiro, em uma ordem de foco compreensível.
- **AC6.3 (RNF3)**
  - **Given:** a interface exibe texto comum, texto grande ou componentes não textuais relevantes.
  - **When:** o contraste entre primeiro plano e fundo é medido.
  - **Then:** a razão de contraste é pelo menos 4,5:1 para texto comum e 3:1 para texto grande e componentes não textuais relevantes.

## Non-Functional Requirements
## Traceability Matrix

| User Story | Acceptance Criteria | Requisitos não funcionais relevantes |
| --- | --- | --- |
| **US1 — Encontrar uma cidade** | AC1.1–AC1.7; AC5.2; AC5.4–AC5.6 | RNF1 (tempo de busca), RNF2 (responsividade/compatibilidade), RNF3 (teclado e foco), RNF5 (geocoding) e RNF6 (mensagens de erro). |
| **US2 — Consultar as condições atuais** | AC2.1–AC2.4; AC5.2; AC5.5–AC5.7 | RNF1 (carga inicial), RNF2 (responsividade/compatibilidade), RNF3 (acessibilidade), RNF4 (dados desatualizados), RNF5 (fonte de dados) e RNF6 (erros). |
| **US3 — Planejar os próximos dias** | AC3.1–AC3.2; AC5.2; AC5.5–AC5.7 | RNF1 (carga inicial), RNF2 (responsividade/compatibilidade), RNF3 (acessibilidade), RNF4 (dados indisponíveis), RNF5 (fonte de dados) e RNF6 (erros). |
| **US4 — Escolher a unidade de temperatura** | AC4.1–AC4.3 | RNF2 (uso em diferentes larguras) e RNF3 (operação acessível do controle). |
| **US5 — Recuperar-se de estados da consulta** | AC5.1–AC5.7 | RNF1 (timeout), RNF2 (estados responsivos), RNF3 (teclado e foco), RNF4 (resiliência), RNF5 (falhas do provedor) e RNF6 (clareza dos erros). |

## Non-Functional Requirements

- **RNF1 — Desempenho:** a interface deve deixar o campo de busca utilizável em menos de 2 segundos em um dispositivo móvel representativo conectado por 4G. Medir esse tempo separadamente do tempo de resposta do Open-Meteo, que não tem SLA definido pelo MVP.
- **RNF2 — Responsividade e compatibilidade:** a aplicação deve funcionar sem rolagem horizontal a partir de 320 px e em larguras desktop. A matriz mínima é a versão estável atual e a anterior de Chrome, Edge, Firefox e Safari.
- **RNF3 — Acessibilidade:** conformidade WCAG 2.2 AA. Fluxos essenciais operáveis por teclado, foco visível, nomes acessíveis, estrutura semântica e contraste mínimo de 4,5:1 para texto comum, 3:1 para texto grande e componentes não textuais relevantes.
- **RNF4 — Resiliência:** falhas de rede ou do provedor devem encerrar o estado de carregamento e informar o resultado. Dados anteriores não podem ser apresentados como atuais. A primeira versão não promete consulta offline nem apresentação de cache após falha.
- **RNF5 — Fonte de dados:** a experiência usa Open-Meteo diretamente e sem chave de API. A verificação formal de cobertura, termos/licença, atribuição e limites de uso está fora do escopo atual e permanece um risco aceito do MVP.
- **RNF6 — Clareza de erros:** erros devem ser apresentados em pt-BR, distinguir ausência de resultados de falha de serviço e informar uma ação de recuperação quando disponível, sem expor detalhes técnicos internos.

## Edge Cases

- **Cidade inexistente:** informar que a cidade não foi encontrada, manter a busca editável e não solicitar dados meteorológicos para o nome sem correspondência.
- **Input vazio ou só com espaços:** não iniciar geocoding; manter um estado vazio e solicitar um nome de cidade.
- **Caracteres especiais:** preservar acentos, espaços, hífens e apóstrofos em nomes de cidades ao pesquisar; não interpretar a entrada como conteúdo executável.
- **Falha de API:** encerrar o carregamento, apresentar mensagem clara em pt-BR, não exibir dados anteriores como atuais e oferecer nova tentativa para a cidade selecionada.
- **Timeout:** após 10 segundos sem resposta, encerrar o carregamento, informar que o tempo de espera foi excedido e permitir nova tentativa manual com o termo/local preservado.
- **Geocoding sem resultados:** tratar uma resposta bem-sucedida com lista vazia como ausência de correspondência, não como falha do serviço; manter a busca editável e não consultar a previsão.
- **Resposta parcial:** apresentar campos e dias disponíveis, marcar explicitamente os campos ou dias ausentes como indisponíveis e nunca preencher valores por inferência.
- **Cidades homônimas ou resultado com identificação geográfica insuficiente:** exibir região e país quando fornecidos pela fonte para apoiar a seleção correta.
- **Cidade fora do catálogo do MVP:** não apresentar como selecionável cidades internacionais que não estejam na lista de capitais aprovada; informar ausência de local suportado e não iniciar consulta meteorológica.
- **Cidade sem dados atuais ou sem previsão completa:** comunicar quais dados estão indisponíveis e não apresentar valores ausentes como válidos.
- **Perda de conexão durante a busca ou consulta:** apresentar estado de erro e permitir nova tentativa quando aplicável.
- **Mudança de data no local consultado:** usar o fuso horário local da cidade selecionada para definir hoje e os quatro dias seguintes, inclusive em transições de horário de verão.
- **Dados com mais de 60 minutos:** exibir o timestamp no fuso local e identificar os valores como desatualizados, sem apresentá-los como clima atual.
- **Alternância repetida de unidade:** manter consistentes todos os valores de temperatura e seus rótulos.
- **Largura mínima de 320 px, nomes extensos ou navegação apenas por teclado:** manter conteúdo legível e controles operáveis sem perda de informação.

## Assumptions

- A busca é manual e inclui cidades brasileiras retornadas pelo geocoding e a lista aprovada de capitais internacionais do Overview; resultados brasileiros têm prioridade.
- O clima atual e a previsão pertencem ao local selecionado e usam o fuso horário local desse local, inclusive nas transições de horário de verão.
- Celsius é a unidade inicial. Fahrenheit e Celsius são arredondados ao grau inteiro mais próximo; vento é exibido em km/h, precipitação em mm e pressão em hPa.
- A interface é em pt-BR, com formatos brasileiros de data e hora.
- O timestamp é exibido quando fornecido. Dados com mais de 60 minutos não são apresentados como atuais.
- Busca e consulta meteorológica têm timeout de 10 segundos e nova tentativa manual, sem repetição automática.
- A primeira versão não terá autenticação, persistência de servidor/local, consulta offline nem apresentação de cache após falha.
- O acesso direto ao Open-Meteo é decisão aprovada; a validação formal das condições do provedor e a operação/monitoramento dedicados foram adiados e estão fora do escopo.
- O gate de sucesso do MVP é a aprovação dos critérios funcionais e a verificação dos requisitos não funcionais na matriz definida; analytics e métricas de adoção não fazem parte do MVP.
- As personas do discovery são hipóteses; seus tempos exploratórios não são metas de aceite aprovadas.

## Risks

| Risco | Probabilidade / impacto | Mitigação proposta |
| --- | --- | --- |
| Indisponibilidade, lentidão ou limites do Open-Meteo interromperem consultas. | Média / alto | Timeout de 10 segundos, mensagem clara e nova tentativa manual. A diligência formal do provedor foi adiada e o risco é aceito no MVP. |
| Dados desatualizados, imprecisos ou sem cobertura para uma cidade. | Média / alto | Exibir o timestamp local e não apresentar como atuais dados com mais de 60 minutos; a cobertura do provedor não foi formalmente validada para o MVP. |
| Busca ambígua levar à cidade ou coordenada incorreta. | Média / alto | Exibir região e país quando disponíveis e validar buscas homônimas e sem resultado. |
| Fuso horário ou mudança de data gerar dias incorretos na previsão. | Média / alto | Usar o fuso local da cidade selecionada e testar limites de data e transições de horário de verão. |
| Conversão ou formatação de unidade induzir interpretação errada. | Baixa / alto | Identificar unidades junto aos valores e verificar conversões e atualizações em todas as temperaturas. |
| Rede móvel ou dispositivo de baixo desempenho degradar a experiência. | Média / médio | Validar campo de busca utilizável em menos de 2 segundos em dispositivo móvel por 4G; medir à parte o tempo externo do provedor. |
| Falha de rede deixar a interface sem explicação ou apresentar cache como atual. | Média / alto | Encerrar loading, informar erro em pt-BR, permitir nova tentativa manual e nunca apresentar dados com mais de 60 minutos como atuais. |
| Granularidade diária ou campos meteorológicos não atenderem às expectativas. | Média / médio | Manter previsão diária no MVP; avaliar novos campos ou granularidade somente em revisão futura de escopo. |
| Acessibilidade insuficiente impedir o uso por parte do público. | Média / alto | Verificar WCAG 2.2 AA, teclado, foco, semântica e contraste nos fluxos essenciais e navegadores da matriz. |
| Termos, atribuição, cobertura ou limites do Open-Meteo inviabilizarem o uso previsto. | Média / alto | A validação formal foi adiada por decisão de escopo; risco aceito no MVP e reavaliado antes de expandir o produto. |
| Ausência de métricas de adoção limitar a avaliação do valor comercial após o MVP. | Média / médio | Usar aprovação dos critérios funcionais e não funcionais como gate do MVP; decidir sobre métricas de adoção antes de ampliar o produto. |
| Falha não detectada por ausência de monitoramento dedicado. | Média / alto | Operação e monitoramento 24/7 foram excluídos do MVP; erros visíveis e recuperação manual reduzem impacto para usuários, sem garantir detecção proativa. |

## Out of Scope

**Limites do MVP.** A plataforma aprovada é uma aplicação web responsiva. Permanecem no escopo a busca manual de cidades brasileiras e da lista curada de capitais internacionais, o clima atual, a previsão diária de cinco dias e a alternância Celsius/Fahrenheit.

- Autenticação, contas, perfis e qualquer persistência de dados no servidor ou entre sessões.
- Geolocalização automática e seleção de cidade por mapa.
- Cidades internacionais que não façam parte da lista aprovada de capitais.
- Favoritos, histórico, comparação simultânea de cidades e preferências salvas.
- Previsão horária, histórico meteorológico, tendências e gráficos.
- Alertas, notificações push e avisos meteorológicos severos.
- Mapas meteorológicos, radar, imagens de satélite, qualidade do ar e pólen.
- Funcionamento offline, cache apresentado como alternativa atual ou sincronização posterior.
- Aplicativos nativos e instalação/funcionalidades específicas de PWA.
- Idiomas além de pt-BR, analytics, publicidade, monetização e personalização editorial.
- Integração com provedores meteorológicos adicionais, exportação ou compartilhamento de consultas.
- Validação formal independente de cobertura, termos/licença, atribuição, limites de uso, disponibilidade garantida ou adequação comercial do Open-Meteo; essa diligência foi adiada e é um risco aceito para o MVP.
- SLA próprio de disponibilidade, monitoramento 24/7, equipe de plantão, processo formal de suporte e resposta a incidentes.
- Pesquisa formal de mercado, identidade visual personalizada, definição de orçamento ou gestão de prazo do projeto.

## Open Questions

Nenhuma decisão de produto permanece pendente para o escopo aprovado do MVP. A diligência formal do Open-Meteo e a operação/monitoramento dedicados foram deliberadamente adiados e estão registrados em Out of Scope e Risks.