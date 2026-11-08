# Empório da Música — Clave, a assistente de atendimento

Desafio técnico de AI Engineer (Artefact). Um agente de atendimento para a **Empório da Música**, loja
fictícia de instrumentos musicais em Campo Grande/MS. A assistente se chama **Clave**: responde
clientes em português ou inglês, consulta catálogo, promoções e pedidos quando precisa de **dados**,
consulta o manual quando a dúvida é de **política**, e recusa com educação o que foge do escopo.

- **Agente (Python):** LangChain `create_agent` (grafo LangGraph) + Claude, ferramentas em Python puro,
  regras do manual em código testado, memória por conversa em SQLite.
- **API:** FastAPI falando o protocolo de stream do Vercel AI SDK. **MCP:** as mesmas ferramentas
  expostas para qualquer cliente MCP.
- **Front (extra):** site + chat em Next.js que renderiza as chamadas de ferramenta como interface
  (cards de produto, card do pedido, fonte do manual, formulário de verificação).

| Pasta | Conteúdo |
|---|---|
| `backend/` | Agente, ferramentas, regras, API e servidor MCP (Python 3.12, uv) |
| `frontend/` | Site + chat (Next.js 16, Vercel AI SDK, three.js) |
| `examples/` | Conversas reais com o agente, geradas por script |
| `data/` | Dados do desafio (CSVs e manual em PDF) |
| `docs/` | Desenho do backend e plano de implementação |
| `tools/blender/` | Scripts que modelam o violão/ukulele 3D do site |

---

## Como rodar

