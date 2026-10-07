# Backlog de Tarefas — Weather App

Fonte: [`plans/weather-app-plan.md`](../plans/weather-app-plan.md). As tarefas estão ordenadas por dependência e organizadas por entrega. Os critérios referenciam requisitos funcionais (RF), critérios de aceite (AC) e requisitos não funcionais (RNF) da especificação.

## Entrega 1 — Tipos e funções puras

### T-01 — Definir tipos de domínio e estados assíncronos
- **Descrição:** Criar os contratos compartilhados para cidade, clima atual, previsão, dados meteorológicos, unidade e estados de busca/consulta.
- **Critérios de aceite:** `City` contém nome e coordenadas obrigatórios e metadados geográficos opcionais; campos meteorológicos são opcionais; `WeatherData` contém cidade, timezone, previsão e instante de consulta; `Unit` aceita apenas `celsius` ou `fahrenheit`; estados representam `idle`, `loading`, `success`, `empty` e erros `network`, `api`, `timeout` ou `invalid-response`. (RF1–RF5, AC2.2, AC3.2, AC5.7)
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/lib/types.ts`
- **Tipo:** Data

### T-02 — Implementar catálogo e prioridade de cidades
- **Descrição:** Normalizar, filtrar e ordenar resultados do geocoding de acordo com a cobertura aprovada.
- **Critérios de aceite:** Dado um conjunto com cidades brasileiras, capital permitida e cidade internacional não permitida, mantém todas as brasileiras e somente a capital permitida; ordena brasileiras antes das internacionais e desempata de forma determinística por nome e país. (RF1, AC1.6–AC1.7)
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/cityCatalog.ts`
- **Tipo:** Data

### T-03 — Mapear códigos meteorológicos para apresentação
- **Descrição:** Interpretar códigos WMO usados pela Open-Meteo como rótulos de condição em pt-BR.
- **Critérios de aceite:** Retorna rótulo pt-BR para os códigos WMO `0`, `1`, `2`, `3`, `45`, `48`, `51`, `53`, `55`, `56`, `57`, `61`, `63`, `65`, `66`, `67`, `71`, `73`, `75`, `77`, `80`, `81`, `82`, `85`, `86`, `95`, `96` e `99`; qualquer outro código ou valor ausente retorna `Condição indisponível`, sem lançar erro. (RF2, RF3, AC2.1, AC3.2)
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/weatherCodes.ts`
- **Tipo:** Data

### T-04 — Implementar conversão e arredondamento de temperatura
- **Descrição:** Criar funções puras para apresentar temperaturas Celsius/Fahrenheit sem alterar os dados normalizados.
- **Critérios de aceite:** `0 °C` converte para `32 °F`, `100 °C` para `212 °F` e `-40 °C` para `-40 °F`; conversão inversa usa a fórmula da spec; apresentação arredonda ao inteiro mais próximo; valor ausente permanece ausente e o objeto de entrada não é mutado. (RF4, AC4.1–AC4.3)
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/temperature.ts`
- **Tipo:** Data

### T-05 — Implementar regras de data local e atualidade
- **Descrição:** Criar funções puras para validar datas diárias no fuso retornado e avaliar a idade do timestamp atual.
- **Critérios de aceite:** A validação aceita cinco datas consecutivas iniciadas na data atual do timezone informado e rejeita lacunas ou datas fora de ordem; classifica como desatualizado somente timestamp com idade superior a 60 minutos; timestamp ausente resulta em atualidade não verificável. (RF2–RF3, AC2.3–AC2.4, AC3.1, RNF4)
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/weatherDate.ts`
- **Tipo:** Data

### T-06 — Normalizar payloads da previsão
- **Descrição:** Converter a resposta Open-Meteo para `WeatherData`, preservando campos e dias parciais sem inventar valores.
- **Critérios de aceite:** Mapeia `current.time`, temperatura, condição, umidade, vento, pressão e precipitação, além dos campos diários definidos no plano; preserva timezone e datas; omite valores ausentes sem substituí-los por zero; rejeita raiz que não seja objeto, blocos `current`/`daily` fornecidos que não sejam objetos ou `daily.time` fornecido que não seja array de datas `YYYY-MM-DD`. (RF2–RF3, AC2.2, AC3.2, AC5.7)
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/weatherMapper.ts`
- **Tipo:** Data

## Entrega 2 — Services

