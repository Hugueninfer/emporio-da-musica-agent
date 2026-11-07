# Backend — desenho (aprovado em 07/11/2026)

Agente de atendimento da Empório da Música. A assistente se chama **Clave**.
Prazo de entrega: segunda-feira, 09/11/2026.

## Objetivo

Um agente em Python que responde clientes em texto, decide quando consultar **dados**
(catálogo, promoções, pedidos) e quando consultar **políticas** (manual da loja), mantém a
persona da Clave e recusa com educação o que foge do escopo. O frontend Next.js já pronto
consome o agente pelo protocolo de stream do Vercel AI SDK.

## Arquitetura

```
Front (Next.js) ──POST /api/chat──▶ FastAPI ──▶ Agente LangGraph (Claude · persona Clave)
                ◀──── stream SSE ────┘                │ chama ferramentas
                                                      ▼
                                       emporio.tools (Python puro, testadas)
                                                      │
                                   SQLite (CSVs tratados) + manual em seções (JSON)
                                                      ▲
                          Servidor MCP (FastMCP) ─────┘ expõe as mesmas ferramentas
```

- **Ferramentas são funções Python puras** (`emporio/tools.py`): o agente as chama direto.
  O **servidor MCP** (`emporio/mcp_server.py`) expõe as mesmas funções para qualquer cliente
  MCP (ex.: Claude Desktop). Decisão por causa do prazo: o MCP fica no projeto e demonstrável,
  mas uma falha nele não derruba o agente.
- **Regras do manual em código** (`emporio/rules.py`), testadas: preço com promoção, Pix (−5%,
  não acumula com promoção), parcelas mínimas por faixa (3x ≥ R$ 50; 4–6x ≥ R$ 80; 7–12x ≥ R$ 100),
  prazos de troca (7 dias corridos por arrependimento após a entrega; 30 por defeito após a
  compra), horário e feriados. A data de "hoje" é configurável (`STORE_TODAY`).
- **Retrieval proporcional**: o manual (8 páginas) é quebrado em seções com `id` ("4.1", "3.1"…)
  e a ferramenta devolve as seções mais relevantes (palavras-chave com pesos). Sem banco vetorial;
  o README explica quando valeria trocar.

## Dados (`emporio/data/build.py`)

CSVs → `store.db` (SQLite) com tipos corrigidos; PDF → `policies.json` (seções). Decisões sobre
inconsistências (documentadas no README):

| Problema | Decisão |
|---|---|
| WhatsApp 3341-4444 × 3321-4500 | 3341-4444 (aparece 2× no manual) |
| E-mail com acento | `contato@emporiodamusica.com.br` |
| Parcela mínima R$ 100 (tabela) × faixas (3.1) | faixas da 3.1 (mais específicas) |
| Categorias sem produtos (sopros, cordas orquestrais) | a Clave diz que não há itens no momento |
| Pedido #3: total ≠ soma dos itens | confia no `total_brl` (valor faturado) |
| Produto em pedido com status `coming_soon` | mantém o pedido como está; é histórico |

## Ferramentas (contrato = o que a UI já renderiza)

| Ferramenta | Entrada | Saída (resumo) |
|---|---|---|
| `buscar_produtos` | `busca?`, `categoria?`, `preco_max?`, `preco_min?`, `cordas?`, `apenas_disponiveis?` | `{produtos: Product[], total}` |
| `buscar_promocoes` | — | `{produtos: Product[]}` (só ativas) |
| `calcular_pagamento` | `produto_id` | `{preco, pix, opcoes[{parcelas, valor}], observacoes}` |
| `consultar_politicas` | `pergunta` | `{fontes[{id, documento, secao}], trechos[{id, titulo, texto}]}` |
| `status_loja` | — | `{aberta, fecha_as?, abre?{quando, hora}}` |
| `solicitar_verificacao` | — | `{campos: ["pedido","contato"]}` (UI abre o formulário) |
| `consultar_pedido` | `pedido`, `contato` | `{verificado, pedido?: Order, prazos?{arrependimento_ate, defeito_ate, ...}}` |

`Product` e `Order` seguem `frontend/lib/catalog.ts` e `frontend/lib/orders.ts` (nomes de campo
em português para pedidos, inglês para produto — como já está na UI).

## Agente (`emporio/agent/`)

- **LangGraph** (`create_react_agent`) + **ChatAnthropic** (`claude-sonnet-5-5` por padrão,
  `claude-haiku-4-5` como alternativa via `.env`). Prompt caching no prompt de sistema e ferramentas.
- **Persona** (`prompt.py`): Clave, violonista de Campo Grande, tom informal mas profissional;
  sempre se apresenta como assistente virtual; responde no idioma em que o cliente escreveu
  (fallback: `locale` da página); nunca informa preço/estoque/prazo sem ferramenta; cita a seção do
  manual; recusa acessórios e assuntos fora da loja indicando a equipe (67) 3341-4444.
- **Memória**: checkpointer SQLite; `thread_id` = `id` da conversa enviado pelo front.

## API (`emporio/api/`)

- `POST /api/chat` com `{id, locale, messages, verificacao?}` → **UI message stream** (SSE,
  header `x-vercel-ai-ui-message-stream: v1`): eventos `text-*`, `tool-input-available`,
  `tool-output-available`, `data-suggestions`, `finish`.
- **LGPD**: com `verificacao`, a API chama `consultar_pedido` antes do modelo e entrega ao Claude
  só o resultado (sem telefone/e-mail). O contato nunca entra no contexto do LLM nem no histórico.
- CORS liberado para `http://localhost:3000`.
- O front troca o mock pela API com `NEXT_PUBLIC_CHAT_API=http://localhost:8000/api/chat`.

## Testes e entregáveis

- `pytest`: regras, ferramentas, build dos dados e o formato do stream (agente simulado).
- `scripts/run_examples.py`: roda cenários contra o agente real e salva 3–5 conversas em
  `examples/*.md` (catálogo, preço, endereço/horário, devolução, pedido com verificação, fora de escopo).
- README final: execução, decisões, limitações, próximos passos e uso do Claude Code.
