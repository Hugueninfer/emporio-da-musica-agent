# Empório da Música — agente de atendimento

Desafio técnico de AI Engineer (Artefact): um agente de atendimento para a **Empório da Música**,
loja fictícia de instrumentos musicais em Campo Grande/MS. A assistente se chama **Clave**.

> 🚧 Em construção. Este README será completado com instruções de execução, decisões técnicas,
> limitações e o uso de assistentes de código.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `data/` | Dados fornecidos pelo desafio (CSVs da operação e manual de políticas) |
| `frontend/` | Site + chat (Next.js, Vercel AI SDK, three.js). Por enquanto conversa com um mock em `/api/chat` |
| `backend/` | Agente em Python (LangGraph + Claude, ferramentas via MCP, FastAPI) — próxima etapa |
| `tools/blender/` | Scripts que modelam o violão/ukulele e exportam o `.glb` usado no site |

## Rodando o frontend

```bash
cd frontend
npm install
npm run dev
```

Site em inglês em `http://localhost:3000` e em português em `http://localhost:3000/pt`.