### T-07 — Implementar service de geocoding
- **Descrição:** Consultar a API de geocoding, validar a resposta e retornar sugestões normalizadas e suportadas.
- **Critérios de aceite:** A URL preserva acentos e codifica espaços, hífens e apóstrofos; envia `name`, `count`, `language=pt` e `format=json`; resposta válida sem resultados retorna lista vazia, enquanto HTTP, rede e payload inválido retornam erros distintos; timeout encerra a operação em até 10 segundos; cancelamento por substituição não é exposto como falha. (RF1, RF5, AC1.1–AC1.7, AC5.4–AC5.6, RNF5–RNF6)
- **Dependências:** T-01, T-02.
- **Arquivos prováveis:** `src/services/geocodingService.ts`
- **Tipo:** Data

### T-08 — Implementar service de previsão
- **Descrição:** Consultar forecast para as coordenadas selecionadas e normalizar a resposta.
- **Critérios de aceite:** Envia latitude/longitude, `timezone=auto`, cinco dias, temperatura em Celsius, vento em km/h, precipitação em mm e os campos `current`/`daily` do plano; usa T-06; resposta válida sem dados é distinta de HTTP, rede, payload inválido e timeout; timeout encerra em até 10 segundos e não há retry automático. (RF2–RF3, RF5, AC2.1–AC3.2, AC5.2–AC5.7, RNF5)
- **Dependências:** T-01, T-05, T-06.
- **Arquivos prováveis:** `src/services/weatherService.ts`
- **Tipo:** Data

## Entrega 3 — Hooks

### T-09 — Criar hook de busca e seleção de cidades
- **Descrição:** Coordenar termo, carregamento, sugestões, vazio, erro e nova tentativa da busca.
- **Critérios de aceite:** Submeter termo vazio ou só com espaços faz zero chamadas; busca mantém o termo após falha e retry chama o service com o mesmo termo; seleção retorna a cidade escolhida; resposta de busca anterior não altera o estado da busca mais recente; estados expostos distinguem loading, vazio, sucesso e cada erro tipado. (RF1, RF5, AC1.1–AC1.7, AC5.1, AC5.4–AC5.6)
- **Dependências:** T-01, T-02, T-07.
- **Arquivos prováveis:** `src/hooks/useCitySearch.ts`
- **Tipo:** Data

### T-10 — Criar hook de consulta meteorológica
- **Descrição:** Coordenar forecast para a cidade selecionada, estados de consulta, cancelamento e retry.
- **Critérios de aceite:** Selecionar outra cidade limpa imediatamente os dados anteriores; resposta da cidade anterior não altera o estado atual; erro e timeout encerram loading; retry chama o service uma vez para a cidade selecionada; resposta parcial mantém os campos recebidos e não há retry automático. (RF2–RF3, RF5, AC1.3, AC5.1–AC5.3, AC5.5–AC5.7, RNF4)
- **Dependências:** T-01, T-08.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`
- **Tipo:** Data

## Entrega 4 — Componentes

### T-11 — Criar interface de busca e sugestões acessíveis
- **Descrição:** Implementar entrada de cidade e resultados selecionáveis, apresentando região e país quando disponíveis.
- **Critérios de aceite:** Campo tem nome acessível; sugestões expõem nome e região/país quando fornecidos em uma lista com opções selecionáveis por teclado; busca vazia não é enviada; resultado vazio é exposto com `role=status`, erro com `role=alert`, e ambos mantêm o campo editável. (RF1, AC1.1–AC1.7, AC5.4–AC5.6, AC6.2, RNF3)
- **Dependências:** T-09.
- **Arquivos prováveis:** `src/components/CitySearch.tsx`
- **Tipo:** UI

### T-12 — Criar apresentação dos estados e retry
- **Descrição:** Exibir loading, ausência de resultado/dados e falhas de busca ou previsão com mensagens distintas em pt-BR.
- **Critérios de aceite:** Cada status renderiza uma mensagem pt-BR distinta para carregamento, nenhum local suportado, dados meteorológicos indisponíveis, falha e timeout; estados de erro oferecem ação de retry ligada à operação correspondente; mensagens de estado são expostas como status/alerta acessível e não incluem detalhes internos. (RF5, AC5.1–AC5.6, RNF6)
- **Dependências:** T-01, T-09, T-10.
- **Arquivos prováveis:** `src/components/QueryState.tsx`
- **Tipo:** UI

### T-13 — Criar painel de clima atual
- **Descrição:** Apresentar temperatura, condição, umidade, vento, pressão, precipitação e horário/atualidade quando disponíveis.
- **Critérios de aceite:** Renderiza temperatura, condição, umidade (%), vento (km/h), pressão (hPa) e precipitação (mm); cada campo ausente mostra `Indisponível`; timestamp, quando presente, é formatado no timezone local; idade superior a 60 minutos exibe estado `Desatualizado` e não rotula os valores como atuais. (RF2, AC2.1–AC2.4, AC5.7, RNF4)
- **Dependências:** T-01, T-03, T-04, T-05.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`
- **Tipo:** UI