Pré-requisitos: **Python 3.12+ com [uv](https://docs.astral.sh/uv/)**, **Node 20+** e uma chave da
API da Anthropic.

### 1. Backend (agente + API)

```bash
cd backend
cp .env.example .env          # coloque sua ANTHROPIC_API_KEY no .env
uv sync
uv run python -m emporio.data.build     # CSVs → SQLite, PDF → seções do manual
uv run uvicorn emporio.api.app:app --port 8000
```

`GET http://localhost:8000/health` confirma o modelo e se a chave foi lida.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local    # aponta o chat para http://localhost:8000/api/chat
npm install
npm run dev
```

Site em `http://localhost:3000` (inglês) e `http://localhost:3000/pt` (português). O chat fica em
`/assistente` e no botão flutuante. Sem o `.env.local`, o chat usa um mock local (sem IA).

### 3. Testes, exemplos e MCP

```bash
cd backend
uv run pytest                            # 87 testes, sem chamar a API da Anthropic
uv run python scripts/run_examples.py    # regenera examples/*.md com o modelo real
uv run python -m emporio.mcp_server      # servidor MCP (stdio); --http para streamable HTTP
```

Para usar no Claude Desktop/Claude Code, registre o servidor MCP:

```json
{
  "mcpServers": {
    "emporio-da-musica": {
      "command": "uv",
      "args": ["--directory", "<caminho>/backend", "run", "python", "-m", "emporio.mcp_server"]
    }
  }
}
```

> Os pedidos do desafio vão até março/2026. Para os prazos de troca fazerem sentido, fixe o relógio da
> loja no `.env` (ex.: `STORE_NOW=2026-02-20T15:00`). Sem isso vale a data/hora real de Campo Grande.

---

## Arquitetura

```
Front (Next.js) ──POST /api/chat──▶ FastAPI ──▶ Agente (LangChain create_agent · Claude · persona Clave)
                ◀── stream SSE ─────┘   │                    │ chama ferramentas
                    (AI SDK v1)         │ verificação LGPD   ▼
                                        └──────────▶ emporio.tools (Python puro, testadas)
                                                             │        └─ emporio.rules (manual em código)
                                         SQLite (CSVs tratados) + manual em seções (JSON)
                                                             ▲
                                      Servidor MCP ──────────┘ expõe as mesmas ferramentas
```

### Como a Clave decide entre dados e políticas

O prompt de sistema traz uma tabela "necessidade → ferramenta" e uma regra de ouro: **nunca informar
preço, estoque, promoção, parcela, prazo, horário ou status de pedido sem consultar uma ferramenta**
(é o que o próprio manual pede na seção 7.1).

| Ferramenta | Tipo | Quando |
|---|---|---|
| `buscar_produtos` | dados | procurar/comparar instrumentos, preço, estoque (filtros de categoria, preço, corda, disponibilidade) |
| `buscar_promocoes` | dados | promoções ativas; com `busca`, também as campanhas já encerradas de um produto |
| `calcular_pagamento` | dados + regras | preço final, Pix e parcelas permitidas para um produto |
| `consultar_politicas` | políticas | trocas, garantia, frete, pagamento, contato, LGPD… devolve a seção do manual |
| `status_loja` | regras | se a loja está aberta agora (horário + feriados), endereço e contatos |
| `solicitar_verificacao` | UI | abre o formulário seguro de número do pedido + telefone/e-mail |
| `consultar_pedido` | dados | status, itens, rastreio e prazos de troca de um pedido já verificado |

---

## Decisões técnicas

**LangChain `create_agent` (LangGraph por baixo) em vez de um loop próprio.** O problema é um agente
ReAct clássico (modelo decide → ferramenta → modelo responde). O `create_agent` dá isso pronto, com
checkpointer (memória por `thread_id` = id da conversa do front), estado customizado e *middlewares*:
uso um para montar o prompt (persona fixa em cache + data/hora e idioma da página) e outro para limitar
chamadas ao modelo por mensagem. Um grafo próprio só valeria com fluxos de várias etapas (ex.: aprovação
humana de troca).

**Claude Sonnet 5.5** (configurável por `EMPORIO_MODEL`; Haiku 4.5 é a opção barata). O atendimento
pede bom julgamento de quando chamar cada ferramenta, seguir regras de política sem inventar e trocar de
idioma com naturalidade. O prompt de sistema usa *prompt caching* (`cache_control`), então a parte
grande do prompt e as definições de ferramenta não são cobradas a cada mensagem.

**Ferramentas em Python puro e regras do manual em código.** Contas não ficam com o modelo:
parcela mínima por faixa, Pix que não acumula com promoção, prazos de arrependimento/defeito/garantia,
horário e feriados estão em `emporio/rules.py` com testes de borda. O modelo recebe o resultado pronto
e só explica. Isso elimina a classe de erro mais grave num atendimento de loja (prometer preço ou prazo
errado) e deixa cada regra auditável com a seção do manual citada no código.

**Retrieval proporcional ao tamanho do manual.** São 8 páginas. O PDF vira `policies.json` com uma
entrada por seção numerada (`4.1`, `3.1`…), e `consultar_politicas` pontua as seções por assunto
(expressões em PT e EN com pesos) + sobreposição de palavras, devolvendo até 3 trechos com o texto
original e a fonte (que a UI mostra como chip "Fonte: 4.1"). Um banco vetorial aqui seria mais
infraestrutura sem ganho de precisão; com centenas de documentos eu trocaria por embeddings + rerank.

**MCP como interface adicional, não como dependência do chat.** As mesmas funções viram um servidor
MCP (`emporio/mcp_server.py`, SDK `mcp` 2.x), com as seções do manual também como recurso
(`manual://secoes/{secao}`). O agente do site chama as funções direto: uma falha no transporte MCP não
derruba o atendimento, e o servidor continua útil para a equipe usar a partir do Claude Desktop ou para
outro agente.

**Privacidade (LGPD) na API, não no prompt.** Para ver um pedido, a Clave chama `solicitar_verificacao`
e o front mostra um formulário. A **API** confere número + contato e guarda só o resultado no estado da
conversa; o modelo recebe uma nota "verificação aprovada/falhou" e chama `consultar_pedido(numero)`,
que só devolve pedidos já verificados naquela conversa. Telefone e e-mail digitados no chat também são
usados para verificar e **apagados do texto** antes de chegar ao modelo e ao histórico. A resposta de
erro é a mesma para "pedido não existe" e "contato não confere", para não revelar quais pedidos existem.

**Stream no protocolo do Vercel AI SDK.** A API converte os eventos do LangGraph (`messages` +
`updates`) em eventos `text-*`, `tool-input-*`, `tool-output-available` e `data-suggestions`. O front
renderiza cada chamada de ferramenta como interface: cards de produto, card do pedido, chip da fonte,
formulário. As sugestões de próxima pergunta vêm de uma linha `<sugestoes>…</sugestoes>` que o modelo
escreve no fim e a API tira do texto (mesmo quando o marcador chega quebrado entre dois pedaços).

**Bilíngue.** O site é em inglês por padrão e português em `/pt`; a Clave responde no idioma da última
mensagem do cliente e usa o idioma da página só quando não dá para saber.

### Tratamento dos dados

`emporio/data/build.py` gera `backend/var/store.db` e `backend/var/policies.json`. Inconsistências
encontradas e a decisão tomada:

| Problema | Decisão |
|---|---|
| WhatsApp (67) 3341-4444 (capa e 1.2) × (67) 3321-4500 (seção 7) | 3341-4444, que aparece duas vezes; corrigido no texto do manual |
| E-mail com acento na seção 1.2 (`contato@empóriodamusica…`) | `contato@emporiodamusica.com.br`, como na capa |
| Tabela da seção 3 diz parcela mínima de R$ 100; a 3.1 detalha faixas | vale a 3.1 (mais específica): até 3x ≥ R$ 50, 4–6x ≥ R$ 80, 7–12x ≥ R$ 100 |
| Categorias sem produtos (sopros, cordas orquestrais) | a busca avisa que não há itens na categoria no momento |
| Pedido #3: total ≠ soma dos itens | vale o `total_brl` (valor faturado) |
| Pedidos não têm data real de entrega | para pedidos entregues, uso a data prevista e a Clave avisa isso ao cliente |
| Telefones em formatos variados | normalizados para dígitos; a verificação aceita com ou sem DDD/+55 |
| Produto descontinuado | sai das listagens gerais, mas aparece se o cliente procurar por ele (para a Clave dizer que saiu de linha e sugerir outro) |

---

## Exemplos de conversa

Gerados com o modelo real por `backend/scripts/run_examples.py`, com o relógio da loja em
20/02/2026 15:00. Cada arquivo mostra as ferramentas chamadas e o resultado resumido.

1. [Violão para iniciante + parcelamento](examples/01-violao-iniciante-e-parcelamento.md) — busca com filtros e regras de parcela da 3.1
2. [Promoção, Pix e campanha encerrada](examples/02-promocao-pix-e-campanha-encerrada.md) — 6.2 (não acumula) e 7.3 (promoção expirada)
3. [Devolução com verificação de pedido](examples/03-devolucao-com-verificacao-de-pedido.md) — LGPD + prazos do pedido real (4.1)
4. [Cliente em inglês: horário, acessórios e guitarras](examples/04-english-hours-and-accessories.md)
5. [Fora de escopo e categoria vazia](examples/05-fora-de-escopo-e-categoria-vazia.md) — inclui tentativa de burlar as regras

---

## Limitações conhecidas

- **Busca de produtos léxica.** Entende acento, plural e filtros, mas não sinônimos ("violão de show"
  não encontra "eletroacústico" se o cliente não usar a palavra). O modelo compensa usando filtros.
- **Frete para outras cidades não é calculado**: o manual diz que depende de CEP, peso e dimensões, e
  não há tabela. A Clave explica as modalidades e prazos e encaminha para a equipe.
- **Data de entrega real não existe nos dados**; prazos de arrependimento usam a data prevista.
- **Sem carrinho nem checkout reais.** O botão "adicionar" do site é demonstrativo.
- **Reclamações não são registradas** em sistema; a Clave acolhe e encaminha para os contatos da loja.
- **Retentativa de uma resposta** que falhou repete a mensagem do cliente no histórico do servidor.
- **Avaliação** é feita por testes determinísticos das ferramentas/regras e pelos exemplos; não há
  ainda um conjunto de avaliação automática das respostas do modelo.

## O que eu faria com mais tempo

- **Avaliação contínua:** um conjunto de ~50 perguntas com respostas esperadas (ferramenta certa, seção
  certa, números certos) rodando em CI com LLM-as-judge e checagens determinísticas, e tracing com
  LangSmith para ver custo, latência e erros por ferramenta.
- **Busca híbrida no catálogo** (embeddings + filtros) e, se o manual crescer, embeddings + rerank nas
  políticas.
- **Handoff humano de verdade:** criar o atendimento no WhatsApp/CRM com o resumo da conversa quando o
  cliente pedir ou em reclamações (com *human-in-the-loop* do LangGraph para trocas e devoluções).
- **Proteções adicionais:** limite de taxa por conversa, detecção de PII com o `PIIMiddleware` para
  outros dados (CPF, endereço) e testes adversariais de *prompt injection*.
- **Deploy:** backend em container (Cloud Run/Fly) com Postgres no checkpointer e front na Vercel.

---

## Uso de assistentes de código

Usei o **Claude Code** (Claude Opus) durante todo o projeto, como par de programação:

- **Desenho:** discuti as opções de arquitetura (stack, MCP como interface extra, regras em código,
  retrieval sem banco vetorial, LGPD na API) antes de codar; o desenho aprovado está em
  [`docs/specs/2026-11-07-backend-design.md`](docs/specs/2026-11-07-backend-design.md) e o plano em
  [`docs/plans/2026-11-07-backend.md`](docs/plans/2026-11-07-backend.md).
- **Implementação com testes primeiro:** dados, regras e ferramentas foram escritos a partir de testes
  com os casos que eu queria garantir (bordas de parcela, Pix com promoção, prazos, contato errado não
  revelar nada). O Claude Code escreveu boa parte do código; eu revisei, ajustei decisões e validei os
  resultados contra o manual e os CSVs.
- **Frontend e 3D:** o site, o chat e os scripts do Blender que modelam e "assam" o violão 3D também
  foram feitos com o Claude Code, iterando a partir de referências visuais.
- **O que ficou comigo:** escolhas de produto (persona, bilíngue, o que a Clave deve recusar),
  interpretação das inconsistências dos dados, revisão das conversas de exemplo e a decisão de onde o
  modelo pode ou não decidir sozinho.

O histórico de commits mostra a evolução real do projeto, etapa por etapa.