### T-14 — Criar lista de previsão diária
- **Descrição:** Apresentar as cinco datas locais e os campos diários disponíveis.
- **Critérios de aceite:** Renderiza cinco posições para datas locais consecutivas começando por hoje no timezone selecionado; cada dia apresenta mínima/máxima na unidade escolhida, condição, precipitação (mm) e vento (km/h); data ou campo ausente mostra `Indisponível`. (RF3, AC3.1–AC3.2, AC5.7)
- **Dependências:** T-01, T-03, T-04, T-05.
- **Arquivos prováveis:** `src/components/ForecastList.tsx`
- **Tipo:** UI

### T-15 — Criar controle de unidade de temperatura
- **Descrição:** Implementar seleção acessível entre Celsius e Fahrenheit.
- **Critérios de aceite:** Valor inicial é Celsius; controle tem nome acessível e pode ser alterado por teclado; mudança emite somente a nova unidade e não chama service; temperaturas atuais e diárias são renderizadas na unidade selecionada sem alterar cidade, condição ou valores não térmicos. (RF4, AC4.1–AC4.3, AC6.2, RNF3)
- **Dependências:** T-04.
- **Arquivos prováveis:** `src/components/UnitToggle.tsx`
- **Tipo:** UI

## Entrega 5 — Integração

### T-16 — Integrar busca e clima atual no App
- **Descrição:** Montar a primeira fatia visível, conectando busca, seleção de cidade, estados de consulta e clima atual.
- **Critérios de aceite:** `App` renderiza `CitySearch`, `QueryState` e `CurrentWeather`; mantém a cidade selecionada; selecionar cidade inicia a consulta e substitui os dados anteriores; retry repete a operação correspondente; a primeira tela de sucesso mostra as condições atuais em Celsius. (RF1–RF2, RF5, AC1.3, AC2.1–AC2.4, AC5.3)
- **Dependências:** T-09–T-13.
- **Arquivos prováveis:** `src/App.tsx`
- **Tipo:** UI

### T-17 — Integrar previsão e unidade no App
- **Descrição:** Completar o fluxo conectando previsão diária e alternância Celsius/Fahrenheit à primeira fatia.
- **Critérios de aceite:** `App` renderiza `ForecastList` e `UnitToggle`; mostra cinco datas locais e temperaturas na unidade selecionada; alternar a unidade atualiza temperaturas atuais e previstas sem nova requisição, mantendo cidade, condições e demais valores. (RF3–RF4, AC3.1–AC3.2, AC4.1–AC4.3)
- **Dependências:** T-14, T-15, T-16.
- **Arquivos prováveis:** `src/App.tsx`
- **Tipo:** UI

## Entrega 6 — Testes

### T-18 — Testar filtro e ordenação do catálogo
- **Descrição:** Cobrir a regra de cidades brasileiras e capitais internacionais permitidas.
- **Critérios de aceite:** Testes Vitest confirmam inclusão de cidades brasileiras retornadas, inclusão de capital aprovada, exclusão de cidade internacional não aprovada e ordem Brasil-primeiro; entradas equivalentes sempre produzem a mesma ordenação; não usam rede real. (RF1, AC1.6–AC1.7)
- **Dependências:** T-02, T-17.
- **Arquivos prováveis:** `tests/unit/cityCatalog.test.ts`
- **Tipo:** Test

### T-19 — Testar rótulos de códigos meteorológicos
- **Descrição:** Verificar os rótulos WMO e o fallback para códigos não mapeados.
- **Critérios de aceite:** Testes Vitest confirmam o rótulo esperado para cada código suportado e `Condição indisponível` para código desconhecido ou ausente; nenhuma entrada lança erro. (RF2, RF3, AC2.1, AC3.2)
- **Dependências:** T-03, T-17.
- **Arquivos prováveis:** `tests/unit/weatherCodes.test.ts`
- **Tipo:** Test

### T-20 — Testar conversão de temperatura
- **Descrição:** Verificar conversões e arredondamento Celsius/Fahrenheit.
- **Critérios de aceite:** Testes Vitest verificam `0 °C → 32 °F`, `100 °C → 212 °F`, `-40 °C → -40 °F`, a conversão inversa, arredondamento, valor ausente e ausência de mutação do objeto de entrada. (RF4, AC4.1–AC4.3)
- **Dependências:** T-04, T-17.
- **Arquivos prováveis:** `tests/unit/temperature.test.ts`
- **Tipo:** Test

### T-21 — Testar datas locais e atualidade
- **Descrição:** Validar datas locais consecutivas e limite de atualidade do clima atual.
- **Critérios de aceite:** Testes Vitest confirmam cinco datas consecutivas no timezone fornecido, rejeição de lacuna e ordem inválida, comportamento na transição de horário de verão, idade de exatamente 60 minutos versus mais de 60 minutos e timestamp ausente. (RF2–RF3, AC2.4, AC3.1, RNF4)
- **Dependências:** T-05, T-17.
- **Arquivos prováveis:** `tests/unit/weatherDate.test.ts`
- **Tipo:** Test

### T-22 — Testar normalização de payloads
- **Descrição:** Validar o mapeamento de respostas completas e parciais da Open-Meteo.
- **Critérios de aceite:** Testes Vitest verificam o mapeamento de cada campo atual e diário, timezone, datas e arrays parciais; asserts confirmam que campo ausente não vira zero e que payload sem estrutura obrigatória é rejeitado. (RF2–RF3, AC2.2, AC3.2, AC5.7)
- **Dependências:** T-06, T-17.
- **Arquivos prováveis:** `tests/unit/weatherMapper.test.ts`
- **Tipo:** Test

### T-23 — Testar service de geocoding
- **Descrição:** Validar requisição, normalização e falhas do endpoint de geocoding com `fetch` simulado.
- **Critérios de aceite:** Fixtures verificam parâmetros e encoding de caracteres especiais; testes cobrem sucesso, lista vazia distinta de falha, HTTP, rede, payload inválido, timeout de 10 segundos, cancelamento e ausência de retry automático. (RF1, RF5, AC1.4–AC1.7, AC5.4–AC5.6, RNF5)
- **Dependências:** T-07, T-17.
- **Arquivos prováveis:** `tests/unit/geocodingService.test.ts`
- **Tipo:** Test

### T-24 — Testar service de previsão
- **Descrição:** Validar requisição e classificação das respostas do endpoint de forecast com `fetch` simulado.
- **Critérios de aceite:** Fixtures verificam coordenadas, campos e unidades da URL; testes cobrem sucesso, ausência de dados, resposta parcial, HTTP, rede, payload inválido, timeout de 10 segundos, cancelamento e ausência de retry automático; cada falha rejeita ou retorna erro tipado conforme o contrato do service. (RF2–RF3, RF5, AC5.2, AC5.5–AC5.7, RNF5)
- **Dependências:** T-08, T-17.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`
- **Tipo:** Test

### T-25 — Testar busca e sugestões
- **Descrição:** Cobrir interação, estados e acessibilidade do componente de busca.
- **Critérios de aceite:** Testing Library confirma zero submissões para input vazio, envio do termo válido, seleção da sugestão, rótulo com região/país quando disponíveis, operação e seleção por teclado, nome acessível, foco visível e termo editável nos estados vazio/erro. (RF1, AC1.1–AC1.7, AC5.4–AC5.6, AC6.2, RNF3)
- **Dependências:** T-11, T-17.
- **Arquivos prováveis:** `tests/components/CitySearch.test.tsx`
- **Tipo:** Test

### T-26 — Testar componente QueryState em loading, vazio e erro
- **Descrição:** Cobrir com Testing Library os estados de carregamento, vazio, erro/timeout e retry do componente `QueryState`.
- **Critérios de aceite:** Testing Library verifica mensagens distintas para loading, nenhum local suportado, dados meteorológicos indisponíveis, falha e timeout; em cada erro, acionar retry chama uma vez o callback da operação correspondente; loading e mensagens têm roles acessíveis. (RF5, AC5.1–AC5.6, RNF6)
- **Dependências:** T-12, T-17.
- **Arquivos prováveis:** `tests/components/QueryState.test.tsx`
- **Tipo:** Test

### T-27 — Testar painel de clima atual
- **Descrição:** Cobrir apresentação de clima atual completo, parcial e desatualizado.
- **Critérios de aceite:** Testing Library confirma os seis campos e suas unidades, placeholder `Indisponível` para cada campo ausente, horário formatado no timezone selecionado e rótulo `Desatualizado` para timestamp com mais de 60 minutos, sem rótulo de clima atual. (RF2, AC2.1–AC2.4, AC5.7)
- **Dependências:** T-13, T-17.
- **Arquivos prováveis:** `tests/components/CurrentWeather.test.tsx`
- **Tipo:** Test

### T-28 — Testar lista de previsão diária
- **Descrição:** Cobrir datas e campos disponíveis ou ausentes na previsão.
- **Critérios de aceite:** Testing Library confirma cinco datas consecutivas no timezone informado, mínimas e máximas na unidade selecionada, condição, vento (km/h), precipitação (mm) e placeholder `Indisponível` para data/campo ausente. (RF3, AC3.1–AC3.2, AC5.7)
- **Dependências:** T-14, T-17.
- **Arquivos prováveis:** `tests/components/ForecastList.test.tsx`
- **Tipo:** Test

### T-29 — Testar controle de unidade
- **Descrição:** Verificar operação por teclado e atualização da unidade selecionada.
- **Critérios de aceite:** Testing Library confirma unidade inicial Celsius, mudança por teclado para Fahrenheit e retorno a Celsius, callback com o valor selecionado, zero chamadas adicionais ao service e valores não térmicos inalterados. (RF4, AC4.1–AC4.3, AC6.2, RNF3)
- **Dependências:** T-15, T-17.
- **Arquivos prováveis:** `tests/components/UnitToggle.test.tsx`
- **Tipo:** Test

### T-30 — Testar jornada integrada com Playwright
- **Descrição:** Validar o fluxo de busca, consulta e recuperação usando endpoints simulados.
- **Critérios de aceite:** Executa o fluxo principal em viewport mobile de 320×800; Playwright intercepta ambas as APIs e confirma: cidade selecionada corresponde ao forecast; selecionar outra cidade substitui os dados; alternar unidade atualiza todas as temperaturas e mantém inalterado o número de requests; vazio/não suportado não chama forecast; erro oferece retry para o mesmo termo/cidade; nenhum teste chama a API real. (RF1–RF5, AC1.3, AC1.5–AC1.7, AC4.2–AC4.3, AC5.2–AC5.7, AC6.1)
- **Dependências:** T-17, T-18–T-29.
- **Arquivos prováveis:** `tests/e2e/weather-app.spec.ts`, `playwright.config.ts`
- **Tipo:** Test

## Entrega 7 — Hardening

### T-31 — Verificar responsividade e matriz de navegadores
- **Descrição:** Cobrir o layout essencial em viewports mobile e desktop nos navegadores definidos.
- **Critérios de aceite:** Playwright verifica em viewports de 320×800 e 1280×800 que `scrollWidth` não excede `clientWidth` e que busca, seleção, unidade e retry permanecem visíveis e operáveis; execução cobre versões estáveis atual e anterior de Chrome, Edge, Firefox e Safari em ambiente compatível. (RNF2, AC6.1)
- **Dependências:** T-17, T-30.
- **Arquivos prováveis:** `tests/e2e/responsive.spec.ts`, `playwright.config.ts`
- **Tipo:** Test

### T-32 — Verificar acessibilidade do fluxo essencial
- **Descrição:** Validar teclado, foco, nomes acessíveis e contraste nos controles e estados principais.
- **Critérios de aceite:** Testes E2E operam busca, seleção, alternância e retry somente por teclado e confirmam foco visível e nome acessível em cada controle; relatório registra medições de contraste de texto comum (mínimo 4,5:1), texto grande (mínimo 3:1) e controles/ícones relevantes (mínimo 3:1). (RNF3, AC6.2–AC6.3)
- **Dependências:** T-17, T-30.
- **Arquivos prováveis:** `tests/e2e/accessibility.spec.ts`, `docs/validation-results.md`
- **Tipo:** Test

### T-33 — Medir desempenho inicial em rede móvel
- **Descrição:** Registrar o tempo até o campo de busca estar utilizável em dispositivo móvel representativo conectado por 4G.
- **Critérios de aceite:** Em cinco carregamentos da aplicação no mesmo dispositivo/navegador móvel representativo com conexão 4G, registrar ambiente e tempo entre início da navegação e campo visível, habilitado e focável; registrar separadamente a latência da API; mediana do tempo de interface deve ser inferior a 2.000 ms. (RNF1)
- **Dependências:** T-17, T-30.
- **Arquivos prováveis:** `docs/validation-results.md`
- **Tipo:** Test

## Rastreabilidade RF → tarefas

| Requisito funcional | Tarefas de implementação | Testes associados | Cobertura |
| --- | --- | --- | --- |
| RF1 — Busca e seleção de cidade | T-02, T-07, T-09, T-11–T-12, T-16 | T-18, T-23, T-25–T-26, T-30 | Coberto |
| RF2 — Clima atual | T-03–T-06, T-08, T-10, T-12–T-13, T-15–T-17 | T-19–T-22, T-24, T-27, T-30 | Coberto |
| RF3 — Previsão de cinco dias | T-03–T-06, T-08, T-10, T-12, T-14–T-17 | T-19–T-22, T-24, T-28, T-30 | Coberto |
| RF4 — Alternância de temperatura | T-04, T-13–T-17 | T-20, T-29–T-30 | Coberto |
| RF5 — Estados da consulta | T-07–T-12, T-16–T-17 | T-23–T-26, T-30 | Coberto |

`T-01` define os contratos de domínio e estados compartilhados usados por todas as implementações; não é uma implementação isolada de comportamento funcional.

**Requisitos funcionais sem tarefa correspondente:** nenhum. RF1–RF5 têm tarefas de implementação e testes associados.

## Rastreabilidade RNF

| Requisito não funcional | Tarefas |
| --- | --- |
| RNF1 — Desempenho | T-33 |
| RNF2 — Responsividade e compatibilidade | T-11–T-17, T-31 |
| RNF3 — Acessibilidade | T-11–T-12, T-15, T-25–T-26, T-29, T-32 |
| RNF4 — Resiliência | T-05, T-07–T-10, T-13, T-21, T-23–T-24, T-30 |
| RNF5 — Fonte de dados | T-07–T-08, T-23–T-24, T-30 |
| RNF6 — Clareza de erros | T-07–T-12, T-23–T-26, T-30 |

## Prioridade e tamanho

Prioridade: **P0** entrega primeiro valor visível; **P1** completa os requisitos funcionais e sua validação; **P2** fecha a evidência dos requisitos não funcionais. P2 é a última etapa, não um item fora do gate de release. Tamanho relativo: **P** pequeno, **M** médio, **G** grande, considerando escopo e esforço de validação.

| Tarefa | Prioridade | Tamanho |
| --- | --- | --- |
| T-01 | P0 | M |
| T-02 | P0 | M |
| T-03 | P0 | P |
| T-04 | P0 | P |
| T-05 | P0 | M |
| T-06 | P0 | M |
| T-07 | P0 | M |
| T-08 | P0 | M |
| T-09 | P0 | M |
| T-10 | P0 | M |
| T-11 | P0 | M |
| T-12 | P0 | P |
| T-13 | P0 | M |
| T-14 | P1 | M |
| T-15 | P1 | P |
| T-16 | P0 | M |
| T-17 | P1 | M |
| T-18 | P1 | P |
| T-19 | P1 | P |
| T-20 | P1 | P |
| T-21 | P1 | M |
| T-22 | P1 | M |
| T-23 | P1 | M |
| T-24 | P1 | M |
| T-25 | P1 | M |
| T-26 | P1 | P |
| T-27 | P1 | P |
| T-28 | P1 | P |
| T-29 | P1 | P |
| T-30 | P1 | G |
| T-31 | P2 | G |
| T-32 | P2 | M |
| T-33 | P2 | M |

## Sequência em fatias verticais

| Ordem | Entrega visível | Tarefas |
| --- | --- | --- |
| 1 — P0 | Buscar e selecionar uma cidade e ver suas condições atuais, com estados de loading/erro/vazio. | T-01–T-13, T-16 |
| 2 — P1 | Acrescentar previsão de cinco dias e alternância Celsius/Fahrenheit à tela existente. | T-14–T-15, T-17 |
| 3 — P1 | Validar regras puras, services, componentes e o fluxo integrado com mocks. | T-18–T-30 |
| 4 — P2 | Fechar compatibilidade/responsividade, acessibilidade e desempenho antes do gate de release. | T-31–T-33 |

Executar a primeira fatia assim que suas dependências estiverem prontas para obter uma tela funcional antes de completar todos os detalhes do MVP. As fatias P1 completam RF3/RF4 e verificam regressões; a fatia P2 continua obrigatória para demonstrar os RNFs no gate de entrega.